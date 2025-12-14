---
sidebar: false
title: 嵌入式 Android 开发指南
date: 2025-12-14
tags:
 - Android
 - 嵌入式
 - Amlogic
---

# 嵌入式 Android 系统开发文档中心

本文档库为 Amlogic S905X5M (S7D) Android 14 平台的系统性学习资料。

---

## 文档目录结构

```
docs/
├── README.md                          # 本文件 - 文档索引
├── EMBEDDED_ANDROID_LEARNING_GUIDE.md # 入门总览（学习路线图）
│
├── 00-quick-reference/                # 速查手册 (快速查阅)
│   ├── 01-COMMAND_CHEATSHEET.md       # 调试命令速查 ✅
│   ├── 02-PATH_REFERENCE.md           # 常用路径速查 ✅
│   └── 03-TROUBLESHOOTING_FAQ.md      # 常见问题FAQ ✅
│
├── 01-bootloader/                     # Bootloader 篇
│   └── BOOTLOADER_UBOOT_GUIDE.md      # U-Boot 开发指南 ✅
│
├── 02-kernel/                         # 内核篇
│   ├── 01-LINUX_KERNEL_DRIVER_GUIDE.md    # Linux 内核驱动开发 ✅
│   └── 02-DEVICE_TREE_GUIDE.md            # 设备树详解 ✅
│
├── 03-android-system/                 # Android 系统篇
│   ├── 01-ANDROID_BUILD_SYSTEM_GUIDE.md   # Android 编译系统 ✅
│   ├── 02-ANDROID_INIT_SYSTEM_GUIDE.md    # Init 系统与属性服务 ✅
│   ├── 03-HAL_DEVELOPMENT_GUIDE.md        # HAL 硬件抽象层 ✅
│   ├── 04-ANDROID_FRAMEWORK_GUIDE.md      # Framework 定制 ✅
│   ├── 05-ADB_CUSTOMIZATION.md            # ADB 定制指南 ✅
│   ├── 06-OTA_UPGRADE_GUIDE.md            # OTA 升级指南 ✅
│   ├── 07-PERMISSION_AND_SECURITY.md      # 权限与安全 ✅
│   ├── 08-BUILD_PRACTICAL_GUIDE.md        # 编译实践指南 ✅
│   ├── ANDROID_BOOT_PROCESS.md            # Android 启动流程 ✅
│   └── PRELOAD_CLASS_OPTIMIZATION.md      # 预加载类优化 ✅
│
├── 04-subsystems/                     # 子系统篇
│   ├── 01-DISPLAY_SUBSYSTEM_GUIDE.md      # 显示子系统 ✅
│   ├── 02-AUDIO_SUBSYSTEM_GUIDE.md        # 音频子系统 ✅
│   ├── 03-WIRELESS_SUBSYSTEM_GUIDE.md     # 无线子系统 ✅
│   └── 04-INPUT_DEVICES_GUIDE.md          # 输入设备指南 ✅
│
├── 05-advanced/                       # 进阶篇
│   ├── 01-DEBUGGING_OPTIMIZATION_GUIDE.md # 调试与性能优化 ✅
│   ├── 02-PRACTICAL_PROJECTS_GUIDE.md     # 实战项目集 📝
│   └── 03-SEPOLICY_PRACTICE.md            # SEPolicy 实践指南 ✅
│
└── 06-applications/                   # 应用开发篇
    ├── 01-SETTINGS_CUSTOMIZATION.md       # Settings 定制 ✅
    ├── 02-ETHERNET_CONFIG.md              # 以太网配置 ✅
    ├── DVB_APP_DEVELOPMENT_GUIDE.md       # DVB 应用开发 ✅
    └── DVB_APP_KEY_FILES.md               # DVB 关键文件 ✅
```

**图例**: ✅ 已完成 | 📝 待编写

---

