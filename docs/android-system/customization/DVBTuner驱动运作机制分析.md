# DVB Tuner 驱动运作机制分析

## 文档概述

本文档详细分析了从设备树（Device Tree）到 Tuner 驱动再到 ko 模块的完整运作流程，涵盖硬件配置、软件架构和加载机制。

**参考文件索引：**
- 设备树：`common/common14-5.15/common/common_drivers/arch/arm64/boot/dts/amlogic/s7d_s905x5m_bm201.dts`
- 内核驱动：`common/common14-5.15/common/common_drivers/drivers/dvb/*`
- 产品配置：`device/amlogic/ross/ross.mk:103`
- ko 模块 mk：`vendor/amlogic/reference/prebuilt/kernel-modules/tuner/tuner.mk`

---

## 一、整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Android 系统层                        │
│  (应用通过 /dev/dvb/adapterX/... 与驱动交互)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    ko 模块加载层                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Init RC 脚本: cxd2878_fe.rc                       │     │
│  │ on post-fs-data                                   │     │
│  │     insmod /vendor/lib/modules/cxd2878_fe.ko     │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ ko 文件: cxd2878_fe_64.ko (1.2M)                  │     │
│  │ 位置: vendor/lib/modules/                         │     │
│  │ 来源: vendor/amlogic/reference/prebuilt/          │     │
│  │       kernel-modules/tuner/64/14_5.15/            │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────┬──────────────────────────────────────┘
                       │ module_init()
┌──────────────────────▼──────────────────────────────────────┐
│                   内核驱动层 (DVB 框架)                      │
│  ┌────────────────────────────────────────────────────┐     │
│  │ main.c - DVB 子系统入口                           │     │
│  │   ├─ aml_dvb_extern_init()                        │     │
│  │   ├─ aucpu_init()                                 │     │
│  │   ├─ dsm_init()                                   │     │
│  │   └─ smc_sc2_mod_init()                           │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ aml_dvb_extern_driver.c - 外部 Tuner/Demod 管理器 │     │
│  │   ├─ 解析 DTS 配置                                │     │
│  │   ├─ 创建 tuner_ops / demod_ops                   │     │
│  │   ├─ 注册到 DVB 框架                              │     │
│  │   └─ 创建 sysfs 调试接口                          │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ aml_dvb.c - Demux 驱动                            │     │
│  │   ├─ TS 流路由管理                                │     │
│  │   ├─ PCR/STC 时钟同步                             │     │
│  │   └─ 注册 DVB demux 设备                          │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────┬──────────────────────────────────────┘
                       │ 读取配置
┌──────────────────────▼──────────────────────────────────────┐
│                  设备树层 (DTS)                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ dvb-extern 节点 (238-283行)                       │     │
│  │   ├─ fe_num = <2>          (前端数量)             │     │
│  │   ├─ fe0_demod = "cxd2878"                        │     │
│  │   ├─ fe0_i2c_adap_id = <&i2c1>                    │     │
│  │   ├─ fe0_demod_i2c_addr = <0xD8>                  │     │
│  │   ├─ fe0_ts = <0>           (TS端口编号)          │     │
│  │   ├─ fe0_tuner0 = <0>       (关联tuner索引)       │     │
│  │   └─ ...                                          │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ dvb-demux 节点 (285-311行)                        │     │
│  │   ├─ dmxdev_num = <0x6>     (demux设备数)         │     │
│  │   ├─ tsn_from = "demod"                           │     │
│  │   ├─ ts0 = "serial-4wire"   (TS0串行模式)         │     │
│  │   ├─ ts1 = "serial-4wire"   (TS1串行模式)         │     │
│  │   └─ pinctrl-0 = <&dvb_s_ts0_pins>               │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────┬──────────────────────────────────────┘
                       │ 编译时配置
┌──────────────────────▼──────────────────────────────────────┐
│                  产品配置层 (mk 文件)                        │
│  ┌────────────────────────────────────────────────────┐     │
│  │ device/amlogic/ross/ross.mk:103                   │     │
│  │   TUNER_MODULE := cxd2878                         │     │
│  └────────────────────────────────────────────────────┘     │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐     │
│  │ vendor/.../tuner/tuner.mk                         │     │
│  │   根据 TUNER_MODULE 变量:                          │     │
│  │   ├─ 选择 ko 文件路径                             │     │
│  │   ├─ 拷贝到 vendor/lib/modules/                   │     │
│  │   └─ 拷贝 rc 脚本到 vendor/etc/init/              │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、设备树配置详解

### 2.1 dvb-extern 节点（行 238-283）

**作用：** 定义外部解调器（Demod）和调谐器（Tuner）的硬件配置。

```dts
dvb-extern {
    compatible = "amlogic, dvb-extern";
    dev_name = "dvb-extern";
    status = "okay";

    fe_num = <2>;  // 配置2个前端（Frontend）

    // === Frontend 0 配置 ===
    fe0_demod = "cxd2878";                      // Sony CXD2878 解调器
    fe0_i2c_adap_id = <&i2c1>;                  // 使用 I2C1 总线
    fe0_demod_i2c_addr = <0xD8>;                // 解调器 I2C 地址
    fe0_demod_code = <0x6822>;                  // 解调器芯片代码
    fe0_ts = <0>;                               // 输出到 TS0 端口
    fe0_ts_out_mode = <0>;                      // 0: serial, 1: parallel
    fe0_tuner0 = <0>;                           // 使用 tuner0

    // === Frontend 1 配置 ===
    fe1_demod = "cxd2878";
    fe1_i2c_adap_id = <&i2c1>;
    fe1_demod_i2c_addr = <0xDA>;                // 不同的 I2C 地址
    fe1_demod_code = <0x6822>;
    fe1_ts = <1>;                               // 输出到 TS1 端口
    fe1_ts_out_mode = <0>;
    fe1_tuner0 = <1>;                           // 使用 tuner1

    // === Tuner 配置 ===
    tuner_num = <2>;
    tuner0_name = "cxd6866er_tuner";            // Sony CXD6866ER 调谐器
    tuner0_i2c_addr = <0xC0>;
    tuner1_name = "cxd6866er_tuner";
    tuner1_i2c_addr = <0xC2>;                   // 不同的 I2C 地址
};
```

