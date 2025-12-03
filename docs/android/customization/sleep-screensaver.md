# Android 系统设置中的休眠和屏保

由于客户在Android 系统设置中发现Timeout设置项没有效果，因此我对此研究了一下。Timeout是定时屏幕亮度降低，而Dream则是进入屏幕保护。
如果是机顶盒等设备的开发者发现这个设置项没用，别见外，因为这里的亮度调整对TV是没用的，因此 **Screen Timeout** 和**brightness** 是没用的。

## Timeout休眠

### 界面代码

效果：设置固定的时间之后根据根据用户活动的时间、设备的电源政策（如 `mDisplayPowerRequest.policy`），以及当前时间来决定设备是保持亮屏、降低亮度还是进入其他省电状态。

代码位置：

packages/apps/Settings/res/xml/display_settings.xml

```Java
    <!-- Cross-listed item, if you change this, also change it in power_usage_summary.xml -->
    <com.android.settings.display.TimeoutListPreference
        android:key="screen_timeout"
        android:title="@string/screen_timeout"
        android:summary="@string/summary_placeholder"
        android:entries="@array/screen_timeout_entries"
        android:entryValues="@array/screen_timeout_values"//当点击的时候弹出的listView显示的内容
        settings:keywords="@string/keywords_screen_timeout" />//listView显示的内容对应的时间
```

这是这个设置项的资源配置文件，它是一个ListPreference 具有七个设置项，具体设置项的代码如下：

packages/apps/Settings/res/values/arrays.xml

```Java
    //这里是展示出来的字符
    <!-- Display settings.  The delay in inactivity before the screen is turned off. These are shown in a list dialog. -->
    <string-array name="screen_timeout_entries">
        <item>15 seconds</item>
        <item>30 seconds</item>
        <item>1 minute</item>
        <item>2 minutes</item>
        <item>5 minutes</item>
        <item>10 minutes</item>
        <item>30 minutes</item>
    </string-array>
    
    //这里是具体的数值
    <!-- Do not translate. -->
    <string-array name="screen_timeout_values" translatable="false">
        <!-- Do not translate. -->
        <item>15000</item>
        <!-- Do not translate. -->
        <item>30000</item>
        <!-- Do not translate. -->
        <item>60000</item>
        <!-- Do not translate. -->
        <item>120000</item>
        <!-- Do not translate. -->
        <item>300000</item>
        <!-- Do not translate. -->
        <item>600000</item>
        <!-- Do not translate. -->
        <item>1800000</item>
    </string-array>
```

它的国际化适配是在每一个语言文件夹下的arrays.xml都定义了一个screen_timeout_entries。因此如果要增加一个新的设置项比如“Never”那么就需要在所有可能使用的语言下都加上，否则切换语言之后可能会空指针异常。

### 属性值

这里选择之后，属性值的改变是`Settings.System.SCREEN_OFF_TIMEOUT`

```Java
adb shell settings get System screen_off_timeout
```

在你改变screen_timeout_values值的时候，记得如果想要永不息屏，就设置为2147483647 。这是可以设置的最大值。

### 延时降低亮度的具体逻辑

延时降低亮度的具体的逻辑基本都在frameworks/base/services/core/java/com/android/server/power/PowerManagerService.java

```Java
电源省电策略：
    /** Get wake lock summary flags that correspond to the given wake lock. */
    private int getWakeLockSummaryFlags(WakeLock wakeLock) {
        switch (wakeLock.mFlags & PowerManager.WAKE_LOCK_LEVEL_MASK) {
            case PowerManager.PARTIAL_WAKE_LOCK:
                if (!wakeLock.mDisabled) {
                    // We only respect this if the wake lock is not disabled.
                    return WAKE_LOCK_CPU;
                }
                break;
            case PowerManager.FULL_WAKE_LOCK:
                return WAKE_LOCK_SCREEN_BRIGHT | WAKE_LOCK_BUTTON_BRIGHT;
            case PowerManager.SCREEN_BRIGHT_WAKE_LOCK:
                return WAKE_LOCK_SCREEN_BRIGHT;
            case PowerManager.SCREEN_DIM_WAKE_LOCK:
                return WAKE_LOCK_SCREEN_DIM;
            case PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK:
                return WAKE_LOCK_PROXIMITY_SCREEN_OFF;
            case PowerManager.DOZE_WAKE_LOCK:
                return WAKE_LOCK_DOZE;
            case PowerManager.DRAW_WAKE_LOCK:
                return WAKE_LOCK_DRAW;
        }
        return 0;
    }
    private void updatePowerStateLocked() {
这里省略一段代码.............

                updateWakeLockSummaryLocked(dirtyPhase1);
                updateUserActivitySummaryLocked(now, dirtyPhase1);
                updateAttentiveStateLocked(now, dirtyPhase1);
                if (!updateWakefulnessLocked(dirtyPhase1)) {
                    break;
                }
            }
```