## 学习路线图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              推荐学习路径                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────────┐                                                      │
│   │  入门总览        │  EMBEDDED_ANDROID_LEARNING_GUIDE.md                  │
│   │  (必读)          │  了解整体架构和学习路线                              │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            ▼                                                                │
│   ┌──────────────────┐                                                      │
│   │  速查手册        │  00-quick-reference/                                 │
│   │  (常备参考)      │  命令/路径/FAQ 快速查阅                              │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            ▼                                                                │
│   ┌──────────────────┐                                                      │
│   │  编译系统        │  03-android-system/01-ANDROID_BUILD_SYSTEM_GUIDE.md  │
│   │                  │  掌握代码编译、模块构建                              │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│     ┌──────┴──────┐                                                         │
│     ▼             ▼                                                         │
│ ┌──────────┐   ┌────────┐                                                   │
│ │Bootloader│   │ 内核   │                                                   │
│ │ U-Boot   │   │ 驱动   │  并行学习                                         │
│ └────┬─────┘   └───┬────┘                                                   │
│      │           │                                                          │
│      │     ┌─────┴─────┐                                                    │
│      │     ▼           ▼                                                    │
│      │ ┌────────┐ ┌────────┐                                                │
│      │ │ 设备树 │ │  Init  │                                                │
│      │ │  DTS   │ │  系统  │                                                │
│      │ └────┬───┘ └───┬────┘                                                │
│      │      │         │                                                     │
│      └──────┴────┬────┘                                                     │
│                  ▼                                                          │
│          ┌──────────────┐                                                   │
│          │   HAL 层     │  硬件抽象层开发                                   │
│          └──────┬───────┘                                                   │
│                 │                                                           │
│          ┌──────┴───────┐                                                   │
│          ▼              ▼                                                   │
│    ┌──────────┐   ┌──────────┐                                              │
│    │ Framework│   │  子系统  │                                              │
│    │   定制   │   │显示/音频 │                                              │
│    └────┬─────┘   └────┬─────┘                                              │
│         │              │                                                    │
│         └──────┬───────┘                                                    │
│                ▼                                                            │
│        ┌───────────────┐                                                    │
│        │  调试与优化   │                                                    │
│        │  安全与权限   │                                                    │
│        │  实战项目     │                                                    │
│        └───────────────┘                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 文档清单

### 🚀 速查手册
| 文档 | 说明 | 状态 |
|------|------|------|
| [01-COMMAND_CHEATSHEET.md](00-quick-reference/01-COMMAND_CHEATSHEET.md) | ADB/Shell/调试命令速查 | ✅ 已完成 |
| [02-PATH_REFERENCE.md](00-quick-reference/02-PATH_REFERENCE.md) | 常用文件路径速查 | ✅ 已完成 |
| [03-TROUBLESHOOTING_FAQ.md](00-quick-reference/03-TROUBLESHOOTING_FAQ.md) | 常见问题与解决方案 | ✅ 已完成 |

### 📖 入门篇
| 文档 | 说明 | 状态 |
|------|------|------|
| [EMBEDDED_ANDROID_LEARNING_GUIDE.md](EMBEDDED_ANDROID_LEARNING_GUIDE.md) | 零基础入门指南，学习路线总览 | ✅ 已完成 |

### ⚙️ Bootloader 篇
| 文档 | 说明 | 状态 |
|------|------|------|
| [BOOTLOADER_UBOOT_GUIDE.md](01-bootloader/BOOTLOADER_UBOOT_GUIDE.md) | U-Boot 架构、代码结构、关键修改点 | ✅ 已完成 |

### 🐧 内核篇
| 文档 | 说明 | 状态 |
|------|------|------|
| [01-LINUX_KERNEL_DRIVER_GUIDE.md](02-kernel/01-LINUX_KERNEL_DRIVER_GUIDE.md) | 内核模块、字符设备、平台驱动开发 | ✅ 已完成 |
| [02-DEVICE_TREE_GUIDE.md](02-kernel/02-DEVICE_TREE_GUIDE.md) | 设备树语法、常见修改、调试方法 | ✅ 已完成 |

