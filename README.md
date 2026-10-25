# Smart-Pet-Feeder —— 基于 STM32 的智能喂食器

面向"人不在家"场景的宠物喂食器物联网方案：设备端采集**粮仓余量、饮水余量、环境温湿度**，经 Wi-Fi 上 OneNET；微信小程序四页实现实时查看、阈值告警、远程投食/加水，并接了一个 AI 养护问答助手。

> 物联网传输层 课程设计（2 人协作：硬件 + 应用端）。
> 仓库包含 **设备端固件**（Keil MDK，正点原子战舰 STM32F103ZET6）与 **微信小程序**（原生 + TDesign）。

---

## 1. 系统概览

| 层级 | 组成 | 作用 |
| --- | --- | --- |
| 设备层 | STM32F103ZET6 + HX711 / YW01 / DHT11 + LCD | 采集、本地显示、阈值声光告警、组包上报 |
| 云平台 | OneNET（物模型 4 属性 + MQTT） | 属性存储、命令下发 |
| 应用层 | 微信小程序（4 页） | 查看数据、阈值告警、投食/加水、AI 问答 |

| 能力 | 实现 |
| --- | --- |
| 余粮监测 | HX711 + 应变式传感器，去皮 + 标定后换算克数 |
| 余水监测 | YW01 液位，ADC 换算 0–100 % |
| 环境监测 | DHT11 单总线 |
| 本地告警 | 水位 ≤ 20 % → LED 闪烁 + 蜂鸣 5 s 自停 |
| 上云 | ESP8266 AT 指令 → OneNET 物模型属性 |
| 手机端 | 3 s 轮询属性接口，四类阈值判警 |
| 远程控制 | 属性设置 / 服务调用双通道，失败自动降级 |
| AI 助手 | 小程序 agent-ui + 大模型，多轮对话 |

## 2. 目录结构

```
Smart-Pet-Feeder/
├── firmware/                 # 设备端（Keil MDK）
│   ├── USER/test.c           # 主程序：采集、LCD、告警、MQTT 上报
│   ├── HARDWARE/HX711/       # 称重驱动
│   ├── HARDWARE/YW01/        # 液位驱动
│   ├── HARDWARE/DHT11/       # 温湿度驱动
│   ├── NET/ESP8266/          # AT 指令封装
│   ├── NET/ONENET/           # 平台接入
│   └── SYSTEM/               # 时钟、串口、延时
├── miniprogram/              # 微信小程序
│   ├── pages/pet-feeder/     # control / monitor / ai-assistant / settings
│   ├── utils/onenet-api.js   # 云端 API 封装
│   ├── components/           # agent-ui 等组件
│   └── app.js / app.json
├── docs/                     # 设计文档、面试讲述稿
├── README.md
└── .gitignore
```

## 3. 硬件与接口

主控：正点原子战舰开发板 **STM32F103ZET6**（Cortex-M3，72 MHz，512 KB Flash / 64 KB SRAM）。

| 功能 | 器件 | 接口 | 说明 |
| --- | --- | --- | --- |
| 称重 | HX711 + 应变片 | 2 线（SCK/DOUT） | 24 位 ADC，去皮 + 标定后得克数 |
| 液位 | YW01 | ADC | 线性换算 0–100 % |
| 温湿度 | DHT11 | 单总线 | 主机拉低 ≥18 ms 启动 |
| Wi-Fi | ESP8266 | USART2 115200 | AT 固件，MQTT 接入 OneNET |
| 显示 | LCD（ILI93xx） | FSMC | 四行实时数据 |
| 告警 | 蜂鸣器 + LED | GPIO | 水位过低触发，5 s 自停 |
| 校准 | KEY0 | GPIO | 重新去皮 |

## 4. 设备端软件

主循环用**计数分频**而非多定时器，把不同周期的事拆开：

| 周期 | 动作 | 实现 |
| --- | --- | --- |
| 10 ms | 主循环节拍 | `delay_ms(10)` + `t++` |
| 100 ms | 读三路传感器、刷新 LCD | `t % 10 == 0` |
| 10 s | 组 JSON、发 MQTT | `t % 100 == 0` + flag 防重复 |
| 1 s | 运行灯翻转 | `t == 20` |

上报报文（OneNET 物模型属性格式）：

