# Android 调试命令速查表

> Amlogic Android 系统调试常用命令汇总
>
> 适用平台: S905X4/S905X5M (S7D) Android 14

<!-- source: Amlogics905x 方案合集.md#L7-L254 -->

---

## 目录

- [1. ADB Shell 命令](#1-adb-shell-命令)
  - [1.1 MAC/SN 读写](#11-macsn-读写)
  - [1.2 包管理 (pm)](#12-包管理-pm)
  - [1.3 活动管理 (am)](#13-活动管理-am)
  - [1.4 截屏录屏](#14-截屏录屏)
  - [1.5 日志抓取](#15-日志抓取)
  - [1.6 GPIO 控制](#16-gpio-控制)
  - [1.7 系统属性](#17-系统属性)
  - [1.8 内存查看](#18-内存查看)
  - [1.9 SVC 服务控制](#19-svc-服务控制)
- [2. U-Boot 命令](#2-u-boot-命令)
- [3. 源码编译命令](#3-源码编译命令)
- [4. 常用启动命令](#4-常用启动命令)
- [5. 烧录工具命令](#5-烧录工具命令)
- [6. USB 模式配置](#6-usb-模式配置)
- [7. 快速参考卡片](#7-快速参考卡片)

---

## 1. ADB Shell 命令

### 1.1 MAC/SN 读写

通过 unifykeys 接口读写 MAC 地址和序列号：

```bash
# ========== 写入 MAC 地址 ==========
su
echo 1 > /sys/class/unifykeys/attach
echo mac > /sys/class/unifykeys/name
echo 00:22:6D:D2:27:13 > /sys/class/unifykeys/write
cat /sys/class/unifykeys/read

# ========== 写入序列号 (SN) ==========
su
echo 1 > /sys/class/unifykeys/attach
echo usid > /sys/class/unifykeys/name
echo 2023011038 > /sys/class/unifykeys/write
cat /sys/class/unifykeys/read

# ========== 读取 MAC/SN ==========
adb shell getprop ro.boot.mac      # 读取 MAC
adb shell getprop ro.serialno      # 读取 SN
```

---

### 1.2 包管理 (pm)

pm (Package Manager) 用于管理应用包：

| 命令 | 功能 |
|------|------|
| `pm list packages` | 列出所有已安装应用 |
| `pm list packages -s` | 列出系统应用 |
| `pm list packages -3` | 列出第三方应用 |
| `pm dump <PACKAGE>` | 查看包详细信息 |
| `pm enable <PACKAGE>` | 启用应用 |
| `pm disable <PACKAGE>` | 禁用应用 |
| `pm uninstall <PACKAGE>` | 卸载应用 |
| `pm grant <PACKAGE> <PERMISSION>` | 授予权限 |
| `pm revoke <PACKAGE> <PERMISSION>` | 撤销权限 |
| `pm clear <PACKAGE>` | 清除应用数据和缓存 |

**示例**:
```bash
# 列出所有包含 "xxx" 的应用
pm list packages | grep xxx

# 清除某应用数据
pm clear com.example.app
```

---

### 1.3 活动管理 (am)

am (Activity Manager) 用于启动组件和管理活动：

| 命令 | 功能 |
|------|------|
| `am start -n <包名>/<Activity>` | 启动 Activity |
| `am startservice -n <包名>/<Service>` | 启动 Service |
| `am broadcast -a <ACTION>` | 发送广播 |
| `am force-stop <PACKAGE>` | 强制停止应用 |

**常用启动命令**:
```bash
# 启动 TV Settings
am start -n com.android.tv.settings/.MainSettings

# 启动 AOSP Settings
am start -n com.android.settings/.Settings

# 强制停止应用
am force-stop com.example.app
```

---

### 1.4 截屏录屏

```bash
# ========== 截屏 ==========
screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ./

# ========== 录屏 ==========
# 录制 10 秒视频
screenrecord --time-limit 10 /sdcard/record.mp4
adb pull /sdcard/record.mp4 ./
```

---

### 1.5 日志抓取

```bash
# ========== 基础用法 ==========
logcat                              # 实时查看日志
logcat -c                           # 清除日志缓冲区
logcat | grep -i error              # 过滤错误日志

# ========== 保存到文件 ==========
logcat -c && logcat -v threadtime > /data/debug.log
adb pull /data/debug.log ./

# ========== 按标签过滤 ==========
logcat -s ActivityManager:I        # 只显示 ActivityManager 的 Info 级别以上日志
logcat -s *:E                       # 只显示 Error 级别日志

# ========== 设置内核日志级别 ==========
echo 7 > /proc/sys/kernel/printk   # 0-7, 7为最详细
```

**日志级别**:
| 级别 | 字母 | 说明 |
|------|------|------|
| Verbose | V | 最详细 |
| Debug | D | 调试信息 |
| Info | I | 一般信息 |
| Warning | W | 警告 |
| Error | E | 错误 |
| Fatal | F | 致命错误 |

---

### 1.6 GPIO 控制

通过 sysfs 接口控制 GPIO：

```bash
# ========== 导出 GPIO ==========
echo 488 > /sys/class/gpio/export

# ========== 设置方向 ==========
cat /sys/class/gpio/gpio488/direction          # 查看方向
echo out > /sys/class/gpio/gpio488/direction   # 设置为输出
echo in > /sys/class/gpio/gpio488/direction    # 设置为输入

# ========== 控制电平 ==========
echo 1 > /sys/class/gpio/gpio488/value         # 输出高电平
echo 0 > /sys/class/gpio/gpio488/value         # 输出低电平
cat /sys/class/gpio/gpio488/value              # 读取电平

# ========== 释放 GPIO ==========
echo 488 > /sys/class/gpio/unexport
```

**GPIO 编号计算** (Amlogic):
```
GPIO编号 = 基址 + 偏移
例如: GPIOX_8 = 480 + 8 = 488
```

---

### 1.7 系统属性

```bash
# ========== 读取属性 ==========
getprop                                    # 列出所有属性
getprop ro.build.version.sdk               # 读取 SDK 版本
getprop persist.sys.timezone               # 读取时区

# ========== 设置属性 ==========
setprop persist.sys.timezone Asia/Shanghai # 设置时区

# ========== Settings 数据库 ==========
settings get system screen_brightness      # 读取亮度
settings put system screen_brightness 200  # 设置亮度

settings get global device_provisioned     # 设备是否已初始化
settings put global device_provisioned 1   # 标记设备已初始化

settings get secure user_setup_complete    # 用户设置是否完成
settings put secure user_setup_complete 1  # 标记设置完成
```

---

### 1.8 内存查看

```bash
# ========== 存储空间 ==========
df -h                                      # 查看分区使用情况
du -sh *                                   # 查看目录大小

# ========== 内存信息 ==========
cat /proc/meminfo                          # 系统内存信息
free -h                                    # 内存使用概览

# ========== 进程内存 ==========
dumpsys meminfo                            # 所有进程内存
dumpsys meminfo <PACKAGE>                  # 指定应用内存
dumpsys meminfo <PID>                      # 指定进程内存
```

---

### 1.9 SVC 服务控制

svc 命令用于控制系统服务：

```bash
# ========== 电源控制 ==========
svc power stayon true                      # 屏幕常亮
svc power stayon false                     # 允许息屏
svc power stayon usb                       # USB 接入时常亮
svc power reboot                           # 重启
svc power reboot recovery                  # 重启到 recovery
svc power shutdown                         # 关机
svc power forcesuspend 5000                # 5秒后强制休眠

# ========== USB 功能 ==========
svc usb setFunctions mtp                   # 设置为 MTP 模式
svc usb setFunctions adb                   # 设置为 ADB 模式
svc usb getFunctions                       # 查看当前 USB 功能
svc usb resetUsbGadget                     # 重置 USB

# ========== 网络控制 ==========
svc wifi enable                            # 开启 WiFi
svc wifi disable                           # 关闭 WiFi
svc bluetooth enable                       # 开启蓝牙
svc bluetooth disable                      # 关闭蓝牙
svc data enable                            # 开启数据流量
svc data disable                           # 关闭数据流量
svc nfc enable                             # 开启 NFC
svc nfc disable                            # 关闭 NFC
```

---

## 2. U-Boot 命令

在 U-Boot 控制台下执行：

### 2.1 环境变量

```bash
# ========== 查看/设置环境变量 ==========
printenv                           # 查看所有环境变量
printenv bootargs                  # 查看 bootargs
env set loglevel 7                 # 设置内核日志级别为 7
env save                           # 保存环境变量
env default -a                     # 恢复默认环境变量

# ========== 常用环境变量 ==========
env set bootdelay 3                # 设置启动延迟为 3 秒
```

### 2.2 GPIO 控制

```bash
gpio status -a                     # 查看所有 GPIO 状态
gpio set GPIOX_8                   # 拉高 GPIOX_8
gpio clear GPIOX_8                 # 拉低 GPIOX_8
gpio input GPIOX_8                 # 读取 GPIOX_8 电平
```

> **注意**: U-Boot 下的 GPIO 设置在 reboot 后会失效

### 2.3 启动控制

```bash
boot                               # 正常启动
run storeboot                      # 从存储启动
run recovery_from_flash            # 进入 recovery
reboot                             # 重启
reset                              # 复位
```

---

## 3. 源码编译命令

### 3.1 APK 信息查看

```bash
# ========== 使用 aapt ==========
# 查看 APK 基本信息
./prebuilts/sdk/tools/linux/bin/aapt dump badging xxx.apk

# 过滤特定信息
aapt dump badging xxx.apk | grep package      # 包名
aapt dump badging xxx.apk | grep permission   # 权限
aapt dump badging xxx.apk | grep activity     # Activity

# 查看 AndroidManifest.xml
aapt dump xmltree xxx.apk AndroidManifest.xml

# ========== 使用 aapt2 ==========
./out/host/linux-x86/bin/aapt2 dump badging xxx.apk
./out/host/linux-x86/bin/aapt2 dump xmltree xxx.apk AndroidManifest.xml
```

### 3.2 APK 签名

```bash
# 使用源码中的签名工具
java -Djava.library.path="prebuilts/sdk/tools/linux/lib64" \
     -jar ./prebuilts/sdk/tools/lib/signapk.jar \
     vendor/xxx/android-certs/platform.x509.pem \
     vendor/xxx/android-certs/platform.pk8 \
     input.apk output_signed.apk
```

### 3.3 编译清理

```bash
# 清理 dtb 文件 (修改 dts/dtsi 后需要)
find out/ -name "*.dtb" | xargs rm -rf

# 清理特定模块
make clean-<MODULE_NAME>

# 完全清理
make clean
make clobber
```

### 3.4 生成签名证书

```bash
# 在源码根目录执行
development/tools/make_key platform \
    '/C=CN/ST=Guangdong/L=Shenzhen/O=XXX/OU=Android/CN=Android/emailAddress=android@xxx.cn'
```

---

## 4. 常用启动命令

### 4.1 Settings 启动

| 应用 | 启动命令 |
|------|----------|
| TV Settings | `am start -n com.android.tv.settings/.MainSettings` |
| AOSP Settings | `am start -n com.android.settings/.Settings` |
| DroidTvSettings | `am start -n com.droidlogic.tv.settings/.MainSettings` |

### 4.2 系统应用启动

| 应用 | 启动命令 |
|------|----------|
| Launcher | `am start -n com.android.launcher3/.Launcher` |
| 文件管理器 | `am start -n com.android.documentsui/.LauncherActivity` |
| 蓝牙设置 | `am start -n com.android.settings/.bluetooth.BluetoothSettings` |
| WiFi 设置 | `am start -n com.android.settings/.wifi.WifiSettings` |

---

## 5. 烧录工具命令

### 5.1 USB Burning Tool

Windows 下使用 USB Burning Tool 进行全量烧录：

```bash
# 烧录步骤
1. 设备进入烧录模式 (短接 USB_BOOT 针或按住烧录键开机)
2. 运行 USB_Burning_Tool.exe
3. 选择烧录镜像: File -> Import Image
4. 点击 Start 开始烧录
5. 等待完成后点击 Stop
```

### 5.2 adnl 工具

adnl 是 Amlogic 提供的 Linux/Mac 命令行烧录工具：

```bash
# ========== 安装 adnl ==========
# Linux
sudo cp adnl /usr/bin/
sudo chmod +x /usr/bin/adnl

# 添加 udev 规则 (免 sudo)
echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="1b8e", MODE="0666"' | \
    sudo tee /etc/udev/rules.d/70-amlogic.rules
sudo udevadm control --reload-rules

# ========== 烧录命令 ==========
# 烧录单个分区
adnl partition bootloader u-boot.bin
adnl partition boot boot.img
adnl partition system system.img
adnl partition vendor vendor.img

# 烧录完整镜像
adnl all aml_upgrade_package.img

# 擦除分区
adnl erase bootloader
adnl erase data

# 重启设备
adnl reboot
adnl reboot bootloader    # 重启到 bootloader
adnl reboot recovery      # 重启到 recovery

# ========== 调试命令 ==========
adnl devices              # 列出连接的设备
adnl getvar all           # 获取设备变量
```

### 5.3 fastboot 工具

fastboot 用于快速刷入分区镜像：

```bash
# ========== 进入 fastboot 模式 ==========
# 方法1: ADB 命令
adb reboot bootloader

# 方法2: U-Boot 命令
fastboot 0

# 方法3: 烧录键 (设备特定)

# ========== 烧录命令 ==========
# 查看设备
fastboot devices

# 烧录分区
fastboot flash bootloader u-boot.bin
fastboot flash boot boot.img
fastboot flash system system.img
fastboot flash vendor vendor.img
fastboot flash dtbo dtbo.img
fastboot flash vbmeta vbmeta.img

# 烧录 super 分区 (动态分区)
fastboot flash super super.img

# ========== 擦除命令 ==========
fastboot erase cache
fastboot erase userdata
fastboot erase metadata

# ========== 控制命令 ==========
fastboot reboot              # 正常重启
fastboot reboot-bootloader   # 重启到 bootloader
fastboot reboot recovery     # 重启到 recovery
fastboot oem unlock          # OEM 解锁 (部分设备)
fastboot getvar all          # 获取设备信息

# ========== fastbootd 模式 (动态分区) ==========
# 重启到 fastbootd (用户空间 fastboot)
fastboot reboot fastboot

# 在 fastbootd 下烧录逻辑分区
fastboot flash system system.img
fastboot flash vendor vendor.img
fastboot flash product product.img
```

### 5.4 烧录工具对比

| 工具 | 平台 | 适用场景 | 优势 |
|------|------|----------|------|
| **USB Burning Tool** | Windows | 全量烧录、救砖 | GUI 界面友好 |
| **adnl** | Linux/Mac | 开发调试、脚本化烧录 | 命令行灵活 |
| **fastboot** | 全平台 | 快速刷入单分区 | 通用性强 |

---

## 6. USB 模式配置

### 6.1 USB 控制器模式

DTS 配置 (`common/arch/arm64/boot/dts/amlogic/s7d_xxx.dts`):

```dts
&dwc2_a {
    status = "okay";
    /**
     * controller-type 取值:
     * 0: normal (自动检测)
     * 1: host only (仅主机模式)
     * 2: device only (仅设备模式，用于 ADB)
     * 3: otg (OTG 模式)
     */
    controller-type = <3>;  // OTG 模式
};
```

| 模式值 | 功能 | 典型场景 |
|--------|------|----------|
| 0 | Normal (自动) | 默认配置 |
| 1 | Host Only | 仅连接 U 盘/键盘 |
| 2 | Device Only | 仅作为 ADB 设备 |
| 3 | OTG | 动态切换主机/设备 |

### 6.2 USB 模式运行时切换

```bash
# 查看当前 USB 配置
getprop sys.usb.config
getprop persist.sys.usb.config

# 设置 USB 功能
setprop persist.sys.usb.config mtp          # MTP 模式
setprop persist.sys.usb.config mtp,adb      # MTP + ADB
setprop persist.sys.usb.config adb          # 仅 ADB
setprop persist.sys.usb.config ptp          # PTP 模式

# 使用 svc 命令
svc usb setFunctions mtp
svc usb setFunctions adb
svc usb setFunctions mtp,adb
svc usb getFunctions                         # 查看当前功能

# 重置 USB
svc usb resetUsbGadget
```

### 6.3 USB Gadget 调试

```bash
# 查看 USB Gadget 状态
cat /sys/class/android_usb/android0/state
cat /sys/class/android_usb/android0/functions

# 查看 USB 控制器模式
cat /sys/devices/platform/*/dwc2_a/mode

# USB 设备信息
lsusb                        # 列出 USB 设备 (Host 模式)
cat /sys/kernel/debug/usb/devices

# 内核日志
dmesg | grep -i "usb\|dwc\|gadget"
```

---

## 7. 快速参考卡片

### 调试三板斧

```bash
# 1. 快速抓日志
adb shell "logcat -c && logcat -v time" > debug.log

# 2. 查看崩溃堆栈
adb logcat | grep -E "FATAL|AndroidRuntime"

# 3. 重启到 recovery
adb reboot recovery
```

### 开发常用

```bash
# 安装 APK
adb install -r xxx.apk

# 推送文件
adb push local_file /sdcard/

# 拉取文件
adb pull /sdcard/remote_file ./

# 获取屏幕分辨率
adb shell wm size

# 获取屏幕密度
adb shell wm density
```

---

*文档版本: 1.0*
*更新日期: 2025-12-12*
*来源: Amlogics905x 方案合集.md*
