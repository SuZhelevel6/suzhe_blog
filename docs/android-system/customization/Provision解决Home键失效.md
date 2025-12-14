# Android TV因未完成开机向导导致HOME按键失效的解决方案

在调试 Android TV 设备时，可能会遇到遥控器 **HOME 键失效** 的问题。这种现象并非由按键映射错误引起，而是与设备的开机向导（**Provision**）状态有关。本文将逐步分析问题原因并提供解决方法。

## 查看logcat 日志
按下 **HOME** 键 后，通过 logcat 捕获的日志可能显示如下信息：
~~~
HdmiControlService: Local playback device not available
WindowManager: One touch play failed: 2
WindowManager: Not starting activity because user setup is in progress: Intent { act=android.intent.action.MAIN cat=[android.intent.category.HOME] flg=0x10200000 (has extras) }
~~~
* 从日志可以看出，系统未启动意图为 android.intent.action.MAIN 的 Activity，具体原因是 用户设置未完成。
* 这受以下 Settings.Secure 属性 控制：
    * USER_SETUP_COMPLETE
    * TV_USER_SETUP_COMPLETE

* 如果上述属性未设置为 1，系统会限制某些关键功能的使用，例如无法启动 Launcher。

## 检查Settings属性

使用控制台命令
~~~
settings get global device_provisioned 
settings get secure user_setup_complete 
settings get secure tv_user_setup_complete 
~~~
确保以上三个属性值均为 1。若结果为 0 或其他值，则表明开机向导未正确完成。

**补充说明**
1. 查看系统中所有 Settings 属性：
~~~
settings list secure
settings list global
~~~
2. 修改或新增 Settings 值：
~~~
settings put secure <key> <value>
settings put global <key> <value>
~~~
3. Settings 值存储路径：
/data/system/users/0/settings_secure.xml
/data/system/users/0/settings_global.xml

## 检查Provison 开机向导是否存在

执行以下命令，检查开机向导应用是否已编译进系统：
~~~
pm list packges | grep provision
~~~

如果未找到 Provision 应用，可能是系统构建时遗漏了此模块。
其代码路径通常为：
`packages/apps/Provision/src/com/android/provision/DefaultActivity.java`

关键代码如下：
~~~
public class DefaultActivity extends Activity {

    @Override
    protected void onCreate(Bundle icicle) {
        super.onCreate(icicle);

        // 设置相关属性
        Settings.Global.putInt(getContentResolver(), Settings.Global.DEVICE_PROVISIONED, 1);
        Settings.Secure.putInt(getContentResolver(), Settings.Secure.USER_SETUP_COMPLETE, 1);
        Settings.Secure.putInt(getContentResolver(), Settings.Secure.TV_USER_SETUP_COMPLETE, 1);

        // 禁用自身，使其只执行一次
        PackageManager pm = getPackageManager();
        ComponentName name = new ComponentName(this, DefaultActivity.class);
        pm.setComponentEnabledSetting(name, PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP);

        // 结束 Activity
        finish();
    }
}
~~~
**功能说明：**
1. 设置 DEVICE_PROVISIONED、USER_SETUP_COMPLETE 和 TV_USER_SETUP_COMPLETE 属性。
2. 启动后禁用自身，仅执行一次。

## 定制化系统的特殊情况

在定制化系统中，开机引导可能并非由 Provision 应用完成，而是由其他应用（如 Settings 或 Launcher）接管。可使用以下命令查找相关代码位置：
~~~
grep -rnw USER_SETUP_COMPLETE frameworks/
~~~

**示例问题排查**
1. Override 情况
某些系统可能会通过 override 替换 Provision 应用，例如：
~~~
    overrides: [
        "Home",
        "Launcher3QuickStep",
        "Provision",
    ],

~~~
在这种情况下，需要检查替代应用是否正确设置了相关属性。

2. 未执行代码
若 Provision 应用已编译进系统但未运行。provision成功编译进去了，但是就是没有执行里面的代码，我遇到这个情况的时候尚未查到背后的原因，解决方法是将Provision里面的内容加到我自己的某个APK里面去，来代替Provision的功能。

    如果想要在自己的APP中进行Settings设置可以参考如下代码：
~~~
private void initializeDeviceSettings() {
    try {
            Settings.Global.putInt( getContentResolver(), Settings.Global.DEVICE_PROVISIONED , 1);
            Settings.Secure.putInt( getContentResolver(), "user_setup_complete", 1);
            Settings.Secure.putInt( getContentResolver(), "tv_user_setup_complete", 1);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
~~~
这里之所以
使用`user_setup_complete`而不是`Settings.Secure.USER_SETUP_COMPLETE`
使用`tv_user_setup_complete` 而不是`Settings.Secure.TV_USER_SETUP_COMPLETE`
是因为这两个属性是隐藏的。

## 取消对开机引导的判断

如果不希望依赖 Provision 或类似逻辑，可修改框架源码，直接跳过相关属性的检查。代码位置如下：

`frameworks/base/services/core/java/com/android/server/policy/PhoneWindowManager.java`
~~~
    public boolean isUserSetupComplete() {
        boolean isSetupComplete = Settings.Secure.getIntForUser(mContext.getContentResolver(),
                Settings.Secure.USER_SETUP_COMPLETE, 0, UserHandle.USER_CURRENT) != 0;
        if (mHasFeatureLeanback) {
            isSetupComplete &= isTvUserSetupComplete();
        } else if (mHasFeatureAuto) {
            isSetupComplete &= isAutoUserSetupComplete();
        }
        return isSetupComplete;
    }

    private boolean isAutoUserSetupComplete() {
        return Settings.Secure.getIntForUser(mContext.getContentResolver(),
                "android.car.SETUP_WIZARD_IN_PROGRESS", 0, UserHandle.USER_CURRENT) == 0;
    }

    private boolean isTvUserSetupComplete() {
        return Settings.Secure.getIntForUser(mContext.getContentResolver(),
       
~~~

`frameworks/base/core/java/com/android/internal/policy/PhoneWindow.java`

~~~
    private boolean isTvUserSetupComplete() {
        boolean isTvSetupComplete = Settings.Secure.getInt(getContext().getContentResolver(),
                Settings.Secure.USER_SETUP_COMPLETE, 0) != 0;
        isTvSetupComplete &= Settings.Secure.getInt(getContext().getContentResolver(),
                Settings.Secure.TV_USER_SETUP_COMPLETE, 0) != 0;
        return isTvSetupComplete;
    }

~~~
可通过修改或注释以上代码逻辑，直接取消对 Settings 属性的依赖。