```json
{
  "id": "123",
  "params": {
    "food":    { "value": 1250 },
    "shuiwei": { "value": 65 },
    "temp":    { "value": 26 },
    "humi":    { "value": 58 }
  }
}
```

MQTT 主题：`$sys/{产品ID}/{设备名}/thing/property/post`。

## 5. 微信小程序

| 页面 | 路径 | 职责 |
| --- | --- | --- |
| 控制 | `pages/pet-feeder/control` | 数据卡片、手动投食/加水、告警高亮 |
| 监控 | `pages/pet-feeder/monitor` | 余粮/水位进度、在线状态、加水历史 |
| AI 助手 | `pages/pet-feeder/ai-assistant` | 养护问答（多轮 + 联网检索） |
| 设置 | `pages/pet-feeder/settings` | 四类阈值配置，存本地缓存 |

云端请求统一收敛在 `utils/onenet-api.js`：

```js
fetchDeviceProperties()    // GET  /thingmodel/query-device-property
fetchDeviceStatusHistory() // GET  /device/status-history
setDeviceProperty(params)  // POST /thingmodel/set-device-property
callDeviceService(n, p)    // POST /thingmodel/call-service
```

两个关键设计：

- **阈值跨页同步**：设置页写 `wx.setStorageSync('settings')`，控制页在 `onShow` 重新读取，避免"设置改了、控制页还是旧值"。
- **控制双通道降级**：`setDeviceProperty` 失败自动走 `callDeviceService`。不同固件对两者支持不一致，只走一条时用户无法区分是网络问题还是设备问题。

阈值默认值：温度 15–30 ℃、湿度 40–80 %、水位 < 30 %、余粮 < 30 %。

## 6. 快速开始

**设备端**

1. Keil MDK 5 + STM32F1 器件包，打开 `firmware/USER/test.uvprojx`；
2. 复制 `USER/config.local.h.example` 为 `config.local.h`，填入自己的 Wi-Fi 与 OneNET 参数（该文件已 gitignore）；
3. 编译、烧录（ST-Link / 串口 ISP）。

**小程序**

1. 微信开发者工具导入 `miniprogram/`；
2. 修改 `utils/onenet-api.js` 顶部的 `auth_info` / `product_id` / `device_name`；
3. 编译预览（依赖 `miniprogram_npm/tdesign-miniprogram`，无需重新构建）。

> ⚠️ 仓库中的 Wi-Fi 账号、OneNET 产品 ID / 设备名 / 鉴权串、云开发环境 ID 均已替换为占位符。

## 7. 实现状态

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| 传感器采集 | ✅ 已验证 | 三路读数稳定，LCD 实时刷新 |
| 本地告警 | ✅ 已验证 | 水位 ≤ 20 % 触发声光，5 s 自停 |
| 小程序读取/判警 | ✅ 已验证 | 3 s 轮询，四类阈值告警 |
| 控制下发 | ✅ 平台侧已验证 | 双通道可达；设备端执行待接执行机构 |
| AI 助手 | ✅ 已验证 | 多轮对话、联网检索 |
| 设备端 MQTT 上行 | 🚧 联调中 | AT 序列与 JSON 组包完成；受校园网 Portal 认证限制，透传需在普通 Wi-Fi 环境完成最终验证 |

## 8. 已知问题与改进

- **上云未闭环**：Portal 认证网络无法用 `AT+CWJAP` 直接通网，需换热点/企业 Wi-Fi 并补齐 AT 回显判断与重连；
- **无执行机构**：投食/加水只到"指令下发"，待接 SG90 舵机（出粮）+ 5 V 小水泵（加水）；
- **无断网缓存**：断网期间数据丢弃，待加 Flash 环形缓冲与补传；
- **鉴权硬编码**：鉴权串写在小程序常量里，应改为云函数按需签发短期 token；
- **轮询偏密**：3 s 一次对个人配额有压力，可改为 10–30 s 或仅页面可见时轮询。

## 9. 文档

- 设计文档（完整版，12 页）：`docs/智能喂食器-设计文档.pdf`
- 设计文档（精简版，4 页）：`docs/智能喂食器-设计文档-精简版.pdf`
- 面试讲述稿：`docs/智能喂食器-面试讲述稿.pdf`

## 10. License

课程设计代码，仅供学习参考。`miniprogram_npm/tdesign-miniprogram` 版权归腾讯 TDesign 团队，`HARDWARE/`、`SYSTEM/` 中部分驱动基于正点原子例程。
