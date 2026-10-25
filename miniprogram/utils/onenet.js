const config = require('./config');
const md5 = require('./md5');

class OneNetClient {
  constructor() {
    this.client = null;
    this.connected = false;
    this.messageHandlers = [];
  }

  generateToken() {
    const timestamp = Math.floor(Date.now() / 1000);
    const signStr = `product_id=${config.onenet.productId}&device_id=${config.onenet.deviceId}&timestamp=${timestamp}`;
    const sign = md5(signStr + config.onenet.apiKey);
    return {
      token: sign,
      timestamp: timestamp
    };
  }

  connectMQTT() {
    const { token, timestamp } = this.generateToken();
    const clientId = `${config.onenet.productId}.${config.onenet.deviceId}`;
    const username = config.onenet.productId;
    const password = token;

    this.client = wx.createMQTTClient({
      host: config.onenet.mqttHost,
      port: config.onenet.mqttPort,
      clientId: clientId,
      username: username,
      password: password,
      clean: true
    });

    this.client.onConnect(() => {
      console.log('MQTT连接成功');
      this.connected = true;
      this.subscribeToDevice();
    });

    this.client.onDisconnect(() => {
      console.log('MQTT连接断开');
      this.connected = false;
    });

    this.client.onMessage((topic, message) => {
      console.log('收到消息:', topic, message);
      this.handleMessage(topic, message);
    });

    this.client.onError((error) => {
      console.error('MQTT错误:', error);
    });

    this.client.connect();
  }

  subscribeToDevice() {
    if (!this.connected) return;
    
    const topics = [
      `${config.onenet.topicPrefix}/${config.onenet.deviceId}/data`,
      `${config.onenet.topicPrefix}/${config.onenet.deviceId}/status`,
      `${config.onenet.topicPrefix}/${config.onenet.deviceId}/command`
    ];

    topics.forEach(topic => {
      this.client.subscribe({
        topic: topic,
        qos: 0,
        success: () => console.log('订阅成功:', topic),
        fail: (error) => console.error('订阅失败:', topic, error)
      });
    });
  }

  handleMessage(topic, message) {
    try {
      const data = JSON.parse(message);
      this.messageHandlers.forEach(handler => handler(topic, data));
    } catch (error) {
      console.error('消息处理错误:', error);
    }
  }

  addMessageHandler(handler) {
    this.messageHandlers.push(handler);
  }

  removeMessageHandler(handler) {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  sendCommand(command) {
    if (!this.connected) {
      console.error('MQTT未连接');
      return;
    }

    const topic = `${config.onenet.topicPrefix}/${config.onenet.deviceId}/command`;
    const message = JSON.stringify(command);

    this.client.publish({
      topic: topic,
      payload: message,
      qos: 0,
      success: () => console.log('命令发送成功'),
      fail: (error) => console.error('命令发送失败:', error)
    });
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
    }
  }
}

module.exports = new OneNetClient(); 