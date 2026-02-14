import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req, VercelResponse) {
  const { method, headers, body } = req;

  // 启用 CORS
  VercelResponse.setHeader('Access-Control-Allow-Credentials', true);
  VercelResponse.setHeader('Access-Control-Allow-Origin', '*');
  VercelResponse.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  VercelResponse.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (method === 'OPTIONS') {
    return VercelResponse.status(200).end();
  }

  if (method !== 'POST') {
    return VercelResponse.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { images, prompt } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return VercelResponse.status(400).json({ error: '请上传至少一张图片' });
    }

    const apiKey = process.env.DOUBAO_API_KEY;

    if (!apiKey) {
      return VercelResponse.status(500).json({
        error: '服务器配置错误：缺少 API Key'
      });
    }

    // 构建豆包 API 请求
    const doubaoPrompt = `你是甄嬛传的十级学者，分析图片中人物的特点，找出最相似的甄嬛传角色。

需要分析：
1. 长相和气质（用网络梗形容）
2. 穿搭风格
3. 整体给人的感觉
4. 表情和眼神传达的情绪

对比甄嬛传角色数据库，找出最相似的5个角色。

每个角色返回：
- similarity: 0-100的相似度分数
- reason: 一句正经的分析理由（10字以内）
- funny_comment: 一句玩梗/俏皮的评语（15字以内）
- tags: 3个网络用语风格的标签（每个3-5字）

用JSON格式返回：
{
  "characters": [
    {
      "name": "甄嬛",
      "similarity": 92,
      "reason": "聪慧隐忍，外柔内刚",
      "funny_comment": "表面岁月静好，实则人间清醒",
      "tags": ["大女主", "人间清醒", "聪明人"]
    }
  ]
}

甄嬛传角色数据库：
- 甄嬛：聪慧隐忍，外柔内刚，大女主本主
- 华妃：嚣张跋扈，个性张扬，拽妃本妃
- 皇后：端庄持重，城府深沉，笑里藏刀
- 沈眉庄：清冷傲骨，有原则，清冷美人
- 安陵容：敏感细腻，自卑要强，敏感小达人
- 果郡王：风流倜傥，痴情专一，恋爱脑晚期
- 皇上：多疑深沉，掌控欲强，大橘行为
- 苏培盛：忠诚圆滑，八面玲珑，老油条
- 温实初：温润如玉，默默付出，备胎战斗机
- 槿汐：忠诚稳重，智慧过人，最强辅助
- 流朱：活泼忠心，直爽单纯，耿直girl
- 浣碧：心机深沉，渴望认可，野心家
- 玉娆：清新脱俗，倔强刚烈，叛逆少女
- 温太医：温润专一，痴情守护，忠犬系
- 淳儿：天真烂漫，吃货本货，傻白甜
- 祺贵人：娇俏跋扈，恃宠而骄，小作精

请直接返回JSON，不要其他内容。`;

    const inputContent = [
      { type: 'input_text', text: doubaoPrompt }
    ];

    // 添加图片（支持多图）
    for (const imageData of images) {
      inputContent.push({ type: 'input_image', image_url: imageData });
    }

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'doubao-seed-1-8-251228',
        input: [{
          role: 'user',
          content: inputContent
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Doubao API error:', errorText);
      return VercelResponse.status(500).json({
        error: `AI 服务暂时不可用：${response.status}`
      });
    }

    const result = await response.json();
    console.log('Doubao API response:', JSON.stringify(result).substring(0, 500));

    // 解析 AI 响应
    let analysisResult;
    try {
      // 尝试多种可能的响应格式
      let content = '';

      // 各种可能的响应路径
      if (result.choices && result.choices[0]) {
        if (result.choices[0].message && result.choices[0].message.content) {
          content = result.choices[0].message.content;
        } else if (result.choices[0].content) {
          content = result.choices[0].content;
        } else if (result.choices[0].text) {
          content = result.choices[0].text;
        }
      }

      // 如果还是空，尝试整个结果转字符串
      if (!content) {
        content = JSON.stringify(result);
      }

      console.log('Extracted content:', content.substring(0, 300));

      // 提取 JSON（查找 {...} 包围的内容）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
        console.log('Parsed JSON successfully');
      } else {
        // 尝试直接解析整个 content
        analysisResult = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Raw result:', JSON.stringify(result).substring(0, 1000));
      // 返回模拟数据用于测试
      analysisResult = {
        characters: [
          {
            name: '甄嬛',
            similarity: 85,
            reason: '聪慧隐忍',
            funny_comment: '人间清醒本醒',
            tags: ['大女主', '聪明人']
          }
        ]
      };
    }

    // 为每个角色添加头像
    const charactersWithAvatars = (analysisResult.characters || []).map(char => ({
      ...char,
      avatar: `/images/${char.name}.jpg`
    }));

    return VercelResponse.json({
      characters: charactersWithAvatars,
      rawResponse: result
    });

  } catch (error) {
    console.error('Server error:', error);
    return VercelResponse.status(500).json({
      error: '服务器内部错误，请稍后重试'
    });
  }
}