**关键参数说明：**

| 参数 | 说明 |
|------|------|
| `fe_num` | 前端（Frontend）数量，每个前端对应一个独立的 Demod+Tuner 组合 |
| `fe0_demod` | 解调器名称，用于驱动中匹配对应的驱动模块 |
| `fe0_i2c_adap_id` | I2C 总线适配器，通过 phandle 引用 DTS 中的 i2c 节点 |
| `fe0_demod_i2c_addr` | 解调器的 I2C 从设备地址 |
| `fe0_ts` | TS 流输出端口编号（0 或 1）|
| `fe0_ts_out_mode` | TS 输出模式：0=串行，1=并行 |
| `fe0_tuner0` | 关联的 tuner 索引，指向 tuner 配置数组 |

### 2.2 dvb-demux 节点（行 285-311）

**作用：** 定义解复用器（Demux）的配置，负责从 TS 流中提取特定的 PID 数据。

```dts
dvb-demux {
    compatible = "amlogic sc2, dvb-demux";
    dev_name = "dvb-demux";
    status = "okay";

    reg = <0x0 0xfe000000 0x0 0x480000>;    // Demux 硬件寄存器基地址

    dmxdev_num = <0x6>;                      // 最多6个 demux 设备

    tsn_from = "demod";                      // TS 输入来源：demod/local
    tsinb = <2>;                             // TS input bank 数量

    // === TS0 配置 ===
    ts0_sid = <0x10>;                        // Stream ID
    ts0 = "serial-4wire";                    // 串行4线模式
    ts0_control = <0x0>;
    ts0_invert = <0>;

    // === TS1 配置 ===
    ts1_sid = <0x11>;
    ts1 = "serial-4wire";
    ts1_control = <0x0>;
    ts1_invert = <0>;

    // === Pin 配置 ===
    pinctrl-names = "s_ts0", "s_ts1";
    pinctrl-0 = <&dvb_s_ts0_pins>;           // TS0 引脚复用配置
    pinctrl-1 = <&dvb_s_ts1_pins>;           // TS1 引脚复用配置
};
```

**关键参数说明：**

| 参数 | 说明 |
|------|------|
| `dmxdev_num` | Demux 设备数量，每个设备可独立处理一路 TS 流 |
| `tsn_from` | TS 源选择：`demod`(从解调器)、`local`(从内存DMA) |
| `ts0` / `ts1` | TS 接口模式：`serial-4wire`、`serial-3wire`、`parallel` |
| `ts0_sid` | Stream ID，用于硬件层区分不同的 TS 流 |
| `pinctrl-*` | 引脚复用配置，定义在 `&periphs_pinctrl` 节点中（1009-1027行）|

### 2.3 引脚配置（行 1009-1027）

```dts
&periphs_pinctrl {
    dvb_s_ts0_pins: dvb_s_ts0_pins {
        tsin_a {
            groups = "tsin_a_sop",       // Start of Packet
                     "tsin_a_valid",     // Valid signal
                     "tsin_a_clk",       // Clock
                     "tsin_a_d0";        // Data line 0 (串行模式只用d0)
            function = "tsin";
        };
    };

    dvb_s_ts1_pins: dvb_s_ts1_pins {
        tsin_b1 {
            groups = "tsin_b1_sop",
                     "tsin_b1_valid",
                     "tsin_b1_clk",
                     "tsin_b1_d0";
            function = "tsin";
        };
    };
};
```

**TS 串行模式信号线：**
- `tsin_x_sop`: Start of Packet（包起始信号）
- `tsin_x_valid`: Valid（数据有效信号）
- `tsin_x_clk`: Clock（时钟信号）
- `tsin_x_d0`: Data（数据线，串行模式只需一根）

---

## 三、产品配置层（Android Build 系统）

### 3.1 TUNER_MODULE 定义（ross.mk:103）

```makefile
# device/amlogic/ross/ross.mk
TUNER_MODULE := cxd2878
```

**作用：**
1. 声明当前产品使用的 Tuner 模块类型
2. 该变量会传递给 `tuner.mk` 进行条件编译
3. 支持多 tuner 配置（空格分隔）：`TUNER_MODULE := mxl661 si2151`

### 3.2 ko 模块构建逻辑（tuner.mk）

```makefile
# vendor/amlogic/reference/prebuilt/kernel-modules/tuner/tuner.mk

ifneq ($(strip $(TUNER_MODULE)),)

LOCAL_PATH := vendor/amlogic/reference/prebuilt/kernel-modules/tuner

# 根据内核版本选择 ko 文件路径
ifeq ($(TARGET_BUILD_KERNEL_VERSION),5.15)
    ifeq ($(TARGET_BUILD_KERNEL_USING_14_5.15), true)
        # Android 14 + Kernel 5.15
        PRODUCT_COPY_FILES += $(foreach tuner, $(TUNER_MODULE),\
            $(if $(findstring true, $(KERNEL_A32_SUPPORT)),\
                $(LOCAL_PATH)/32/14_5.15/$(tuner)_fe_32.ko:$(PRODUCT_OUT)/obj/lib_vendor/$(tuner)_fe.ko,\
                $(LOCAL_PATH)/64/14_5.15/$(tuner)_fe_64.ko:$(PRODUCT_OUT)/obj/lib_vendor/$(tuner)_fe.ko)\
            $(LOCAL_PATH)/initscripts/$(tuner)_fe.rc:$(TARGET_COPY_OUT_VENDOR)/etc/init/$(tuner)_fe.rc)
    endif
endif

endif
```

**执行流程：**

1. **检查变量**：`TUNER_MODULE` 是否定义
2. **选择路径**：
   - 内核版本：`5.15`
   - Android 版本：`14`（`14_5.15` 目录）
   - 架构：64位 → `64/14_5.15/cxd2878_fe_64.ko`
