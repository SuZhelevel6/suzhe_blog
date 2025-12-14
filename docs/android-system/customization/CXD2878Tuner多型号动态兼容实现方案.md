# CXD2878 Tuner 多型号动态兼容实现方案

## 文档概述

**目标**: 实现单一固件镜像根据硬件Tuner芯片ID自动加载对应的内核模块，兼容CXD2878系列不同型号。

**生成时间**: 2025-11-08
**相关分支**: xxxx-base-22G-BAT-1239A

---

## 一、问题背景

CXD2878系列Tuner芯片存在多个硬件版本：
- **V1版本**: CXD2878、CXD6801(SiP)、CXD6802(SiP)、CXD2879
- **V2版本**: CXD6822(SiP2)、CXD2878A、CXD6821(SiP2)

不同版本需要加载不同的驱动模块（V1和V2不兼容），传统方案需要为每个版本编译独立的固件镜像。本方案通过**运行时检测芯片ID + 动态模块加载**实现单固件支持多型号。

---

## 二、核心实现流程

### 整体架构

```
系统启动
    ↓
内核驱动probe
    ↓
I2C读取芯片ID → 判断版本 → 设置demod_code → 写入sysfs
    ↓
Android Init等待sysfs节点
    ↓
执行加载脚本 → 读取版本号 → 选择ko模块 → insmod加载
    ↓
Tuner就绪
```

### 详细步骤分解

#### **步骤1: 芯片版本检测（内核驱动层）**

**文件**: `common/common14-5.15/common/common_drivers/drivers/dvb/aml_dvb_extern_driver.c`

**新增函数**: `aml_read_cxd2878_chip_version()`

**检测逻辑**:
```c
1. 计算SLVX地址 = (SLVT地址 + 4) / 2
2. 通过I2C写入寄存器0x00 = 0x00（切换到Bank 0）
3. 读取寄存器0xFB获取CHIP_ID[9:8]
4. 读取寄存器0xFD获取CHIP_ID[7:0]
5. 组合成完整的10-bit芯片ID
```

**版本映射表**:
| 芯片ID | 型号 | 版本 |
|--------|------|------|
| 0x396 | CXD2878 / CXD6801(SiP) | V1 |
| 0x197 | CXD6802(SiP) | V1 |
| 0x297 | CXD2879 | V1 |
| 0x19C | CXD6822(SiP2) | V2 |
| 0x39A | CXD2878A / CXD6821(SiP2) | V2 |
| 其他 | Unknown | V1（默认） |

**关键代码位置**: `aml_dvb_extern_driver.c:86-176`

---

#### **步骤2: 动态demod_code配置（Probe阶段）**

**文件**: `common/common14-5.15/common/common_drivers/drivers/dvb/aml_dvb_extern_driver.c`

**调用时机**: `aml_dvb_extern_probe()` 函数中检测到 `AM_DTV_DEMOD_CXD2878` 时

**配置逻辑**:
```c
if (dops->cfg.id == AM_DTV_DEMOD_CXD2878) {
    version = aml_read_cxd2878_chip_version(i2c_adap, i2c_addr);

    if (version == 1) {
        dops->cfg.code = 0x6801;  // V1芯片对应代码
        cxd2878_detected_version = 1;
    } else if (version == 2) {
        dops->cfg.code = 0x6822;  // V2芯片对应代码
        cxd2878_detected_version = 2;
    }
}
```

**全局变量**: `cxd2878_detected_version` 保存检测结果（0=未检测, 1=V1, 2=V2）

**关键代码位置**: `aml_dvb_extern_driver.c:1729-1760`

---

#### **步骤3: 版本信息暴露（Sysfs接口）**

**文件**: `common/common14-5.15/common/common_drivers/drivers/dvb/aml_dvb_extern_driver.c`

**新增sysfs节点**: `/sys/class/aml_dvb_extern/cxd2878_version`

**实现函数**:
```c
static ssize_t cxd2878_version_show(struct class *class,
        struct class_attribute *attr, char *buff)
{
    return sprintf(buff, "%d\n", cxd2878_detected_version);
}
static CLASS_ATTR_RO(cxd2878_version);
```

**返回值**:
- `0`: 尚未检测（初始状态）
- `1`: 检测到V1版本芯片
- `2`: 检测到V2版本芯片
- `-1`: I2C通信错误（保持在全局变量中，sysfs可能显示为其他值）

**关键代码位置**: `aml_dvb_extern_driver.c:1201-1207`, `1470`

---

#### **步骤4: Android Init配置（rc文件）**