### 🤖 Android 系统篇
| 文档 | 说明 | 状态 |
|------|------|------|
| [01-ANDROID_BUILD_SYSTEM_GUIDE.md](03-android-system/01-ANDROID_BUILD_SYSTEM_GUIDE.md) | Soong/Blueprint、编译流程、模块添加 | ✅ 已完成 |
| [02-ANDROID_INIT_SYSTEM_GUIDE.md](03-android-system/02-ANDROID_INIT_SYSTEM_GUIDE.md) | init.rc 语法、属性系统、服务管理 | ✅ 已完成 |
| [03-HAL_DEVELOPMENT_GUIDE.md](03-android-system/03-HAL_DEVELOPMENT_GUIDE.md) | HIDL/AIDL、HAL 架构、开发实践 | ✅ 已完成 |
| [04-ANDROID_FRAMEWORK_GUIDE.md](03-android-system/04-ANDROID_FRAMEWORK_GUIDE.md) | 系统服务、Binder、Framework 定制 | ✅ 已完成 |
| [05-ADB_CUSTOMIZATION.md](03-android-system/05-ADB_CUSTOMIZATION.md) | ADB 开关、预安装密钥、串口调试 | ✅ 已完成 |
| [06-OTA_UPGRADE_GUIDE.md](03-android-system/06-OTA_UPGRADE_GUIDE.md) | A/B 升级、OTA 包制作、问题排查 | ✅ 已完成 |
| [07-PERMISSION_AND_SECURITY.md](03-android-system/07-PERMISSION_AND_SECURITY.md) | SELinux、权限授予、ROOT 配置 | ✅ 已完成 |
| [08-BUILD_PRACTICAL_GUIDE.md](03-android-system/08-BUILD_PRACTICAL_GUIDE.md) | 预装应用、签名、编译实践 | ✅ 已完成 |
| [ANDROID_BOOT_PROCESS.md](03-android-system/ANDROID_BOOT_PROCESS.md) | Android 完整启动流程分析 | ✅ 已完成 |
| [PRELOAD_CLASS_OPTIMIZATION.md](03-android-system/PRELOAD_CLASS_OPTIMIZATION.md) | Zygote 预加载类优化 | ✅ 已完成 |

### 📺 子系统篇
| 文档 | 说明 | 状态 |
|------|------|------|
| [01-DISPLAY_SUBSYSTEM_GUIDE.md](04-subsystems/01-DISPLAY_SUBSYSTEM_GUIDE.md) | HDMI/VPU/OSD/SurfaceFlinger/开机画面 | ✅ 已完成 |
| [02-AUDIO_SUBSYSTEM_GUIDE.md](04-subsystems/02-AUDIO_SUBSYSTEM_GUIDE.md) | ALSA/AudioFlinger/Audio HAL/Dolby | ✅ 已完成 |
| [03-WIRELESS_SUBSYSTEM_GUIDE.md](04-subsystems/03-WIRELESS_SUBSYSTEM_GUIDE.md) | WiFi/蓝牙配置与调试 | ✅ 已完成 |
| [04-INPUT_DEVICES_GUIDE.md](04-subsystems/04-INPUT_DEVICES_GUIDE.md) | 遥控器/键盘/触摸屏/按键映射 | ✅ 已完成 |

### 🔧 进阶篇
| 文档 | 说明 | 状态 |
|------|------|------|
| [01-DEBUGGING_OPTIMIZATION_GUIDE.md](05-advanced/01-DEBUGGING_OPTIMIZATION_GUIDE.md) | 调试工具、性能分析、Thermal/DVFS | ✅ 已完成 |
| [02-PRACTICAL_PROJECTS_GUIDE.md](05-advanced/02-PRACTICAL_PROJECTS_GUIDE.md) | GPIO/I2C/遥控器/开机动画等实战 | 📝 待编写 |
| [03-SEPOLICY_PRACTICE.md](05-advanced/03-SEPOLICY_PRACTICE.md) | SELinux 策略编写与调试 | ✅ 已完成 |

### 📱 应用开发篇
| 文档 | 说明 | 状态 |
|------|------|------|
| [01-SETTINGS_CUSTOMIZATION.md](06-applications/01-SETTINGS_CUSTOMIZATION.md) | Settings/TvSettings 定制与遥控器适配 | ✅ 已完成 |
| [02-ETHERNET_CONFIG.md](06-applications/02-ETHERNET_CONFIG.md) | 以太网 IP 配置服务 | ✅ 已完成 |
| [DVB_APP_DEVELOPMENT_GUIDE.md](06-applications/DVB_APP_DEVELOPMENT_GUIDE.md) | DVB 应用开发指南 | ✅ 已完成 |
| [DVB_APP_KEY_FILES.md](06-applications/DVB_APP_KEY_FILES.md) | DVB 关键文件说明 | ✅ 已完成 |

---

## 快速入口

### 按任务查找