3. **文件拷贝**：
   ```
   源文件: vendor/amlogic/reference/prebuilt/kernel-modules/tuner/64/14_5.15/cxd2878_fe_64.ko
   目标位置: $(PRODUCT_OUT)/obj/lib_vendor/cxd2878_fe.ko
   最终位置: /vendor/lib/modules/cxd2878_fe.ko （打包到 vendor 分区）
   ```
4. **RC 脚本拷贝**：
   ```
   源文件: vendor/amlogic/reference/prebuilt/kernel-modules/tuner/initscripts/cxd2878_fe.rc
   目标位置: $(TARGET_COPY_OUT_VENDOR)/etc/init/cxd2878_fe.rc
   最终位置: /vendor/etc/init/cxd2878_fe.rc
   ```

**支持的目录结构：**
```
tuner/
├── 32/
│   ├── 13_5.15/       # Android 13 + Kernel 5.15 (32位)
│   ├── 14_5.15/       # Android 14 + Kernel 5.15 (32位)
│   └── 5_4/           # Kernel 5.4 (32位)
├── 64/
│   ├── 13_5.15/       # Android 13 + Kernel 5.15 (64位)
│   ├── 14_5.15/       # Android 14 + Kernel 5.15 (64位) ← 当前使用
│   │   └── cxd2878_fe_64.ko (1.2M)
│   └── 5_4/           # Kernel 5.4 (64位)
└── initscripts/
    └── cxd2878_fe.rc
```

---

## 四、内核驱动层详解

### 4.1 驱动初始化流程（main.c）

```c
// common/common14-5.15/common/common_drivers/drivers/dvb/main.c

static int __init dvb_main_init(void)
{
    pr_debug("### %s() start\n", __func__);
    call_sub_init(aml_dvb_extern_init);    // 初始化外部 Tuner/Demod 管理器
    call_sub_init(aucpu_init);             // 初始化音频CPU
    call_sub_init(dsm_init);               // 初始化 DSM (Descrambler)
    call_sub_init(smc_sc2_mod_init);       // 初始化智能卡
    pr_debug("### %s() end\n", __func__);
    return 0;
}

module_init(dvb_main_init);
```

**初始化顺序：**
1. `aml_dvb_extern_init()` → 外部 Tuner/Demod 驱动框架
2. `aucpu_init()` → 音频处理单元
3. `dsm_init()` → 解扰模块
4. `smc_sc2_mod_init()` → 智能卡接口

### 4.2 外部驱动管理器（aml_dvb_extern_driver.c）

#### 4.2.1 Probe 函数解析

```c
// common/common14-5.15/common/common_drivers/drivers/dvb/aml_dvb_extern_driver.c:1380-1642

static int aml_dvb_extern_probe(struct platform_device *pdev)
{
    // ========== 1. 分配设备结构体 ==========
    dvbdev = kzalloc(sizeof(*dvbdev), GFP_KERNEL);
    platform_set_drvdata(pdev, dvbdev);

    // ========== 2. 创建 sysfs 调试接口 ==========
    dvbdev->class.name = AML_DVB_EXTERN_DEVICE_NAME;  // "aml_dvb_extern"
    dvbdev->class.class_groups = dvb_extern_class_groups;
    class_register(&dvbdev->class);

    // 创建 /sys/class/aml_dvb_extern/tuner_debug
    // 创建 /sys/class/aml_dvb_extern/demod_debug

    // ========== 3. 读取 DTS Tuner 配置 ==========
    ret = of_property_read_u32(pdev->dev.of_node, "tuner_num", &val);
    dvbdev->tuner_num = val;  // 读取到 tuner_num = 2

    for (i = 0; i < dvbdev->tuner_num; ++i) {
        tops = dvb_tuner_ops_create();  // 创建 tuner_ops 结构体

        // 解析 DTS 中的 tunerX_name, tunerX_i2c_addr 等
        ret = aml_get_dts_tuner_config(pdev->dev.of_node, &tops->cfg, i);

        // 获取 I2C adapter
        client = aml_dvb_extern_get_i2c_client(tops->cfg.i2c_addr);
        tops->cfg.i2c_adap = client->adapter;

        // 添加到全局 tuner 链表
        dvb_tuner_ops_add(tops);
    }

    // ========== 4. 读取 DTS Demod 配置 ==========
    ret = of_property_read_u32(pdev->dev.of_node, "fe_num", &val);
    dvbdev->demod_num = val;  // 读取到 fe_num = 2

    for (i = 0; i < dvbdev->demod_num; ++i) {
        dops = dvb_demod_ops_create();

        // 解析 DTS 中的 feX_demod, feX_i2c_adap_id, feX_demod_i2c_addr 等
        ret = aml_get_dts_demod_config(pdev->dev.of_node, &dops->cfg, i);

        // 获取 I2C adapter
        client = aml_dvb_extern_get_i2c_client(dops->cfg.i2c_addr);
        dops->cfg.i2c_adap = client->adapter;

        // 关联 Tuner
        // 读取 fe0_tuner0 = <0> → 关联到 tuner_ops[0]
        snprintf(buf, sizeof(buf), "fe%d_tuner0", i);
        ret = of_property_read_u32(pdev->dev.of_node, buf, &val);
        tops = dvb_tuner_ops_get_byindex(val);
        memcpy(&dops->cfg.tuner0, &tops->cfg, sizeof(struct tuner_config));

        // 添加到全局 demod 链表
        dvb_demod_ops_add(dops);
    }

    // ========== 5. 初始化工作队列 ==========
    INIT_WORK(&dvbdev->resume_work, aml_dvb_extern_resume_work);
    INIT_WORK(&dvbdev->attach_work.work, aml_dvb_extern_attach_work);

    // ========== 6. 电源管理 ==========
    aml_dvb_extern_set_power(&dvbdev->dvb_power, 1);  // 打开 DVB 电源

    return 0;
}
```

**核心数据结构：**

