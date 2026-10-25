/**
	************************************************************
	************************************************************
	************************************************************
	*	文件名： 	onenet.c
	*
	*	作者： 		张继瑞
	*
	*	日期： 		2017-05-08
	*
	*	版本： 		V1.1
	*
	*	说明： 		与onenet平台的数据交互接口层
	*
	*	修改记录：	V1.0：协议封装、返回判断都在同一个文件，并且不同协议接口不同。
	*				V1.1：提供统一接口供应用层使用，根据不同协议文件来封装协议相关的内容。
	************************************************************
	************************************************************
	************************************************************
**/

//单片机头文件
#include "stm32f10x.h"

//网络设备
#include "esp8266.h"

//协议文件
#include "onenet.h"
#include "mqttkit.h"

//硬件驱动
#include "usart.h"
#include "delay.h"
//#include "sht20.h"

//C库
#include <string.h>
#include <stdio.h>

//json库
#include"cjson.h"


#include"led.h"

#define PROID		"587**5"//产品ID

#define AUTH_INFO	"12**56"//鉴权信息（自定义）

#define DEVID		"106***674"//设备ID

u8 flag;
extern unsigned char esp8266_buf[128];
extern u8 humidityH;	  //湿度整数部分
extern u8 humidityL;	  //湿度小数部分
extern u8 temperatureH;   //温度整数部分
extern u8 temperatureL;   //温度小数部分
extern u8 adcx;   //光照度
 u8 LED0_FLAG;
 u8 LED1_FLAG;
//==========================================================
//	函数名称：	OneNet_DevLink
//
//	函数功能：	与onenet创建连接
//
//	入口参数：	无
//
//	返回参数：	1-成功	0-失败
//
//	说明：		与onenet平台建立连接
//==========================================================
_Bool OneNet_DevLink(void)
{
	
	MQTT_PACKET_STRUCTURE mqttPacket = {NULL, 0, 0, 0};					//协议包

	unsigned char *dataPtr;
	
	_Bool status = 1;
	//打印一下信息产品id,鉴权信息，设备ID
   printf("OneNet_DevLink\r\nPROID: %s,	AUIF: %s,	DEVID:%s\r\n", PROID, AUTH_INFO, DEVID);
	
	if(MQTT_PacketConnect(PROID, AUTH_INFO, DEVID, 256, 0, MQTT_QOS_LEVEL0, NULL, NULL, 0, &mqttPacket) == 0)
	{
		ESP8266_SendData(mqttPacket._data, mqttPacket._len);			//上传平台
		
		dataPtr = ESP8266_GetIPD(250);									//等待平台响应
		if(dataPtr != NULL)//如果平台返回数据不为空则
		{
			if(MQTT_UnPacketRecv(dataPtr) == MQTT_PKT_CONNACK)//	MQTT数据接收类型判断（connack报文）
			{
				switch(MQTT_UnPacketConnectAck(dataPtr))//打印是否连接成功及连接失败的原因
				{
					case 0:printf( "Tips:	连接成功\r\n");status = 0;break;		
					case 1:printf(  "WARN:	连接失败：协议错误\r\n");break;
					case 2:printf(  "WARN:	连接失败：非法的clientid\r\n");break;
					case 3:printf(  "WARN:	连接失败：服务器失败\r\n");break;
					case 4:printf(  "WARN:	连接失败：用户名或密码错误\r\n");break;
					case 5:printf(  "WARN:	连接失败：非法链接(比如token非法)\r\n");break;	
					default:printf(  "ERR:	连接失败：未知错误\r\n");break;
				}
			}
		}
		
		MQTT_DeleteBuffer(&mqttPacket);								//删包
	}
	else
		printf( "WARN:	MQTT_PacketConnect Failed\r\n");
	
	return status;
	
}

unsigned char OneNet_FillBuf(char *buf)
{
	
	char text[32];
	
	LED0_FLAG=GPIO_ReadInputDataBit(GPIOB, GPIO_Pin_5);//读取LED的开关状态（即对应引脚的）
	LED1_FLAG=GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_5);
