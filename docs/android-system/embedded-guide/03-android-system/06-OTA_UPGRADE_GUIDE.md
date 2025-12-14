# OTA 升级指南

> Over-The-Air 升级配置与问题排查
>
> 适用平台: S905X4/S905X5M (S7D) Android 14

<!-- source: Amlogics905x 方案合集.md#L386-L475, L2195-L2220 + git log -->

---

## 目录

1. [概述](#1-概述)
2. [A/B 分区系统](#2-ab-分区系统)
3. [OTA 包制作](#3-ota-包制作)
4. [升级测试](#4-升级测试)
5. [常见问题](#5-常见问题)

---

## 1. 概述

### 1.1 OTA 升级类型

| 类型 | 描述 | 适用场景 |
|------|------|----------|
| **A/B 升级** | 双分区系统，无缝升级 | 主流 Android 设备 |
| **Recovery 升级** | 传统单分区，进入 Recovery 升级 | 旧设备或特殊场景 |

### 1.2 Amlogic A/B 系统特点

- 支持无缝升级 (升级过程可正常使用)
- 升级失败自动回滚
- 虚拟 A/B (VAB) 减少存储占用

---

## 2. A/B 分区系统

### 2.1 启用/禁用 A/B 升级

<!-- source: Amlogics905x 方案合集.md#L386-L475 -->

**配置文件** (`device/amlogic/<product>/BoardConfig.mk`):

```makefile
# 启用 A/B 升级
AB_OTA_UPDATER := true

# 禁用 A/B 升级 (使用 Recovery 模式)
AB_OTA_UPDATER := false
```

### 2.2 A/B 分区列表

```makefile
# device/amlogic/<product>/BoardConfig.mk

AB_OTA_PARTITIONS += \
    boot \
    system \
    vendor \
    product \
    system_ext \
    odm \
    dtbo \
    vbmeta \
    vbmeta_system
```

### 2.3 查看当前启动 Slot

```bash
# 查看当前 slot
adb shell getprop ro.boot.slot_suffix
# 输出: _a 或 _b

# 查看 slot 状态
adb shell bootctl get-current-slot
adb shell bootctl get-active-boot-slot

# 手动切换 slot (调试用)
adb shell bootctl set-active-boot-slot 0  # 切换到 slot_a
adb shell bootctl set-active-boot-slot 1  # 切换到 slot_b
```

---

## 3. OTA 包制作

### 3.1 生成完整 OTA 包

```bash
# 编译完成后生成 OTA 包
make otapackage -j$(nproc)

# 输出位置
# out/target/product/<product>/<product>-ota-<date>.zip
```

### 3.2 生成增量 OTA 包

```bash
# target-files.zip 位置
# out/target/product/<product>/obj/PACKAGING/target_files_intermediates/<product>-target_files-eng.xxxxx.zip

# 需要两个版本的 target-files.zip
# SOURCE: 旧版本 (升级起点)
# TARGET: 新版本 (升级目标)

# 制作差分包命令
./out/host/linux-x86/bin/ota_from_target_files \
    -p out/host/linux-x86/ \
    -i ${target_src} \
    ${target_dst} \
    ${target_increm}

# 示例
./out/host/linux-x86/bin/ota_from_target_files \
    -p out/host/linux-x86/ \
    -i ross-target_files-v1.0.zip \
    ross-target_files-v1.1.zip \
    ross-incremental-v1.0-to-v1.1.zip
```

### 3.3 多密钥 OTA 签名

<!-- commit: 52be4f93369 -->

支持使用额外密钥签名 OTA 包，用于平滑过渡到新签名密钥：

```makefile
# device/amlogic/<product>/device.mk

# 主签名密钥
PRODUCT_OTA_PUBLIC_KEYS := vendor/xxx/android-certs/releasekey

# 额外接受的 OTA 密钥 (用于密钥过渡)
PRODUCT_EXTRA_OTA_KEYS := \
    vendor/xxx/android-certs/old_releasekey \
    vendor/xxx/android-certs/testkey
```

---

## 4. 升级测试

### 4.1 本地 OTA 测试

```bash
# 1. 将 OTA 包推送到设备
adb push ota-package.zip /data/local/tmp/

# 2. 触发升级
adb shell cmd update_engine update /data/local/tmp/ota-package.zip

# 3. 查看升级进度
adb logcat -s update_engine
```

### 4.2 使用 update_engine_client

```bash
# 检查升级状态
adb shell update_engine_client --status

# 执行升级 (需要 HTTP 服务器)
adb shell update_engine_client --update=http://server/ota.zip

# 取消升级
adb shell update_engine_client --cancel
```

### 4.3 调试日志

```bash
# 关键 TAG
adb logcat -s update_engine UpdateEngine

# 完整日志
adb logcat | grep -E "update_engine|UpdateEngine|ota"
```

---

## 5. 常见问题

### 5.1 "Cannot create update snapshots with overlayfs setup"

<!-- source: Amlogics905x 方案合集.md#L2195-L2220 -->

**错误日志**:
```
E update_engine: Cannot create update snapshots with overlayfs setup.
                 Run `adb enable-verity`, reboot, then try again.
E update_engine: [ERROR:dynamic_partition_control_android.cc(971)]
                 Cannot create update snapshots: Error
E update_engine: [ERROR:delta_performer.cc(744)]
                 Unable to initialize partition metadata for slot B
E update_engine: [ERROR:download_action.cc(227)]
                 Error ErrorCode::kInstallDeviceOpenError (7)
```

**原因**: 之前执行过 `adb root` + `adb remount` 调试操作

**解决方案**:
```bash
adb root
adb enable-verity
adb reboot
# 重启后再进行 OTA 升级
```

**重要提醒**:
> ⚠️ **测试 OTA 时，打底软件不要做任何调试操作！**
>
> 禁止操作包括：
> - `adb root` + `adb remount`
> - 串口执行 `mount -o rw,remount /system`
> - `adb disable-verity`

### 5.2 OTA 升级后无法启动

**排查步骤**:

1. **检查 bootloader 日志** (通过串口)
```
# 观察 U-Boot 输出
# 检查 slot 切换是否成功
```

2. **检查 update_engine 日志**
```bash
adb logcat -s update_engine
# 查找 ERROR 关键字
```

3. **检查分区状态**
```bash
adb shell cat /proc/cmdline | grep slot
adb shell bootctl get-current-slot
```

4. **回滚到上一个 slot**
```bash
# 在 bootloader 中
run set_active_slot=a
# 或
run set_active_slot=b
```

### 5.3 升级卡在某个进度

**可能原因**:
1. OTA 包损坏 - 重新下载
2. 存储空间不足 - 清理 /data
3. 分区表不匹配 - 检查版本兼容性

**排查命令**:
```bash
# 检查存储空间
adb shell df -h

# 检查 update_engine 状态
adb shell cmd update_engine status

# 强制取消并重试
adb shell update_engine_client --cancel
adb shell update_engine_client --reset
```

### 5.4 签名验证失败

**错误**: `Signature verification failed`

**检查点**:
1. OTA 包签名密钥与系统密钥匹配
2. 检查 `PRODUCT_OTA_PUBLIC_KEYS` 配置
3. 如果更换密钥，确保旧密钥在 `PRODUCT_EXTRA_OTA_KEYS`

```bash
# 查看系统接受的 OTA 密钥
ls /system/etc/security/otacerts.zip

# 查看 OTA 包签名信息
unzip -p ota.zip META-INF/com/android/otacert | openssl x509 -inform DER -text
```

---

## 6. OTA 服务器集成

### 6.1 典型 OTA 服务器架构

```
┌───────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Android 设备  │ ──► │   OTA Server    │ ──► │  CDN 分发     │
│               │     │  (版本检查)      │     │  (包下载)     │
└───────────────┘     └─────────────────┘     └──────────────┘
```

### 6.2 版本检查协议

设备向服务器发送：
- 当前版本号 (`ro.build.version.incremental`)
- 产品型号 (`ro.product.device`)
- 指纹 (`ro.build.fingerprint`)

服务器返回：
- 是否有新版本
- OTA 包下载地址
- 包大小和校验值

---

## 7. 调试命令集

```bash
# Slot 管理
bootctl get-current-slot
bootctl set-active-boot-slot [0|1]
bootctl mark-boot-successful

# update_engine 状态
update_engine_client --status
update_engine_client --cancel
update_engine_client --reset

# 分区信息
cat /proc/cmdline | grep slot
ls -la /dev/block/by-name/*_a
ls -la /dev/block/by-name/*_b

# dm-verity 状态
adb enable-verity
adb disable-verity
```

---

*文档版本: 1.0*
*更新日期: 2025-12-12*
*来源: Amlogics905x 方案合集.md + git log*
