const app = getApp();
const onenetApi = require('../../../utils/onenet-api.js');

Page({
  data: {
    deviceProperties: null, // 存储设备属性的键值对对象
    deviceStatus: null, // 存储设备在线状态
    gate:0,   //阀门开关，0关 1开
    // 默认值和UI控制相关的状态
    feedAmount: 150,
    waterAmount: 200,
    switch1_checked: false,
    switch2_checked: false,
    switch3_checked: false,
    
    // 阈值设置
    thresholds: {
      minTemp: 15,
      maxTemp: 30,
      minHumidity: 40,
      maxHumidity: 80,
      minWaterLevel: 30,
      minFoodLevel: 30
    },
    
    // 警报状态
    tempAlert: false,
    humidityAlert: false,
    waterAlert: false,
    foodAlert: false,
    sensorAlert: false
  },

  /**
   * 页面加载时执行，启动数据轮询
   */
  onLoad(options) {
    this.loadThresholds(); // 加载阈值设置
    this.fetchDataAndStatus(); // 立即获取一次
    this.fetchThingModelInfo(); // 获取物模型信息
    this.dataPolling = setInterval(() => {
      this.fetchDataAndStatus(); // 每3秒刷新
    }, 3000);
  },

  /**
   * 页面显示时执行，重新加载阈值设置
   */
  onShow() {
    // 每次页面显示时重新加载阈值设置，确保与settings页面同步
    this.loadThresholds();
    console.log('Control页面阈值已重新加载');
  },

  /**
   * 页面卸载时执行，清理定时器
   */
  onUnload() {
    if (this.dataPolling) {
      clearInterval(this.dataPolling);
    }
  },

  /**
   * @简要：从本地存储加载阈值设置
   */
  loadThresholds() {
    // 从settings页面保存的本地存储中获取阈值
    const settings = wx.getStorageSync('settings');
    if (settings && settings.thresholds) {
      this.setData({ 
        thresholds: settings.thresholds 
      });
    } else {
      // 如果没有保存的设置，使用默认值
      const defaultThresholds = {
        minTemp: 15,
        maxTemp: 30,
        minHumidity: 40,
        maxHumidity: 80,
        minWaterLevel: 30,
        minFoodLevel: 30
      };
      this.setData({ thresholds: defaultThresholds });
    }
  },

  /**
   * @简要：检查阈值并设置警报状态
   */
  checkThresholds(properties) {
    const { thresholds } = this.data;
    const alerts = {
      tempAlert: false,
      humidityAlert: false,
      waterAlert: false,
      foodAlert: false,
      sensorAlert: false
    };

    // 检查温度
    if (properties.temp !== undefined) {
      const temp = Number(properties.temp);
      alerts.tempAlert = temp < thresholds.minTemp || temp > thresholds.maxTemp;
    }

    // 检查湿度
    if (properties.humi !== undefined) {
      const humidity = Number(properties.humi);
      alerts.humidityAlert = humidity < thresholds.minHumidity || humidity > thresholds.maxHumidity;
    }

    // 检查水位
    if (properties.shuiwei !== undefined) {
      const waterLevel = Number(properties.shuiwei);
      alerts.waterAlert = waterLevel < thresholds.minWaterLevel;
    }

    // 检查食物余量
    if (properties.food !== undefined) {
      const foodLevel = Number(properties.food);
      alerts.foodAlert = foodLevel < thresholds.minFoodLevel;
    }

    // 检查传感器状态（假设有传感器状态字段）
    if (properties.sensor_status !== undefined) {
      alerts.sensorAlert = properties.sensor_status !== '0';
    }

    this.setData(alerts);
  },

  /**
   * @简要：调用API获取设备属性和在线状态，并更新到页面
   */
  fetchDataAndStatus() {
    // 获取设备属性
    onenetApi.fetchDeviceProperties().then(properties => {
      console.log("获取到设备属性:", properties);
      this.setData({
        deviceProperties: properties,
        // 根据返回的属性更新开关状态
        // 注意：这里的 'auto_feed' 等标识符需要与您在OneNET物模型中定义的完全一致
        switch1_checked: properties.auto_feed === 'true',
        switch2_checked: properties.auto_water === 'true',
        switch3_checked: properties.gate_status === 'true',
      });
      
      // 检查阈值并设置警报
      this.checkThresholds(properties);
    }).catch(msg => {
      console.error("fetchDeviceProperties 失败:", msg);
      wx.showToast({ title: msg, icon: 'none' });
    });

    // 获取设备在线状态
    onenetApi.fetchDeviceStatusHistory().then(statusInfo => {
      this.setData({
        deviceStatus: statusInfo
      });
    }).catch(msg => {
      console.error("fetchDeviceStatusHistory 失败:", msg);
    });
  },

  /**
   * @简要：调用API设置设备属性
   */
  onenet_set_device_property(event) {
    const param_name = event.currentTarget.dataset.param;
    const is_checked = event.detail.value;

    wx.showLoading({ title: '正在执行...', mask: true });

    onenetApi.setDeviceProperty({ [param_name]: is_checked }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '操作成功', icon: 'success' });
      // 操作成功后立即刷新一次数据，确保状态同步
      this.fetchDataAndStatus();
    }).catch(msg => {
      wx.hideLoading();
      wx.showToast({ title: msg, icon: 'none' });
    });
  },

  // --- 其他UI交互事件 ---
  onFeedAmountChange(e) {
    this.setData({ feedAmount: e.detail.value });
  },

  onWaterAmountChange(e) {
    this.setData({ waterAmount: e.detail.value });
  },

  handleFeed() {
    console.log("手动投食:", this.data.feedAmount);
    wx.showLoading({ title: '正在投食...', mask: true });
    
    // 尝试多种方式控制投食
    const feedPromises = [
      // 方式1：设置属性
      onenetApi.setDeviceProperty({ 
        "manual_feed": true,
        "feed_amount": this.data.feedAmount 
      }).catch(err => {
        console.log("属性设置方式失败:", err);
        return Promise.reject(err);
      }),
      
      // 方式2：调用服务
      onenetApi.callDeviceService("manual_feed", {
        "amount": this.data.feedAmount
      }).catch(err => {
        console.log("服务调用方式失败:", err);
        return Promise.reject(err);
      })
    ];
    
    // 尝试第一种方式，失败则尝试第二种
    feedPromises[0].then(() => {
      wx.hideLoading();
      wx.showToast({ title: '投食指令已发送', icon: 'success' });
      this.fetchDataAndStatus();
    }).catch(() => {
      // 第一种方式失败，尝试第二种
      feedPromises[1].then(() => {
        wx.hideLoading();
        wx.showToast({ title: '投食指令已发送', icon: 'success' });
        this.fetchDataAndStatus();
      }).catch(msg => {
        wx.hideLoading();
        wx.showToast({ title: '投食失败，请检查设备配置', icon: 'none' });
      });
    });
  },

  handleWater() {
    console.log("手动加水:", this.data.waterAmount);
    wx.showLoading({ title: '正在加水...', mask: true });
    
    // 尝试多种方式控制加水
    const waterPromises = [
      // 方式1：设置属性
      onenetApi.setDeviceProperty({ 
        "manual_water": true,
        "water_amount": this.data.waterAmount 
      }).catch(err => {
        console.log("属性设置方式失败:", err);
        return Promise.reject(err);
      }),
      
      // 方式2：调用服务
      onenetApi.callDeviceService("manual_water", {
        "amount": this.data.waterAmount
      }).catch(err => {
        console.log("服务调用方式失败:", err);
        return Promise.reject(err);
      })
    ];
    
    // 尝试第一种方式，失败则尝试第二种
    waterPromises[0].then(() => {
      wx.hideLoading();
      wx.showToast({ title: '加水指令已发送', icon: 'success' });
      
      // 添加本地加水记录
      this.addWaterRecord(this.data.waterAmount);
      
      this.fetchDataAndStatus();
    }).catch(() => {
      // 第一种方式失败，尝试第二种
      waterPromises[1].then(() => {
        wx.hideLoading();
        wx.showToast({ title: '加水指令已发送', icon: 'success' });
        
        // 添加本地加水记录
        this.addWaterRecord(this.data.waterAmount);
        
        this.fetchDataAndStatus();
      }).catch(msg => {
        wx.hideLoading();
        wx.showToast({ title: '加水失败，请检查设备配置', icon: 'none' });
      });
    });
  },

  /**
   * @简要：添加本地加水记录
   */
  addWaterRecord(amount) {
    try {
      const newRecord = {
        time: new Date().toISOString(),
        amount: Number(amount),
        type: 'manual' // 手动加水
      };

      console.log('添加加水记录:', newRecord);

      // 获取现有记录
      const waterHistory = wx.getStorageSync('waterHistory') || [];
      
      // 添加新记录
      waterHistory.push(newRecord);
      
      // 只保留最近30天的记录
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const filteredHistory = waterHistory.filter(record => 
        new Date(record.time) > thirtyDaysAgo
      );
      
      // 保存到本地存储
      wx.setStorageSync('waterHistory', filteredHistory);
      
      console.log('加水记录已保存，当前记录数:', filteredHistory.length);
    } catch (error) {
      console.error('保存加水记录失败:', error);
    }
  },

  /**
   * @简要：获取物模型信息，了解哪些属性是可写的
   */
  fetchThingModelInfo() {
    onenetApi.fetchThingModel().then(thingModel => {
      console.log("物模型详细信息:", thingModel);
      // 分析哪些属性是可写的
      if (thingModel && thingModel.properties) {
        const writableProps = thingModel.properties.filter(prop => prop.accessMode === 'rw');
        console.log("可写的属性:", writableProps.map(prop => prop.identifier));
      }
    }).catch(msg => {
      console.error("获取物模型失败:", msg);
    });
  },
});