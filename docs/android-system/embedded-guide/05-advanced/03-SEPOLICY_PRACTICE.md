# SEPolicy 实践指南

> SELinux 策略编写与调试
>
> 适用平台: S905X4/S905X5M (S7D) Android 14

<!-- source: 实践经验整合 -->

---

## 目录

1. [概述](#1-概述)
2. [SELinux 基础](#2-selinux-基础)
3. [策略文件结构](#3-策略文件结构)
4. [常见策略编写](#4-常见策略编写)
5. [调试与排错](#5-调试与排错)
6. [最佳实践](#6-最佳实践)

---

## 1. 概述

### 1.1 什么是 SELinux

SELinux (Security-Enhanced Linux) 是 Linux 内核的强制访问控制 (MAC) 安全模块。在 Android 中：

- 限制进程可访问的资源
- 即使是 root 进程也受策略约束
- 提供细粒度的安全控制

### 1.2 为什么需要自定义策略

Amlogic 平台定制开发中，以下场景需要添加 SELinux 策略：

| 场景 | 示例 |
|------|------|
| 访问自定义设备节点 | `/dev/gpio`, `/dev/ir` |
| 读写厂商特定文件 | `/vendor/etc/config.xml` |
| 新增系统服务 | 自定义 HAL 服务 |
| 预装第三方应用 | 需要特殊权限的应用 |

---

## 2. SELinux 基础

### 2.1 核心概念

| 概念 | 说明 | 示例 |
|------|------|------|
| **Subject** | 执行动作的进程 | `system_server`, `mediaserver` |
| **Object** | 被访问的资源 | 文件、设备节点、socket |
| **Action** | 执行的操作 | read, write, open, ioctl |
| **Context** | 安全上下文 | `u:r:system_server:s0` |

### 2.2 安全上下文格式

```
user:role:type:level
```

- **user**: 通常为 `u`
- **role**: 通常为 `r` (进程) 或 `object_r` (文件)
- **type**: 类型标签 (最重要)
- **level**: MLS 级别，通常为 `s0`

**示例**:
```bash
# 查看文件上下文
ls -Z /dev/gpio
# 输出: u:object_r:gpio_device:s0 /dev/gpio

# 查看进程上下文
ps -Z | grep system_server
# 输出: u:r:system_server:s0 ... system_server
```

### 2.3 策略规则语法

```
allow source_type target_type:class { permissions };
```

**示例**:
```te
# 允许 system_app 读取 vendor_file 类型的文件
allow system_app vendor_file:file { read open getattr };
```

---

## 3. 策略文件结构

### 3.1 文件位置

```
device/amlogic/<product>/sepolicy/
├── file_contexts          # 文件/设备节点标签
├── property_contexts      # 系统属性标签
├── service_contexts       # 服务标签
├── hwservice_contexts     # HAL 服务标签
├── genfs_contexts         # 虚拟文件系统标签
├── *.te                   # 策略规则文件
└── vendor/
    └── *.te               # vendor 域策略
```

### 3.2 file_contexts 格式

```
# 路径正则表达式    安全上下文
/dev/gpio          u:object_r:gpio_device:s0
/dev/ir            u:object_r:ir_device:s0
/vendor/etc/config\.xml  u:object_r:vendor_configs_file:s0
```

### 3.3 property_contexts 格式

```
# 属性名模式         安全上下文
vendor.ir.          u:object_r:vendor_ir_prop:s0
vendor.audio.       u:object_r:vendor_audio_prop:s0
```

### 3.4 .te 文件格式

```te
# 定义类型
type gpio_device, dev_type;

# 允许规则
allow system_server gpio_device:chr_file rw_file_perms;

# 类型转换
type_transition init gpio_device:chr_file gpio_device;
```

---

## 4. 常见策略编写

### 4.1 允许访问设备节点

**场景**: system_server 需要访问 `/dev/gpio`

**步骤 1**: 定义设备类型 (file_contexts)
```
/dev/gpio    u:object_r:gpio_device:s0
```

**步骤 2**: 声明类型 (device.te)
```te
# 声明 gpio_device 类型
type gpio_device, dev_type;
```

**步骤 3**: 添加访问规则 (system_server.te)
```te
# 允许 system_server 访问 gpio 设备
allow system_server gpio_device:chr_file { read write open ioctl };
```

### 4.2 允许读写 vendor 文件

**场景**: 应用需要读取 `/vendor/etc/myconfig.xml`

```te
# file_contexts
/vendor/etc/myconfig\.xml    u:object_r:vendor_myconfig_file:s0

# vendor_myconfig.te
type vendor_myconfig_file, vendor_file_type, file_type;

# system_app.te
allow system_app vendor_myconfig_file:file r_file_perms;
```

### 4.3 允许设置系统属性

**场景**: vendor 服务需要设置 `vendor.custom.` 属性

```te
# property_contexts
vendor.custom.    u:object_r:vendor_custom_prop:s0

# property.te
type vendor_custom_prop, property_type;

# myservice.te
set_prop(myservice, vendor_custom_prop)
```

### 4.4 HAL 服务策略

**场景**: 新增 HAL 服务

```te
# hwservice_contexts
vendor.amlogic.hardware.gpio::IGpio    u:object_r:hal_gpio_hwservice:s0

# hal_gpio.te
type hal_gpio, domain;
type hal_gpio_exec, exec_type, vendor_file_type, file_type;

init_daemon_domain(hal_gpio)
hal_server_domain(hal_gpio, hal_gpio)

# 允许访问 hwbinder
hwbinder_use(hal_gpio)
add_hwservice(hal_gpio, hal_gpio_hwservice)

# 允许访问设备
allow hal_gpio gpio_device:chr_file rw_file_perms;
```

### 4.5 预装应用特殊权限

**场景**: 预装应用需要访问特定资源

```te
# 为预装应用定义类型 (可选，复用 system_app 更简单)
# 或在 seapp_contexts 中指定

# 添加到 system_app.te 或创建新的 .te 文件
allow system_app custom_device:chr_file rw_file_perms;
allow system_app vendor_data_file:dir create_dir_perms;
allow system_app vendor_data_file:file create_file_perms;
```

---

## 5. 调试与排错

### 5.1 查看 avc denied 日志

```bash
# 实时查看
adb logcat | grep "avc: denied"

# 导出所有 denied 日志
adb logcat -d | grep "avc: denied" > avc_denied.log

# 示例日志:
# avc: denied { read } for pid=1234 comm="system_server"
# name="gpio" dev="tmpfs" ino=5678
# scontext=u:r:system_server:s0
# tcontext=u:object_r:device:s0
# tclass=chr_file permissive=0
```

### 5.2 解读 avc denied 日志

```
avc: denied { read } for
    pid=1234                          # 进程 ID
    comm="system_server"              # 进程名
    name="gpio"                       # 资源名
    dev="tmpfs"                       # 设备
    ino=5678                          # inode
    scontext=u:r:system_server:s0     # 源上下文 (进程)
    tcontext=u:object_r:device:s0     # 目标上下文 (资源)
    tclass=chr_file                   # 资源类别
    permissive=0                      # 是否 permissive 模式
```

**根据日志生成策略**:
```
allow system_server device:chr_file { read };
```

### 5.3 使用 audit2allow

```bash
# 收集日志并生成策略
adb logcat -d | grep "avc: denied" | audit2allow

# 输出示例:
# #============= system_server ==============
# allow system_server gpio_device:chr_file { read write open };

# 指定 policy 文件进行更精确的分析
audit2allow -p /sys/fs/selinux/policy < avc_denied.log
```

### 5.4 验证策略

```bash
# 编译 sepolicy
mmm device/amlogic/<product>/sepolicy

# 检查策略语法
checkpolicy -M -c 30 policy.conf -o policy.bin

# 搜索规则
sesearch -A -s system_server -t gpio_device policy.bin
```

### 5.5 临时设为 Permissive

开发调试时可临时禁用 SELinux：

```bash
# 运行时切换
adb shell setenforce 0

# 查看状态
adb shell getenforce

# 恢复 Enforcing
adb shell setenforce 1
```

---

## 6. 最佳实践

### 6.1 策略编写原则

1. **最小权限原则**: 只授予必需的权限
2. **避免 neverallow**: 检查是否违反 AOSP 的 neverallow 规则
3. **使用宏**: 利用 `te_macros` 简化策略编写
4. **分模块**: 每个组件一个 .te 文件

### 6.2 常用宏

```te
# 文件权限宏
r_file_perms      # { read getattr open }
rw_file_perms     # { read write getattr open }
create_file_perms # { create rename setattr unlink rw_file_perms }

# 目录权限宏
r_dir_perms       # { read getattr open search }
rw_dir_perms      # { r_dir_perms write add_name remove_name }
create_dir_perms  # { create rw_dir_perms rmdir rename setattr }

# 域转换宏
init_daemon_domain(domain)           # 由 init 启动的服务
app_domain(domain)                   # 应用域
hal_server_domain(domain, hal)       # HAL 服务域

# 属性宏
set_prop(domain, property)           # 设置属性权限
get_prop(domain, property)           # 读取属性权限
```

### 6.3 避免的做法

```te
# ❌ 不要授予过宽的权限
allow system_app self:capability *;

# ❌ 不要使用通配符
allow untrusted_app *:file *;

# ❌ 不要禁用 neverallow
# (这会导致 CTS 失败)
```

### 6.4 调试清单

```bash
# 1. 确认 SELinux 状态
getenforce

# 2. 检查文件上下文
ls -Z <path>

# 3. 检查进程上下文
ps -Z | grep <process>

# 4. 查看 denied 日志
logcat | grep "avc: denied"

# 5. 使用 audit2allow 生成策略
audit2allow < denied.log

# 6. 编译并验证策略
make selinux_policy

# 7. 刷机测试
fastboot flash system system.img
```

---

## 7. 常见问题

### 7.1 neverallow 检查失败

**错误**: `neverallow check failed`

**解决**:
1. 检查是否违反了 AOSP 的安全限制
2. 考虑是否有其他实现方式
3. 确认真的需要该权限

### 7.2 CTS 失败

**问题**: CTS 测试 SELinux 项失败

**检查**:
1. 确保未修改 AOSP 核心策略
2. 检查是否有不当的 permissive 域
3. 验证所有 neverallow 规则通过

### 7.3 服务启动失败

**日志**: `init: Service xxx did not start`

**排查**:
```bash
# 检查 init 启动服务的 SELinux 权限
adb logcat | grep -E "init|avc" | grep <service_name>
```

---

## 8. 附录：资源参考

### 8.1 目录结构

```
system/sepolicy/           # AOSP 基础策略
device/amlogic/common/sepolicy/  # Amlogic 通用策略
device/amlogic/<product>/sepolicy/  # 产品定制策略
```

### 8.2 相关文档

- [Android SELinux 官方文档](https://source.android.com/security/selinux)
- [SELinux Project Wiki](https://selinuxproject.org/page/Main_Page)

---

*文档版本: 1.0*
*更新日期: 2025-12-12*
*来源: 实践经验整合*
