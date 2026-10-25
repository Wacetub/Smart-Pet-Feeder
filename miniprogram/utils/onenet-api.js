const config = {
    auth_info: "version=2018-10-31&res=YOUR_AUTH_STRING", // 鉴权信息
    product_id: "YOUR_PRODUCT_ID", // 产品ID
    device_name: "YOUR_DEVICE_NAME", // 设备名称
    api_base_url: "https://iot-api.heclouds.com", // OneNET API基础URL
};

/**
 * @简要：获取设备所有最新属性的键值对集合
 * @注意：此函数将OneNET返回的属性数组转换为易于使用的JS对象
 * @返回值：Promise<Object> - 解析为 { temperature: 25, humidity: 60, ... } 形式的对象
 */
function fetchDeviceProperties() {
    return new Promise((resolve, reject) => {
        const { api_base_url, product_id, device_name, auth_info } = config;
        wx.request({
            url: `${api_base_url}/thingmodel/query-device-property?product_id=${product_id}&device_name=${device_name}`,
            method: "GET",
            header: { 'Authorization': auth_info },
            success: (res) => {
                if (res.data.code === 0 && res.data.data && Array.isArray(res.data.data)) {
                    const properties = {};
                    res.data.data.forEach(prop => {
                        properties[prop.identifier] = prop.value;
                    });
                    resolve(properties); // 返回一个键值对对象
                } else {
                    console.error("OneNET属性获取失败:", res.data.msg);
                    reject(res.data.msg || '获取属性失败');
                }
            },
            fail: (err) => {
                console.error("OneNET请求失败:", err);
                reject('网络请求失败');
            }
        });
    });
}

/**
 * @简要：获取设备在线状态历史
 * @返回值：Promise<Object> - OneNET返回的原始设备状态历史对象
 */
function fetchDeviceStatusHistory() {
    const now = new Date().getTime();
    const one_week_ago = now - 7 * 24 * 60 * 60 * 1000;
    
    return new Promise((resolve, reject) => {
        const { api_base_url, product_id, device_name, auth_info } = config;
        wx.request({
            url: `${api_base_url}/device/status-history?product_id=${product_id}&device_name=${device_name}&start_time=${one_week_ago}&end_time=${now}&limit=1`,
            method: "GET",
            header: { 'Authorization': auth_info },
            success: (res) => {
                // 此API成功时没有外层code，直接解析
                resolve(res.data);
            },
            fail: (err) => {
                console.error("设备状态信息请求失败:", err);
                reject('网络请求失败');
            }
        });
    });
}

/**
 * @简要：设置设备属性
 * @参数：params - 要设置的属性键值对对象, e.g. { "auto_feed": true }
 * @返回值：Promise<Object> - OneNET返回的成功信息
 */
function setDeviceProperty(params) {
    return new Promise((resolve, reject) => {
        const { api_base_url, product_id, device_name, auth_info } = config;
        wx.request({
            url: `${api_base_url}/thingmodel/set-device-property`,
            method: 'POST',
            header: { 'Authorization': auth_info },
            data: {
                "product_id": product_id,
                "device_name": device_name,
                "params": params
            },
            success: (res) => {
                if (res.data && res.data.code === 0 && res.data.data && res.data.data.code === 200) {
                    resolve(res.data);
                } else {
                    console.error('OneNET属性设置失败:', res.data.msg);
                    reject(res.data.msg || '操作失败');
                }
            },
            fail: (err) => {
                console.error('OneNET属性设置请求失败:', err);
                reject('网络请求失败');
            }
        });
    });
}

/**
 * @简要：获取设备历史数据
 * @参数：
 *   - startTime: 开始时间戳（毫秒）
 *   - endTime: 结束时间戳（毫秒）
 *   - identifier: 属性标识符，如 'addfood', 'addw' 等
 * @返回值：Promise<Array> - 历史数据记录数组
 */
function fetchDeviceHistory(startTime, endTime, identifier) {
    return new Promise((resolve, reject) => {
        const { api_base_url, product_id, device_name, auth_info } = config;
        wx.request({
            url: `${api_base_url}/thingmodel/query-device-property-history`,
            method: 'GET',
            header: { 'Authorization': auth_info },
            data: {
                product_id: product_id,
                device_name: device_name,
                identifier: identifier,
                start_time: startTime,
                end_time: endTime,
                limit: 100  // 限制返回100条记录
            },
            success: (res) => {
                if (res.data.code === 0 && res.data.data) {
                    // 将数据按时间排序
                    const sortedData = res.data.data.sort((a, b) => 
                        new Date(b.time).getTime() - new Date(a.time).getTime()
                    );
                    resolve(sortedData);
                } else {
                    console.error("获取历史数据失败:", res.data.msg);
                    reject(res.data.msg || '获取历史数据失败');
                }
            },
            fail: (err) => {
                console.error("历史数据请求失败:", err);
                reject('网络请求失败');
            }
        });
    });
}