```c
struct dvb_extern_device {
    char *name;                              // "aml_dvb_extern"
    struct device *dev;
    struct class class;                      // sysfs 类

    int tuner_num;                           // tuner 数量 (从 DTS 读取)
    int tuner_cur;                           // 当前使用的 tuner 索引
    struct dvb_frontend *tuner_fe;           // 当前 tuner 的 frontend

    int demod_num;                           // demod 数量 (从 DTS 读取)
    int demod_cur;                           // 当前使用的 demod 索引
    struct dvb_frontend *demod_fe;           // 当前 demod 的 frontend

    struct gpio_config dvb_power;            // DVB 电源 GPIO
    struct work_struct resume_work;          // 恢复工作
    struct aml_attach_work attach_work;      // attach 工作
};

struct tuner_ops {
    int index;                               // tuner 索引
    struct tuner_config cfg;                 // 配置 (来自 DTS)
    struct dvb_frontend fe;                  // DVB 前端接口
    bool attached;                           // 是否已 attach
    bool valid;                              // 是否检测到硬件
    struct list_head list;                   // 链表节点
};

struct demod_ops {
    int index;                               // demod 索引
    struct demod_config cfg;                 // 配置 (来自 DTS)
    struct dvb_frontend *fe;                 // DVB 前端接口
    bool attached;                           // 是否已 attach
    bool registered;                         // 是否已注册到 DVB 核心
    bool valid;                              // 是否检测到硬件
    struct list_head list;                   // 链表节点
};
```

#### 4.2.2 Attach 工作流程

```c
// aml_dvb_extern_driver.c:148-183

void aml_dvb_extern_attach_work(struct work_struct *work)
{
    struct dvb_demod *demod = get_dvb_demods();
    struct demod_ops *demod_ops = NULL;

    mutex_lock(&dvb_extern_mutex);

    // ========== 1. Attach demod 驱动 ==========
    demod->attach(demod, true);       // 调用具体 demod 驱动的 attach 函数
                                      // 例如：cxd2878_attach()

    // ========== 2. 检测硬件 ==========
    demod->detect(demod);             // 通过 I2C 读取芯片 ID 验证硬件存在

    // ========== 3. 注册到 DVB 框架 ==========
    demod->register_frontend(demod, true);  // 创建 /dev/dvb/adapter0/frontend0

    // ========== 4. 预初始化 ==========
    demod->pre_init(demod);           // 芯片初始化序列

    // ========== 5. 设置当前使用的 demod ==========
    dvb_extern_dev->demod_cur = cur_id;
    demod_ops = dvb_demod_ops_get_byindex(dvb_extern_dev->demod_cur);
    dvb_extern_dev->demod_fe = demod_ops->fe;
    demod->used = demod_ops;

    mutex_unlock(&dvb_extern_mutex);
}
```

**调用触发方式：**
1. 内核驱动 probe 时自动调度
2. 用户空间通过 sysfs 触发：
   ```bash
   echo attach 0 > /sys/class/aml_dvb_extern/demod_debug
   ```

### 4.3 Demux 驱动（aml_dvb.c）

```c
// aml_dvb.c:73-89

static void demux_config_pipeline(int cfg_demod_tsn, int cfg_tsn_out)
{
    u32 value = 0;
    int ret = 0;

    // 构造配置值
    value = cfg_demod_tsn;        // bit[0]: demod TS 源选择
    value += cfg_tsn_out << 1;    // bit[1]: TS 输出配置

    // 根据芯片型号写入不同的寄存器
    if (cpu_type == MESON_CPU_MAJOR_ID_S1A)
        WRITE_CBUS_REG(CFG_DEMUX_OFFSET, value);
    else if (cpu_type == MESON_CPU_MAJOR_ID_T5W)
        ret = tee_write_reg_bits(0xff610320, value, 0, 2);  // TEE 安全寄存器
    else
        ret = tee_write_reg_bits(0xfe440320, value, 0, 2);  // SC2/S4/S7D
}
```

**TS 流路由配置：**
- `cfg_demod_tsn`: 选择 demod 输出到哪个 TS 端口
- `cfg_tsn_out`: 配置 TS 输出到 demux 的路由

---

## 五、ko 模块加载机制

### 5.1 RC 脚本内容

```bash
# vendor/amlogic/reference/prebuilt/kernel-modules/tuner/initscripts/cxd2878_fe.rc

on post-fs-data
    insmod /vendor/lib/modules/cxd2878_fe.ko
```

**Android Init 启动阶段：**
1. `early-init`
2. `init`
3. `late-init`
4. `early-fs`
5. `fs`
6. `post-fs`
7. **`post-fs-data`** ← ko 模块在此阶段加载
8. `late-fs`
9. `early-boot`
10. `boot`

**为什么选择 post-fs-data？**
- 此时 `/vendor` 分区已挂载
- `/data` 分区已挂载
- SELinux 策略已加载
- 驱动可以正常访问文件系统和创建设备节点

### 5.2 ko 模块加载流程

```
1. init 进程解析 rc 脚本
   └─> /vendor/etc/init/cxd2878_fe.rc

2. 到达 post-fs-data 阶段
   └─> 执行 insmod /vendor/lib/modules/cxd2878_fe.ko

3. 内核加载 ko 模块
   ├─> 解析 ELF 格式
   ├─> 分配内核内存
   ├─> 符号解析和重定位
   └─> 调用 module_init(cxd2878_init)

4. cxd2878 驱动初始化
   ├─> 注册 I2C driver
   ├─> 提供 dvb_frontend_ops
   │   ├─> .init()
   │   ├─> .sleep()
   │   ├─> .tune()
   │   ├─> .read_status()
   │   └─> ...
   └─> 等待 aml_dvb_extern_driver 调用 attach

5. aml_dvb_extern_driver probe
   ├─> 读取 DTS 配置
   ├─> 创建 tuner_ops / demod_ops
   ├─> 调用 cxd2878_attach()
   │   └─> 分配 struct cxd2878_priv
   │       └─> 初始化 I2C 通信
   └─> 注册到 DVB 核心
       └─> 创建 /dev/dvb/adapter0/frontend0

6. 用户空间可以打开设备
   └─> open("/dev/dvb/adapter0/frontend0", O_RDWR)
```

