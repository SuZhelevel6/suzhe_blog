# 常用路径速查手册

> Amlogic Android 源码常用路径与目录结构
>
> 适用平台: S905X4/S905X5M (S7D) Android 14

<!-- source: Amlogics905x 方案合集.md#L256-L378 -->

---

## 目录

- [1. 核心目录说明](#1-核心目录说明)
- [2. Android 源码目录结构](#2-android-源码目录结构)
- [3. 常用代码路径](#3-常用代码路径)
- [4. 配置文件路径](#4-配置文件路径)
- [5. 设备运行时路径](#5-设备运行时路径)

---

## 1. 核心目录说明

| 目录 | 用途 | 常见修改场景 |
|------|------|-------------|
| **device/** | 产品配置 | ro.属性、预装软件、init.rc、开机动画、语言时区 |
| **vendor/** | 厂商定制 | 自研应用、厂商驱动、定制服务 |
| **frameworks/** | 系统框架 | 系统设置、权限管理、按键监听 |
| **packages/** | 系统应用 | Settings、Launcher、SystemUI |
| **hardware/** | HAL 层 | 硬件抽象层实现 |
| **kernel/** | 内核 | 驱动、设备树 |

---

## 2. Android 源码目录结构

| 目录 | 描述 |
|------|------|
| `art/` | ART 运行环境 |
| `bionic/` | 系统 C 库 (libc, libm, libdl) |
| `bootable/` | 启动引导 (recovery, bootloader) |
| `build/` | 编译系统规则和配置 |
| `cts/` | 兼容性测试套件 (CTS) |
| `dalvik/` | Dalvik 虚拟机 (已被 ART 取代) |
| `developers/` | 开发者示例 |
| `development/` | 开发工具 (签名、调试工具) |
| `device/` | 设备/产品相关配置 |
| `docs/` | 参考文档 |
| `external/` | 开源第三方库 |
| `frameworks/` | Android 框架核心 (Java/C++) |
| `hardware/` | 硬件抽象层 (HAL) |
| `kernel/` | Linux 内核 |
| `libcore/` | 核心 Java 库 |
| `libnativehelper/` | JNI 辅助库 |
| `out/` | 编译输出目录 |
| `packages/` | 系统应用包 |
| `pdk/` | 平台开发套件 |
| `platform_testing/` | 平台测试 |
| `prebuilts/` | 预编译工具和库 |
| `sdk/` | SDK 和模拟器 |
| `system/` | 底层系统库和组件 |
| `test/` | VTS 测试套件 |
| `toolchain/` | 工具链 |
| `tools/` | 构建工具 |
| `vendor/` | 厂商定制内容 |

---

## 3. 常用代码路径

### 3.1 Settings 应用

| 类型 | 路径 |
|------|------|
| **AOSP Settings** | `packages/apps/Settings/` |
| **TV Settings (AOSP)** | `packages/apps/TvSettings/Settings/` |
| **DroidTvSettings** | `vendor/amlogic/common/apps/DroidTvSettings/Settings/` |
| **About 页面** | `packages/apps/TvSettings/Settings/src/com/android/tv/settings/about/AboutFragment.java` |

### 3.2 系统核心应用

| 应用 | 路径 |
|------|------|
| **Launcher3** | `packages/apps/Launcher3/` |
| **SystemUI** | `frameworks/base/packages/SystemUI/` |
| **Provision** | `packages/apps/Provision/` |
| **DefaultActivity** | `packages/apps/Provision/src/com/android/provision/DefaultActivity.java` |
| **PackageInstaller** | `packages/apps/PackageInstaller/` |
| **DocumentsUI** | `packages/apps/DocumentsUI/` |
| **Bluetooth** | `packages/apps/Bluetooth/` |

### 3.3 Framework 核心

| 模块 | 路径 |
|------|------|
| **ActivityManager** | `frameworks/base/services/core/java/com/android/server/am/` |
| **PackageManager** | `frameworks/base/services/core/java/com/android/server/pm/` |
| **WindowManager** | `frameworks/base/services/core/java/com/android/server/wm/` |
| **InputManager** | `frameworks/base/services/core/java/com/android/server/input/` |
| **PowerManager** | `frameworks/base/services/core/java/com/android/server/power/` |
| **系统服务入口** | `frameworks/base/services/java/com/android/server/SystemServer.java` |

### 3.4 HAL 层

| HAL | 路径 |
|-----|------|
| **Audio HAL** | `hardware/interfaces/audio/` |
| **Display HAL** | `hardware/interfaces/graphics/` |
| **Camera HAL** | `hardware/interfaces/camera/` |
| **Bluetooth HAL** | `hardware/interfaces/bluetooth/` |
| **WiFi HAL** | `hardware/interfaces/wifi/` |
| **Amlogic HAL** | `hardware/amlogic/` |

### 3.5 Amlogic 特有路径

| 模块 | 路径 |
|------|------|
| **设备配置** | `device/amlogic/<product>/` |
| **通用配置** | `device/amlogic/common/` |
| **厂商应用** | `vendor/amlogic/common/apps/` |
| **WiFi/BT 驱动** | `hardware/amlogic/wifi/` |
| **显示驱动** | `hardware/amlogic/gralloc/` |
| **媒体相关** | `vendor/amlogic/common/frameworks/av/` |

---

## 4. 配置文件路径

### 4.1 产品配置

| 文件 | 路径 | 用途 |
|------|------|------|
| **产品 mk** | `device/amlogic/<product>/<product>.mk` | 产品主配置 |
| **BoardConfig** | `device/amlogic/<product>/BoardConfig.mk` | 板级配置 |
| **device.mk** | `device/amlogic/<product>/device.mk` | 设备配置 |
| **vendorsetup.sh** | `device/amlogic/<product>/vendorsetup.sh` | lunch 配置 |

### 4.2 编译配置

| 文件 | 路径 | 用途 |
|------|------|------|
| **build.cfg** | `device/amlogic/<product>/build.cfg` | 构建配置 |
| **sysprop.mk** | `device/amlogic/<product>/sysprop.mk` | 系统属性配置 |

### 4.3 Init 配置

| 文件 | 路径 | 用途 |
|------|------|------|
| **init.rc** | `device/amlogic/<product>/init.<product>.rc` | 产品 init 脚本 |
| **ueventd.rc** | `device/amlogic/<product>/ueventd.<product>.rc` | 设备节点权限 |
| **fstab** | `device/amlogic/<product>/fstab.<product>` | 分区挂载表 |

### 4.4 SELinux 配置

| 文件 | 路径 | 用途 |
|------|------|------|
| **file_contexts** | `device/amlogic/<product>/sepolicy/file_contexts` | 文件标签 |
| ***.te** | `device/amlogic/<product>/sepolicy/*.te` | 策略规则 |
| **property_contexts** | `device/amlogic/<product>/sepolicy/property_contexts` | 属性标签 |

### 4.5 按键配置

| 文件 | 路径 | 用途 |
|------|------|------|
| **kl 文件** | `device/amlogic/<product>/*.kl` | 按键映射 |
| **通用 kl** | `device/amlogic/common/keyboards/` | 通用键盘配置 |
| **遥控器 kl** | `device/amlogic/common/keyboards/Vendor_*.kl` | 遥控器按键映射 |

### 4.6 签名证书

| 文件 | 路径 | 用途 |
|------|------|------|
| **AOSP 测试证书** | `build/make/target/product/security/` | 默认测试签名 |
| **厂商证书** | `vendor/xxx/android-certs/` | 厂商发布签名 |

---

## 5. 设备运行时路径

### 5.1 系统分区

| 路径 | 说明 |
|------|------|
| `/system/` | 系统分区 (只读) |
| `/vendor/` | 厂商分区 (只读) |
| `/product/` | 产品分区 (只读) |
| `/data/` | 用户数据分区 (可读写) |
| `/cache/` | 缓存分区 |
| `/odm/` | ODM 定制分区 |

### 5.2 配置文件

| 路径 | 说明 |
|------|------|
| `/system/build.prop` | 系统属性 |
| `/vendor/build.prop` | 厂商属性 |
| `/data/property/` | 持久化属性 |
| `/system/etc/` | 系统配置文件 |
| `/vendor/etc/` | 厂商配置文件 |

### 5.3 应用相关

| 路径 | 说明 |
|------|------|
| `/system/app/` | 系统应用 |
| `/system/priv-app/` | 特权系统应用 |
| `/vendor/app/` | 厂商应用 |
| `/data/app/` | 用户安装应用 |
| `/data/data/<package>/` | 应用数据目录 |

### 5.4 日志与调试

| 路径 | 说明 |
|------|------|
| `/data/anr/` | ANR traces |
| `/data/tombstones/` | Native crash tombstones |
| `/data/system/dropbox/` | 系统事件日志 |
| `/proc/kmsg` | 内核日志 |
| `/sys/` | sysfs 虚拟文件系统 |

### 5.5 Amlogic 特有路径

| 路径 | 说明 |
|------|------|
| `/sys/class/unifykeys/` | Amlogic unifykeys (MAC/SN) |
| `/sys/class/amhdmitx/` | HDMI 控制接口 |
| `/sys/class/display/` | 显示控制接口 |
| `/sys/class/amaudio/` | 音频控制接口 |
| `/sys/class/leds/` | LED 控制接口 |

---

## 6. 快速定位指南

### 按功能查找

| 我想修改... | 查找路径 |
|------------|----------|
| 开机动画 | `device/amlogic/<product>/bootanimation/` |
| 开机 Logo | `device/amlogic/<product>/logo/` |
| 默认壁纸 | `frameworks/base/core/res/res/drawable/` |
| 系统铃声 | `frameworks/base/data/sounds/` |
| 预装应用 | `device/amlogic/<product>/*.mk` (PRODUCT_PACKAGES) |
| ro.属性 | `device/amlogic/<product>/sysprop.mk` |
| 按键映射 | `device/amlogic/common/keyboards/` |
| SELinux | `device/amlogic/<product>/sepolicy/` |

### 按问题查找

| 问题类型 | 查看路径/日志 |
|----------|--------------|
| 启动失败 | `adb logcat -b all` 或串口日志 |
| ANR | `/data/anr/traces.txt` |
| Native Crash | `/data/tombstones/` |
| 权限问题 | `adb logcat | grep -i avc` |
| 服务启动失败 | `adb logcat | grep -i "service"` |

---

*文档版本: 1.0*
*更新日期: 2025-12-12*
*来源: Amlogics905x 方案合集.md*
