# 图片资源清单

## 已存在的图片（在 assets/ 目录下）
- `temp.png` - 温度图标（正常状态）✅
- `temp1.png` - 温度图标（警报状态）✅
- `humi.png` - 湿度图标（正常状态）✅  
- `humi1.png` - 湿度图标（警报状态）✅
- `shuiwei.png` - 水位图标（正常状态）✅
- `shuiwei1.png` - 水位图标（警报状态）✅
- `food.png` - 食物图标（正常状态）✅
- `food1.png` - 食物图标（警报状态）✅
- `icon-connected.png` - 设备在线图标 ✅
- `icon-disconnected.png` - 设备离线图标 ✅

## 需要添加的图片（放在 assets/images/ 目录下）

### 控制功能图标
- `sensor.png` - 传感器状态图标（正常状态）
- `sensor-alert.png` - 传感器状态图标（警报状态）
- `feed.png` - 自动投食控制图标
- `water.png` - 自动加水控制图标
- `valve.png` - 阀门控制图标

### 手动控制图标
- `feed-amount.png` - 投食量控制图标
- `water-amount.png` - 加水量控制图标

## 图片规格建议
- 尺寸：60x60px 或 120x120px（2倍图）
- 格式：PNG（支持透明背景）
- 风格：扁平化、简洁的图标风格
- 颜色：建议使用蓝色系（#3d77ff）或灰色系

## 图片路径说明
所有图片路径都以 `/assets/` 开头，例如：
- `/assets/temp.png` - 温度图标（正常状态）
- `/assets/temp1.png` - 温度图标（警报状态）
- `/assets/images/sensor.png` - 传感器图标（正常状态）

## 动态切换逻辑
- **设备状态**: 在线显示 `icon-connected.png`，离线显示 `icon-disconnected.png`
- **温度**: 正常显示 `temp.png`，超出阈值显示 `temp1.png`
- **湿度**: 正常显示 `humi.png`，超出阈值显示 `humi1.png`
- **水位**: 正常显示 `shuiwei.png`，低于阈值显示 `shuiwei1.png`
- **食物**: 正常显示 `food.png`，低于阈值显示 `food1.png`
- **传感器**: 正常显示 `sensor.png`，异常显示 `sensor-alert.png`

## 警报效果
当数值超出阈值时：
1. 图片自动切换为警报版本
2. 添加红色滤镜和脉冲动画效果
3. 数值文字变为红色并闪烁 