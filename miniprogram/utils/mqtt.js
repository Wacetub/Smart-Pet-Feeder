const config = require('./config');

class MQTTClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  connectMQTT() {
    if (this.client) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.client = wx.createMQTTClient({
        host: config.onenet.mqttHost,
        port: config.onenet.mqttPort,
        clientId: config.onenet.clientId,
        username: config.onenet.username,
        password: config.onenet.password,
        keepalive: 60
      });

      this.client.onConnect(() => {
        console.log('MQTT连接成功');
        this.isConnected = true;
        resolve();
      });

      this.client.onError((err) => {
        console.error('MQTT连接错误:', err);
        reject(err);
      });

      this.client.onClose(() => {
        console.log('MQTT连接关闭');
        this.isConnected = false;
      });

      this.client.connect();
    });
  }

  subscribe(topic) {
    if (!this.client || !this.isConnected) {
      return Promise.reject(new Error('MQTT未连接'));
    }

    return new Promise((resolve, reject) => {
      this.client.subscribe({
        topic,
        qos: 0,
        success: () => {
          console.log(`订阅主题成功: ${topic}`);
          resolve();
        },
        fail: (err) => {
          console.error(`订阅主题失败: ${topic}`, err);
          reject(err);
        }
      });
    });
  }

  publish(topic, message) {
    if (!this.client || !this.isConnected) {
      return Promise.reject(new Error('MQTT未连接'));
    }

    return new Promise((resolve, reject) => {
      this.client.publish({
        topic,
        payload: message,
        qos: 0,
        success: () => {
          console.log(`发布消息成功: ${topic}`);
          resolve();
        },
        fail: (err) => {
          console.error(`发布消息失败: ${topic}`, err);
          reject(err);
        }
      });
    });
  }

  disconnect() {
    if (this.client && this.isConnected) {
      this.client.disconnect();
      this.client = null;
      this.isConnected = false;
    }
  }
}

module.exports = new MQTTClient(); 