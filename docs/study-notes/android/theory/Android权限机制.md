# Android 权限机制

查看所有的权限及其保护级别的方法：
1. 官方开发者网站: https://developer.android.com/reference/android/Manifest.permission
2. 源码: `frameworks/base/core/res/AndroidManifest.xml`


## Android 权限分类

Android 的权限按照保护级别可以分为**安装时权限**、**运行时权限**和**特殊权限**。每种权限类型都指明了当系统授予应用该权限后，应用可以访问的受限数据范围以及应用可以执行的受限操作范围。具体的分类情况如下：

* 安装时权限
	* 一般权限(normal)
	* 签名权限(signature)
* 运行时(危险)权限(dangerous)
* 特殊权限(signature|privileged)



### normal 普通权限

获取条件：声明即可

该类权限只需要在应用自己的AndroidManifest.xml 声明，系统就会在安装时默认赋予。系统不会提示用户授予普通权限，用户也无法撤消这些权限。

例子：
~~~
    <!-- @hide We need to keep this around for backwards compatibility -->
    <permission android:name="android.permission.MANAGE_ACCOUNTS"
        android:protectionLevel="normal"
        android:permissionFlags="removed"/>
~~~
这类的权限基本声明了就能用，几乎不会在使用过程中出现权限问题。

### signature 签名

获取条件：相同签名

该类权限不仅需要在AndroidManifest.xml 声明，还需要具有**相同的签名**才可以生效。这里的相同的签名指的不仅仅是系统platform签名，还可以是其他APP的签名。
* 一般情况下，APP使用系统platform签名，则可以被授予`frameworks/base/core/res/AndroidManifest.xml`中的签名权限
* 如果A应用已经有了某个权限，B应用使用和A应用同样的签名，则可以立即共享A应用已有的签名权限（系统无需通知用户或征得用户明确许可）。当然自定义权限也是一样可以直接共享。

例子:
~~~
    <!-- Allows input events to be monitored. Very dangerous!  @hide -->
    <permission android:name="android.permission.MONITOR_INPUT"
                android:protectionLevel="signature" />
~~~

### dangerous 危险权限 也称运行时权限

获取条件：用户手动授予

此类权限授予应用对受限数据的额外访问权限，或允许应用执行对系统和其他应用具有更严重影响的受限操作。因此，您需要先在应用中请求运行时权限然后才能访问受限数据或执行受限操作。当出现对话框需要用户手动授予权限的时候，这些权限就是运行时权限。

例子：
~~~
    <!-- Allows an application to read the user's contacts data.
        <p>Protection level: dangerous
    -->
    <permission android:name="android.permission.READ_CONTACTS"
        android:permissionGroup="android.permission-group.UNDEFINED"
        android:label="@string/permlab_readContacts"
        android:description="@string/permdesc_readContacts"
        android:protectionLevel="dangerous" />
~~~

### signature|privileged 特殊权限

获取条件（二选一）：
1. 用户在 设置 > 应用 > 特殊应用权限 手动授予
2. 使用platform签名，且APP在priv-app/目录下

特殊权限旨在限制访问尤其敏感或与用户隐私没有直接关系的系统资源。这些权限不同于安装时权限和运行时权限。声明特殊权限的应用会显示在系统设置中的特殊应用权限页面内。如需向应用授予特殊权限，用户必须转到此页面：设置 > 应用 > 特殊应用权限。

与运行时权限不同，用户必须从系统设置中的特殊应用权限页面授予特殊权限。应用可以使用 intent 将用户转到该页面，这会暂停应用，并启动相应的设置页面，以便用户授予指定的特殊权限。用户返回到应用后，应用可以在 onResume() 函数中检查是否已获得相应权限。

例如：
请求用户授予 SCHEDULE_EXACT_ALARMS 特殊权限
~~~
val alarmManager = getSystemService<AlarmManager>(Context.ALARM_SERVICE)
when {
   // if permission is granted, proceed with scheduling exact alarms…
   alarmManager.canScheduleExactAlarms() -> {
       alarmManager.setExact(...)
   }
   else -> {
       // ask users to grant the permission in the corresponding settings page
       startActivity(Intent(ACTION_REQUEST_SCHEDULE_EXACT_ALARM))
   }
}
~~~
在 onResume() 中检查权限和处理用户决定
~~~
override fun onResume() {
   // ...
 
   if (alarmManager.canScheduleExactAlarms()) {
       // proceed with the action (setting exact alarms)
       alarmManager.setExact(...)
   }
   else {
       // permission not yet approved. Display user notice and gracefully degrade
       your app experience.
       alarmManager.setWindow(...)
   }
}
~~~

## 另类的获取权限方法 —— sharedUserId

当你在APP的AndroidManifest.xml中声明`android:sharedUserId="android.uid.system"`并且使用系统platform签名时，就可以让应用与系统应用运行在同一进程中，从而拥有系统级别的权限。

使用android.uid.system作为sharedUserId的应用，只有在原始的Android系统或者是自己编译的系统中才可以使用，因为这样的系统才可以拿到`platform.pk8`和`platform.x509.pem`两个文件进行签名。在其他公司的Android系统上可能无法安装或运行。

### 通过shareduserid来获取系统权限 
(1)在AndroidManifest.xml中添加android:sharedUserId="android.uid.system"
(2)在Android.mk文件里面添加LOCAL_CERTIFICATE := platform（使用系统签名）
(3)在源码下面进行mm编译

这样生成的apk能够获取system权限，可以在任意system权限目录下面进行目录或者文件的创建，以及访问其他apk资源等（注意创建的文件(夹)只有创建者(比如system,root除外)拥有可读可写权限-rw-------）。

### 原理

sharedUserId 涉及Linux 的安全机制——沙箱机制。Android给每个APK进程分配一个单独的空间，manifest中的userid就是对应一个分配的Linux用户ID，并且为它创建一个**沙箱**，以防止影响其他应用程序（或者被其他应用程序影响）。

通常，不同的APK会具有不同的userId，因此运行时属于不同的进程中，而不同进程中的资源是不共享的（比如只能访问/data/data/自己包名下面的文件），保障了程序运行的稳定。然后在有些时候，我们自己开发了多个APK并且需要他们之间互相共享资源，那么就需要通过设置shareUserId来实现这一目的。

通过Shared User id，拥有同一个User id的多个APK可以配置成运行在同一个进程中，可以互相访问任意数据。也可以配置成运行成不同的进程, 同时可以访问其他APK的数据目录下的数据库和文件，就像访问本程序的数据一样。

注意：如果多个应用的uid相同的话，那么他们的apk签名必须一致，不然是安装失败的