### 5.3 ko 模块依赖关系

```
cxd2878_fe.ko (外部 Tuner/Demod 驱动)
    │
    ├─ depends on: dvb-core.ko (Linux DVB 框架)
    │   └─ 提供 dvb_register_frontend()
    │
    ├─ depends on: i2c-core.ko (I2C 子系统)
    │   └─ 提供 i2c_transfer()
    │
    └─ used by: aml_dvb_extern.ko (内核内置)
        └─ 调用 cxd2878_attach()
```

**查看依赖：**
```bash
# 在设备上
modinfo /vendor/lib/modules/cxd2878_fe.ko | grep depends

# 输出示例：
depends:        amlogic-dvb,dvb-core
```

---

## 六、ko 模块硬件通信机制

本章节深入分析 ko 模块如何在用户空间、内核驱动和物理硬件之间建立通信桥梁。

### 6.1 核心关联链路

```
用户空间应用
    ↓ open("/dev/dvb/adapter0/frontend0")
字符设备层 (VFS)
    ↓ file_operations->ioctl
DVB 核心框架 (dvb-core.ko)
    ↓ dvb_frontend_ops (函数指针表)
ko 模块 (cxd2878_fe.ko)
    ↓ i2c_transfer()
I2C 控制器驱动 (i2c-meson.c)
    ↓ writel/readl (MMIO)
硬件寄存器 (0xFE066000)
    ↓ SCL/SDA 物理信号
CXD2878 芯片
```

### 6.2 关键关联机制

#### 6.2.1 函数指针表（ops）- 实现多态

ko 模块通过填充标准的 `ops` 结构体向内核提供硬件操作接口：

```c
// ko 模块提供的硬件抽象层
static struct dvb_frontend_ops cxd2878_ops = {
    .info = {
        .name = "Sony CXD2878",
        .type = FE_OFDM,
    },

    // 硬件控制接口（函数指针）
    .init              = cxd2878_init,          // 芯片初始化
    .set_frontend      = cxd2878_set_frontend, // 调谐
    .read_status       = cxd2878_read_status,  // 读锁定状态
    .read_signal_strength = cxd2878_read_strength,
};

// DVB 核心调用（内核内置代码）
static long dvb_frontend_ioctl(struct file *file, unsigned int cmd, ...)
{
    struct dvb_frontend *fe = file->private_data;

    if (fe->ops.set_frontend)
        ret = fe->ops.set_frontend(fe);  // ← 跳转到 ko 模块
}
```

**关键点：** 内核通过函数指针调用 ko 模块，无需知道具体芯片型号，实现了**硬件抽象**。

#### 6.2.2 I2C Adapter 绑定 - 连接硬件总线

从 DTS 配置到硬件寄存器的完整路径：

```
1. DTS 配置
   dvb-extern {
       fe0_i2c_adap_id = <&i2c1>;  // phandle 引用
   };

2. 内核驱动解析（aml_dvb_extern_driver.c:1514-1518）
   client = aml_dvb_extern_get_i2c_client(tops->cfg.i2c_addr);
   tops->cfg.i2c_adap = client->adapter;  // ← 获取 I2C adapter 指针

3. I2C 控制器驱动注册（drivers/i2c/busses/i2c-meson.c）
   struct meson_i2c *i2c;
   i2c->regs = devm_ioremap_resource(&pdev->dev, res);  // 映射寄存器
   i2c->adap.algo = &meson_i2c_algorithm;  // 硬件操作函数
   i2c_add_adapter(&i2c->adap);  // 注册到内核

4. ko 模块使用（cxd2878_fe.ko）
   struct i2c_msg msg = { .addr = 0xD8, .buf = data };
   i2c_transfer(priv->i2c_adap, &msg, 1);  // ← 使用第2步获得的指针

5. 硬件操作（i2c-meson.c）
   writel(0xD8 << 1, i2c->regs + REG_SLAVE_ADDR);  // 写寄存器
   writel(data[0], i2c->regs + REG_DATA);
   writel(CTRL_START, i2c->regs + REG_CTRL);  // 触发传输
```

**关键点：** `i2c_adap` 指针是硬件和驱动之间的**桥梁**，指向实际的硬件控制器。

#### 6.2.3 内存映射（MMIO）- 访问硬件寄存器

```c
// 物理地址到虚拟地址的映射
i2c->regs = devm_ioremap_resource(&pdev->dev, res);
//   物理地址: 0xFE066000 (SoC I2C1 控制器)
//   虚拟地址: i2c->regs (内核地址空间)

// 读写硬件寄存器
writel(value, i2c->regs + offset);  // 写入
status = readl(i2c->regs + offset); // 读取
```

**内存视图：**
```
┌─────────────────────────────────────────┐
│   物理地址空间（SoC 硬件）               │
│   0xFE066000: I2C1 控制器寄存器           │
│     +0x00: CTRL                          │
│     +0x04: SLAVE_ADDR                    │
│     +0x08: DATA                          │
└──────────────────┬──────────────────────┘
                   │ ioremap()
┌──────────────────▼──────────────────────┐
│   内核虚拟地址空间                        │
│   i2c->regs: 映射的虚拟地址               │
│   writel(value, i2c->regs + 0x00)        │
└──────────────────────────────────────────┘
```

### 6.3 用户空间到硬件的完整调用链

以 `ioctl(fd, FE_SET_FRONTEND, ...)` 为例：

```
1. 用户空间
   int fd = open("/dev/dvb/adapter0/frontend0", O_RDWR);
   ioctl(fd, FE_SET_FRONTEND, &params);

2. VFS 层
   do_vfs_ioctl() → file->f_op->unlocked_ioctl()

3. DVB 核心（dvb-core.ko，内核内置）
   dvb_frontend_ioctl()
   └─> fe->ops.set_frontend(fe)  // 函数指针跳转

4. ko 模块（cxd2878_fe.ko）
   cxd2878_set_frontend()
   └─> i2c_transfer(priv->i2c_adap, &msg, 1)

5. I2C 核心（i2c-core.ko，内核内置）
   i2c_transfer()
   └─> adap->algo->master_xfer()  // 函数指针跳转

6. I2C 控制器驱动（i2c-meson.c，内核内置）
   meson_i2c_xfer()
   └─> writel(data, i2c->regs + REG_DATA)

7. 硬件总线
   I2C 控制器产生 SCL/SDA 时序信号

8. CXD2878 芯片
   接收 I2C 数据，更新内部寄存器
```