**文件**: `vendor/amlogic/reference/prebuilt/kernel-modules/tuner/initscripts/cxd2878_fe.rc`

**原始方案**:
```rc
on post-fs-data
    insmod /vendor/lib/modules/cxd2878_fe.ko  # 固定加载单一模块
```

**新方案**:
```rc
service cxd2878_fe /vendor/bin/sh /vendor/bin/load_cxd2878_module.sh
    class late_start
    user root
    group system
    disabled
    oneshot
    seclabel u:r:vendor_modprobe:s0

on post-fs-data
    wait /sys/class/aml_dvb_extern/cxd2878_version 5  # 等待sysfs节点（超时5秒）
    start cxd2878_fe  # 启动加载脚本服务
```

**改进点**:
1. 使用`wait`命令确保内核驱动probe完成
2. 将模块加载逻辑委托给shell脚本
3. 使用`oneshot`服务确保只执行一次

---

#### **步骤5: 动态加载脚本（用户空间核心逻辑）**

**文件**: `device/amlogic/common/scripts/load_cxd2878_module.sh`

**完整流程**:
```bash
#!/system/bin/sh

SYSFS_VERSION="/sys/class/aml_dvb_extern/cxd2878_version"
MODULE_PATH="/vendor/lib/modules"

# 1. 检查sysfs节点存在性
[ ! -f "$SYSFS_VERSION" ] && exit 1

# 2. 读取版本号
VERSION=$(cat "$SYSFS_VERSION")

# 3. 版本映射 → 模块选择
case "$VERSION" in
    1)
        MODULE="$MODULE_PATH/cxd2878_fe_64_V1.ko"
        ;;
    2)
        MODULE="$MODULE_PATH/cxd2878_fe_64_V2.ko"
        ;;
    0)
        log_error "Version not detected yet (value=0)"
        exit 1
        ;;
    *)
        log_error "Unknown version: $VERSION"
        exit 1
        ;;
esac

# 4. 检查模块文件存在性
[ ! -f "$MODULE" ] && exit 1

# 5. 防重复加载检查
MODULE_NAME=$(basename "$MODULE" .ko)
lsmod | grep -q "^${MODULE_NAME} " && exit 0

# 6. 加载内核模块
insmod "$MODULE"
```

**关键设计**:
- 日志输出到Android logcat（使用`log`命令）
- 完整的错误处理（文件检查、版本校验、加载状态）
- 防止重复加载同一模块

---

#### **步骤6: 构建系统配置（Android.mk集成）**

**文件1**: `vendor/amlogic/reference/prebuilt/kernel-modules/tuner/tuner.mk`

**关键改动**:
```makefile
ifeq ($(strip $(TUNER_MODULE)),cxd2878)
    # 使用PRODUCT_PACKAGES替代PRODUCT_COPY_FILES
    # 原因：防止cleanbuild.go清理动态加载的多个ko文件
    PRODUCT_PACKAGES += \
        cxd2878_fe_64_V1.ko \
        cxd2878_fe_64_V2.ko \
        load_cxd2878_module.sh \
        cxd2878_fe.rc
else
    # 其他tuner使用原有配置
    PRODUCT_COPY_FILES += ...
endif
```

**文件2**: `vendor/amlogic/reference/prebuilt/kernel-modules/tuner/tuner_modules.mk`

**关键改动**:
```makefile
ifeq ($(strip $(TUNER_MODULE)),cxd2878)
    VENDOR_KERNEL_MODULES += \
        $(PRODUCT_OUT)/obj/lib_vendor/cxd2878_fe_64_V1.ko \
        $(PRODUCT_OUT)/obj/lib_vendor/cxd2878_fe_64_V2.ko
else
    VENDOR_KERNEL_MODULES += $(foreach tuner, $(TUNER_MODULE), ...)
endif
```

**改进点**:
- 同时编译V1和V2两个版本的ko模块
- 打包到vendor分区（`/vendor/lib/modules/`）
- 脚本和rc文件也作为package打包

---

## 三、关键文件清单

### 内核驱动层（4个文件）
| 文件路径 | 主要修改 |
|---------|---------|
| `common/common14-5.15/common/common_drivers/drivers/dvb/aml_dvb_extern_driver.h` | 新增`aml_read_cxd2878_chip_version()`函数声明 |
| `common/common14-5.15/common/common_drivers/drivers/dvb/aml_dvb_extern_driver.c` | ① 实现芯片ID读取函数<br>② probe中调用检测并设置demod_code<br>③ 新增sysfs节点`cxd2878_version` |
| `common/common14-5.15/common/common_drivers/drivers/dvb/aml_demod_ops.c` | 增强调试日志输出demod_ops详细信息 |
| `common/common14-5.15/common/common_drivers/drivers/dvb/main.c` | 启用DEBUG宏（增强日志） |

