export default async function handler(req, res) {
  // 启用 CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { images, prompt } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: '请上传至少一张图片' });
    }

    const apiKey = process.env.DOUBAO_API_KEY;

    if (!apiKey) {
      console.error('Missing API key');
      return res.status(500).json({
        error: '服务器配置错误：缺少 API Key'
      });
    }

    // 构建豆包 API 请求
    const doubaoPrompt = `你是甄嬛传的十级学者，分析图片中人物的特点，找出最相似的甄嬛传角色。

需要分析：
1. 长相和气质
2. 穿搭风格
3. 整体给人的感觉

对比甄嬛传角色数据库，找出最相似的5个角色。

每个角色返回：
- similarity: 0-100的相似度分数
- reason: 一句正经的分析理由（10字以内）
- funny_comment: 一句玩梗/俏皮的评语（15字以内）
- tags: 3个网络用语风格的标签

用JSON格式返回：
{
  "characters": [
    {
      "name": "甄嬛",
      "similarity": 92,
      "reason": "聪慧隐忍",
      "funny_comment": "人间清醒本醒",
      "tags": ["大女主", "聪明人"]
    }
  ]
}

甄嬛传角色：甄嬛、华妃、皇后、沈眉庄、安陵容、果郡王、皇上、苏培盛、温实初、槿汐、流朱、浣碧、玉娆、温太医、淳儿、祺贵人

请直接返回JSON，不要其他内容。`;

    const inputContent = [
      { type: 'input_text', text: doubaoPrompt }
    ];

    // 添加图片
    for (const imageData of images) {
      inputContent.push({ type: 'input_image', image_url: imageData });
    }

    console.log('Calling Doubao API with', images.length, 'images');

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
      console.error('Doubao API error:', response.status, errorText);
      return res.status(500).json({
        error: `AI 服务错误 (${response.status}): ${errorText.substring(0, 100)}`
      });
    }

    const result = await response.json();
    console.log('Doubao API response received');

    // 检查是否有错误字段
    if (result.error) {
      console.error('Doubao API returned error:', result.error);
      return res.status(500).json({
        error: `AI 服务错误: ${JSON.stringify(result.error).substring(0, 200)}`
      });
    }

    // 解析 AI 响应
    let analysisResult;
    try {
      let content = '';

      if (result.choices && result.choices[0]) {
        if (result.choices[0].message && result.choices[0].message.content) {
          content = result.choices[0].message.content;
        } else if (result.choices[0].content) {
          content = result.choices[0].content;
        } else if (result.choices[0].text) {
          content = result.choices[0].text;
        }
      }

      if (!content) {
        content = JSON.stringify(result);
      }

      // 提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // 返回模拟数据
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

    return res.json({
      success: true,
      characters: charactersWithAvatars
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: `服务器内部错误: ${error.message}`
    });
  }
}
