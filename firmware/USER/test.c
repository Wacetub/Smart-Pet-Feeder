#include "sys.h"
#include "delay.h"
#include "usart.h" 
#include "led.h" 		 	 
#include "lcd.h"  
#include "dht11.h"  
#include "adc.h"  
#include "YW01.h"  // 添加YW01液位传感器头文件
#include "beep.h"  // 添加蜂鸣器头文件
#include "key.h"  // 添加按键头文件
#include "HX711.h"  // 添加HX711重量传感器头文件
#include "string.h"

// ESP8266 WiFi配置
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define MQTT_BROKER "mqtts.heclouds.com"
#define MQTT_PORT 1883
#define MQTT_USERNAME "YOUR_DEVICE_NAME"
#define MQTT_PASSWORD "YOUR_DEVICE_KEY"
#define MQTT_TOPIC_PUB "$sys/{PRODUCT_ID}/{DEVICE_NAME}/thing/property/post"
#define MQTT_TOPIC_SUB "$sys/{PRODUCT_ID}/{DEVICE_NAME}/thing/property/post/reply"

// 发送AT指令函数
void ESP8266_SendCommand(char* cmd)
{
	printf("%s\r\n", cmd);
	delay_ms(1000);
}

// 初始化ESP8266和MQTT连接
void ESP8266_Init(void)
{
	// 测试AT指令
	ESP8266_SendCommand("AT");
	delay_ms(2000);
	
	// 复位模块
	ESP8266_SendCommand("AT+RST");
	delay_ms(3000);
	
	// 设置为station模式
	ESP8266_SendCommand("AT+CWMODE=1");
	delay_ms(2000);
	
	// 启动DHCP
	ESP8266_SendCommand("AT+CWDHCP=1,1");
	delay_ms(2000);
	
	// 连接WiFi
	char wifi_cmd[100];
	sprintf(wifi_cmd, "AT+CWJAP=\"%s\",\"%s\"", WIFI_SSID, WIFI_PASSWORD);
	ESP8266_SendCommand(wifi_cmd);
	delay_ms(5000);
	
	// 配置MQTT用户信息
	char mqtt_user_cmd[200];
	sprintf(mqtt_user_cmd, "AT+MQTTUSERCFG=0,1,\"%s\",\"%s\",\"version=2018-10-31&res=YOUR_AUTH_STRING\",0,0,\"\"", MQTT_USERNAME, MQTT_PASSWORD);
	ESP8266_SendCommand(mqtt_user_cmd);
	delay_ms(2000);
	
	// 连接MQTT服务器
	char mqtt_conn_cmd[100];
	sprintf(mqtt_conn_cmd, "AT+MQTTCONN=0,\"%s\",%d,1", MQTT_BROKER, MQTT_PORT);
	ESP8266_SendCommand(mqtt_conn_cmd);
	delay_ms(3000);
	
	// 订阅主题
	char mqtt_sub_cmd[100];
	sprintf(mqtt_sub_cmd, "AT+MQTTSUB=0,\"%s\",1", MQTT_TOPIC_SUB);
	ESP8266_SendCommand(mqtt_sub_cmd);
	delay_ms(2000);
}

// 发送传感器数据到云平台
void Send_SensorData(u8 temp, u8 humi, int level, int weight)
{
	char mqtt_pub_cmd[300];
	char json_data[200];
	
	// 构建JSON数据，使用OneNet平台要求的字段名
	sprintf(json_data, "{\"id\":\"123\",\"params\":{\"food\":{\"value\":%d},\"shuiwei\":{\"value\":%d},\"temp\":{\"value\":%d},\"humi\":{\"value\":%d}}}", 
			weight, level, temp, humi);
	
	// 发送MQTT发布指令
	sprintf(mqtt_pub_cmd, "AT+MQTTPUB=0,\"%s\",\"%s\",0,0", MQTT_TOPIC_PUB, json_data);
	ESP8266_SendCommand(mqtt_pub_cmd);
	delay_ms(2000);
}