| 我想要... | 阅读文档 |
|-----------|----------|
| 快速查命令 | [调试命令速查](00-quick-reference/01-COMMAND_CHEATSHEET.md) |
| 查找文件路径 | [常用路径速查](00-quick-reference/02-PATH_REFERENCE.md) |
| 解决常见问题 | [常见问题 FAQ](00-quick-reference/03-TROUBLESHOOTING_FAQ.md) |
| 了解整体架构 | [入门总览](EMBEDDED_ANDROID_LEARNING_GUIDE.md) |
| 编译系统/添加模块 | [编译系统指南](03-android-system/01-ANDROID_BUILD_SYSTEM_GUIDE.md) |
| 修改 U-Boot/启动参数 | [Bootloader 指南](01-bootloader/BOOTLOADER_UBOOT_GUIDE.md) |
| 写内核驱动 | [内核驱动指南](02-kernel/01-LINUX_KERNEL_DRIVER_GUIDE.md) |
| 修改设备树 | [设备树指南](02-kernel/02-DEVICE_TREE_GUIDE.md) |
| 添加开机服务 | [Init 系统指南](03-android-system/02-ANDROID_INIT_SYSTEM_GUIDE.md) |
| 开发 HAL | [HAL 开发指南](03-android-system/03-HAL_DEVELOPMENT_GUIDE.md) |
| 定制 Framework | [Framework 指南](03-android-system/04-ANDROID_FRAMEWORK_GUIDE.md) |
| 配置 ADB | [ADB 定制指南](03-android-system/05-ADB_CUSTOMIZATION.md) |
| OTA 升级调试 | [OTA 升级指南](03-android-system/06-OTA_UPGRADE_GUIDE.md) |
| 权限/ROOT/SELinux | [权限与安全](03-android-system/07-PERMISSION_AND_SECURITY.md) |
| 预装应用/签名 | [编译实践指南](03-android-system/08-BUILD_PRACTICAL_GUIDE.md) |
| 理解启动流程 | [Android 启动流程](03-android-system/ANDROID_BOOT_PROCESS.md) |
| 启动性能优化 | [预加载类优化](03-android-system/PRELOAD_CLASS_OPTIMIZATION.md) |
| 调试显示问题 | [显示子系统](04-subsystems/01-DISPLAY_SUBSYSTEM_GUIDE.md) |
| 调试音频问题 | [音频子系统](04-subsystems/02-AUDIO_SUBSYSTEM_GUIDE.md) |
| 配置 WiFi/蓝牙 | [无线子系统](04-subsystems/03-WIRELESS_SUBSYSTEM_GUIDE.md) |
| 遥控器/按键映射 | [输入设备指南](04-subsystems/04-INPUT_DEVICES_GUIDE.md) |
| 性能调试/Thermal | [调试与优化](05-advanced/01-DEBUGGING_OPTIMIZATION_GUIDE.md) |
| 编写 SEPolicy | [SEPolicy 实践](05-advanced/03-SEPOLICY_PRACTICE.md) |
| 定制 Settings | [Settings 定制](06-applications/01-SETTINGS_CUSTOMIZATION.md) |
| 配置以太网 | [以太网配置](06-applications/02-ETHERNET_CONFIG.md) |
| DVB 应用开发 | [DVB 开发指南](06-applications/DVB_APP_DEVELOPMENT_GUIDE.md) |

---

## 文档编写进度

- **已完成**: 26 篇
- **待编写**: 1 篇
- **总计**: 27 篇

### 进度统计

| 分类 | 已完成 | 待编写 |
|------|--------|--------|
| 速查手册 | 3 | 0 |
| 入门篇 | 1 | 0 |
| Bootloader | 1 | 0 |
| 内核篇 | 2 | 0 |
| Android 系统 | 10 | 0 |
| 子系统 | 4 | 0 |
| 进阶篇 | 2 | 1 |
| 应用开发 | 4 | 0 |

---

## 知识来源说明

本文档库的内容整合自以下来源：

1. **Amlogics905x 方案合集.md** - 实践经验积累 (2200+ 行) → 已整合完成，原文档归档于 `archive/`
2. **Git 提交历史** - 代码修改记录 (关键 commit 已标注)
3. **官方文档** - Amlogic/AOSP 官方资料
4. **实际项目** - 产品开发实践经验

> 📋 整合计划详情参见 `archive/DOCS_INTEGRATION_PLAN.md`

---

*文档版本: 2.1*
*更新日期: 2025-12-14*
*整合状态: ✅ 已完成*
*目标平台: Amlogic S905X5M (S7D) Android 14*