//	
//	printf("LED0_FLAG_TYPE=%d\n",sizeof(LED0_FLAG));
//	
	memset(text, 0, sizeof(text));
	
	strcpy(buf, ",;");
	
	memset(text, 0, sizeof(text));
	sprintf(text, "Tempreture,%d.%d;",temperatureH,temperatureL);
	strcat(buf, text);
	
	memset(text, 0, sizeof(text));
	sprintf(text, "Humidity,%d.%d;", humidityH,humidityL);
	strcat(buf, text);
	
	memset(text, 0, sizeof(text));
	sprintf(text, "LED0,%d;", LED0_FLAG);
	strcat(buf, text);
	
	memset(text, 0, sizeof(text));
	sprintf(text, "LED1,%d;", LED1_FLAG);
	strcat(buf, text);
	
	memset(text, 0, sizeof(text));
	sprintf(text, "adcx,%d;", adcx);
	strcat(buf, text);
	
	memset(text, 0, sizeof(text));
	sprintf(text, "name,%s;", "hahahha");
	strcat(buf, text);
	
	printf("buf_mqtt=%s\r\n",buf);
	return strlen(buf);

}

//==========================================================
//	函数名称：	OneNet_SendData
//
//	函数功能：	上传数据到平台
//
//	入口参数：	type：发送数据的格式
//
//	返回参数：	无
//
//	说明：		
//==========================================================
void OneNet_SendData(void)
{
	
	MQTT_PACKET_STRUCTURE mqttPacket = {NULL, 0, 0, 0};												//协议包
	
	char buf[128];
	
	short body_len = 0, i = 0;
	
	//printf( "Tips:	OneNet_SendData-MQTT\r\n");
	
	memset(buf, 0, sizeof(buf));//清空数组内容
	
	body_len = OneNet_FillBuf(buf);																	//获取当前需要发送的数据流的总长度
	
	if(body_len)
	{
		if(MQTT_PacketSaveData(DEVID, body_len, NULL, 5, &mqttPacket) == 0)							//封包
		{
			for(; i < body_len; i++)
				mqttPacket._data[mqttPacket._len++] = buf[i];
			
			ESP8266_SendData(mqttPacket._data, mqttPacket._len);									//上传数据到平台
			printf( "Send %d Bytes\r\n", mqttPacket._len);
			
			MQTT_DeleteBuffer(&mqttPacket);															//删包
		}
		else{
			printf(  "WARN:	EDP_NewBuffer Failed\r\n");
		}
	}
	
}

//==========================================================
//	函数名称：	OneNet_HeartBeat
//
//	函数功能：	心跳检测
//
//	入口参数：	无
//
//	返回参数：	无
//
//	说明：		
//==========================================================
void OneNet_HeartBeat(void)
{
	unsigned char *dataPtr = NULL;
	MQTT_PACKET_STRUCTURE mqttPacket = {NULL, 0, 0, 0};
	
	unsigned char sCount = 3;
	
//---------------------------------------------步骤一：组包---------------------------------------------
	if(MQTT_PacketPing(&mqttPacket))
		return;
	
//	while(sCount--)
//	{
//---------------------------------------------步骤二：发送数据-----------------------------------------
		ESP8266_SendData(mqttPacket._data, mqttPacket._len);
	  //while(OneNet_DevLink(Tips))
//---------------------------------------------步骤三：解析返回数据-------------------------------------
		dataPtr = ESP8266_GetIPD(100);
		if(MQTT_UnPacketRecv(dataPtr) == MQTT_PKT_PINGRESP)
		{
			printf( "Tips:	HeartBeat OK！\r\n");
			
		//	break;
		}
		else
		{
			ESP8266_Init();					//初始化ESP8266
			while(OneNet_DevLink())			//接入OneNET
				delay_ms(500);
			printf("重连成功\r\n");
		}
		
		delay_ms(10);
//	}
	
//---------------------------------------------步骤四：删包---------------------------------------------
	MQTT_DeleteBuffer(&mqttPacket);
 
}

