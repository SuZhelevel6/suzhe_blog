# 常见问题 FAQ

> Amlogic Android 系统开发常见问题与解决方案
>
> 适用平台: S905X4/S905X5M (S7D) Android 14

<!-- source: Amlogics905x 方案合集.md#L319-L339, L2195-L2220 -->

---

## 目录

- [1. 开发者选项问题](#1-开发者选项问题)
- [2. OTA 升级问题](#2-ota-升级问题)
- [3. ADB 调试问题](#3-adb-调试问题)
- [4. 编译问题](#4-编译问题)
- [5. 启动问题](#5-启动问题)
- [6. 权限问题](#6-权限问题)
- [7. 显示问题](#7-显示问题)
- [8. 音频问题](#8-音频问题)

---

## 1. 开发者选项问题

### Q1.1: "Developer options are not available for this user"

**现象**: Android 11+ 进入开发者模式时显示此错误信息

**原因**: 开机没有执行 `com.android.provision/.DefaultActivity` 开机向导活动

**解决方案**:

方法一：手动设置属性
```bash
adb shell settings put global device_provisioned 1
adb shell settings put secure user_setup_complete 1
adb shell settings put secure tv_user_setup_complete 1
```

方法二：确保 Provision 应用被编译
```makefile
# 在 device.mk 中添加
PRODUCT_PACKAGES += \
    Provision
```

**验证**:
```bash
adb shell settings get global device_provisioned    # 应返回 1
adb shell settings get secure user_setup_complete   # 应返回 1
```

**参考**: [Changed Provision app so it can trigger device owner provisioning](https://android.googlesource.com/platform/packages/apps/Provision/+/23356226d971a60ebf8d56ac03abe453a045b5cf)

---

## 2. OTA 升级问题

### Q2.1: OTA A/B 升级校验失败

**现象**: 升级时报错 `Cannot create update snapshots with overlayfs setup`

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

**原因**: 之前进行过调试操作 (adb root / adb remount)，导致 dm-verity 被禁用

**解决方案**:
```bash
adb root
adb enable-verity
adb reboot
```

**重要提醒**:
> ⚠️ **测试 OTA 时，打底软件不要做任何调试操作！**
>
> 禁止操作包括：
> - `adb root` + `adb remount`
> - 串口执行 `mount -o rw,remount /system`
> - `adb disable-verity`

### Q2.2: OTA 升级后无法启动

**排查步骤**:
1. 检查 bootloader 日志
2. 查看 update_engine 日志: `adb logcat -s update_engine`
3. 检查分区状态: `adb shell cat /proc/cmdline | grep slot`

---

## 3. ADB 调试问题

### Q3.1: ADB 无法连接设备

**排查步骤**:

1. 检查 USB 配置
```bash
adb shell getprop sys.usb.config        # 应包含 adb
adb shell getprop persist.sys.usb.config
```

2. 检查 adbd 服务状态
```bash
adb shell getprop init.svc.adbd         # 应为 running
```

3. 手动启用 ADB
```bash
# 串口下执行
setprop persist.sys.usb.config adb
setprop sys.usb.config adb
```

### Q3.2: ADB 需要每次确认授权

**解决方案**: 使用预安装密钥功能

<!-- commit: 88e59cb30ea -->

将 adb 公钥放置到 `/vendor/etc/adb/preinstalled_keys`

详见 [ADB 定制指南](../03-android-system/05-ADB_CUSTOMIZATION.md)

---

## 4. 编译问题

### Q4.1: 修改 dts/dtsi 后不生效

**原因**: 旧的 dtb 文件未清理

**解决方案**:
```bash
# 清理所有 dtb 文件
find out/ -name "*.dtb" | xargs rm -rf

# 重新编译
make dtbimage -j$(nproc)
```

### Q4.2: 编译时签名报错

**检查点**:
1. 证书文件是否存在且完整
2. 证书是否过期
3. CERTIFICATE_DIR 配置是否正确

```bash
# 检查证书
ls -la vendor/xxx/android-certs/

# 验证证书
openssl x509 -in platform.x509.pem -text -noout
```

### Q4.3: 模块编译后未包含在镜像中

**检查点**:
1. 是否添加到 PRODUCT_PACKAGES
2. 模块名是否正确
3. Android.mk / Android.bp 是否正确

```makefile
# device.mk 中添加
PRODUCT_PACKAGES += \
    YourModuleName
```

---

## 5. 启动问题

### Q5.1: 卡在开机动画

**排查步骤**:
1. 检查 logcat: `adb logcat | grep -E "boot|zygote|system_server"`
2. 检查 SystemServer 是否启动
3. 检查是否有服务启动失败

**常见原因**:
- SELinux 权限问题
- 关键服务启动失败
- 系统属性配置错误

### Q5.2: 反复重启

**排查步骤**:
1. 查看 tombstone: `adb pull /data/tombstones/`
2. 查看内核日志: 串口或 `dmesg`
3. 检查 `last_kmsg`（如果有）

---

## 6. 权限问题

### Q6.1: SELinux avc denied

**现象**: logcat 中出现 `avc: denied` 日志

**临时解决** (调试用):
```bash
# 设置为 permissive 模式
adb shell setenforce 0
```

**正式解决**: 添加 SELinux 策略

```bash
# 查看拒绝日志
adb logcat | grep "avc: denied"

# 使用 audit2allow 生成策略
adb logcat | grep "avc: denied" | audit2allow
```

详见 [SEPolicy 实践指南](../05-advanced/03-SEPOLICY_PRACTICE.md)

### Q6.2: 应用权限被拒绝

**检查点**:
1. AndroidManifest.xml 是否声明权限
2. 运行时权限是否授予
3. 是否需要特权应用 (priv-app)

```bash
# 查看应用权限
adb shell dumpsys package <package_name> | grep permission

# 授予权限
adb shell pm grant <package_name> <permission>
```

---

## 7. 显示问题

### Q7.1: HDMI 无输出

**排查步骤**:
1. 检查 HDMI 状态
```bash
cat /sys/class/amhdmitx/amhdmitx0/hpd_state    # 1=已连接
cat /sys/class/amhdmitx/amhdmitx0/disp_mode    # 当前分辨率
```

2. 检查显示模式
```bash
cat /sys/class/display/mode
```

3. 手动设置分辨率
```bash
echo 1080p60hz > /sys/class/display/mode
```

### Q7.2: 开机 Logo 不显示

**检查点**:
1. logo.img 是否正确生成
2. bootloader 是否正确加载 logo 分区
3. logo 图片格式是否正确 (BMP 或 PNG)

---

## 8. 音频问题

### Q8.1: 无声音输出

**排查步骤**:
1. 检查音频路由
```bash
dumpsys audio | grep -A 20 "Audio routes"
```

2. 检查 AudioFlinger 状态
```bash
dumpsys media.audio_flinger
```

3. 检查 ALSA 设备
```bash
cat /proc/asound/cards
cat /proc/asound/devices
```

### Q8.2: HDMI 音频无输出

**检查点**:
1. HDMI 是否连接
2. EDID 是否正确读取
3. 音频输出设备是否正确选择

```bash
# 检查 HDMI 音频能力
cat /sys/class/amhdmitx/amhdmitx0/aud_cap
```

---

## 9. 快速诊断命令集

### 系统状态检查

```bash
# 系统属性
getprop | grep -E "ro.build|ro.product"

# 服务状态
dumpsys -l | head -50

# 内存状态
cat /proc/meminfo | head -10

# CPU 状态
cat /proc/cpuinfo | grep -E "processor|model"
```

### 日志收集

```bash
# 收集全部日志
adb bugreport > bugreport.zip

# 收集 logcat
adb logcat -d > logcat.txt

# 收集内核日志
adb shell dmesg > dmesg.txt

# 收集 tombstones
adb pull /data/tombstones/ ./tombstones/
```

### 常用调试命令

```bash
# 查看 TOP 进程
adb shell top -n 1

# 查看进程列表
adb shell ps -A | grep -E "system|zygote"

# 查看文件描述符
adb shell ls -la /proc/<pid>/fd/

# 查看 binder 状态
adb shell cat /sys/kernel/debug/binder/stats
```

---

## 10. 问题反馈模板

遇到无法解决的问题时，请提供以下信息：

```markdown
## 问题描述
[简要描述问题现象]

## 复现步骤
1. [步骤1]
2. [步骤2]
3. [步骤3]

## 期望结果
[期望的正确行为]

## 实际结果
[实际发生的错误行为]

## 环境信息
- 产品型号: [如 ross/raman]
- Android 版本: [如 Android 14]
- 编译类型: [userdebug/user]
- 最近改动: [如果有]

## 日志附件
- [ ] logcat.txt
- [ ] dmesg.txt
- [ ] bugreport.zip
```

---

*文档版本: 1.0*
*更新日期: 2025-12-12*
*来源: Amlogics905x 方案合集.md + 实践经验*
