# Linux 内核驱动开发指南

> 本文档介绍 Linux 内核驱动开发的基础知识，并结合 Amlogic S905X5M (S7D) 平台的实际代码进行讲解。

---

## 目录

1. [内核模块基础](#1-内核模块基础)
2. [字符设备驱动开发](#2-字符设备驱动开发)
3. [平台设备与平台驱动](#3-平台设备与平台驱动)
4. [中断处理](#4-中断处理)
5. [内存映射与 I/O 操作](#5-内存映射与-io-操作)
6. [sysfs 与 procfs 接口](#6-sysfs-与-procfs-接口)
7. [本项目内核驱动架构](#7-本项目内核驱动架构)
8. [实战：分析 Watchdog 驱动](#8-实战分析-watchdog-驱动)
9. [内核模块编译与加载](#9-内核模块编译与加载)
10. [调试技巧](#10-调试技巧)

---

## 1. 内核模块基础

### 1.1 什么是内核模块

内核模块（Kernel Module）是可以在运行时动态加载到内核中的代码段，无需重新编译整个内核。这种机制使得：

- 按需加载驱动，减少内核体积
- 便于开发调试，无需每次重启
- 支持热插拔设备

### 1.2 最简单的内核模块

```c
// SPDX-License-Identifier: GPL-2.0
/*
 * 最简单的内核模块示例
 */
#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>

static int __init hello_init(void)
{
    pr_info("Hello, Amlogic S905X5M!\n");
    return 0;
}

static void __exit hello_exit(void)
{
    pr_info("Goodbye, Amlogic S905X5M!\n");
}

module_init(hello_init);
module_exit(hello_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Your Name");
MODULE_DESCRIPTION("A simple hello world module");
MODULE_VERSION("1.0");
```

### 1.3 关键宏说明

| 宏 | 说明 |
|---|---|
| `module_init()` | 指定模块加载时调用的函数 |
| `module_exit()` | 指定模块卸载时调用的函数 |
| `MODULE_LICENSE()` | 模块许可证（必须，"GPL" 可访问所有内核符号） |
| `MODULE_AUTHOR()` | 模块作者 |
| `MODULE_DESCRIPTION()` | 模块描述 |
| `__init` | 标记初始化代码，加载后可释放内存 |
| `__exit` | 标记退出代码，内置模块时可省略 |

### 1.4 模块参数

```c
#include <linux/moduleparam.h>

static int timeout = 60;
module_param(timeout, int, 0644);
MODULE_PARM_DESC(timeout, "Watchdog timeout in seconds (default=60)");

static char *device_name = "mydevice";
module_param(device_name, charp, 0444);
MODULE_PARM_DESC(device_name, "Device name");
```

参数权限：
- `0644`: 所有者可读写，其他人只读
- `0444`: 所有人只读
- `0`: 不在 sysfs 中显示

**本项目示例** (`common/common14-5.15/common/common_drivers/drivers/watchdog/meson_gxbb_wdt.c:78`):

```c
static unsigned int watchdog_enabled = 1;
static int get_watchdog_enabled_env(char *str)
{
    return kstrtouint(str, 0, &watchdog_enabled);
}
__setup("watchdog_enabled=", get_watchdog_enabled_env);
```

---

## 2. 字符设备驱动开发

### 2.1 字符设备概述

字符设备是 Linux 中最常见的设备类型，以字节流方式访问，如串口、键盘、LED 等。

### 2.2 字符设备核心数据结构

```c
#include <linux/fs.h>
#include <linux/cdev.h>

/* 文件操作结构体 */
static const struct file_operations my_fops = {
    .owner   = THIS_MODULE,
    .open    = my_open,
    .release = my_release,
    .read    = my_read,
    .write   = my_write,
    .unlocked_ioctl = my_ioctl,
};

/* 字符设备结构体 */
struct my_device {
    struct cdev cdev;
    dev_t devno;
    struct class *class;
    struct device *device;
    /* 设备私有数据 */
};
```

### 2.3 字符设备注册流程

```c
static int __init my_driver_init(void)
{
    int ret;

    /* 1. 分配设备号 */
    ret = alloc_chrdev_region(&devno, 0, 1, "my_device");
    if (ret < 0) {
        pr_err("Failed to allocate device number\n");
        return ret;
    }

    /* 2. 初始化 cdev */
    cdev_init(&my_cdev, &my_fops);
    my_cdev.owner = THIS_MODULE;

    /* 3. 添加 cdev */
    ret = cdev_add(&my_cdev, devno, 1);
    if (ret < 0) {
        unregister_chrdev_region(devno, 1);
        return ret;
    }

    /* 4. 创建设备类 */
    my_class = class_create(THIS_MODULE, "my_class");
    if (IS_ERR(my_class)) {
        cdev_del(&my_cdev);
        unregister_chrdev_region(devno, 1);
        return PTR_ERR(my_class);
    }

    /* 5. 创建设备节点 */
    my_device = device_create(my_class, NULL, devno, NULL, "my_device");
    if (IS_ERR(my_device)) {
        class_destroy(my_class);
        cdev_del(&my_cdev);
        unregister_chrdev_region(devno, 1);
        return PTR_ERR(my_device);
    }

    return 0;
}

static void __exit my_driver_exit(void)
{
    device_destroy(my_class, devno);
    class_destroy(my_class);
    cdev_del(&my_cdev);
    unregister_chrdev_region(devno, 1);
}
```

### 2.4 文件操作实现

```c
static int my_open(struct inode *inode, struct file *filp)
{
    struct my_device *dev;

    /* 通过 inode 获取设备结构体 */
    dev = container_of(inode->i_cdev, struct my_device, cdev);
    filp->private_data = dev;

    pr_info("Device opened\n");
    return 0;
}

static ssize_t my_read(struct file *filp, char __user *buf,
                       size_t count, loff_t *ppos)
{
    struct my_device *dev = filp->private_data;
    char data[64];
    int len;

    len = snprintf(data, sizeof(data), "Hello from kernel!\n");

    if (*ppos >= len)
        return 0;

    if (count > len - *ppos)
        count = len - *ppos;

    if (copy_to_user(buf, data + *ppos, count))
        return -EFAULT;

    *ppos += count;
    return count;
}

static ssize_t my_write(struct file *filp, const char __user *buf,
                        size_t count, loff_t *ppos)
{
    char kbuf[64];

    if (count > sizeof(kbuf) - 1)
        count = sizeof(kbuf) - 1;

    if (copy_from_user(kbuf, buf, count))
        return -EFAULT;

    kbuf[count] = '\0';
    pr_info("Received: %s\n", kbuf);

    return count;
}
```

---

## 3. 平台设备与平台驱动

### 3.1 平台总线模型

Linux 使用平台总线（Platform Bus）来管理片上外设（SoC peripherals）。这种模型将设备信息（硬件资源）与驱动代码分离。

```
┌─────────────────────────────────────────────────────┐
│                   Platform Bus                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐          ┌──────────────────┐    │
│  │Platform Device│  match   │ Platform Driver  │    │
│  │              │◄────────►│                  │    │
│  │ - name       │          │ - name           │    │
│  │ - resources  │          │ - probe()        │    │
│  │ - id         │          │ - remove()       │    │
│  └──────────────┘          └──────────────────┘    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 3.2 平台驱动结构

```c
#include <linux/platform_device.h>
#include <linux/of.h>
#include <linux/of_device.h>

/* 设备树匹配表 */
static const struct of_device_id my_driver_of_match[] = {
    { .compatible = "amlogic,meson-gxbb-wdt" },
    { .compatible = "amlogic,meson-g12a-wdt" },
    { /* sentinel */ }
};
MODULE_DEVICE_TABLE(of, my_driver_of_match);

/* 平台驱动结构体 */
static struct platform_driver my_driver = {
    .probe  = my_driver_probe,
    .remove = my_driver_remove,
    .driver = {
        .name = "my_driver",
        .of_match_table = my_driver_of_match,
        .pm = &my_driver_pm_ops,
    },
};

/* 注册平台驱动 */
module_platform_driver(my_driver);
```

### 3.3 probe 函数实现

**本项目示例** (`meson_gxbb_wdt.c` 简化版):

```c
static int meson_gxbb_wdt_probe(struct platform_device *pdev)
{
    struct meson_gxbb_wdt *data;
    struct resource *res;
    int ret;

    /* 1. 分配设备私有数据 */
    data = devm_kzalloc(&pdev->dev, sizeof(*data), GFP_KERNEL);
    if (!data)
        return -ENOMEM;

    /* 2. 获取并映射内存资源 */
    res = platform_get_resource(pdev, IORESOURCE_MEM, 0);
    data->reg_base = devm_ioremap_resource(&pdev->dev, res);
    if (IS_ERR(data->reg_base))
        return PTR_ERR(data->reg_base);

    /* 3. 获取时钟资源 */
    data->clk = devm_clk_get(&pdev->dev, NULL);
    if (IS_ERR(data->clk))
        return PTR_ERR(data->clk);

    ret = clk_prepare_enable(data->clk);
    if (ret)
        return ret;

    /* 4. 初始化 watchdog 设备 */
    data->wdt_dev.info = &meson_gxbb_wdt_info;
    data->wdt_dev.ops = &meson_gxbb_wdt_ops;
    data->wdt_dev.min_timeout = 1;
    data->wdt_dev.max_timeout = 65;
    data->wdt_dev.timeout = DEFAULT_TIMEOUT;
    data->wdt_dev.parent = &pdev->dev;

    watchdog_set_drvdata(&data->wdt_dev, data);

    /* 5. 注册 watchdog 设备 */
    ret = devm_watchdog_register_device(&pdev->dev, &data->wdt_dev);
    if (ret)
        return ret;

    /* 6. 保存驱动数据 */
    platform_set_drvdata(pdev, data);

    dev_info(&pdev->dev, "Meson GXBB watchdog driver probed\n");
    return 0;
}
```

### 3.4 资源获取 API

| API | 说明 |
|-----|------|
| `platform_get_resource(pdev, type, index)` | 获取平台资源 |
| `platform_get_irq(pdev, index)` | 获取中断号 |
| `devm_ioremap_resource(dev, res)` | 映射内存资源（托管） |
| `devm_clk_get(dev, id)` | 获取时钟（托管） |
| `devm_request_irq(dev, irq, ...)` | 请求中断（托管） |

**`devm_` 前缀**：Device Managed，设备移除时自动释放资源。

---

## 4. 中断处理

### 4.1 中断处理概述

```
┌─────────────────────────────────────────────────────────┐
│                     中断处理流程                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   硬件中断 ──► GIC ──► CPU ──► 中断向量表 ──► 中断处理    │
│                                                          │
│   ┌──────────────────────────────────────────────────┐  │
│   │              Top Half (硬中断)                    │  │
│   │  - 快速响应，不可睡眠                             │  │
│   │  - 关闭中断，尽快返回                             │  │
│   └──────────────────────────────────────────────────┘  │
│                          │                               │
│                          ▼                               │
│   ┌──────────────────────────────────────────────────┐  │
│   │              Bottom Half (软中断)                 │  │
│   │  - tasklet / workqueue / threaded irq            │  │
│   │  - 可延迟执行的任务                               │  │
│   └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 4.2 请求中断

```c
static irqreturn_t my_irq_handler(int irq, void *dev_id)
{
    struct my_device *dev = dev_id;

    /* 处理中断 */
    ...

    return IRQ_HANDLED;  /* 或 IRQ_NONE 如果不是本设备的中断 */
}

/* 在 probe 中注册中断 */
int irq = platform_get_irq(pdev, 0);
ret = devm_request_irq(&pdev->dev, irq, my_irq_handler,
                       IRQF_SHARED, "my_device", data);
```

### 4.3 中断标志

| 标志 | 说明 |
|------|------|
| `IRQF_SHARED` | 共享中断线 |
| `IRQF_TRIGGER_RISING` | 上升沿触发 |
| `IRQF_TRIGGER_FALLING` | 下降沿触发 |
| `IRQF_TRIGGER_HIGH` | 高电平触发 |
| `IRQF_TRIGGER_LOW` | 低电平触发 |
| `IRQF_ONESHOT` | 线程化中断，handler 返回前保持屏蔽 |

### 4.4 线程化中断

适用于需要睡眠或执行较长时间的中断处理：

```c
ret = devm_request_threaded_irq(&pdev->dev, irq,
                                my_hard_irq_handler,    /* 硬中断处理 */
                                my_thread_irq_handler,  /* 线程处理 */
                                IRQF_ONESHOT,
                                "my_device", data);
```

**本项目示例** (`meson_gxbb_wdt.c:198`):

```c
static irqreturn_t meson_gxbb_wdt_interrupt(int irq, void *p)
{
    struct meson_gxbb_wdt *data = (struct meson_gxbb_wdt *)p;

    if (readl(data->reg_offset) & GXBB_WDT_TCNT_SETUP_MASK) {
        pr_warn("Watchdog has not been fed for %d seconds...\n",
                data->wdt_dev.timeout - data->wdt_dev.pretimeout);
    }

    return IRQ_HANDLED;
}
```

---

## 5. 内存映射与 I/O 操作

### 5.1 I/O 内存映射

嵌入式设备的寄存器通常映射到物理内存地址空间，需要通过 `ioremap` 访问：

```c
#include <linux/io.h>

/* 映射 I/O 内存 */
void __iomem *reg_base = ioremap(phys_addr, size);

/* 推荐使用托管版本 */
void __iomem *reg_base = devm_ioremap(&pdev->dev, phys_addr, size);

/* 或者使用 platform 资源 */
struct resource *res = platform_get_resource(pdev, IORESOURCE_MEM, 0);
void __iomem *reg_base = devm_ioremap_resource(&pdev->dev, res);
```

### 5.2 寄存器访问函数

```c
/* 读取寄存器 */
u32 val = readl(reg_base + OFFSET);        /* 32位 */
u16 val = readw(reg_base + OFFSET);        /* 16位 */
u8  val = readb(reg_base + OFFSET);        /* 8位 */

/* 写入寄存器 */
writel(value, reg_base + OFFSET);          /* 32位 */
writew(value, reg_base + OFFSET);          /* 16位 */
writeb(value, reg_base + OFFSET);          /* 8位 */

/* 带内存屏障的版本（确保顺序） */
u32 val = readl_relaxed(reg_base + OFFSET);
writel_relaxed(value, reg_base + OFFSET);
```

### 5.3 本项目示例

**Watchdog 寄存器操作** (`meson_gxbb_wdt.c`):

```c
#define GXBB_WDT_CTRL_REG       0x0
#define GXBB_WDT_TCNT_REG       0x8
#define GXBB_WDT_RSET_REG       0xc

#define GXBB_WDT_CTRL_EN        BIT(18)

/* 启动 watchdog */
static int meson_gxbb_wdt_start(struct watchdog_device *wdt_dev)
{
    struct meson_gxbb_wdt *data = watchdog_get_drvdata(wdt_dev);

    writel(readl(data->reg_base + GXBB_WDT_CTRL_REG) | GXBB_WDT_CTRL_EN,
           data->reg_base + GXBB_WDT_CTRL_REG);

    return 0;
}

/* 喂狗（重置计数器） */
static int meson_gxbb_wdt_ping(struct watchdog_device *wdt_dev)
{
    struct meson_gxbb_wdt *data = watchdog_get_drvdata(wdt_dev);

    writel(0, data->reg_base + GXBB_WDT_RSET_REG);

    return 0;
}
```

### 5.4 位操作宏

```c
#include <linux/bits.h>

#define BIT(nr)             (1UL << (nr))
#define GENMASK(h, l)       (((~0UL) << (l)) & (~0UL >> (BITS_PER_LONG - 1 - (h))))

/* 示例 */
#define REG_ENABLE          BIT(0)       /* 第0位 */
#define REG_MODE_MASK       GENMASK(3,1) /* 第1-3位 */

/* 设置某些位 */
val |= REG_ENABLE;

/* 清除某些位 */
val &= ~REG_ENABLE;

/* 修改位域 */
val = (val & ~REG_MODE_MASK) | (mode << 1);
```

---

## 6. sysfs 与 procfs 接口

### 6.1 sysfs 属性

sysfs 提供了用户空间与内核交互的标准接口：

```c
#include <linux/device.h>

/* 只读属性 */
static ssize_t status_show(struct device *dev,
                           struct device_attribute *attr, char *buf)
{
    struct my_device *mydev = dev_get_drvdata(dev);
    return sprintf(buf, "%d\n", mydev->status);
}
static DEVICE_ATTR_RO(status);

/* 读写属性 */
static ssize_t config_show(struct device *dev,
                           struct device_attribute *attr, char *buf)
{
    struct my_device *mydev = dev_get_drvdata(dev);
    return sprintf(buf, "%d\n", mydev->config);
}

static ssize_t config_store(struct device *dev,
                            struct device_attribute *attr,
                            const char *buf, size_t count)
{
    struct my_device *mydev = dev_get_drvdata(dev);
    int val;

    if (kstrtoint(buf, 0, &val))
        return -EINVAL;

    mydev->config = val;
    return count;
}
static DEVICE_ATTR_RW(config);

/* 属性组 */
static struct attribute *my_attrs[] = {
    &dev_attr_status.attr,
    &dev_attr_config.attr,
    NULL,
};
ATTRIBUTE_GROUPS(my);

/* 在驱动中使用 */
static struct platform_driver my_driver = {
    .driver = {
        .name = "my_driver",
        .dev_groups = my_groups,
    },
};
```

### 6.2 本项目示例

**LED 状态控制** (`leds_state.c:22`):

```c
static ssize_t blink_off_store(struct device *dev,
                               struct device_attribute *attr,
                               const char *buf, size_t size)
{
    u32 id, times, high_ms, low_ms;
    int res;

    res = sscanf(buf, "%d %d %d %d", &id, &times, &high_ms, &low_ms);
    if (res != 4) {
        pr_err("%s Can't parse! usage:[id times high(ms) low(ms)]\n",
               DRIVER_NAME);
        return -EINVAL;
    }

    res = meson_led_state_set_blink_off(id, times, high_ms, low_ms, 0, 0);
    if (res) {
        pr_err("%s set blink off fail!\n", DRIVER_NAME);
        return res;
    }

    return size;
}

static DEVICE_ATTR_WO(blink_off);
```

### 6.3 debugfs 调试接口

```c
#include <linux/debugfs.h>

static struct dentry *debugfs_dir;

static int my_debug_show(struct seq_file *s, void *unused)
{
    struct my_device *dev = s->private;

    seq_printf(s, "Register dump:\n");
    seq_printf(s, "  CTRL: 0x%08x\n", readl(dev->reg_base + 0x0));
    seq_printf(s, "  STAT: 0x%08x\n", readl(dev->reg_base + 0x4));

    return 0;
}
DEFINE_SHOW_ATTRIBUTE(my_debug);

/* 在 probe 中创建 */
debugfs_dir = debugfs_create_dir("my_driver", NULL);
debugfs_create_file("debug", 0444, debugfs_dir, dev, &my_debug_fops);

/* 在 remove 中删除 */
debugfs_remove_recursive(debugfs_dir);
```

---

## 7. 本项目内核驱动架构

### 7.1 内核源码目录结构

```
common/common14-5.15/
├── common/                          # 标准 Linux 内核 5.15
│   ├── arch/arm64/                  # ARM64 架构代码
│   ├── drivers/                     # 上游驱动
│   └── ...
│
├── common/common_drivers/           # Amlogic 定制驱动
│   └── drivers/
│       ├── clk/meson/              # 时钟驱动
│       ├── gpio/                   # GPIO 驱动
│       ├── pwm/                    # PWM 驱动
│       ├── i2c/                    # I2C 驱动
│       ├── spi/                    # SPI 驱动
│       ├── watchdog/               # 看门狗驱动
│       ├── led/                    # LED 驱动
│       ├── drm/                    # 显示驱动
│       ├── media/                  # 媒体/视频驱动
│       ├── dvb/                    # DVB 驱动
│       ├── usb/                    # USB 驱动
│       ├── net/                    # 网络驱动
│       ├── thermal/                # 热管理驱动
│       ├── mmc/                    # MMC/SD 驱动
│       ├── crypto/                 # 加密驱动
│       ├── tee/                    # TEE 驱动
│       ├── aml_tee/                # Amlogic TEE 驱动
│       └── ...
│
└── build/                          # 编译脚本
```

### 7.2 驱动分类

```
┌─────────────────────────────────────────────────────────────┐
│                    本项目驱动架构                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   GKI 内核驱动                        │    │
│  │  上游 Linux 内核驱动，遵循 GKI 规范                   │    │
│  │  路径: common/common14-5.15/common/drivers/          │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Amlogic 定制驱动                     │    │
│  │  common_drivers，以 KO 模块形式加载                   │    │
│  │  路径: common/common14-5.15/common/common_drivers/   │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   外部驱动模块                        │    │
│  │  GPU, WiFi/BT, Camera, Media 等                      │    │
│  │  路径: common/driver_modules/                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 驱动配置选项

**Kconfig 配置** (`common_drivers/drivers/Kconfig`):

```kconfig
# 示例：Watchdog 配置
config AMLOGIC_MESON_GXBB_WATCHDOG
    tristate "Amlogic Meson GXBB SoCs watchdog support"
    depends on WATCHDOG_CORE
    help
      Say Y here to include support for the watchdog timer
      in Amlogic Meson GXBB SoCs.
      To compile this driver as a module, choose M here.
```

**Makefile 配置** (`common_drivers/drivers/Makefile`):

```makefile
obj-$(CONFIG_AMLOGIC_MESON_GXBB_WATCHDOG) += watchdog/
obj-$(CONFIG_AMLOGIC_GPIO)                += gpio/
obj-$(CONFIG_AMLOGIC_PWM)                 += pwm/
obj-$(CONFIG_AMLOGIC_LED)                 += led/
obj-$(CONFIG_AMLOGIC_DRM)                 += drm/
obj-$(CONFIG_AMLOGIC_MEDIA_ENABLE)        += media/
```

---

## 8. 实战：分析 Watchdog 驱动

### 8.1 驱动概述

Watchdog（看门狗）是一种硬件定时器，用于检测和恢复系统故障。如果系统在规定时间内没有"喂狗"，watchdog 会触发系统复位。

**源码位置**: `common/common14-5.15/common/common_drivers/drivers/watchdog/meson_gxbb_wdt.c`

### 8.2 数据结构定义

```c
struct meson_gxbb_wdt {
    void __iomem *reg_base;         /* 寄存器基地址 */
    struct watchdog_device wdt_dev; /* watchdog 核心结构 */
    struct clk *clk;                /* 时钟 */
    unsigned int feed_watchdog_mode;
    struct notifier_block notifier; /* panic 通知 */
    void __iomem *reg_offset;       /* 寄存器偏移 */
    struct dentry *debugfs_dir;     /* debugfs 目录 */
    u32 *shadow;                    /* 寄存器影子 */
    int shadow_size;
};
```

### 8.3 操作函数集

```c
static const struct watchdog_ops meson_gxbb_wdt_ops = {
    .start = meson_gxbb_wdt_start,           /* 启动 watchdog */
    .stop = meson_gxbb_wdt_stop,             /* 停止 watchdog */
    .ping = meson_gxbb_wdt_ping,             /* 喂狗 */
    .set_timeout = meson_gxbb_wdt_set_timeout,  /* 设置超时 */
    .get_timeleft = meson_gxbb_wdt_get_timeleft, /* 获取剩余时间 */
    .set_pretimeout = meson_gxbb_wdt_set_pretimeout, /* 设置预超时 */
};
```

### 8.4 关键操作实现

**启动 Watchdog**:
```c
static int meson_gxbb_wdt_start(struct watchdog_device *wdt_dev)
{
    struct meson_gxbb_wdt *data = watchdog_get_drvdata(wdt_dev);

    /* 设置 CTRL 寄存器的 EN 位 */
    writel(readl(data->reg_base + GXBB_WDT_CTRL_REG) | GXBB_WDT_CTRL_EN,
           data->reg_base + GXBB_WDT_CTRL_REG);

    return 0;
}
```

**设置超时时间**:
```c
static int meson_gxbb_wdt_set_timeout(struct watchdog_device *wdt_dev,
                                      unsigned int timeout)
{
    struct meson_gxbb_wdt *data = watchdog_get_drvdata(wdt_dev);
    unsigned long tcnt = timeout * 1000;  /* 转换为毫秒 */

    if (tcnt > GXBB_WDT_TCNT_SETUP_MASK)
        tcnt = GXBB_WDT_TCNT_SETUP_MASK;

    wdt_dev->timeout = timeout;

    meson_gxbb_wdt_ping(wdt_dev);  /* 先喂狗 */

    writel(tcnt, data->reg_base + GXBB_WDT_TCNT_REG);

    return 0;
}
```

### 8.5 电源管理

```c
static int __maybe_unused meson_gxbb_wdt_suspend(struct device *dev)
{
    struct meson_gxbb_wdt *data = dev_get_drvdata(dev);

    if (watchdog_active(&data->wdt_dev) ||
        watchdog_hw_running(&data->wdt_dev))
        meson_gxbb_wdt_stop(&data->wdt_dev);

    return 0;
}

static int __maybe_unused meson_gxbb_wdt_resume(struct device *dev)
{
    struct meson_gxbb_wdt *data = dev_get_drvdata(dev);

    if ((watchdog_active(&data->wdt_dev) ||
        watchdog_hw_running(&data->wdt_dev)) &&
        watchdog_enabled)
        meson_gxbb_wdt_start(&data->wdt_dev);

    return 0;
}

static SIMPLE_DEV_PM_OPS(meson_gxbb_wdt_pm_ops,
                         meson_gxbb_wdt_suspend,
                         meson_gxbb_wdt_resume);
```

---

## 9. 内核模块编译与加载

### 9.1 编译内核模块

**方式一：使用项目编译脚本**

```bash
# 编译内核和模块
./mk ross -v common14-5.15

# 或使用 mk 脚本
./mk s7d_bm201 --kernel
```

**方式二：单独编译模块**

```bash
# 进入内核源码目录
cd common/common14-5.15

# 编译 common_drivers
cd common/common_drivers
make KERNEL_SRC=../.. M=$(pwd) modules
```

**方式三：out-of-tree 模块**

创建 `Makefile`:
```makefile
obj-m := hello.o

KERNEL_SRC ?= /path/to/kernel
PWD := $(shell pwd)

default:
	$(MAKE) -C $(KERNEL_SRC) M=$(PWD) modules

clean:
	$(MAKE) -C $(KERNEL_SRC) M=$(PWD) clean
```

### 9.2 模块操作命令

```bash
# 加载模块
insmod hello.ko
# 或
modprobe hello

# 查看已加载模块
lsmod | grep hello

# 查看模块信息
modinfo hello.ko

# 卸载模块
rmmod hello
# 或
modprobe -r hello

# 查看模块日志
dmesg | tail -20
```

### 9.3 模块依赖

```bash
# 生成模块依赖
depmod -a

# 查看模块依赖
modprobe --show-depends watchdog
```

---

## 10. 调试技巧

### 10.1 内核打印

```c
/* 不同级别的打印 */
pr_emerg("Emergency message\n");    /* 系统不可用 */
pr_alert("Alert message\n");        /* 需要立即处理 */
pr_crit("Critical message\n");      /* 严重情况 */
pr_err("Error message\n");          /* 错误 */
pr_warn("Warning message\n");       /* 警告 */
pr_notice("Notice message\n");      /* 正常但重要 */
pr_info("Info message\n");          /* 信息 */
pr_debug("Debug message\n");        /* 调试（需开启 DEBUG） */

/* 带设备信息的打印 */
dev_err(&pdev->dev, "Error: %d\n", ret);
dev_warn(&pdev->dev, "Warning message\n");
dev_info(&pdev->dev, "Info message\n");
dev_dbg(&pdev->dev, "Debug message\n");
```

### 10.2 动态调试

```bash
# 开启特定文件的调试输出
echo 'file meson_gxbb_wdt.c +p' > /sys/kernel/debug/dynamic_debug/control

# 开启特定模块的调试
echo 'module meson_gxbb_wdt +p' > /sys/kernel/debug/dynamic_debug/control

# 开启特定函数的调试
echo 'func meson_gxbb_wdt_probe +p' > /sys/kernel/debug/dynamic_debug/control

# 关闭调试
echo 'file meson_gxbb_wdt.c -p' > /sys/kernel/debug/dynamic_debug/control
```

### 10.3 内核调试工具

```bash
# 查看中断统计
cat /proc/interrupts

# 查看 I/O 内存映射
cat /proc/iomem

# 查看设备树
ls /sys/firmware/devicetree/base/

# 查看 sysfs 设备
ls /sys/class/watchdog/
ls /sys/devices/platform/

# 使用 devmem 读写寄存器（需 root）
devmem 0xff800000 32     # 读取
devmem 0xff800000 32 0x1 # 写入
```

### 10.4 常见问题排查

| 问题 | 排查方法 |
|------|---------|
| 模块加载失败 | 检查 `dmesg`，确认依赖模块已加载 |
| probe 失败 | 检查设备树匹配，资源是否正确 |
| 寄存器访问异常 | 确认 ioremap 成功，地址正确 |
| 中断不触发 | 检查中断号，确认设备树配置 |
| 设备节点不存在 | 检查 class_create/device_create |

### 10.5 内核 Oops 分析

```bash
# 解码内核崩溃地址
# 假设 Oops 显示 PC is at my_function+0x20/0x100
# 使用 addr2line 定位源码行
aarch64-linux-gnu-addr2line -e vmlinux -f <address>

# 或使用 gdb
aarch64-linux-gnu-gdb vmlinux
(gdb) list *my_function+0x20
```

---

## 参考资源

### 内核文档
- [Linux Kernel Documentation](https://www.kernel.org/doc/html/latest/)
- [Linux Device Drivers (LDD3)](https://lwn.net/Kernel/LDD3/)
- [Bootlin Training Materials](https://bootlin.com/training/kernel/)

### 本项目相关
- 内核源码: `common/common14-5.15/common/`
- Amlogic 驱动: `common/common14-5.15/common/common_drivers/drivers/`
- 设备树: `common/common14-5.15/out/.../arm64/amlogic/`

---