`updateUserActivitySummaryLocked` 来更新用户活动状态，这个方法特别重要。这是一个更新用户活动状态的函数。它根据当前时间 (now)、用户活动的最后时间 (mLastUserActivityTime) 以及各种超时设置（如屏幕关闭超时、睡眠超时等），来决定接下来设备的行为（如屏幕变暗、关闭等）。

```Java
    private void updateUserActivitySummaryLocked(long now, int dirty) {
        // Update the status of the user activity timeout timer.
        if ((dirty & (DIRTY_WAKE_LOCKS | DIRTY_USER_ACTIVITY
                | DIRTY_WAKEFULNESS | DIRTY_SETTINGS)) != 0) {
            mHandler.removeMessages(MSG_USER_ACTIVITY_TIMEOUT);

            long nextTimeout = 0;
            if (getWakefulnessLocked() == WAKEFULNESS_AWAKE
                    || getWakefulnessLocked() == WAKEFULNESS_DREAMING
                    || getWakefulnessLocked() == WAKEFULNESS_DOZING) {
                final long attentiveTimeout = getAttentiveTimeoutLocked();//超时时间用于检测用户是否仍然关注设备
                final long sleepTimeout = getSleepTimeoutLocked(attentiveTimeout);//时时间表示设备在用户不活动后进入休眠状态的时间
                final long screenOffTimeout = getScreenOffTimeoutLocked(sleepTimeout,
                        attentiveTimeout);//表示设备在用户不活动后屏幕关闭的时间。它综合考虑了attentiveTimeout和sleepTimeout，
                final long screenDimDuration = getScreenDimDurationLocked(screenOffTimeout);
                final boolean userInactiveOverride = mUserInactiveOverrideFromWindowManager;
                final long nextProfileTimeout = getNextProfileTimeoutLocked(now);
.....................................
                if (mLastUserActivityTime >= mLastWakeTime) {
                    nextTimeout = mLastUserActivityTime
                            + screenOffTimeout - screenDimDuration;
                    if (now < nextTimeout) {
                        mUserActivitySummary = USER_ACTIVITY_SCREEN_BRIGHT;//这里将屏幕设成亮的
                    } else {
                        nextTimeout = mLastUserActivityTime + screenOffTimeout;
                        if (now < nextTimeout) {
                            mUserActivitySummary = USER_ACTIVITY_SCREEN_DIM;//这里将屏幕设成暗的
                        }
                    }
                }
    }
```

这里面还有很多种其他条件我就不一一介绍了。如果想要在时间到的时候执行其他操作，就在这里增加逻辑。

### 变量和方法解释

**Attentive Timeout (****`attentiveTimeout`****)**

- **变量**：`mAttentiveTimeoutSetting`
- **方法**：`getAttentiveTimeoutLocked()`
- **解释**：这个超时时间用于检测用户是否仍然关注设备。即使用户没有直接与设备交互，系统也可能通过一些方式（如面部识别）检测到用户的注意力。这种超时策略可以延长屏幕亮起时间，避免在用户依然关注设备时屏幕过早熄灭。
- **返回值**：返回一个非负整数，表示配置的时间（单位：毫秒），如果超时设置为0或负数，返回-1，表示不使用这个超时策略。

**Sleep Timeout (****`sleepTimeout`****)**

