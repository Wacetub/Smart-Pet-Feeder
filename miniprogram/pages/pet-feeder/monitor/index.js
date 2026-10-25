const app = getApp();
const onenetApi = require('../../../utils/onenet-api.js');

Page({
  data: {
    deviceProperties: null, // 存储设备属性的键值对对象
    foodLevel: 0, // 食物余量百分比
    waterLevel: 0, // 水量百分比
    deviceStatus: null, // 存储设备在线状态
    waterHistory: [], // 本地加水历史记录
    todayStats: {
      totalWater: 0,
      waterCount: 0
    },
    dateRange: {
      start: '',
      end: ''
    }
  },

  /**
   * 页面加载，启动数据轮询
   */
  onLoad() {
    // 设置默认时间范围为最近7天
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    
    this.setData({
      dateRange: {
        start: sevenDaysAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      }
    });

    this.fetchDataAndStatus();
    this.dataPolling = setInterval(() => {
      this.fetchDataAndStatus();
    }, 3000); // 每3秒刷新
    
    this.loadLocalWaterHistory(); // 加载本地加水历史数据
  },

  /**
   * 页面显示时执行，重新加载历史数据
   */
  onShow() {
    // 每次页面显示时重新加载历史数据，确保与control页面同步
    this.loadLocalWaterHistory();
    console.log('Monitor页面历史数据已重新加载');
  },

  /**
   * 页面卸载，清理定时器
   */
  onUnload() {
    if (this.dataPolling) {
      clearInterval(this.dataPolling);
    }
  },

  /**
   * @简要：调用API获取设备属性和状态
   */
  fetchDataAndStatus() {
    // 获取设备属性
    onenetApi.fetchDeviceProperties().then(properties => {
      // 计算食物和水的百分比
      const foodLevel = properties.food ? Math.round((properties.food / 4000) * 100) : 0;
      const waterLevel = properties.shuiwei ? Math.round((properties.shuiwei / 100) * 100) : 0;

      this.setData({ 
        deviceProperties: properties,
        foodLevel: foodLevel > 100 ? 100 : foodLevel, // 确保不超过100
        waterLevel: waterLevel > 100 ? 100 : waterLevel // 确保不超过100
      });
    }).catch(msg => {
      console.error("获取属性失败:", msg);
      // 此页面为监控页，获取失败时静默处理，不在UI上频繁提示
    });

    // 获取设备在线状态
    onenetApi.fetchDeviceStatusHistory().then(statusInfo => {
      this.setData({
        deviceStatus: statusInfo
      });
    }).catch(msg => {
      console.error("获取状态失败:", msg);
    });
  },

  /**
   * @简要：从本地存储加载加水历史数据
   */
  loadLocalWaterHistory() {
    try {
      // 从本地存储获取加水历史记录
      const waterHistory = wx.getStorageSync('waterHistory') || [];
      
      // 根据日期范围过滤数据
      const filteredHistory = this.filterHistoryByDateRange(waterHistory);
      
      // 格式化时间显示
      const formattedHistory = filteredHistory.map(record => ({
        ...record,
        time: new Date(record.time).toLocaleString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          month: '2-digit',
          day: '2-digit'
        })
      }));
      
      // 计算今日统计数据
      const todayStats = this.calculateTodayStats(filteredHistory);
      
      this.setData({
        waterHistory: formattedHistory,
        todayStats
      });
    } catch (error) {
      console.error('加载本地加水历史失败:', error);
      wx.showToast({
        title: '加载历史数据失败',
        icon: 'none'
      });
    }
  },

  /**
   * @简要：根据日期范围过滤历史数据
   */
  filterHistoryByDateRange(history) {
    const startDate = new Date(this.data.dateRange.start);
    const endDate = new Date(this.data.dateRange.end);
    endDate.setHours(23, 59, 59, 999); // 设置为当天最后一毫秒

    return history.filter(record => {
      const recordDate = new Date(record.time);
      return recordDate >= startDate && recordDate <= endDate;
    });
  },

  /**
   * @简要：计算今日统计数据
   */
  calculateTodayStats(history) {
    const today = new Date().toDateString();
    const todayRecords = history.filter(record => 
      new Date(record.time).toDateString() === today
    );

    return {
      totalWater: todayRecords.reduce((sum, record) => sum + Number(record.amount), 0),
      waterCount: todayRecords.length
    };
  },

  /**
   * @简要：添加本地加水记录
   * @param {number} amount - 加水量（毫升）
   */
  addWaterRecord(amount) {
    const newRecord = {
      time: new Date().toISOString(),
      amount: amount,
      type: 'manual' // 手动加水
    };

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
    
    // 重新加载显示数据
    this.loadLocalWaterHistory();
  },

  /**
   * @简要：日期范围改变时触发重新加载
   */
  onDateRangeChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`dateRange.${field}`]: e.detail.value
    }, () => {
      this.loadLocalWaterHistory(); // 重新加载本地历史数据
    });
  },

  /**
   * @简要：清空历史记录
   */
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有加水历史记录吗？',
      confirmText: '清空',
      confirmColor: '#fa5151',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('waterHistory');
          this.loadLocalWaterHistory();
          wx.showToast({
            title: '历史记录已清空',
            icon: 'success'
          });
        }
      }
    });
  }
}); 