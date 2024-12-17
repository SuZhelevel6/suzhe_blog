# Android 中的进程和线程

在 Android 开发中，理解进程和线程的概念非常重要。进程和线程不仅是操作系统的基本概念，其在 Android 系统中的表现形式与四大组件也有密切关联。本文将通过梳理进程和线程的基本概念及其在 Android 中的特点，为开发者提供清晰的理解。


## **进程和线程的基本概念**

### **1. 进程**
- **定义**：  
  进程是资源分配的基本单位，每个进程都拥有独立的地址空间、内存和资源。在多任务操作系统中，进程是实现程序并发运行的核心机制。

- **特点**：
  - 独立性：进程之间互不干扰，每个进程都有自己的地址空间。
  - 高资源开销：进程切换需要保存和恢复上下文（如地址空间、寄存器状态等）。
  - 安全性高：进程间的资源隔离较为彻底。


### **2. 线程**
- **定义**：  
  线程是 CPU 调度的基本单位，运行在进程中的一个执行单元。线程共享同一进程的资源（如内存、文件句柄），可以通过多线程实现并发操作。

- **特点**：
  - 轻量级：线程比进程更高效，占用资源少。
  - 共享性：同一进程内的线程共享内存地址空间。
  - 依赖性：一个线程崩溃可能会影响整个进程。


### **进程与线程的对比**

| **特性**               | **进程**                                                                                   | **线程**                                                                                   |
|------------------------|-------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| **定义**               | 操作系统分配资源的基本单位，一个运行中的程序。                                              | 进程中的一个执行单元，是 CPU 调度的基本单位。                                              |
| **资源**               | 每个进程有独立的地址空间和资源。                                                           | 线程共享所在进程的地址空间和资源。                                                         |
| **通信**               | 进程间通信复杂，需要使用 IPC 技术（如管道、共享内存、Socket 等）。                         | 同一进程内线程通信简单，通常通过共享内存或全局变量进行通信。                                |
| **开销**               | 进程切换成本高（上下文切换需要保存和恢复资源，如地址空间、文件句柄等）。                   | 线程切换成本低（只需切换寄存器内容和程序计数器等）。                                       |
| **独立性**             | 进程之间互相独立，一个进程崩溃不会影响其他进程。                                           | 同一进程内线程彼此依赖，一个线程崩溃可能会导致整个进程崩溃。                               |

---

## 一、Android 中的进程

### 1. Application 和进程的关系
- 默认情况下，同一应用的所有组件（Activity、Service、BroadcastReceiver、ContentProvider）均运行在同一进程中。
- 一个应用默认只有一个进程，其进程名与包名相同。
- 同一个AndroidManifest中定义的四大组件除非特别声明，否则默认运行在同一个进程之中



### 2. 开启多进程
通过配置清单文件中的 `android:process` 属性，可以为应用的四大组件指定独立的进程。

#### **示例配置**
~~~xml
<application
    android:name=".MyApplication"
    android:label="MyApp"
    android:theme="@style/AppTheme">

    <!-- Activity 运行在默认进程 -->
    <activity
        android:name=".MainActivity"
        android:exported="true" />

    <!-- Service 运行在名为 :myservice 的独立进程 -->
    <service
        android:name=".MyService"
        android:process=":myservice"
        android:exported="true" />
</application>
~~~

#### 进程命名规则
1.	默认进程：
未指定 android:process 属性的组件运行在应用的主进程中。
2.	子进程：
使用 android:process=":进程名" 创建私有子进程。: 前缀表示该进程是仅限当前应用使用的子进程。
3.	全局进程：
如果进程名不以 : 开头（如 android:process="com.example.global"），则该进程可以跨应用共享资源（需要适当权限）。

#### 验证多进程
1. 在 Activity 和 Service 中分别打印当前进程的 PID。
2. 使用 android.os.Process.myPid() 获取进程 ID。

**示例代码**：
主 Activity：
~~~
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // 启动 Service
        val intent = Intent(this, MyService::class.java)
        startService(intent)
    }
}
~~~
服务（运行在独立进程）：
~~~
class MyService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d("MyService", "Service is running in process: ${Process.myPid()}")
        return START_STICKY
    }
}
~~~

### 3. Android 的进程分类

Android 系统根据应用组件的状态将进程分为以下几类：

#### 1. **前台进程**  
前台进程是用户当前操作所必需的进程，优先级最高，通常数量较少，仅在系统内存严重不足时才会被终止。  
一个进程满足以下任一条件，即视为前台进程：
- 托管用户正在交互的 Activity（调用了 `onResume()` 方法）。
- 托管绑定到用户正在交互 Activity 的 `Service`。
- 托管一个前台服务（调用了 `startForeground()` 方法）。
- 托管正在执行生命周期回调的 `Service`（如 `onCreate()`、`onStart()` 或 `onDestroy()`）。
- 托管正在执行 `onReceive()` 方法的 `BroadcastReceiver`。

#### 2. **可见进程**  
可见进程对用户可见但不在前台，通常比前台进程优先级低。  
一个进程满足以下任一条件，即视为可见进程：
- 托管绑定到可见或前台 Activity 的 `Service`。
- 托管调用了 `onPause()` 方法但仍对用户可见的 Activity（例如，显示在前台的对话框后面的 Activity）。

