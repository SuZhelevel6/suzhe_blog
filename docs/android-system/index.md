---
sidebar: false
title: Android 系统开发
date: 2024-12-14
tags:
 - Android
 - 系统开发
---

<style>
/* 文章元信息居中 */
.VPDoc .content-container .content .doc-box,
.VPDoc .content-container .content .doc-box > * {
  text-align: center;
  justify-content: center;
}
</style>

### ⚙️ 系统原理

1. [Android 系统启动流程](./framework/Android系统启动流程.html) - 从 Bootloader 到 Launcher 的完整启动过程
2. [源码与编译](./framework/源码与编译.html) - AOSP 源码下载与编译环境搭建
3. [编译系统](./framework/编译系统.html) - Android.mk、Android.bp 与 Soong 构建系统
4. [进程间通信 (一)](./framework/进程间通信(一).html) - Linux IPC 机制与 Android 进程通信概述
5. [进程间通信 (二)](./framework/进程间通信(二).html) - AIDL、Messenger 与跨进程通信实战
6. [Binder 机制](./framework/进程通信机制Binder.html) - Binder 驱动原理与跨进程调用流程
7. [Android 进程和线程](./framework/Android进程和线程.html) - 进程优先级、线程模型与进程间关系
8. [Handler 消息机制](./framework/线程通信机制Handler.html) - Looper、MessageQueue 与消息循环原理
9. [AsyncTask (已过时)](./framework/线程通信机制AsyncTask.html) - AsyncTask 原理分析与替代方案
10. [Android 权限机制](./framework/Android权限机制.html) - 权限模型、运行时权限与 SELinux
11. [OTA 升级机制](./framework/OTA升级机制.html) - 系统升级流程、A/B 分区与增量更新

### 📦 Amlogic 方案

1. [S905x 方案合集](./customization/Amlogics905x方案合集.html) - S905x 系列芯片开发要点与常见问题
2. [产品名称定义](./customization/Amlogic产品名称定义.html) - Amlogic 产品型号命名规则与配置
3. [红外遥控器配置](./customization/Amlogic方案红外遥控器配置.html) - 红外遥控器按键映射与配置方法

### 🔧 驱动开发

1. [DVB Tuner 驱动分析](./customization/DVBTuner驱动运作机制分析.html) - DVB Tuner 驱动架构与工作原理
2. [CXD2878 多型号兼容](./customization/CXD2878Tuner多型号动态兼容实现方案.html) - 多型号 Tuner 动态识别与兼容方案
3. [Shell 命令执行框架](./customization/Shell命令执行框架实现.html) - 系统级 Shell 命令执行框架设计

### 🛠️ 功能修改

1. [休眠和屏保](./customization/sleep-screensaver.html) - 系统休眠策略与屏保功能定制
2. [WIFI 随机 MAC 地址](./customization/WIFI随机MAC地址.html) - MAC 地址随机化配置与禁用
3. [签名和权限](./customization/安卓的签名和权限.html) - 系统签名机制与权限配置
4. [APK 签名](./customization/AOSPapk签名.html) - APK 签名工具与签名流程
5. [Settings 展示所有应用](./customization/AOSPSettings展示所有应用.html) - 修改应用列表显示逻辑
6. [屏幕旋转按钮](./customization/Settings添加屏幕旋转按钮.html) - 在 Settings 中添加旋转控制
7. [分辨率与 density](./customization/分辨率与density.html) - 屏幕分辨率与像素密度配置
8. [修改默认音量](./customization/修改默认音量和最大音量.html) - 系统音量默认值与最大值修改
9. [开机启动日志服务](./customization/开机启动日志捕捉服务.html) - 开机自动启动日志捕捉服务
10. [去除升级时间戳校验](./customization/去除升级时间戳校验.html) - OTA 升级时间戳校验禁用
11. [Provision 解决 HOME 键失效](./customization/Provision解决Home键失效.html) - 首次开机 HOME 键失效修复
12. [udc-core 报错修复](./customization/udc-core报错.html) - USB Device Controller 报错解决
13. [JDWP 报错修复](./customization/jdwp报错.html) - Java Debug Wire Protocol 报错处理
