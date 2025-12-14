# 输入设备指南

> 红外遥控器、蓝牙遥控器、LED 指示灯、键盘配置
>
> 适用平台: S905X4/S905X5M (S7D) Android 14

<!-- source: Amlogics905x 方案合集.md#L745-L873, L1445-L1465 -->

---

## 目录

1. [红外遥控器](#1-红外遥控器)
2. [GPIO Key 配置](#2-gpio-key-配置)
3. [ADC Key 配置](#3-adc-key-配置)
4. [LED 指示灯](#4-led-指示灯)
5. [按键映射 (Key Layout)](#5-按键映射-key-layout)
6. [键盘与软键盘](#6-键盘与软键盘)
7. [常见问题](#7-常见问题)

---

## 1. 红外遥控器

### 1.1 红外接收架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         红外遥控器接收架构                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌────────────┐                                                            │
│   │  遥控器    │ ──── 红外信号 ────►                                         │
│   └────────────┘                                                            │
│                        ┌─────────────────────────────────────┐              │
│                        │         硬件层                       │              │
│                        │  ┌───────────┐    ┌──────────────┐  │              │
│                        │  │ IR 接收头  │ → │  GPIO/UART   │  │              │
│                        │  └───────────┘    └──────────────┘  │              │
│                        └─────────────────────────────────────┘              │
│                                       │                                     │
│                        ┌──────────────┴──────────────┐                      │
│                        │         驱动层               │                      │
│                        │  ┌─────────────────────────┐│                      │
│                        │  │ meson-ir (红外驱动)      ││                      │
│                        │  │ - 解码 NEC/RC5/RC6 协议  ││                      │
│                        │  │ - 上报 input event      ││                      │
│                        │  └─────────────────────────┘│                      │
│                        └─────────────────────────────┘                      │
│                                       │                                     │
│                        ┌──────────────┴──────────────┐                      │
│                        │         框架层               │                      │
│                        │  ┌─────────────────────────┐│                      │
│                        │  │ InputManagerService     ││                      │
│                        │  │ + KeyLayout (.kl)       ││                      │
│                        │  │ + KeyCharacterMap (.kcm)││                      │
│                        │  └─────────────────────────┘│                      │
│                        └─────────────────────────────┘                      │
│                                       │                                     │
│                        ┌──────────────┴──────────────┐                      │
│                        │         应用层               │                      │
│                        │  ┌─────────────────────────┐│                      │
│                        │  │ Activity.onKeyDown()    ││                      │
│                        │  │ Activity.onKeyUp()      ││                      │
│                        │  └─────────────────────────┘│                      │
│                        └─────────────────────────────┘                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 设备树配置

红外接收器在设备树中的配置：

```dts
/* common/arch/arm64/boot/dts/amlogic/meson-sc2.dtsi */

ir: ir@8000 {
    compatible = "amlogic, meson-ir";
    reg = <0x0 0xfe084040 0x0 0xA4>,
          <0x0 0xfe084000 0x0 0x20>;
    status = "okay";

    /* 红外协议类型: NEC, RC5, RC6 等 */
    protocol = <REMOTE_TYPE_NEC>;

    /* LED 闪烁配置 */
    led_blink = <1>;           /* 1=启用, 0=禁用 */
    led_blink_frq = <100>;     /* 闪烁频率 (ms) */

    interrupts = <GIC_SPI 22 IRQ_TYPE_EDGE_RISING>;

    /* 按键映射表 */
    map = <&custom_maps>;
    max_frame_time = <200>;
};
```

### 1.3 按键码表配置

按键码表定义红外扫描码到 Linux input code 的映射：

```dts
/* 按键映射示例 */
custom_maps: custom_maps {
    mapnum = <1>;
    map0 = <
        /* 扫描码    Linux Key Code   按键名称 */
        0x140       KEY_POWER       /* 电源 */
        0x118       KEY_MUTE        /* 静音 */
        0x144       KEY_VOLUMEUP    /* 音量+ */
        0x143       KEY_VOLUMEDOWN  /* 音量- */
        0x117       KEY_UP          /* 上 */
        0x11B       KEY_DOWN        /* 下 */
        0x151       KEY_LEFT        /* 左 */
        0x150       KEY_RIGHT       /* 右 */
        0x113       KEY_ENTER       /* 确认 */
        0x11A       KEY_BACK        /* 返回 */
        0x110       KEY_HOME        /* 主页 */
        0x116       KEY_MENU        /* 菜单 */
    >;
};
```

### 1.4 自定义遥控器配置

要添加新的遥控器支持，需要：

1. **获取扫描码**
```bash
# 查看红外扫描码
cat /sys/class/remote/amremote/debug_ir
# 按下遥控器按键，观察输出的扫描码
```

2. **修改设备树**
```dts
/* 在产品 dts 中添加新的遥控器码表 */
&ir {
    map = <&my_remote_map>;
};

my_remote_map: my_remote_map {
    mapnum = <1>;
    map0 = <
        0xYYY    KEY_POWER
        0xXXX    KEY_VOLUMEUP
        /* ... */
    >;
};
```

3. **重新编译内核**
```bash
make dtbimage -j$(nproc)
```

---

## 2. GPIO Key 配置

### 2.1 U-Boot GPIO Power Key 配置

```c
// bootloader/uboot-repo/bl30/src_ao/demos/amlogic/n200/s4/s4_ap222/keypad.c

static const struct gpio_keypad_key gpio_keys[] = {
    { .key_code = KEY_POWER, .gpio = GPIOD_2, .active_level = 0 },
};
```

### 2.2 Kernel 配置

**Kernel Config**:
```kconfig
# common/common_drivers/arch/arm64/configs/amlogic_gki.fragment
CONFIG_AMLOGIC_INPUT=m
CONFIG_AMLOGIC_GPIO_KEY=m
```

**DTS 配置**:
```dts
// common/common_drivers/arch/arm64/boot/dts/amlogic/s4_s905y4_xxx.dts

gpio_keypad {
    compatible = "amlogic,gpio_keypad";
    status = "okay";
    key_num = <1>;                              // GPIO 按键个数
    key_code = <600>;                           // Linux 键值
    key-gpios = <&gpio GPIOD_2 GPIO_ACTIVE_HIGH>;  // GPIO 引脚
    detect_mode = <0>;                          // 0:轮询 1:中断
};
```

**注意事项**:
- GPIO 默认高电平，按下接地 (抬起=1，按下=0)
- 驱动不支持长按，由 Android 检测按下时间实现
- 驱动支持多个 GPIO 按键，但不支持组合按键

### 2.3 调试命令

```bash
# 查看配置信息
cat /sys/class/gpio_keypad/table

# 查看设备信息
cat /proc/bus/input/devices

# 查看 input 事件
getevent
```

---

## 3. ADC Key 配置

### 3.1 U-Boot ADC Power Key 配置

获取 ADC 采样值:
```bash
# U-Boot 下按住 ADC 按键，执行
saradc getval
# 将获取的 10bit 值左移 2 位转为 12bit 值
```

配置文件:
```c
// bootloader/uboot-repo/bl30/src_ao/demos/amlogic/n200/s4/s4_ap222/keypad.c

static const struct adc_keypad_key adc_keys[] = {
    { .key_code = KEY_POWER, .adc_val = 80, .adc_tolerance = 40 },
};
```

### 3.2 Kernel DTS 配置

```dts
// common/common_drivers/arch/arm64/boot/dts/amlogic/s4_s905y4_xxx.dts

adc_keypad {
    compatible = "amlogic,adc_keypad";
    status = "okay";
    io-channels = <&saradc 0>;                  // ADC channel
    key_num = <3>;                              // 按键个数
    key_name = "power", "vol+", "vol-";
    key_code = <116 115 114>;                   // Linux 键值
    key_val = <20 910 630>;                     // ADC 值 (val=voltage/1800mV*1023)
    key_tolerance = <40 40 40>;                 // 误差范围
};
```

**说明**: 作为标准 input 驱动只负责识别按键和上报事件，长按由 Android 上层处理。同一 ADC 通道上的按键不支持组合按键。

### 3.3 调试命令

```bash
# 查看 ADC key 配置
cat /sys/class/adc_keypad/table

# 动态添加/修改 ADC 按键
echo [name]:[code]:[channel]:[value]:[tolerance] > /sys/class/adc_keypad/table
# 示例
echo source:466:0:0:40 > /sys/class/adc_keypad/table

# 删除所有 ADC key
echo null > /sys/class/adc_keypad/table

# Kernel 读取 ADC 电压值
cat /sys/bus/iio/devices/iio:device0/in_voltage0_input

# U-Boot 读取 ADC 电压值
saradc open 0 1
saradc getval
```

---

## 4. LED 指示灯

### 4.1 LED 类型

| LED 类型 | 用途 | 典型 GPIO |
|----------|------|-----------|
| sys_led | 系统状态指示灯 | GPIOD_11 |
| remote_led | 遥控器接收指示灯 | GPIOD_10/GPIOD_4 |
| net_red | 网络状态红灯 | GPIOA_15 |
| net_green | 网络状态绿灯 | GPIOA_14 |

### 4.2 设备树配置

使用 `gpio-leds` 驱动配置 LED：

```dts
/* common/arch/arm64/boot/dts/amlogic/sc2_s905x4_ah212_drm.dts */

gpioleds {
    compatible = "gpio-leds";
    status = "okay";

    /* 系统状态灯 */
    sys_led {
        label = "sys_led";
        gpios = <&gpio GPIOD_11 GPIO_ACTIVE_HIGH>;
        default-state = "on";    /* 开机默认亮 */
    };

    /* 遥控器指示灯 - 收到信号时闪烁 */
    remote_led {
        label = "remote_led";
        gpios = <&gpio GPIOD_4 GPIO_ACTIVE_LOW>;
        default-state = "off";
        linux,default-trigger = "rc_feedback";  /* 红外反馈触发 */
    };

    /* 网络状态灯 - 红 */
    net_red {
        label = "net_red";
        gpios = <&gpio GPIOA_15 GPIO_ACTIVE_LOW>;
        default-state = "on";
    };

    /* 网络状态灯 - 绿 */
    net_green {
        label = "net_green";
        gpios = <&gpio GPIOA_14 GPIO_ACTIVE_HIGH>;
        default-state = "on";
    };
};
```

### 4.3 权限配置

在 init.rc 中配置 LED 节点权限：

```bash
# device/amlogic/common/products/mbox/init.amlogic.system.rc

on boot
    # LED 权限配置
    chmod 0666 /sys/class/leds/sys_led/brightness
    chmod 0666 /sys/class/leds/remote_led/brightness
    chmod 0666 /sys/class/leds/net_green/brightness
    chmod 0666 /sys/class/leds/net_red/brightness
```

### 4.4 控制 LED

```bash
# 控制 LED 开关
echo 1 > /sys/class/leds/sys_led/brightness    # 亮
echo 0 > /sys/class/leds/sys_led/brightness    # 灭

# 查看可用触发器
cat /sys/class/leds/sys_led/trigger

# 设置触发器 (如心跳)
echo heartbeat > /sys/class/leds/sys_led/trigger
```

### 4.5 网络灯支持

启用网络状态指示灯：

```makefile
# device/amlogic/ross/vendor_prop.mk
PRODUCT_PROPERTY_OVERRIDES += \
    ro.vendor.platform.support.network_led=true
```

---

## 5. 按键映射 (Key Layout)

### 5.1 Key Layout 文件结构

```
device/amlogic/common/keyboards/
├── Vendor_0001_Product_0001.kl    # 通用遥控器
├── Vendor_000d_Product_3838.kl    # 特定蓝牙遥控器
├── Generic.kl                      # 通用键盘
└── qwerty.kl                       # QWERTY 键盘
```

### 5.2 KL 文件格式

```
# Vendor_0001_Product_0001.kl
# 格式: key <扫描码> <Android按键名>

key 28    ENTER
key 103   DPAD_UP
key 108   DPAD_DOWN
key 105   DPAD_LEFT
key 106   DPAD_RIGHT
key 116   POWER
key 158   BACK
key 172   HOME
key 139   MENU

# 特殊功能键
key 600   F12              # 蓝牙配对触发键
key 217   SEARCH
key 581   VOICE_ASSIST     # 语音助手
```

### 5.3 常用 Android 按键码

| 按键名 | 说明 | 典型扫描码 |
|--------|------|------------|
| POWER | 电源 | 116 |
| BACK | 返回 | 158 |
| HOME | 主页 | 172 |
| MENU | 菜单 | 139 |
| ENTER | 确认 | 28 |
| DPAD_UP | 上 | 103 |
| DPAD_DOWN | 下 | 108 |
| DPAD_LEFT | 左 | 105 |
| DPAD_RIGHT | 右 | 106 |
| VOLUME_UP | 音量+ | 115 |
| VOLUME_DOWN | 音量- | 114 |
| VOLUME_MUTE | 静音 | 113 |
| VOICE_ASSIST | 语音助手 | 581 |

### 5.4 添加自定义按键

1. **创建或修改 KL 文件**
```bash
# device/amlogic/ross/Vendor_XXXX_Product_YYYY.kl
key 600   F12              # 自定义功能
key 601   APP_SWITCH       # 应用切换
```

2. **添加到产品配置**
```makefile
# device/amlogic/ross/device.mk
PRODUCT_COPY_FILES += \
    $(LOCAL_PATH)/Vendor_XXXX_Product_YYYY.kl:$(TARGET_COPY_OUT_VENDOR)/usr/keylayout/Vendor_XXXX_Product_YYYY.kl
```

3. **确定设备的 Vendor/Product ID**
```bash
# 连接设备后查看
cat /proc/bus/input/devices
# 或
adb shell dumpsys input
```

---

## 6. 键盘与软键盘

### 6.1 外接键盘导致软键盘消失

**问题**: 插上 USB 键盘后，软键盘（输入法）自动隐藏

**解决方案**:

```java
// 在需要软键盘的 Activity 中
@Override
public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);

    // 强制显示软键盘
    if (newConfig.hardKeyboardHidden == Configuration.HARDKEYBOARDHIDDEN_NO) {
        InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
        imm.showSoftInput(editText, InputMethodManager.SHOW_FORCED);
    }
}
```

**系统级修改** (不推荐):

```xml
<!-- frameworks/base/core/res/res/values/config.xml -->
<bool name="config_hardKeyboardBehavior">false</bool>
```

### 6.2 默认输入法配置

```xml
<!-- frameworks/base/packages/SettingsProvider/res/values/defaults.xml -->

<!-- 设置默认输入法 -->
<string name="def_input_method" translatable="false">
    com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME
</string>
```

**查看当前输入法**:
```bash
adb shell ime list -s
```

**切换输入法**:
```bash
adb shell ime set <输入法ID>
```

---

## 7. 常见问题

### Q7.1: 遥控器按键不响应

**排查步骤**:

```bash
# 1. 检查红外驱动是否加载
dmesg | grep -i ir

# 2. 检查 input 设备
cat /proc/bus/input/devices | grep -A 5 "ir"

# 3. 监听按键事件
getevent -l /dev/input/eventX

# 4. 检查扫描码
cat /sys/class/remote/amremote/debug_ir
```

### Q5.2: 按键映射不正确

**检查点**:

1. KL 文件是否正确放置
```bash
ls /vendor/usr/keylayout/
```

2. KL 文件名是否与设备匹配
```bash
# 查看设备 Vendor/Product ID
dumpsys input | grep "Vendor"
```

3. 重启后生效
```bash
adb reboot
```

### Q5.3: LED 不工作

**排查步骤**:

```bash
# 1. 检查 LED 节点是否存在
ls /sys/class/leds/

# 2. 检查 GPIO 配置
cat /sys/kernel/debug/gpio | grep "led"

# 3. 手动测试
echo 1 > /sys/class/leds/sys_led/brightness
```

### Q5.4: 蓝牙遥控器语音功能不工作

**检查点**:

1. 确认 KL 文件中有 `VOICE_ASSIST` 映射
2. 检查麦克风权限
3. 查看语音助手应用是否安装

```bash
# 检查语音按键映射
grep -r "VOICE_ASSIST" /vendor/usr/keylayout/
```

---

## 8. 调试命令集

```bash
# 监听所有输入事件
getevent -l

# 查看特定设备事件
getevent -l /dev/input/event0

# 模拟按键
input keyevent KEYCODE_ENTER
input keyevent 66  # ENTER 的数字码

# 查看 input 设备信息
dumpsys input

# 查看按键映射
dumpsys input | grep -A 20 "KeyLayoutFile"
```

---

*文档版本: 1.0*
*更新日期: 2025-12-12*
*来源: Amlogics905x 方案合集.md*
