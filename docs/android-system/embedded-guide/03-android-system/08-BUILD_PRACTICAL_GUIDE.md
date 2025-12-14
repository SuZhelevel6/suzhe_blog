# Android 构建实战指南

> 预装软件、软件裁剪、厂商定制、签名等实战配置
>
> 适用平台: S905X4/S905X5M (S7D) Android 14

<!-- source: Amlogics905x 方案合集.md + git log -->

---

## 目录

1. [预装软件 (Prebuilt APK)](#1-预装软件-prebuilt-apk)
2. [软件裁剪与移除](#2-软件裁剪与移除)
3. [签名与密钥管理](#3-签名与密钥管理)
4. [厂商定制配置](#4-厂商定制配置)
5. [OTA 升级配置](#5-ota-升级配置)
6. [区域与语言配置](#6-区域与语言配置)
7. [build.prop 属性详解](#7-buildprop-属性详解)

---

## 1. 预装软件 (Prebuilt APK)

### 1.1 应用安装目录说明

| 目录 | 权限级别 | 可否卸载 | 典型应用 |
|------|----------|----------|----------|
| `/system/app/` | 系统级 | ❌ | Phone, Contacts |
| `/system/priv-app/` | 特权级 | ❌ | Settings, SystemUI |
| `/vendor/app/` | 厂商级 | ❌ | 厂商定制应用 |
| `/data/app/` | 用户级 | ✅ | 用户安装应用 |

### 1.2 预装 APK 步骤

#### 步骤 1: 创建模块目录

```bash
# 在厂商目录下创建应用目录
mkdir -p vendor/xxx/apps/YourApp
```

#### 步骤 2: 准备文件

```
vendor/xxx/apps/YourApp/
├── YourApp.apk         # APK 文件
├── Android.mk          # 编译配置
└── lib/                # JNI 库 (如有)
    ├── arm64-v8a/
    │   └── libnative.so
    └── armeabi-v7a/
        └── libnative.so
```

> **提取 lib 文件**: 将 APK 后缀改为 .zip 解压，从 lib/ 目录复制

#### 步骤 3: 编写 Android.mk

**基础模板 (platform 签名)**:

```makefile
LOCAL_PATH := $(call my-dir)
include $(CLEAR_VARS)

# 自动获取 APK 文件名
APPS := $(notdir $(wildcard $(LOCAL_PATH)/*.apk))
APP_NAME := $(basename $(APPS))

LOCAL_MODULE_TAGS := optional
LOCAL_MODULE := $(APP_NAME)
LOCAL_SRC_FILES := $(APPS)
LOCAL_MODULE_CLASS := APPS
LOCAL_MODULE_SUFFIX := $(COMMON_ANDROID_PACKAGE_SUFFIX)

# 签名方式
# - platform: 平台签名，系统级权限
# - PRESIGNED: 保留原签名
# - media: 媒体签名
LOCAL_CERTIFICATE := platform

# 是否为特权应用 (安装到 priv-app)
LOCAL_PRIVILEGED_MODULE := false

# 可选：停用 DEX 优化
# LOCAL_DEX_PREOPT := false

include $(BUILD_PREBUILT)
```

**保留原签名的模板**:

```makefile
LOCAL_PATH := $(call my-dir)
include $(CLEAR_VARS)

LOCAL_MODULE := YourApp
LOCAL_MODULE_TAGS := optional
LOCAL_SRC_FILES := YourApp.apk
LOCAL_MODULE_CLASS := APPS
LOCAL_MODULE_SUFFIX := $(COMMON_ANDROID_PACKAGE_SUFFIX)

# 保留 APK 原始签名
LOCAL_CERTIFICATE := PRESIGNED

# 如果有 JNI 库
LOCAL_PREBUILT_JNI_LIBS := \
    lib/arm64-v8a/libnative.so \
    lib/armeabi-v7a/libnative.so

include $(BUILD_PREBUILT)
```

#### 步骤 4: 添加特权应用权限 (如需要)

如果应用需要特权权限，需要在 `privapp-permissions` 中声明：

```xml
<!-- frameworks/base/data/etc/privapp-permissions-platform.xml -->
<privapp-permissions package="com.your.package">
    <permission name="android.permission.READ_PRIVILEGED_PHONE_STATE"/>
    <permission name="android.permission.WRITE_SECURE_SETTINGS"/>
    <!-- 添加应用需要的权限 -->
</privapp-permissions>
```

**查看应用所需权限**:
```bash
adb shell pm dump <package> | grep permission
```

#### 步骤 5: 添加到产品配置

```makefile
# device/amlogic/ross/device.mk 或 vendor/xxx/device-xxx.mk
PRODUCT_PACKAGES += \
    YourApp
```

### 1.3 签名注意事项

| 签名类型 | 说明 | 适用场景 |
|----------|------|----------|
| `platform` | 使用平台签名 | 需要系统权限的应用 |
| `PRESIGNED` | 保留原签名 | 第三方应用、v2/v3 签名 |
| `media` | 媒体签名 | 媒体相关应用 |
| `shared` | 共享签名 | 共享 UID 应用 |

> ⚠️ **注意**: `BUILD_PREBUILT` 方式会修改签名，可能导致 v2/v3 签名失效。
> 如需保留原签名，建议使用 shell 脚本直接复制。

---

## 2. 软件裁剪与移除

### 2.1 方法一: 从 PRODUCT_PACKAGES 移除

```makefile
# device/amlogic/ross/device.mk
# 直接删除或注释不需要的模块
PRODUCT_PACKAGES += \
    App1 \
#   App2 \  # 注释掉不需要的
    App3
```

### 2.2 方法二: 使用 OVERRIDES 覆盖

创建一个假模块来覆盖不需要的应用：

```makefile
# vendor/xxx/remove_unused/Android.mk
include $(CLEAR_VARS)

LOCAL_MODULE := remove_unused_module
LOCAL_MODULE_TAGS := optional
LOCAL_MODULE_CLASS := FAKE
LOCAL_MODULE_SUFFIX := $(COMMON_ANDROID_PACKAGE_SUFFIX)

# 要移除的模块列表
LOCAL_OVERRIDES_PACKAGES += \
    Music \
    Browser2 \
    DeskClock \
    Calendar \
    QuickSearchBox

include $(BUILD_SYSTEM)/base_rules.mk

$(LOCAL_BUILT_MODULE):
	$(hide) echo "Fake: $@"
	$(hide) mkdir -p $(dir $@)
	$(hide) touch $@

PACKAGES.$(LOCAL_MODULE).OVERRIDES := $(strip $(LOCAL_OVERRIDES_PACKAGES))
```

然后添加到产品配置：

```makefile
PRODUCT_PACKAGES += \
    remove_unused_module
```

### 2.3 方法三: 使用 PRODUCT_PACKAGES_REMOVE (Android 12+)

```makefile
# 直接移除模块
PRODUCT_PACKAGES_REMOVE += \
    Music \
    Browser2 \
    DeskClock
```

### 2.4 移除桌面图标

某些应用不想卸载但不想在桌面显示：

```xml
<!-- 在应用的 AndroidManifest.xml 中 -->
<activity android:name=".MainActivity">
    <intent-filter>
        <!-- 移除 LAUNCHER category -->
        <!-- <category android:name="android.intent.category.LAUNCHER"/> -->
        <category android:name="android.intent.category.DEFAULT"/>
    </intent-filter>
</activity>
```

或通过 overlay 方式修改。

---

## 3. 签名与密钥管理

### 3.1 签名密钥配置

<!-- commit: ba06c6d8738 -->

在 `build.cfg` 中配置签名选项：

```bash
# 使用发布密钥 (true) 或测试密钥 (false)
USE_RELEASE_KEY=true

# 证书目录 (相对于源码根目录)
CERTIFICATE_DIR=vendor/xxx/android-certs
```

### 3.2 生成签名密钥

```bash
# 在源码根目录执行
development/tools/make_key platform \
    '/C=CN/ST=Guangdong/L=Shenzhen/O=XXX/OU=Android/CN=Android/emailAddress=android@xxx.cn'

# 生成其他证书
development/tools/make_key media '/C=CN/ST=Guangdong/L=Shenzhen/O=XXX/OU=Android/CN=Android/emailAddress=android@xxx.cn'
development/tools/make_key shared '/C=CN/ST=Guangdong/L=Shenzhen/O=XXX/OU=Android/CN=Android/emailAddress=android@xxx.cn'
development/tools/make_key releasekey '/C=CN/ST=Guangdong/L=Shenzhen/O=XXX/OU=Android/CN=Android/emailAddress=android@xxx.cn'
```

### 3.3 手动签名 APK

**Linux 下使用 signapk**:

```bash
java -Djava.library.path="prebuilts/sdk/tools/linux/lib64" \
    -jar ./prebuilts/sdk/tools/lib/signapk.jar \
    vendor/xxx/android-certs/platform.x509.pem \
    vendor/xxx/android-certs/platform.pk8 \
    input.apk output_signed.apk
```

**Windows 下使用 apksigner**:

```batch
:: 1. 对齐
zipalign -v 4 src.apk aligned.apk

:: 2. 签名
apksigner sign --ks platform.keystore ^
    --ks-key-alias platform ^
    --ks-pass pass:android ^
    --key-pass pass:android ^
    --v1-signing-enabled true ^
    --v2-signing-enabled true ^
    aligned.apk

:: 3. 验证
apksigner verify aligned.apk
```

### 3.4 OTA 多密钥支持

<!-- commit: 52be4f93369 -->

当需要从 testkey 迁移到 releasekey，或需要支持多个签名密钥时：

```makefile
# device/amlogic/ross/device.mk

# 额外的 OTA 验证密钥 (用于密钥迁移)
PRODUCT_EXTRA_OTA_KEYS += \
    build/make/target/product/security/testkey \
    vendor/xxx/android-certs/releasekey
```

---

## 4. 厂商定制配置

### 4.1 产品信息定制

```makefile
# device/amlogic/ross/sysprop.mk

# 产品信息
PRODUCT_BRAND := XXX
PRODUCT_MODEL := GK7688
PRODUCT_MANUFACTURER := XXX
PRODUCT_DEVICE := ross

# 构建信息
BUILD_FINGERPRINT := XXX/ross/ross:14/UP1A.231005.007/$(BUILD_ID):userdebug/dev-keys
```

### 4.2 修改编译者名字

```makefile
# build/make/tools/buildinfo.sh 或 device.mk
export BUILD_USERNAME := xxx
export BUILD_HOST := xxx-build
```

或在 `sysprop.mk` 中：

```makefile
PRODUCT_SYSTEM_PROPERTIES += \
    ro.build.user=xxx \
    ro.build.host=xxx-build
```

### 4.3 屏幕参数配置

```makefile
# device/amlogic/ross/device.mk

# 屏幕密度 (DPI)
PRODUCT_PROPERTY_OVERRIDES += \
    ro.sf.lcd_density=320

# 分辨率
PRODUCT_PROPERTY_OVERRIDES += \
    persist.sys.screen.width=1920 \
    persist.sys.screen.height=1080
```

### 4.4 默认输入法配置

```xml
<!-- frameworks/base/packages/SettingsProvider/res/values/defaults.xml -->
<string name="def_input_method" translatable="false">com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME</string>
```

**查看当前输入法**:
```bash
adb shell ime list -s
```

---

## 5. OTA 升级配置

### 5.1 A/B 分区配置

```makefile
# device/amlogic/ross/ross.mk

# 启用 A/B OTA
AB_OTA_UPDATER := true

# A/B 分区列表
AB_OTA_PARTITIONS += \
    boot \
    system \
    vendor \
    product \
    system_ext \
    odm \
    vbmeta \
    vbmeta_system \
    dtbo
```

### 5.2 禁用 A/B 分区

如需使用非 A/B 方案：

1. **修改设备树**:
```dts
// 将 partition_mbox_ab.dtsi 改为 partition_mbox.dtsi
#include "partition_mbox.dtsi"
```

2. **修改产品配置**:
```makefile
# device/amlogic/ross/ross.mk
AB_OTA_UPDATER := false
```

3. **修改 recovery fstab** (如需要)

### 5.3 OTA 调试注意事项

> ⚠️ **重要**: 测试 OTA 时，打底软件不要做任何调试操作！

**禁止操作**:
- `adb root` + `adb remount`
- `adb disable-verity`
- 串口执行 `mount -o rw,remount /system`

**如果已经做了调试操作**:
```bash
adb root
adb enable-verity
adb reboot
```

---

## 6. 区域与语言配置

### 6.1 默认语言设置

```makefile
# device/amlogic/ross/device.mk

# 默认语言
PRODUCT_PROPERTY_OVERRIDES += \
    ro.product.locale=zh-CN \
    persist.sys.language=zh \
    persist.sys.country=CN
```

### 6.2 支持的语言列表

```makefile
# 支持所有语言
$(call inherit-product, build/target/product/languages_full.mk)

# 或指定语言列表
PRODUCT_LOCALES := zh_CN en_US zh_TW ja_JP ko_KR
```

### 6.3 默认时区

```makefile
PRODUCT_PROPERTY_OVERRIDES += \
    persist.sys.timezone=Asia/Shanghai
```

---

## 7. build.prop 属性详解

### 7.1 常用属性分类

| 前缀 | 说明 | 示例 |
|------|------|------|
| `ro.` | 只读属性 | `ro.build.version.sdk` |
| `persist.` | 持久化属性 | `persist.sys.language` |
| `sys.` | 系统临时属性 | `sys.boot_completed` |
| `debug.` | 调试属性 | `debug.hwui.overdraw` |

### 7.2 产品信息属性

| 属性 | 说明 |
|------|------|
| `ro.product.model` | 产品型号 |
| `ro.product.brand` | 品牌 |
| `ro.product.manufacturer` | 制造商 |
| `ro.product.device` | 设备名 |
| `ro.build.display.id` | 显示的版本号 |
| `ro.build.version.incremental` | 增量版本 |

### 7.3 显示相关属性

| 属性 | 说明 | 示例值 |
|------|------|--------|
| `ro.sf.lcd_density` | 屏幕密度 | 320 |
| `persist.sys.screen.width` | 屏幕宽度 | 1920 |
| `persist.sys.screen.height` | 屏幕高度 | 1080 |

### 7.4 网络相关属性

| 属性 | 说明 |
|------|------|
| `wifi.interface` | WiFi 接口名 |
| `ro.carrier` | 运营商 |
| `ro.telephony.default_network` | 默认网络类型 |

### 7.5 调试相关属性

| 属性 | 说明 |
|------|------|
| `ro.debuggable` | 是否可调试 |
| `ro.secure` | 是否安全模式 |
| `ro.adb.secure` | ADB 是否需要授权 |
| `persist.sys.usb.config` | USB 功能配置 |

---

## 附录: 常见问题

### Q: 预装应用无法获取权限

**解决方案**:
1. 确认应用安装在正确目录 (`system/priv-app/`)
2. 添加 `privapp-permissions` 声明
3. 确认 `LOCAL_PRIVILEGED_MODULE := true`

### Q: 签名后应用崩溃

**可能原因**:
- v2/v3 签名被破坏
- 签名与应用要求不匹配

**解决方案**:
- 使用 `PRESIGNED` 保留原签名
- 或使用 shell 脚本直接复制 APK

### Q: OTA 升级失败

**检查点**:
1. 是否做过 `adb remount`
2. 签名密钥是否匹配
3. 分区配置是否正确

---

*文档版本: 1.0*
*更新日期: 2025-12-12*
*来源: Amlogics905x 方案合集.md + git log*
