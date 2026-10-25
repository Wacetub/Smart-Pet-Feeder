const app = getApp();
const onenetApi = require('../../../utils/onenet-api.js');

Page({
  data: {
    deviceProperties: null, // 存储从OneNET获取的设备属性
    deviceStatus: null,     // 存储设备在线状态

    // ---- 以下为页面本地的设置项，会与设备属性同步 ----
    settings: {
      deviceName: '智能喂食器',
      autoFeed: false,
      feedTimes: [
        { time: '08:00', amount: 100 },
        { time: '12:00', amount: 150 },
        { time: '18:00', amount: 100 }
      ],
      notifications: {
        lowFood: true,
        lowWater: true,
        deviceOffline: true,
        abnormalTemp: true
      },
      thresholds: {
        minTemp: 15,
        maxTemp: 30,
        minHumidity: 40,
        maxHumidity: 80,
        minWaterLevel: 30,
        minFoodLevel: 30
      }
    }
  },

  onLoad() {
    this.loadSettingsFromStorage();
    this.fetchInitialSettings();
  },

  /**
   * @简要：从本地存储加载设置
   */
  loadSettingsFromStorage() {
    const savedSettings = wx.getStorageSync('settings');
    if (savedSettings) {
      this.setData({ settings: savedSettings });
    }
  },

  /**
   * @简要：保存设置到本地存储
   */
  saveSettingsToStorage() {
    wx.setStorageSync('settings', this.data.settings);
  },

  /**
   * @简要：从OneNET加载最新的设备属性，并同步到页面的设置项中
   */
  fetchInitialSettings() {
    wx.showLoading({ title: '加载设置...' });
    onenetApi.fetchDeviceProperties().then(properties => {
      wx.hideLoading();
      this.setData({
        deviceProperties: properties,
        // 将获取到的部分属性同步到settings对象
        // 注意: `autoFeed`等key需要与您在onenet-api中返回的key一致
        'settings.autoFeed': properties.auto_feed === 'true',
        // 'settings.deviceName': properties.deviceName, // 如果设备名称也由云端管理
      });
    }).catch(msg => {
      wx.hideLoading();
      wx.showToast({ title: '加载设置失败', icon: 'none' });
    });

    // 同时也可以获取下设备在线状态
    onenetApi.fetchDeviceStatusHistory().then(statusInfo => {
      this.setData({ deviceStatus: statusInfo });
    });
  },

  // ----------------------------------------------------
  // 注意：以下的设置保存、重置等功能依赖于您在OneNET平台
  // 是否定义了对应的服务或属性。
  // 这里的 saveSettings 已被改造为使用新的onenet-api,
  // 但您需要确保 `this.data.settings` 的数据结构
  // 能被 `set-device-property` 接口正确识别。
  // ----------------------------------------------------

  // 修改设备名称
  onDeviceNameChange(e) {
    this.setData({
      'settings.deviceName': e.detail.value
    });
  },

  // 切换自动投食
  onAutoFeedChange(e) {
    this.setData({
      'settings.autoFeed': e.detail.value
    });
    this.saveSettings(); // 每次修改后自动保存
  },

  // 添加投食时间
  addFeedTime() {
    const feedTimes = this.data.settings.feedTimes;
    feedTimes.push({ time: '12:00', amount: 100 });
    this.setData({
      'settings.feedTimes': feedTimes
    });
  },

  // 删除投食时间
  removeFeedTime(e) {
    const index = e.currentTarget.dataset.index;
    const feedTimes = this.data.settings.feedTimes;
    feedTimes.splice(index, 1);
    this.setData({
      'settings.feedTimes': feedTimes
    });
  },

  // 修改投食时间
  onFeedTimeChange(e) {
    const { index, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`settings.feedTimes[${index}].${field}`]: value
    });
  },

  // 切换通知设置
  onNotificationChange(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({
      [`settings.notifications.${type}`]: e.detail.value
    });
  },

  // 修改阈值设置
  onThresholdChange(e) {
    const { type } = e.currentTarget.dataset;
    const value = Number(e.detail.value);
    
    this.setData({
      [`settings.thresholds.${type}`]: value
    }, () => {
      // 阈值变化后立即保存到本地存储
      this.saveSettingsToStorage();
      console.log('阈值已更新:', type, value);
    });
  },

  /**
   * @简要：保存设置
   * @注意：已改造为使用新的onenet-api
   */
  async saveSettings() {
    // 示例：只保存部分可设置的属性
    const paramsToSet = {
      auto_feed: this.data.settings.autoFeed,
      low_food_level: this.data.settings.thresholds.minFoodLevel,
      // ... 其他需要保存的参数
    };

    wx.showLoading({ title: '保存中...' });
    try {
      await onenetApi.setDeviceProperty(paramsToSet);
      wx.hideLoading();
      wx.showToast({ title: '设置已保存', icon: 'success' });
      this.saveSettingsToStorage();
    } catch (msg) {
      wx.hideLoading();
      console.error('保存设置失败:', msg);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  /**
   * @简要：重置设备
   * @注意：此功能需要您在OneNET平台定义"reset"相关的服务或属性
   */
  async resetDevice() {
    wx.showModal({
      title: '确认重置',
      content: '重置设备将清除所有设置，是否继续？',
      confirmText: '重置',
      confirmColor: '#fa5151',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '正在重置...' });
          try {
            // 示例：通过设置一个reset属性为true来触发重置
            await onenetApi.setDeviceProperty({ 'reset_device': true });
            wx.hideLoading();
            wx.showToast({ title: '设备已重置', icon: 'success' });
            this.fetchInitialSettings(); // 重新加载设置
          } catch (error) {
            wx.hideLoading();
            console.error('重置设备失败:', error);
            wx.showToast({ title: '重置失败', icon: 'none' });
          }
        }
      }
    });
  },

  /**
   * @简要：页面显示时刷新阈值设置
   */
  onShow() {
    // 每次页面显示时重新加载设置，确保数据同步
    this.loadSettingsFromStorage();
  },
}); 