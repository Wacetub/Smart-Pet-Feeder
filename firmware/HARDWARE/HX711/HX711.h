#ifndef __HX711_H
#define __HX711_H
#include "sys.h"

#define  HX711_DATA  PBin(14)
#define  HX711_SCK   PBout(15)


// USART GPIO Òý½Åºê¶¨Òå
#define  HX711_GPIO_CLK            RCC_APB2Periph_GPIOB
#define  HX711_GPIO_APBxClkCmd     RCC_APB2PeriphClockCmd
	
#define  HX711_DATA_GPIO_PORT      GPIOB
#define  HX711_DATA_GPIO_PIN       GPIO_Pin_14
#define  HX711_SCK_GPIO_PORT       GPIOB   
#define  HX711_SCK_GPIO_PIN        GPIO_Pin_15



void HX711_GPIO_Init(void);
uint32_t Read_HX711(void);
void Get_Weight(void);
void Get_Tare(void);
int ReadWeight(void);


#endif