int main(void)
{   
	u8 t=0;               
	u8 temperature;         
	u8 humidity;         
	int level = 0; // 液位变量提前声明
	static u8 beep_flag = 0; // 蜂鸣器标志，静态变量
	static u32 beep_timer = 0; // 蜂鸣器定时器，静态变量
	int food_weight = 0; // 当前余粮，初始为0g
	static u8 data_send_flag = 0; // 数据发送标志
	Stm32_Clock_Init(9);    //系统时钟
	uart_init(72,115200);   //串口初始化为115200
	delay_init(72);         //延时初始化 
	LED_Init();             //初始化与LED相关的硬件接口
	LCD_Init();             //初始化LCD  
	BEEP_Init();            // 初始化蜂鸣器
	Adc_Init();             // 初始化ADC
	KEY_Init(); // 初始化按键（如未初始化需加上）
	HX711_GPIO_Init(); // 初始化HX711
	Get_Tare(); // 获取皮重（校准）
	POINT_COLOR=RED;        //画笔颜色：红色 
	LCD_ShowString(30,50,200,16,16,"WarShip STM32");   
	LCD_ShowString(30,70,200,16,16,"Smart Pet Feeder");   
	LCD_ShowString(30,90,200,16,16,"online monitoring");
	while(DHT11_Init()) //DHT11初始化   
	{
		LCD_ShowString(30,130,200,16,16,"DHT11 Error");
		delay_ms(200);
		LCD_Fill(30,130,239,130+16,WHITE);
		delay_ms(200);
	}                                  
	LCD_ShowString(30,130,200,16,16,"DHT11 OK");
	POINT_COLOR=BLUE;//画笔颜色：蓝色 
	LCD_ShowString(30,150,200,16,16,"Temp:  C");    
	LCD_ShowString(30,170,200,16,16,"Humi:  %");    
	LCD_ShowString(30,190,200,16,16,"Level:  %"); // 新增液位显示
	while(1)
	{                 
		if(t%10==0)         //每100ms读取一次
		{                                     
			DHT11_Read_Data(&temperature,&humidity); // 无论成功与否都直接显示
			LCD_ShowNum(30+40,150,temperature,2,16);    //显示温度            
			LCD_ShowNum(30+40,170,humidity,2,16);       //显示湿度           

			level = Get_Liquid_Level(); // 读取液位百分比
			LCD_ShowNum(30+48,190,level,3,16);      // 显示液位百分比

			if(level <= 20)
			{
				LED1 = !LED1; // LED1闪烁
				if(!beep_flag) // 只触发一次蜂鸣器
				{
					BEEP = 1;
					beep_flag = 1;
					beep_timer = 500; // 5秒，假设每次循环10ms
				}
				POINT_COLOR = RED; // 红色
				LCD_ShowString(30,110,200,16,16,"Water is poor!   "); // 警告信息
				POINT_COLOR = BLUE; // 恢复默认颜色
			}
			else
			{
				LED1 = 1; // 熄灭LED1
				BEEP = 0;
				beep_flag = 0;
				beep_timer = 0;
				POINT_COLOR = GREEN; // 绿色
				LCD_ShowString(30,110,200,16,16,"Water is enough           "); // 覆盖警告信息
				POINT_COLOR = BLUE; // 恢复默认颜色
			}

			// 蜂鸣器定时关闭
			if(beep_flag && beep_timer > 0)
			{
				beep_timer--;
				if(beep_timer == 0)
				{
					BEEP = 0;
					beep_flag = 0;
				}
			}

			// 检测KEY0按下，重新校准皮重
			if(KEY0 == 0) // 按下为0，松开为1
			{
				delay_ms(10); // 消抖
				if(KEY0 == 0)
				{
					Get_Tare(); // 重新校准皮重
				}
			}
			
			// 读取HX711重量值
			food_weight = ReadWeight();
			
			// 刷新余粮显示
			POINT_COLOR = BLACK;
			LCD_ShowString(30,220,200,16,16,"Rest food  :   g");
			LCD_ShowNum(30+72,220,food_weight,3,16);
			POINT_COLOR = BLUE;
			
			// 每10秒发送一次数据到云平台
			if(t % 100 == 0 && !data_send_flag)
			{
				Send_SensorData(temperature, humidity, level, food_weight);
				data_send_flag = 1;
			}
			if(t % 100 == 10)
			{
				data_send_flag = 0;
			}
		}                  
		delay_ms(10);
		t++;
		if(t==20)
		{
			t=0;
			LED0=!LED0;
		}
	}
}












