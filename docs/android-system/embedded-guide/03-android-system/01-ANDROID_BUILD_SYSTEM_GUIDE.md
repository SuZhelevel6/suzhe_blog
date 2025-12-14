# Android 编译系统详解

本文档详细介绍 Amlogic S905X5M (S7D) Android 14 平台的编译系统，包括编译流程、配置文件、模块添加等内容。

---

## 目录

1. [编译系统概述](#1-编译系统概述)
2. [项目编译入口](#2-项目编译入口)
3. [build.cfg 配置详解](#3-buildcfg-配置详解)
4. [产品配置文件体系](#4-产品配置文件体系)
5. [Android.bp 与 Soong 构建系统](#5-androidbp-与-soong-构建系统)
   - [5.3 命名空间 (Namespace)](#53-命名空间-namespace)
   - [5.4 分区与模块依赖规则 (Treble 架构)](#54-分区与模块依赖规则-treble-架构)
   - [5.5 AIDL 稳定性 (Stability)](#55-aidl-稳定性-stability)
6. [内核编译](#6-内核编译)
7. [常见编译任务](#7-常见编译任务)
8. [添加新模块](#8-添加新模块)
9. [编译输出与打包](#9-编译输出与打包)
10. [常见问题排查](#10-常见问题排查)

---

## 1. 编译系统概述

### 1.1 Android 编译系统演进

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Android 编译系统演进历史                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Android 6.0 及之前          Android 7.0 - 10          Android 11+        │
│   ┌─────────────────┐        ┌─────────────────┐      ┌─────────────────┐  │
│   │   GNU Make      │   →    │   Make + Soong  │  →   │   Soong/Ninja   │  │
│   │   Android.mk    │        │   Android.mk    │      │   Android.bp    │  │
│   │                 │        │   Android.bp    │      │   (Blueprint)   │  │
│   └─────────────────┘        └─────────────────┘      └─────────────────┘  │
│                                                                             │
│   特点:                      特点:                    特点:                 │
│   - 纯 Makefile              - 混合编译系统           - 声明式配置          │
│   - 灵活但慢                 - 过渡阶段               - 并行编译快          │
│   - 难以维护                 - 兼容旧代码             - 类型安全            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 本项目编译系统架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              编译系统架构                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │                    标准 Android 编译流程                          │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│          │                                                                  │
│          ├──── build.cfg          ← 编译配置文件                            │
│          │                                                                  │
│          ├──── source build/envsetup.sh  ← Android 环境初始化               │
│          │                                                                  │
│          ├──── lunch <product>-<variant>  ← 选择产品和构建类型              │
│          │                                                                  │
│          └──── make -jN / ninja   ← 执行编译                                │
│                    │                                                        │
│                    ▼                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                      Soong 构建系统                              │      │
│   ├─────────────────────────────────────────────────────────────────┤      │
│   │  Android.bp  →  Blueprint  →  Ninja  →  编译产物                │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 目录结构概览

```
aml-s905x5-androidu-v2/
├── build.cfg                   # 编译配置文件 [重要]
├── mk -> common/project/build/mk_script.sh  # 内核编译入口
│
├── build/                      # Android 原生编译系统
│   ├── envsetup.sh            # 环境初始化脚本
│   ├── soong/                 # Soong 构建工具
│   └── make/                  # Make 构建规则
│
├── device/amlogic/            # 设备/产品配置 [重要]
│   ├── ross/                  # S905X5M 产品目录
│   │   ├── ross.mk            # 产品主配置
│   │   ├── device.mk          # 设备配置
│   │   ├── BoardConfig.mk     # 板级配置
│   │   └── AndroidProducts.mk # 产品列表
│   └── common/                # Amlogic 通用配置
│
├── vendor/                    # 厂商私有代码
│   ├── amlogic/              # Amlogic 私有
│   └── xxx/                 # XXX 定制代码
│
├── bootloader/               # Bootloader 源码
│   └── uboot-repo/           # U-Boot
│
├── kernel/                   # 内核源码
│   └── common/
│
└── out/                      # 编译输出目录
    └── target/product/ross/  # 产品输出
```

---

## 2. 项目编译入口

### 2.1 标准 Android 编译方式

```bash
# 1. 初始化环境
source build/envsetup.sh

# 2. 选择产品
lunch ross-userdebug

# 3. 编译
make -j16

# 或使用 m 命令 (等价于 make)
m -j16
```

#### lunch 可选产品

```bash
# 查看所有可选产品
lunch

# S905X5M (ross) 产品系列
ross-eng          # 工程版本 (完整调试)
ross-userdebug    # 用户调试版本 (推荐开发)
ross-user         # 用户版本 (发布)

ross_atv-userdebug    # Android TV 版本
ross_soundbar-userdebug  # Soundbar 版本
ross_hybrid-userdebug    # Hybrid 版本
```

---

## 3. build.cfg 配置详解

**路径**: `build.cfg`

这是项目的核心配置文件，控制编译行为和产品特性。

### 3.1 配置项说明

```bash
####### 产品配置 #######

# 产品名称 - 决定使用哪个 device 目录
# 可选: ross | raman | qurra | ohm_wv4 | oppen_wv4
PRODUCT_NAME=ross

# 构建类型
# user     - 发布版本，关闭调试
# userdebug - 开发版本，保留 root 和调试 (推荐)
# eng      - 工程版本，完全开放
TYPE=userdebug

####### 功能开关 #######

# Android TV 编译
BOARD_COMPILE_ATV=false

# CTS/DRM 模块编译
BOARD_COMPILE_CTS=true

# Glauncher 桌面
NEED_GLAUNCHER=true

# 工厂测试模式
NEED_FACTORY_TEST=true

####### U-Boot 配置 #######

# Fastboot 写入功能 (adb remount 前提)
UBOOT_FASTBOOT_WRITE=false

# 生产模式 (禁用 fastboot unlock/串口调试)
UBOOT_PRODUCTION_MODE=false

####### WiFi/蓝牙 #######

# 禁用 WiFi
PRODUCT_DISABLE_WIFI=false

# 禁用蓝牙
PRODUCT_DISABLE_BLUETOOTH=false

# 蓝牙遥控器名称前缀
RO_VENDOR_AUTOCONNECTBT_NAMEPREFIX=XXX_BTRC_00BF

####### 安全配置 #######

# SELinux 宽容模式 (调试用)
AN_BOOT_SELINUX_PERMISSIVE=true

# Widevine DRM 等级 (1=L1, 3=L3)
#BOARD_WIDEVINE_OEMCRYPTO_LEVEL=3

####### 音频配置 #######

# Dolby 版本: non_dolby | ms12_v2
TARGET_DOLBY_VERSION=non_dolby

####### 调试配置 #######

# 启用串口控制台 (user 版本)
RO_BOOT_ENABLE_CONSOLE=false

# 默认开启 ADB
DEFAULT_ADBD_ON=false

####### 签名配置 #######

# 使用发布密钥
USE_RELEASE_KEY=false

# 证书目录
#CERTIFICATE_DIR=vendor/xxx/android-certs

####### 版本号 #######

# 构建版本号 (格式: X.Y.ZZZZZ)
XXX_BUILD_NUMBER=1.0.00000
```

### 3.2 产品与 U-Boot 映射关系

| PRODUCT_NAME | UBOOT_TARGET | SoC | device 目录 |
|--------------|--------------|-----|-------------|
| `ross` | `s7d_bm201` | S905X5M | `device/amlogic/ross` |
| `raman` | `s6_bl201` | S905X5 | `device/amlogic/raman` |
| `qurra` | `s7_bh201` | S905Y5 | `device/amlogic/qurra` |
| `ohm_wv4` | `sc2_ah212` | S905X4 | `device/amlogic/ohm_wv4` |
| `oppen_wv4` | `s4_ap222` | S905Y4 | `device/amlogic/oppen_wv4` |

### 3.3 构建类型对比

| 特性 | eng | userdebug | user |
|------|-----|-----------|------|
| root 权限 | ✅ | ✅ | ❌ |
| adb 默认开启 | ✅ | ✅ | ❌ |
| 调试符号 | ✅ | ✅ | ❌ |
| 性能优化 | ❌ | 部分 | ✅ |
| SELinux | permissive | enforcing | enforcing |
| 适用场景 | 开发调试 | 开发/测试 | 发布 |

---

## 4. 产品配置文件体系

### 4.1 配置文件层次结构

```
device/amlogic/ross/
├── AndroidProducts.mk      # 产品列表定义
├── ross.mk                 # 产品主配置 (入口)
├── device.mk               # 设备配置
├── BoardConfig.mk          # 板级配置 (硬件相关)
├── vendor_prop.mk          # vendor 属性
├── product_property.mk     # product 属性
└── Android.mk              # 模块编译
```

### 4.2 AndroidProducts.mk - 产品列表

**路径**: `device/amlogic/ross/AndroidProducts.mk`

定义了该目录下所有可用的产品配置：

```makefile
# 产品配置文件列表
PRODUCT_MAKEFILES := $(LOCAL_DIR)/ross.mk
PRODUCT_MAKEFILES += $(LOCAL_DIR)/ross_dongle.mk
PRODUCT_MAKEFILES += $(LOCAL_DIR)/ross_atv.mk
PRODUCT_MAKEFILES += $(LOCAL_DIR)/ross_soundbar.mk
# ...

# lunch 菜单选项
COMMON_LUNCH_CHOICES := \
    ross-eng \
    ross-user \
    ross-userdebug \
    ross_atv-eng \
    ross_atv-userdebug \
    # ...
```

### 4.3 ross.mk - 产品主配置

**路径**: `device/amlogic/ross/ross.mk`

产品配置的入口文件，定义产品特性和依赖：

```makefile
# 内核版本
TARGET_BUILD_KERNEL_VERSION ?= 5.15

# 产品目录
PRODUCT_DIR := ross

# 功能开关
VENDOR_MEDIA_CODEC2_SUPPORT := true
VENDOR_ENCODER_SUPPORT_HCODEC := true

# 继承通用配置
$(call inherit-product, device/amlogic/common/products/mbox/product_mbox.mk)
$(call inherit-product, device/amlogic/$(PRODUCT_DIR)/device.mk)
$(call inherit-product, device/amlogic/$(PRODUCT_DIR)/vendor_prop.mk)
$(call inherit-product, device/amlogic/$(PRODUCT_DIR)/product_property.mk)

# 产品信息
PRODUCT_NAME := $(TARGET_PRODUCT)
PRODUCT_DEVICE := $(TARGET_PRODUCT)
PRODUCT_BRAND := Amlogic
PRODUCT_MODEL := $(TARGET_PRODUCT)
PRODUCT_MANUFACTURER := Amlogic

# SoC 信息
PRODUCT_PROPERTY_OVERRIDES += \
    ro.soc.manufacturer=Amlogic \
    ro.soc.model=AMLS905X5M

# 平台版本
PLATFORM_TDK_VERSION := 318
BOARD_AML_SOC_TYPE ?= S905X5M

# AVB 配置
BUILD_WITH_AVB := true
BOARD_USES_VBMETA_SYSTEM := true

# 动态分区
PRODUCT_USE_DYNAMIC_PARTITIONS := true

# AB OTA
AB_OTA_UPDATER := true

# WiFi/蓝牙
include vendor/amlogic/common/wifi_bt/wifi/configs/wifi.mk
include vendor/amlogic/common/wifi_bt/bluetooth/configs/bluetooth.mk

# 音频
include device/amlogic/common/audio.mk

# GPU
include device/amlogic/common/gpu/vale-user-arm64.mk

# 平台特定
include device/amlogic/common/products/mbox/s7d/s7d.mk
```

### 4.4 BoardConfig.mk - 板级配置

**路径**: `device/amlogic/ross/BoardConfig.mk`

定义硬件相关的配置：

```makefile
# CPU 架构
TARGET_ARCH := arm64
TARGET_ARCH_VARIANT := armv8-2a
TARGET_CPU_VARIANT := cortex-a55
TARGET_CPU_ABI := arm64-v8a

# 32位支持
TARGET_2ND_ARCH := arm
TARGET_2ND_CPU_ABI := armeabi-v7a

# 平台
TARGET_BOARD_PLATFORM := s7d
TARGET_BOOTLOADER_BOARD_NAME := ross

# 显示配置
USE_OPENGL_RENDERER := true
USE_HWC2 := true
HWC_DISPLAY_NUM := 1
HWC_PRIMARY_FRAMEBUFFER_WIDTH := 1920
HWC_PRIMARY_FRAMEBUFFER_HEIGHT := 1080
HWC_PRIMARY_CONNECTOR_TYPE ?= hdmi

# 文件系统
TARGET_USERIMAGES_USE_EXT4 := true
TARGET_USERIMAGES_USE_F2FS := true
BOARD_SYSTEMIMAGE_FILE_SYSTEM_TYPE := erofs
BOARD_VENDORIMAGE_FILE_SYSTEM_TYPE := erofs

# 分区大小
BOARD_SUPER_PARTITION_SIZE := 3355443200
BOARD_USERDATAIMAGE_PARTITION_SIZE := 576716800
BOARD_BOOTIMAGE_PARTITION_SIZE := 67108864

# 动态分区
BOARD_SUPER_PARTITION_GROUPS := amlogic_dynamic_partitions
BOARD_AMLOGIC_DYNAMIC_PARTITIONS_PARTITION_LIST := \
    system vendor product odm system_ext \
    vendor_dlkm system_dlkm odm_dlkm

# Boot 配置
BOARD_BOOT_HEADER_VERSION := 4
BOARD_RAMDISK_USE_LZ4 := true
BOARD_BOOTCONFIG += androidboot.dynamic_partitions=true
BOARD_BOOTCONFIG += "androidboot.boot_devices=soc/fe08c000.mmc"

# SELinux
ifeq ($(AN_BOOT_SELINUX_PERMISSIVE), true)
BOARD_KERNEL_CMDLINE += androidboot.selinux=permissive
endif
```

### 4.5 device.mk - 设备配置

**路径**: `device/amlogic/ross/device.mk`

定义设备需要的文件和软件包：

```makefile
# Shipping API Level
PRODUCT_SHIPPING_API_LEVEL := 34

# HIDL Manifest
DEVICE_MANIFEST_FILE += device/amlogic/common/hidl_manifests/34/manifest_common.xml

# Soong 命名空间
PRODUCT_SOONG_NAMESPACES += \
    device/amlogic/common \
    hardware/amlogic \
    vendor/amlogic/common

# 产品特性
PRODUCT_CHARACTERISTICS := tv,nosdcard

# 文件复制
PRODUCT_COPY_FILES += \
    device/amlogic/$(PRODUCT_DIR)/init.amlogic.board.rc:$(TARGET_COPY_OUT_VENDOR)/etc/init/hw/init.amlogic.board.rc

# Media Codec
PRODUCT_COPY_FILES += \
    device/amlogic/$(PRODUCT_DIR)/files/media_codecs.xml:$(TARGET_COPY_OUT_VENDOR)/etc/media_codecs.xml

# 音频配置
PRODUCT_COPY_FILES += \
    device/amlogic/$(PRODUCT_DIR)/files/audio_effects.conf:$(TARGET_COPY_OUT_VENDOR)/etc/audio_effects.conf \
    device/amlogic/$(PRODUCT_DIR)/files/mixer_paths.xml:$(TARGET_COPY_OUT_VENDOR)/etc/mixer_paths.xml

# 显示配置
PRODUCT_COPY_FILES += \
    device/amlogic/$(PRODUCT_DIR)/files/mesondisplay.cfg:$(TARGET_COPY_OUT_VENDOR)/etc/mesondisplay.cfg

# Dalvik 堆配置
$(call inherit-product, frameworks/native/build/tablet-7in-hdpi-1024-dalvik-heap.mk)
```

### 4.6 配置继承关系图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         产品配置继承关系                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    ┌──────────────────────┐                                 │
│                    │    ross.mk (入口)    │                                 │
│                    └──────────┬───────────┘                                 │
│                               │                                             │
│           ┌───────────────────┼───────────────────┐                         │
│           │                   │                   │                         │
│           ▼                   ▼                   ▼                         │
│   ┌───────────────┐   ┌───────────────┐   ┌────────────────┐                │
│   │   device.mk   │   │ vendor_prop.mk│   │product_property│                │
│   └───────┬───────┘   └───────────────┘   └────────────────┘                │
│           │                                                                 │
│           ▼                                                                 │
│   ┌─────────────────────────────────────────────────────────┐                │
│   │     device/amlogic/common/products/mbox/product_mbox.mk │               │
│   └───────────────────────────┬─────────────────────────────┘                │
│                               │                                             │
│           ┌───────────────────┼───────────────────┐                         │
│           │                   │                   │                         │
│           ▼                   ▼                   ▼                         │
│   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐                │
│   │   audio.mk    │   │   media.mk    │   │    gpu.mk     │                │
│   └───────────────┘   └───────────────┘   └───────────────┘                │
│                               │                                             │
│                               ▼                                             │
│                   ┌───────────────────────┐                                 │
│                   │ s7d/s7d.mk (平台特定) │                                 │
│                   └───────────────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Android.bp 与 Soong 构建系统

### 5.1 Android.bp 基础语法

Android.bp 使用 Blueprint 格式，是一种声明式配置语言：

```javascript
// 模块类型 {
//     name: "模块名",
//     属性: 值,
// }

// 示例: 编译一个 Android 应用
android_app {
    name: "ResolutionModeTester",
    srcs: ["src/**/*.java"],
    certificate: "platform",
    privileged: true,
    platform_apis: true,
    static_libs: [
        "SettingsLib",
    ],
}
```

### 5.2 常用模块类型

#### 5.2.1 应用模块

```javascript
// Android 应用
android_app {
    name: "MyApp",
    srcs: ["src/**/*.java"],
    resource_dirs: ["res"],
    manifest: "AndroidManifest.xml",

    // 签名
    certificate: "platform",  // 系统签名
    // certificate: "PRESIGNED",  // 预签名

    // 权限
    privileged: true,  // 特权应用 (priv-app)
    platform_apis: true,  // 使用平台 API

    // 依赖
    static_libs: [
        "androidx.appcompat_appcompat",
    ],

    // SDK 版本
    sdk_version: "current",
    min_sdk_version: "30",

    // 优化
    optimize: {
        enabled: true,
        proguard_flags_files: ["proguard.flags"],
    },
}
```

#### 5.2.2 共享库模块

```javascript
// C/C++ 共享库
cc_library_shared {
    name: "libmylib",
    srcs: [
        "src/*.cpp",
    ],

    // 头文件目录
    local_include_dirs: ["include"],
    export_include_dirs: ["include"],

    // 依赖库
    shared_libs: [
        "liblog",
        "libutils",
    ],

    // 编译选项
    cflags: [
        "-Wall",
        "-Werror",
    ],

    // 厂商模块
    vendor: true,
    // proprietary: true,
}
```

#### 5.2.3 可执行文件模块

```javascript
// 可执行文件
cc_binary {
    name: "mytool",
    srcs: ["main.cpp"],

    shared_libs: [
        "libbase",
        "liblog",
    ],

    // 安装位置
    vendor: true,  // /vendor/bin
    // system_ext_specific: true,  // /system_ext/bin

    init_rc: ["mytool.rc"],  // init 脚本
}
```

#### 5.2.4 预编译模块

```javascript
// 预编译 APK
android_app_import {
    name: "PrebuiltApp",
    apk: "prebuilt/MyApp.apk",
    presigned: true,
    privileged: true,
    dex_preopt: {
        enabled: false,
    },
}

// 预编译共享库
cc_prebuilt_library_shared {
    name: "libprebuilt",
    vendor: true,
    strip: {
        none: true,
    },
    target: {
        android_arm64: {
            srcs: ["lib/arm64/libprebuilt.so"],
        },
        android_arm: {
            srcs: ["lib/arm/libprebuilt.so"],
        },
    },
}
```

#### 5.2.5 Java 库模块

```javascript
// Java 库
java_library {
    name: "mylib-java",
    srcs: ["src/**/*.java"],

    static_libs: [
        "androidx.annotation_annotation",
    ],

    sdk_version: "current",
}

// AIDL 接口
aidl_interface {
    name: "myinterface-aidl",
    srcs: ["aidl/**/*.aidl"],

    backend: {
        java: {
            enabled: true,
            platform_apis: true,
        },
        cpp: {
            enabled: true,
        },
    },

    versions: ["1"],
}
```

### 5.3 命名空间 (Namespace)

本项目使用命名空间管理模块可见性：

```javascript
// device/amlogic/ross/Android.bp
soong_namespace {
    imports: [
        "device/amlogic/common",
        "vendor/amlogic/common",
        "vendor/amlogic/ross",
    ],
}

package {
    default_applicable_licenses: ["device_amlogic_ross_license"],
}

license {
    name: "device_amlogic_ross_license",
    visibility: [":__subpackages__"],
    license_kinds: [
        "SPDX-license-identifier-Apache-2.0",
    ],
}
```

#### 5.3.1 默认命名空间

Android 构建系统有一个**默认命名空间**（Default Namespace），即源码根目录 (`.`)。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           命名空间层次结构                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   默认命名空间 (源码根目录 ".")                                               │
│   ├── frameworks/                    ← 自动属于默认命名空间                   │
│   ├── packages/                      ← 自动属于默认命名空间                   │
│   ├── system/                        ← 自动属于默认命名空间                   │
│   │                                                                         │
│   ├── device/amlogic/ross/           ← 自定义命名空间 (soong_namespace)      │
│   ├── vendor/amlogic/common/         ← 自定义命名空间 (soong_namespace)      │
│   └── hardware/amlogic/              ← 自定义命名空间 (soong_namespace)      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**关键规则**:
- 没有定义 `soong_namespace` 的目录自动属于**默认命名空间**
- 定义了 `soong_namespace` 的目录形成**独立命名空间**
- 命名空间内的模块名必须唯一，但不同命名空间可以有同名模块

#### 5.3.2 命名空间依赖规则

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         命名空间依赖关系                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      默认命名空间 (.)                                │  │
│   │   frameworks/base, packages/apps, system/core, ...                  │  │
│   └──────────────────────────────┬──────────────────────────────────────┘  │
│                                  │ (所有命名空间都可以依赖)                  │
│                                  ▼                                         │
│   ┌───────────────────┐    ┌───────────────────┐    ┌──────────────────┐  │
│   │ device/amlogic/   │    │ vendor/amlogic/   │    │ hardware/amlogic/│  │
│   │     ross          │───→│     common        │───→│                  │  │
│   └───────────────────┘    └───────────────────┘    └──────────────────┘  │
│         imports               imports                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**依赖规则**:

| 场景 | 是否允许 | 说明 |
|------|----------|------|
| 自定义命名空间 → 默认命名空间 | ✅ 允许 | 无需声明，自动可见 |
| 自定义命名空间 → 其他自定义命名空间 | ⚠️ 需声明 | 必须在 `soong_namespace.imports` 中声明 |
| 默认命名空间 → 自定义命名空间 | ❌ 不允许 | 默认命名空间无法导入其他命名空间 |

**示例**:

```javascript
// vendor/amlogic/common/Android.bp
soong_namespace {
    imports: [
        "hardware/amlogic",  // 导入其他命名空间
    ],
}

// 此命名空间内的模块可以依赖:
// 1. 默认命名空间的所有模块 (frameworks/base 等)
// 2. hardware/amlogic 命名空间的模块 (通过 imports 声明)
// 3. 自身命名空间内的模块
```

#### 5.3.3 启用命名空间

在产品配置中通过 `PRODUCT_SOONG_NAMESPACES` 启用：

```makefile
# device/amlogic/ross/device.mk
PRODUCT_SOONG_NAMESPACES += \
    device/amlogic/common \
    hardware/amlogic \
    vendor/amlogic/common
```

**注意**: 只有在 `PRODUCT_SOONG_NAMESPACES` 中列出的命名空间才会被构建系统识别。

### 5.4 分区与模块依赖规则 (Treble 架构)

Android 8.0 引入的 **Treble 架构** 对分区间的依赖有严格限制。

#### 5.4.1 分区层次结构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Android 分区架构 (Treble)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                    System 域 (Framework)                             │  │
│   │  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────────┐  │  │
│   │  │ /system  │  │/system_ext│ │  /product  │  │  frameworks/     │  │  │
│   │  │          │  │           │ │            │  │  packages/apps   │  │  │
│   │  └──────────┘  └──────────┘  └────────────┘  └──────────────────┘  │  │
│   │                                                                     │  │
│   │  特点: 可升级、Google 维护、system stability                         │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                  │                                         │
│                      HIDL/AIDL 稳定接口                                    │
│                                  │                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                    Vendor 域 (Hardware)                              │  │
│   │  ┌──────────┐  ┌──────────┐  ┌────────────────────────────────────┐ │  │
│   │  │ /vendor  │  │   /odm   │  │  vendor/amlogic, hardware/amlogic  │ │  │
│   │  │          │  │          │  │  (芯片厂商 HAL 实现)                 │ │  │
│   │  └──────────┘  └──────────┘  └────────────────────────────────────┘ │  │
│   │                                                                     │  │
│   │  特点: 芯片厂商维护、vendor stability、设备特定                      │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.4.2 模块分区属性

在 Android.bp 中，通过以下属性指定模块安装到哪个分区：

```javascript
cc_library_shared {
    name: "libexample",

    // 安装到 /vendor (Vendor 域)
    vendor: true,
    // 或
    proprietary: true,

    // 安装到 /product (System 域)
    product_specific: true,

    // 安装到 /system_ext (System 域)
    system_ext_specific: true,

    // 安装到 /odm (Vendor 域)
    device_specific: true,

    // 不指定则默认安装到 /system
}
```

#### 5.4.3 分区间依赖规则

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        分区间依赖规则矩阵                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   依赖方 (行) → 被依赖方 (列)                                                │
│                                                                             │
│              │ /system │ /system_ext │ /product │ /vendor │ /odm  │        │
│   ───────────┼─────────┼─────────────┼──────────┼─────────┼───────┤        │
│   /system    │   ✅    │     ❌      │    ❌    │   ❌    │  ❌   │        │
│   /system_ext│   ✅    │     ✅      │    ❌    │   ❌    │  ❌   │        │
│   /product   │   ✅    │     ✅      │    ✅    │   ❌    │  ❌   │        │
│   /vendor    │   ⚠️*   │     ❌      │    ❌    │   ✅    │  ✅   │        │
│   /odm       │   ⚠️*   │     ❌      │    ❌    │   ✅    │  ✅   │        │
│                                                                             │
│   ✅ 允许   ❌ 禁止   ⚠️* 仅允许 VNDK/LLNDK 库                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**关键限制**:

| 场景 | 是否允许 | 解决方案 |
|------|----------|----------|
| vendor APP → packages/apps 库 | ❌ | 使用 VNDK 库或复制到 vendor |
| vendor APP → frameworks 库 | ⚠️ | 仅限 VNDK/LLNDK 公开库 |
| system APP → vendor 库 | ❌ | 通过 HIDL/AIDL 接口通信 |
| product APP → vendor 库 | ❌ | 通过 HIDL/AIDL 接口通信 |

#### 5.4.4 VNDK (Vendor Native Development Kit)

Vendor 模块**只能**依赖以下 system 库：

1. **LLNDK** - Low-Level NDK (libc, libm, liblog, libdl 等)
2. **VNDK** - Vendor NDK (libbase, libutils, libcutils 等)
3. **VNDK-SP** - Same-Process VNDK (GPU 驱动等需要)

```javascript
// vendor 模块可以依赖的 system 库
cc_library_shared {
    name: "libvendor_example",
    vendor: true,

    shared_libs: [
        // ✅ LLNDK - 允许
        "libc",
        "libm",
        "liblog",

        // ✅ VNDK - 允许
        "libbase",
        "libutils",
        "libcutils",
        "libbinder",

        // ❌ 非 VNDK - 禁止
        // "libmedia",      // 错误！
        // "libstagefright", // 错误！
    ],
}
```

**查看 VNDK 库列表**:
```bash
# VNDK 库定义位置
cat build/soong/cc/config/vndk.go

# 或查看编译输出
ls out/target/product/ross/system/lib64/vndk-*
```

### 5.5 AIDL 稳定性 (Stability)

可能遇到的核心问题：**AIDL 服务的稳定性域不匹配**。

#### 5.5.1 AIDL 稳定性概念

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AIDL Stability 域                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                 stability: "vintf" (VINTF 稳定)                      │  │
│   │                                                                     │  │
│   │   用途: 跨 system/vendor 边界的 HAL 接口                             │  │
│   │   特点: 版本化、二进制兼容、可跨进程调用                              │  │
│   │   调用者: System 进程 ↔ Vendor 进程 都可以                           │  │
│   │                                                                     │  │
│   │   示例: android.hardware.*, vendor.amlogic.hardware.*               │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │              不指定 stability (Local/进程内稳定)                      │  │
│   │                                                                     │  │
│   │   用途: 同一分区内的接口                                             │  │
│   │   特点: 无版本要求、只能同域调用                                      │  │
│   │   限制: System → System ✅,  Vendor → Vendor ✅                      │  │
│   │         System → Vendor ❌,  Vendor → System ❌                      │  │
│   │                                                                     │  │
│   │   示例: 模块内部接口、非 HAL 服务                                    │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                    unstable: true (不稳定)                           │  │
│   │                                                                     │  │
│   │   用途: 开发中的接口、测试接口                                        │  │
│   │   特点: 不进行版本管理、允许随意修改                                  │  │
│   │   限制: 不能跨 system/vendor 边界                                    │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.5.2 稳定性域检测 (用户遇到的问题)

当 AIDL 服务在 `vendor/` 下定义但被 system 进程调用时，会出现以下错误：

```
E Binder  : Stability mismatch: service stability is vendor,
            but caller is system
```

**问题根因**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         稳定性域不匹配示意                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   System App (system_server / SystemUI / Settings)                         │
│          │                                                                  │
│          │ Binder 调用                                                      │
│          ▼                                                                  │
│   ┌──────────────────────────────────────────┐                             │
│   │        Binder 稳定性检查                  │                             │
│   │                                          │                             │
│   │   调用方: system stability               │                             │
│   │   服务方: vendor stability (无 vintf)    │  ← 不匹配！                  │
│   │                                          │                             │
│   │   结果: 拒绝调用，抛出异常                │                             │
│   └──────────────────────────────────────────┘                             │
│          │                                                                  │
│          ✗ (调用被拒绝)                                                     │
│          │                                                                  │
│   Vendor Service (vendor/ 下的 AIDL 服务)                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.5.3 解决方案

**方案 1**: 添加 `stability: "vintf"` (推荐用于 HAL 接口)

```javascript
// vendor/amlogic/common/interfaces/myservice/Android.bp
aidl_interface {
    name: "vendor.amlogic.hardware.myservice",
    vendor_available: true,

    // 关键: 添加 vintf 稳定性
    stability: "vintf",

    srcs: ["vendor/amlogic/hardware/myservice/*.aidl"],

    backend: {
        java: {
            enabled: true,
            platform_apis: true,
        },
        ndk: {
            enabled: true,
        },
    },

    // vintf 接口必须版本化
    versions_with_info: [
        {
            version: "1",
            imports: [],
        },
    ],
    frozen: true,
}
```

**方案 2**: 移动服务到 system 分区 (适用于纯 system 服务)

```javascript
// 将服务定义从 vendor/ 移动到 frameworks/ 或 packages/
// 并移除 vendor_available: true
aidl_interface {
    name: "com.android.myservice",
    // 不设置 stability，默认为 system stability
    srcs: ["aidl/*.aidl"],
    // ...
}
```

**方案 3**: 使用 HIDL 包装 (遗留方案)

对于遗留代码，可以在 vendor 侧实现一个 HIDL HAL 作为代理。

#### 5.5.4 AIDL 稳定性配置总结

| 场景 | stability 设置 | 调用方 | 服务方 |
|------|---------------|--------|--------|
| HAL 接口 (跨 system/vendor) | `"vintf"` | system/vendor | vendor |
| System 内部服务 | 不设置 | system | system |
| Vendor 内部服务 | 不设置 | vendor | vendor |
| 开发中的接口 | `unstable: true` | - | - |

#### 5.5.5 完整 AIDL HAL 示例

```javascript
// vendor/amlogic/common/interfaces/droidaudio/Android.bp
aidl_interface {
    name: "vendor.amlogic.hardware.droidaudio",
    owner: "vendor.amlogic.hardware.droidaudio",

    // 允许 vendor 和 system_ext 使用
    vendor_available: true,
    system_ext_specific: true,

    // 关键: vintf 稳定性允许跨域调用
    stability: "vintf",

    srcs: ["vendor/amlogic/hardware/droidaudio/*.aidl"],

    backend: {
        cpp: {
            enabled: false,
        },
        java: {
            enabled: true,
            platform_apis: true,
            sdk_version: "system_current",
        },
        ndk: {
            enabled: true,
            min_sdk_version: "current",
        },
    },

    // vintf 接口必须版本化和冻结
    versions_with_info: [
        {
            version: "1",
            imports: [],
        },
    ],
    frozen: true,
}
```

同时需要在 VINTF manifest 中声明服务:

```xml
<!-- device/amlogic/common/hidl_manifests/34/manifest_common.xml -->
<manifest version="1.0" type="device">
    <hal format="aidl">
        <name>vendor.amlogic.hardware.droidaudio</name>
        <version>1</version>
        <fqname>IDroidAudioService/default</fqname>
    </hal>
</manifest>
```

### 5.6 条件编译

```javascript
cc_library_shared {
    name: "libconditional",

    // 根据产品变量条件编译
    product_variables: {
        debuggable: {
            cflags: ["-DDEBUG"],
        },
    },

    // 根据架构条件编译
    arch: {
        arm64: {
            srcs: ["arm64/*.cpp"],
        },
        arm: {
            srcs: ["arm/*.cpp"],
        },
    },

    // 根据目标条件编译
    target: {
        android: {
            shared_libs: ["libandroid"],
        },
        host: {
            shared_libs: ["libhost"],
        },
    },
}
```

---

## 6. 内核编译

### 6.1 内核编译入口

本项目使用 GKI (Generic Kernel Image) 架构，内核编译通过 `mk` 脚本：

```bash
# mk 脚本位置
./mk -> common/project/build/mk_script.sh

# 编译内核
./mk ross -v common14-5.15

# 清理内核
./mk clean
```

### 6.2 内核源码位置

```
common/
└── common14-5.15/          # 内核源码
    ├── out/                # 编译输出
    ├── arch/arm64/         # ARM64 架构
    ├── drivers/amlogic/    # Amlogic 驱动
    └── ...
```

### 6.3 设备树位置

```
# U-Boot 设备树
bootloader/uboot-repo/bl33/v2023/arch/arm/dts/amlogic/

# Kernel 设备树
common/common14-5.15/arch/arm64/boot/dts/amlogic/
```

### 6.4 内核配置

```bash
# defconfig 位置
common/common14-5.15/arch/arm64/configs/meson64_a64_smarthome_gki.fragment

# 修改内核配置
cd common/common14-5.15
make ARCH=arm64 menuconfig
```

---

## 7. 常见编译任务

### 7.1 编译单个模块

```bash
# 初始化环境
source build/envsetup.sh
lunch ross-userdebug

# 编译单个模块
m ModuleName

# 编译并安装
m ModuleName && adb root && adb remount && adb sync

# 示例: 编译 Settings
m Settings

# 示例: 编译 SystemUI
m SystemUI
```

### 7.2 编译指定目录

```bash
# 编译 frameworks/base
mmm frameworks/base

# 编译 vendor/xxx
mmm vendor/xxx/apps/MyApp
```

### 7.3 清理编译

```bash
# 清理全部
make clean
# 或
rm -rf out/

# 清理单个模块
make clean-ModuleName

# 清理 installclean (保留 host 工具)
make installclean
```

### 7.4 生成镜像

```bash
# 生成 system.img
make systemimage

# 生成 vendor.img
make vendorimage

# 生成 boot.img
make bootimage

# 生成 super.img (动态分区)
make superimage

# 生成 OTA 包
make otapackage
```

### 7.5 查看编译命令

```bash
# 显示实际执行的命令
make showcommands

# 显示模块依赖
make ModuleName showcommands
```

### 7.6 单独分区编译及烧录

| 分区 | make 命令 | 输出文件 | fastboot 烧录 |
|------|-----------|----------|---------------|
| boot | `make bootimage` | boot.img | `fastboot flash boot boot.img` |
| init_boot | `make initbootimage` | init_boot.img | `fastboot flash init_boot init_boot.img` |
| logo | `make logoimg` | logo.img | `fastboot flash logo logo.img` |
| uboot | `./mk s7d_bm201 --avb2 --vab` | u-boot.bin.signed | `fastboot flash bootloader u-boot.bin.signed` |
| odm_ext | `make odm_ext_image` | odm_ext.img | `fastboot flash odm_ext odm_ext.img` |
| vendor_boot | `make vendorbootimage` | vendor_boot.img | `fastboot flash vendor_boot vendor_boot.img` |
| oem | `make oem_image` | oem.img | `fastboot flash oem oem.img` |
| system | `make systemimage` | system.img | `fastboot flash system system.img` |
| system_ext | `make systemextimage` | system_ext.img | `fastboot flash system_ext system_ext.img` |
| system_dlkm | `make system_dlkm_image` | system_dlkm.img | `fastboot flash system_dlkm system_dlkm.img` |
| vendor | `make vendorimage` | vendor.img | `fastboot flash vendor vendor.img` |
| vendor_dlkm | `make vendor_dlkmimage` | vendor_dlkm.img | `fastboot flash vendor_dlkm vendor_dlkm.img` |
| odm | `make odmimage` | odm.img | `fastboot flash odm odm.img` |
| odm_dlkm | `make odm_dlkm_image` | odm_dlkm.img | `fastboot flash odm_dlkm odm_dlkm.img` |
| product | `make productimage` | product.img | `fastboot flash product product.img` |

---

## 8. 添加新模块

### 8.1 添加系统应用

**步骤 1**: 创建目录结构

```bash
mkdir -p vendor/xxx/apps/MyApp/src/com/xxx/myapp
mkdir -p vendor/xxx/apps/MyApp/res/layout
```

**步骤 2**: 创建 Android.bp

```javascript
// vendor/xxx/apps/MyApp/Android.bp
android_app {
    name: "MyApp",
    srcs: ["src/**/*.java"],
    resource_dirs: ["res"],
    manifest: "AndroidManifest.xml",

    certificate: "platform",
    privileged: true,
    platform_apis: true,

    static_libs: [
        "androidx.appcompat_appcompat",
    ],

    // 安装到 product 分区
    product_specific: true,
}
```

**步骤 3**: 添加到产品配置

```makefile
# device/amlogic/ross/ross.mk
PRODUCT_PACKAGES += \
    MyApp
```

**步骤 4**: 编译验证

```bash
source build/envsetup.sh
lunch ross-userdebug
m MyApp
```

### 8.2 添加 Native 库

**步骤 1**: 创建目录结构

```bash
mkdir -p vendor/xxx/libs/libmylib/include
mkdir -p vendor/xxx/libs/libmylib/src
```

**步骤 2**: 创建 Android.bp

```javascript
// vendor/xxx/libs/libmylib/Android.bp
cc_library_shared {
    name: "libmylib",

    srcs: [
        "src/*.cpp",
    ],

    local_include_dirs: ["include"],
    export_include_dirs: ["include"],

    shared_libs: [
        "liblog",
        "libutils",
        "libcutils",
    ],

    cflags: [
        "-Wall",
        "-Werror",
    ],

    vendor: true,
}
```

**步骤 3**: 添加到产品配置

```makefile
# device/amlogic/ross/ross.mk
PRODUCT_PACKAGES += \
    libmylib
```

### 8.3 添加预装 APK

**方法 1**: 使用 android_app_import

```javascript
// vendor/xxx/prebuilt/MyPrebuiltApp/Android.bp
android_app_import {
    name: "MyPrebuiltApp",
    apk: "MyPrebuiltApp.apk",
    presigned: true,

    // 安装到 product 分区
    product_specific: true,

    // 特权应用
    privileged: true,

    // 禁用 dex 优化 (可选)
    dex_preopt: {
        enabled: false,
    },
}
```

**方法 2**: 使用 PRODUCT_COPY_FILES

```makefile
# device/amlogic/ross/ross.mk
PRODUCT_COPY_FILES += \
    vendor/xxx/prebuilt/MyApp.apk:$(TARGET_COPY_OUT_PRODUCT)/app/MyApp/MyApp.apk
```

### 8.4 添加开机服务

**步骤 1**: 创建可执行文件 (参考 8.2)

**步骤 2**: 创建 init.rc

```rc
# vendor/xxx/services/myservice/myservice.rc
service myservice /vendor/bin/myservice
    class main
    user system
    group system
    disabled
    oneshot

on property:sys.boot_completed=1
    start myservice
```

**步骤 3**: 添加到 Android.bp

```javascript
cc_binary {
    name: "myservice",
    srcs: ["main.cpp"],

    shared_libs: [
        "liblog",
        "libutils",
    ],

    vendor: true,

    init_rc: ["myservice.rc"],
}
```

---

## 9. 编译输出与打包

### 9.1 输出目录结构

```
out/
├── target/product/ross/
│   ├── system/                    # system 分区内容
│   ├── vendor/                    # vendor 分区内容
│   ├── product/                   # product 分区内容
│   ├── odm/                       # odm 分区内容
│   │
│   ├── boot.img                   # Boot 镜像
│   ├── vendor_boot.img            # Vendor Boot 镜像
│   ├── super.img                  # Super 镜像 (动态分区)
│   ├── system.img                 # System 镜像
│   ├── vendor.img                 # Vendor 镜像
│   ├── product.img                # Product 镜像
│   │
│   ├── aml_upgrade_package.img    # Amlogic 烧录包 [重要]
│   ├── ross-ota-*.zip             # OTA 包
│   │
│   └── obj/                       # 编译中间文件
│       └── PACKAGING/
│           └── target_files_intermediates/
│               └── ross-target_files-*.zip  # Target files
│
└── host/                          # 主机工具
    └── linux-x86/
        └── bin/
            ├── adb
            ├── fastboot
            └── ...
```

### 9.2 烧录包说明

| 文件 | 说明 | 烧录方式 |
|------|------|----------|
| `aml_upgrade_package.img` | 完整烧录包 | USB Burning Tool |
| `u-boot.bin.usb.signed` | USB 模式 U-Boot | USB 烧录 |
| `u-boot.bin.sd.bin.signed` | SD 卡模式 U-Boot | SD 卡烧录 |
| `ross-ota-*.zip` | OTA 升级包 | OTA 升级 |

---

## 10. 常见问题排查

### 10.1 编译环境问题

**问题**: `build/envsetup.sh: No such file or directory`

```bash
# 确认在正确目录
pwd
# 应该在 Android 源码根目录

# 确认文件存在
ls -la build/envsetup.sh
```

**问题**: `lunch: command not found`

```bash
# 重新初始化环境
source build/envsetup.sh
```

**问题**: Java 版本不匹配

```bash
# Android 14 需要 JDK 17
java -version
# 如果版本不对，设置 JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
```

### 10.2 编译错误

**问题**: 内存不足 (OutOfMemoryError)

```bash
# 增加 Java 堆内存
export _JAVA_OPTIONS="-Xms8G -Xmx32G"

# 减少并行任务数
make -j8  # 而不是 -j64
```

**问题**: 增量编译不生效

```bash
# 确保已完成一次完整编译后，再进行增量编译
make -j16  # 完整编译
# 之后修改代码可以增量编译
m ModuleName  # 编译特定模块
```

**问题**: 模块找不到

```bash
# 检查模块名
grep -r "name: \"ModuleName\"" --include="*.bp"

# 检查是否在 PRODUCT_PACKAGES 中
grep -r "ModuleName" device/amlogic/ross/
```

### 10.3 增量编译问题

**问题**: 修改后不生效

```bash
# 清理特定模块
make clean-ModuleName

# 或删除编译产物
rm -rf out/target/product/ross/system/app/ModuleName/

# 重新编译
m ModuleName
```

**问题**: mk/bp 文件修改后编译异常

```bash
# 清理 Soong 缓存
rm -rf out/soong/.intermediates/

# 或完整清理
make clean
```

### 10.4 调试技巧

```bash
# 显示详细编译命令
make showcommands

# 显示模块依赖
m ModuleName --dumpvar-mode

# 查看编译日志
cat out/verbose.log

# 并行编译日志
make -j16 2>&1 | tee build.log
```

### 10.5 Treble 架构相关问题

**问题**: vendor 模块依赖 system 库编译失败

```
error: vendor/xxx/libxxx.so depends on non-VNDK library libyyy.so
```

```bash
# 解决方案 1: 使用 VNDK 库替代
# 检查 VNDK 库列表
cat build/soong/cc/config/vndk.go

# 解决方案 2: 将依赖库复制到 vendor 分区
# 在 Android.bp 中移除 vendor: true，改为安装到 system

# 解决方案 3: 使用 vendor_available 属性
# 在被依赖库中添加:
cc_library_shared {
    name: "libyyy",
    vendor_available: true,  // 允许 vendor 模块依赖
}
```

**问题**: AIDL Stability 不匹配

运行时报错：
```
E Binder  : Stability mismatch: service stability is vendor, but caller is system
```

```bash
# 原因: 在 vendor/ 下定义的 AIDL 服务被 system 进程调用

# 解决方案 1: 添加 vintf 稳定性 (推荐)
# 在 Android.bp 中:
aidl_interface {
    name: "vendor.xxx.hardware.myservice",
    stability: "vintf",  // 关键！
    vendor_available: true,
    versions_with_info: [
        { version: "1", imports: [] },
    ],
    frozen: true,
}

# 同时需要在 VINTF manifest 中声明服务
# device/amlogic/common/hidl_manifests/34/manifest_common.xml

# 解决方案 2: 将服务移到 system 分区
# 将代码从 vendor/ 移动到 frameworks/ 或 packages/
```

**问题**: 命名空间模块找不到

```
error: "xxx" depends on undefined module "yyy"
```

```bash
# 检查命名空间配置
# 1. 确认目标模块所在目录有 soong_namespace 定义
# 2. 确认当前模块的命名空间 imports 了目标命名空间

# 示例: device/amlogic/ross/Android.bp
soong_namespace {
    imports: [
        "vendor/amlogic/common",  // 确保导入了目标命名空间
    ],
}

# 3. 确认 PRODUCT_SOONG_NAMESPACES 包含了命名空间
# device/amlogic/ross/device.mk
PRODUCT_SOONG_NAMESPACES += vendor/amlogic/common
```

---

## 附录 A: 常用环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `TARGET_PRODUCT` | 目标产品 | `ross` |
| `TARGET_BUILD_VARIANT` | 构建类型 | `userdebug` |
| `TARGET_BUILD_TYPE` | 构建类型 | `release` |
| `OUT_DIR` | 输出目录 | `out` |
| `ANDROID_BUILD_TOP` | 源码根目录 | `/path/to/source` |
| `USE_CCACHE` | 启用 ccache | `1` |
| `CCACHE_DIR` | ccache 目录 | `~/.ccache` |

## 附录 B: 关键文件速查表

| 文件 | 用途 | 修改频率 |
|------|------|----------|
| `build.cfg` | **编译配置** | 高 |
| `device/amlogic/ross/ross.mk` | **产品主配置** | 中 |
| `device/amlogic/ross/device.mk` | 设备配置 | 中 |
| `device/amlogic/ross/BoardConfig.mk` | 板级配置 | 低 |
| `device/amlogic/ross/AndroidProducts.mk` | 产品列表 | 低 |
| `vendor/xxx/*/Android.bp` | XXX 模块 | 高 |

## 附录 C: 编译命令速查

```bash
# 初始化环境
source build/envsetup.sh
lunch ross-userdebug

# 完整编译
make -j16

# 编译单个模块
m ModuleName

# 编译内核
./mk ross -v common14-5.15

# 编译 U-Boot
cd bootloader/uboot-repo && ./mk s7d_bm201 --avb2 --vab

# 生成 OTA
make otapackage

# 清理编译
make clean
```

---
