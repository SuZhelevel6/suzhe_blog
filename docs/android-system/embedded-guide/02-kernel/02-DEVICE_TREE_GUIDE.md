# 设备树 (Device Tree) 指南

> 本文档介绍设备树（Device Tree）的概念、语法和配置方法，并结合 Amlogic S905X5M (S7D) 平台的实际代码进行讲解。

---

## 目录

1. [设备树概述](#1-设备树概述)
2. [设备树语法基础](#2-设备树语法基础)
3. [常用设备树属性](#3-常用设备树属性)
4. [设备树绑定](#4-设备树绑定)
5. [本项目设备树结构](#5-本项目设备树结构)
6. [实战：设备树配置示例](#6-实战设备树配置示例)
7. [设备树编译与调试](#7-设备树编译与调试)
8. [外设配置与调试](#8-外设配置与调试)
9. [设备树覆盖 (DTO)](#9-设备树覆盖-dto)

---

## 1. 设备树概述

### 1.1 什么是设备树

设备树（Device Tree）是一种描述硬件的数据结构，用于向操作系统内核传递硬件信息。它将硬件描述从内核代码中分离出来，使得同一个内核镜像可以支持多种硬件平台。

```
┌─────────────────────────────────────────────────────────────┐
│                    设备树工作流程                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────┐    编译    ┌──────────┐    加载     ┌──────┐ │
│   │  .dts    │ ────────►  │   .dtb   │ ────────►   │内核  │ │
│   │ (源文件) │   dtc      │ (二进制)  │  bootloader│      │ │
│   └──────────┘            └──────────┘             └──────┘ │
│        │                                              │      │
│        │                                              ▼      │
│   ┌──────────┐                              ┌──────────────┐│
│   │  .dtsi   │                              │ 设备树解析    ││
│   │ (包含文件)│                              │ 创建platform  ││
│   └──────────┘                              │ device       ││
│                                              └──────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 1.2 为什么需要设备树

| 传统方式（板级文件） | 设备树方式 |
|---------------------|-----------|
| 硬件信息硬编码在内核 | 硬件信息与内核分离 |
| 每种板子需要重新编译内核 | 同一内核支持多种板子 |
| 修改硬件需要修改 C 代码 | 修改 DTS 文件即可 |
| 难以维护和移植 | 标准化，易于维护 |

### 1.3 设备树文件类型

| 文件类型 | 扩展名 | 说明 |
|---------|-------|------|
| Device Tree Source | `.dts` | 设备树源文件，描述具体的板级硬件 |
| Device Tree Source Include | `.dtsi` | 设备树包含文件，描述 SoC 通用硬件 |
| Device Tree Blob | `.dtb` | 编译后的二进制文件 |
| Device Tree Overlay | `.dtbo` | 设备树覆盖文件 |

---

## 2. 设备树语法基础

### 2.1 基本结构

设备树采用树状结构，由节点（node）和属性（property）组成：

```dts
/dts-v1/;

/ {                           /* 根节点 */
    compatible = "amlogic,s905x5m";
    model = "Amlogic S905X5M Reference Board";

    cpus {                    /* 子节点 */
        #address-cells = <1>;
        #size-cells = <0>;

        cpu@0 {               /* 子节点，带单元地址 */
            compatible = "arm,cortex-a55";
            device_type = "cpu";
            reg = <0x0>;
        };
    };

    memory@0 {
        device_type = "memory";
        reg = <0x0 0x0 0x0 0x80000000>;  /* 2GB 内存 */
    };
};
```

### 2.2 节点命名规则

```
节点名格式: <name>[@<unit-address>]

示例:
  cpu@0              - CPU 0
  serial@ff803000    - 串口，基地址 0xff803000
  gpio-keys          - GPIO 按键（无地址）
  i2c@ffd1f000       - I2C 控制器
```

### 2.3 属性格式

```dts
/* 字符串属性 */
compatible = "amlogic,meson-gxbb-wdt";
status = "okay";

/* 32位整数属性 */
reg = <0xff800000 0x1000>;

/* 多个值 */
interrupts = <GIC_SPI 143 IRQ_TYPE_EDGE_RISING>;

/* 空属性（布尔标志） */
gpio-controller;

/* 字节数组 */
mac-address = [00 11 22 33 44 55];

/* 字符串列表 */
clock-names = "pclk", "sclk", "lrclk";

/* phandle 引用 */
clocks = <&clkc CLKID_FCLK_DIV4>;
```

### 2.4 特殊属性

```dts
/ {
    /* 定义子节点地址格式 */
    #address-cells = <2>;    /* 地址用2个32位单元表示 */
    #size-cells = <2>;       /* 大小用2个32位单元表示 */

    /* 别名 */
    aliases {
        serial0 = &uart_A;
        mmc0 = &sd_emmc_c;
    };

    /* 选定的启动配置 */
    chosen {
        bootargs = "console=ttyS0,115200";
        stdout-path = "serial0:115200n8";
    };
};
```

### 2.5 标签和引用

```dts
/* 定义标签 */
uart_A: serial@ffd24000 {
    compatible = "amlogic,meson-gx-uart";
    reg = <0x0 0xffd24000 0x0 0x18>;
    /* ... */
};

/* 通过标签引用 */
&uart_A {
    status = "okay";
    pinctrl-0 = <&uart_a_pins>;
};

/* 在属性中引用（phandle） */
stdout-path = &uart_A;
clocks = <&clkc CLKID_UART0>;
```

---

## 3. 常用设备树属性

### 3.1 标准属性

| 属性名 | 说明 | 示例 |
|--------|------|------|
| `compatible` | 设备兼容性字符串，用于驱动匹配 | `"amlogic,meson-g12a-uart"` |
| `reg` | 设备寄存器地址和大小 | `<0x0 0xff803000 0x0 0x1000>` |
| `interrupts` | 中断配置 | `<GIC_SPI 143 IRQ_TYPE_LEVEL_HIGH>` |
| `clocks` | 时钟引用 | `<&clkc CLKID_UART0>` |
| `clock-names` | 时钟名称 | `"core", "baud"` |
| `resets` | 复位控制引用 | `<&reset RESET_UART0>` |
| `status` | 设备状态 | `"okay"` 或 `"disabled"` |
| `pinctrl-0` | 引脚配置引用 | `<&uart_a_pins>` |

### 3.2 地址相关属性

```dts
soc {
    #address-cells = <2>;     /* 地址用64位（2个32位单元） */
    #size-cells = <2>;        /* 大小用64位 */

    uart: serial@ffd24000 {
        /* 地址: 0x00000000_ffd24000, 大小: 0x00000000_00000018 */
        reg = <0x0 0xffd24000 0x0 0x18>;
    };
};

/* 也可以定义多个地址区域 */
device@ff800000 {
    reg = <0x0 0xff800000 0x0 0x1000>,   /* 区域1 */
          <0x0 0xff801000 0x0 0x1000>;   /* 区域2 */
    reg-names = "ctrl", "data";
};
```

### 3.3 中断相关属性

```dts
/* GIC 中断控制器 */
gic: interrupt-controller@ffc01000 {
    compatible = "arm,gic-400";
    #interrupt-cells = <3>;
    interrupt-controller;
    reg = <0x0 0xffc01000 0x0 0x1000>,   /* Distributor */
          <0x0 0xffc02000 0x0 0x2000>;   /* CPU Interface */
};

/* 使用中断的设备 */
uart@ffd24000 {
    /* 中断格式: <类型 中断号 触发方式> */
    /* GIC_SPI = 0, 143号中断, 边沿触发 */
    interrupts = <GIC_SPI 143 IRQ_TYPE_EDGE_RISING>;
};

/* GPIO 中断控制器 */
gpio_intc: interrupt-controller@ffd0f080 {
    compatible = "amlogic,meson-gpio-intc";
    #interrupt-cells = <2>;
    interrupt-controller;
    interrupt-parent = <&gic>;
    interrupts = <GIC_SPI 64 IRQ_TYPE_EDGE_RISING>;
};
```

### 3.4 时钟相关属性

```dts
/* 时钟控制器 */
clkc: clock-controller@ff63c000 {
    compatible = "amlogic,g12a-clkc";
    #clock-cells = <1>;
    reg = <0x0 0xff63c000 0x0 0x1000>;
};

/* 使用时钟的设备 */
uart@ffd24000 {
    clocks = <&clkc CLKID_UART0>, <&clkc CLKID_UART0_BAUD>;
    clock-names = "core", "baud";
};
```

### 3.5 引脚复用相关属性

```dts
/* 引脚控制器 */
pinctrl: pinctrl@ff634000 {
    compatible = "amlogic,meson-g12a-pinctrl";
    #address-cells = <2>;
    #size-cells = <2>;

    uart_a_pins: uart-a {
        mux {
            groups = "uart_a_tx", "uart_a_rx";
            function = "uart_a";
        };
    };
};

/* 使用引脚配置的设备 */
&uart_A {
    pinctrl-names = "default";
    pinctrl-0 = <&uart_a_pins>;
    status = "okay";
};
```

---

## 4. 设备树绑定

### 4.1 什么是绑定

设备树绑定（Binding）定义了如何在设备树中描述特定类型的硬件。每种设备类型都有对应的绑定文档，规定了必需和可选的属性。

绑定文档位置：`Documentation/devicetree/bindings/`

### 4.2 绑定示例：Watchdog

```yaml
# Documentation/devicetree/bindings/watchdog/amlogic,meson-gxbb-wdt.yaml

$id: http://devicetree.org/schemas/watchdog/amlogic,meson-gxbb-wdt.yaml
$schema: http://devicetree.org/meta-schemas/core.yaml

title: Amlogic Meson GXBB SoCs Watchdog Timer

properties:
  compatible:
    enum:
      - amlogic,meson-gxbb-wdt

  reg:
    maxItems: 1

  clocks:
    maxItems: 1

  timeout-sec:
    default: 60

required:
  - compatible
  - reg
  - clocks

examples:
  - |
    watchdog@98d0 {
        compatible = "amlogic,meson-gxbb-wdt";
        reg = <0x98d0 0x10>;
        clocks = <&xtal>;
        timeout-sec = <30>;
    };
```

### 4.3 本项目示例：音频设备绑定

**设备树节点** (`meson-g12.dtsi`):

```dts
tdmif_a: audio-controller-0 {
    compatible = "amlogic,axg-tdm-iface";
    #sound-dai-cells = <0>;
    sound-name-prefix = "TDM_A";
    clocks = <&clkc_audio AUD_CLKID_MST_A_MCLK>,
             <&clkc_audio AUD_CLKID_MST_A_SCLK>,
             <&clkc_audio AUD_CLKID_MST_A_LRCLK>;
    clock-names = "mclk", "sclk", "lrclk";
    status = "disabled";
};
```

**对应驱动匹配**:

```c
static const struct of_device_id axg_tdm_iface_of_match[] = {
    { .compatible = "amlogic,axg-tdm-iface" },
    { /* sentinel */ }
};
MODULE_DEVICE_TABLE(of, axg_tdm_iface_of_match);
```

---

## 5. 本项目设备树结构

### 5.1 设备树文件位置

```
aml-s905x5-androidu-v2/
├── common/common14-5.15/
│   └── common/arch/arm64/boot/dts/amlogic/    # 上游设备树
│       ├── meson-g12-common.dtsi              # G12系列通用
│       ├── meson-g12.dtsi                     # G12音频等
│       ├── meson-g12a.dtsi                    # G12A SoC
│       ├── meson-g12b.dtsi                    # G12B SoC
│       └── meson-sm1.dtsi                     # SM1 SoC
│
└── device/amlogic/
    ├── ross-kernel/5.15/
    │   ├── ross.dtb                           # Ross 主设备树
    │   ├── ross_soundbar.dtb                  # Ross 声吧版本
    │   └── ross_mxl258c.dtb                   # Ross MXL258C版本
    │
    └── raman-kernel/5.15/
        ├── raman.dtb                          # Raman 设备树
        ├── raman_soundbar.dtb
        └── raman_multidisplay.dtb
```

### 5.2 设备树层级结构

```
┌─────────────────────────────────────────────────────────────┐
│                    设备树包含层级                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ross.dts (板级配置)                                         │
│      │                                                       │
│      └── meson-g12a.dtsi (SoC 配置)                         │
│              │                                               │
│              ├── meson-g12.dtsi (G12 系列通用)              │
│              │       │                                       │
│              │       └── meson-g12-common.dtsi (基础配置)   │
│              │                                               │
│              └── dt-bindings/*.h (常量定义)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 主要设备树内容

**SoC 层（meson-g12a.dtsi）**:
- CPU 核心配置
- 内存控制器
- 中断控制器 (GIC)
- 时钟控制器
- 串口、I2C、SPI 控制器
- USB、以太网控制器
- 显示、视频硬件

**板级层（ross.dts）**:
- 内存大小配置
- 串口启用/禁用
- GPIO 使用配置
- 外设连接（WiFi、蓝牙、存储）
- 显示输出配置
- 音频编解码器

---

## 6. 实战：设备树配置示例

### 6.1 配置 UART 串口

```dts
/* SoC 层定义（dtsi） */
uart_A: serial@ffd24000 {
    compatible = "amlogic,meson-gx-uart";
    reg = <0x0 0xffd24000 0x0 0x18>;
    interrupts = <GIC_SPI 26 IRQ_TYPE_EDGE_RISING>;
    clocks = <&xtal>, <&clkc CLKID_UART0>, <&clkc CLKID_XTAL>;
    clock-names = "xtal", "pclk", "baud";
    fifo-size = <128>;
    status = "disabled";
};

/* 板级启用（dts） */
&uart_A {
    status = "okay";
    pinctrl-names = "default";
    pinctrl-0 = <&uart_a_pins>;
};
```

### 6.2 配置 I2C 设备

```dts
/* I2C 控制器 */
&i2c2 {
    status = "okay";
    pinctrl-names = "default";
    pinctrl-0 = <&i2c2_sda_a_pins>, <&i2c2_sck_a_pins>;
    clock-frequency = <400000>;   /* 400kHz */

    /* I2C 从设备：RTC */
    rtc@51 {
        compatible = "nxp,pcf8563";
        reg = <0x51>;            /* I2C 地址 */
    };

    /* I2C 从设备：温度传感器 */
    temp-sensor@48 {
        compatible = "ti,tmp102";
        reg = <0x48>;
        interrupt-parent = <&gpio>;
        interrupts = <GPIOA_5 IRQ_TYPE_EDGE_FALLING>;
    };
};
```

### 6.3 配置 GPIO

```dts
/* GPIO 控制器（dtsi） */
gpio: gpio@ff634000 {
    compatible = "amlogic,meson-g12a-gpio";
    reg = <0x0 0xff634000 0x0 0x100>;
    #gpio-cells = <2>;
    gpio-controller;
    gpio-ranges = <&pinctrl 0 0 100>;
};

/* 使用 GPIO（dts） */
/* LED */
leds {
    compatible = "gpio-leds";

    power_led {
        label = "power";
        gpios = <&gpio GPIOH_5 GPIO_ACTIVE_HIGH>;
        default-state = "on";
    };

    status_led {
        label = "status";
        gpios = <&gpio GPIOH_6 GPIO_ACTIVE_LOW>;
        linux,default-trigger = "heartbeat";
    };
};

/* GPIO 按键 */
gpio-keys {
    compatible = "gpio-keys";

    power {
        label = "Power Button";
        gpios = <&gpio GPIOA_3 GPIO_ACTIVE_LOW>;
        linux,code = <KEY_POWER>;
        wakeup-source;
    };
};
```

### 6.4 配置显示输出

```dts
/* HDMI 配置 */
&hdmi_tx {
    status = "okay";
    pinctrl-names = "default";
    pinctrl-0 = <&hdmi_hpd_pins>, <&hdmi_i2c_pins>;
    hdmi-supply = <&hdmi_5v>;
};

/* CVBS 配置 */
&cvbs_vdac_port {
    cvbs_vdac_out: endpoint {
        remote-endpoint = <&cvbs_connector_in>;
    };
};

cvbs-connector {
    compatible = "composite-video-connector";

    port {
        cvbs_connector_in: endpoint {
            remote-endpoint = <&cvbs_vdac_out>;
        };
    };
};
```

### 6.5 配置音频

```dts
/* 启用音频 TDM 接口 */
&tdmif_a {
    status = "okay";
};

&toddr_a {
    status = "okay";
};

&frddr_a {
    status = "okay";
};

/* 音频声卡配置 */
sound {
    compatible = "amlogic,axg-sound-card";
    model = "S905X5M-SOUND";
    audio-aux-devs = <&tdmout_a>;
    audio-routing = "TDMOUT_A IN 0", "FRDDR_A OUT 0";

    dai-link-0 {
        sound-dai = <&frddr_a>;
    };

    dai-link-1 {
        sound-dai = <&tdmif_a>;
        dai-format = "i2s";
        mclk-fs = <256>;
    };
};
```

### 6.6 配置存储

```dts
/* eMMC 配置 */
&sd_emmc_c {
    status = "okay";
    pinctrl-names = "default";
    pinctrl-0 = <&emmc_pins>;
    bus-width = <8>;
    cap-mmc-highspeed;
    mmc-hs200-1_8v;
    mmc-hs400-1_8v;
    max-frequency = <200000000>;
    disable-wp;

    mmc-pwrseq = <&emmc_pwrseq>;
    vmmc-supply = <&vcc_3v3>;
    vqmmc-supply = <&vddio_boot>;
};

/* SD 卡配置 */
&sd_emmc_b {
    status = "okay";
    pinctrl-names = "default";
    pinctrl-0 = <&sdcard_pins>;
    bus-width = <4>;
    cap-sd-highspeed;
    sd-uhs-sdr50;
    max-frequency = <100000000>;

    cd-gpios = <&gpio GPIOC_6 GPIO_ACTIVE_LOW>;
    vmmc-supply = <&vcc_3v3>;
    vqmmc-supply = <&vddio_card>;
};
```

---

## 7. 设备树编译与调试

### 7.1 编译设备树

**使用 dtc 编译器**:

```bash
# 编译 dts 为 dtb
dtc -I dts -O dtb -o board.dtb board.dts

# 反编译 dtb 为 dts（调试用）
dtc -I dtb -O dts -o board_decompiled.dts board.dtb

# 带预处理（支持 #include）
cpp -nostdinc -I include -undef -x assembler-with-cpp board.dts | \
    dtc -I dts -O dtb -o board.dtb
```

**使用内核编译系统**:

```bash
# 编译所有设备树
make ARCH=arm64 dtbs

# 编译特定设备树
make ARCH=arm64 amlogic/ross.dtb
```

**本项目编译**:

```bash
# 使用 mk 脚本编译内核（包含设备树）
./mk ross -v common14-5.15

# 设备树输出位置
ls device/amlogic/ross-kernel/5.15/*.dtb
```

### 7.2 运行时查看设备树

```bash
# 查看完整设备树
ls /sys/firmware/devicetree/base/

# 查看特定节点
cat /sys/firmware/devicetree/base/compatible

# 查看节点属性
hexdump -C /sys/firmware/devicetree/base/memory@0/reg

# 使用 fdtdump（需安装 dtc）
fdtdump /sys/firmware/fdt
```

### 7.3 设备树验证

```bash
# 语法检查
dtc -I dts -O dtb -o /dev/null board.dts

# 使用 dt-validate（需安装 yamllint）
dt-validate -s Documentation/devicetree/bindings/ board.dtb

# 检查绑定
make dt_binding_check
```

### 7.4 调试技巧

**1. 检查设备是否被识别**:
```bash
# 查看平台设备
ls /sys/bus/platform/devices/

# 查看特定设备
ls /sys/bus/platform/devices/ffd24000.serial/

# 查看驱动是否加载
cat /sys/bus/platform/devices/ffd24000.serial/driver_override
```

**2. 检查 compatible 匹配**:
```bash
# 查看设备的 compatible
cat /sys/firmware/devicetree/base/serial@ffd24000/compatible

# 查看驱动支持的 compatible
modinfo meson_uart | grep alias
```

**3. 常见问题排查**:

| 问题 | 可能原因 | 排查方法 |
|------|---------|---------|
| 设备不识别 | compatible 不匹配 | 检查驱动的 of_device_id |
| 设备 probe 失败 | 资源获取失败 | 检查 reg/irq/clk 属性 |
| status disabled | 设备被禁用 | 检查 status 属性 |
| 引脚配置错误 | pinctrl 配置问题 | 检查 pinctrl-0 引用 |

---

## 8. 外设配置与调试

本章补充 Amlogic 平台常用外设的 DTS 配置和调试命令。

### 8.1 Pinmux 配置

#### DTS 配置示例

```dts
// pinctrl groups 与 function 定义在驱动中
// common/common_drivers/drivers/gpio/pinctrl/pinctrl-meson-s4.c

// 引用 pinmux
&emmc {
    pinctrl-names = "default";
    pinctrl-0 = <&emmc_pins>;
};
```

#### 调试命令

> **注意**: Android U 需要先在 uboot 下设置 `setenv EnableSelinux permissive && saveenv`

```bash
# 查看所有引脚的 pinmux 状态
cat /sys/kernel/debug/pinctrl/fe000000.apb4\:pinctrl@4000-pinctrl-meson/pinmux-pins

# 查看 pinmux functions
cat /sys/kernel/debug/pinctrl/fe000000.apb4\:pinctrl@4000-pinctrl-meson/pinmux-functions

# 查看 pinmux groups
cat /sys/kernel/debug/pinctrl/fe000000.apb4\:pinctrl@4000-pinctrl-meson/pingroups
```

输出示例：
```
pin 55 (GPIOX_7): (MUX UNCLAIMED) (GPIO UNCLAIMED)
pin 56 (GPIOX_8): emmc (GPIO UNCLAIMED) function emmc_d0 group emmc_d0
```
- `UNCLAIMED`: GPIO 口未被申请使用

### 8.2 GPIO 配置

#### Kernel DTS 配置

需要打开内核配置：
```kconfig
CONFIG_GPIO_SYSFS=y                    # Kernel < 5.15
CONFIG_AMLOGIC_GPIOLIB_SYSFS=y         # Kernel >= 5.15
```

GPIO 定义头文件：`common_drivers/include/dt-bindings/gpio/meson-s4-gpio.h`

#### GPIO ID 计算

当 kernel >= 5.15 时，未使用的 GPIO 不直接显示 ID，需计算：

```bash
# 1. 查找 GPIO 所在的 pinctrl 设备
for i in `find /sys/kernel/debug/pinctrl -name pinmux-pins`; do cat $i; done | grep -i gpiob_2

# 2. 查看 gpiochip base 编号
cat /sys/kernel/debug/gpio
# 输出: gpiochip0: GPIOs 355-511, parent: fe000000.apb4:pinctrl@4000

# 3. 计算: GPIO_ID = base + offset
# GPIOB_2 -> pin 2, base=355 -> GPIO_ID = 355 + 2 = 357
```

#### sysfs 操作命令

```bash
# 查看所有 GPIO 状态
cat /sys/kernel/debug/gpio

# Export GPIO (示例: gpio508 即 GPIOZ_10)
echo 508 > /sys/class/gpio/export

# 设置方向
echo out > /sys/class/gpio/gpio508/direction   # 输出
echo in > /sys/class/gpio/gpio508/direction    # 输入

# 设置/读取电平
echo 1 > /sys/class/gpio/gpio508/value         # 高电平
echo 0 > /sys/class/gpio/gpio508/value         # 低电平
cat /sys/class/gpio/gpio508/value              # 读取

# Unexport GPIO
echo 508 > /sys/class/gpio/unexport
```

### 8.3 I2C 配置

#### DTS 配置示例

```dts
&i2c1 {
    status = "okay";
    pinctrl-names = "default";
    pinctrl-0 = <&i2c1_pins2>;
    clock-frequency = <300000>;         // I2C 时钟频率

    // I2C 从设备
    led_controller@60 {
        compatible = "amlogic,tlc59116_led";
        reg = <0x60>;                   // 7bit 地址，不含读写位
        status = "okay";
    };
};
```

#### 调试命令

```bash
# 查看 I2C 控制器
i2cdetect -l

# 扫描 I2C 总线上的设备
i2cdetect -y 1                          # 扫描 i2c-1

# 读取寄存器
i2cget -y 1 0x60 0x00                   # i2c-1, 地址0x60, 寄存器0x00

# 写入寄存器
i2cset -y 1 0x60 0x00 0xff              # 写入0xff

# dump 所有寄存器
i2cdump -y 1 0x60
```

### 8.4 UART 配置

#### DTS 配置示例

```dts
// SoC dtsi 中定义
uart_a: serial@ffd24000 {
    compatible = "amlogic,meson-gx-uart";
    reg = <0x0 0xffd24000 0x0 0x18>;
    interrupts = <GIC_SPI 26 IRQ_TYPE_EDGE_RISING>;
    clocks = <&xtal>, <&clkc CLKID_UART0>, <&clkc CLKID_XTAL>;
    clock-names = "xtal", "pclk", "baud";
    status = "disabled";
};

// 板级 dts 启用
&uart_a {
    status = "okay";
    pinctrl-names = "default";
    pinctrl-0 = <&uart_a_pins>;
};
```

#### 波特率配置

U-Boot 头文件配置 (`board/amlogic/configs/xxx.h`)：
```c
#define CONFIG_BAUDRATE 921600          // 默认波特率
```

#### 调试命令

```bash
# 支持的波特率: 9600/115200/921600/2M/3M/4M

# 设置波特率
stty -F /dev/ttyS0 115200

# 发送数据
echo "test" > /dev/ttyS0

# 接收数据
cat /dev/ttyS0
```

### 8.5 Watchdog 配置

#### DTS 配置

```dts
watchdog@98d0 {
    compatible = "amlogic,meson-gxbb-wdt";
    reg = <0x98d0 0x10>;
    clocks = <&xtal>;
    // 喂狗方式: 0=android守护进程, 1=内核线程
    amlogic,feed_watchdog_mode = <1>;
};
```

#### 启用 Android 守护进程喂狗

当 `feed_watchdog_mode = <0>` 时，需自启动 watchdog 服务：

```rc
# init.amlogic.system.rc
service watchdogd /system/bin/watchdogd
    class core
    user root
    group root
```

---

## 9. 设备树覆盖 (DTO)

### 9.1 什么是设备树覆盖

设备树覆盖（Device Tree Overlay, DTO）允许在运行时动态修改设备树，而无需重新编译完整的 DTB。这对于：

- 支持可插拔的扩展板
- 动态启用/禁用设备
- Android 系统的碎片化配置

### 9.2 DTO 语法

```dts
/dts-v1/;
/plugin/;

/* 覆盖现有节点 */
&uart_A {
    status = "okay";
};

/* 添加新节点 */
&i2c2 {
    #address-cells = <1>;
    #size-cells = <0>;

    sensor@48 {
        compatible = "ti,tmp102";
        reg = <0x48>;
    };
};

/* 删除属性 */
&some_device {
    /delete-property/ some-property;
};

/* 删除节点 */
/delete-node/ &some_node;
```

### 9.3 Android DTO

Android 使用 DTO 来分离：
- **主 DTB**: 包含 SoC 和通用配置
- **Overlay DTBO**: 包含厂商特定配置

```
┌─────────────────────────────────────────────────────────────┐
│                  Android DTO 架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌────────────┐     ┌────────────┐     ┌────────────┐     │
│   │  主 DTB    │  +  │ Overlay 1  │  +  │ Overlay 2  │     │
│   │ (SoC 配置) │     │ (Board A)  │     │ (Feature)  │     │
│   └────────────┘     └────────────┘     └────────────┘     │
│          │                  │                  │            │
│          └──────────────────┴──────────────────┘            │
│                             │                               │
│                             ▼                               │
│                    ┌────────────────┐                       │
│                    │ 合并后的设备树   │                       │
│                    └────────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.4 本项目 DTO 使用

```bash
# DTBO 分区位置
# device/amlogic/ross/dtbo.cfg

# 编译 DTBO
make dtboimage

# 刷入 DTBO
fastboot flash dtbo dtbo.img
```

---

## 参考资源

### 官方文档
- [Device Tree Specification](https://www.devicetree.org/specifications/)
- [Linux Device Tree Documentation](https://www.kernel.org/doc/html/latest/devicetree/index.html)
- [Device Tree Bindings](https://www.kernel.org/doc/html/latest/devicetree/bindings/index.html)

### 本项目相关
- 上游设备树: `common/common14-5.15/common/arch/arm64/boot/dts/amlogic/`
- 编译后设备树: `device/amlogic/ross-kernel/5.15/*.dtb`
- 绑定文档: `common/common14-5.15/common/Documentation/devicetree/bindings/`

---
