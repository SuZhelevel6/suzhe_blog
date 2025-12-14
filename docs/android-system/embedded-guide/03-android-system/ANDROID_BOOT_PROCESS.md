# Android 系统启动流程分析文档

本文档基于 Amlogic S905X5M (ross) 平台的实际启动日志，详细分析 Android 14 系统从上电到完全启动的完整流程。

---

## 目录

- [启动流程概览](#启动流程概览)
- [1. Bootloader 与 U-Boot](#1-bootloader-与-u-boot)
- [2. Linux 内核启动](#2-linux-内核启动)
- [3. Init 进程启动](#3-init-进程启动)
- [4. Zygote 进程启动](#4-zygote-进程启动)
- [5. SystemServer 进程启动](#5-systemserver-进程启动)
- [6. Launcher 启动](#6-launcher-启动)
- [启动时间线总结](#启动时间线总结)
- [关键代码路径](#关键代码路径)

---

## 启动流程概览

Android 系统启动是一个多阶段的过程，整体流程如下：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              电源上电 (Power On)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Bootloader 与 U-Boot                                                     │
│  ┌─────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐            │
│  │ BL1 │ → │ BL2  │ → │ BL2E │ → │ BL2X │ → │ BL31 │ → │ BL32 │            │
│  │(ROM)│   │(DDR) │   │      │   │      │   │(ATF) │   │(TEE) │            │
│  └─────┘   └──────┘   └──────┘   └──────┘   └──────┘   └──────┘            │
│                                                              │               │
│                                                              ▼               │
│                                                         ┌──────┐            │
│                                                         │ BL33 │            │
│                                                         │U-Boot│            │
│                                                         └──────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. Linux 内核启动                                                           │
│  - 内核解压和初始化                                                           │
│  - CPU/内存/中断初始化                                                        │
│  - 设备驱动加载                                                               │
│  - 启动 init 进程 (PID 1)                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. Init 进程启动                                                            │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐              │
│  │ First Stage    │ → │ Second Stage   │ → │ 解析 init.rc   │              │
│  │ - 挂载分区     │   │ - SELinux      │   │ - 启动服务     │              │
│  │ - 加载驱动     │   │ - 属性服务     │   │ - 启动 Zygote  │              │
│  └────────────────┘   └────────────────┘   └────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. Zygote 进程启动                                                          │
│  - 创建 Java 虚拟机 (ART)                                                    │
│  - 预加载 Java 类和资源                                                       │
│  - 创建 Socket 监听应用启动请求                                               │
│  - Fork 出 SystemServer 进程                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. SystemServer 进程启动                                                    │
│  - 启动 Binder 线程池                                                        │
│  - 创建 SystemServiceManager                                                 │
│  - 启动引导服务 (AMS, PMS, WMS...)                                           │
│  - 启动核心服务和其他服务                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  6. Launcher 启动                                                            │
│  - AMS 启动 Home Activity                                                    │
│  - Launcher 进程由 Zygote fork                                               │
│  - 加载桌面图标和小部件                                                       │
│  - 发送 BOOT_COMPLETED 广播                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Bootloader 与 U-Boot

### 1.1 启动链概述

Amlogic 平台采用 ARM Trusted Firmware (ATF) 架构，Bootloader 启动链如下：

| 组件 | 全称 | 运行级别 | 存储位置 | 功能描述 |
|------|------|---------|---------|----------|
| BL1 | Boot ROM | EL3 | 芯片 ROM | 固化代码，加载 BL2 |
| BL2 | Secondary Boot Loader | EL3 | eMMC Boot | DDR 初始化 |
| BL2E | BL2 Extension | EL3 | eMMC Boot | 厂商扩展 |
| BL2X | BL2 eXtended | EL3 | eMMC Boot | 安全初始化 |
| BL31 | EL3 Runtime Firmware | EL3 | FIP | ATF 运行时 |
| BL32 | Secure OS (OP-TEE) | S-EL1 | FIP | 可信执行环境 |
| BL33 | Non-secure Bootloader | EL2/EL1 | FIP | U-Boot |

### 1.2 BL2 阶段 - DDR 初始化

**时间戳**: TE: 144389 μs (~144ms)

```
日志摘录：
BL2 1.1.1 Built : 17:35:28, Oct 10 2025. s7d bl-3.5.16
DDR_DRIVER_VERSION: AML_LP5_PHY_S7_V_0_45
dram_type==LPDDR4
config==r0_32bit_ch0
DDR : 2048MB @1320MHz
```

**主要工作：**

1. **早期硬件初始化**
   ```
   set ee_vol 0.74v # 设置 CPU 电压
   fix_pll is 2000 MHz. Locked # 锁定系统 PLL
   sys0_pll is 2508 MHz. Locked # 系统时钟
   ```

2. **DDR 内存初始化**
   - 检测内存类型: LPDDR4
   - 配置内存控制器
   - 内存训练和校准
   - 最终配置: 2048MB @ 1320MHz

3. **存储设备检测**
   ```
   boot_device:00000001 # eMMC 启动
   boot_seq:00000001
   boot_bakups:00000003 # 3 份备份
   ```

4. **加载后续 Bootloader**
   ```
   Load: BL2E From: eMMC - 3.1 src: 00002000, size: 00019000
   Load: BL2X From: eMMC - 3.1 src: 00000000, size: 00019000
   ```

### 1.3 BL2E/BL2X 阶段 - 安全初始化

**BL2E 时间戳**: TE: 489535 μs (~490ms)
**BL2X 时间戳**: TE: 584694 μs (~585ms)

```
日志摘录：
BL2E 1.0.0 Built : 18:44:03, Oct 10 2025
eMMC boot @ 1
sw-hs2 s                              # eMMC 高速模式

BL2X 1.1.0 Built : 17:15:05, Jul 23 2025
Loading secpu fw                      # 加载安全 CPU 固件
derive RSPK OK                        # 密钥派生
derive PCPK OK
```

**主要工作：**
- eMMC 切换到 HS200/HS400 高速模式
- 加载 FIP (Firmware Image Package)
- 安全密钥派生和验证
- 加载安全 CPU 固件

### 1.4 BL31 阶段 - ARM Trusted Firmware

```
日志摘录：
NOTICE:  BL31: v2.7.2(release):v2.7.0-441-gf06b1f5a6
NOTICE:  BL31: Built : 14:54:58, Oct 15 2025
NOTICE:  BL31: start aocpu
Starting AOCPU FreeRTOS
AOCPU image version='2025-12-08 09:49:24'
```

**主要工作：**

1. **EL3 运行时服务**
   - 提供 SMC (Secure Monitor Call) 接口
   - 处理安全/非安全世界切换

2. **启动 AOCPU (Always-On CPU)**
   - 运行 FreeRTOS 实时操作系统
   - 负责低功耗管理、遥控器唤醒、CEC 控制

3. **解压并加载 BL32/BL33**
   ```
   NOTICE: decomp BL32 is Success
   NOTICE: decomp BL33 is Success
   ```

### 1.5 BL32 阶段 - OP-TEE (可信执行环境)

```
日志摘录：
E/TC:0 00 INFO:    BL3-2: ATOS-V3.18.4-143eb82a7
E/TC:0 00 INFO:    BL3-2: Chip: S7D Rev: B (47:B - 0:1)
E/TC:0 00 INFO:    BL3-2: Secure Timer Initialized.
```

**主要工作：**
- 初始化可信执行环境
- 提供安全服务：Keymaster、Widevine DRM、安全存储
- 管理 RPMB (Replay Protected Memory Block) 访问

### 1.6 BL33 阶段 - U-Boot

**时间戳**: TE: 782431 μs (~782ms) 进入 U-Boot
**结束时间**: uboot time: 2156747 μs (~2.16s)

```
日志摘录：
U-Boot 2023.01 bl-3.5.15 (Dec 08 2025 - 09:49:10 +0800)
DRAM:  2 GiB
emmc init success!
```

#### 1.6.1 硬件初始化

```
board init                          # 板级初始化
gpio: pin GPIOH_7 (gpio 43) value is 1
[meson_mmc_probe]emmc: Controller probe success!
Net: eth0: ethernet@ff3f0000        # 以太网初始化
```

#### 1.6.2 显示初始化

```
vpu: vpu_power_on_new               # VPU 上电
vpu: set clk: 666667000Hz           # VPU 时钟 666MHz
[VOUT] match: W=1920, H=1080, P     # 输出 1080p
[OSD] fb_addr for logo: 0x1f800000  # Logo 显示
set hdmitx VIC = 16                 # HDMI 1080p60hz
```

#### 1.6.3 AVB 验证 (Android Verified Boot)

```
avb2: 1
active_slot is _a                   # A/B 分区，当前 slot A
AVB2 verify with default kpub:520
avb verification: locked = 1, result = 0   # 验证通过
```

#### 1.6.4 加载 Kernel

```
## Booting Android Image at 0x03000000 ...
Kernel command line: bootconfig androidboot.selinux=permissive
   Uncompressing Kernel Image
   kernel loaded at 0x01800000, end = 0x0416aa00
   Loading Ramdisk to 1e93b000, end 1f7ff921 ... OK
   Loading Device Tree to 1e923000 ... OK
Starting kernel ...
uboot time: 2156747 us
```

**加载内容：**
| 内容 | 加载地址 | 说明 |
|------|---------|------|
| Kernel Image | 0x01800000 | LZ4 压缩，解压后约 40MB |
| Ramdisk | 0x1e93b000 | init_boot.img 中的 ramdisk |
| Device Tree | 0x1e923000 | DTB 设备树 |

---

## 2. Linux 内核启动

### 2.1 内核版本信息

```
日志摘录：
[    0.000000] Linux version 5.15.170-android14-11-g3efc8295014d-ab12916019
[    0.000000] Machine model: s7d_s905x5m_bm201
```

- **内核版本**: 5.15.170 (Android GKI 内核)
- **Android 版本**: Android 14
- **机器型号**: s7d_s905x5m_bm201

### 2.2 早期初始化 (0.000s - 0.005s)

#### 2.2.1 CPU 初始化

```
[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x412fd050]
[    0.000000] Detected VIPT I-cache on CPU0
[    0.003384] smp: Bringing up secondary CPUs ...
[    0.004022] CPU1: Booted secondary processor 0x0000000100
[    0.004645] CPU2: Booted secondary processor 0x0000000200
[    0.005258] CPU3: Booted secondary processor 0x0000000300
[    0.005319] smp: Brought up 1 node, 4 CPUs
[    0.005342] CPU features: detected: 32-bit EL0 Support
```

**CPU 信息：**
- 4 核 ARM Cortex-A55 (ID: 0x412fd050)
- 支持 32 位兼容模式
- 支持 LSE 原子指令、CRC32、RAS 扩展

#### 2.2.2 内存初始化

```
[    0.000000] Memory: 1405532K/2097152K available
[    0.000000] Zone ranges:
[    0.000000]   DMA32    [mem 0x0000000000000000-0x000000007fffffff]
[    0.000000]   Normal   empty
```

**内存布局 (Reserved Memory)：**

| 区域名称 | 地址范围 | 大小 | 用途 |
|---------|---------|------|------|
| linux,secure_vdec | 0x7f000000-0x7fffffff | 16 MB | 安全视频解码 |
| linux,vdin1_cma | 0x7e800000-0x7effffff | 8 MB | 视频输入 |
| heap-gfx | 0x79000000-0x7e7fffff | 88 MB | 图形堆 |
| heap-fb | 0x75800000-0x78ffffff | 56 MB | Framebuffer |
| linux,codec_mm_cma | 0x5ec00000-0x757fffff | 364 MB | 编解码 CMA |
| linux,meson-fb | 0x1f800000-0x1fffffff | 8 MB | OSD Framebuffer |
| linux,secmon | 0x05000000-0x06bfffff | 28 MB | 安全监控 |
| ramoops | 0x06c00000-0x06cfffff | 1 MB | 内核崩溃日志 |

### 2.3 子系统初始化 (0.060s - 0.200s)

```
[    0.067735] pinctrl core: initialized pinctrl subsystem
[    0.068451] NET: Registered PF_NETLINK/PF_ROUTE protocol family
[    0.070000] thermal_sys: Registered thermal governor 'step_wise'
[    0.095855] SCSI subsystem initialized
[    0.095952] usbcore: registered new interface driver usbfs
[    0.096072] mc: Linux media interface: v0.10
[    0.096087] videodev: Linux video capture interface: v2.00
[    0.097130] Advanced Linux Sound Architecture Driver Initialized.
```

### 2.4 设备驱动加载 (0.200s - 1.0s)

内核通过 Device Tree 探测并加载各种驱动：

| 时间 (s) | 驱动模块 | 设备节点 | 说明 |
|----------|---------|---------|------|
| 0.250 | amlogic-uart | ttyS0 | 串口驱动 |
| 0.563 | meson-gpio | - | GPIO 控制器 |
| 0.581 | cpufreq | cpu0-3 | CPU 频率调节 |
| 0.588 | meson-tsensor | - | 温度传感器 |
| 0.619 | meson-mmc | mmc0 | eMMC 控制器 (CQHCI) |
| 0.683 | optee | - | OP-TEE 驱动 |
| 0.707 | gpio_keypad | input0 | 按键输入 |
| 0.710 | ir_keypad | input2-4 | 红外遥控器 |
| 0.713 | meson-gxbb-wdt | - | 看门狗 |
| 0.719 | aml_dvb | - | DVB 数字电视 |
| 0.890 | vout | - | 视频输出 |
| 0.915 | amhdmitx | - | HDMI 发送器 |
| 0.956 | mmc0 | mmcblk0 | eMMC HS400 模式 |

### 2.5 启动 Init 进程

```
[    0.216568] Freeing initrd memory: 15120K
[    0.217703] Freeing unused kernel memory: 5440K
[    0.217798] Run /init as init process
```

内核完成初始化后，执行 ramdisk 中的 `/init` 程序，这是 Android 的第一个用户空间进程 (PID 1)。

---

## 3. Init 进程启动

### 3.1 Init 进程概述

Init 进程是 Android 系统的第一个用户空间进程，职责包括：

1. 挂载文件系统 (/system, /vendor, /data 等)
2. 加载内核模块
3. 初始化 SELinux
4. 启动属性服务 (property service)
5. 解析并执行 init.rc 脚本
6. 启动各种守护进程和服务

### 3.2 First Stage Init (0.22s - 4.4s)

First Stage 在 ramdisk 中运行，主要任务是准备根文件系统。

```
日志摘录：
[    0.219564] init: init first stage started!
[    0.221455] init: Loading module /lib/modules/amlogic-gkitool.ko with args ''
[    0.248294] init: Loaded kernel module /lib/modules/amlogic-gkitool.ko
```

#### 3.2.1 加载内核模块

```
init: Loading module /lib/modules/amlogic-gkitool.ko
init: Loading module /lib/modules/amlogic-debug-iotrace.ko
init: Loading module /lib/modules/amlogic-uart.ko
init: Loading module /lib/modules/amlogic-hwspinlock.ko
init: Loading module /lib/modules/amlogic-debug.ko
```

模块加载后的内核日志：
```
[    0.502044] [cpuinfo]: build info: gki_20 2025.12.08-01.55.26
[    0.504021] [cpuinfo]: serial = 470b010100000000253551c354371d80
[    0.528681] [memory-debug]: dmc version:1.10.2
```

#### 3.2.2 挂载分区

```
# 挂载 super 分区 (动态分区)
[    4.318997] F2FS-fs (dm-50): Using encoding defined by superblock: utf8-12.1.0
[    4.373030] F2FS-fs (dm-50): checkpoint: version = 49308dcd
[    4.373326] F2FS-fs (dm-50): Mounted with checkpoint version = 49308dcd
```

动态分区包含：
- system_a / system_b
- vendor_a / vendor_b
- product_a / product_b
- system_ext_a / system_ext_b
- odm_a / odm_b

#### 3.2.3 配置 ZRAM (压缩内存交换)

```
[    4.394218] zram0: detected capacity change from 0 to 1296032
[    4.414065] Adding 648012k swap on /dev/block/zram0.  Priority:-2
```

### 3.3 Second Stage Init (4.4s - 6.0s)

切换到真正的根文件系统后，执行 Second Stage Init。

#### 3.3.1 APEX 模块挂载

APEX (Android Pony EXpress) 是 Android 10+ 引入的模块化更新机制。

```
[    4.582604] apexd: Scanning /system/apex for pre-installed ApexFiles
[    4.583157] apexd: Found pre-installed APEX /system/apex/com.amlogic.mediaextractor.apex
[    4.584703] apexd: Found pre-installed APEX /system/apex/com.android.adbd.apex
[    4.585525] apexd: Found pre-installed APEX /system/apex/com.android.art.apex
[    4.590098] apexd: Found pre-installed APEX /system/apex/com.android.btservices.apex
[    4.591196] apexd: Found pre-installed APEX /system/apex/com.android.conscrypt.apex
```

挂载的 APEX 模块 (部分)：
| APEX 模块 | 功能 |
|-----------|------|
| com.android.art | Android Runtime (ART) |
| com.android.conscrypt | SSL/TLS 加密 |
| com.android.media | 媒体框架 |
| com.android.adbd | ADB 守护进程 |
| com.android.tethering | 网络共享 |
| com.amlogic.mediaextractor | Amlogic 媒体提取器 |

#### 3.3.2 解析 init.rc 文件

Init 进程解析以下 rc 文件：

```
/system/etc/init/hw/init.rc           # 主配置文件
/vendor/etc/init/hw/init.rc           # 厂商配置
/system/etc/init/*.rc                 # 系统服务
/vendor/etc/init/*.rc                 # 厂商服务
/odm/etc/init/*.rc                    # ODM 服务
```

#### 3.3.3 启动 Native 守护进程

| 服务名称 | 可执行文件 | 功能描述 |
|---------|-----------|----------|
| ueventd | /system/bin/ueventd | 设备节点管理 |
| logd | /system/bin/logd | 日志守护进程 |
| servicemanager | /system/bin/servicemanager | Binder 服务管理 |
| hwservicemanager | /system/bin/hwservicemanager | HIDL 服务管理 |
| vold | /system/bin/vold | 存储卷管理 |
| healthd | /system/bin/healthd | 电池健康监控 |
| surfaceflinger | /system/bin/surfaceflinger | 显示合成器 |
| **zygote** | /system/bin/app_process64 | **Java 进程孵化器** |

### 3.4 启动 Zygote

Init 通过 init.zygote64.rc (或 init.zygote64_32.rc) 启动 Zygote：

```rc
# /system/etc/init/hw/init.zygote64.rc
service zygote /system/bin/app_process64 -Xzygote /system/bin --zygote --start-system-server
    class main
    priority -20
    user root
    group root readproc reserved_disk
    socket zygote stream 660 root system
    socket usap_pool_primary stream 660 root system
    onrestart exec_background - system system -- /system/bin/vdc volume abort_fuse
    onrestart write /sys/power/state on
    onrestart restart audioserver
    onrestart restart cameraserver
    onrestart restart media
    onrestart restart netd
    onrestart restart wificond
    task_profiles ProcessCapacityHigh MaxPerformance
```

---

## 4. Zygote 进程启动

### 4.1 Zygote 概述

Zygote (受精卵) 是 Android 中所有 Java 应用进程的父进程。它的设计目的是：

1. **预加载共享资源** - 加载常用的 Java 类和系统资源，子进程通过 fork 共享这些资源
2. **快速启动应用** - 通过 fork 而非重新加载，大大加快应用启动速度
3. **内存共享** - fork 后的 COW (Copy-On-Write) 机制减少内存占用

### 4.2 Zygote 启动流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    app_process64 启动                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  AndroidRuntime::start()                                         │
│  - 启动 Java 虚拟机 (ART)                                        │
│  - 注册 JNI 函数                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ZygoteInit.main()                                               │
│  - 预加载类: preloadClasses()                                    │
│  - 预加载资源: preloadResources()                                │
│  - 预加载共享库: preloadSharedLibraries()                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  创建 ZygoteServer                                               │
│  - 创建 /dev/socket/zygote 监听                                  │
│  - 创建 /dev/socket/usap_pool_primary 监听                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  forkSystemServer()                                              │
│  - fork 出 SystemServer 进程                                     │
│  - 参数: --nice-name=system_server                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  runSelectLoop()                                                 │
│  - 进入循环，等待 AMS 的应用启动请求                              │
│  - 收到请求后 fork 新的应用进程                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 预加载内容

#### 4.3.1 预加载类 (preloadClasses)

Zygote 预加载约 6000+ 个常用 Java 类：

```java
// 部分预加载类列表 (/system/etc/preloaded-classes)
android.app.Activity
android.app.Application
android.content.Context
android.view.View
android.widget.TextView
android.graphics.Bitmap
java.lang.String
java.util.ArrayList
...
```

#### 4.3.2 预加载资源 (preloadResources)

```java
// 预加载系统资源
- Drawables (图片资源)
- Color State Lists (颜色状态)
- Animations (动画)
```

#### 4.3.3 预加载共享库

```java
// 预加载 Native 库
System.loadLibrary("android");
System.loadLibrary("jnigraphics");
System.loadLibrary("compiler_rt");
```

### 4.4 Socket 通信

Zygote 创建两个 Unix Domain Socket：

| Socket 路径 | 用途 |
|------------|------|
| /dev/socket/zygote | 接收 AMS 的应用启动请求 |
| /dev/socket/usap_pool_primary | USAP (Unspecialized App Process) 池 |

### 4.5 Fork SystemServer

Zygote 的第一个子进程是 SystemServer：

```java
// ZygoteInit.java
private static Runnable forkSystemServer(...) {
    String args[] = {
        "--setuid=1000",
        "--setgid=1000",
        "--setgroups=1001,1002,1003,...",
        "--capabilities=...",
        "--nice-name=system_server",
        "--runtime-args",
        "--target-sdk-version=34",
        "com.android.server.SystemServer",
    };

    int pid = Zygote.forkSystemServer(...);
    if (pid == 0) {
        // 子进程: SystemServer
        return handleSystemServerProcess(parsedArgs);
    }
    return null;
}
```

---

## 5. SystemServer 进程启动

### 5.1 SystemServer 概述

SystemServer 是 Android 系统的核心进程，运行所有核心系统服务。它由 Zygote fork 而来，是 Java 世界中最重要的进程。

### 5.2 启动流程

```
┌─────────────────────────────────────────────────────────────────┐
│  SystemServer.main()                                             │
│  └─ run()                                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  createSystemContext()                                           │
│  - 创建系统级 Context                                            │
│  - 设置默认主题                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  startBootstrapServices()    // 引导服务                         │
│  - Installer                                                     │
│  - ActivityManagerService (AMS)                                  │
│  - PowerManagerService                                           │
│  - PackageManagerService (PMS)                                   │
│  - UserManagerService                                            │
│  - SensorService                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  startCoreServices()         // 核心服务                         │
│  - BatteryService                                                │
│  - UsageStatsService                                             │
│  - WebViewUpdateService                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  startOtherServices()        // 其他服务                         │
│  - WindowManagerService (WMS)                                    │
│  - InputManagerService                                           │
│  - NetworkManagementService                                      │
│  - ConnectivityService                                           │
│  - AudioService                                                  │
│  - ... (100+ 服务)                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  AMS.systemReady()                                               │
│  - 启动 Launcher                                                 │
│  - 启动 persistent 应用                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 核心系统服务

#### 5.3.1 引导服务 (Bootstrap Services)

| 服务名称 | 功能描述 |
|---------|----------|
| **ActivityManagerService (AMS)** | Activity、Service、BroadcastReceiver 生命周期管理 |
| **PackageManagerService (PMS)** | 应用包安装、卸载、查询 |
| **PowerManagerService** | 电源管理、唤醒锁 |
| **DisplayManagerService** | 显示设备管理 |
| **UserManagerService** | 多用户管理 |
| **SensorService** | 传感器服务 (Native) |

#### 5.3.2 核心服务 (Core Services)

| 服务名称 | 功能描述 |
|---------|----------|
| **BatteryService** | 电池状态监控 |
| **UsageStatsService** | 应用使用统计 |
| **WebViewUpdateService** | WebView 更新 |
| **SchedulingPolicyService** | 调度策略 |

#### 5.3.3 其他服务 (Other Services)

| 服务名称 | 功能描述 |
|---------|----------|
| **WindowManagerService (WMS)** | 窗口管理、动画、输入事件分发 |
| **InputManagerService** | 输入设备管理 |
| **AudioService** | 音频管理 |
| **ConnectivityService** | 网络连接管理 |
| **WifiService** | WiFi 管理 |
| **BluetoothService** | 蓝牙管理 |
| **NotificationManagerService** | 通知管理 |
| **LocationManagerService** | 位置服务 |
| **CameraService** | 相机服务 (Native) |
| **MediaSessionService** | 媒体会话管理 |

### 5.4 服务启动日志

从启动日志中可以看到 HAL 服务的注册：

```
[   10.998925] servicemanager: Could not find android.hardware.power.stats.IPowerStats
[   11.003765] servicemanager: Found android.frameworks.stats.IStats/default
[   11.005043] servicemanager: Found android.hardware.memtrack.IMemtrack/default
[   11.166776] servicemanager: Found android.hardware.power.IPower/default
[   11.178539] servicemanager: Found android.hardware.light.ILights/default
[   12.305982] servicemanager: Found android.hardware.health.IHealth/default
[   16.092597] servicemanager: Found android.hardware.wifi.supplicant.ISupplicant/default
[   16.136247] servicemanager: Found android.hardware.wifi.IWifi/default
```

### 5.5 AMS.systemReady()

当所有系统服务启动完成后，AMS 调用 `systemReady()`：

```java
// ActivityManagerService.java
public void systemReady(final Runnable goingCallback, ...) {
    // 1. 启动 persistent 应用 (如系统 UI)
    startPersistentApps(PackageManager.MATCH_DIRECT_BOOT_AWARE);

    // 2. 启动 Home Activity (Launcher)
    startHomeActivityLocked(currentUserId, "systemReady");

    // 3. 发送 BOOT_COMPLETED 广播 (延迟发送)
    // ...
}
```

---

## 6. Launcher 启动

### 6.1 Launcher 概述

Launcher 是 Android 的桌面应用，也是用户交互的入口点。它是一个具有 `HOME` 类别的 Activity。

### 6.2 Launcher 启动流程

```
┌─────────────────────────────────────────────────────────────────┐
│  AMS.systemReady()                                               │
│  └─ startHomeActivityLocked()                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  RootWindowContainer.startHomeOnAllDisplays()                    │
│  - 查找 Home Activity (Intent.CATEGORY_HOME)                     │
│  - 通过 PMS 解析 Launcher 应用                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ActivityStarter.execute()                                       │
│  - 创建 ActivityRecord                                           │
│  - 请求 Zygote fork 新进程                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Zygote fork Launcher 进程                                       │
│  - 复制 Zygote 的内存空间                                        │
│  - 执行 ActivityThread.main()                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ActivityThread.main()                                           │
│  - 创建主线程 Looper                                             │
│  - 创建 Application                                              │
│  - attach 到 AMS                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Launcher Activity 启动                                          │
│  - onCreate() / onStart() / onResume()                           │
│  - 加载桌面图标和小部件                                           │
│  - 显示桌面                                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Boot Animation 结束                                             │
│  └─ WMS.enableScreenAfterBoot()                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  发送 BOOT_COMPLETED 广播                                        │
│  - sys.boot_completed = 1                                        │
│  - 应用可以接收 BOOT_COMPLETED 广播                               │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Home Intent

系统通过以下 Intent 查找 Launcher：

```java
Intent homeIntent = new Intent(Intent.ACTION_MAIN);
homeIntent.addCategory(Intent.CATEGORY_HOME);
homeIntent.addCategory(Intent.CATEGORY_DEFAULT);
```

### 6.4 Launcher 进程创建

Launcher 进程由 Zygote fork：

1. **AMS** 向 Zygote 发送启动请求
2. **Zygote** fork 新进程
3. 新进程执行 `ActivityThread.main()`
4. 创建 `Application` 和 `Activity`

### 6.5 开机动画结束

当 Launcher 首次绘制完成后：

```java
// WindowManagerService.java
void enableScreenAfterBoot() {
    // 结束开机动画
    performEnableScreen();
    // 通知 SurfaceFlinger 停止 bootanimation
}
```

### 6.6 Boot Completed

```
日志摘录：
[   17.614257] apexd: markBootCompleted() received by ApexService
[   17.819191] android.hardware.boot-service: sys.boot_completed: 1
```

**`sys.boot_completed=1`** 表示：

1. 系统启动完成
2. Launcher 已显示
3. 用户可以开始交互
4. 应用可以接收 `ACTION_BOOT_COMPLETED` 广播

---

## 启动时间线总结

### 各阶段耗时

| 阶段 | 开始时间 | 结束时间 | 耗时 |
|------|---------|---------|------|
| Bootloader (BL2-BL32) | 0 | 782 ms | 782 ms |
| U-Boot | 782 ms | 2,157 ms | 1,375 ms |
| **Bootloader 总计** | **0** | **2,157 ms** | **~2.2s** |
| Kernel 启动 | 0 s | 0.22 s | 220 ms |
| Init First Stage | 0.22 s | 4.4 s | 4,180 ms |
| Init Second Stage | 4.4 s | 6.0 s | 1,600 ms |
| **Kernel + Init 总计** | **0 s** | **6.0 s** | **~6.0s** |
| Zygote 启动 | ~6.0 s | ~7.0 s | ~1,000 ms |
| SystemServer 启动 | ~7.0 s | ~15.0 s | ~8,000 ms |
| Launcher 启动 | ~15.0 s | ~17.8 s | ~2,800 ms |
| **Boot Complete** | - | **17.8 s** | - |
| **总启动时间** | - | - | **~20 s** |

### 启动时间分布图

```
0s        5s        10s       15s       20s
|---------|---------|---------|---------|
[BL][UBT]                                    Bootloader (~2.2s)
     [====Kernel + Init====]                 内核 + Init (~6.0s)
                [Zygote]                     Zygote (~1.0s)
                  [====SystemServer====]    系统服务 (~8.0s)
                              [Launcher]    桌面启动 (~2.8s)
                                       [✓]  Boot Complete (17.8s)
```

---

## 关键代码路径

### Bootloader 代码

```
bootloader/uboot-repo/
├── bl2/                    # BL2 源码
├── bl30/                   # AOCPU 固件 (FreeRTOS)
├── bl31/                   # ARM Trusted Firmware
├── bl32/                   # OP-TEE
└── bl33/v2023/             # U-Boot 2023
    └── board/amlogic/s7d/  # 板级代码
```

### Kernel 代码

```
common/common14-5.15/
├── arch/arm64/boot/dts/amlogic/    # 设备树
├── drivers/amlogic/                 # Amlogic 驱动
└── include/linux/amlogic/           # 头文件
```

### Init 代码

```
system/core/init/
├── init.cpp                    # Init 主程序入口
├── first_stage_init.cpp        # First Stage
├── second_stage_resources.cpp  # Second Stage
├── service.cpp                 # 服务解析和管理
├── property_service.cpp        # 属性服务
├── action_parser.cpp           # rc 文件解析
└── builtins.cpp                # 内建命令

device/amlogic/ross/
├── init.amlogic.rc             # Amlogic init 配置
├── init.amlogic.board.rc       # 板级配置
└── ueventd.rc                  # 设备节点权限
```

### Zygote 代码

```
frameworks/base/core/
├── java/com/android/internal/os/
│   ├── ZygoteInit.java         # Zygote Java 入口
│   ├── Zygote.java             # fork 封装
│   ├── ZygoteServer.java       # Socket 服务
│   └── RuntimeInit.java        # 运行时初始化
└── jni/
    └── com_android_internal_os_Zygote.cpp  # Native fork

frameworks/base/cmds/app_process/
└── app_main.cpp                # app_process 入口
```

### SystemServer 代码

```
frameworks/base/services/
├── java/com/android/server/
│   ├── SystemServer.java       # 启动入口
│   ├── SystemServiceManager.java
│   ├── am/ActivityManagerService.java
│   ├── wm/WindowManagerService.java
│   └── pm/PackageManagerService.java
└── core/java/com/android/server/
```

### Launcher 代码

```
packages/apps/Launcher3/         # AOSP Launcher
packages/apps/TvLauncher/        # Android TV Launcher
vendor/amlogic/apps/Launcher/    # Amlogic 定制 Launcher
```

---

## 附录：常用调试命令

### 查看启动时间

```bash
# 内核启动日志
adb shell dmesg | grep -E "^\[.*\]"

# Android 启动事件
adb logcat -b events | grep boot

# 查看启动属性
adb shell getprop | grep boot

# 查看 Zygote/SystemServer 进程
adb shell ps -A | grep -E "zygote|system_server"
```

### Bootchart 分析

```bash
# 启用 bootchart (userdebug 版本)
adb shell 'touch /data/bootchart/enabled'
adb reboot

# 收集数据后使用 bootchart 工具分析
```

### Systrace 分析

```bash
python systrace.py -o boot_trace.html \
    sched freq idle am wm view \
    --boot
```

---