//==========================================================
//	函数名称：	OneNet_RevPro
//
//	函数功能：	平台返回数据检测
//
//	入口参数：	dataPtr：平台返回的数据
//
//	返回参数：	无
//
//	说明：		
//==========================================================
void OneNet_RevPro(unsigned char *cmd)
{
	
	MQTT_PACKET_STRUCTURE mqttPacket = {NULL, 0, 0, 0};								//协议包
	
	char *req_payload = NULL;
	char *cmdid_topic = NULL;
	
	unsigned short req_len = 0;
  unsigned char type = 0;

	short result = 0;

	char *dataPtr = NULL;
	char numBuf[10];
	int num = 0;

	
	cJSON *json , *json_value;
  cJSON *json1, *json_value1;


	type = MQTT_UnPacketRecv(cmd);
	
//	printf("type=======%d\r\n",type);
//	printf("MQTT_PKT_CMD=======%d\r\n",MQTT_PKT_CMD);
//	printf("MQTT_PKT_PUBACK=======%d\r\n",MQTT_PKT_PUBACK);
	
	switch(type)
	{
		case MQTT_PKT_CMD:															//命令下发
			
			result = MQTT_UnPacketCmd(cmd, &cmdid_topic, &req_payload, &req_len);	//解出topic和消息体
			if(result == 0)
			{
				//打印收到的信息
				printf(  "cmdid: %s, req: %s, req_len: %d\r\n", cmdid_topic, req_payload, req_len);
				
				// 对数据包req_payload进行JSON格式解析
				json = cJSON_Parse(req_payload);
				
				if (!json)//如果json内容为空，则打印错误信息
					printf("Error before: [%s]\n",cJSON_GetErrorPtr());
				else
				{
					json_value = cJSON_GetObjectItem(json , "LED0");//提取对应属性的数值
  
  				printf("json_value: [%d]\r\n",json_value->valueint);//转化为数值型数值
					
					if((json_value->valueint)==1)
						LED0=0;
					else if((json_value->valueint)==0)			
						LED0=1;
				}
				
//			json1 = cJSON_Parse(req_payload);
//			if (!json1)
//				printf("Error before: [%s]\n",cJSON_GetErrorPtr());
//			else
//			{
//				json_value1 = cJSON_GetObjectItem(json1 , "LED1");

//				if((json_value1->valueint)==1)
//				LED1=1;
//				else if((json_value1->valueint)==0)
//				LED1=0;
//			
//			}

				if(MQTT_PacketCmdResp(cmdid_topic, req_payload, &mqttPacket) == 0)	//命令回复组包
				{
					printf( "Tips:	Send CmdResp\r\n");
					
					ESP8266_SendData(mqttPacket._data, mqttPacket._len);			//回复命令
					MQTT_DeleteBuffer(&mqttPacket);									//删包
				}
				cJSON_Delete(json);//释放位于堆中cJSON结构体内存
				cJSON_Delete(json1);
			}
		
		break;
			
		case MQTT_PKT_PUBACK:														//发送Publish消息，平台回复的Ack
		
			if(MQTT_UnPacketPublishAck(cmd) == 0)
				//printf(  "Tips:	MQTT Publish Send OK\r\n");
			
		break;
		
		default:
			result = -1;
		break;
	}
	
	ESP8266_Clear();									//清空缓存
	
	if(result == -1)
		return;
	
	dataPtr = strchr(req_payload, ':');					//搜索'}'

	if(dataPtr != NULL && result != -1)					//如果找到了
	{
		dataPtr++;
		
		while(*dataPtr >= '0' && *dataPtr <= '9')		//判断是否是下发的命令控制数据
		{
			numBuf[num++] = *dataPtr++;
		}
		numBuf[num] = 0;
		
		num = atoi((const char *)numBuf);				//转为数值形式
	}

	
	
	if(type == MQTT_PKT_CMD || type == MQTT_PKT_PUBLISH)
	{
		MQTT_FreeBuffer(cmdid_topic);
		MQTT_FreeBuffer(req_payload);
	}
}

