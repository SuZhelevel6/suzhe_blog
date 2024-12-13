# 安卓TV由于Provision没加导致的HOME按键失效

有时候安卓 TV 设备会出现遥控器HOME键失效的问题，经过排查并不是遥控器按键映射的问题，而是和开机向导(Provison)有关。

## 查看logcat 日志
当按在HOME键时，logcat日志如下
~~~
HdmiControlService: Local playback device not available
WindowManager: One touch play failed: 2
WindowManager: Not starting activity because user setup is in progress: Intent { act=android.intent.action.MAIN cat=[android.intent.category.HOME] flg=0x10200000 (has extras) }
~~~
* 系统没有启动意图为 android.intent.action.MAIN 的 Activity，原因是用户设置尚未完成。
* 用户设置的状态由 Settings.Secure 的 USER_SETUP_COMPLETE 和 TV_USER_SETUP_COMPLETE 决定。
* 如果这些状态标志未设置为 1，系统会限制某些行为，如启动 Launcher。

## 检查Settings属性

使用控制台命令
~~~
settings get global device_provisioned 
settings get secure user_setup_complete 
settings get secure tv_user_setup_complete 
~~~
检查三者的输出结果是不是1，如果不是则说明开机向导没有做好。

> settings list secure/global 可以列出所有的settings 值。
> settings put secure/global xxx 可以设置(不存在就增加)一个指定的值
> settings 值都保存在/data/system/users/0/路径下的各个settings_xxx.xml文件中

## 检查Provison 开机向导是否存在

使用控制台命令
~~~
pm list packges | grep provision
~~~

检查是否将provision添加到了系统中。如果没有，可以查看源码中是否将Provision编译进了系统。
Provison 的代码位置：
`packages/apps/Provision/src/com/android/provision/DefaultActivity.java`
~~~
public class DefaultActivity extends Activity {

    @Override
    protected void onCreate(Bundle icicle) {
        super.onCreate(icicle);

        // Add a persistent setting to allow other apps to know the device has been provisioned.
        Settings.Global.putInt(getContentResolver(), Settings.Global.DEVICE_PROVISIONED, 1);
        Settings.Secure.putInt(getContentResolver(), Settings.Secure.USER_SETUP_COMPLETE, 1);
        Settings.Secure.putInt(getContentResolver(), Settings.Secure.TV_USER_SETUP_COMPLETE, 1);

        // remove this activity from the package manager.
        PackageManager pm = getPackageManager();
        ComponentName name = new ComponentName(this, DefaultActivity.class);
        pm.setComponentEnabledSetting(name, PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP);

        // terminate the activity.
        finish();
    }
}
~~~
* 里面只做了两件事，一是设置三个属性，二是启动一次后就禁用自己(也就是只会执行一次)
* 将这个开机向导编译进系统就可以了，因为在 它的AndroidManifest 里面设置了最高的优先级

## 其他可能承担开机引导的位置

在一些定制化的机器中开机向导不一定由Provision去完成，有可能由Settings，launcher或者其他的APP 去完成。请使用`grep -rnw USER_SETUP_COMPLETE` 去查找有可能出现的地方。

比如在使用`mgrep Provision`时发现有APP overrides 了Provision,那么就需要检查是不是在这个APP中设置了Settings属性
~~~
    overrides: [
        "Home",
        "Launcher3QuickStep",
        "Provision",
    ],

~~~

还有一种情况，provision成功编译进去了，但是就是没有执行里面的代码，我遇到这个情况的时候尚未查到背后的原因，解决方法是将Provision里面的内容加到我自己的某个APK里面去，来代替Provision的功能。

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

如果想继续研究具体是在哪里判断的这几个值可以查看：

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
你可以直接取消对该 Settings 属性的判断。