### 用户空间层（2个文件）
| 文件路径 | 作用 |
|---------|------|
| `device/amlogic/common/scripts/load_cxd2878_module.sh` | 动态模块加载脚本（核心逻辑） |
| `vendor/amlogic/reference/prebuilt/kernel-modules/tuner/initscripts/cxd2878_fe.rc` | Android Init配置（服务定义和触发器） |

### 构建系统层（2个文件）
| 文件路径 | 作用 |
|---------|------|
| `vendor/amlogic/reference/prebuilt/kernel-modules/tuner/tuner.mk` | CXD2878特殊处理逻辑（PRODUCT_PACKAGES） |
| `vendor/amlogic/reference/prebuilt/kernel-modules/tuner/tuner_modules.mk` | 编译两个版本ko模块 |

---

## 四、执行时序图

```
系统上电
    ↓
Kernel Boot
    ↓
DVB驱动初始化
    ↓
aml_dvb_extern_probe() 执行
    │
    ├─ 检测到 AM_DTV_DEMOD_CXD2878
    │   ↓
    │   调用 aml_read_cxd2878_chip_version()
    │       ├─ I2C访问SLVX地址
    │       ├─ 读取寄存器0xFB+0xFD
    │       ├─ 解析芯片ID (0x396/0x19C/...)
    │       └─ 返回版本号 (1 或 2)
    │   ↓
    │   设置 demod_code:
    │       - V1 → 0x6801
    │       - V2 → 0x6822
    │   ↓
    │   更新全局变量 cxd2878_detected_version
    │   ↓
    │   创建 sysfs 节点:
    │       /sys/class/aml_dvb_extern/cxd2878_version
    │
    ↓
Android Init启动
    ↓
post-fs-data 阶段
    │
    ├─ wait /sys/class/aml_dvb_extern/cxd2878_version 5
    │       (等待sysfs节点出现，超时5秒)
    │   ↓
    │   start cxd2878_fe (启动oneshot服务)
    │       ↓
    │       执行 /vendor/bin/load_cxd2878_module.sh
    │           ├─ 读取 sysfs 版本号
    │           ├─ 选择ko模块:
    │           │   • VERSION=1 → cxd2878_fe_64_V1.ko
    │           │   • VERSION=2 → cxd2878_fe_64_V2.ko
    │           ├─ 检查模块文件存在性
    │           ├─ 检查是否已加载（防重复）
    │           └─ insmod 加载模块
    │
    ↓
Tuner驱动就绪
```

---

## 五、技术亮点与优势

### 1. **单一固件多型号支持**
- **问题**: 传统方案需为V1/V2编译两套固件镜像
- **方案**: 运行时检测 + 动态加载，一套固件适配所有型号
- **收益**: 简化生产流程，降低维护成本

### 2. **硬件自识别零配置**
- **问题**: 需要手动配置或外部标识芯片型号
- **方案**: 通过I2C读取芯片内部寄存器自动识别
- **收益**: 避免配置错误，提升兼容性

### 3. **内核-用户空间协同设计**
- **内核职责**: 芯片检测 + 版本信息暴露（sysfs）
- **用户空间职责**: 模块选择 + 加载执行
- **优势**: 关注点分离，便于调试和扩展

### 4. **完整的错误处理机制**
- I2C通信失败处理（返回-1）
- sysfs节点超时等待（5秒）
- 模块文件缺失检查
- 重复加载防护

### 5. **可扩展性**
- 新增芯片型号：仅需更新`chip_id`映射表
- 新增版本分支：修改脚本case语句即可

---

## 六、调试与验证方法

推荐命令：`adb shell dmesg | grep -i dvb`

### 1. 查看芯片版本检测结果
```bash
# 方法1: 读取sysfs节点
adb shell cat /sys/class/aml_dvb_extern/cxd2878_version

# 方法2: 查看内核日志
adb shell dmesg | grep -i cxd2878
# 预期输出示例：
# [    5.123456] aml_read_cxd2878_chip_version: Chip ID=0x396, Version=1
# [    5.234567] CXD2878 demod0: version 1 detected, set demod_code from 0x0000 to 0x6801
```

