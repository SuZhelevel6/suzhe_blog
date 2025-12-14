# 以太网配置指南

> Ethernet IP 配置与网络设置
>
> 适用平台: S905X4/S905X5M (S7D) Android 14

<!-- source: commit fbe9da34987 + 实践经验 -->

---

## 目录

1. [概述](#1-概述)
2. [硬件配置 (PHY/MAC)](#2-硬件配置-phymac)
3. [EthernetConfigService](#3-ethernetconfigservice)
4. [命令行配置](#4-命令行配置)
5. [代码集成](#5-代码集成)
6. [网络调试](#6-网络调试)
7. [高级配置](#7-高级配置)
8. [调试命令集](#8-调试命令集)

---

## 1. 概述

### 1.1 以太网配置方式

| 方式 | 适用场景 | 权限要求 |
|------|----------|----------|
| **TvSettings UI** | 用户手动配置 | 无 |
| **EthernetConfigService** | Shell/应用配置 | `NETWORK_SETTINGS` |
| **EthernetManager API** | 应用代码配置 | `NETWORK_SETTINGS` |

### 1.2 IP 配置模式

| 模式 | 说明 |
|------|------|
| **DHCP** | 自动获取 IP 地址 |
| **STATIC** | 手动指定静态 IP |

---

## 2. 硬件配置 (PHY/MAC)

### 2.1 以太网控制器概述

Amlogic S905X5 支持内置 100M PHY 和外置千兆 PHY：

| PHY 类型 | 速率 | 接口 | 使用场景 |
|----------|------|------|----------|
| **内置 PHY** | 10/100 Mbps | MII | 成本敏感场景 |
| **外置 PHY** | 10/100/1000 Mbps | RGMII | 高性能需求 |

### 2.2 内置 PHY DTS 配置

**设备树配置** (`common/arch/arm64/boot/dts/amlogic/s7d_xxx.dts`):

```dts
// 使用内置 100M PHY
&eth_phy {
    status = "okay";
    internal_phy = <1>;           // 1: 内置PHY, 0: 外置PHY
    phy-mode = "rmii";            // 内置PHY使用 rmii 模式
    phy-handle = <&internal_phy>;
};

&ethmac {
    status = "okay";
    pinctrl-names = "default";
    pinctrl-0 = <&eth_pins>;
    mc_val = <0x11>;
    internal_phy = <1>;

    mdio {
        compatible = "snps,dwmac-mdio";
        #address-cells = <1>;
        #size-cells = <0>;

        internal_phy: ethernet-phy@0 {
            reg = <0>;
            max-speed = <100>;    // 最大速度 100Mbps
        };
    };
};
```

### 2.3 外置千兆 PHY DTS 配置

```dts
// 使用外置 RGMII 千兆 PHY (如 RTL8211F)
&eth_phy {
    status = "okay";
    internal_phy = <0>;           // 使用外置PHY
    phy-mode = "rgmii";
    phy-handle = <&external_phy>;

    // RGMII 时序调整
    tx_delay = <2>;
    rx_delay = <0>;
};

&ethmac {
    status = "okay";
    pinctrl-names = "default";
    pinctrl-0 = <&eth_pins>;
    mc_val = <0x1621>;            // RGMII 模式
    internal_phy = <0>;

    // PHY 复位 GPIO
    phy-reset-gpios = <&gpio GPIOZ_15 GPIO_ACTIVE_LOW>;
    phy-reset-duration = <20>;    // 复位保持时间 (ms)
    phy-reset-post-delay = <100>; // 复位后延迟 (ms)

    mdio {
        compatible = "snps,dwmac-mdio";
        #address-cells = <1>;
        #size-cells = <0>;

        external_phy: ethernet-phy@0 {
            reg = <0>;
            max-speed = <1000>;
        };
    };
};
```

### 2.4 MAC 地址配置

**方法一: U-Boot 环境变量**

```bash
# U-Boot 命令行
setenv ethaddr 00:11:22:33:44:55
saveenv
```

**方法二: 从 Unifykey 读取**

```dts
&ethmac {
    // 从 unifykey 读取 MAC 地址
    mac_addr_source = <2>;  // 0: efuse, 1: local, 2: unifykey
};
```

**方法三: Android 属性**

```bash
# 运行时查看 MAC 地址
cat /sys/class/net/eth0/address

# 通过属性设置 (需要驱动支持)
setprop persist.net.eth0.mac "00:11:22:33:44:55"
```

### 2.5 PHY 调试命令

```bash
# 查看 PHY 状态
cat /sys/class/net/eth0/speed
cat /sys/class/net/eth0/duplex

# 查看链路状态
cat /sys/class/net/eth0/carrier
cat /sys/class/net/eth0/operstate

# 查看 PHY 寄存器 (需要 ethtool)
ethtool eth0
ethtool -d eth0           # 驱动信息
ethtool -S eth0           # 统计信息

# 查看 MDIO 总线
ls /sys/bus/mdio_bus/devices/

# 内核日志查看 PHY 初始化
dmesg | grep -i "ethernet\|phy\|stmmac"
```

---

## 3. EthernetConfigService

<!-- commit: fbe9da34987 -->

TvSettings 提供了 `EthernetConfigService` 服务，支持通过 `am startservice` 命令配置以太网。

### 2.1 服务位置

```
packages/apps/TvSettings/Settings/src/com/android/tv/settings/connectivity/EthernetConfigService.java
```

### 2.2 支持的参数

| 参数 | 说明 | 示例值 |
|------|------|--------|
| `action` | 操作类型 | `set_dhcp`, `set_static` |
| `iface` | 网络接口名 | `eth0` |
| `ip` | IPv4 地址 | `192.168.1.100` |
| `prefixLen` | 子网前缀长度 | `24` |
| `gateway` | 网关地址 | `192.168.1.1` |
| `dns1` | 主 DNS | `8.8.8.8` |
| `dns2` | 备用 DNS (可选) | `8.8.4.4` |

### 2.3 AndroidManifest 注册

```xml
<!-- packages/apps/TvSettings/Settings/AndroidManifest.xml -->

<service
    android:name=".connectivity.EthernetConfigService"
    android:exported="true"
    android:permission="android.permission.NETWORK_SETTINGS">
    <intent-filter>
        <action android:name="com.android.tv.settings.connectivity.ETHERNET_CONFIG"/>
    </intent-filter>
</service>
```

---

## 4. 命令行配置

### 4.1 设置 DHCP 模式

```bash
am startservice -n com.android.tv.settings/.connectivity.EthernetConfigService \
    --es action set_dhcp \
    --es iface eth0
```

### 4.2 设置静态 IP

```bash
# 完整参数示例
am startservice -n com.android.tv.settings/.connectivity.EthernetConfigService \
    --es action set_static \
    --es iface eth0 \
    --es ip 192.168.1.100 \
    --ei prefixLen 24 \
    --es gateway 192.168.1.1 \
    --es dns1 8.8.8.8 \
    --es dns2 8.8.4.4

# 最小参数 (必需)
am startservice -n com.android.tv.settings/.connectivity.EthernetConfigService \
    --es action set_static \
    --es iface eth0 \
    --es ip 192.168.1.100 \
    --ei prefixLen 24 \
    --es gateway 192.168.1.1 \
    --es dns1 8.8.8.8
```

### 4.3 脚本封装示例

```bash
#!/system/bin/sh
# ethernet_config.sh - 以太网配置脚本

IFACE="eth0"
SERVICE="com.android.tv.settings/.connectivity.EthernetConfigService"

set_dhcp() {
    am startservice -n $SERVICE \
        --es action set_dhcp \
        --es iface $IFACE
    echo "Ethernet set to DHCP"
}

set_static() {
    local IP="$1"
    local PREFIX="$2"
    local GW="$3"
    local DNS="$4"

    am startservice -n $SERVICE \
        --es action set_static \
        --es iface $IFACE \
        --es ip "$IP" \
        --ei prefixLen "$PREFIX" \
        --es gateway "$GW" \
        --es dns1 "$DNS"
    echo "Ethernet set to static: $IP/$PREFIX"
}

# 使用示例
# set_dhcp
# set_static 192.168.1.100 24 192.168.1.1 8.8.8.8
```

---

## 5. 代码集成

### 5.1 应用内调用 (Intent)

```java
// 需要 android.permission.NETWORK_SETTINGS 权限

// 设置 DHCP
Intent dhcpIntent = new Intent();
dhcpIntent.setComponent(new ComponentName(
    "com.android.tv.settings",
    "com.android.tv.settings.connectivity.EthernetConfigService"));
dhcpIntent.putExtra("action", "set_dhcp");
dhcpIntent.putExtra("iface", "eth0");
startService(dhcpIntent);

// 设置静态 IP
Intent staticIntent = new Intent();
staticIntent.setComponent(new ComponentName(
    "com.android.tv.settings",
    "com.android.tv.settings.connectivity.EthernetConfigService"));
staticIntent.putExtra("action", "set_static");
staticIntent.putExtra("iface", "eth0");
staticIntent.putExtra("ip", "192.168.1.100");
staticIntent.putExtra("prefixLen", 24);
staticIntent.putExtra("gateway", "192.168.1.1");
staticIntent.putExtra("dns1", "8.8.8.8");
startService(staticIntent);
```

### 5.2 直接使用 EthernetManager API

```java
import android.net.EthernetManager;
import android.net.EthernetNetworkUpdateRequest;
import android.net.IpConfiguration;
import android.net.LinkAddress;
import android.net.StaticIpConfiguration;

// 获取 EthernetManager (需要系统权限)
EthernetManager em = getSystemService(EthernetManager.class);

// 设置 DHCP
IpConfiguration dhcpConfig = new IpConfiguration();
dhcpConfig.setIpAssignment(IpConfiguration.IpAssignment.DHCP);
dhcpConfig.setProxySettings(IpConfiguration.ProxySettings.NONE);

EthernetNetworkUpdateRequest dhcpRequest =
    new EthernetNetworkUpdateRequest.Builder()
        .setIpConfiguration(dhcpConfig)
        .build();
em.updateConfiguration("eth0", dhcpRequest, r -> r.run(), null);

// 设置静态 IP
StaticIpConfiguration.Builder staticBuilder = new StaticIpConfiguration.Builder();
staticBuilder.setIpAddress(new LinkAddress(
    InetAddress.getByName("192.168.1.100"), 24));
staticBuilder.setGateway(InetAddress.getByName("192.168.1.1"));

ArrayList<InetAddress> dnsServers = new ArrayList<>();
dnsServers.add(InetAddress.getByName("8.8.8.8"));
staticBuilder.setDnsServers(dnsServers);

IpConfiguration staticConfig = new IpConfiguration();
staticConfig.setIpAssignment(IpConfiguration.IpAssignment.STATIC);
staticConfig.setProxySettings(IpConfiguration.ProxySettings.NONE);
staticConfig.setStaticIpConfiguration(staticBuilder.build());

EthernetNetworkUpdateRequest staticRequest =
    new EthernetNetworkUpdateRequest.Builder()
        .setIpConfiguration(staticConfig)
        .build();
em.updateConfiguration("eth0", staticRequest, r -> r.run(), null);
```

### 5.3 权限配置

应用需要在 `AndroidManifest.xml` 中声明权限：

```xml
<uses-permission android:name="android.permission.NETWORK_SETTINGS" />
```

> ⚠️ **注意**: `NETWORK_SETTINGS` 是系统级权限，普通应用无法获取。需要：
> - 应用签名为系统签名，或
> - 应用安装为 priv-app，或
> - 在 `privapp-permissions.xml` 中授权

---

## 6. 网络调试

### 6.1 查看网络状态

```bash
# 查看网络接口
ip addr show eth0
ifconfig eth0

# 查看路由表
ip route

# 查看 DNS 配置
getprop net.dns1
getprop net.dns2

# 查看以太网状态
dumpsys ethernet
```

### 6.2 测试网络连通性

```bash
# Ping 测试
ping -c 4 8.8.8.8
ping -c 4 www.google.com

# 查看延迟
traceroute 8.8.8.8
```

### 6.3 查看 EthernetConfigService 日志

```bash
# 查看服务日志
adb logcat -s EthernetConfigService

# 查看以太网相关日志
adb logcat | grep -E "Ethernet|eth0"
```

### 6.4 常见问题排查

**问题 1: 服务启动失败**

```
Error: Permission Denial: not allowed to start service
```

**解决**: 确保调用方具有 `NETWORK_SETTINGS` 权限

**问题 2: 配置不生效**

1. 检查接口名是否正确 (通常是 `eth0`)
2. 检查网线是否连接
3. 查看 logcat 中的错误信息

```bash
# 检查接口状态
cat /sys/class/net/eth0/operstate
# 应为 "up"

# 检查 carrier 状态
cat /sys/class/net/eth0/carrier
# 应为 "1"
```

**问题 3: 静态 IP 无法访问外网**

1. 检查子网掩码 (prefixLen) 是否正确
2. 检查网关是否可达
3. 检查 DNS 配置

```bash
# 验证网关可达
ping -c 2 192.168.1.1

# 验证 DNS 可用
nslookup google.com 8.8.8.8
```

---

## 7. 高级配置

### 7.1 开机自动配置

通过 init.rc 在开机时配置以太网：

```rc
# device/amlogic/<product>/init.device.rc

on property:sys.boot_completed=1
    # 设置静态 IP
    exec - root root -- /system/bin/am startservice \
        -n com.android.tv.settings/.connectivity.EthernetConfigService \
        --es action set_static \
        --es iface eth0 \
        --es ip 192.168.1.100 \
        --ei prefixLen 24 \
        --es gateway 192.168.1.1 \
        --es dns1 8.8.8.8
```

### 7.2 通过属性触发配置

```rc
# 监听属性变化触发配置
on property:persist.net.eth0.mode=static
    exec - root root -- /system/bin/am startservice \
        -n com.android.tv.settings/.connectivity.EthernetConfigService \
        --es action set_static \
        --es iface eth0 \
        --es ip ${persist.net.eth0.ip} \
        --ei prefixLen ${persist.net.eth0.prefix} \
        --es gateway ${persist.net.eth0.gw} \
        --es dns1 ${persist.net.eth0.dns}

on property:persist.net.eth0.mode=dhcp
    exec - root root -- /system/bin/am startservice \
        -n com.android.tv.settings/.connectivity.EthernetConfigService \
        --es action set_dhcp \
        --es iface eth0
```

---

## 8. 调试命令集

```bash
# 接口管理
ip link set eth0 up/down
ifconfig eth0 up/down

# IP 配置
ip addr add 192.168.1.100/24 dev eth0
ip addr del 192.168.1.100/24 dev eth0

# 路由配置
ip route add default via 192.168.1.1 dev eth0
ip route del default

# DNS 配置 (临时)
setprop net.dns1 8.8.8.8
setprop net.dns2 8.8.4.4

# 服务状态
dumpsys ethernet

# 日志查看
logcat -s EthernetConfigService EthernetManager
```

---

*文档版本: 1.0*
*更新日期: 2025-12-12*
*来源: commit fbe9da34987 + 实践经验*
