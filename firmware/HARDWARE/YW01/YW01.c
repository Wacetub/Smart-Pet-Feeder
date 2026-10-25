#include "adc.h"
#include "YW01.h"


int Get_Liquid_Level(void) {  
    int yewei = Get_Adc_Average(ADC_CH1, 40); // ADC采样返回平均值  
    
    // 液位百分比  
    int yewei_baifen; // 液位百分比  
    if (yewei >= 1100) {  
        yewei_baifen = 100;  
    } else if (yewei >= 1000) {  
        yewei_baifen = 90;  
    } else if (yewei >= 850) {  
        yewei_baifen = 80;  
    } else if (yewei >= 600) {  
        yewei_baifen = 70;  
    } else if (yewei >= 460) {  
        yewei_baifen = 60;  
    } else if (yewei >= 390) {  
        yewei_baifen = 50;  
    } else if (yewei >= 290) {  
        yewei_baifen = 40;  
    } else if (yewei >= 330) {  
        yewei_baifen = 30;  
    } else if (yewei >= 260) {  
        yewei_baifen = 20;  
    } else if (yewei >= 220) {  
        yewei_baifen = 10;  
    } else {  
        yewei_baifen = 0; // 液位百分比为0%  
    }  

    return yewei_baifen; // 直接返回液位百分比  
}  




