**时序图：**
```
用户进程                 内核                  硬件
   │                      │                     │
   │──── ioctl() ────────>│                     │
   │                      │                     │
   │                      │── ops.set_frontend ─>│ (ko 模块)
   │                      │                     │
   │                      │<── i2c_transfer() ──│
   │                      │                     │
   │                      │─── writel() ───────>│ (寄存器)
   │                      │                     │
   │                      │                     │──> SCL/SDA
   │                      │                     │    物理信号
   │                      │<─── IRQ ────────────│
   │                      │                     │
   │<──── return ─────────│                     │
```

### 6.4 核心数据结构关联图

```
┌──────────────────────────────────────────────────────────┐
│  用户空间                                                 │
│  fd → /dev/dvb/adapter0/frontend0                        │
└─────────────────────┬────────────────────────────────────┘
                      │ file->private_data
┌─────────────────────▼────────────────────────────────────┐
│  DVB 核心                                                 │
│  struct dvb_frontend *fe                                  │
│    ├─ ops = &cxd2878_ops (ko 模块提供)                   │
│    │   ├─ .init = cxd2878_init                           │
│    │   └─ .set_frontend = cxd2878_set_frontend           │
│    └─ demodulator_priv = struct cxd2878_priv *           │
└─────────────────────┬────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────┐
│  ko 模块 (cxd2878_fe.ko)                                 │
│  struct cxd2878_priv                                      │
│    ├─ i2c_addr = 0xD8                                    │
│    └─ i2c = struct i2c_adapter * ───────┐                │
└─────────────────────────────────────────┼────────────────┘
                                          │
┌─────────────────────────────────────────▼────────────────┐
│  I2C 控制器驱动 (i2c-meson.c)                            │
│  struct i2c_adapter                                       │
│    ├─ algo = &meson_i2c_algorithm                        │
│    │   └─ .master_xfer = meson_i2c_xfer                  │
│    └─ dev_data = struct meson_i2c                        │
│        └─ regs = ioremap(0xFE066000) ────┐               │
└──────────────────────────────────────────┼───────────────┘
                                           │
┌──────────────────────────────────────────▼───────────────┐
│  物理硬件                                                 │
│  0xFE066000: I2C1 寄存器                                  │
│    → SCL/SDA 引脚                                         │
│    → CXD2878 芯片                                         │
└──────────────────────────────────────────────────────────┘
```

### 6.5 关键机制总结

| 机制 | 作用 | 实现方式 |
|------|------|---------|
| **函数指针表** | 硬件抽象，支持不同芯片 | `struct dvb_frontend_ops` |
| **I2C Adapter** | 连接硬件总线 | 从 DTS 获取，通过 `i2c_get_adapter()` |
| **MMIO 映射** | 访问硬件寄存器 | `ioremap()` + `writel/readl` |
| **字符设备** | 用户空间接口 | `/dev/dvb/...` + `file_operations` |
| **中断机制** | 异步通知 | 硬件 IRQ + `wait_for_completion()` |

**ko 模块 vs 内核内置驱动：**

| 特性 | ko 模块 | 内核内置 |
|------|---------|---------|
| 加载时机 | 运行时 insmod | 启动时自动 |
| 内存位置 | 动态分配 | 静态链接 |
| 更新方式 | 替换 .ko 文件 | 重新编译内核 |
| 符号解析 | 动态重定位 | 编译时解析 |

**核心理念：** ko 模块通过**标准接口（ops）**、**指针关联（adapter）**和**内存映射（MMIO）**三种机制，在用户空间、内核框架和物理硬件之间建立了完整的通信链路。

---

## 七、完整数据流图

```
┌──────────────────────────────────────────────────────────────┐
│                        天线信号                               │
└────────────────────┬─────────────────────────────────────────┘
                     │ RF 信号
┌────────────────────▼─────────────────────────────────────────┐
│               Sony CXD6866ER Tuner                           │
│  - I2C 地址: 0xC0 (tuner0), 0xC2 (tuner1)                   │
│  - 功能: RF 调谐、频率选择、AGC                              │
└────────────────────┬─────────────────────────────────────────┘
                     │ IF 中频信号
┌────────────────────▼─────────────────────────────────────────┐
│              Sony CXD2878 Demodulator                        │
│  - I2C 地址: 0xD8 (demod0), 0xDA (demod1)                   │
│  - 功能: 解调、纠错、TS 流输出                                │
│  - 支持标准: DVB-T/T2/C                                      │
└────────────────────┬─────────────────────────────────────────┘
                     │ TS 流 (Serial 4-wire)
                     ├─ tsin_a_sop (包起始)
                     ├─ tsin_a_valid (有效信号)
                     ├─ tsin_a_clk (时钟)
                     └─ tsin_a_d0 (数据)
                     │
┌────────────────────▼─────────────────────────────────────────┐
│                  SoC TS Input (硬件)                         │
│  - TS0 端口 (GPIO 复用: dvb_s_ts0_pins)                      │
│  - TS1 端口 (GPIO 复用: dvb_s_ts1_pins)                      │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────┐
│                SC2 Demux 硬件加速器                           │
│  - 基地址: 0xfe000000                                        │
│  - 功能: PID 过滤、Section 提取、PCR 恢复                     │
│  - 支持最多 6 个独立 demux 设备                               │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────┐
│              aml_dvb.ko (Demux 驱动)                         │
│  - 设备节点: /dev/dvb/adapter0/demux0                        │
│  - 功能: 用户空间 ioctl 接口                                  │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────┐
│           MediaPlayer / LiveTV App                           │
│  - 通过 DVB API 控制 tuner/demux                              │
│  - 接收视频/音频 PES 数据                                     │
└──────────────────────────────────────────────────────────────┘
```