- **变量**：`mSleepTimeoutSetting`
- **方法**：`getSleepTimeoutLocked(long attentiveTimeout)`
- **解释**：这个超时时间表示设备在用户不活动后进入休眠状态的时间。它依赖于`attentiveTimeout`，如果`attentiveTimeout`有效（非负），则`sleepTimeout`不会超过`attentiveTimeout`。
- **返回值**：返回一个非负整数，表示配置的时间（单位：毫秒），如果超时设置为0或负数，返回-1，表示不使用这个超时策略。这里实际上他返回的就是我们设置中的`settings get System screen_off_timeout`拿到的值

**Screen Off Timeout (****`screenOffTimeout`****)**

- **变量**：`mScreenOffTimeoutSetting`
- **方法**：`getScreenOffTimeoutLocked(long sleepTimeout, long attentiveTimeout)`
- **解释**：这个超时时间表示设备在用户不活动后屏幕关闭的时间。它综合考虑了`attentiveTimeout`和`sleepTimeout`，并受一些额外设置的影响，如设备管理员强制的最大屏幕关闭时间。
- **返回值**：返回一个非负整数，表示配置的时间（单位：毫秒）。

### 关系分析

1. **attentiveTimeout** 与 **sleepTimeout**
   1. `attentiveTimeout` 是用户是否仍在关注设备的超时策略。`sleepTimeout`依赖于`attentiveTimeout`，即如果`attentiveTimeout`有效（非负），则`sleepTimeout`不会超过`attentiveTimeout`。这意味着只要系统检测到用户还在关注设备，设备就不会进入休眠状态。
2. **sleepTimeout** 与 **screenOffTimeout**
   1. `screenOffTimeout` 表示屏幕关闭的超时时间，它依赖于`sleepTimeout`。如果`sleepTimeout`有效（非负），则`screenOffTimeout`不会超过`sleepTimeout`。这意味着在用户不活动且系统决定设备应该休眠前，屏幕会先关闭。
3. **screenOffTimeout** 的其他影响因素
   1. `screenOffTimeout` 还受其他设置影响，如设备管理员设置的最大屏幕关闭时间（`mMaximumScreenOffTimeoutFromDeviceAdmin`）和窗口管理器覆盖的用户活动超时（`mUserActivityTimeoutOverrideFromWindowManager`）。这些设置会进一步约束`screenOffTimeout`的值，确保设备在合规的时间范围内关闭屏幕。

### 调试信息

如果想要打印这里的调试信息，系统中给了现成的

frameworks/base/services/core/java/com/android/server/power/PowerManagerService.java

```Java
            if (DEBUG_SPEW) {
                Slog.d(TAG, "updateUserActivitySummaryLocked: mWakefulness="
                        + PowerManagerInternal.wakefulnessToString(getWakefulnessLocked())
                        + ", mUserActivitySummary=0x" + Integer.toHexString(mUserActivitySummary)
                        + ", nextTimeout=" + TimeUtils.formatUptime(nextTimeout));
            }
updateUserActivitySummaryLocked: mWakefulness=Awake, mUserActivitySummary=0x1, nextTimeout=920990 (in 892906 ms)
```

### 永不休眠

1. 在 PowerManagerService 和 PhoneWindowManager 处理
2. 直接配置 Settings.System.SCREEN_OFF_TIMEOUT 为Integer.MAX_VALUE（ 2147483647 = 24.855 天 一般没有这么长时间亮屏待机 ）

## screensaver屏幕保护

### 界面代码

packages/apps/Settings/res/xml/display_settings.xml

```Java
<Preference
        android:key="screensaver"
        android:title="@string/screensaver_settings_title"
        android:fragment="com.android.settings.dream.DreamSettings" /> 
```

我们可以看到其中定义了android:fragment，也就是说当点击该item的时候会跳转到DreamSettings这个fragment。

packages/apps/Settings/src/com/android/settings/display/ScreenSaverPreferenceController.java

```Java
    public boolean isAvailable() {
        return mContext.getResources().getBoolean(
                com.android.internal.R.bool.config_dreamsSupported);
    }
    
    public void updateState(Preference preference) {
        preference.setSummary(DreamSettings.getSummaryTextWithDreamName(mContext));//获取当前的屏保的名称
    }
```

此处读取com.android.internal.R.bool.config_dreamsSupported的值，true表示支持屏保，false表示不支持

更深入的代码没有去研究了，等待更新。