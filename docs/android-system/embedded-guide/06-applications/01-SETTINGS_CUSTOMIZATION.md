# Settings 应用定制指南

> AOSP Settings / TvSettings 定制与遥控器适配
>
> 适用平台: S905X4/S905X5M (S7D) Android 14

<!-- source: Amlogics905x 方案合集.md#L1722-L2060 + 实践经验 -->

---

## 目录

1. [概述](#1-概述)
2. [Settings 与 TvSettings 选择](#2-settings-与-tvsettings-选择)
3. [常见问题修复](#3-常见问题修复)
4. [遥控器适配](#4-遥控器适配)
5. [系统默认值配置](#5-系统默认值配置)
6. [关于页面定制](#6-关于页面定制)

---

## 1. 概述

### 1.1 Settings 应用类型

| 应用 | 包名 | 适用场景 |
|------|------|----------|
| **AOSP Settings** | `com.android.settings` | 平板、手机类设备 |
| **TvSettings** | `com.android.tv.settings` | 电视、机顶盒设备 |
| **DroidTvSettings** | `com.droidlogic.tv.settings` | Amlogic TV 定制 |

### 1.2 文件位置

```
packages/apps/Settings/              # AOSP Settings
packages/apps/TvSettings/            # TvSettings
vendor/amlogic/common/apps/DroidTvSettings/  # Amlogic 定制
```

---

## 2. Settings 与 TvSettings 选择

### 2.1 机顶盒使用 AOSP Settings

若机顶盒项目需要使用 AOSP Settings 而非 TvSettings，需注意遥控器适配问题。

**启用 AOSP Settings**:

```makefile
# device/amlogic/<product>/device.mk

# 移除 TvSettings
PRODUCT_PACKAGES_REMOVE += \
    TvSettings \
    DroidTvSettings

# 添加 AOSP Settings
PRODUCT_PACKAGES += \
    Settings
```

### 2.2 解决与 Launcher 冲突

<!-- source: Amlogics905x 方案合集.md#L1724-L1737 -->

**问题**: 使用自定义 Launcher 后开机卡住

**原因**: Settings 的 `AndroidManifest.xml` 中声明了 `HOME` category

**解决方案**:

```xml
<!-- packages/apps/Settings/AndroidManifest.xml -->

<!-- 注释掉此行 -->
<!-- <category android:name="android.intent.category.HOME" /> -->
```

---

## 3. 常见问题修复

### 3.1 AppBar 返回按键无效

<!-- source: Amlogics905x 方案合集.md#L1739-L1779 -->

**问题**: 遥控器无法点击左上角返回按键

**解决方案** (`packages/apps/Settings/src/com/android/settings/SettingsActivity.java`):

```java
import android.widget.Toolbar;
import java.io.IOException;

// 在 onCreate 或 setupActionBar 中添加
final Toolbar toolbar = findViewById(R.id.action_bar);
toolbar.setNavigationOnClickListener(new View.OnClickListener() {
    @Override
    public void onClick(View v) {
        try {
            Runtime.getRuntime().exec("input keyevent 4");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
});
```

### 3.2 MANAGE STORAGE 按钮无法点击

<!-- source: Amlogics905x 方案合集.md#L1923-L1974 -->

**问题**: 存储页面的"管理存储"按钮遥控器无法聚焦

**解决方案** (`packages/apps/Settings/src/com/android/settings/deviceinfo/storage/StorageSummaryDonutPreference.java`):

```java
@Override
public void onBindViewHolder(PreferenceViewHolder view) {
    super.onBindViewHolder(view);
    // 原为 view.itemView.setClickable(false);
    view.itemView.setClickable(true);
    view.itemView.setOnClickListener(new View.OnClickListener() {
        @Override
        public void onClick(View v) {
            onDeleteHelperButtonClick(v);
        }
    });
    // ...
}

private void onDeleteHelperButtonClick(View v) {
    final Context context = getContext();
    final MetricsFeatureProvider metricsFeatureProvider =
            FeatureFactory.getFactory(context).getMetricsFeatureProvider();
    metricsFeatureProvider.logClickedPreference(this,
            getExtras().getInt(DashboardFragment.CATEGORY));
    metricsFeatureProvider.action(context, SettingsEnums.STORAGE_FREE_UP_SPACE_NOW);
    final Intent intent = new Intent(StorageManager.ACTION_MANAGE_STORAGE);
    context.startActivity(intent);
}
```

---

## 4. 遥控器适配

### 4.1 聚焦框 (Focus Highlight) 适配

<!-- source: Amlogics905x 方案合集.md#L1785-1920 -->

机顶盒产品使用 AOSP Settings 时，许多控件缺少聚焦高亮效果。

**通用解决模式**:

```java
import android.graphics.Color;

@Override
public void onBindViewHolder(PreferenceViewHolder view) {
    super.onBindViewHolder(view);

    final View rootView = view.itemView;
    rootView.setOnFocusChangeListener(new View.OnFocusChangeListener() {
        @Override
        public void onFocusChange(View v, boolean hasFocus) {
            if (hasFocus) {
                rootView.setBackgroundColor(Color.argb(60, 128, 128, 128));
            } else {
                rootView.setBackgroundColor(Color.argb(0, 0, 0, 0));
            }
        }
    });
}
```

### 4.2 需要修改的 Preference 类型

| Preference 类型 | 文件位置 |
|----------------|----------|
| BluetoothDevicePreference | `packages/apps/Settings/src/com/android/settings/bluetooth/BluetoothDevicePreference.java` |
| MasterSwitchPreference | `packages/apps/Settings/src/com/android/settings/widget/MasterSwitchPreference.java` |
| RestrictedPreference | `frameworks/base/packages/SettingsLib/src/com/android/settingslib/RestrictedPreference.java` |
| StorageSummaryDonutPreference | `packages/apps/Settings/src/com/android/settings/deviceinfo/storage/StorageSummaryDonutPreference.java` |

### 4.3 确认键点击适配

**问题**: 某些控件按确认键无响应

**解决方案** (以蓝牙设备为例):

```java
rootView.setOnKeyListener(new View.OnKeyListener() {
    @Override
    public boolean onKey(View v, int keyCode, KeyEvent event) {
        if (event.getKeyCode() == KeyEvent.KEYCODE_ENTER
                || event.getKeyCode() == KeyEvent.KEYCODE_DPAD_CENTER) {
            ImageView imageView = (ImageView) view.findViewById(R.id.settings_button);
            if (imageView != null) {
                imageView.performClick();
            }
        }
        return false;
    }
});
```

---

## 5. 系统默认值配置

### 5.1 defaults.xml 配置

<!-- source: Amlogics905x 方案合集.md#L1984-2060 -->

系统默认设置值在 `frameworks/base/packages/SettingsProvider/res/values/defaults.xml` 中配置。

**常用配置项**:

```xml
<resources>
    <!-- 屏幕设置 -->
    <bool name="def_dim_screen">true</bool>            <!-- 自动关屏 -->
    <integer name="def_screen_off_timeout">30000</integer>  <!-- 睡眠超时 (ms) -->
    <integer name="def_sleep_timeout">-1</integer>     <!-- 休眠时间，-1 为永不 -->
    <integer name="def_screen_brightness">255</integer> <!-- 默认亮度 0-255 -->
    <bool name="def_screen_brightness_automatic_mode">false</bool> <!-- 自动亮度 -->
    <bool name="def_accelerometer_rotation">false</bool> <!-- 自动旋转 -->

    <!-- 网络设置 -->
    <bool name="def_wifi_on">false</bool>              <!-- WiFi 默认关闭 -->
    <bool name="def_bluetooth_on">false</bool>         <!-- 蓝牙默认关闭 -->
    <bool name="def_airplane_mode_on">false</bool>     <!-- 飞行模式默认关闭 -->
    <integer name="def_wifi_sleep_policy">2</integer>  <!-- WiFi 休眠策略: 2=永不 -->

    <!-- 安全设置 -->
    <bool name="def_install_non_market_apps">false</bool> <!-- 允许未知来源应用 -->
    <bool name="def_lockscreen_disabled">false</bool>  <!-- 禁用锁屏 -->

    <!-- 声音设置 -->
    <bool name="def_haptic_feedback">false</bool>      <!-- 触摸反馈 -->
    <integer name="def_lockscreen_sounds_enabled">0</integer> <!-- 锁屏声音: 0=关 -->
    <bool name="def_vibrate_in_silent">true</bool>     <!-- 静音模式震动 -->

    <!-- 时间设置 -->
    <bool name="def_auto_time">true</bool>             <!-- 自动同步时间 -->
    <bool name="def_auto_time_zone">true</bool>        <!-- 自动同步时区 -->

    <!-- 窗口动画 -->
    <fraction name="def_window_animation_scale">100%</fraction>     <!-- 窗口动画 -->
    <fraction name="def_window_transition_scale">100%</fraction>    <!-- 过渡动画 -->
</resources>
```

### 5.2 产品级覆盖

可在产品配置中覆盖默认值：

```makefile
# device/amlogic/<product>/device.mk

PRODUCT_PROPERTY_OVERRIDES += \
    ro.config.ringtone=Ring_Synth_04.ogg \
    ro.config.notification_sound=OnTheHunt.ogg \
    ro.config.alarm_alert=Alarm_Classic.ogg
```

---

## 6. 关于页面定制

### 6.1 设备信息显示

修改关于页面显示的设备信息：

```makefile
# device/amlogic/<product>/device.mk

PRODUCT_PRODUCT_PROPERTIES += \
    ro.product.model=MyDeviceName \
    ro.product.brand=MyBrand \
    ro.product.manufacturer=MyCompany
```

### 6.2 自定义关于页面项

**添加法律信息**:

```xml
<!-- packages/apps/Settings/res/xml/my_device_info.xml -->

<Preference
    android:key="legal_container"
    android:title="@string/legal_information"
    android:fragment="com.android.settings.LegalSettings" />
```

### 6.3 隐藏特定项

```java
// packages/apps/Settings/src/com/android/settings/deviceinfo/aboutphone/MyDeviceInfoFragment.java

@Override
public void displayPreference(PreferenceScreen screen) {
    // 隐藏不需要的项
    Preference pref = screen.findPreference("device_model");
    if (pref != null) {
        screen.removePreference(pref);
    }
}
```

---

## 7. TvSettings 定制

### 7.1 以太网配置

TvSettings 提供了 `EthernetConfigService` 用于 shell 命令配置以太网：

```bash
# 设置 DHCP
am startservice -n com.android.tv.settings/.connectivity.EthernetConfigService \
    --es action set_dhcp \
    --es iface eth0

# 设置静态 IP
am startservice -n com.android.tv.settings/.connectivity.EthernetConfigService \
    --es action set_static \
    --es iface eth0 \
    --es ip 192.168.1.100 \
    --ei prefixLen 24 \
    --es gateway 192.168.1.1 \
    --es dns1 8.8.8.8 \
    --es dns2 8.8.4.4
```

详细参见 [以太网配置指南](02-ETHERNET_CONFIG.md)。

---

## 8. 调试命令集

```bash
# 打开 Settings
am start -n com.android.settings/.Settings

# 打开 TvSettings
am start -n com.android.tv.settings/.MainSettings

# 打开特定设置页
am start -a android.settings.WIFI_SETTINGS
am start -a android.settings.BLUETOOTH_SETTINGS
am start -a android.settings.DEVICE_INFO_SETTINGS

# 查看当前默认 Home
pm resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME

# 清除 Settings 数据
pm clear com.android.settings
```

---

*文档版本: 1.0*
*更新日期: 2025-12-12*
*来源: Amlogics905x 方案合集.md + 实践经验*
