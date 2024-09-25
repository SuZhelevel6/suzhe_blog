# AOSP Settings WIFI随机MAC地址功能

## 背景

最近客户提出了想要实现随机WIFIMAC地址的功能（我们默认WIFI的MAC地址是固定的）。网上搜到了一篇不错的文章，本次改动也是基于这个来写的。

由于客户指定使用的settings是AOSP的，所以在AOSP Settings上改动。

看了一下，其实Amlogic提供的settings在这部分的代码量少多了。更好修改。

[Android11 Wifi Mac地址设置随机或者固定分析_android11 获取wifi mac-CSDN博客](https://blog.csdn.net/wenzhi20102321/article/details/129372629?ops_request_misc=%7B%22request%5Fid%22%3A%22170892734716800213017495%22%2C%22scm%22%3A%2220140713.130102334..%22%7D&request_id=170892734716800213017495&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~sobaiduend~default-2-129372629-null-null.142^v99^pc_search_result_base1&utm_term=WIFI随机MAC地址&spm=1018.2226.3001.4187)

## 一、配置文件属性决定全局开启/关闭WIFI随机MAC

如果是需要固定死开启/关闭WIFI随机MAC，只需要改动下面这个文件就可以了。

frameworks/opt/net/wifi/service/res/values/config.xml

```C
        //WiFi MAC 是否随机设置
    <!-- Indicates that connected MAC randomization is supported on this device -->
    <bool translatable="false" name="config_wifi_connected_mac_randomization_supported">true</bool>

    //AP （一般是投屏） MAC 是否随机设置
    <!-- Indicates that p2p MAC randomization is supported on this device -->
    <bool translatable="false" name="config_wifi_p2p_mac_randomization_supported">false</bool>

    //AP （一般是热点） MAC 是否随机设置
    <!-- Indicates that AP mode MAC randomization is supported on this device -->
    <bool translatable="false" name="config_wifi_ap_mac_randomization_supported">true</bool>
```

不过这样做只能定死，不能随用户心情改动。

这个文件一旦编译完成就不可以更改。

因此需要把这个判断逻辑改掉，不用它判断。

## 二、修改判断逻辑为prop属性

由于我们要新增加一个prop属性，所以写属性的读取属性的方法都要写。

frameworks/opt/net/wifi/service/java/com/android/server/wifi/ClientModeImpl.java

这个函数是判断资源文件中是否随机WIFI MAC的位置

```C
    /**
     * Helper method to check if Connected MAC Randomization is supported - onDown events are
     * skipped if this feature is enabled (b/72459123).
     *
     * @return boolean true if Connected MAC randomization is supported, false otherwise
     */
    public boolean isConnectedMacRandomizationEnabled() {
            return mContext.getResources().getBoolean(                    R.bool.config_wifi_connected_mac_randomization_supported);
    }
```

我们将其修改成判断prop属性：

```C
--- a/frameworks/opt/net/wifi/service/java/com/android/server/wifi/ClientModeImpl.java
+++ b/frameworks/opt/net/wifi/service/java/com/android/server/wifi/ClientModeImpl.java
@@ -153,6 +153,7 @@ import java.util.List;
 import java.util.Set;
 import java.util.concurrent.atomic.AtomicBoolean;
 import java.util.concurrent.atomic.AtomicInteger;
+import android.os.SystemProperties;


@@ -210,6 +211,7 @@ public class ClientModeImpl extends StateMachine {
     protected void log(String s) {
         Log.d(getName(), s);
     }
+    private static final String PROP_MAC_RANDOMIZATION = "persist.mac_randomization_enabled";
     private final WifiMetrics mWifiMetrics;
     private final WifiInjector mWifiInjector;
     private final WifiMonitor mWifiMonitor;
@@ -3334,8 +3336,7 @@ public class ClientModeImpl extends StateMachine {
     public boolean isConnectedMacRandomizationEnabled() {
-        return mContext.getResources().getBoolean(
-                R.bool.config_wifi_connected_mac_randomization_supported);
+           return SystemProperties.getBoolean(PROP_MAC_RANDOMIZATION, false);
     }
```

还有一个地方也涉及到随机WIFI MAC的判断

```C
--- a/frameworks/opt/net/wifi/service/java/com/android/server/wifi/WifiConfigManager.java
+++ b/frameworks/opt/net/wifi/service/java/com/android/server/wifi/WifiConfigManager.java
@@ -75,6 +75,7 @@ import java.util.HashSet;
 import java.util.List;
 import java.util.Map;
 import java.util.Set;
+import android.os.SystemProperties;

 
@@ -329,6 +330,7 @@ public class WifiConfigManager {
     private final NetworkListSharedStoreData mNetworkListSharedStoreData;
     private final NetworkListUserStoreData mNetworkListUserStoreData;
     private final RandomizedMacStoreData mRandomizedMacStoreData;
+    private static final String PROP_MAC_RANDOMIZATION = "persist.mac_randomization_enabled";


@@ -645,10 +647,10 @@ public class WifiConfigManager {
      * Returns whether MAC randomization is supported on this device.
      * @param config
      * @return
+     * modified by suhze 2024.02.19
      */
     private boolean isMacRandomizationSupported() {
-        return mContext.getResources().getBoolean(
-                R.bool.config_wifi_connected_mac_randomization_supported);
+           return SystemProperties.getBoolean(PROP_MAC_RANDOMIZATION, false);
     }
```

我是在同时修改上面两处内容后才成功的。

## 三、在WIFI 详细内容界面增加Switch开关用来开启关闭该功能

packages/apps/Settings/res/xml/wifi_network_details_fragment2.xml

```C
--- a/packages/apps/Settings/res/xml/wifi_network_details_fragment2.xml
+++ b/packages/apps/Settings/res/xml/wifi_network_details_fragment2.xml
@@ -83,6 +83,12 @@
         android:summary="@string/wifi_subscription_summary"
         settings:allowDividerAbove="true"/>

+    <SwitchPreference
+        android:key="random_mac_address_switch"
+        android:title="@string/random_mac_address_title"
+        android:summary="@string/random_mac_address_summary"
+        android:defaultValue="false" />
+
```

这里WIFI 详细内容界面的xml文件是上面这个。

然后我们要在这个界面的具体逻辑代码中进行实现。

```C
--- a/packages/apps/Settings/src/com/android/settings/wifi/details2/WifiNetworkDetailsFragment2.java
+++ b/packages/apps/Settings/src/com/android/settings/wifi/details2/WifiNetworkDetailsFragment2.java
@@ -55,6 +55,10 @@ import java.time.Clock;
 import java.time.ZoneOffset;
 import java.util.ArrayList;
 import java.util.List;
+import android.os.SystemProperties;
+import androidx.preference.SwitchPreference;
+import androidx.preference.Preference;
+import android.os.Bundle;

@@ -75,6 +79,12 @@ public class WifiNetworkDetailsFragment2 extends DashboardFragment implements
     // Interval between initiating SavedNetworkTracker scans
     private static final long SCAN_INTERVAL_MILLIS = 10_000;

+    private WifiManager wifiManager;
+    private SwitchPreference randomMacAddressPreference;
+
+    private static final String PROP_MAC_RANDOMIZATION = "persist.mac_randomization_enabled";
+
+
     @VisibleForTesting
     NetworkDetailsTracker mNetworkDetailsTracker;
     private HandlerThread mWorkerThread;

@@ -134,6 +145,25 @@ public class WifiNetworkDetailsFragment2 extends DashboardFragment implements
         super.onCreateOptionsMenu(menu, inflater);
     }

+    @Override
+    public void onCreate(Bundle savedInstanceState) {
+        super.onCreate(savedInstanceState);
+        wifiManager = (WifiManager) requireContext().getSystemService(Context.WIFI_SERVICE);
+        randomMacAddressPreference = findPreference("random_mac_address_switch");
+
+        if (randomMacAddressPreference != null) {
+        randomMacAddressPreference.setChecked(isMacRandomizationSupported());
+            randomMacAddressPreference.setOnPreferenceChangeListener(new Preference.OnPreferenceChangeListener() {
+                @Override
+                public boolean onPreferenceChange(Preference preference, Object newValue) {
+                    boolean isWifiMacRandomEnabled = (boolean) newValue;
+                    setRandomMacAddress(isWifiMacRandomEnabled);
+                    return true;
+                }
+            });
+        }
+    }
+
     @Override
     public boolean onOptionsItemSelected(MenuItem menuItem) {
         switch (menuItem.getItemId()) {
@@ -218,6 +248,15 @@ public class WifiNetworkDetailsFragment2 extends DashboardFragment implements
         return mControllers;
     }

+    private void setRandomMacAddress(boolean isWifiMacRandomEnabled) {
+        SystemProperties.set(PROP_MAC_RANDOMIZATION, Boolean.toString(isWifiMacRandomEnabled));
+    }
+
+    private boolean isMacRandomizationSupported() {
+        return SystemProperties.getBoolean(PROP_MAC_RANDOMIZATION, false);
+    }
+
```

在代码中搜索的时候我发现有WifiNetworkDetailsFragment2.java和WifiNetworkDetailsFragment.java两个差不多的文件，根据验证我的是WifiNetworkDetailsFragment2.java。

1. 这里我首先添加了setRandomMacAddress和isMacRandomizationSupported方法，用来写入和读取prop属性。
2. 然后在onCreate方法中获取到我们新建的自动连接Switch按钮与属性相绑定。如果没有改属性则写入属性。
3. 在开关的事件监听中改变属性值

## 四、最终现象

默认的效果是WIFI MAC不随机。

在点开我们新加的Switch前也是没有prop属性的。

在打开开关后，新连接的WIFI的MAC地址会随机掉。

在关掉开关后，所有的WIFI MAC地址会变成一样的。

注意，如果你随机到新MAC之后关闭这个开关，那么所有的WIFI MAC都会变成你新随机到的这个，而不是出厂默认MAC