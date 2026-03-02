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

    // 甄嬛传角色数据库 - 用于备用数据
    const zhenguanCharacters = [
      { name: '甄嬛', reason: '聪慧隐忍', funny_comment: '人间清醒本醒', tags: ['大女主', '聪明人', '颜值担当'] },
      { name: '华妃', reason: '明艳张扬', funny_comment: '拽妃本拽', tags: ['拽妃', '美艳', '娇纵'] },
      { name: '皇后', reason: '端庄腹黑', funny_comment: '打胎队长', tags: ['绿茶', '心机', '温柔刀'] },
      { name: '沈眉庄', reason: '温婉大气', funny_comment: '人间白月光', tags: ['大家闺秀', '端庄', '深情'] },
      { name: '安陵容', reason: '敏感自卑', funny_comment: '安小鸟本鸟', tags: ['小可爱', '敏感', '自卑'] },
      { name: '果郡王', reason: '风流倜傥', funny_comment: '允礼yyds', tags: ['痴情', '浪漫', '才华'] },
      { name: '皇上', reason: '多疑深情', funny_comment: '大胖橘本橘', tags: ['专一', '多疑', '威严'] },
      { name: '苏培盛', reason: '忠诚机敏', funny_comment: '苏妃上线', tags: ['神助攻', '贴心', '智慧'] },
      { name: '温实初', reason: '温柔专一', funny_comment: '暖男本暖', tags: ['暖男', '痴情', '太医'] },
      { name: '槿汐', reason: '沉稳睿智', funny_comment: '神助攻+1', tags: ['智慧', '忠诚', '助攻'] },
      { name: '流朱', reason: '活泼忠诚', funny_comment: '忠犬丫鬟', tags: ['活泼', '忠诚', '可爱'] },
      { name: '浣碧', reason: '心高命薄', funny_comment: '心机girl', tags: ['心机', '倔强', '深情'] },
      { name: '玉娆', reason: '率真泼辣', funny_comment: '拽妃二代', tags: ['可爱', '直率', '颜值'] },
      { name: '温太医', reason: '痴情守护', funny_comment: '备胎无疑', tags: ['痴情', '专一', '温柔'] },
      { name: '淳儿', reason: '天真烂漫', funny_comment: '小吃货一枚', tags: ['可爱', '天真', '吃货'] },
      { name: '祺贵人', reason: '愚蠢肤浅', funny_comment: '瓜六本六', tags: ['蠢萌', '娇气', '颜值'] }
    ];

    // Fisher-Yates 随机打乱算法
    function shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    // 随机选择3个不重复的角色
    function getRandomCharacters(count = 3) {
      const shuffled = shuffleArray(zhenguanCharacters);
      return shuffled.slice(0, count).map((char, index) => ({
        ...char,
        similarity: 95 - index * 5,
        avatar: `/images/${char.name}.jpg`
      }));
    }

    // 构建豆包 API 请求内容 (chat/completions 格式)
    const doubaoPrompt = `你是甄嬛传的十级学者，分析图片中人物的特点，找出最相似的甄嬛传角色。

需要分析：
1. 长相和气质
2. 穿搭风格
3. 整体给人的感觉

重要提醒：
- 必须返回恰好3个角色，不能返回0个、1个、2个或超过3个
- 绝对不能返回"没有发现特别之处"或类似空结果
- 如果不确定，也要强行匹配3个角色
- 这是娱乐分析，不需要严格匹配，放心大胆分析

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

请直接返回JSON，不要其他内容。必须返回恰好3个角色！`;

    // 构建 messages 内容数组（支持多张图片）
    const messageContent = [
      {
        type: 'text',
        text: doubaoPrompt
      }
    ];

    // 添加图片 - 豆包 vision 格式
    for (const imageData of images) {
      // imageData 可能是 base64 dataURL（data:image/jpeg;base64,...）或 URL
      if (imageData.startsWith('data:')) {
        // base64 dataURL 格式 - 直接使用 url 字段传入
        messageContent.push({
          type: 'image_url',
          image_url: {
            url: imageData
          }
        });
      } else {
        // 普通 URL
        messageContent.push({
          type: 'image_url',
          image_url: {
            url: imageData
          }
        });
      }
    }

    // 从环境变量获取模型接入点 ID (Endpoint ID)
    // 兼容用户截图中的中文变量名 "模型" 和标准的 "DOUBAO_MODEL"
    const modelId = process.env.DOUBAO_MODEL || process.env['模型'] || 'doubao-seed-1-6-vision-250615';

    console.log('Calling Doubao API with', images.length, 'images, using model:', modelId);

    // 使用标准 OpenAI-compatible chat/completions endpoint
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'user',
            content: messageContent
          }
        ],
        max_tokens: 1000,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Doubao API error:', response.status, errorText);

      // 如果 API 调用失败，返回随机角色作为 fallback（便于前端测试）
      if (process.env.NODE_ENV !== 'production') {
        console.log('DEV mode: returning fallback data due to API error');
        return res.json({
          success: true,
          characters: getRandomCharacters(3),
          _debug: `API error: ${response.status}`
        });
      }

      return res.status(500).json({
        error: `AI 服务错误 (${response.status}): ${errorText.substring(0, 200)}`
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

    // 解析 chat/completions 响应格式
    let analysisResult;
    try {
      let content = '';

      // chat/completions 标准响应格式
      if (result.choices && result.choices[0]) {
        const choice = result.choices[0];
        if (choice.message && choice.message.content) {
          content = choice.message.content;
        } else if (choice.text) {
          content = choice.text;
        }
      }

      console.log('AI content (first 500 chars):', content.substring(0, 500));

      if (!content) {
        console.log('Empty content, using fallback data');
        analysisResult = { characters: getRandomCharacters(3) };
      } else {
        // 检查是否包含拒绝分析的内容
        const lowerContent = content.toLowerCase();
        const isRejection = lowerContent.includes('没有发现') ||
          lowerContent.includes('没有特别') ||
          lowerContent.includes('无法分析') ||
          lowerContent.includes('无法匹配') ||
          lowerContent.includes('没有相似') ||
          lowerContent.includes('不太像');

        if (isRejection) {
          console.log('AI returned rejection, using fallback data');
          analysisResult = { characters: getRandomCharacters(3) };
        } else {
          // 提取 JSON（移除可能的 markdown code block）
          let jsonStr = content;

          // 移除 ```json ... ``` 包裹
          const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1];
          } else {
            // 直接提取 JSON 对象
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              jsonStr = jsonMatch[0];
            }
          }

          analysisResult = JSON.parse(jsonStr);

          // 验证结果：确保返回3个角色
          const chars = analysisResult.characters;
          if (!chars || !Array.isArray(chars) || chars.length === 0) {
            console.log('Empty characters array, using fallback data');
            analysisResult = { characters: getRandomCharacters(3) };
          } else if (chars.length < 3) {
            // 如果少于3个，用随机数据补充到3个
            console.log('Less than 3 characters, supplementing with random data');
            const existingNames = chars.map(c => c.name);
            const supplement = shuffleArray(zhenguanCharacters)
              .filter(c => !existingNames.includes(c.name))
              .slice(0, 3 - chars.length)
              .map((c, i) => ({
                ...c,
                similarity: 80 - i * 5,
                avatar: `/images/${c.name}.jpg`
              }));
            chars.push(...supplement);
          }
        }
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // 返回随机数据
      analysisResult = { characters: getRandomCharacters(3) };
    }

    // 确保返回恰好3个角色，并为每个角色添加头像
    let finalCharacters = (analysisResult.characters || []).slice(0, 3);

    // 如果不足3个，用随机数据补充
    if (finalCharacters.length < 3) {
      const existingNames = finalCharacters.map(c => c.name);
      const supplement = zhenguanCharacters
        .filter(c => !existingNames.includes(c.name))
        .sort(() => 0.5 - Math.random())
        .slice(0, 3 - finalCharacters.length)
        .map((c, i) => ({
          ...c,
          similarity: 75 - i * 5,
          avatar: `/images/${c.name}.jpg`
        }));
      finalCharacters = [...finalCharacters, ...supplement];
    }

    const charactersWithAvatars = finalCharacters.map(char => ({
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
