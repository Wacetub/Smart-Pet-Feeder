module.exports = {
  // DeepSeek API配置
  deepseek: {
    apiKey: 'YOUR_DEEPSEEK_API_KEY', // 请替换为您的DeepSeek API密钥
    apiUrl: 'https://api.deepseek.com/v1' // DeepSeek API地址
  },
  
  // OneNet配置
  onenet: {
    apiKey: 'YOUR_ONENET_ACCESS_KEY', // access key
    deviceId: 'YOUR_DEVICE_NAME', // 设备名称
    productId: 'YOUR_PRODUCT_ID', // 产品ID
    mqttHost: 'mqtts.heclouds.com', // MQTT服务器
    mqttPort: 1883, // 端口号
    topicPrefix: '$sys', // 主题前缀
    clientId: 'YOUR_DEVICE_NAME', // clientId
    username: 'YOUR_PRODUCT_ID', // username
    password: 'YOUR_AUTH_STRING' // 密码
  },
  
  // AI 助手配置
  aiAssistant: {
    chatMode: 'bot',
    botId: 'YOUR_BOT_ID', // 替换为您的 botId
    envId: 'YOUR_CLOUD_ENV_ID', // 替换为您的环境 ID
    agentConfig: {
      allowWebSearch: true,
      allowUploadFile: true,
      allowPullRefresh: true,
      allowUploadImage: true,
      showToolCallDetail: true,
      allowMultiConversation: true,
      allowVoice: true,
      showBotName: true
    }
  }
}; 