# Broadcast 介绍

## 1. Broadcast 的定义和用途
Broadcast 是 Android 系统中用于在应用组件之间传递消息的一种机制。它允许应用组件发送和接收消息，从而实现组件之间的解耦和通信，这与发布-订阅设计模式相似。

注意 ：系统会优化广播的传送方式，以维持最佳系统运行状况。因此无法保证直播的传送时间。需要低延迟进程间通信的应用应考虑使用绑定服务(bindService)。

## 2. 广播的类型

| 广播类型       | 特点                                                                 | 适用场景                                                                 |
|----------------|----------------------------------------------------------------------|--------------------------------------------------------------------------|
| **标准广播**   | 完全异步，所有接收器同时接收，无法中断。                               | 发送无需有序处理的事件（如自定义全局通知）。                              |
| **有序广播**   | 同步执行，接收器按优先级顺序处理，可中断传播。                         | 需要拦截或修改广播结果的场景（如短信拦截）。                              |
| **本地广播**   | 仅应用内传播，通过 `LocalBroadcastManager` 实现，安全性高。           | 应用内部组件通信（如 Activity 与 Service 通信）。                        |
| **系统广播**   | 由系统触发，如网络状态变化、电量不足、时区变更等。                    | 监听系统事件并响应（如网络恢复后自动同步数据）。                          |
| **粘性广播**   | 发送后仍保留在系统中，新注册的接收器仍能接收（Android 5.0+ 已废弃）。  | 旧版本兼容场景（已不推荐使用）。                                         |

## 3. 动态注册与静态注册

广播有两种注册方式

### 3.1 动态注册（代码注册）
动态注册是指在应用运行时通过代码注册广播接收器，通常在 Activity 或 Service 中使用。动态注册的接收器在应用退出时会自动注销。

```
// 注册广播
val filter = IntentFilter().apply {
    addAction("com.example.MY_CUSTOM_ACTION")
    addAction(ConnectivityManager.CONNECTIVITY_ACTION) // 网络变化
}
val receiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        when (intent?.action) {
            "com.example.MY_CUSTOM_ACTION" -> handleCustomAction()
            ConnectivityManager.CONNECTIVITY_ACTION -> handleNetworkChange()
        }
    }
}
context.registerReceiver(receiver, filter)

// 注销广播（通常在 onDestroy 中调用）
override fun onDestroy() {
    super.onDestroy()
    context.unregisterReceiver(receiver)
}
```

### 3.2 静态注册（Manifest声明）
静态注册是指在 AndroidManifest.xml 文件中声明广播接收器，通常用于需要在应用启动前接收广播的场景。静态注册的接收器即使应用未运行也会接收广播。因此常用来监听开机完成的广播，然后进行一些自定义的操作。

