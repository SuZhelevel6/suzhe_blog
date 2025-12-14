# ADB 定制指南

> Android Debug Bridge 配置与调试
>
> 适用平台: S905X4/S905X5M (S7D) Android 14

<!-- source: Amlogics905x 方案合集.md#L477-L534, L1173-L1231, L1285-L1293 + git log -->

---

## 目录

1. [概述](#1-概述)
2. [ADB 开关配置](#2-adb-开关配置)
3. [USB ADB 模式](#3-usb-adb-模式)
4. [ADB 预安装密钥](#4-adb-预安装密钥)
5. [串口 Root 权限](#5-串口-root-权限)
6. [常见问题](#6-常见问题)

---

## 1. 概述

ADB (Android Debug Bridge) 是 Android 系统的调试桥接工具。在嵌入式 Android 设备上，通常需要：

- **开发阶段**: 启用 ADB 方便调试
- **生产阶段**: 默认关闭 ADB 或仅保留授权访问
- **特殊场景**: 预安装 ADB 密钥实现免授权调试

---

## 2. ADB 开关配置

### 2.1 默认启用/禁用 ADB

<!-- commit: d4fc7d03bf0 -->

**方法一: 使用 DEFAULT_ADBD_ON 宏** (推荐)

```makefile
# device/amlogic/<product>/device.mk

# 默认启用 ADB
PRODUCT_PRODUCT_PROPERTIES += \
    DEFAULT_ADBD_ON=true

# 默认禁用 ADB
PRODUCT_PRODUCT_PROPERTIES += \
    DEFAULT_ADBD_ON=false
```

**方法二: 修改 property_service.cpp**

控制 `persist.sys.usb.config` 是否自动添加 `adb`：

```cpp
// system/core/init/property_service.cpp

// 找到判断 ro.debuggable 的逻辑
// 将 is_debuggable 设为 false 可阻止自动启用 adb
```

**方法三: 直接设置 USB 配置**

```makefile
# device/amlogic/<product>/device.mk

# 仅启用 MTP (不含 ADB)
PRODUCT_DEFAULT_PROPERTY_OVERRIDES += \
    persist.sys.usb.config=mtp

# 启用 MTP + ADB
PRODUCT_DEFAULT_PROPERTY_OVERRIDES += \
    persist.sys.usb.config=mtp,adb
```

### 2.2 运行时控制 ADB

```bash
# 查看当前 USB 配置
getprop sys.usb.config
getprop persist.sys.usb.config

# 动态启用 ADB
setprop persist.sys.usb.config mtp,adb

# 动态禁用 ADB
setprop persist.sys.usb.config mtp
```

---

## 3. USB ADB 模式

### 3.1 USB 控制器类型配置

<!-- source: Amlogics905x 方案合集.md#L1189-L1231 -->

Amlogic 平台的 USB 控制器支持多种工作模式：

**设备树配置** (`common/arch/arm64/boot/dts/amlogic/s7d_*.dts`):

```dts
&dwc2_a {
    status = "okay";
    /**
     * controller-type 取值:
     * 0: normal (自动检测)
     * 1: otg+dwc3 host only (仅主机模式)
     * 2: otg+dwc3 device only (仅设备模式，用于 ADB)
     * 3: otg (OTG 模式)
     */
    controller-type = <2>;  /* 设为 2 启用 USB ADB */
};
```

**常见配置场景**:

| controller-type | 场景 | USB 功能 |
|-----------------|------|----------|
| 0 | 默认 | 自动检测主机/设备 |
| 1 | 仅 USB Host | 只能连接 U 盘/键盘等 |
| 2 | 仅 USB Device | 只能作为 ADB 设备被连接 |
| 3 | OTG 模式 | 支持动态切换主机/设备 |

### 3.2 网络 ADB

```bash
# 设备端启用网络 ADB
setprop service.adb.tcp.port 5555
stop adbd
start adbd

# PC 端连接
adb connect <device_ip>:5555

# 注意: 连接前确保网络可达
ping <device_ip>
```

---

## 4. ADB 预安装密钥

<!-- commit: 88e59cb30ea -->

预安装 ADB 密钥可实现：
- 免授权 ADB 连接 (无需在设备上点击"允许 USB 调试")
- 生产线自动化测试
- 远程运维场景

### 4.1 配置预安装密钥

**步骤 1: 获取 ADB 公钥**

```bash
# PC 上的 ADB 公钥位置
# Linux/Mac: ~/.android/adbkey.pub
# Windows: %USERPROFILE%\.android\adbkey.pub

cat ~/.android/adbkey.pub
```

**步骤 2: 将公钥添加到系统镜像**

创建密钥文件目录和文件：

```bash
# 在产品目录下创建
mkdir -p device/amlogic/<product>/adb_keys/
cp ~/.android/adbkey.pub device/amlogic/<product>/adb_keys/preinstalled_keys
```

**步骤 3: 配置复制规则**

```makefile
# device/amlogic/<product>/device.mk

PRODUCT_COPY_FILES += \
    $(LOCAL_PATH)/adb_keys/preinstalled_keys:$(TARGET_COPY_OUT_VENDOR)/etc/adb/preinstalled_keys
```

### 4.2 SELinux 配置

需要添加相应的 SELinux 策略允许 adbd 读取预安装密钥：

```te
# device/amlogic/<product>/sepolicy/file_contexts
/vendor/etc/adb(/.*)?    u:object_r:adb_keys_file:s0

# device/amlogic/<product>/sepolicy/adbd.te
allow adbd adb_keys_file:dir search;
allow adbd adb_keys_file:file { read open getattr };
```

### 4.3 验证

```bash
# 编译烧录后，首次连接应无需授权
adb devices
# 应直接显示 device 状态，而非 unauthorized
```

---

## 5. 串口 Root 权限

<!-- source: Amlogics905x 方案合集.md#L477-L534 -->

在开发调试阶段，可配置串口默认获取 root 权限。

### 5.1 修改 init 配置

**修改 init.rc** (`system/core/rootdir/init.rc`):

```diff
 service console /system/bin/sh
     class shell
     console
     disabled
     user shell
-    group shell log readproc
+    group shell log readproc system root
     seclabel u:r:shell:s0
     setenv HOSTNAME console

-on init && property:ro.debuggable=1
+on init
     start console
```

### 5.2 修改构建配置

**修改 Android.mk** (`system/core/init/Android.mk`):

```diff
-ifneq (,$(filter userdebug eng,$(TARGET_BUILD_VARIANT)))
+ifneq (,$(filter user userdebug eng,$(TARGET_BUILD_VARIANT)))
 init_options += \
     -DALLOW_FIRST_STAGE_CONSOLE=1 \
     -DALLOW_LOCAL_PROP_OVERRIDE=1 \
```

### 5.3 配合 SELinux Permissive

如果需要完全的调试权限，参考 [SELinux 配置](#61-selinux-临时禁用)。

---

## 6. 常见问题

### 6.1 SELinux 临时禁用

调试时可临时设置 SELinux 为 permissive 模式：

```bash
# 运行时设置 (重启后失效)
adb shell setenforce 0

# 查看当前状态
adb shell getenforce
```

### 6.2 Debug 节点访问

调试时需要访问 `/sys/kernel/debug/` 下的文件，Android U 需要先在 U-Boot 下禁用 SELinux：

```bash
# U-Boot 命令行
setenv EnableSelinux permissive
saveenv
```

重启后即可访问 debug 节点：
```bash
# 查看 pinmux 状态
cat /sys/kernel/debug/pinctrl/*/pinmux-pins

# 查看 GPIO 状态
cat /sys/kernel/debug/gpio

# 查看 clk 状态
cat /sys/kernel/debug/clk/clk_summary
```

**永久设置** (不推荐用于生产环境):

方法一 - 修改 selinux.cpp:
```cpp
// system/core/init/selinux.cpp
bool IsEnforcing() {
    if (ALLOW_PERMISSIVE_SELINUX) {
        return StatusFromCmdline() == SELINUX_ENFORCING;
    }
    return false;  // 改为 false
}
```

方法二 - 内核命令行:
```makefile
# device/amlogic/<product>/BoardConfig.mk
BOARD_KERNEL_CMDLINE += androidboot.selinux=permissive
```

### 6.3 ADB 无法连接

**排查步骤**:

```bash
# 1. 检查 USB 配置
adb shell getprop sys.usb.config
adb shell getprop persist.sys.usb.config
# 应包含 "adb"

# 2. 检查 adbd 服务状态
adb shell getprop init.svc.adbd
# 应为 "running"

# 3. 检查 USB 控制器模式 (需要串口)
cat /sys/devices/platform/lm1/dwc2_a/mode
# 应为 "peripheral" 或 "device"

# 4. 手动启用 ADB
setprop persist.sys.usb.config mtp,adb
setprop sys.usb.config mtp,adb
```

### 6.4 ADB 需要反复授权

**原因**: 设备的 USB Vendor/Product ID 变化导致 PC 认为是新设备

**解决方案**:
1. 使用预安装密钥 (见第 4 节)
2. 固定 USB ID:
```makefile
# device/amlogic/<product>/device.mk
PRODUCT_DEFAULT_PROPERTY_OVERRIDES += \
    ro.usb.id.vendor=1234 \
    ro.usb.id.product=5678
```

### 6.5 remount 分区

```bash
# 启用 remount 开关
echo 1 > /sys/class/remount/need_remount

# 执行 remount
adb root
adb remount

# 验证
adb shell mount | grep system
# 应显示 rw (可读写)
```

**注意**: remount 后会影响 OTA 升级校验，测试 OTA 前需执行:
```bash
adb root
adb enable-verity
adb reboot
```

---

## 7. 调试命令集

```bash
# USB 状态检查
getprop sys.usb.state
getprop sys.usb.config
cat /sys/class/android_usb/android0/state

# ADB 服务控制
stop adbd
start adbd

# 网络 ADB
setprop service.adb.tcp.port 5555

# 授权状态
ls /data/misc/adb/
cat /data/misc/adb/adb_keys

# SELinux 状态
getenforce
setenforce 0
```

---

*文档版本: 1.0*
*更新日期: 2025-12-12*
*来源: Amlogics905x 方案合集.md + git log*
