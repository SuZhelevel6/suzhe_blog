# 调试与性能优化指南

---

## 目录

- [1. 日志系统概述](#1-日志系统概述)
- [2. Logcat 日志分析](#2-logcat-日志分析)
- [3. 内核日志 (Kernel Log)](#3-内核日志-kernel-log)
- [4. 串口调试](#4-串口调试)
- [5. Systrace 性能分析](#5-systrace-性能分析)
- [6. Perfetto 跟踪工具](#6-perfetto-跟踪工具)
- [7. 内存分析](#7-内存分析)
- [8. ANR 与 Crash 分析](#8-anr-与-crash-分析)
- [9. 启动性能优化](#9-启动性能优化)
- [10. 内存优化](#10-内存优化)
- [11. 功耗分析](#11-功耗分析)
- [12. Thermal 温控配置](#12-thermal-温控配置)
- [13. VDDCPU/VDDEE DVFS 配置](#13-vddcpuvddee-dvfs-配置)
- [14. CPU/GPU 频率调试](#14-cpugpu-频率调试)
- [15. Watchdog 配置](#15-watchdog-配置)
- [16. 常用调试命令速查](#16-常用调试命令速查)

---

## 1. 日志系统概述

Android 系统的日志主要分为两大类：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Android 日志系统架构                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           │                                                  │
           ▼                                                  ▼
┌─────────────────────────┐                      ┌─────────────────────────┐
│      Logcat 日志         │                      │      内核日志            │
│   (Android Framework)    │                      │    (Kernel Log)         │
├─────────────────────────┤                      ├─────────────────────────┤
│ - 应用层日志             │                      │ - 内核启动日志           │
│ - Framework 日志         │                      │ - 驱动加载日志           │
│ - System 服务日志        │                      │ - 硬件中断/异常          │
│ - Events 事件日志        │                      │ - 内存/电源管理          │
├─────────────────────────┤                      ├─────────────────────────┤
│ 工具: adb logcat         │                      │ 工具: dmesg / kmsg       │
│ 存储: /dev/log/          │                      │ 存储: /proc/kmsg         │
│       (logd daemon)      │                      │       内核环形缓冲区      │
└─────────────────────────┘                      └─────────────────────────┘
```

| 日志类型 | 来源 | 查看工具 | 主要用途 |
|---------|------|---------|---------|
| **Logcat** | Android Framework/Apps | `adb logcat` | 应用调试、系统服务分析 |
| **Kernel Log** | Linux 内核 | `dmesg` / `cat /proc/kmsg` | 驱动调试、硬件问题排查 |
| **串口日志** | U-Boot / Kernel / Android | 串口终端 | 启动问题、底层调试 |

---

## 2. Logcat 日志分析

### 2.1 Logcat 基础

Logcat 是 Android 的日志系统，用于收集和查看应用程序、系统服务和框架的日志。

#### 日志格式

```
日期    时间       PID   TID  级别 TAG                : 消息内容
12-10 15:30:45.123  1234 1234 I ActivityManager      : Start proc com.example.app
```

#### 日志级别

| 级别 | 字母 | 描述 | 使用场景 |
|-----|-----|------|---------|
| Verbose | V | 最详细 | 开发调试，详细追踪 |
| Debug | D | 调试信息 | 开发阶段调试 |
| Info | I | 信息 | 一般运行信息 |
| Warning | W | 警告 | 潜在问题 |
| Error | E | 错误 | 需要处理的错误 |
| Fatal | F | 致命 | 系统崩溃级别 |

### 2.2 常用 Logcat 命令

```bash
# 基本查看
adb logcat                          # 实时查看所有日志
adb logcat -v time                  # 带时间戳格式
adb logcat -v threadtime            # 带线程ID和时间戳

# 日志过滤
adb logcat *:E                      # 只显示 Error 及以上级别
adb logcat *:W                      # 只显示 Warning 及以上级别
adb logcat ActivityManager:I *:S    # 只显示 ActivityManager 的 Info 日志
adb logcat -s "TAG"                 # 只显示指定 TAG 的日志

# 多 TAG 过滤
adb logcat ActivityManager:V WindowManager:D *:S

# 正则过滤
adb logcat | grep -E "ActivityManager|WindowManager"
adb logcat | grep -i "error"        # 不区分大小写搜索 error

# 日志缓冲区
adb logcat -b main                  # 主日志缓冲区
adb logcat -b system                # 系统日志缓冲区
adb logcat -b events                # 事件日志缓冲区
adb logcat -b crash                 # 崩溃日志缓冲区
adb logcat -b all                   # 所有缓冲区

# 日志保存
adb logcat > logcat.txt             # 保存到文件
adb logcat -d > logcat.txt          # 导出当前缓冲区并退出
adb logcat -c                       # 清空日志缓冲区

# 查看缓冲区大小
adb logcat -g                       # 显示缓冲区大小
adb logcat -G 16M                   # 设置缓冲区大小为 16MB
```

### 2.3 常用日志过滤场景

#### 2.3.1 启动相关

```bash
# 启动时间
adb logcat -b events | grep -E "boot_progress|am_activity"

# 查看启动完成标记
adb logcat | grep "sys.boot_completed"

# ActivityManager 启动日志
adb logcat -s ActivityManager:V | grep -E "Start proc|Displayed"
```

#### 2.3.2 应用崩溃

```bash
# 查看崩溃日志
adb logcat -b crash

# 查看 ANR
adb logcat | grep -E "ANR in|am_anr"

# 查看 Exception
adb logcat | grep -E "FATAL EXCEPTION|AndroidRuntime"
```

#### 2.3.3 系统服务

```bash
# PackageManager
adb logcat -s PackageManager:V

# WindowManager
adb logcat -s WindowManager:V

# SurfaceFlinger
adb logcat -s SurfaceFlinger:V

# 电源管理
adb logcat -s PowerManagerService:V
```

#### 2.3.4 Amlogic 平台相关

```bash
# 视频相关
adb logcat | grep -iE "MediaPlayer|VideoView|AmPlayer|vdec"

# HDMI 相关
adb logcat | grep -iE "hdmi|hdcp|cec"

# 显示相关
adb logcat | grep -iE "SurfaceFlinger|vout|osd"

# 音频相关
adb logcat | grep -iE "AudioFlinger|alsa|aml_audio"
```

### 2.4 Logcat 高级用法

#### 按进程过滤

```bash
# 获取应用 PID
adb shell pidof com.example.app

# 按 PID 过滤
adb logcat --pid=1234
```

#### 带颜色输出

```bash
# 使用 coloredlogcat (需要安装)
adb logcat | coloredlogcat

# 或使用 pidcat (更推荐)
pidcat com.example.app
```

#### 格式化输出

```bash
# 简洁格式
adb logcat -v brief

# 详细格式
adb logcat -v long

# 自定义格式
adb logcat -v 'printable year usec uid'
```

---

## 3. 内核日志 (Kernel Log)

### 3.1 内核日志级别

Linux 内核使用 8 个日志级别：

| 级别 | 值 | 宏定义 | 描述 |
|-----|---|--------|------|
| KERN_EMERG | 0 | `pr_emerg` | 紧急情况，系统不可用 |
| KERN_ALERT | 1 | `pr_alert` | 需要立即采取行动 |
| KERN_CRIT | 2 | `pr_crit` | 严重条件 |
| KERN_ERR | 3 | `pr_err` | 错误条件 |
| KERN_WARNING | 4 | `pr_warn` | 警告条件 |
| KERN_NOTICE | 5 | `pr_notice` | 正常但重要的条件 |
| KERN_INFO | 6 | `pr_info` | 信息性消息 |
| KERN_DEBUG | 7 | `pr_debug` | 调试级别消息 |

### 3.2 查看内核日志

```bash
# 基本查看
adb shell dmesg                     # 查看内核日志
adb shell dmesg -T                  # 带人类可读时间戳
adb shell dmesg -w                  # 实时跟踪 (类似 tail -f)
adb shell dmesg | tail -100         # 查看最后 100 行

# 按级别过滤
adb shell dmesg -l err              # 只看错误
adb shell dmesg -l warn,err         # 警告和错误
adb shell dmesg -l emerg,alert,crit,err  # 严重错误

# 关键字过滤
adb shell dmesg | grep -i "error"
adb shell dmesg | grep -i "mmc"     # eMMC 相关
adb shell dmesg | grep -i "usb"     # USB 相关
adb shell dmesg | grep -i "hdmi"    # HDMI 相关

# 直接读取内核消息
adb shell cat /proc/kmsg            # 实时内核消息 (阻塞)

# 保存内核日志
adb shell dmesg > kernel_log.txt
```

### 3.3 打开内核调试打印

内核打印级别控制着哪些消息会输出到控制台。有多种方式可以打开/调整内核打印级别：

#### 方式一：运行时动态修改 (临时)

```bash
# 查看当前打印级别
adb shell cat /proc/sys/kernel/printk
# 输出格式: console_loglevel  default_message_loglevel  minimum_console_loglevel  default_console_loglevel
# 例如: 4    4    1    7

# 设置控制台日志级别为 7 (显示所有消息)
adb shell "echo 7 > /proc/sys/kernel/printk"

# 或使用 sysctl
adb shell sysctl -w kernel.printk="7 4 1 7"

# 恢复默认级别
adb shell "echo 4 > /proc/sys/kernel/printk"
```

**printk 四个数字的含义**:

| 位置 | 名称 | 默认值 | 说明 |
|-----|------|-------|------|
| 1 | console_loglevel | 4 | 控制台显示的最低级别 |
| 2 | default_message_loglevel | 4 | 默认消息级别 |
| 3 | minimum_console_loglevel | 1 | 控制台允许的最小级别 |
| 4 | default_console_loglevel | 7 | 默认控制台级别 |

#### 方式二：U-Boot 环境变量 (永久)

在 U-Boot 命令行中设置内核启动参数：

```bash
# 进入 U-Boot 命令行 (开机时按住空格或回车)

# 查看当前启动参数
s4_ap222# printenv bootargs

# 方法1: 设置 loglevel 环境变量
s4_ap222# env set loglevel 7

# 保存环境变量到存储设备
s4_ap222# env save
Saving Environment to MMC... Writing to MMC(0)... OK

# 重启设备应用设置
s4_ap222# reboot

# 方法2: 直接修改 bootargs (不推荐，可能被覆盖)
s4_ap222# setenv bootargs "${bootargs} loglevel=7"
s4_ap222# saveenv
```

#### 方式三：修改内核 defconfig (编译时)

修改内核配置文件：

```bash
# 位置: device/amlogic/ross/kernel_defconfig 或
#       common/common14-5.15/arch/arm64/configs/xxx_defconfig

# 添加或修改以下配置
CONFIG_PRINTK=y
CONFIG_PRINTK_TIME=y
CONFIG_MESSAGE_LOGLEVEL_DEFAULT=7
CONFIG_CONSOLE_LOGLEVEL_DEFAULT=7
CONFIG_CONSOLE_LOGLEVEL_QUIET=4

# 启用动态调试 (可选，更强大)
CONFIG_DYNAMIC_DEBUG=y
```

#### 方式四：内核启动参数 (cmdline)

在设备树或 BoardConfig 中添加内核参数：

```bash
# 在 device/amlogic/ross/BoardConfig.mk 中
BOARD_KERNEL_CMDLINE += loglevel=7 printk.devkmsg=on

# 或在设备树中
chosen {
    bootargs = "loglevel=7 printk.devkmsg=on";
};
```

**常用内核启动参数**:

| 参数 | 说明 |
|-----|------|
| `loglevel=7` | 设置控制台日志级别为 7 (显示所有) |
| `loglevel=4` | 设置控制台日志级别为 4 (警告及以上) |
| `printk.devkmsg=on` | 允许用户空间写入 /dev/kmsg |
| `ignore_loglevel` | 忽略日志级别，打印所有消息 |
| `quiet` | 安静模式，只打印错误 |
| `debug` | 调试模式，打印所有调试信息 |
| `earlyprintk` | 启用早期打印 (内核启动早期) |

#### 方式五：动态调试 (Dynamic Debug)

如果内核编译时启用了 `CONFIG_DYNAMIC_DEBUG`，可以更精细地控制：

```bash
# 查看可用的调试点
adb shell cat /sys/kernel/debug/dynamic_debug/control

# 启用特定模块的调试
echo 'module meson_mmc +p' > /sys/kernel/debug/dynamic_debug/control

# 启用特定文件的调试
echo 'file drivers/mmc/host/meson-gx-mmc.c +p' > /sys/kernel/debug/dynamic_debug/control

# 启用特定函数的调试
echo 'func meson_mmc_probe +p' > /sys/kernel/debug/dynamic_debug/control

# 禁用调试
echo 'module meson_mmc -p' > /sys/kernel/debug/dynamic_debug/control
```

### 3.4 内核日志分析示例

#### 启动异常分析

```bash
# 查看启动过程中的错误
adb shell dmesg | grep -iE "error|fail|unable|warn" | head -50

# 查看驱动加载失败
adb shell dmesg | grep -i "probe failed"

# 查看内存分配失败
adb shell dmesg | grep -i "out of memory\|oom"
```

#### 设备驱动调试

```bash
# HDMI 驱动
adb shell dmesg | grep -i "hdmitx\|hdmi"

# 显示驱动
adb shell dmesg | grep -i "vout\|drm\|fb"

# 存储驱动
adb shell dmesg | grep -i "mmc\|emmc\|sdcard"

# USB 驱动
adb shell dmesg | grep -i "usb\|dwc"

# WiFi/蓝牙驱动
adb shell dmesg | grep -i "wifi\|wlan\|bluetooth\|bt"
```

### 3.5 内核崩溃日志 (ramoops/pstore)

系统配置了 ramoops 用于保存内核崩溃日志：

```bash
# 查看 pstore 中保存的崩溃日志
adb shell ls -la /sys/fs/pstore/
adb shell cat /sys/fs/pstore/console-ramoops-0

# 查看最后一次内核 panic
adb shell cat /sys/fs/pstore/dmesg-ramoops-0
```

---

## 4. 串口调试

### 4.1 串口连接配置

Amlogic S905X5 平台的串口配置：

| 参数 | 值 |
|-----|-----|
| 波特率 | 115200 或 921600 |
| 数据位 | 8 |
| 停止位 | 1 |
| 校验位 | None |
| 流控制 | None |

### 4.2 常用串口工具

#### Linux

```bash
# minicom
sudo minicom -D /dev/ttyUSB0 -b 115200

# screen
sudo screen /dev/ttyUSB0 115200

# picocom
sudo picocom -b 115200 /dev/ttyUSB0

# 退出: Ctrl+A, K (minicom) 或 Ctrl+A, Ctrl+\ (screen)
```

#### Windows

- **PuTTY**: 选择 Serial，配置 COM 端口和波特率
- **SecureCRT**: 创建 Serial 连接
- **MobaXterm**: 选择 Serial session

### 4.3 串口日志级别

串口输出的日志级别由 `loglevel` 控制（参见 3.3 节）。

串口日志包含三个阶段：

1. **U-Boot 阶段**: 完整的 Bootloader 日志
2. **Kernel 阶段**: Linux 内核启动日志
3. **Android 阶段**: Init 和系统服务日志

### 4.4 串口命令行

#### U-Boot 命令行

开机时按住任意键进入 U-Boot 命令行：

```bash
# 常用命令
s4_ap222# help                      # 帮助
s4_ap222# printenv                  # 查看环境变量
s4_ap222# md 0x01000000 0x100       # 读内存
s4_ap222# mmc info                  # eMMC 信息
s4_ap222# boot                      # 继续启动
s4_ap222# reboot                    # 重启
```

#### Android Shell

系统启动后，串口自动进入 Android shell：

```bash
ross:/ # logcat                     # 查看 logcat
ross:/ # dmesg                      # 查看内核日志
ross:/ # getprop                    # 查看系统属性
```

---

## 5. Systrace 性能分析

### 5.1 Systrace 概述

Systrace 是 Android 提供的系统级性能分析工具，用于分析：

- CPU 调度
- UI 渲染性能
- 系统服务调用
- 应用性能瓶颈

### 5.2 抓取 Systrace

#### 方式一：使用 systrace.py 脚本

```bash
# 基本用法
cd $ANDROID_HOME/platform-tools/systrace
python systrace.py -o trace.html sched freq idle am wm view

# 常用参数
python systrace.py \
    -t 10 \                         # 抓取 10 秒
    -o trace.html \                 # 输出文件
    -a com.example.app \            # 指定应用
    sched freq idle am wm view gfx  # 抓取类别

# 启动时抓取
python systrace.py --boot -o boot_trace.html \
    sched freq idle am wm view
```

#### 方式二：使用 atrace 命令

```bash
# 查看可用类别
adb shell atrace --list_categories

# 开始抓取
adb shell atrace --async_start -c -b 65536 sched freq idle am wm view

# 停止并导出
adb shell atrace --async_stop > trace.txt

# 转换为 HTML
systrace.py --from-file trace.txt -o trace.html
```

### 5.3 Systrace 类别

| 类别 | 描述 |
|-----|------|
| `sched` | CPU 调度 |
| `freq` | CPU 频率变化 |
| `idle` | CPU 空闲状态 |
| `am` | Activity Manager |
| `wm` | Window Manager |
| `view` | View 系统 |
| `gfx` | 图形系统 |
| `input` | 输入系统 |
| `audio` | 音频系统 |
| `video` | 视频系统 |
| `hal` | Hardware Abstraction Layer |
| `res` | 资源加载 |
| `dalvik` | Dalvik/ART 虚拟机 |
| `bionic` | Bionic libc |
| `power` | 电源管理 |
| `binder_driver` | Binder 驱动 |
| `binder_lock` | Binder 锁 |

### 5.4 分析 Systrace

使用 Chrome 浏览器打开生成的 HTML 文件：

```bash
# 打开 Chrome 并加载 trace
google-chrome trace.html
```

#### 快捷键

| 快捷键 | 功能 |
|-------|------|
| W/S | 缩放 |
| A/D | 左右移动 |
| M | 高亮选中的时间段 |
| / | 搜索 |
| F | 聚焦选中的进程 |

#### 分析要点

1. **帧率分析**: 查看 SurfaceFlinger 的 Vsync 信号
2. **卡顿分析**: 寻找超过 16.6ms 的帧
3. **CPU 分析**: 查看 CPU 使用率和调度
4. **阻塞分析**: 寻找 Binder 调用阻塞

---

## 6. Perfetto 跟踪工具

### 6.1 Perfetto 概述

Perfetto 是 Android 10+ 引入的新一代跟踪系统，功能比 Systrace 更强大：

- 支持更长时间的跟踪
- 更低的性能开销
- 支持自定义数据源
- 强大的 SQL 查询功能

### 6.2 使用 Perfetto

#### 方式一：使用配置文件

创建配置文件 `config.pbtx`:

```protobuf
# 基本配置
buffers: {
    size_kb: 63488
    fill_policy: RING_BUFFER
}
duration_ms: 10000

# CPU 调度
data_sources: {
    config {
        name: "linux.ftrace"
        ftrace_config {
            ftrace_events: "sched/sched_switch"
            ftrace_events: "power/suspend_resume"
            ftrace_events: "sched/sched_wakeup"
            ftrace_events: "sched/sched_wakeup_new"
            ftrace_events: "sched/sched_process_exit"
            ftrace_events: "sched/sched_process_free"
            ftrace_events: "task/task_newtask"
            ftrace_events: "task/task_rename"
        }
    }
}

# Android Log
data_sources: {
    config {
        name: "android.log"
        android_log_config {
            log_ids: LID_DEFAULT
            log_ids: LID_SYSTEM
            log_ids: LID_CRASH
        }
    }
}

# 进程统计
data_sources: {
    config {
        name: "linux.process_stats"
        process_stats_config {
            scan_all_processes_on_start: true
        }
    }
}
```

抓取跟踪：

```bash
# 推送配置文件
adb push config.pbtx /data/local/tmp/

# 开始抓取
adb shell perfetto \
    --txt \
    --config /data/local/tmp/config.pbtx \
    --out /data/local/tmp/trace.perfetto-trace

# 导出跟踪文件
adb pull /data/local/tmp/trace.perfetto-trace
```

#### 方式二：使用命令行参数

```bash
# 快速抓取 10 秒
adb shell perfetto -o /data/local/tmp/trace \
    -t 10s \
    sched freq idle am wm view gfx

# 抓取特定应用
adb shell perfetto -o /data/local/tmp/trace \
    -t 10s \
    --app com.example.app \
    sched freq idle am wm view
```

#### 方式三：使用 Web UI

1. 打开 https://ui.perfetto.dev/
2. 点击 "Record new trace"
3. 配置跟踪选项
4. 连接设备并开始记录

### 6.3 分析 Perfetto 跟踪

#### 使用 Perfetto UI

1. 打开 https://ui.perfetto.dev/
2. 拖拽 `.perfetto-trace` 文件到页面
3. 使用时间线和 SQL 查询分析

#### SQL 查询示例

```sql
-- 查看 CPU 调度
SELECT ts, dur, cpu, utid, end_state
FROM sched
WHERE utid IN (SELECT utid FROM thread WHERE name LIKE '%main%')

-- 查看进程列表
SELECT upid, pid, name FROM process

-- 查看 Android 日志
SELECT * FROM android_logs WHERE tag = 'ActivityManager'

-- 计算平均帧时间
SELECT AVG(dur) as avg_frame_time
FROM slice
WHERE name = 'doFrame'
```

---

## 7. 内存分析

### 7.1 dumpsys meminfo

```bash
# 系统整体内存
adb shell dumpsys meminfo

# 指定应用内存
adb shell dumpsys meminfo com.example.app

# 详细内存信息
adb shell dumpsys meminfo -a com.example.app
```

#### 输出解读

```
Applications Memory Usage (in Kilobytes):
Uptime: 12345678 Realtime: 12345678

Total PSS by process:
    234,567K: system (pid 1000)
    123,456K: com.android.systemui (pid 2000)
    ...

Total PSS by category:
    345,678K: Native
    234,567K: Dalvik
    123,456K: .so mmap
    ...
```

| 指标 | 说明 |
|-----|------|
| **PSS** (Proportional Set Size) | 按比例分配的共享内存 |
| **USS** (Unique Set Size) | 进程独占内存 |
| **RSS** (Resident Set Size) | 常驻内存 |
| **VSS** (Virtual Set Size) | 虚拟内存 |
| **Native Heap** | Native 代码分配的内存 |
| **Dalvik Heap** | Java 堆内存 |

### 7.2 procrank 和 procmem

```bash
# 查看所有进程内存排名
adb shell procrank

# 查看特定进程内存详情
adb shell procmem <pid>
```

### 7.3 /proc/meminfo

```bash
# 系统内存信息
adb shell cat /proc/meminfo

# 关键指标
MemTotal:        2048000 kB      # 总内存
MemFree:          512000 kB      # 空闲内存
MemAvailable:     768000 kB      # 可用内存
Buffers:           32000 kB      # 缓冲区
Cached:           256000 kB      # 页缓存
SwapTotal:        648000 kB      # 交换分区总大小
SwapFree:         500000 kB      # 交换分区空闲
```

### 7.4 内存泄漏检测

#### 使用 LeakCanary (应用开发)

```gradle
// build.gradle
debugImplementation 'com.squareup.leakcanary:leakcanary-android:2.12'
```

#### 使用 DDMS / Android Studio Profiler

1. 打开 Android Studio Profiler
2. 连接设备并选择进程
3. 点击 Memory 区域
4. 使用 "Dump Java Heap" 分析

#### 使用 adb shell am dumpheap

```bash
# 导出堆内存
adb shell am dumpheap <pid> /data/local/tmp/heap.hprof

# 拉取文件
adb pull /data/local/tmp/heap.hprof

# 使用 MAT (Memory Analyzer Tool) 分析
```

---

## 8. ANR 与 Crash 分析

### 8.1 ANR (Application Not Responding)

ANR 发生条件：

| 场景 | 超时时间 |
|-----|---------|
| 前台 Activity 输入事件 | 5 秒 |
| 前台 BroadcastReceiver | 10 秒 |
| 后台 Service | 200 秒 |

#### ANR 日志位置

```bash
# ANR traces 文件
adb pull /data/anr/traces.txt

# ANR 相关 logcat
adb logcat | grep -E "ANR in|am_anr|Input dispatching timed out"

# 系统 dropbox
adb shell dumpsys dropbox --print data_app_anr
```

#### ANR traces 分析

```
----- pid 1234 at 2024-01-15 10:30:45 -----
Cmd line: com.example.app
...
"main" prio=5 tid=1 Blocked
  | group="main" sCount=1 dsCount=0 obj=0x756d0000 self=0x7f8c002a00
  | sysTid=1234 nice=-10 cgrp=default sched=0/0 handle=0x7f8c003000
  | state=S schedstat=( 1234567890 123456789 1234 ) utm=100 stm=50 core=0 HZ=100
  | stack=0x7ff0000000-0x7ff0002000 stackSize=8MB
  | held mutexes=
  at java.lang.Object.wait(Native method)
  - waiting on <0x12345678> (a java.lang.Object)
  at com.example.app.MainActivity.doSomething(MainActivity.java:100)
  ...
```

关键信息：

- **状态**: Blocked, Waiting, Native, Runnable 等
- **堆栈**: 当前执行位置
- **锁信息**: held mutexes, waiting on

### 8.2 Crash 分析

#### Native Crash (Tombstone)

```bash
# Tombstone 位置
adb pull /data/tombstones/

# 使用 ndk-stack 解析
$NDK/ndk-stack -sym obj/local/arm64-v8a -dump tombstone_00
```

Tombstone 内容：

```
*** *** *** *** *** *** *** *** *** *** *** *** *** *** *** ***
Build fingerprint: 'Amlogic/ross/ross:14/xxx/123456:userdebug/test-keys'
Revision: '0'
ABI: 'arm64'
Timestamp: 2024-01-15 10:30:45
pid: 1234, tid: 1234, name: example.app  >>> com.example.app <<<
signal 11 (SIGSEGV), code 1 (SEGV_MAPERR), fault addr 0x0
    x0  0000000000000000  x1  0000007f8c002a00  x2  0000000000000001
    ...
backtrace:
    #00 pc 0000000000012345  /system/lib64/libc.so (strlen+16)
    #01 pc 0000000000054321  /data/app/com.example.app/lib/arm64/libnative.so
```

#### Java Crash

```bash
# 查看崩溃日志
adb logcat -b crash

# 或搜索 FATAL EXCEPTION
adb logcat | grep -A 50 "FATAL EXCEPTION"
```

### 8.3 Watchdog 分析

系统 Watchdog 超时日志：

```bash
# 查看 Watchdog 日志
adb logcat | grep -i "watchdog"

# 系统服务 Watchdog
adb shell dumpsys activity | grep -A 5 "Watchdog"
```

---

## 9. 启动性能优化

### 9.1 启动时间测量

```bash
# 冷启动时间 (从点击到完全显示)
adb shell am start -W com.example.app/.MainActivity

# 输出示例
Starting: Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] cmp=com.example.app/.MainActivity }
Status: ok
LaunchState: COLD
Activity: com.example.app/.MainActivity
TotalTime: 1234          # 总启动时间 (ms)
WaitTime: 1300           # 等待时间 (ms)

# 系统启动时间
adb logcat -b events | grep boot_progress

# 启动完成标记
adb shell getprop sys.boot_completed
```

### 9.2 Bootchart 分析

```bash
# 启用 Bootchart (需要 userdebug 版本)
adb shell touch /data/bootchart/enabled
adb reboot

# 收集数据 (启动完成后)
adb pull /data/bootchart/

# 使用 bootchart 工具生成图表
bootchart /path/to/bootchart/
```

### 9.3 启动优化建议

#### Bootloader 阶段

- 优化 DDR 训练时间
- 减少不必要的硬件初始化
- 使用快速启动模式

#### Kernel 阶段

- 延迟加载非关键驱动
- 使用内核模块替代内建驱动
- 优化设备树

#### Init 阶段

- 并行化服务启动
- 延迟启动非关键服务
- 优化 SELinux 策略加载

#### Zygote/SystemServer 阶段

- 优化预加载类列表
- 减少不必要的系统服务
- 使用 Profile-Guided Optimization (PGO)

---

## 10. 内存优化

### 10.1 内存优化策略

#### 减少内存占用

- 使用合适的图片格式和分辨率
- 及时释放不用的资源
- 使用 SparseArray 替代 HashMap
- 避免内存泄漏

#### 系统级优化

```bash
# 调整 Low Memory Killer 参数
adb shell cat /sys/module/lowmemorykiller/parameters/minfree
adb shell echo "18432,23040,27648,32256,55296,80640" > /sys/module/lowmemorykiller/parameters/minfree

# 调整 ZRAM 大小
adb shell cat /sys/block/zram0/disksize
```

### 10.2 内存监控脚本

```bash
#!/bin/bash
# memory_monitor.sh - 持续监控内存使用

while true; do
    echo "=== $(date) ==="
    adb shell cat /proc/meminfo | grep -E "MemTotal|MemFree|MemAvailable|Cached|SwapFree"
    adb shell dumpsys meminfo | head -20
    sleep 5
done
```

---

## 11. 功耗分析

### 11.1 BatteryStats

```bash
# 重置电池统计
adb shell dumpsys batterystats --reset

# ... 运行测试场景 ...

# 导出电池统计
adb bugreport bugreport.zip

# 或直接查看
adb shell dumpsys batterystats > batterystats.txt
```

### 11.2 Battery Historian

1. 获取 bugreport
2. 上传到 https://bathist.ef.lc/ 或本地部署
3. 分析功耗数据

### 11.3 CPU 功耗分析

```bash
# CPU 频率
adb shell cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq

# CPU 空闲统计
adb shell cat /sys/devices/system/cpu/cpu0/cpuidle/state*/time

# 温度监控
adb shell cat /sys/class/thermal/thermal_zone*/temp
```

### 11.4 Wakelock 分析

```bash
# 查看当前 Wakelock
adb shell dumpsys power | grep -A 20 "Wake Locks"

# 内核 Wakelock
adb shell cat /sys/power/wake_lock
adb shell cat /d/wakeup_sources
```

---

## 12. Thermal 温控配置

### 12.1 Thermal 子系统架构

Amlogic 平台使用 Linux Thermal Framework 进行温度管理：

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Thermal Zone  │────►│  Thermal Gov   │────►│  Cooling Dev   │
│  (温度传感器)   │     │  (控制策略)     │     │  (降频/风扇)   │
└────────────────┘     └────────────────┘     └────────────────┘
```

### 12.2 DTS 配置

**设备树配置** (`common/arch/arm64/boot/dts/amlogic/s7d_xxx.dts`):

```dts
&meson_cooldev {
    status = "okay";

    // CPU 降频设备
    cpucore_cool_dev:cpucore_cool_dev {
        device_type = "cpucore_cool_dev";
        cooling_max_state = <4>;
        cooling_min_state = <0>;
        // 对应 CPU 核心数: 4 -> 3 -> 2 -> 1
    };

    // GPU 降频设备
    gpufreq_cool_dev:gpufreq_cool_dev {
        device_type = "gpufreq_cool_dev";
        cooling_max_state = <5>;
        // 对应 GPU 频率档位
    };
};

// 温控区域配置
thermal-zones {
    soc_thermal {
        polling-delay = <1000>;         // 正常轮询间隔 (ms)
        polling-delay-passive = <100>;  // 触发后轮询间隔 (ms)
        sustainable-power = <1000>;

        thermal-sensors = <&thermal_sensor>;

        trips {
            // 温度阈值定义
            switch_on: trip-point0 {
                temperature = <70000>;  // 70°C 开始降频
                hysteresis = <5000>;    // 回滞 5°C
                type = "passive";
            };

            hot: trip-point1 {
                temperature = <85000>;  // 85°C 加速降频
                hysteresis = <5000>;
                type = "hot";
            };

            critical: trip-point2 {
                temperature = <110000>; // 110°C 紧急关机
                hysteresis = <1000>;
                type = "critical";
            };
        };

        cooling-maps {
            map0 {
                trip = <&switch_on>;
                cooling-device = <&cpucore_cool_dev 0 4>;
            };
            map1 {
                trip = <&hot>;
                cooling-device = <&gpufreq_cool_dev 0 5>;
            };
        };
    };
};
```

### 12.3 Thermal 调试命令

```bash
# 查看温度
cat /sys/class/thermal/thermal_zone*/temp
# 输出单位: 毫摄氏度 (如 65000 = 65°C)

# 查看温控区域信息
for zone in /sys/class/thermal/thermal_zone*; do
    echo "=== $zone ==="
    cat $zone/type
    cat $zone/temp
done

# 查看触发点配置
cat /sys/class/thermal/thermal_zone0/trip_point_0_temp
cat /sys/class/thermal/thermal_zone0/trip_point_0_type

# 查看降温设备状态
cat /sys/class/thermal/cooling_device*/type
cat /sys/class/thermal/cooling_device*/cur_state
cat /sys/class/thermal/cooling_device*/max_state

# 实时监控温度
watch -n 1 "cat /sys/class/thermal/thermal_zone*/temp"
```

---

## 13. VDDCPU/VDDEE DVFS 配置

### 13.1 DVFS 概述

DVFS (Dynamic Voltage and Frequency Scaling) 动态调整 CPU 和系统的电压频率：

| 电源域 | 作用 | 调节范围 |
|--------|------|----------|
| **VDDCPU** | CPU 核心供电 | 0.72V ~ 1.04V |
| **VDDEE** | 系统逻辑供电 | 0.72V ~ 0.90V |

### 13.2 DTS 配置

**VDDCPU 配置** (`common/arch/arm64/boot/dts/amlogic/s7d_xxx.dts`):

```dts
&CPU0 {
    cpu-supply = <&vddcpu>;
    operating-points-v2 = <&cpu_opp_table>;
};

cpu_opp_table: opp-table {
    compatible = "operating-points-v2";
    opp-shared;

    opp-100000000 {
        opp-hz = /bits/ 64 <100000000>;   // 100 MHz
        opp-microvolt = <720000>;          // 0.72V
    };
    opp-500000000 {
        opp-hz = /bits/ 64 <500000000>;   // 500 MHz
        opp-microvolt = <720000>;
    };
    opp-1000000000 {
        opp-hz = /bits/ 64 <1000000000>;  // 1.0 GHz
        opp-microvolt = <760000>;
    };
    opp-1500000000 {
        opp-hz = /bits/ 64 <1500000000>;  // 1.5 GHz
        opp-microvolt = <860000>;
    };
    opp-2016000000 {
        opp-hz = /bits/ 64 <2016000000>;  // 2.0 GHz
        opp-microvolt = <1040000>;         // 1.04V
    };
};
```

**VDDEE 配置**:

```dts
&vddee {
    regulator-name = "VDDEE";
    regulator-min-microvolt = <720000>;
    regulator-max-microvolt = <900000>;
    regulator-boot-on;
    regulator-always-on;
};
```

### 13.3 PWM 电压调节配置

Amlogic 平台使用 PWM 调压：

```dts
&pwm_ij {
    status = "okay";
    pinctrl-names = "default";
    pinctrl-0 = <&pwm_i_pins>;
};

vddcpu: regulator-vddcpu {
    compatible = "pwm-regulator";
    pwms = <&pwm_ij 0 1500 0>;
    regulator-name = "VDDCPU";
    regulator-min-microvolt = <720000>;
    regulator-max-microvolt = <1040000>;
    pwm-supply = <&dc_5v>;

    // PWM 占空比与电压映射
    voltage-table = <
        1040000 0
        1020000 3
        1000000 6
        ...
        720000  100
    >;
};
```

### 13.4 DVFS 调试命令

```bash
# 查看当前 CPU 电压
cat /sys/kernel/debug/regulator/vddcpu/voltage

# 查看 OPP 表
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_frequencies

# 查看当前频率
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq

# 查看电压调节器状态
cat /sys/class/regulator/regulator.*/name
cat /sys/class/regulator/regulator.*/microvolts

# 手动设置 CPU 频率 (调试用)
echo userspace > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
echo 1500000 > /sys/devices/system/cpu/cpu0/cpufreq/scaling_setspeed
```

---

## 14. CPU/GPU 频率调试

### 14.1 CPU 频率调节

**查看 CPU 信息**:

```bash
# 可用频率列表
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_frequencies
# 输出: 100000 500000 667000 1000000 1200000 1404000 1500000 1608000 1704000 1800000 1908000 2016000

# 当前频率
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq

# 可用调速器
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors
# 输出: conservative ondemand userspace powersave performance schedutil

# 当前调速器
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
```

**设置 CPU 频率**:

```bash
# 切换到 userspace 模式
echo userspace > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# 设置固定频率 (单位 kHz)
echo 1500000 > /sys/devices/system/cpu/cpu0/cpufreq/scaling_setspeed

# 恢复默认调速器
echo schedutil > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# 设置最大/最小频率
echo 2016000 > /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq
echo 500000 > /sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq
```

### 14.2 GPU 频率调节

**查看 GPU 信息**:

```bash
# GPU 设备路径 (Mali-G52)
GPU_PATH=/sys/class/devfreq/fb000000.gpu

# 可用频率
cat $GPU_PATH/available_frequencies
# 输出: 125000000 250000000 500000000 666666666 800000000

# 当前频率
cat $GPU_PATH/cur_freq

# 可用调速器
cat $GPU_PATH/available_governors

# 当前调速器
cat $GPU_PATH/governor
```

**设置 GPU 频率**:

```bash
GPU_PATH=/sys/class/devfreq/fb000000.gpu

# 切换到 userspace 模式
echo userspace > $GPU_PATH/governor

# 设置固定频率 (单位 Hz)
echo 800000000 > $GPU_PATH/userspace/set_freq

# 恢复默认
echo simple_ondemand > $GPU_PATH/governor

# 设置最大/最小频率
echo 800000000 > $GPU_PATH/max_freq
echo 250000000 > $GPU_PATH/min_freq
```

### 14.3 频率监控脚本

```bash
#!/bin/bash
# freq_monitor.sh - CPU/GPU 频率实时监控

while true; do
    clear
    echo "=== CPU/GPU Frequency Monitor ==="
    echo ""
    echo "CPU Frequencies (kHz):"
    for i in 0 1 2 3; do
        freq=$(cat /sys/devices/system/cpu/cpu$i/cpufreq/scaling_cur_freq 2>/dev/null)
        echo "  CPU$i: $freq"
    done
    echo ""
    echo "GPU Frequency (Hz):"
    echo "  $(cat /sys/class/devfreq/fb000000.gpu/cur_freq)"
    echo ""
    echo "Temperature (mC):"
    echo "  $(cat /sys/class/thermal/thermal_zone0/temp)"
    sleep 1
done
```

---

## 15. Watchdog 配置

### 15.1 Watchdog 概述

Amlogic 平台支持多种 Watchdog：

| 类型 | 作用 | 超时范围 |
|------|------|----------|
| **硬件 Watchdog** | 系统级保护，超时复位 | 1-60 秒 |
| **Software Watchdog** | Android 服务监控 | 可配置 |
| **U-Boot Watchdog** | 启动阶段保护 | 可配置 |

### 15.2 DTS 配置

```dts
&watchdog {
    status = "okay";
    // 超时时间 (秒)
    timeout-sec = <10>;
    // 是否在启动时启用
    // hw_margin_ms = <5000>;
};
```

### 15.3 Watchdog 调试命令

```bash
# 查看 Watchdog 设备
ls /dev/watchdog*

# 查看 Watchdog 状态
cat /sys/class/watchdog/watchdog0/status
cat /sys/class/watchdog/watchdog0/timeout

# 查看 Watchdog 信息
cat /sys/class/watchdog/watchdog0/identity

# 手动喂狗 (写入任意字符)
echo 1 > /dev/watchdog

# 禁用 Watchdog (写入 'V')
echo V > /dev/watchdog

# 查看系统服务 Watchdog 状态
dumpsys activity | grep -A 5 "Watchdog"
```

### 15.4 Watchdog 相关日志

```bash
# 内核 Watchdog 日志
dmesg | grep -i watchdog

# 系统 Watchdog 超时日志
adb logcat | grep -i "watchdog"

# 查看 Watchdog 触发的重启原因
cat /sys/fs/pstore/console-ramoops-0 | grep -i watchdog
```

### 15.5 禁用 Watchdog

**方法一: DTS 配置**:

```dts
&watchdog {
    status = "disabled";
};
```

**方法二: U-Boot 环境变量**:

```bash
# U-Boot 命令行
setenv wdt_enable 0
saveenv
```

**方法三: Kernel 命令行**:

```makefile
# BoardConfig.mk
BOARD_KERNEL_CMDLINE += nowatchdog
```

---

## 16. 常用调试命令速查

### 16.1 日志类

```bash
# Logcat
adb logcat                          # 实时日志
adb logcat -v threadtime            # 带时间和线程
adb logcat -b crash                 # 崩溃日志
adb logcat *:E                      # 只看错误
adb logcat -c                       # 清空日志

# 内核日志
adb shell dmesg                     # 内核日志
adb shell dmesg -T                  # 带时间戳
adb shell cat /proc/kmsg            # 实时内核消息
echo 7 > /proc/sys/kernel/printk    # 打开所有内核打印
```

### 16.2 系统信息类

```bash
# 系统属性
adb shell getprop                   # 所有属性
adb shell getprop ro.build.version.sdk
adb shell setprop debug.xxx 1

# 系统服务
adb shell dumpsys                   # 所有服务
adb shell dumpsys activity          # Activity 信息
adb shell dumpsys meminfo           # 内存信息
adb shell dumpsys cpuinfo           # CPU 信息
adb shell dumpsys package           # 包信息
adb shell dumpsys window            # 窗口信息
adb shell dumpsys input             # 输入系统
```

### 16.3 性能分析类

```bash
# CPU
adb shell top                       # 进程 CPU 使用
adb shell cat /proc/cpuinfo         # CPU 信息
adb shell cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq

# 内存
adb shell free                      # 内存使用
adb shell cat /proc/meminfo         # 详细内存信息
adb shell procrank                  # 进程内存排名

# IO
adb shell iostat                    # IO 统计
adb shell cat /proc/diskstats       # 磁盘统计
```

### 16.4 进程管理类

```bash
# 进程查看
adb shell ps -A                     # 所有进程
adb shell ps -A | grep system_server
adb shell pidof com.example.app     # 获取 PID

# 进程操作
adb shell kill -9 <pid>             # 杀进程
adb shell am force-stop com.example.app

# 线程查看
adb shell ps -T -p <pid>            # 进程的线程
```

### 16.5 网络调试类

```bash
# 网络状态
adb shell netstat -an               # 网络连接
adb shell ifconfig                  # 网络接口
adb shell ip addr                   # IP 地址

# 网络测试
adb shell ping www.google.com
adb shell curl http://example.com
```

### 16.6 文件系统类

```bash
# 存储信息
adb shell df -h                     # 磁盘使用
adb shell du -sh /data/*            # 目录大小
adb shell mount                     # 挂载信息

# 文件操作
adb push local_file /sdcard/
adb pull /sdcard/file local_file
```

---

## 附录 A: 调试工具对比

| 工具 | 用途 | 优点 | 缺点 |
|-----|------|-----|------|
| **Logcat** | 应用/框架日志 | 简单易用，实时查看 | 信息量大，需要过滤 |
| **dmesg** | 内核日志 | 底层调试必备 | 需要了解内核 |
| **Systrace** | 系统性能分析 | 可视化好，易于分析 | 抓取时间有限 |
| **Perfetto** | 高级跟踪 | 功能强大，SQL 查询 | 学习曲线较陡 |
| **dumpsys** | 系统服务状态 | 信息全面 | 输出信息量巨大 |

---

## 附录 B: 常见问题排查清单

### 启动问题

- [ ] 检查串口日志，确认 Bootloader 是否正常
- [ ] 检查内核日志 `dmesg`，是否有驱动加载失败
- [ ] 检查 `logcat -b events | grep boot_progress`
- [ ] 检查 `/data/anr/` 是否有 ANR traces

### 死机/重启

- [ ] 检查 `/data/tombstones/` 是否有 Native crash
- [ ] 检查 `adb logcat -b crash` 是否有 Java crash
- [ ] 检查 `/sys/fs/pstore/` 是否有内核 panic
- [ ] 检查 Watchdog 超时日志

### 性能问题

- [ ] 使用 Systrace/Perfetto 分析性能瓶颈
- [ ] 检查 CPU 使用率 `top -d 1`
- [ ] 检查内存使用 `dumpsys meminfo`
- [ ] 检查 IO 等待 `iostat`

### 显示问题

- [ ] 检查 HDMI 连接 `dmesg | grep hdmi`
- [ ] 检查 SurfaceFlinger `dumpsys SurfaceFlinger`
- [ ] 检查帧率 `dumpsys gfxinfo`

---

## 参考资料

- [Android Debug Bridge (ADB)](https://developer.android.com/studio/command-line/adb)
- [Perfetto 文档](https://perfetto.dev/docs/)
- [Linux Kernel printk](https://www.kernel.org/doc/html/latest/core-api/printk-basics.html)
- [Android 系统启动流程分析](../03-android-system/ANDROID_BOOT_PROCESS.md)