**信号处理路径：**
1. **天线 → Tuner**: RF 信号调谐到指定频率，输出 IF 中频信号
2. **Tuner → Demod**: 解调 IF 信号，还原数字 TS 流
3. **Demod → SoC**: TS 流通过串行接口输入到芯片
4. **SoC → Demux**: 硬件 Demux 进行 PID 过滤
5. **Demux → 驱动**: 内核驱动提供 `/dev/dvb` 接口
6. **驱动 → 应用**: 用户空间应用通过 ioctl 控制和读取数据

---

## 八、关键逻辑总结

### 8.1 从 DTS 到驱动的映射

| DTS 配置 | 内核驱动对应 | 作用 |
|----------|-------------|------|
| `fe_num = <2>` | `dvbdev->demod_num = 2` | 创建 2 个 demod_ops |
| `fe0_demod = "cxd2878"` | `dops->cfg.id = AM_TUNER_CXD2878` | 匹配驱动类型 |
| `fe0_i2c_adap_id = <&i2c1>` | `dops->cfg.i2c_adap = i2c_get_adapter(1)` | I2C 通信 |
| `fe0_demod_i2c_addr = <0xD8>` | `dops->cfg.i2c_addr = 0xD8` | I2C 从地址 |
| `fe0_ts = <0>` | `dops->cfg.ts_out_pin = 0` | TS 输出端口 |
| `fe0_tuner0 = <0>` | `dops->cfg.tuner0 = tuner_ops[0]->cfg` | 关联 tuner |
| `tuner0_i2c_addr = <0xC0>` | `tops->cfg.i2c_addr = 0xC0` | Tuner I2C 地址 |

### 8.2 从 mk 文件到 ko 模块的路径

| 配置 | 值 | 作用 |
|------|---|------|
| `TUNER_MODULE` | `cxd2878` | 指定 tuner 类型 |
| `TARGET_BUILD_KERNEL_VERSION` | `5.15` | 内核版本 |
| `TARGET_BUILD_KERNEL_USING_14_5.15` | `true` | Android 14 |
| `KERNEL_A32_SUPPORT` | `false` | 64位架构 |
| **最终路径** | `64/14_5.15/cxd2878_fe_64.ko` | 选中的 ko 文件 |
| **安装路径** | `/vendor/lib/modules/cxd2878_fe.ko` | 设备上的位置 |
| **RC 脚本** | `/vendor/etc/init/cxd2878_fe.rc` | 自动加载脚本 |

### 8.3 驱动初始化时序

```
时间线：
  │
  ├─ T0: bootloader 加载 kernel
  │
  ├─ T1: kernel 启动，挂载 rootfs
  │
  ├─ T2: init 进程启动
  │
  ├─ T3: 解析 *.rc 文件
  │     └─ 注册 on post-fs-data 触发器
  │
  ├─ T4: 挂载 /vendor 分区
  │
  ├─ T5: 触发 on post-fs-data
  │     └─ insmod /vendor/lib/modules/cxd2878_fe.ko
  │         └─ module_init(cxd2878_init)
  │             └─ i2c_add_driver(&cxd2878_driver)
  │
  ├─ T6: 内核驱动 probe
  │     └─ aml_dvb_extern_probe()
  │         ├─ 读取 DTS 配置
  │         ├─ 创建 tuner_ops / demod_ops
  │         └─ schedule_work(&attach_work)
  │
  ├─ T7: attach 工作执行
  │     └─ aml_dvb_extern_attach_work()
  │         ├─ cxd2878_attach()
  │         ├─ cxd2878_detect()
  │         ├─ dvb_register_frontend()
  │         └─ 创建 /dev/dvb/adapter0/frontend0
  │
  └─ T8: 系统启动完成，LiveTV App 可以使用
```

### 8.4 用户空间交互接口

**设备节点：**
```
/dev/dvb/
├── adapter0/
│   ├── frontend0  → fe0 (demod0 + tuner0)
│   ├── frontend1  → fe1 (demod1 + tuner1)
│   ├── demux0     → 主 demux 设备
│   ├── demux1     → 辅助 demux 设备
│   ├── dvr0       → DVR 录制接口
│   └── ...
```

**Sysfs 调试接口：**
```
/sys/class/aml_dvb_extern/
├── tuner_debug    → 读写 tuner 调试命令
├── demod_debug    → 读写 demod 调试命令
└── dvb_debug      → DVB 子系统调试信息
```

**调试示例：**
```bash
# 查看 tuner 状态
cat /sys/class/aml_dvb_extern/tuner_debug

# Attach tuner0
echo "attach 0" > /sys/class/aml_dvb_extern/tuner_debug

# 初始化为 DVB-T 模式
echo "init 2" > /sys/class/aml_dvb_extern/tuner_debug

# 调谐到 474MHz
echo "tune 474000000" > /sys/class/aml_dvb_extern/tuner_debug

# 查看信号状态
cat /sys/class/aml_dvb_extern/tuner_debug
```

---

## 九、常见问题分析

### 9.1 Tuner 检测失败

**现象：**
```
dmesg | grep dvb
[   10.123] aml_dvb_extern: tuner0 undetected
```

**排查步骤：**
1. **检查 DTS I2C 地址**
   ```bash
   # 扫描 I2C 总线
   i2cdetect -y 1
   # 应该看到 0xc0 或 0xc2
   ```

2. **检查 I2C 时钟配置**
   ```dts
   &i2c1 {
       clock-frequency = <300000>;  // 300KHz
   };
   ```

3. **检查 GPIO 电源**
   ```bash
   # 查看 GPIO 状态
   cat /sys/kernel/debug/gpio
   ```

4. **查看 I2C 通信日志**
   ```bash
   echo 1 > /sys/module/i2c_core/parameters/debug
   dmesg | grep i2c
   ```

### 9.2 TS 流无数据

**现象：**
```bash
cat /dev/dvb/adapter0/dvr0  # 无数据输出
```

