# 权限与安全指南

> Android 权限管理、ROOT 配置与安全设置
>
> 适用平台: S905X4/S905X5M (S7D) Android 14

<!-- source: Amlogics905x 方案合集.md#L536-L567, L1346-L1443, L1467-L1474 -->

---

## 目录

1. [概述](#1-概述)
2. [SELinux 配置](#2-selinux-配置)
3. [权限授予](#3-权限授予)
4. [ROOT 权限](#4-root-权限)
5. [分区挂载](#5-分区挂载)
6. [安全最佳实践](#6-安全最佳实践)
7. [Unifykey 配置](#7-unifykey-配置)
8. [Provision Key 烧录](#8-provision-key-烧录)

---

## 1. 概述

Android 系统的安全机制包括：

| 机制 | 作用 | 控制级别 |
|------|------|----------|
| **SELinux** | 强制访问控制 | 内核级 |
| **应用权限** | 限制应用能力 | Framework 级 |
| **签名** | 验证应用来源 | 系统级 |
| **dm-verity** | 分区完整性校验 | 启动级 |

---

## 2. SELinux 配置

<!-- source: Amlogics905x 方案合集.md#L536-L567 -->

### 2.1 SELinux 模式

| 模式 | 描述 | 用途 |
|------|------|------|
| **Enforcing** | 强制执行策略，拒绝违规访问 | 生产环境 |
| **Permissive** | 记录违规但不阻止 | 调试开发 |
| **Disabled** | 完全禁用 (不推荐) | - |

### 2.2 运行时切换模式

```bash
# 查看当前模式
getenforce
# 输出: Enforcing 或 Permissive

# 临时设为 Permissive (重启后恢复)
setenforce 0

# 临时设为 Enforcing
setenforce 1
```

### 2.3 永久设置 Permissive

**方法一: 修改 selinux.cpp** (编译时)

```cpp
// system/core/init/selinux.cpp

bool IsEnforcing() {
    if (ALLOW_PERMISSIVE_SELINUX) {
        return StatusFromCmdline() == SELINUX_ENFORCING;
    }
    return false;  // 改为 false 则默认 permissive
}
```

**方法二: 内核命令行** (推荐调试用)

```makefile
# device/amlogic/<product>/BoardConfig.mk

ifeq ($(AN_BOOT_SELINUX_PERMISSIVE), true)
BOARD_KERNEL_CMDLINE += androidboot.selinux=permissive
endif
```

**方法三: U-Boot 环境变量**

```bash
# 在 U-Boot 命令行
setenv bootargs "${bootargs} androidboot.selinux=permissive"
saveenv
```

### 2.4 SELinux 违规日志

```bash
# 查看 avc denied 日志
adb logcat | grep "avc: denied"

# 使用 audit2allow 生成策略
adb logcat -d | grep "avc: denied" | audit2allow -p policy

# 示例输出:
# allow untrusted_app vendor_file:file { read open };
```

详细 SELinux 策略编写参见 [SEPolicy 实践指南](../05-advanced/03-SEPOLICY_PRACTICE.md)。

---

## 3. 权限授予

### 3.1 安装时自动授予权限

<!-- source: Amlogics905x 方案合集.md#L1346-L1389 -->

**修改 PermissionManagerService.java**:

```java
// frameworks/base/services/core/java/com/android/server/pm/permission/PermissionManagerService.java

if (DEBUG_PERMISSIONS) {
    Slog.i(TAG, "Considering granting permission " + perm + " to package "
            + friendlyName);
}

// 自动授予所有安装权限
grant = GRANT_INSTALL;

if (grant != GRANT_DENIED) {
    // ... 原有逻辑
}
```

> ⚠️ **警告**: 此修改会降低系统安全性，仅用于开发调试或特殊场景。

### 3.2 授予特定应用权限

**通过 DatabaseHelper 预授权**:

```java
// frameworks/base/packages/SettingsProvider/src/com/android/providers/settings/DatabaseHelper.java

// 示例: 授予无障碍权限
getStringValueFromTable(db, TABLE_SECURE,
    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
    "com.example.app/com.example.app.MyAccessibilityService");
```

### 3.3 运行时权限管理

```bash
# 授予权限
adb shell pm grant <package> <permission>
# 示例
adb shell pm grant com.example.app android.permission.CAMERA

# 撤销权限
adb shell pm revoke <package> <permission>

# 查看应用权限
adb shell dumpsys package <package> | grep permission
```

### 3.4 特权应用配置

特权应用 (priv-app) 可获取更多系统权限：

```xml
<!-- device/amlogic/<product>/privapp-permissions.xml -->
<permissions>
    <privapp-permissions package="com.example.systemapp">
        <permission name="android.permission.MODIFY_PHONE_STATE"/>
        <permission name="android.permission.WRITE_SECURE_SETTINGS"/>
    </privapp-permissions>
</permissions>
```

```makefile
# device/amlogic/<product>/device.mk
PRODUCT_COPY_FILES += \
    $(LOCAL_PATH)/privapp-permissions.xml:$(TARGET_COPY_OUT_SYSTEM)/etc/permissions/privapp-permissions.xml
```

---

## 4. ROOT 权限

<!-- source: Amlogics905x 方案合集.md#L1391-L1443 -->

### 4.1 启用 su 命令

**修改 fs_config.cpp**:

```cpp
// system/core/libcutils/fs_config.cpp

static const struct fs_path_config android_files[] = {
    // ...
    // 修改 su 权限为 setuid
    { 06755, AID_ROOT, AID_SHELL, 0, "system/xbin/su" },  // 原为 04750
    // ...
};
```

**修改 su.cpp**:

```cpp
// system/extras/su/su.cpp

int main(int argc, char** argv) {
    // 注释掉权限检查
    // uid_t current_uid = getuid();
    // if (current_uid != AID_ROOT && current_uid != AID_SHELL)
    //     error(1, 0, "not allowed");

    // ... 继续执行
}
```

### 4.2 修改 Zygote 能力集

允许应用获取 root 能力：

```cpp
// frameworks/base/core/jni/com_android_internal_os_Zygote.cpp

static void DropCapabilitiesBoundingSet(fail_fn_t fail_fn) {
    // 注释掉能力丢弃逻辑
    /*
    for (int i = 0; prctl(PR_CAPBSET_READ, i, 0, 0, 0) >= 0; i++) {
        if (prctl(PR_CAPBSET_DROP, i, 0, 0, 0) == -1) {
            // ...
        }
    }
    */
}
```

> ⚠️ **安全警告**: 启用 ROOT 权限会严重降低系统安全性，仅用于开发调试。

### 4.3 使用第三方 Root 方案

对于需要可控 ROOT 的场景，建议使用：
- **Magisk**: 系统级 root 管理
- **SuperSU**: 传统 root 方案

---

## 5. 分区挂载

<!-- source: Amlogics905x 方案合集.md#L1467-L1474 -->

### 5.1 remount 系统分区

```bash
# 启用 remount 开关
echo 1 > /sys/class/remount/need_remount

# 执行 remount
adb root
adb remount

# 验证挂载状态
mount | grep system
# 应显示 rw (可读写)
```

### 5.2 恢复只读状态

```bash
# 重新启用 verity
adb root
adb enable-verity
adb reboot
```

### 5.3 手动挂载分区

```bash
# 串口下以读写模式挂载 system
mount -o rw,remount /system

# 挂载 vendor
mount -o rw,remount /vendor

# 恢复只读
mount -o ro,remount /system
```

---

## 6. 安全最佳实践

### 6.1 开发与生产配置对比

| 配置项 | 开发环境 | 生产环境 |
|--------|----------|----------|
| SELinux | Permissive | Enforcing |
| ADB | 启用 | 禁用或受限 |
| ROOT | 可选启用 | 禁用 |
| dm-verity | 可禁用 | 必须启用 |
| 签名 | 测试密钥 | 发布密钥 |

### 6.2 生产环境检查清单

```bash
# 检查 SELinux 状态
adb shell getenforce
# 应为: Enforcing

# 检查 ADB 状态
adb shell getprop persist.sys.usb.config
# 不应包含 adb

# 检查 dm-verity
adb shell getprop ro.boot.verifiedbootstate
# 应为: green

# 检查构建类型
adb shell getprop ro.build.type
# 应为: user (非 userdebug/eng)
```

### 6.3 安全属性

```makefile
# device/amlogic/<product>/device.mk

# 生产环境设置
PRODUCT_PROPERTY_OVERRIDES += \
    ro.debuggable=0 \
    ro.adb.secure=1 \
    ro.secure=1 \
    persist.sys.usb.config=mtp
```

---

## 7. Unifykey 配置

Amlogic Unifykey 是统一管理全平台 key 的子系统，提供简单的差异化配置和充分的 key 管理功能。

### 7.1 Kernel Unifykey 配置

**DTS 配置** (`common/common_drivers/arch/arm64/boot/dts/amlogic/s4_s905y4_xxx.dts`):

```dts
unifykey {
    compatible = "amlogic,unifykey";
    status = "okay";

    // key-device 取值:
    // normal  - 存储于 nand/emmc，可获取 key 内容
    // secure  - 存储于 nand/emmc，只能获取 key 的 hash 值
    // efuse   - 存储于 efuse
    key-device = "normal";

    // key-type 取值:
    // mac   - 冒号分隔字符 (02:ad:37:01:d9:bb)
    // sha1  - 20 字节 sha1 值
    // hdcp  - hdcp2 专用格式
    // raw   - 直接烧录 (默认)
    key-type = "mac";

    // 示例 key 定义
    key-num = <5>;
    key_0 {
        key-name = "usid";
        key-device = "normal";
        key-permit = "read","write";
    };
    key_1 {
        key-name = "mac";
        key-device = "normal";
        key-type = "mac";
        key-permit = "read","write";
    };
    // ...
};
```

**说明**: Normal 与 secure unifykey 存储于 emmc/nand 的 rsv 分区中，不在逻辑分区内，一般不会被用户擦除。

### 7.2 Unifykey 调试命令

**U-Boot 命令**:

```bash
# 初始化 unifykey
keyman init 0x1234

# 字符方式读取 unifykey 值
keyman read usid ${loadaddr} str

# 十六进制方式读取
keyman read mac ${loadaddr} hex
```

**Kernel 节点**:

```bash
# 查看所有 unifykey 信息
cat /sys/class/unifykeys/name
cat /sys/class/unifykeys/read

# 读取指定 key
echo usid > /sys/class/unifykeys/name
cat /sys/class/unifykeys/read
```

---

## 8. Provision Key 烧录

以 S905Y5 Factory user mode 为例说明 Provision key 烧录流程。

### 8.1 生成 DGPK1

```bash
cd vendor/amlogic/common/provision/tool/s7
./dgpk1_derive.py
# 输出: s7-dgpk1/s7_dgpk1.bin derived successfully
```

### 8.2 生成 DGPK1 eFuse Object

```bash
cd vendor/amlogic/common/provision/tool/s7
./dgpk1_efuse_object_derive.py --dgpk1 s7-dgpk1/s7_dgpk1.bin
# 输出: s7-dgpk1-efuse-object/s7_dgpk1.bin.efuse.obj derived successfully
```

### 8.3 生成 PCPK

```bash
cd vendor/amlogic/common/provision/tool/s7
./pcpk_derive.py --dgpk1 s7-dgpk1/s7_dgpk1.bin
# 输出: s7-pcpk/s7_pcpk.bin derived successfully
```

### 8.4 烧录 eFuse Object

使用 USB Burning Tool 烧录 eFuse Object 文件。

### 8.5 使用 PCPK 加密 Key

```bash
cd vendor/amlogic/common/provision/tool

# 查看支持的 key 列表
./provision_keywrapper -l

# 加密 widevine keybox (示例)
./provision_keywrapper \
    -t 0x11 \
    -i widevine_keybox.bin \
    -p s7/s7-pcpk/s7_pcpk.bin \
    -m 1

# 输出: widevine_keybox.bin.factory.enc
```

**key 类型说明**:
- `-t 0x11`: Widevine key
- 其他类型使用 `-l` 参数查看

---

## 9. 调试命令集

```bash
# SELinux
getenforce
setenforce [0|1]
dmesg | grep avc

# 权限
pm grant <pkg> <perm>
pm revoke <pkg> <perm>
dumpsys package <pkg> | grep perm

# ROOT
su
whoami
id

# 挂载
mount | grep -E "system|vendor"
cat /proc/mounts

# 安全属性
getprop ro.debuggable
getprop ro.secure
getprop ro.boot.verifiedbootstate
```

---

*文档版本: 1.0*
*更新日期: 2025-12-12*
*来源: Amlogics905x 方案合集.md*