/**
 * @简要：上传数据点
 * @参数：datapoints - 数据点数组，格式为 [{id: "addw", datapoints: [{value: 100}]}]
 * @返回值：Promise<Object> - OneNET返回的成功信息
 */
function uploadDatapoints(datapoints) {
    return new Promise((resolve, reject) => {
        const { api_base_url, product_id, device_name, auth_info } = config;
        
        // 构建请求URL
        const url = `${api_base_url}/datapoints?product_id=${product_id}&device_name=${device_name}`;
        
        wx.request({
            url: url,
            method: 'POST',
            header: { 
                'Authorization': auth_info,
                'Content-Type': 'application/json'
            },
            data: {
                "datastreams": datapoints
            },
            success: (res) => {
                console.log('OneNET数据上传响应:', res.data);
                if (res.data && res.data.errno === 0) {
                    resolve(res.data);
                } else {
                    console.error('OneNET数据点上传失败:', res.data);
                    reject(res.data.errmsg || '数据上传失败');
                }
            },
            fail: (err) => {
                console.error('OneNET数据点上传请求失败:', err);
                reject('网络请求失败');
            }
        });
    });
}

/**
 * @简要：上传单个数据点（简化版本）
 * @参数：identifier - 数据流标识符，如 "addw", "addfood"
 * @参数：value - 数据值
 * @返回值：Promise<Object> - OneNET返回的成功信息
 */
function uploadSingleDatapoint(identifier, value) {
    return new Promise((resolve, reject) => {
        const { api_base_url, product_id, device_name, auth_info } = config;
        
        // 使用正确的API端点
        const url = `${api_base_url}/thingmodel/set-device-property`;
        
        console.log('上传数据点:', { identifier, value, url });
        
        wx.request({
            url: url,
            method: 'POST',
            header: { 
                'Authorization': auth_info,
                'Content-Type': 'application/json'
            },
            data: {
                "product_id": product_id,
                "device_name": device_name,
                "params": {
                    [identifier]: value
                }
            },
            success: (res) => {
                console.log('OneNET数据上传响应:', res.data);
                if (res.data && res.data.code === 0 && res.data.data && res.data.data.code === 200) {
                    resolve(res.data);
                } else {
                    console.error('OneNET数据点上传失败:', res.data);
                    reject(res.data.msg || '数据上传失败');
                }
            },
            fail: (err) => {
                console.error('OneNET数据点上传请求失败:', err);
                reject('网络请求失败');
            }
        });
    });
}

/**
 * @简要：获取物模型详细信息
 * @返回值：Promise<Object> - 物模型详细信息
 */
function fetchThingModel() {
    return new Promise((resolve, reject) => {
        const { api_base_url, product_id, auth_info } = config;
        wx.request({
            url: `${api_base_url}/thingmodel/query-thing-model?product_id=${product_id}`,
            method: "GET",
            header: { 'Authorization': auth_info },
            success: (res) => {
                console.log("物模型信息:", res.data);
                if (res.data.code === 0) {
                    resolve(res.data.data);
                } else {
                    console.error("获取物模型失败:", res.data.msg);
                    reject(res.data.msg || '获取物模型失败');
                }
            },
            fail: (err) => {
                console.error("物模型请求失败:", err);
                reject('网络请求失败');
            }
        });
    });
}

/**
 * @简要：调用设备服务
 * @参数：serviceId - 服务ID
 * @参数：params - 服务参数
 * @返回值：Promise<Object> - OneNET返回的成功信息
 */
function callDeviceService(serviceId, params) {
    return new Promise((resolve, reject) => {
        const { api_base_url, product_id, device_name, auth_info } = config;
        wx.request({
            url: `${api_base_url}/thingmodel/call-device-service`,
            method: 'POST',
            header: { 
                'Authorization': auth_info,
                'Content-Type': 'application/json'
            },
            data: {
                "product_id": product_id,
                "device_name": device_name,
                "service_id": serviceId,
                "params": params
            },
            success: (res) => {
                console.log('OneNET服务调用响应:', res.data);
                if (res.data && res.data.code === 0) {
                    resolve(res.data);
                } else {
                    console.error('OneNET服务调用失败:', res.data);
                    reject(res.data.msg || '服务调用失败');
                }
            },
            fail: (err) => {
                console.error('OneNET服务调用请求失败:', err);
                reject('网络请求失败');
            }
        });
    });
}

module.exports = {
    fetchDeviceProperties,
    fetchDeviceStatusHistory,
    setDeviceProperty,
    fetchDeviceHistory,
    uploadDatapoints,
    uploadSingleDatapoint,
    fetchThingModel,
    callDeviceService
}; 