**排查步骤：**
1. **检查 TS pin 配置**
   ```bash
   cat /sys/kernel/debug/pinctrl/pinctrl@fe000000/pinmux-pins
   # 应该看到 tsin_a_* 被复用为 tsin 功能
   ```

2. **检查 Demux 路由**
   ```bash
   cat /sys/class/aml_dvb/dmx_setting
   # dmx0 input:input_demod FRONTEND_TS0 sid:0x10
   ```

3. **检查信号锁定**
   ```bash
   cat /sys/class/aml_dvb_extern/demod_debug
   # signal status: Locked
   ```

4. **检查 PID 过滤**
   ```bash
   # 使用 dvbsnoop 或 ffmpeg 测试
   ffmpeg -i /dev/dvb/adapter0/frontend0 -c copy test.ts
   ```

### 9.3 ko 模块加载失败

**现象：**
```
insmod: failed to load cxd2878_fe.ko: Invalid module format
```

**原因分析：**
1. **内核版本不匹配**
   ```bash
   # 检查内核版本
   uname -r
   # 5.15.xxx
   
   # 检查 ko 模块版本
   modinfo /vendor/lib/modules/cxd2878_fe.ko | grep vermagic
   # vermagic: 5.15.xxx SMP preempt mod_unload aarch64
   ```

2. **架构不匹配**
   - 32位 kernel 不能加载 64位 ko
   - 检查 `KERNEL_A32_SUPPORT` 配置

3. **符号未导出**
   ```bash
   # 检查依赖符号
   modprobe --show-depends cxd2878_fe
   ```

**解决方法：**
```makefile
# 在 tuner.mk 中检查路径选择逻辑
ifeq ($(TARGET_BUILD_KERNEL_VERSION),5.15)
    ifeq ($(TARGET_BUILD_KERNEL_USING_14_5.15), true)
        # 确保选择了正确的路径
        $(LOCAL_PATH)/64/14_5.15/cxd2878_fe_64.ko
    endif
endif
```

---

## 十、扩展阅读

### 10.1 Linux DVB API

**主要 ioctl 命令：**
- `FE_SET_FRONTEND`: 设置调谐参数（频率、带宽等）
- `FE_GET_FRONTEND`: 获取当前参数
- `FE_READ_STATUS`: 读取信号状态（锁定、信号强度）
- `FE_READ_BER`: 读取误码率
- `FE_READ_SNR`: 读取信噪比
- `DMX_SET_FILTER`: 设置 PID 过滤器
- `DMX_START`: 启动 demux
- `DMX_STOP`: 停止 demux

**参考文档：**
- https://www.kernel.org/doc/html/latest/userspace-api/media/dvb/

### 10.2 CXD2878 芯片资料

**功能特性：**
- 支持 DVB-T/T2/C 标准
- 集成 AGC、AFC、时钟恢复
- 支持 OFDM 解调
- TS 串行/并行输出
- I2C 控制接口

**寄存器访问：**
```c
// 典型的 I2C 写操作
static int cxd2878_write_regs(struct cxd2878_priv *priv, u8 addr, u8 *data, int len)
{
    struct i2c_msg msg = {
        .addr = priv->i2c_addr,
        .flags = 0,
        .buf = data,
        .len = len
    };
    return i2c_transfer(priv->i2c_adap, &msg, 1);
}
```

### 10.3 Amlogic SC2 Demux 架构

**硬件特性：**
- 支持 6 个独立 demux 设备
- 每个 demux 支持 128 个 PID 过滤器
- 硬件 PCR 恢复
- DMA 直接访问内存
- 支持 TS over IP

**寄存器映射：**
```
0xfe000000 - 0xfe480000: Demux 寄存器空间
  ├─ 0xfe000000: TS input 配置
  ├─ 0xfe100000: PID 过滤表
  ├─ 0xfe200000: Section 过滤
  └─ 0xfe300000: PCR 寄存器
```

---

## 十一、总结

本文档从设备树配置、产品 mk 文件、ko 模块打包到内核驱动加载的完整流程进行了详细分析，核心逻辑链路如下：

```
[DTS 配置] → [内核驱动解析] → [创建 device/driver] → [ko 模块加载]
    → [attach 硬件] → [注册 DVB 设备] → [用户空间访问]
```

**关键要点：**

1. **设备树是硬件配置的唯一来源**
   - demod/tuner 的数量、I2C 地址、TS 端口等都在 DTS 中定义
   - 驱动严格按照 DTS 配置初始化硬件

2. **mk 文件控制编译时的模块选择**
   - `TUNER_MODULE` 变量决定打包哪些 ko 文件
   - 支持多 tuner 同时打包

3. **ko 模块通过 rc 脚本自动加载**
   - 在 `post-fs-data` 阶段执行 `insmod`
   - 模块加载后注册到 I2C 子系统

4. **内核驱动负责 DTS 解析和硬件初始化**
   - `aml_dvb_extern_driver` 管理外部 tuner/demod
   - `aml_dvb` 管理 demux 和 TS 路由

5. **用户空间通过标准 DVB API 访问**
   - `/dev/dvb/adapter0/frontend0` 控制 tuner
   - `/dev/dvb/adapter0/demux0` 接收 TS 数据

**相关文件清单：**
```
DTS:    common/common14-5.15/.../s7d_s905x5m_bm201.dts
Driver: common/common14-5.15/.../drivers/dvb/aml_dvb_extern_driver.c
        common/common14-5.15/.../drivers/dvb/main.c
        common/common14-5.15/.../drivers/dvb/aml_dvb.c
Build:  device/amlogic/ross/ross.mk
        vendor/amlogic/reference/prebuilt/kernel-modules/tuner/tuner.mk
KO:     vendor/amlogic/reference/prebuilt/kernel-modules/tuner/64/14_5.15/cxd2878_fe_64.ko
RC:     vendor/amlogic/reference/prebuilt/kernel-modules/tuner/initscripts/cxd2878_fe.rc
```

---

**文档版本：** v1.0
**作者：** CC老师
**日期：** 2025-11-08
**适用平台：** Amlogic S905X5 / Android U (14) / Kernel 5.15
