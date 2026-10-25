const config = require('./config');

// 调用DeepSeek API
async function callDeepSeekAPI(messages) {
  try {
    const response = await wx.request({
      url: config.deepseek.apiUrl,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.deepseek.apiKey}`
      },
      data: {
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      }
    });

    if (response.statusCode === 200 && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error('API响应格式错误');
    }
  } catch (error) {
    console.error('DeepSeek API调用失败:', error);
    throw error;
  }
}

module.exports = {
  callDeepSeekAPI
}; 