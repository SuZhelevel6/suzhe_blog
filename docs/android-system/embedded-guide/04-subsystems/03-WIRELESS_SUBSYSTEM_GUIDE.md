# 无线子系统指南

> WiFi、蓝牙配置与定制
>
> 适用平台: S905X4/S905X5M (S7D) Android 14

<!-- source: Amlogics905x 方案合集.md#L1643-L1720, L706-L743 + git log -->

---

## 目录

1. [WiFi 子系统](#1-wifi-子系统)
2. [蓝牙子系统](#2-蓝牙子系统)
3. [模块配置与裁剪](#3-模块配置与裁剪)
4. [常见问题](#4-常见问题)

---

## 1. WiFi 子系统

### 1.1 WiFi 模块架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WiFi 子系统架构                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                     Application Layer                                │  │
│   │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐  │  │
│   │  │   Settings   │  │ WifiManager  │  │   Third-party Apps        │  │  │
│   │  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────────┘  │  │
│   └─────────┼─────────────────┼──────────────────────┼──────────────────┘  │
│             │                 │                      │                     │
│   ┌─────────┴─────────────────┴──────────────────────┴──────────────────┐  │
│   │                     Framework Layer                                  │  │
│   │  ┌──────────────────────────────────────────────────────────────┐   │  │
│   │  │ WifiServiceImpl → ClientModeImpl → WifiNative → wpa_supplicant│  │  │
│   │  └──────────────────────────────────────────────────────────────┘   │  │
│   └────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│   ┌────────────────────────────────┴───────────────────────────────────┐   │
│   │                        HAL Layer                                    │   │
│   │  ┌──────────────────────────────────────────────────────────────┐  │   │
│   │  │              android.hardware.wifi (HIDL/AIDL)                │  │   │
│   │  └──────────────────────────────────────────────────────────────┘  │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│   ┌────────────────────────────────┴───────────────────────────────────┐   │
│   │                        Driver Layer                                 │   │
│   │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │   │
│   │  │  Realtek   │  │  Broadcom  │  │   QCA      │  │  Amlogic W1  │  │   │
│   │  │ rtl8822cs  │  │  ap6398s   │  │  qca6174   │  │              │  │   │
│   │  └────────────┘  └────────────┘  └────────────┘  └──────────────┘  │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 WiFi 默认状态配置

控制 WiFi 开机时的默认状态：

```xml
<!-- frameworks/base/packages/SettingsProvider/res/values/defaults.xml -->

<!-- WiFi 默认开启 -->
<bool name="def_wifi_on">true</bool>

<!-- WiFi 默认关闭 -->
<bool name="def_wifi_on">false</bool>
```

### 1.3 WiFi 配置文件存储

| 文件 | 路径 | 内容 |
|------|------|------|
| WiFi 配置 | `/data/misc/apexdata/com.android.wifi/WifiConfigStore.xml` | 保存的 WiFi 网络列表 |
| 热点配置 | `/data/misc/apexdata/com.android.wifi/WifiConfigStoreSoftAp.xml` | 热点设置 |

### 1.4 WiFi 连接流程

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         WiFi 连接流程                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. WifiSettings.java                                                    │
│     └─► submit() → connect()                                             │
│                     │                                                    │
│  2. WifiManager.java                                                     │
│     └─► connect() → connectInternal() ─► WifiService                     │
│                                           │                              │
│  3. WifiServiceImpl.java                                                 │
│     └─► connect() → ClientModeImpl / QtiClientModeImpl                   │
│                     │                                                    │
│  4. ClientModeImpl.java (状态机)                                          │
│     └─► WifiConfigManager.addOrUpdateNetwork()                           │
│     └─► CMD_CONNECT_NETWORK                                              │
│     └─► 计分器打分 → 获取 MAC → 启动 IPClient                             │
│     └─► connectToNetwork()                                               │
│                     │                                                    │
│  5. WifiNative.java                                                      │
│     └─► wpa_supplicant (Native)                                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**关键代码路径**:

| 组件 | 路径 |
|------|------|
| WifiSettings | `packages/apps/Settings/src/com/android/settings/wifi/WifiSettings.java` |
| WifiManager | `frameworks/base/wifi/java/android/net/wifi/WifiManager.java` |
| WifiServiceImpl | `frameworks/opt/net/wifi/service/java/com/android/server/wifi/WifiServiceImpl.java` |
| ClientModeImpl | `frameworks/opt/net/wifi/service/java/com/android/server/wifi/ClientModeImpl.java` |

### 1.5 WiFi 随机 MAC 地址

Android 10+ 默认启用随机 MAC 地址功能。如需禁用：

```xml
<!-- frameworks/base/packages/SettingsProvider/res/values/defaults.xml -->
<integer name="def_wifi_enhanced_mac_randomization">0</integer>
```

或在 Settings 中：设置 → 网络 → WiFi → 选择网络 → 隐私 → 使用设备 MAC

---

## 2. 蓝牙子系统

### 2.1 蓝牙遥控器配对界面

实现开机自动弹出蓝牙配对界面：

#### 配置系统属性

```makefile
# device/amlogic/ross/vendor_prop.mk
PRODUCT_PROPERTY_OVERRIDES += \
    ro.vendor.need.btsetup=true \
    ro.vendor.autoconnectbt.nameprefix=XXX
```

| 属性 | 说明 |
|------|------|
| `ro.vendor.need.btsetup` | 是否需要蓝牙配对向导 |
| `ro.vendor.autoconnectbt.nameprefix` | 自动连接的蓝牙设备名前缀 |

#### 实现流程

1. **按键映射** - 定义 F12 触发配对界面

```
# device/amlogic/common/keyboards/Vendor_0001_Product_0001.kl
key 600    F12
```

2. **监听 F12 按键**

```java
// frameworks/base/services/core/java/com/android/server/policy/PhoneWindowManager.java
// 监听 F12 键，长按触发蓝牙配对
```

3. **定义广播**

```xml
<!-- AndroidManifest.xml -->
<receiver android:name=".BluetoothRePairReceiver">
    <intent-filter>
        <action android:name="com.xxx.ACTION.SHOW_BT_PAIR_GUIDE"/>
    </intent-filter>
</receiver>
```

4. **启动配对界面**

```java
// FastBootComplete.java - 开机检查
if (SystemProperties.getBoolean("ro.vendor.need.btsetup", false)) {
    // 启动蓝牙配对界面
    startBtSetupActivity();
}
```

### 2.2 蓝牙驱动裁剪

<!-- commit: dd8209a77b2 -->

禁用未使用的 Amlogic 蓝牙驱动：

```makefile
# hardware/amlogic/bluetooth/Makefile (5.15 内核)
# 注释掉不需要的驱动
# obj-y += sdio/
# obj-y += usb/
# obj-y += w1u/
# obj-y += w2l/
```

---

## 3. 模块配置与裁剪

### 3.1 WiFi 模块配置

<!-- commit: 4d3c2f74a5f, dd8209a77b2 -->

```makefile
# device/amlogic/ross/wifibt.build.config.mk

########################################################################
# CONFIG_WIFI_MODULES 支持的模块列表:
# ap6181 ap6335 ap6234 ap6255 ap6271 ap6212 ap6354 ap6356 ap6398s ap6275s
# bcm43751_s bcm43458_s bcm4358_s ap6269 ap62x8 ap6275p ap6275hh3
# qca6174 w1 rtl8723du rtl8723bu rtl8821cu rtl8822cu rtl8822cs rtl8852bs
# sd8987 mt7661 mt7668u
########################################################################

# 指定需要编译的 WiFi 模块
CONFIG_WIFI_MODULES ?= ap6398s rtl8822cs rtl8852bs

# 禁用 multiwifi (编译所有模块)
MULTI_WIFI := false
```

**获取最新支持列表**:
```bash
cd vendor/amlogic/common/wifi_bt/wifi/tools && make get_modules
```

### 3.2 各产品 WiFi 配置示例

| 产品 | CONFIG_WIFI_MODULES | 说明 |
|------|---------------------|------|
| ross | `rtl8822cs rtl8852bs` | Realtek 双模块 |
| raman | `ap6398s rtl8822cs` | Broadcom + Realtek |
| ohm | `ap6398s rtl8822cs w1` | 支持 Amlogic W1 |

### 3.3 WiFi 模块配置文件路径

```
device/amlogic/<product>/
├── wifibt.build.config.mk          # WiFi/BT 编译配置
├── wifi/
│   └── wpa_supplicant_overlay.conf # wpa_supplicant 配置覆盖
└── bluetooth/
    └── bt_vendor.conf              # 蓝牙厂商配置
```

---

## 4. 常见问题

### Q4.1: WiFi 无法扫描到网络

**排查步骤**:

```bash
# 1. 检查 WiFi 驱动是否加载
lsmod | grep -E "wifi|88|bcm|qca"

# 2. 检查 WiFi 接口
ip link show wlan0

# 3. 检查 wpa_supplicant 状态
ps -A | grep wpa_supplicant

# 4. 查看 WiFi 日志
adb logcat -s WifiService WifiNative wpa_supplicant
```

### Q4.2: 蓝牙无法发现设备

**排查步骤**:

```bash
# 1. 检查蓝牙服务状态
dumpsys bluetooth_manager | head -50

# 2. 检查蓝牙 HAL
dumpsys android.hardware.bluetooth@1.0::IBluetoothHci

# 3. 查看蓝牙日志
adb logcat -s bt_btif bluetooth
```

### Q4.3: WiFi 连接后无法上网

**可能原因**:
1. DNS 配置问题
2. 网关不可达
3. IP 地址冲突

**排查命令**:
```bash
# 检查网络配置
ip addr show wlan0
ip route show

# 检查 DNS
getprop | grep dns

# ping 测试
ping -c 3 8.8.8.8
ping -c 3 www.baidu.com
```

### Q4.4: 蓝牙遥控器配对失败

**检查点**:
1. 遥控器电池是否充足
2. 蓝牙服务是否正常运行
3. 设备名前缀是否匹配 `ro.vendor.autoconnectbt.nameprefix`

```bash
# 查看已配对设备
dumpsys bluetooth_manager | grep "Bonded devices"

# 查看蓝牙配置
getprop | grep bluetooth
```

---

## 5. 调试命令集

### WiFi 调试

```bash
# 开关 WiFi
svc wifi enable
svc wifi disable

# 查看 WiFi 状态
dumpsys wifi | head -100

# 查看连接信息
dumpsys connectivity | grep -A 20 "NetworkAgentInfo"

# 扫描网络
wpa_cli -i wlan0 scan
wpa_cli -i wlan0 scan_results
```

### 蓝牙调试

```bash
# 开关蓝牙
svc bluetooth enable
svc bluetooth disable

# 查看蓝牙状态
dumpsys bluetooth_manager

# 查看配对设备
settings get secure bluetooth_address
```

---

*文档版本: 1.0*
*更新日期: 2025-12-12*
*来源: Amlogics905x 方案合集.md + git log*