#### 3. **服务进程**  
服务进程运行着由 `startService()` 方法启动的服务，与用户界面没有直接关联，但执行重要的后台操作。  
例如，后台播放音乐或从网络下载数据。服务进程的优先级低于前台和可见进程，但高于后台进程。

#### 4. **后台进程**  
后台进程运行的是用户当前不可见的 Activity（已调用了 `onStop()` 方法）。  
这些进程被存储在最近最少使用 (LRU) 列表中，并且可能随时被系统终止以释放内存。

#### 5. **空进程**  
空进程不包含任何活动的应用组件，仅作为缓存保留，以加快下次启动速度。  
系统通常会优先终止这些进程来平衡系统资源。

---

### 4. 进程生命周期

Android 系统会尽可能长时间地保留进程，但在需要内存时，会根据进程的重要性决定终止顺序。以下是进程的重要性层次结构及其终止优先级：

#### 1. **前台进程**
- 系统优先保留的进程，仅在内存不足以支持所有前台进程时终止。
- 终止前台进程往往意味着用户界面无法正常响应。

#### 2. **可见进程**
- 仅次于前台进程的重要性，除非系统必须维持所有前台进程，否则不会被终止。

#### 3. **服务进程**
- 系统会尽量维持服务进程的运行，除非内存不足以维持前台和可见进程。

#### 4. **后台进程**
- 优先级低，可能被系统随时终止，以为前台、可见或服务进程腾出内存。
- 如果 `Activity` 正确保存了状态，终止后台进程对用户体验的影响较小。

#### 5. **空进程**
- 优先级最低，用于缓存，系统通常会优先终止这些进程以释放内存。
- 系统会在进程缓存和底层内核缓存之间保持平衡。

## 二、Android 中的线程

在 Android 应用中，线程是重要的执行单位。每个应用默认启动一个主线程（即 UI 线程），负责处理用户界面更新和事件分发。此外，还会有两个 Binder 线程用于处理 IPC（进程间通信）。

#### 线程与组件的关系
- **主线程**：应用启动后，系统会为其创建**一个**主线程（`Thread[<1> main]`），此线程主要负责处理 UI 更新和事件分发。
- **Binder 线程**：用于支持跨进程通信（如系统服务调用）。
- 无论是启动 `Activity` 还是启动 `Service`，这些操作都会依赖 `ActivityThread` 类处理其生命周期管理流程。  
- 同一个应用的四大组件（`Activity`、`Service`、`BroadcastReceiver`、`ContentProvider`），除非在清单文件中指定了不同的进程（通过 `android:process` 属性），默认都运行在**同一个进程**之中，并由**主线程**统一调度和处理事件。

### 验证四大组件默认处于同一进程

为了验证 Android 四大组件默认运行在同一进程，我们可以利用一个 `static` 变量的特性（进程内共享）。  
以下通过两个 `Activity` 示例代码演示：

1. **在第一个 `Activity` 中声明并修改 `static` 变量**  
    ```kotlin
    class ActivityThreadTest : AppCompatActivity() {

        companion object {
            // 声明一个 static 变量
            var sharedValue: Int = -1
        }

        override fun onCreate(savedInstanceState: Bundle?) {
            super.onCreate(savedInstanceState)
            setContentView(R.layout.activity_thread_test)

            // 修改 static 变量值
            sharedValue = 2

            // 跳转到第二个 Activity
            val intent = Intent(this, ActivityThreadTest2::class.java)
            startActivity(intent)
        }
    }
    ```

2. **在第二个 `Activity` 中读取 `static` 变量的值**  
    ```kotlin
    class ActivityThreadTest2 : AppCompatActivity() {

        override fun onCreate(savedInstanceState: Bundle?) {
            super.onCreate(savedInstanceState)
            setContentView(R.layout.activity_thread_test2)

            // 读取 static 变量的值
            Log.d("ActivityThreadTest2", "sharedValue = ${ActivityThreadTest.sharedValue}")
        }
    }
    ```

3. **清单文件配置**  
    ```xml
    <application
        android:label="Thread Test App"
        android:theme="@style/AppTheme">

        <!-- 默认进程 -->
        <activity android:name=".ActivityThreadTest" />
        <activity android:name=".ActivityThreadTest2" />

    </application>
    ```

在 `ActivityThreadTest2` 中打印日志：`sharedValue = 2`,因此可以验证结论：Android 四大组件（除非特别声明）默认运行在主线程中，且共享同一进程的内存空间。

## UI主线程 —— ActivityThread

想要了解ActivityThread 必须先对线程[通信机制-Handler](./线程通信机制Handler.md)有所了解。
ActivityThread是Activity所属的线程，也就是大家熟悉的UI主线程。它与普通线程的不同点在与它使用prepareMainLooper()来创建looper，而普通线程只要prepare就可以了。
我们在Handler一节中介绍过prepareMainLooper()的两个特点：
1. prepare的参数使用false代表该线程不允许退出
2. 将本地线程ThreadLocal的looper 对象复制给sMainLooper。

### UI主线程和普通线程的区别
访问Looper上：
子线程：使用`getMainLooper()`来获取主线程的 `Looper`，使用myLooper()访问自己的Looper对象
主线程：使用myLooper()访问自己的Looper对象
获取Handler上：
当ActivityThread对象创建时，会在内部同时生成一个继承自Handler的H对象mH，