### 2. 确认模块加载状态
```bash
# 查看已加载的模块
adb shell lsmod | grep cxd2878
# 预期输出：
# cxd2878_fe_64_V1    xxxxx  0   (V1芯片)
# 或
# cxd2878_fe_64_V2    xxxxx  0   (V2芯片)
```

### 3. 查看加载脚本日志
```bash
adb logcat -s CXD2878_Loader
# 预期输出示例：
# I CXD2878_Loader: Read CXD2878 version from sysfs: 1
# I CXD2878_Loader: Version 1 detected, loading V1 module
# I CXD2878_Loader: Loading module: /vendor/lib/modules/cxd2878_fe_64_V1.ko
# I CXD2878_Loader: Successfully loaded /vendor/lib/modules/cxd2878_fe_64_V1.ko
```

### 4. 验证demod_code设置
```bash
# 查看DVB设备摘要日志（包含demod配置）
adb shell dmesg | grep -i dvb
```

---

## 七、可能遇到的问题与解决

### 问题1: sysfs节点不存在
**现象**: `/sys/class/aml_dvb_extern/cxd2878_version` 文件不存在

**原因**:
- DVB驱动未成功加载
- demod配置中未启用CXD2878

**解决**:
```bash
# 检查驱动加载状态
adb shell dmesg | grep aml_dvb_extern

# 检查DTS配置
# 确认demod节点中包含 id = <AM_DTV_DEMOD_CXD2878>
```

---

### 问题2: 版本检测返回0
**现象**: `cat /sys/class/aml_dvb_extern/cxd2878_version` 返回0

**原因**:
- I2C通信失败（硬件连接或地址错误）
- probe阶段未执行检测逻辑

**解决**:
```bash
# 查看I2C错误日志
adb shell dmesg | grep -i "i2c"

# 确认I2C地址配置正确（通常为0xC8）
```

---

### 问题3: 脚本执行失败
**现象**: 模块未加载，logcat无输出

**原因**:
- 脚本文件权限不足
- SELinux策略阻止执行

**解决**:
```bash
# 检查脚本权限
adb shell ls -l /vendor/bin/load_cxd2878_module.sh
# 应为 -rwxr-xr-x

# 检查SELinux日志
adb shell dmesg | grep -i avc | grep load_cxd2878

# 临时设置SELinux为宽容模式测试
adb shell setenforce 0
```

---

### 问题4: 模块加载失败
**现象**: insmod返回错误

**原因**:
- ko文件与内核版本不匹配
- 依赖的其他模块未加载

**解决**:
```bash
# 手动加载测试
adb shell insmod /vendor/lib/modules/cxd2878_fe_64_V1.ko

# 查看详细错误信息
adb shell dmesg | tail -20
```

---

## 八、扩展与维护建议

### 1. 新增芯片型号支持
在 `aml_read_cxd2878_chip_version()` 函数中添加映射：
```c
switch (chip_id) {
    case 0xXXX:  // 新芯片ID
        version = 1;  // 或 2，或新版本号
        break;
    // ...
}
```

### 2. 新增版本分支
如需支持V3版本：
1. 编译新的ko模块 `cxd2878_fe_64_V3.ko`
2. 修改脚本添加case分支：
```bash
case "$VERSION" in
    3)
        MODULE="$MODULE_PATH/cxd2878_fe_64_V3.ko"
        ;;
esac
```
3. 更新`tuner.mk`和`tuner_modules.mk`

### 3. 日志优化
建议在生产版本中关闭DEBUG宏：
```c
// main.c
//#define DEBUG  // 注释掉以减少日志输出
```

---

## 九、总结

本方案通过**芯片ID硬件检测 + 内核sysfs暴露 + 用户空间动态加载**的三层架构，实现了CXD2878系列Tuner的自动识别与模块加载。核心优势在于：

1. **零人工干预**: 硬件自识别，无需手动配置
2. **单固件多型号**: 避免维护多套镜像
3. **可靠性高**: 完整的错误处理和防重复机制
4. **易扩展**: 新增型号仅需修改映射表

该方案已应用于`xxxx-base-22G-BAT-1239A`分支，通过硬件验证。

---

## 十、相关资源

**Git仓库**: aml-s905x5-androidu-v2
**分支**: xxxx-base-22G-BAT-1239A
**关键Commit**: (待合并后更新)

**关键代码路径**:
- 内核驱动: `common/common14-5.15/common/common_drivers/drivers/dvb/`
- 加载脚本: `device/amlogic/common/scripts/load_cxd2878_module.sh`
- 构建配置: `vendor/amlogic/reference/prebuilt/kernel-modules/tuner/`

---

