# Bootloader 与 U-Boot 开发指南

本文档面向开发者，详细介绍 Amlogic S905X5M (S7D) 平台的 Bootloader 架构、代码结构、关键文件和修改点。

---

## 目录

1. [Bootloader 架构概述](#1-bootloader-架构概述)
2. [代码仓库结构](#2-代码仓库结构)
3. [BL2/BL2E/BL2X 阶段](#3-bl2bl2ebl2x-阶段)
4. [BL30 (AOCPU) 固件](#4-bl30-aocpu-固件)
5. [BL31 (ATF) 固件](#5-bl31-atf-固件)
6. [BL32 (OP-TEE) 固件](#6-bl32-op-tee-固件)
7. [BL33 (U-Boot) 详解](#7-bl33-u-boot-详解)
8. [FIP 打包流程](#8-fip-打包流程)
9. [EMMC 及分区配置](#9-emmc-及分区配置)
10. [关键修改点](#10-关键修改点)
11. [构建命令参考](#11-构建命令参考)
12. [启动模式判断与烧录模式](#12-启动模式判断与烧录模式)
13. [U-Boot 命令行命令参考](#13-u-boot-命令行命令参考)

---

## 1. Bootloader 架构概述

Amlogic S7D 平台采用 ARM Trusted Firmware (ATF) 启动架构，启动链如下：

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────────┐    ┌─────────┐    ┌─────────┐
│  BL1    │───▶│  BL2    │───▶│  BL2E   │───▶│  BL2X     │───▶│  BL31   │───▶│  BL33   │
│ (ROM)   │    │ (SRAM)  │    │ (DDR初始化)  │ (安全扩展)│    │ (ATF)   │    │(U-Boot) │
└─────────┘    └─────────┘    └─────────┘    └───────────┘    │    │    │    └────┼────┘
                                                              ├────┼────┤         │
                                                              │BL30│BL32│         │
                                                              │AOCPU│TEE│         │
                                                              └────┴────┘         │
                                                                                  ▼
                                                                             Linux Kernel
```

### 各阶段职责

| 阶段 | 全称 | 运行环境 | 主要职责 |
|------|------|----------|----------|
| BL1 | Boot ROM | 片上 ROM | 加载验证 BL2 |
| BL2 | Second Bootloader | SRAM | 初始化安全环境，加载 BL2E |
| BL2E | BL2 Extension | SRAM | DDR 初始化，加载 BL2X |
| BL2X | BL2 eXtended | DDR | 安全扩展，加载后续固件 |
| BL30 | AOCPU Firmware | AOCPU | 电源管理、待机唤醒 |
| BL31 | ARM Trusted Firmware | EL3 | 安全监控、PSCI 服务 |
| BL32 | OP-TEE | Secure EL1 | 可信执行环境 |
| BL33 | U-Boot | Non-secure EL1 | 引导加载器 |

---

## 2. 代码仓库结构

```
bootloader/uboot-repo/
├── bl2/                        # BL2 二进制文件 (预编译)
│   └── bin/                    # 各SoC平台BL2
│       └── s7d/                # S7D平台BL2二进制
├── bl30/                       # BL30 (AOCPU) 固件
│   ├── rtos_sdk/               # FreeRTOS SDK (不常修改)
│   └── src_ao/                 # AOCPU源代码
│       └── demos/amlogic/n200/s7d/  # S7D平台代码
├── bl31/                       # BL31 (ATF) 固件
│   ├── bl31_1.3/               # ATF v1.3 (旧平台)
│   └── bl31_2.7/               # ATF v2.7 (S7D使用)
│       └── src/                # ATF源代码
│           └── plat/amlogic/s7d/  # S7D平台实现
├── bl32/                       # BL32 (OP-TEE) 固件
│   ├── bl32_3.8/               # OP-TEE v3.8
│   └── bl32_3.18/              # OP-TEE v3.18 (S7D使用)
│       └── src/                # OP-TEE源代码
├── bl33/                       # BL33 (U-Boot)
│   └── v2023/                  # U-Boot 2023
├── fip/                        # FIP打包工具和脚本
│   ├── s7d/                    # S7D专用打包
│   ├── mk_script.sh            # 主构建脚本
│   └── build_bl*.sh            # 各BL构建脚本
└── mk                          # 构建入口脚本
```

---

## 3. BL2/BL2E/BL2X 阶段

### 3.1 代码位置

BL2/BL2E/BL2X 通常使用预编译二进制文件，位于：

```
bootloader/uboot-repo/bl2/bin/s7d/
```

### 3.2 关键文件

| 文件 | 说明 |
|------|------|
| `bl2.bin.sto` | Storage 启动模式 BL2 |
| `bl2.bin.usb` | USB 启动模式 BL2 |
| `bl2e.bin.sto` | Storage 启动模式 BL2E |
| `bl2e.bin.usb` | USB 启动模式 BL2E |
| `bl2x.bin` | BL2X (通用) |

### 3.3 ACS 参数

DDR 时序参数在以下文件定义：

```
bootloader/uboot-repo/bl33/v2023/board/amlogic/s7d_bm201/firmware/timing.c
```

此文件包含：
- DDR 频率配置
- 时序参数 (tRCD, tRP, tRAS 等)
- PHY 训练参数

### 3.4 DDR 详细配置

#### 3.4.1 DDR 参数选择

在 `timing.c` 中通过宏定义选择 DDR 参数：

```c
#define S4_LPDDR4 1                    // 1rank LPDDR4
#define S4_LPDDR4_DONGLE_LAYER_4 1     // 4层板 LPDDR4
//#define S4_LPDDR4_DONGLE_LAYER_6 1   // 6层板 LPDDR4
//#define S4_LPDDR4_2RANK 1            // 2rank LPDDR4
#define S4_DDR4_2RANK 1                // 2rank DDR4
//#define S4_DDR4_1RANK 1              // 1rank DDR4
//#define S4_DDR3  1                   // DDR3
```

结构体 `__ddr_setting[]` 包含多套参数，启动时轮询尝试。

#### 3.4.2 DDR 类型配置

```c
// timing.c
.cfg_board_common_setting.DramType = CONFIG_DDR_TYPE_DDR4
```

类型定义 (`arch/arm/include/asm/arch-s4/ddr_define.h`)：

| 宏定义 | 值 | 类型 |
|--------|---|------|
| `CONFIG_DDR_TYPE_DDR3` | 0 | DDR3 |
| `CONFIG_DDR_TYPE_DDR4` | 1 | DDR4 |
| `CONFIG_DDR_TYPE_LPDDR4` | 2 | LPDDR4 |
| `CONFIG_DDR_TYPE_LPDDR3` | 3 | LPDDR3 |
| `CONFIG_DDR_TYPE_LPDDR2` | 4 | LPDDR2 |
| `CONFIG_DDR_TYPE_LPDDR4X` | 5 | LPDDR4X |

#### 3.4.3 DDR Rank 配置

```c
.cfg_board_common_setting.dram_rank_config = CONFIG_DDR0_32BIT_RANK0_CH0
```

| dram_rank_config | 说明 | DDR3 | DDR4 | LPDDR3 | LPDDR4 |
|------------------|------|------|------|--------|--------|
| `CONFIG_DDR0_16BIT_CH0` | 16bit 单 CS | √ | √ | √ | |
| `CONFIG_DDR0_16BIT_RANK01_CH0` | 16bit 双 CS | √ | √ | √ | |
| `CONFIG_DDR0_32BIT_RANK0_CH0` | 32bit 单 CS | √ | √ | √ | √ |
| `CONFIG_DDR0_32BIT_RANK01_CH0` | 32bit 双 CS | √ | √ | √ | √ |
| `CONFIG_DDR0_32BIT_RANK0_CH01` | LPDDR4 单 CS 双通道 | | | | √ |
| `CONFIG_DDR0_32BIT_RANK01_CH01` | LPDDR4 双 CS 双通道 | | | | √ |

#### 3.4.4 DDR 频率配置

```c
.cfg_board_SI_setting_ps[0].DRAMFreq = 1176   // 常用: 667/672/792/1176/1320 MHz
```

#### 3.4.5 DDR 容量配置

```c
.cfg_board_common_setting.dram_cs0_size_MB = CONFIG_DDR0_SIZE_1024MB,
.cfg_board_common_setting.dram_cs1_size_MB = CONFIG_DDR1_SIZE_1024MB,
```

容量宏定义：`CONFIG_DDR0_SIZE_128MB` ~ `CONFIG_DDR0_SIZE_4096MB`，`CONFIG_DDR0_SIZE_AUTO_SIZE` (0xffff) 自动检测。

#### 3.4.6 Kernel DDR 容量配置

在 DTS 中配置 `memory` 节点：

```dts
// arch/arm64/boot/dts/amlogic/xxx.dts
memory {
    reg = <0x0 0x0 0x0 0x40000000>;  // 1GB: 0x40000000
                                      // 2GB: 0x80000000
                                      // 4GB: 0xF0000000 (3840M，总线限制)
};
```

#### 3.4.7 DDR 调试命令

**U-Boot 命令**：
```bash
g12_d2pll 1176              # 动态设置DDR频率(单次生效)
```

**Kernel 命令**：
```bash
cat /sys/class/aml_ddr/freq  # DDR实际频率 = (freq * 2) MHz
free -m                      # 显示系统内存
```

---

## 4. BL30 (AOCPU) 固件

### 4.1 代码位置

```
bootloader/uboot-repo/bl30/src_ao/
```

### 4.2 主要职责

- 系统待机/唤醒管理
- 低功耗状态控制
- IR 遥控器处理
- 看门狗管理
- GPIO 电平维护

### 4.3 关键修改点

#### 遥控器唤醒键值配置

在板级头文件中定义唤醒键值：

```c
// board/amlogic/configs/s7d_bm201.h
#define AML_IR_REMOTE_POWER_UP_KEY_VAL1 0xef10fe01  // 电源键
#define AML_IR_REMOTE_POWER_UP_KEY_VAL2 0XBB44FB04  // CH+
#define AML_IR_REMOTE_POWER_UP_KEY_VAL3 0xF20DFE01  // CH-
```

---

## 5. BL31 (ATF) 固件

### 5.1 代码位置

S7D 平台使用 ATF v2.7：

```
bootloader/uboot-repo/bl31/bl31_2.7/src/
```

### 5.2 目录结构

```
bl31_2.7/src/
├── plat/amlogic/
│   ├── s7d/                    # S7D平台实现
│   │   ├── platform.mk         # 平台Makefile
│   │   ├── s7d_def.h           # 平台定义
│   │   ├── s7d_pm.c            # 电源管理
│   │   └── s7d_bl31_setup.c    # BL31初始化
│   └── common/                 # Amlogic通用代码
│       ├── aml_sip_svc.c       # SIP服务
│       └── aml_mhu.c           # 核间通信
└── services/
    └── spd/opteed/             # OP-TEE调度器
```

### 5.3 主要功能

- PSCI (Power State Coordination Interface) 服务
- SMC (Secure Monitor Call) 处理
- 安全状态切换
- BL32 调度

---

## 6. BL32 (OP-TEE) 固件

### 6.1 代码位置

S7D 平台使用 OP-TEE v3.18：

```
bootloader/uboot-repo/bl32/bl32_3.18/src/
```

### 6.2 主要功能

- 可信执行环境 (TEE)
- 安全存储 (RPMB)
- 密钥管理
- DRM 解密

### 6.3 配置开关

在板级 defconfig 中启用：

```
# configs/amlogic/s7d_bm201_defconfig
CONFIG_TEE=y
CONFIG_OPTEE=y
```

---

## 7. BL33 (U-Boot) 详解

### 7.1 代码位置

```
bootloader/uboot-repo/bl33/v2023/
```

### 7.2 目录结构

```
bl33/v2023/
├── arch/arm/
│   ├── dts/amlogic/            # 设备树源文件
│   │   ├── meson-s7d-bm201.dts # S7D BM201主DTS
│   │   └── meson-s7d-bm201.dtsi # S7D BM201包含文件
│   └── mach-meson/             # Meson平台架构代码
│       ├── board-common.c      # 通用板级代码
│       └── s7d/                # S7D特定代码
│           └── core.c          # CPU核心映射
├── board/amlogic/
│   ├── s7d_bm201/              # S7D BM201板级目录 [重要]
│   │   ├── s7d_bm201.c         # 主板级代码
│   │   ├── Makefile            # 构建文件
│   │   └── firmware/           # 固件配置
│   │       └── timing.c        # DDR时序
│   ├── configs/
│   │   └── s7d_bm201.h         # 板级头文件配置
│   └── env/
│       └── android_ott.env     # 环境变量定义
├── configs/amlogic/
│   └── s7d_bm201_defconfig     # 内核配置
├── cmd/amlogic/                # Amlogic自定义命令
│   ├── cmd_bootctl_vab.c       # VAB启动控制
│   └── cmd_imgread.c           # 镜像读取
├── drivers/amlogic/            # Amlogic驱动
│   ├── media/                  # 媒体相关
│   ├── mmc/                    # eMMC驱动
│   └── usb/                    # USB驱动
└── include/amlogic/            # Amlogic头文件
```

### 7.3 关键文件详解

#### 7.3.1 板级主文件 `s7d_bm201.c`

**路径**: `bl33/v2023/board/amlogic/s7d_bm201/s7d_bm201.c`

**重要函数**:

| 函数 | 行号 | 说明 |
|------|------|------|
| `dram_init()` | 62-66 | 获取 DDR 大小 |
| `board_init()` | 160-210 | 板级初始化入口 |
| `board_late_init()` | 212-236 | 后期初始化 |
| `mach_cpu_init()` | 250-254 | CPU 初始化 |
| `checkhw()` | 397-425 | **DTB 选择函数 (关键)** |
| `get_effective_memsize()` | 238-248 | 获取有效内存大小 |

**`board_init()` 函数流程**:

```c
int board_init(void)
{
    // 1. HDMI初始化
    hdmitx21_chip_type_init(MESON_CPU_ID_S7D);
    hdmitx21_init();

    // 2. 启动序列设置
    aml_set_bootsequence(0);

    // 3. USB烧录检测
    aml_v3_factory_usb_burning(0, gd->bd);

    // 4. GPIO初始化
    run_command("gpio set GPIOH_7", 0);
    run_command("gpio set GPIOC_4", 1);  // Tuner AMP控制

    // 5. 音频初始化
    earcrx_init(EARC_RX_ANA_V3);

    // 6. Pinctrl激活
    pinctrl_devices_active(PIN_CONTROLLER_NUM);

    return 0;
}
```

**`board_late_init()` 函数流程**:

```c
int board_late_init(void)
{
    // 1. 设置默认环境参数
    env_set("defenv_para", "-c");
    aml_board_late_init_front(NULL);

    // 2. 获取重启标志
    get_stick_reboot_flag_mbx();

    // 3. VPU/VPP初始化
    vpu_probe();
    vpp_init();
    cvbs_init();

    // 4. USB状态检测
    set_usb_status();

    // 5. 后期初始化收尾
    aml_board_late_init_tail(NULL);

    return 0;
}
```

#### 7.3.2 DTB 选择函数 `checkhw()` (关键修改点)

**路径**: `bl33/v2023/board/amlogic/s7d_bm201/s7d_bm201.c:397-425`

此函数根据实际 DDR 大小选择对应的设备树:

```c
#ifdef CONFIG_MULTI_DTB
int checkhw(char *name)
{
    char dtb_name[64] = { 0 };
    phys_size_t ddr_size = get_effective_memsize();

#if defined(CONFIG_SYS_MEM_TOP_HIDE)
    ddr_size += CONFIG_SYS_MEM_TOP_HIDE;
#endif

    switch (ddr_size) {
    case 0x40000000UL:  // 1GB DDR
        strcpy(dtb_name, "s7d_s905x5m_bm201-1g\0");
        break;
    case 0x80000000UL:  // 2GB DDR
        strcpy(dtb_name, "s7d_s905x5m_bm201\0");
        break;
    case 0xF0000000UL:  // 4GB DDR (实际可用3.75GB)
        strcpy(dtb_name, "s7d_s905x5m_bm201-4g\0");
        break;
    default:
        strcpy(dtb_name, "s7d_s905x5m_bm201\0");
        break;
    }

    strcpy(name, dtb_name);
    env_set("aml_dt", dtb_name);
    return 0;
}
#endif
```

**修改说明**:
- 如果硬件有多种 DDR 配置，可以在此函数中添加对应的 case
- DTB 名称必须与 `arch/arm/dts/amlogic/` 目录下的 DTS 文件名匹配
- `aml_dt` 环境变量将被传递给内核选择正确的 DTB

#### 7.3.3 板级配置头文件 `s7d_bm201.h`

**路径**: `bl33/v2023/board/amlogic/configs/s7d_bm201.h`

**重要配置项**:

```c
// 电源电压配置
#define AML_VCCK_INIT_VOLTAGE     959   // CPU核心电压 (mV)
#define AML_VDDEE_INIT_VOLTAGE    800   // EE域电压 (mV)

// 串口配置
#define CONFIG_CONS_INDEX         2     // 使用UART_A

// IR遥控唤醒键值
#define AML_IR_REMOTE_POWER_UP_KEY_VAL1 0xef10fe01

// AVB配置
#define CONFIG_AML_AVB2_ANTIROLLBACK 1
#define CONFIG_AVB_VERIFY 1
#define CONFIG_SUPPORT_EMMC_RPMB 1

// 环境变量
#define CONFIG_EXTRA_ENV_SETTINGS \
    "outputmode=1080p60hz\0" \
    "hdmimode=none\0" \
    "board=ross\0" \
    ...

// 预启动命令
#define CONFIG_PREBOOT  \
    "run bcb_cmd; " \
    "run upgrade_check;" \
    "run init_display;" \
    "run storeargs;" \
    "run upgrade_key;" \
    "bcb uboot-command;" \
    "run switch_bootmode;"

// 多DTB支持 (重要)
#define CONFIG_MULTI_DTB    1
```

#### 7.3.4 内核配置 defconfig

**路径**: `bl33/v2023/configs/amlogic/s7d_bm201_defconfig`

**关键配置**:

```kconfig
# 平台选择
CONFIG_ARM=y
CONFIG_ARCH_MESON=y
CONFIG_MESON_S7D=y
CONFIG_S7D_BM201=y

# 设备树
CONFIG_DEFAULT_DEVICE_TREE="meson-s7d-bm201"
CONFIG_OF_CONTROL=y
CONFIG_OF_EMBED=y

# 存储
CONFIG_AMLOGIC_EMMC=y
CONFIG_AML_STORAGE=y
CONFIG_CMD_MMC=y

# 安全相关
CONFIG_TEE=y
CONFIG_OPTEE=y
CONFIG_AML_SECURE_UBOOT=y

# USB
CONFIG_USB=y
CONFIG_USB_GADGET=y
CONFIG_USB_FUNCTION_FASTBOOT=y

# 显示
CONFIG_AML_VOUT=y
CONFIG_AML_OSD=y
CONFIG_AML_HDMITX21=y
CONFIG_AML_VPU=y

# 生产模式 (发布时设为y)
CONFIG_AML_PRODUCT_MODE=n
```

### 7.4 设备树文件

**主 DTS 文件**: `arch/arm/dts/amlogic/meson-s7d-bm201.dts`

```dts
/dts-v1/;

#include "amlogic/meson-s7d-bm201.dtsi"
#include "amlogic/meson-s7d_bm201-panel.dtsi"

/ {
    compatible =  "amlogic,s7d-txxx", "amlogic,meson-s7d";
    model = "Amlogic Meson s7d bm201 Board";
};

&uart_a {
    status = "okay";
};

&ethmac {
    status = "okay";
    internal_phy = <1>;
    mc_val = <0x1804>;
};
```

---

## 8. FIP 打包流程

### 8.1 FIP 结构

FIP (Firmware Image Package) 将各 BL 打包成单一镜像：

```
┌────────────────────────────────────────┐
│              FIP Header                │
├────────────────────────────────────────┤
│  BB1ST (BL2 + BL2E + BL2X + ACS)      │
├────────────────────────────────────────┤
│  DDR FIP (DDR固件)                     │
├────────────────────────────────────────┤
│  DEV FIP                               │
│  ├── BL30 (AOCPU)                     │
│  ├── BL31 (ATF)                       │
│  ├── BL32 (OP-TEE)                    │
│  └── BL33 (U-Boot)                    │
└────────────────────────────────────────┘
```

### 8.2 构建脚本

**主入口**: `bootloader/uboot-repo/mk`

```bash
#!/bin/bash
source fip/mk_script.sh
```

**构建命令**:

```bash
# 完整构建
./mk s7d_bm201 --vab --avb2

# 仅构建U-Boot
./mk s7d_bm201 --bl33

# 清理
./mk s7d_bm201 --clean
```

### 8.3 打包脚本详解

**路径**: `fip/s7d/build.sh`

主要函数:

| 函数 | 说明 |
|------|------|
| `init_vari()` | 初始化变量 |
| `mk_bl2ex()` | 打包 BL2/BL2E/BL2X |
| `mk_devfip()` | 打包 DEV FIP (BL30/31/32/33) |
| `mk_uboot()` | 生成最终 u-boot.bin |

### 8.4 输出文件

构建完成后在 `build/` 目录生成：

| 文件 | 说明 |
|------|------|
| `u-boot.bin` | 未签名镜像 |
| `u-boot.bin.signed` | 签名镜像 (eMMC 启动) |
| `u-boot.bin.sd.bin.signed` | SD 卡启动镜像 |
| `u-boot.bin.usb.signed` | USB 烧录镜像 |

---

## 9. EMMC 及分区配置

### 9.1 EMMC 接口配置

**DTS 配置** (`arch/arm64/boot/dts/amlogic/xxx.dts`)：

```dts
&emmc {
    status = "okay";
    mmc-hs200-1_8v;              // 开启 HS200
    // mmc-hs400-1_8v;           // HS400 需同时开启 HS200
    max-frequency = <200000000>; // EMMC 频率
};
```

### 9.2 GPT 分区表配置

Android U 默认使用 GPT 分区表。

**配置文件**: `device/amlogic/<product>/part_table_5_15.txt`

**格式**: `分区名,备用名,大小,对齐,标志`

```
boot_a,-,64M,1M,0x0001
boot_b,-,64M,1M,0x0001
vbmeta_a,-,2M,1M,0x0001
vbmeta_b,-,2M,1M,0x0001
super,-,3200M,1M,0x0001
rsv,-,64M,1M,0x0001
userdata,-,-,1M,0x1004
```

**编译 GPT**:
```bash
rm out/target/product/<product>/gpt.bin
make gptbin -j12
```

> **注意**: out 目录下的 `bootloader.img` 包含 `gpt.bin`，而 device 目录下的不包含。

### 9.3 添加自定义分区

以添加 `cas` 分区为例（Android U AB 系统）：

#### Step 1: 修改分区表

```diff
# device/amlogic/<product>/part_table_5_15.txt
 super,-,3200M,1M,0x0001
+cas_a,-,16M,1M,0x0002
+cas_b,-,16M,1M,0x0002
 rsv,-,64M,1M,0x0001
```

#### Step 2: 配置挂载参数

```bash
# device/amlogic/<product>/fstab.ab_oem.amlogic
# 只读挂载
/dev/block/by-name/cas  /cas  ext4  ro,barrier=1  wait,slotselect,first_stage_mount
# 读写挂载
/dev/block/by-name/cas  /cas  ext4  noatime,nosuid,nodev  wait,slotselect,first_stage_mount
```

#### Step 3: 配置分区镜像

创建 `device/amlogic/<product>/cas/cas.mk`：

```makefile
CUSTOM_IMAGE_MOUNT_POINT := cas
CUSTOM_IMAGE_PARTITION_SIZE := 16777216
CUSTOM_IMAGE_FILE_SYSTEM_TYPE := ext4
CUSTOM_IMAGE_DICT_FILE := device/amlogic/<product>/cas/cas_dict.txt
CUSTOM_IMAGE_SELINUX := true
CUSTOM_IMAGE_COPY_FILES := device/amlogic/<product>/cas/1.txt:1.txt
```

创建 `cas_dict.txt`：
```
skip_fsck=true
partition_name=cas
```

#### Step 4: 配置 BoardConfig.mk

```makefile
BOARD_ROOT_EXTRA_FOLDERS := cas
PRODUCT_CUSTOM_IMAGE_MAKEFILES := \
    device/amlogic/<product>/cas/cas.mk
```

#### Step 5: 配置 SELinux 权限

```te
# sepolicy/device.te
type cas_block_device, dev_type;

# sepolicy/file_contexts
/dev/block/cas_a    u:object_r:cas_block_device:s0
/dev/block/cas_b    u:object_r:cas_block_device:s0
/cas(/.*)?          u:object_r:cas_block_device:s0

# sepolicy/update_engine.te
allow update_engine cas_block_device:blk_file rw_file_perms;
```

#### Step 6: 配置 OTA 更新

```makefile
# device/amlogic/common/core_amlogic.mk
AB_OTA_PARTITIONS += cas

# device/amlogic/common/factory.mk
BUILT_IMAGES += cas.img
INSTALLED_RADIOIMAGE_TARGET += $(PRODUCT_OUT)/cas.img
```

#### Step 7: 编译

```bash
make custom_images                              # 编译分区镜像
cp out/target/product/<product>/cas.img device/amlogic/<product>/
rm out/target/product/<product>/gpt.bin && make gptbin -j12
make -j12
```

### 9.4 分区调试命令

```bash
cat /proc/partitions           # 查看分区信息
ls -l /dev/block/by-name/      # 查看分区名
mount                          # 查看挂载状态
```

### 9.5 分区 Size 建议

| 分区 | 建议 |
|------|------|
| userdata | >= 4GB |
| boot/vendor_boot/super | 当前占用 × 1.5 (预留升级空间) |
| rsv | 128MB |

---

## 10. 关键修改点

### 10.1 添加新的 DDR 配置支持

**场景**: 支持新的 DDR 容量 (如 3GB)

**修改文件**: `bl33/v2023/board/amlogic/s7d_bm201/s7d_bm201.c`

```c
int checkhw(char *name)
{
    // ... 现有代码 ...

    switch (ddr_size) {
    // 现有case...

    case 0xC0000000UL:  // 新增: 3GB DDR
        strcpy(dtb_name, "s7d_s905x5m_bm201-3g\0");
        break;

    // ...
    }
}
```

同时需要添加对应的 DTS 文件:
```
arch/arm/dts/amlogic/meson-s7d-bm201-3g.dts
```

### 10.2 修改默认显示输出

**修改文件**: `bl33/v2023/board/amlogic/configs/s7d_bm201.h`

```c
#define CONFIG_EXTRA_ENV_SETTINGS \
    "outputmode=4k2k60hz\0"  \  // 修改默认分辨率
    "hdmimode=2160p60hz\0"   \
    // ...
```

### 10.3 添加 GPIO 控制

**修改文件**: `bl33/v2023/board/amlogic/s7d_bm201/s7d_bm201.c`

在 `board_init()` 中添加:

```c
int board_init(void)
{
    // ... 现有代码 ...

    // 添加自定义GPIO控制
    run_command("gpio set GPIOX_Y", 1);  // 拉高
    run_command("gpio clear GPIOX_Z", 0); // 拉低

    return 0;
}
```

### 10.4 修改启动顺序/延时

**修改文件**: `bl33/v2023/board/amlogic/configs/s7d_bm201.h`

```c
#define CONFIG_PREBOOT  \
    "run bcb_cmd; "     \
    "sleep 1; "         \  // 添加延时
    "run upgrade_check;"\
    // ...
```

### 10.5 添加 IR 遥控唤醒键值

**修改文件**: `bl33/v2023/board/amlogic/configs/s7d_bm201.h`

```c
#define AML_IR_REMOTE_POWER_UP_KEY_VAL1 0xef10fe01  // 键值1
#define AML_IR_REMOTE_POWER_UP_KEY_VAL2 0XBB44FB04  // 键值2
// ... 最多支持9个键值
```

### 10.6 启用生产模式

**修改文件**: `bl33/v2023/configs/amlogic/s7d_bm201_defconfig`

```kconfig
CONFIG_AML_PRODUCT_MODE=y   # 禁用fastboot unlock/串口调试
```

或通过环境变量:

```bash
export UBOOT_PRODUCTION_MODE=true
./mk s7d_bm201 --vab --avb2
```

---

## 11. 构建命令参考

### 11.1 使用 mk 脚本

```bash
cd bootloader/uboot-repo

# 完整构建
./mk s7d_bm201 --vab --avb2

# 带额外参数
./mk s7d_bm201 --vab --avb2 --systemroot

# 清理
./mk s7d_bm201 --clean
```

### 11.2 输出文件使用

构建完成后，将文件复制到设备目录:

```bash
cp build/u-boot.bin.signed device/amlogic/ross/bootloader.img
cp build/u-boot.bin.sd.bin.signed device/amlogic/ross/upgrade/
cp build/u-boot.bin.usb.signed device/amlogic/ross/upgrade/
```

---

## 12. 启动模式判断与烧录模式

本章详细介绍 U-Boot 如何判断启动模式，以及如何自定义启动逻辑（如读取 U 盘配置进入烧录模式）。

### 12.1 启动模式判断流程

U-Boot 启动时通过以下流程决定进入哪种模式：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONFIG_PREBOOT (预启动命令)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. run bcb_cmd          → 读取BCB (Bootloader Control Block)               │
│  2. run upgrade_check    → 检查是否需要升级                                   │
│  3. run init_display     → 初始化显示                                        │
│  4. run storeargs        → 设置启动参数                                      │
│  5. run upgrade_key      → 检测升级按键 (GPIO)                               │
│  6. bcb uboot-command    → 执行BCB中的uboot命令                              │
│  7. run switch_bootmode  → 根据reboot_mode切换启动模式 ← 【核心判断点】        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         switch_bootmode 判断逻辑                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  get_rebootmode;                    ← 从寄存器读取重启模式                    │
│  if reboot_mode = factory_reset    → run recovery_from_flash (Recovery)     │
│  if reboot_mode = update           → run update (烧录模式)                   │
│  if reboot_mode = quiescent        → 静默启动                                │
│  if reboot_mode = fastboot         → fastboot 0 (Fastboot模式)              │
│  else                              → 正常启动 (storeboot)                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.2 重启模式值定义

**代码位置**: `bl33/v2023/cmd/amlogic/cmd_reboot.c`

`get_rebootmode` 命令从 `AO_SEC_SD_CFG15` 寄存器读取重启原因：

| 模式值 | 常量名 | 环境变量值 | 说明 |
|--------|--------|-----------|------|
| 0 | `AMLOGIC_COLD_BOOT` | `cold_boot` | 冷启动 (首次上电) |
| 1 | `AMLOGIC_NORMAL_BOOT` | `normal` | 正常重启 |
| 2 | `AMLOGIC_FACTORY_RESET_REBOOT` | `factory_reset` | 恢复出厂/Recovery |
| 3 | `AMLOGIC_UPDATE_REBOOT` | `update` | 进入烧录模式 |
| 4 | `AMLOGIC_FASTBOOT_REBOOT` | `fastboot` | Fastboot 模式 |
| 5 | `AMLOGIC_BOOTLOADER_REBOOT` | `bootloader` | Bootloader 模式 |
| 6 | `AMLOGIC_SUSPEND_REBOOT` | `suspend_off` | 休眠唤醒 |
| 11 | `AMLOGIC_KERNEL_PANIC` | `kernel_panic` | 内核崩溃 |
| 12 | `AMLOGIC_WATCHDOG_REBOOT` | `watchdog_reboot` | 看门狗重启 |

### 12.3 烧录模式 (update) 详解

当 `reboot_mode=update` 或 `upgrade_step=3` 时，执行 `run update` 命令：

**环境变量定义位置**: `bl33/v2023/board/amlogic/env/android_ott.env:165-170`

```bash
update=
    /*first usb burning, second sdc_burn, third ext-sd autoscr/recovery*/
    /*last udisk autoscr/recovery*/
    run usb_burning;              # 1. USB烧录 (通过USB工具)
    run recovery_from_sdcard;     # 2. SD卡烧录
    run recovery_from_udisk;      # 3. U盘烧录
    run recovery_from_flash;      # 4. Flash恢复
```

#### 烧录方式优先级

1. **USB 烧录** (`usb_burning`): 使用 Amlogic USB Burning Tool
2. **SD 卡烧录** (`recovery_from_sdcard`): 从 SD 卡读取 `aml_autoscript` 或 `recovery.img`
3. **U 盘烧录** (`recovery_from_udisk`): 从 U 盘读取 `aml_autoscript` 或 `recovery.img`
4. **Flash 恢复** (`recovery_from_flash`): 从 Flash 读取 recovery 分区

### 12.4 U 盘/SD 卡自动烧录机制

**环境变量定义**: `android_ott.env:172-185`

```bash
recovery_from_fat_dev=
    setenv loadaddr ${loadaddr_kernel};
    # 1. 尝试加载并执行 aml_autoscript (自动脚本)
    if fatload ${fatload_dev} 0 ${loadaddr} aml_autoscript; then
        autoscr ${loadaddr};
    fi;
    # 2. 尝试加载 recovery.img
    if fatload ${fatload_dev} 0 ${loadaddr} recovery.img; then
        if fatload ${fatload_dev} 0 ${dtb_mem_addr} dtb.img; then
            echo ${fatload_dev} dtb.img loaded;
        fi;
        setenv bootargs ${bootargs} ${fs_type};
        bootm ${loadaddr};
    fi;

recovery_from_udisk=
    setenv fatload_dev usb;
    if usb start 0; then run recovery_from_fat_dev; fi;

recovery_from_sdcard=
    setenv fatload_dev mmc;
    if mmcinfo; then run recovery_from_fat_dev; fi;
```

### 12.5 如何自定义：读取 U 盘配置文件进入烧录模式

**是的，主要修改文件是**: `bl33/v2023/board/amlogic/env/android_ott.env`

#### 方案一：修改 upgrade_check 添加 U 盘配置检测

在 `upgrade_check` 中添加 U 盘配置文件检测逻辑：

```bash
# 修改 android_ott.env 中的 upgrade_check
upgrade_check=
    echo recovery_status=${recovery_status};
    if itest.s "${recovery_status}" == "in_progress"; then
        run init_display; run storeargs; run recovery_from_flash;
    else fi;
    echo upgrade_step=${upgrade_step};
    if itest ${upgrade_step} == 3; then run storeargs; run update; fi;

    # ===== 新增：检测U盘配置文件 =====
    if usb start 0; then
        if fatload usb 0 ${loadaddr} aml_sdc_burn.ini; then
            echo "Found burn config on USB, entering update mode...";
            run update;
        fi;
    fi;
    # ===== 新增结束 =====
```

#### 方案二：添加自定义检测命令

在 `CONFIG_PREBOOT` 中添加自定义检测步骤：

**修改文件**: `bl33/v2023/board/amlogic/configs/s7d_bm201.h`

```c
#define CONFIG_PREBOOT  \
    "run bcb_cmd; "\
    "run upgrade_check;"\
    "run check_usb_burn_config;"\  /* 新增 */
    "run init_display;"\
    "run storeargs;"\
    "run upgrade_key;" \
    "bcb uboot-command;"\
    "run switch_bootmode;"
```

**在 android_ott.env 中添加**：

```bash
# 自定义U盘配置检测
check_usb_burn_config=
    if usb start 0; then
        # 检测自定义配置文件 (如 auto_burn.cfg)
        if fatload usb 0 ${loadaddr} auto_burn.cfg 0x100; then
            echo "USB burn config detected!";
            # 读取配置内容判断是否进入烧录
            # 这里可以使用 env import 导入配置
            env import -t ${loadaddr} 0x100;
            if itest.s "${auto_burn}" == "1"; then
                echo "Auto burn enabled, entering update mode...";
                run update;
            fi;
        fi;
    fi;
```

#### 方案三：修改 board_init() 在 C 代码层面检测

**修改文件**: `bl33/v2023/board/amlogic/s7d_bm201/s7d_bm201.c`

```c
int board_init(void)
{
    printf("board init\n");

    // ... 现有代码 ...

    // 在board_init阶段检测USB配置 (较早执行)
    // 注意：此时USB可能还未完全初始化，建议在board_late_init中做

    return 0;
}

int board_late_init(void)
{
    printf("board late init\n");

    // ... 现有代码 ...

    // 自定义：检测U盘配置文件
    if (run_command("usb start 0", 0) == 0) {
        if (run_command("fatload usb 0 0x1080000 auto_burn.cfg", 0) == 0) {
            printf("Found auto_burn.cfg on USB!\n");
            // 设置环境变量触发烧录
            env_set("upgrade_step", "3");
        }
    }

    // ... 后续代码 ...
    return 0;
}
```

### 12.6 SD 卡烧录配置文件

默认的 SD 卡烧录配置文件名由环境变量定义：

```bash
# android_ott.env:50
sdcburncfg=aml_sdc_burn.ini
```

该配置文件指定烧录参数，通常放在 SD 卡根目录。

### 12.7 GPIO 按键进入烧录模式

**环境变量**: `android_ott.env:67-83`

```bash
#ifdef CONFIG_ENABLE_AML_GPIO_UPGRADE
upgrade_key_base=
    if gpio input CONFIG_AML_GPIO_UPGRADE_KEY; then
        echo detect upgrade key;
        if test ${upgrade_key_flag} = 0; then
            echo enter recovery; setenv upgrade_key_flag 1; saveenv;
            run recovery_from_flash;           # 第1次按键: Recovery
        else if test ${upgrade_key_flag} = 1; then
            echo enter update; setenv upgrade_key_flag 2; saveenv;
            run update;                        # 第2次按键: 烧录模式
        else
            echo enter fastboot; setenv upgrade_key_flag 0; saveenv;
            fastboot 0;                        # 第3次按键: Fastboot
        fi;fi;
    fi;
#endif
```

GPIO 按键配置在 defconfig 中：

```kconfig
# configs/amlogic/s7d_bm201_defconfig
CONFIG_ENABLE_AML_GPIO_UPGRADE=y
CONFIG_AML_GPIO_UPGRADE_KEY="GPIOD_2"
```

### 12.8 启动模式相关关键文件

| 文件 | 说明 |
|------|------|
| `board/amlogic/env/android_ott.env` | **环境变量定义 (主要修改点)** |
| `board/amlogic/configs/s7d_bm201.h` | CONFIG_PREBOOT 定义 |
| `cmd/amlogic/cmd_reboot.c` | get_rebootmode 命令实现 |
| `cmd/amlogic/cmd_bcb.c` | BCB 命令实现 |
| `include/amlogic/base_env.h` | 基础环境变量模板 |

### 12.9 调试启动模式

在 U-Boot 命令行中手动测试：

```bash
# 查看当前重启模式
get_rebootmode
printenv reboot_mode

# 查看升级状态
printenv upgrade_step
printenv recovery_status

# 手动触发烧录模式
run update

# 手动触发Recovery
run recovery_from_flash

# 测试U盘检测
usb start 0
fatls usb 0

# 设置下次启动进入update模式
reboot update
```

---

## 13. U-Boot 命令行命令参考

当用户在启动过程中按下回车键时，会进入 U-Boot 命令行界面。以下是经过代码验证的可用命令。

### 13.1 进入命令行方式

1. **按键进入**: 启动过程中按 `Enter` 或 `空格` 键
2. **超时等待**: 如果设置了 `bootdelay` 环境变量，在倒计时期间按任意键

### 13.2 系统控制命令

以下命令来源于代码验证：

#### reboot - 设置重启模式并重启系统

**源码位置**: `cmd/amlogic/cmd_reboot.c:296-313`

```bash
reboot [模式]
```

| 参数 | 说明 |
|------|------|
| `cold_boot` | 冷启动 |
| `normal` | 正常重启 (默认) |
| `factory_reset` 或 `recovery` | 进入 Recovery 模式 |
| `update` | 进入烧录/升级模式 |
| `fastboot` | 进入 Fastboot 模式 |
| `bootloader` | 进入 Bootloader 模式 |
| `suspend_off` | 休眠关机 |
| `hibernate` | 休眠模式 |
| `crash_dump` | 崩溃转储模式 |

**示例**:
```bash
s7d_bm201# reboot update      # 重启进入烧录模式
s7d_bm201# reboot recovery    # 重启进入 Recovery
s7d_bm201# reboot             # 正常重启
```

#### get_rebootmode - 获取当前重启模式

**源码位置**: `cmd/amlogic/cmd_reboot.c:288-294`

```bash
get_rebootmode
```

执行后会设置环境变量 `reboot_mode`，可通过 `printenv reboot_mode` 查看。

#### systemoff - 关闭系统

**源码位置**: `cmd/amlogic/cmd_reboot.c:326-337`

```bash
systemoff
```

完全关闭系统电源。

#### systemsuspend - 系统休眠

**源码位置**: `cmd/amlogic/cmd_reboot.c:339-346`

```bash
systemsuspend
```

让系统进入休眠状态。

#### reset - CPU 复位

**源码位置**: `cmd/boot.c`

```bash
reset [-w]
```

| 参数 | 说明 |
|------|------|
| (无参数) | 冷启动复位 |
| `-w` | 热复位 (warm reset) |

#### go - 跳转执行

**源码位置**: `cmd/boot.c`

```bash
go addr [arg ...]
```

从指定内存地址开始执行代码。

### 13.3 烧录/升级相关命令

#### adnl - Amlogic DNL 协议烧录

**源码位置**: `drivers/usb/gadget/v3_burning/v3_usb_tool/cmd_aml_dnl.c:145-148`

```bash
adnl [timeout_enum] [timeout_identify]
```

进入 Amlogic USB 烧录模式，等待 USB Burning Tool 连接。

| 参数 | 说明 |
|------|------|
| `timeout_enum` | 枚举超时时间 (毫秒)，0 表示无限等待 |
| `timeout_identify` | 识别超时时间 (毫秒) |

**示例**:
```bash
s7d_bm201# adnl              # 无限等待 USB 工具连接
s7d_bm201# adnl 5000         # 等待5秒，超时退出
s7d_bm201# adnl 5000 3000    # 枚举等待5秒，识别等待3秒
```

**注意**: 按 `Ctrl+C` 可退出 adnl 模式。

#### fastboot - Android Fastboot 模式

**源码位置**: `cmd/fastboot.c:164-167`

```bash
fastboot [-l addr] [-s size] usb <controller>
```

进入 Android Fastboot 模式，支持 `fastboot` 命令行工具操作。

| 参数 | 说明 |
|------|------|
| `-l addr` | 缓冲区地址 |
| `-s size` | 缓冲区大小 |
| `usb` | 使用 USB 接口 |
| `<controller>` | USB 控制器编号 (通常为 0) |

**示例**:
```bash
s7d_bm201# fastboot 0         # 使用 USB 控制器 0 进入 fastboot
s7d_bm201# fastboot usb 0     # 同上
```

### 13.4 环境变量命令

#### printenv - 打印环境变量

**源码位置**: `cmd/nvedit.c:1412-1425`

```bash
printenv [-a]           # 打印所有环境变量
printenv name ...       # 打印指定变量
```

**示例**:
```bash
s7d_bm201# printenv                  # 显示所有变量
s7d_bm201# printenv reboot_mode      # 显示 reboot_mode
s7d_bm201# printenv bootcmd bootargs # 显示多个变量
```

#### setenv - 设置环境变量

**源码位置**: `cmd/nvedit.c:1446-1448`

```bash
setenv [-f] name [value ...]
```

| 参数 | 说明 |
|------|------|
| `-f` | 强制设置 (覆盖只读变量) |
| `name` | 变量名 |
| `value` | 变量值，不提供则删除变量 |

**示例**:
```bash
s7d_bm201# setenv bootdelay 5           # 设置启动延时为5秒
s7d_bm201# setenv myvar                 # 删除 myvar 变量
s7d_bm201# setenv bootargs console=...  # 设置启动参数
```

#### saveenv - 保存环境变量

**源码位置**: `cmd/nvedit.c:654-658`

```bash
saveenv
```

将当前环境变量保存到持久存储 (eMMC/Flash)。

**警告**: 修改关键变量后 `saveenv` 可能导致系统无法启动！

#### defenv_reserve - 恢复默认环境变量

**源码位置**: `cmd/amlogic/defenv_without.c:217-236`

```bash
defenv_reserve [-c] [-b0] [-b1] [-b2] [env1 env2 ...]
```

恢复默认环境变量，但保留指定的变量。

| 参数 | 说明 |
|------|------|
| `-c` | 保留 Amlogic 通用环境变量数组 |
| `-b0/-b1/-b2` | 保留板级环境变量数组 |
| `env1 env2 ...` | 保留指定的变量名 |

### 13.5 存储操作命令

#### store - Amlogic 存储子系统

**源码位置**: `cmd/amlogic/storage.c:1681-1700`

```bash
store init [flag]                        # 初始化存储设备
store device [name]                      # 显示或设置存储设备
store partition                          # 显示分区信息
store read addr [partition] off size     # 从分区读取数据
store write addr [partition] off size    # 写入数据到分区
```

**示例**:
```bash
s7d_bm201# store init                    # 初始化存储
s7d_bm201# store partition               # 显示分区表
s7d_bm201# store device                  # 显示当前设备
```

#### mmc - eMMC/SD 卡操作

**源码位置**: `cmd/mmc.c:1135-1192`

```bash
mmc info                    # 显示当前 MMC 设备信息
mmc read addr blk# cnt      # 读取块数据
mmc write addr blk# cnt     # 写入块数据
mmc erase blk# cnt          # 擦除块
mmc rescan [mode]           # 重新扫描
mmc part                    # 显示分区
mmc dev [dev] [part] [mode] # 切换设备/分区
mmc list                    # 列出设备
```

**示例**:
```bash
s7d_bm201# mmc info                      # 显示 eMMC 信息
s7d_bm201# mmc dev 1                     # 切换到 eMMC (设备1)
s7d_bm201# mmc part                      # 显示分区
```

#### usb - USB 子系统

**源码位置**: `cmd/usb.c:728-757`

```bash
usb start                   # 启动 USB 控制器
usb reset                   # 复位 USB 控制器
usb stop [f]                # 停止 USB (f=强制)
usb tree                    # 显示 USB 设备树
usb info [dev]              # 显示 USB 设备信息
usb storage                 # 显示 USB 存储设备
```

**示例**:
```bash
s7d_bm201# usb start                     # 启动 USB
s7d_bm201# usb tree                      # 显示连接的设备
s7d_bm201# usb storage                   # 显示 U 盘信息
```

### 13.6 文件系统命令

#### fatload - 从 FAT 分区加载文件

```bash
fatload <interface> <dev[:part]> <addr> <filename> [bytes]
```

**示例**:
```bash
s7d_bm201# fatload usb 0 0x1080000 aml_autoscript    # 从 U 盘加载
s7d_bm201# fatload mmc 0 0x1080000 boot.img          # 从 SD 卡加载
```

#### fatls - 列出 FAT 分区文件

```bash
fatls <interface> <dev[:part]> [directory]
```

**示例**:
```bash
s7d_bm201# fatls usb 0                   # 列出 U 盘根目录
s7d_bm201# fatls mmc 0 /DCIM             # 列出 SD 卡 DCIM 目录
```

#### ext4load / ext4ls - EXT4 分区操作

**源码位置**: `cmd/ext4.c:87`

```bash
ext4load <interface> <dev[:part]> <addr> <filename> [bytes]
ext4ls <interface> <dev[:part]> [directory]
```

### 13.7 内存操作命令

#### md - 内存显示

**源码位置**: `cmd/mem.c:1319-1323`

```bash
md[.b, .w, .l] address [count]
```

| 后缀 | 说明 |
|------|------|
| `.b` | 按字节显示 |
| `.w` | 按 16 位字显示 |
| `.l` | 按 32 位长字显示 (默认) |

**示例**:
```bash
s7d_bm201# md 0x1080000 0x20             # 显示32个长字
s7d_bm201# md.b 0x1080000 0x100          # 显示256字节
```

#### mw - 内存写入

**源码位置**: `cmd/mem.c:1339-1343`

```bash
mw[.b, .w, .l] address value [count]
```

**示例**:
```bash
s7d_bm201# mw 0x1080000 0x12345678 1     # 写入一个长字
s7d_bm201# mw.b 0x1080000 0x55 0x100     # 填充256字节为0x55
```

#### cp - 内存拷贝

**源码位置**: `cmd/mem.c:1345-1349`

```bash
cp[.b, .w, .l] source target count
```

#### cmp - 内存比较

**源码位置**: `cmd/mem.c:1351-1355`

```bash
cmp[.b, .w, .l] addr1 addr2 count
```

### 13.8 GPIO 操作命令

#### gpio - GPIO 控制

**源码位置**: `cmd/gpio.c:308-316`

```bash
gpio <input|set|clear|toggle> <pin>      # GPIO 操作
gpio status [-a] [<bank> | <pin>]        # 显示 GPIO 状态
```

| 子命令 | 说明 |
|--------|------|
| `input` | 设置为输入并读取值 |
| `set` | 输出高电平 |
| `clear` | 输出低电平 |
| `toggle` | 翻转电平 |
| `status` | 显示状态 |

**示例**:
```bash
s7d_bm201# gpio set GPIOH_7              # 拉高 GPIOH_7
s7d_bm201# gpio clear GPIOC_4            # 拉低 GPIOC_4
s7d_bm201# gpio input GPIOD_2            # 读取 GPIOD_2 状态
s7d_bm201# gpio status -a                # 显示所有 GPIO 状态
```

### 13.9 执行脚本命令

#### run - 执行环境变量

```bash
run var [...]
```

执行存储在环境变量中的命令序列。

**示例**:
```bash
s7d_bm201# run update                    # 执行 update 变量中的命令
s7d_bm201# run recovery_from_flash       # 执行 recovery 流程
s7d_bm201# run storeboot                 # 执行正常启动流程
```

#### source - 执行脚本

**源码位置**: `cmd/source.c:204-207`

```bash
source [addr]
```

从内存地址执行脚本镜像。

### 13.10 启动命令

#### booti - 启动 Linux 内核

**源码位置**: `cmd/booti.c:157-160`

```bash
booti [addr [initrd[:size]] [fdt]]
```

启动 ARM64 Linux Image 格式内核。

| 参数 | 说明 |
|------|------|
| `addr` | 内核镜像地址 |
| `initrd` | initrd 地址 (- 表示无) |
| `fdt` | 设备树地址 |

### 13.11 帮助命令

#### help - 显示帮助

**源码位置**: `cmd/help.c:22-29`

```bash
help                        # 显示所有命令简要说明
help command ...            # 显示指定命令详细帮助
```

**示例**:
```bash
s7d_bm201# help                          # 列出所有命令
s7d_bm201# help mmc                      # 显示 mmc 命令帮助
s7d_bm201# help reboot                   # 显示 reboot 命令帮助
```

### 13.12 常用操作示例

#### 进入烧录模式

```bash
# 方式1: 直接进入 adnl 模式等待 USB 工具
s7d_bm201# adnl

# 方式2: 设置重启模式后重启
s7d_bm201# reboot update

# 方式3: 手动执行 update 流程
s7d_bm201# run update
```

#### 进入 Recovery 模式

```bash
# 方式1: 重启进入
s7d_bm201# reboot recovery

# 方式2: 直接执行
s7d_bm201# run recovery_from_flash
```

#### 进入 Fastboot 模式

```bash
# 方式1: 重启进入
s7d_bm201# reboot fastboot

# 方式2: 直接进入
s7d_bm201# fastboot 0
```

#### 从 U 盘启动 Recovery

```bash
s7d_bm201# usb start 0
s7d_bm201# fatload usb 0 ${loadaddr_kernel} recovery.img
s7d_bm201# fatload usb 0 ${dtb_mem_addr} dtb.img
s7d_bm201# bootm ${loadaddr_kernel}
```

#### 查看系统信息

```bash
s7d_bm201# printenv                      # 所有环境变量
s7d_bm201# mmc info                      # eMMC 信息
s7d_bm201# store partition               # 分区表
s7d_bm201# get_rebootmode                # 重启模式
```

### 13.13 命令代码位置汇总

| 命令 | 源文件 |
|------|--------|
| `reboot` | `cmd/amlogic/cmd_reboot.c:296` |
| `get_rebootmode` | `cmd/amlogic/cmd_reboot.c:288` |
| `set_usb_boot` | `cmd/amlogic/cmd_reboot.c:315` |
| `systemoff` | `cmd/amlogic/cmd_reboot.c:333` |
| `systemsuspend` | `cmd/amlogic/cmd_reboot.c:345` |
| `adnl` | `drivers/usb/gadget/v3_burning/v3_usb_tool/cmd_aml_dnl.c:145` |
| `fastboot` | `cmd/fastboot.c:164` |
| `printenv` | `cmd/nvedit.c:1412` |
| `setenv` | `cmd/nvedit.c:1446` |
| `saveenv` | `cmd/nvedit.c:654` |
| `defenv_reserve` | `cmd/amlogic/defenv_without.c:217` |
| `store` | `cmd/amlogic/storage.c:1681` |
| `mmc` | `cmd/mmc.c:1135` |
| `usb` | `cmd/usb.c:728` |
| `ext4load` | `cmd/ext4.c:87` |
| `md` | `cmd/mem.c:1319` |
| `mw` | `cmd/mem.c:1339` |
| `cp` | `cmd/mem.c:1345` |
| `cmp` | `cmd/mem.c:1351` |
| `gpio` | `cmd/gpio.c:308` |
| `source` | `cmd/source.c:204` |
| `booti` | `cmd/booti.c:157` |
| `help` | `cmd/help.c:22` |
| `reset` | `cmd/boot.c` |
| `go` | `cmd/boot.c` |

---

## 附录: 重要文件速查表

| 文件 | 用途 | 修改频率 |
|------|------|----------|
| `board/amlogic/s7d_bm201/s7d_bm201.c` | 板级主代码 | 高 |
| `board/amlogic/configs/s7d_bm201.h` | 配置头文件 | 高 |
| `board/amlogic/env/android_ott.env` | **环境变量/启动模式** | 高 |
| `configs/amlogic/s7d_bm201_defconfig` | Kconfig 配置 | 中 |
| `arch/arm/dts/amlogic/meson-s7d-bm201.dts` | 设备树 | 中 |
| `board/amlogic/s7d_bm201/firmware/timing.c` | DDR 时序 | 低 |
| `cmd/amlogic/cmd_reboot.c` | 重启模式命令 | 低 |
| `cmd/amlogic/cmd_bcb.c` | BCB 命令 | 低 |
| `include/amlogic/base_env.h` | 基础环境变量 | 低 |
| `fip/s7d/build.sh` | FIP 打包脚本 | 低 |

---

*文档版本: 1.0*
*更新日期: 2025-12-11*
*目标平台: S905X5M (S7D)*