```
<receiver 
    android:name=".BootCompleteReceiver"
    android:exported="true"> <!-- 是否允许跨应用接收 -->
    <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED" />
    </intent-filter>
</receiver>

```
注意：Android 8.0+ 限制静态注册的隐式广播（非应用专属广播），需使用显式 Intent 或动态注册。
* 隐式广播：通过 Intent 的 action 属性指定广播类型，没有明确指定接收者组件。隐式广播会发送到所有匹配的接收器。
* 显式广播：明确指定接收者组件（如包名和类名），只发送到指定的接收器。
* 系统隐式广播豁免：部分系统隐式广播（如开机完成广播 ACTION_BOOT_COMPLETED）仍然允许静态注册。[豁免清单列表](https://developer.android.com/develop/background-work/background-tasks/broadcasts/broadcast-exceptions?hl=zh-cn)
* 更多信息可以参考：https://blog.csdn.net/xiaoyantan/article/details/128389499

## 发送广播的方式

Android 提供了两种发送广播的方法：

### 1. `sendOrderedBroadcast(Intent, String)`
- **特点**：按顺序向接收器发送广播。
- **结果传递**：接收器可以处理结果并向下传递。
- **中止广播**：接收器可以中止广播，使其不会传递给其他接收器。
- **优先级控制**：通过 `android:priority` 属性控制接收器的运行顺序。
- **随机顺序**：具有相同优先级的接收器按随机顺序运行。

### 2. `sendBroadcast(Intent)`
- **特点**：按随机顺序向所有接收器发送广播。
- **效率**：效率更高，但接收器无法读取其他接收器的结果。
- **数据传递**：无法传递从广播中收到的数据。
- **中止限制**：无法中止广播。

示例：
```kotlin
val intent = Intent("com.example.snippets.ACTION_UPDATE_DATA").apply {
    putExtra("com.example.snippets.DATA", newData)
    setPackage("com.example.snippets")
}
context.sendBroadcast(intent)
```

- **Intent 对象**：广播消息封装在 `Intent` 对象中。
- **Action 字符串**：必须提供应用的 Java 软件包名称语法，唯一标识广播事件。
- **附加信息**：可以使用 `putExtra(String, Bundle)` 向 `Intent` 附加额外信息。
- **限定包名**：可以使用 `setPackage(String)` 将广播限定到同一组织中的一组应用。
- **注意**：虽然发送广播(`sendBroadcast(intent)`)和启动 Activity ( `startActivity(Intent)`)都是发送 Intent，但是这二者是无关的，广播接收器无法捕获用于启动 activity 的 intent；同样，发送广播 intent 时，也无法启动 activity。

## 通过权限限制广播接收者

### 使用权限发送广播
当调用 `sendBroadcast(Intent, String)` 或 `sendOrderedBroadcast(Intent, String, BroadcastReceiver, Handler, int, String, Bundle)` 时，可以指定权限参数。接收器若要接收此广播，则必须通过其清单中的 `<uses-permission>` 标记请求该权限。如果权限属于危险权限，您必须先授予权限，接收器才能接收广播。
示例代码
```kotlin
context.sendBroadcast(intent, android.Manifest.permission.ACCESS_COARSE_LOCATION)
```
代码说明
* 权限参数：在 `sendBroadcast()` 方法中，第二个参数是权限字符串，指定接收器必须具备的权限。
* 系统权限：可以使用现有的系统权限（如 `ACCESS_COARSE_LOCATION`）。
* 自定义权限：也可以通过 `<permission>` 元素定义自定义权限。

### 使用权限接收广播
如果在注册广播接收器时指定了权限参数（使用 `registerReceiver(BroadcastReceiver, IntentFilter, String, Handler)` 或在清单中的 `<receiver>` 标记中指定），则只有通过其清单中的 `<uses-permission>` 标记请求了权限的广播方才能向接收器发送 intent。如果权限危险，则还必须向广播方授予该权限。
示例代码
在清单中声明接收器
```xml
<receiver
    android:name=".MyBroadcastReceiverWithPermission"
    android:permission="android.permission.ACCESS_COARSE_LOCATION"
    android:exported="true">
    <intent-filter>
        <action android:name="com.example.snippets.ACTION_UPDATE_DATA" />
    </intent-filter>
</receiver>
```
动态注册接收器
```kotlin
ContextCompat.registerReceiver(
    context, myBroadcastReceiver, filter,
    android.Manifest.permission.ACCESS_COARSE_LOCATION,
    null, // scheduler that defines thread, null means run on main thread
    receiverFlags
)
```
代码说明
* 清单声明：在 `<receiver>` 标记中使用 `android:permission` 属性指定接收器所需的权限。
* 动态注册：在 `registerReceiver()` 方法中，第三个参数是权限字符串，指定发送方必须具备的权限。
* 权限声明：发送方应用必须在清单中声明相应的权限。


## 注意事项和最佳实践

### 注意事项
1. 避免系统性能和用户体验问题：优先使用上下文注册而不是清单声明，以防止系统启动大量应用。
2. 保护敏感信息：不要使用隐式 intent 广播敏感信息，以免被其他应用读取。
3. 限制广播接收范围：通过指定权限、使用 setPackage(String) 或设置 android:exported 属性为 "false" 来限制哪些应用可以接收或发送广播。
4. 避免命名空间冲突：确保在自己的命名空间中编写操作名称和其他字符串。
5. 防止进程被终止：如果需要执行长时间运行的工作，避免在 onReceive() 方法中直接执行，而是使用 goAsync() 或 JobScheduler。
6. 不要从广播接收器启动 activity：这会影响用户体验，尤其是有多个接收器时。考虑显示通知代替。

### 最佳实践
1. 安全性优化：
* 使用 `android:permission` 声明权限，避免恶意广播攻击。
* 优先使用 `LocalBroadcastManager` 或事件总线（如 EventBus、RxBus）来避免跨应用风险。
2. 性能优化：
* 避免在 `onReceive()` 中执行耗时操作，超过 10 秒会导致 ANR。
* 使用 `goAsync()` 或启动 `Service` 来执行后台任务。
3. 内存泄漏预防：
* 及时注销动态广播，在 Activity/Fragment 的 `onDestroy()` 中调用 `unregisterReceiver()`。
4. 隐式广播限制规避：
* 发送广播时显式指定包名，以规避隐式广播的限制。


## 典型使用场景

应用内组件通信
- **场景描述**：应用内的不同组件（如 Activity 和 Service）需要相互通信和传递数据。
- **解决方案**：使用本地广播（`LocalBroadcastManager`）发送和接收广播，确保通信安全且高效。
- 注意：这种方式还是略显复杂，实际项目中一般喜欢用事件总线API，如[EventBus](https://links.jianshu.com/go?to=https%3A%2F%2Fgithub.com%2Fgreenrobot%2FEventBus)、[Otto](https://links.jianshu.com/go?to=https%3A%2F%2Fgithub.com%2Fsquare%2Fotto)、[AndroidEvenBus](https://links.jianshu.com/go?to=https%3A%2F%2Fgithub.com%2Fbboyfeiyu%2FAndroidEventBus)等  

监听系统事件
- **场景描述**：应用需要监听系统事件，如网络状态变化、电量不足、时区变更等。
- **解决方案**：通过动态注册广播接收器，监听特定的系统事件，并在事件发生时执行相应的操作。

跨应用通信
- **场景描述**：不同的应用之间需要进行通信，如应用 A 触发应用 B 的特定功能。
- **解决方案**：使用显式广播，并在发送和接收双方设置相同的权限，确保通信的安全性。

后台任务触发
- **场景描述**：应用需要在特定条件下触发后台任务，如网络恢复后自动同步数据。
- **解决方案**：使用 `JobScheduler` 调度作业，结合广播监听特定事件，触发后台任务执行。

