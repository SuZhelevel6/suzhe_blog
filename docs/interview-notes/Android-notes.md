---
title: 安卓面经
date: 2024-09-22
tags:
  - 安卓
  - 面经
---

# Andorid

## Activity
**生命周期**：

第七个生命周期：`onCreate` --> `onStart` --> `onResume` --> `onPause` --> `onStop` --> `onDestory`

还有一个 `onRestart()`

(1) Oncreate():创建：作为生命周期的第一种方法，仅在新的Activity创建时调用。在这个方法中，可以做一些初始化工作，比如加载接口布局资源和初始化活动所需的数据。

(2) OnStart():开始：表示Activity正在启动，并且即将启动。此时Activity已经出现，但还没有出现在前台，我们还不能交互。

(3) OnResume():活动：表示Activity已经出现在前台，可见可操作。

(4) OnPause():暂停：表示活动即将停止，仍然可见,但是不能操作了。

(5) OnStop():停止：表示活动停止，此时不可见，位于后台。

(6) OnDestory():销毁：表示活动即将被销毁。这是Activity循环的最后一个回调。你可以做一些回收工作和最后的资源回收。

**几种特殊情况**:

1. 切桌面：`onRestart()`，也会有 `onSaveInstanceState`
2. 切到另一个活动切回来，或者从桌面回来：`onPause()->onStop()->onRestart()->onStart()->onResume()`
3. 切换横竖屏：先销毁后重建立，额外会在`onPause`之后调用`onSaveInstanceState()`保存当前状态，在`onResume`前再调用`onRestoreInstanceState()`来恢复之前的状态。

**四种启动模式**：

1. `Standard`：标准模式(每次启动都会在本栈中创建全新实例)
2. `SingleTop`:栈顶复用模式/单顶模式   适用于频繁启动的活动。例如，**通知栏点击进入聊天界面**时，聊天界面应该显示现有的聊天内容，而不是启动新的实例。
3. `SingleTask`:栈内复用模式/单任务模式 适用于程序入口。例如，浏览器主界面
4. `SingleInstance`:单例模式（独享一个栈） ： 这是一种加强版的单任务模式,在一个新栈中创建该Activity的实例，并让多个应用共享该栈中的该Activity实例。
比如音乐播放器。

在同一个栈中的活动可以通过返回按钮（Back）导航，通过Intent轻松传递数据。但是如果在不同栈里面就相当于互相独立了，需要用户手动切换任务。

这四种启动方式在复用程度上是逐级递增的。设置启动模式的位置在 AndroidManifest.xml 文件中 Activity 元素的 Android:launchMode 属性。
也可以通过Flag动态设定，Flags方式的优先级比在清单文件中的优先级高，两种方式同时设置时Flags的方式会生效，Flags方式不能设置singleInstance。

**taskAffinity**:

每个 Activity 都有一个 taskAffinity 属性，决定了它与哪个任务栈关联。默认情况下，同一应用程序的所有 Activity 共享相同的 taskAffinity，也就是说，它们通常在同一个任务栈中。通过设置不同的 taskAffinity，可以将不同的 Activity 放入不同的任务栈中，从而在同一个应用中创建多个任务栈。

**Intent Flags**：

特定的 Intent 标志（如 FLAG_ACTIVITY_NEW_TASK）如果目标 Activity 不在任何任务栈中，则创建一个新的任务栈并启动这个 Activity；如果该 Activity 已经在某个任务栈中，则将它移动到前台，而不会创建新的实例。因此这个标志可能增加任务栈个数。

活动的调度基于任务栈进行，而服务就不一样了，它是后台组件不依赖栈，和栈没关系。

## Service

Activity是一个有可见界面的，Service则是一个可以在后台长期运行但又不使用用户界面的Android应用组件。

**通过startService启动**

1. 生命周期顺序：onCreate->onStartCommand->onDestroy
2. 直到有其他组件调用stopService()或者自己调用stopSelf()才会结束
3. startService时，如果该服务未创建，则会触发 onCreate 和 onStartCommand，以后在服务运行过程中，每次startService都只会触发onStartCommand；
4. 不论startService多少次，只要调用一次stopService，该服务就会停止；

**通过bindService绑定**

1. 生命周期顺序：onCreate->onBind->onUnBind->onDestroy
2. 不论bindService被调用几次，Service的onCreate和onBind方法只会执行一次
3. 当Activity调用unBindService或者Activity挂掉，则服务会停止；

方式二的生命周期和Activity一致，在Activity的finish方法里面会检查Activity是否存在未注销/解绑的 ServiceConnection，如果有，那么会通知AMS注销/解绑对应的Service，并打印异常信息。

**服务的分类**:

1. 后台服务：默认的服务都是后台服务，也就是startService()启动的服务，服务终止时用户是无法感知的，如天气更新等服务；
2. 前台服务：后台服务优先级较低，可能会被系统杀死，可以将后台服务提高为前台服务，是会在**状态栏显示图标**的服务，如常见的音乐播放服务，服务终止，状态栏的图标也消失；
3. 从Android8.0(AP1级别26)开始，后台服务收到了限制，需要设置为前台服务，或者改用WorkManager（ Jetpack ）

 **如何保证Service不被杀死？**

1. 使用自定义系统服务  init.rc里面
2. 使用系统服务来监控：先弄一个白名单，记录需要监控的应用的包名，再自定义一个系统服务，监控系统里某个应用被杀死，如果该应用在白名单上，则重新拉起应用；
3. 使用双进程Service，在ServiceA和ServiceB相互保护，检测到有一个Service被杀死则重新拉起；
4. 使用闹钟循环拉起服务;

**Activity、Intent、Service 之间的关系**

Activity和Service父类都是Context，一个有UI一个没有。Intent主要负责之间的调度和数据传递。

## Broadcast

静态注册：在AndroidManifest.xml清单文件里直接声明的方式叫做静态注册。

动态注册：代码运行到了才注册广播，手动设置过滤器注册接收器。注意动态广播最好在Activity的onResume()注册、onPause()注销。一旦忘记注销，那么就会造成内存泄露哦。

1. 静态注册不受app是否运行所影响，即使app没有运行，app里静态注册的广播接收者也可以接收广播，因此适合监听系统广播比如开机
2. 动态注册的广播在组件结束之前，也会随之结束（当然是手动注销的），适合只在特殊时刻监听广播。
3. 动态注册的优先级高于静态广播。

有序广播：广播接收器有优先级，先收到的可以拦截或者修改广播

本地广播：广播只会在应用内发，发布出去。BroadcastReceiver是以 **Binder** 通讯方式为底层实现的，而LocalBroadcastManager 是利用应用内部的Handler来实现

## ContentProvider

ContentProvider的底层**结合了Binder机制**和匿名**共享内存机制**，也是一种进程间数据传递的方式（应用间通信）而且适用于 大量数据的传递。 一般来说，Android数据存储的方式有：文件，数据库，网络，SharePreferences，ContentProvider。ContentProvider更准确来说只是一个中间者的身份，真正存储数据的是数据库和文件等形式，这一点要分清楚！

## Context

在Activity 和Service里面经常用到，一般在获取系统属性（Color，String）以及数据存储（文件，SharedPreference，数据库）的时候需要用到。

Context有他的实现类**ContextImpl**和封装类**ContextWrapper**，包装类里面包含实现类的对象。还有一个**ContextThemeWrapper**又是继承于ContextWrapper加了与主题（Theme）相关的接口

Activity 会继承**ContextThemeWrapper**

Service 和APPlication  会继承**ContextWrapper**

一个应用的context个数就由其包含了多少个Activity和Service决定，并且最后再加上自己本身持有的context，即

应用Context数量 = Activity数 + Service数 + 1（Application）；

**不正确使用**:把Context传给其他长久存在的类，导致本身无法被回收造成内存泄露。所以

- 可以使用Application的context则优先使用；
- 注意别让生命周期可能长于actvity的对象持有activity的引用；

**获取方式**:

1. Activity.this
2. getApplication()和getApplicationContext()
3. view.getContext：每个view都需要在安卓的完整工程环境下才能正常显示，操作，因此每个view本身都持有context对象，这个context对象一般是该view所在的Activity实例

**什么情况必须用Activity的Context呢**?启动新的Activity或者弹出一个Dialog，只能用Activity的Context，不能用Application的Context，因为启动Activity需要任务栈，而非Activity的Context是没有的。同时，**Dialog必须基于Activity上弹出。**

## Intent

和startActivity() ，startService()，bindService()，sendBroadcast()，sendOrderedBroadcast() 

Intent 可以启动活动，服务，发出广播。有显式和隐式之分

显示：指定要启动的类， 如SecondActivity.class

隐式：不指定特定的类，使用Intent过滤器直接接受我们想要收到的Intent，然后我们在发送Intent的时候使用addCategory 和 setAction设置好就行

Intent携带数据的大小： 大概在1M左右，超过这个限制就会静默崩溃。

如果 exported 属性设置为 false，那么该 Activity 不会被其他应用访问。只有同一应用内的组件才有权限启动该 Activity。

## Fragment

经常用在使用Preference和fragment的结合写settings页面。比如在PreferenceFragment中关联Preference XML文件，然后 在Activity中加载Fragment。

Fragment碎片可以实现在一个Activity上碎片化加载多个子界面，可以动态的增删替换，比起Activity是轻量级的切换。Fragment是依附于Activity存在的，所以它的生命周期也受到Activity的生命周期影响。

他的生命周期除了Activity的几个之外，还有自己的**onCreateView**()等

**Fragment和Actvity的通讯**

1. 在Activity有对应的Fragment的引用，则直接通过该引用就可以访问Fragment里面的public方法
2. 或者findFragmentById()获得任何Fragment实例对其进行操作
3. 在Fragment里可以通过getActivity()来获取当前绑定的Activity的实例，并对其进行操作；

**Fragment和Fragment的通讯**

不建议Fragment之间直接通讯，最好是借助Activity为中介。实在要传也可以使用REQUEST_CODE和Intent 去传参。

## ADB 底层如何实现的

命令有：am  pm 截屏  dumps meminfo
电脑端有**adb client**进程，安卓设备上有**adb server**守护进程（5037端口） 和 **adbd** 进程。
adb client进程通过Socket 告知adb server进程需要执行的命令，adb server会将命令写入文件，然后adbd读取文件中的命令。

## DTS设备树文件的作用

① 调试网络灯的GPIO口：引入驱动厂商给的驱动文件（.rc）然后根据驱动配置节点
② 配置pin脚对应的GPIO口
③ 控制USB口的模式device模式，otg模式
④ SOC节点 时钟信息

## 安卓系统的启动流程（简略版）

**加载BootLoader**，BootLoader是引导程序是用来拉起内核的，现在用的都是uboot。在这里面我们一般是读取DDR， dts设备树。
**启动Linux内核**： 解析init.rc，启动init进程。①init.rc中我们会定制一些服务，设置启动方式。②init进程是所有进程的父进程，fork出其他的进程比如孵化进程。③还会加载prop属性的服务。④启动 SELinux
**Zygote进程**：启动Android虚拟机，从C++走到Java里面
**sysytem_server进程**：ActivityManagerService、WindowManagerService、PackageManagerService 和InputManagerService
**Launcher启动**：Launcher在启动过程中会请求PackageManagerService返回系统中已经安装的应用程序的信息，并将这些信息封装成一个快捷图标列表显示在系统屏幕上

## 内核打印

安卓内核打印的中括号里面是时间戳和 CPU 核心信息，格式通常是 [时间戳@CPU核]。一般从系统启动时的时间开始计时。常见SELinux的权限问题
[   25.885553@3]  RTW: Turbo EDCA =0x5ea42b
低内存杀手，杀死优先级低的进程。

## SELinux

和安全权限有关，有permissive宽容模式和强制模式，宽容模式会记录但是不会强制执行安全策略。比如说在init.rc中添加服务就需要为服务添加selinux上下文

## 常用的设计模式

### 单例模式

单例模式分为懒汉式和饿汉式。饿汉式是在类加载时就创建实例对象，并且提供方法让外面能够获取到这个实例。懒汉式是在实例使用的时候也就是获取实例的方法被第一次调用的时候创建。

懒汉式在多线程情况下可能出现不安全，可能实例化出多个实例。改进的方法一个是在创建对象的时候加锁，另一个是使用静态内部类。
由于虚拟机在加载外部类的时候，是不会加载静态内部类的，只有内部类的属性或方法被调用时才会被加载，因此天然契合我们的懒汉式单例模式。只要保证静态内部类的属性被static修饰，只会实例化一次

使用场景经常是一些帮助类和库的实例化，比如网络请求，图片加载库

### 建造者模式

建造者模式允许以灵活的方式构建复杂对象，比如最常见的是安卓中的Dialog的创建。
Dialog通常需要多个参数来配置，如标题、消息、按钮等。
我们只需要使用Builder中的各种方法来设置具体的参数就好。

### 代理模式

Binder机制使用了代理模式，通过生成远程服务的本地代理来实现不同进程之间的通信。
当一个客户端进程想要调用服务端进程的方法时，Binder机制会为服务创建一个本地代理对象。客户端通过这个代理对象与服务进行交互，而无需直接处理跨进程的复杂性。

### 观察者模式

观察者模式的例子是MVVM架构中的`LiveData`，`LiveData`作为数据持有者，负责存储数据的状态。当数据发生变化时，LiveData会通知其所有观察者。

### 责任链模式

多个处理对象有机会处理请求，而请求的发送者不需要知道具体处理者是谁，只需要发送事件然后逐层传递，等待事件被消费就好。
责任链模式的体现是触摸事件、按键事件的传递，OKHttp的拦截器。

### 装饰模式

装饰模式就是将对象封装在另一个对象中来动态地为其添加功能，比如ContextWrapper和ContextThemeWrapper是一个Context的子类，
ContextThemeWrapper相对于ContextWrapper多包含了与主题（Theme）相关的接口，因此才有Actvity继承ContextThemeWrapper，而Service和Application直接继承ContextWrapper

### 享元模式

享元模式通过共享对象来减少内存使用和提高性能。
比如 使用Handler时，经常会用到Message，这个Message一般不建议每次都new一个新的，因为Message就使用了享元模式，可以快速的从Message池里快速的拿到一个已经创建好的Message对象。

### 工厂模式

简单工厂：核心就是为了方便实例化对象，将对象的创建和本身的业务逻辑分离, 让工厂类去实例化对象而我们不需要知道实例化的具体过程。

工厂方法：定义一个创建对象的接口，通过接口管理不同产品的实现类工厂。将对象的创建与实例化延迟到子类

抽象工厂：一个工厂创建多个不同产品实例

##  AMS

ActivityManagerService（以下简称AMS） 主要负责四大组件(Activity、Service、BroadcastReceiver和ContentProvider)的启动、切换、调度以及应用进程的管理和调度工作。

它是一个**服务**，也是一个Binder，可以用来进程间通信，还是一个**线程**

从系统运行的角度看，AMS可以分为**Client端**和**Service端**：

Client端运行在各个app进程，app进程实现了具体的 Activity，Service等，告诉系统我有那些Activity，Service等，并且调用系统接口来完成显示；

Service端**运行在 SystemServer进程**，是系统级别的ActivityManagerService的具体实现，其响应Client端的系统调用请求，并且**管理 Client端各个app进程的生命周期**。

## Activity、Window、DecorView以及ViewRoot之间的层级关系

![img](Android-notes.assets/17270030353801.png)

Activity里面会在activity.attach(）的时候创建一个**PhoneWindow**，内部有一个内部类**DecorView**来加载布局xml文件。这个DecorView就是视图树的根节点，也就是最顶层的View，**DecorView**根据不同的主题，可能加载不同的布局格式。我们平时自定义的布局文件通过**setContentView**方法加载，其实就是加载到DecorView的ContentViews里面，Window 通过WindowManager将DecorView加载其中，并将DecorView交给ViewRoot。

ViewRoot:**连接WindowManagerService和DecorView的纽带**。所有View绘制、触摸事件分发、界面刷新等都是通过它来执行或传递的。ViewRoot对应ViewRootImpl类。Window里面加载DecorView就是通过ViewRootImpl添加的。

他和前面几个的关系是Activity里面会有WindowManager，里面会有ViewRoot

## View的加载流程

**Step1：初始化PhoneWindow和WindowManager**

Activity 是在 ActivityThread 的 **performLaunchActivity** 中进行创建的，并在**attach**()方法中创建了PhoneWindow，并初始化WindowManager。

**Step2：初始化DecorView**

系统执行完attach()方法后，会执行onCreate()方法，在onCreate()方法中执行setContentView()方法将布局xml文件解析为View并设置到DecorView里面的ContentViews控件。

**Step3：ViewRootImpl创建和关联DecorView**

WindowManager的**addView**()方法会创建一个**ViewRootImpl**，把DecorView传给了ViewRootImpl中的setView()方法。

**Step4：建立 PhoneWindow 和 WindowManagerService 之间的连接**

WindowManagerService是所有Window窗口的管理者，负责Window的添加删除、事件派发等。每一个Activity都有一个PhoneWindow对象，操作PhoneWindow对象进行显示等操作，都需要和WindowManagerService进行交互。在上面第三步中的ViewRootImpl的setView()方法中，会执行setView()方法，会调用 requestLayout()方法，并且通过 WindowSession 的 addToDisplay()方法 与 WindowManagerService 进行交互。WindowManagerService 会为每一个 Window 关联一个 WindowStatus。到此，我们已经把DecorView加载到Window中了。

**Step5：建立与SurfaceFlinger的链接**

SurfaceFlinger主要对图层数据进行合成，然后发送到屏幕渲染。在第4步中，WindowStatus会创建一个SurfaceSession，SurfaceSession 会在 Native 层构造一个 SurfaceComposerClient 对象，它是应用程序与 SurfaceFlinger 沟通的桥梁。

**Step6：申请Surface**

View绘制会从ViewRoot的performTraversals()，按照Measure() -> Layout() -> Draw()经典流程完成View绘制。不过在此之前还会执行一个重要的函数relayoutWindow()。

## View的绘制

1. Activity attach()方法中创建了PhoneWindow，并初始化WindowManager
2. 在onCreate()方法中执行setContentView()方法将布局xml文件解析为View并设置到DecorView里面的ContentViews控件。
3. ViewRootImpl创建，关联DecorView
4. View绘制会从ViewRoot的performTraversals()开始

View绘制会先试用relayoutWindow()方法，把Java层的Surface和Native层的Surface关联在一起。然后从ViewRoot，按照Measure() -> Layout() -> Draw()经典流程完成View绘制。

**Measure(测量)**:通过递归的方式测量子view的宽高。有两个贯穿整个流程的变量，**widthMeasureSpec**和**heightMeasureSpec**。这两个参数根据通过**父布局的MeasureSpec**和自身的**布局参数LayoutParams**。这有几种测量模式，如果xml中是match_parent表示父View希望子View的大小是确定的。wrap_content，View的大小不能大于父容器的大小。不确定大小，父View完全依据子View的设计值来决定。

**Layout（布局）**:View的布局主要是通过确定上下左右四个关键点来确定其位置。**值得一说的是**，测量时，先测量子View的宽高，再测量父View的宽高。但是在布局时顺序则相反，是父View先确定自身的布局，再确认子View的布局。

**Draw（绘制）**: 先绘制背景，再绘制父View，最后绘制子View 最后一层层绘制会涉及canvas

## 自定义View

自定义View的绘制从构造函数到**三大绘制方法**。

onMeasure()定义自己的测量方式并遍历测量子View的宽高。

onLayout() 自定义View中，一般不需要重写该方法。但在自定义ViewGroup中可能需要重写，一般做法是循环取出子View，并计算每个子View位置等坐标值，然后使用**child.layout**方法设置子View的位置

onDraw() 需要使用Canvas API函数

**继承系统提供的现有控件的自定义View**:

在定义自定义View的时候可以选择**继承某一个基本的View**，比如MyTextView extends TextView。然后我们就可以根据需要重写onDraw方法。在里面设置画笔颜色和宽度，使用canvasAPI方法绘画 。最后只要在xml文件里直接引用该控件即可

**继承View类的自定义View**:

除了涉及三大绘制方法之外

- **padding属性处理**；
- **wrap_content属性处理；**
- **提供自定义属性，方便自定义View的属性配置；**
- **如果涉及触摸操作，还需要重写onTouchEvent()方法来处理触摸事件；**

**自定义View优化**:

- **onDraw()尽量不分配内存：onDraw()被调用频率很高，如果在此进行内存分配可能会导致GC，从而导致卡顿；**
- 使用含有参数的invalidate()：不带参数的invalidate()会强制重绘整个View，所以如果可能的话，尽量调用含有4个参数的invalidate()方法；
- 减少requestLayout()调用：requestLayout()会使系统遍历整个View树来计算每个View的大小，是费时操作；

## 事件分发

一个事件会经过：按下 --》 滑动 --》抬起，这三个阶段，这些事件会在代码里会封装成一个**MotionEvent**。系统就会将其传递给View树，MotionEvent在View的**层级传递**，并最终得到处理的过程，就是触摸事件分发流程。

Activity/Window --> ViewGroup --> View

onTouch()、onTouchEvent()、onClick()优先级：onTouch() > onTouchEvent() > OnClick()

传递过程中有事件分发、拦截事件、事件处理三个方法。在事件分发的函数里面会调用拦截时间函数判断是否拦截当前事件。不拦截则继续传递，拦截了就会调用事件处理函数去处理当前事件。注意，当调用事件处理函数去处理的时候他可以选择抛给父控件的事件处理函数去处理。

如果子 View 处理了 ACTION_DOWN 并且返回 true，表示它消费了这个事件。此时，父 View 将不会收到这个事件，而是将事件传递给子 View 进行处理。
也就是说如果子 View 消费了 ACTION_DOWN，父 View 通常不会收到 ACTION_UP。

缺点：

首先第一个是责任链模式带来的性能问题，第二个是由于被拦截处理，会出现嵌套滑动冲突问题。那么如果我们两个组件一个只能上下滑动，一个只能左右滑动的情况下，只会被一个处理掉， 不能同时生效。ViewPager和RecyclerView同时使用
如何解决：要么重写ViewPager或者RecyclerView，要么使用更新的组件NestedScrollView

## 序列化

序列化就是将对象之类的信息转化成字节流格式储存下来，进行网络传输或者需要长久存储数据的时候经常用到。Android里面有两种方式实现序列化，一个是Java自带的序列化方法Serializable，另一个就是安卓的Parcelable接口，其实现原理是把对象分解为Intent支持的数据类型，并通过Intent进行传输，其数据可以保存在内存中，相对于Serializable将数据保存在磁盘，效率自然更高。

## Launcher启动Activity/APK的流程

1. 点击桌面App图标，Launcher进程采用**Binder**跨进程机制向**system_server进程**发起startActivity请求；
2. system_server进程接收到请求后，向Zygote进程发送创建进程的请求，**Zygote进程**fork出新的子进程，即新启动的**App进程**；
3. App进程，通过Binder机制向sytem_server进程发起**attach**请求（绑定Application）；attach的作用是**创建 Application** 和 **Context**，**phoneWindow、WindowManager**
4. system_server进程在收到请求后，进行一系列准备工作后，再通过binder机制向App进程发送**scheduleLaunchActivity**请求；
5. App进程的binder线程（ApplicationThread）在收到请求后，通过handler向主线程发送LAUNCH_ACTIVITY消息。主线程在收到Message后，**通过发射机制创建目标Activity，并回调Activity.onCreate()/onStart()/onResume()等方法，经过UI渲染结束后便可以看到App的主界面。**

一孵二绑三准备

## MVC、MVP、MVVM

**MVC**:

1. Model：放数据。
2. View：直接与 Model 交互以获取数据并显示。
3. Controller：调用 Model 的方法来处理业务逻辑，并根据结果更新 View。

**M层和V层还有交互，没有做到完全分离。**

**MVP**:

在MVC的基础上，用Presenter代替Controller，此时MVP具体为：

1. Model：放数据。
2. View：将用户操作传递给 Presenter。
3. Presenter：Presenter 处理逻辑，并更新 Model。Presenter 再通过调用 View 的方法来更新 UI。

**自此视图和数据真正分离了。**

**MVVM: LiveData+DataBinding**

1. View 使用 `observeAsState()` 观察 `LiveData`，通过观察来实现自动更新UI
2. ViewModel中写好方法对数据进行操作
3. 使用DataBinding 将 ViewModel 中的数据直接绑定到 XML 布局中的 UI 元素，是一种**双向绑定**

**DataBinding**代替findViewById()方法

LiveData：是 Jetpack 新推出的基于观察者的消息订阅/分发组件，具有宿主（Activity/Fragment）生命周期感知能力。这种感知能力可确保 LiveData 仅分发消息给与活跃状态的观察者，即只有处于活跃状态的观察者才能收到消息。LiveData 默认支持粘性事件且无法取消（即使事件发送之后，仍然可以被后来订阅的观察者接收）。由此会发生数据倒灌（当新订阅者加入时，接收到大量历史数据）。

MVVM架构中ViewModel为什么在翻转屏幕之后还能保持原来的界面：
主要是因为ViewModel的生命周期与Activity或Fragment的生命周期是分开的。
当Activity或Fragment被销毁（如旋转屏幕）时，ViewModel不会被销毁，除非它的宿主Activity被完全销毁（例如，用户在应用外部导航）。

## MVI（Model-View-Intent）

出现的目的是为了解决MVVM中双向绑定数据的不足。把双向绑定变成单向数据流。

1. 使用StateFlow代替LiveData存储数据， 将状态集中封装在一个 State 对象中管理。天然适配compose，既可以保证UI状态同步，还不用写`observe` 方法，只需要collectAsState 就可以了。
2. 使用Intent将数据操作的方法封装成数据类。视图的按键出发Intent，ViewModel根据不同的Intent处理数据变化。这种单向数据流避免了双向绑定，减少了潜在的循环依赖和状态不一致的问题。
3. MVI 将状态（ViewState）和事件（ViewEffect）进行分离：

- **`ViewState`**：持久的 UI 状态，控制 UI 的显示，如是否显示 USB 更新按钮。
- **`ViewEffect`**：一次性的、瞬时的事件，如导航操作或显示一个 Toast。

`val uiState by dialogViewModel.uiState.*collectAsState*()`

## Android WMS

Android 中的 WMS 指的是 Window Manager Service（窗口管理服务）。WMS 是 Android 系统中的核心服务，主要分为四大部分，分别是窗口管理，窗口动画，输入系统中转站和 Surface 管理 。负责管理应用程序窗口的创建、移动、调整大小和显示等操作。

在ApplicationThread 启动Activity的时候用attach函数将view和activity绑定，将Window和WMS绑定。绑定完成之后才会调用callActivityOnCreat函数来启动Activity的OnCreat函数，这个时候才会执行setContentView才会把具体的xml加载到Contentview里面。

## Binder-跨进程通信（IPC）

跨进程通信机制，采用服务端/客户端结构，主要包含**服务端、客户端、ServiceManager、Binder驱动**4大部分。

Binder机制使用了代理模式，通过生成远程服务的本地代理来实现不同进程之间的通信。
当一个客户端进程想要调用服务端进程的方法时，Binder机制会为服务创建一个本地代理对象。客户端通过这个代理对象与服务进行交互，而无需直接处理跨进程的复杂性。

进程之间内核空间共享，用户空间隔离。因此无法直接访问其他进程的数据，Binder使用**内存映射**的方法走内核缓存区的方式实现进程通信。多个进程会将自己的**虚拟内存区域**对同一个**共享对象**进行内存映射。当一个进程操作虚拟内存区域的时候，共享对象会相应的发生变化，同时映射到另一个进程的虚拟内存区域。

一般的进程间通信方式比如消息队列和Socket都需要两次是数据拷贝（发送方->内核->对方缓存区）而Binder只需要一次（发送方->内核缓冲区）。

优势：性能（一次拷贝）安全（鉴定UID/PID来验证身份）稳定（比共享内存稳定）

## Handler

举例：在DownloadUtils类中实现下载进度的回调，可以使用Handler机制来传递下载进度。
只需要在DownloadUtils中创建下载回调接口，使用 handler.post调用接口的方法发送进度，最后在Activity中实现接口的方法更新UI即可。

**用途**:

基本用途：比如在子线程执行完耗时操作之后使用Handler在主线程更新UI

高级用法：利用 Looper 判断当前线程是否是主线程；

```Java
Looper.getMainLooper() == Looper.myLooper();
```

涉及四个概念，Handler，MessageQueen，Message，Looper

- Handler：主要作用是发送信息以及处理信息（为何发送还自己处理？），其中发送的信息叫作Message，可以传递数据；会调用自己的**handleMessage**()方法来处理Message，因此自定义的Handler都需要重写handlerMessage方法,继承BaseHandler类。
每个消息都有一个target字段，指向处理该消息的Handler。在Handler的handleMessage()方法中，可以通过msg.getTarget()来获取消息的目标Handler。

- MessageQueue：消息队列，由一个一个Message汇成，遵循先进先出规则，由Looper进行管理；

- Looper：从MessageQueue里读取消息，并按消息分发机制分配到目标Handler进行消息处理。

**Looper变量的前世今生**:

创造：通过调用**Looper.prepare**()函数，检查是否已经存在Looper，不存在则new一个，存在ThreadLocal里面。

获取：在Handler的构造函数里面会使用**Looper.myLooper**()获取Looper 如果没获取到会RuntimeException提示我们要事先运行Looper.prepare()，在构造函数里面还会关联MessageQueue

主线程能直接使用Handler：因为主线程ActivityThread的main()函数已经自动执行了Looper.prepare()函数。

MessageQueue是在Looper构建函数里生成的。

loop()方法中一直在死循环做三件事：

- 调用next方法从MessageQueue里获取Message；
- 通过dispatchMessage方法将Message分配到目标Handler；有优先级的
- 通过recycleUnchecked方法回收Message；

**dispatchMessage方法中决定谁去处理Message？**

有优先级的，Message里自带的callback优先级最高，其次是Handler的Callback ，最后是Handler的handlerMessage()方法

**Handler发送信息的方法有几种**:

post ： 接收一个**Runable对象转化成Message的callback去调用sendMessageDelayed()，一般会配合lambda表达式**

send： 发送一个Message对象

post和sendMessage本质上没有区别

无论是post还是send，最后都是用SystemClock.uptimeMillis()获取系统开机到当前的时间，**加上我们设置的delayMillis时间**，并调用sendMessageAtTime()方法做进一步逻辑。

注意：不能用System.currentTimeMilis（系统时间），因为用户很可能自己修改系统时间。

最后都是调用队列的queue.enqueueMessage(msg, uptimeMillis) 方法来加入队列，值得一提的是enqueueMessage会根据消息要执行的时间按来寻找合适的位置插入队列。

**Message的获取**：尽量用Message.obtain()来获得一个Message实例的，因为这种方案是直接从Message的消息池里直接获取，避免了new Message()的重复创建开销。

去除Message的时候如果队列里面，下一条需要执行的消息,队列中消息为空时，则会进行阻塞操作,这个阻塞操作是使用管道实现的。

**Handler 引起的内存泄露原因以及最佳解决方案**

因为Handler一般是作为Activity的内部类，可以发送延迟执行的消息，如果在延迟阶段，我们把Activity关掉，此时因为该Activity还被Handler这个内部类所持有，导致Activity无法被回收，没有真正退出并释放相关资源，因此就造成内存泄漏。解决方法就是将 Handler 定义成静态的内部类，在内部持有 Activity 的弱引用，或者是onDestroy()中调用handler.removeCallbacksAndMessages(null)及时移除所有消息。一般我们都是将Handler抽离出来作为BaseHandler，然后让Activity去继承BaseHandler

**子线程中怎么使用 Handler？**

子线程要使用Handler关键的点在于要执行Looper.prepare() 和 Looper.loop() 然后在这之间放置子线程要执行的任务。

**Looper.loop()死循环一直运行是不是特别消耗CPU资源呢？**

不会，调用queue的next()方法获取下一个消息，如果没有消息会阻塞，释放CPU资源

**Handler的同步屏障**:

就是指屏障消息，是一种特殊的Message，他的target是null就是不指定Handler，用来拦截队列中的同步消息，放行异步消息。原理是在Looper循环取Message队列中的消息的时候进行判断，如果判断到了屏蔽消息就把屏蔽消息后面的异步消息执行，否则就继续找。 总结就是优先执行异步消息

同步消息就是等待执行完成才开始下一步，异步消息就是不等待执行完，并行执行任务。

使用场景：

1. View UI界面更新的逻辑，通过同步屏障+异步消息可以保证消息被优先处理，保证界面的迅速更新。
2. 并行计算: 让多个线程都执行完自己那部分的计算之后，再继续执行下一步

### HandlerThread

HandlerThread 是一个带有消息循环（Looper）的线程，它是 Thread 的子类，专门用于创建一个可以处理异步任务的后台线程。HandlerThread 自带一个 Looper，可以让我们在子线程中使用 Handler 来处理消息。

可以直接拿到looper然后创建Handler执行后台任务

### **IdleHandler**:

IdleHandler 实际上是一个接口，在消息循环空闲的时候（没有消息）进行的回调方法。接口方法的返回值代表是否需要移除当前 IdleHandler。从本质上来说，IdleHandler 的作用就是趁着消息队列空闲的时候干点事情，具体干啥，就要看 IdleHandler 的 queueIdle() 方法了。**在ActivityThread中有一个GCIdleHandler，用于做GC的。**

一般会在消息队列中没有消息的时候执行**IdleHandler**中的任务，然后移出**IdleHandler**

**mIdleHanders 一直不为空时，为什么不会进入死循环？**

只有在 pendingIdleHandlerCount 为 -1 时，才会尝试执行 mIdleHander；

pendingIdlehanderCount 在 next() 中初始时为 -1，执行一遍后被置为 0，所以不会重复执行；

## 安卓跨线程通信

1.  Handler
2.  runOnUiThread方法
3.  View.post(Runnable r) 
4.  AsyncTask

### wait和sleep的区别

wait是和synchronized 一起使用的，会主动释放锁。sleep传入时间参数不释放锁。

sleep 时间到之后自己唤醒，wait需要别的线程调用notify 唤醒

### AsyncTask

是一个轻量级的异步任务类，可以在线程池里执行比较耗时的后台任务（doInBackground），然后把执行的进度和最后的结果传递给主进程，并在主进程中更新UI（onPostExecute()）。可以反馈任务的进度。

上面几个核心方法的调用顺序为： onPreExecute() --> doInBackground() --> publishProgress() --> onProgressUpdate() --> onPostExecute()。

不足之处：

1. 生命周期：需要再onDestroy手动结束
2. 内存泄漏：和Handler一样，如果被声明为非静态内部类，会保留对Activity的引用，导致Activity无法被回收
3. 结果丢失：屏幕旋转或者被后台杀死之后，Activity重建，如果之前运行的AsyncTask是非静态的内部类，此时就会持有之前旧的Activity的引用，UI是无法成功更新的。

## AIDL - 跨进程通信（IPC）

https://blog.csdn.net/qq_32019367/article/details/122342122?spm=1001.2014.3001.5502

AIDL是建立在Binder机制之上的

AIDL是为了实现跨进程通讯，比如自**不同应用的客户端跨进程通信访问你的Service**，比如我们要传输一个自定义的类，那么就要创建类.aidl,创建 AIDL 接口了。有自己的服务Service，通过Binder进行连接和通信

数据的传输使用了Binder，但是bundle传递数据时只支持基本数据类型，所以在传递对象时，需要先将对象进行**序列化**，转换成可存储或可传输的字节流。

实体类：实现Parcelable接口，可序列化。然后创建AIDL接口

服务器：实现AIDL接口，并重写方法

客户端调用AIDL中定义的方法，接收/返回数据

## JNI和NDK

JNI（Java Native Interface）就是Java本地化接口。用来调用Native层的C++方法的中间件。NDK（Native Development Kit），翻译过来是“本地开发工具” 是用来开发JNI的。JNI有静态注册和动态注册两种方式，本人在实际开发中，多用**动态注册**。

**静态注册**:根据函数名建立Java方法和JNI函数的一一对应关系，这样虚拟机加载so库时，就会将该函数链接到对应的Java层native方法

**动态注册**:使用 JNINativeMethod 结构体指针来保存Java层声明的native方法和Native层函数的关联关系，这样java加载完动态链接库的时候就会动态完成注册

实际上我们创建JNI工程的时候AndroidStudio会自动在Build.gradle里面配置生成.so库的目标平台和 CMake 文件的路径

## 内存优化

内存优化的目的是为了避免出现内存泄漏，**内存溢出（OOM：Over Of Memory)**、内存抖动等问题：

**内存泄漏**：当一个对象A在程序中已经打算释放了，但有其他对象持有对象A的强引用，导致对象A不能正常被系统回收，继续占用着内存，如此反复使实际可使用内存越来越小。

**内存溢出**：当内存使用量超过了虚拟机分配给当前程序的最大值时，就会发生内存溢出。出现这种情况很可能是加载的资源太多，如加载大图片，或者分配了很大的数组等变量，或者是太多的内存泄漏最终导致内存溢出；

**内存抖动**：当内存频繁分配和回收导致内存不稳定，就会出现内存抖动，它通常表现为 **频繁GC**、内存曲线呈锯齿状；

### **内存泄漏**: 

**Handler 内存泄漏**: Acticity让Handler执行延迟任务的途中，Activity关闭了。但是消息队列里面这个消息没有执行完，他就保存着Handler的引用，导致Activity（Handler一般作为Activity的内部类，而非静态内部类会一直持有外部类的引用）也无法被回收。常用的解决方法是：让Handler成为Activity的静态内部类（弱引用）或者在onDestroy()中调用handler.removeCallbacksAndMessages(null)及时移除所有消息。

**非静态内部类的静态实例导致内存泄露**：解决办法同上，设置为静态内部类、将内部类抽取为一个单例、使用Application的Context。

**注册了广播接收器，当Activity销毁时没有注销**

**图片**:Bitmap对象不使用时没有调用recycle()释放内存或者设置为null，也会导致内存泄漏。 

如何检测内存泄漏：

1. 检查整个程序的内存泄露：

运行程序，所有功能跑一遍，确保没有改出问题，完全退出程序，手动触发GC，然后使用adb shell dumpsys meminfo packagename -d命令查看退出界面后Objects下的Views和Activities数目是否为0，如果不是则可能有内存泄露。然后进行更进一步的定位

1. 检查某一个具体Activity的内存泄露：

反复打开关闭页面5次，然后收到GC（点击Profile MEMORY左上角的垃圾桶图标），如果此时total内存还没有恢复到之前的数值，则可能发生了内存泄露。此时，再点击Profile MEMORY左上角的垃圾桶图标旁的heap dump按钮查看当前的内存堆栈情况，选择按包名查找，找到当前测试的Activity，如果引用了多个实例，则表明发生了内存泄露。可以点击垃圾桶图标旁边的 **Heap Dump** 按钮，生成堆快照文件，按包名查找相关的类。

1. 使用LeakCanary监听内存泄露

监听单个对象的内存泄露，现在只需要导入这个依赖就可以自动实现内存泄露检测，但是只能在debug模式下用。
如果考虑到上线之后的监测，可以使用Firebase。

### OOM:内存溢出

存放很大的对象。很大的图片

https://juejin.cn/post/6844904096541966350

### 内存抖动：

- **循环中创建占用内存较大的对象**，比如bitmap，最后引起内存抖动；
- 自定义View**在onDraw中创建对象**，因为自定义View的onDraw方法会被频繁调用。如果频繁创建对象，甚至较大的对象，会导致内存增加，甚至内存抖动；

可以在Android Studio的memoryProfile中观察到这一现象

### 减少内存使用

减小对象内存占用：使用轻量级的数据结构

内存对象的复用：线程池、Message的获取

## ANR（Application Not Response）卡顿优化

https://juejin.cn/post/7372913965883637775?searchId=2024090517275867E2C5ECC97CBC12C338

**造成卡顿的原因**:内存占用、CPU使用率、IO操作

**CPU使用情况获取的方法**:top指令、ps指令、dumpsys cpuinfo、读取/proc/stat文件

Application Not Respongding，简称ANR，翻译为中文即是“应用程序无响应”。

造成ANR的原因是活动、服务、广播接收器在规定的时间里没有执行完任务或者没有响应用户操作，可能有以下原因：

- **主线程进行IO操作**，引起阻塞；
- **主线程执行耗时操作**；
- 主线程有错误操作，如Thread.sleep等直接导致主线程阻塞；
- 执行速度缓慢的广播接收器；
- **出现死锁**；
- **主线程使用Binder和另一个进程通讯，另一个进程需要很长时间才返回；**
- 主线程使用 SharedPrederence：SharedPrederence 调用 apply 方法，会创建一个等待锁放到 QueuedWork 中，并将真正数据持久化封装成一个任务放到异步队列中执行，任务执行结束会释放锁。Activity onStop 以及 Service 处理 onStop，onStartCommand 时，执行 QueuedWork.waitToFinish() 等待所有的等待锁释放。其实不管是 commit 还是 apply，都是在主线程进行 IO 操作，那么都是可能会产生 ANR 的。

**改善ANR的方法**:

- 主线程耗时操作导致；
- CPU、内存、IO操作占用资源太高导致；
- 耗时操作在子线程里处理
- 避免在在Activity的onCreate()和onResume()等方法少执行耗时的代码。

**卡顿的分析方法**:

- 当一个进程发生了ANR，系统会在/data/anr目录下创建一个traces.txt文件
- Android Studio的CPU Profiler

## Crash

https://juejin.cn/post/6844903434294919175?searchId=2024090911222306C68092BE1C73B7A503#heading-1

NullPointerException：空指针异常，一般是对象本身没有进行初始化，或者被回收了。

OutOfMemoryError：内存溢出，有可能是内存泄露导致的。

## 启动优化

https://juejin.cn/post/7354233812593246248

https://juejin.cn/post/7359347999309807654

应用的启动有三种类型：冷启动 > 温启动 > 热启动

**冷启动**:创建进程、启动应用、绘制界面，时间是比较长的冷启动一般会作为启动速度的一个衡量标准。**冷启动优化的方向是 Application 和 Activity 的生命周期阶段，这是我们开发者能控制的时间，其他阶段都是系统做的。**

**温启动**:比如应用退回桌面又重新点开,会重新走onCreate()函数重新创建Activity，这时候我们能做的也就只有保证应用的生命周期里面没有耗时操作。

**热启动**:切到后台又切回前台，这里面不需要重新加载布局。

我们一般会查看启动耗时，对比冷启动的耗时。使用**am start -W**，其中显示的TotalTime就是启动的耗时，或者使用**CPU Profiler**，可以清晰地看到方法调用栈一层层所用的时间和CPU占用

项目中遇到的问题：首页显示太慢

优化方案：

1. 在 App 创建的过程中，先展示一个空白页面，让用户体会到点击图标之后立马就有响应。
2. 第三方库懒加载，比如Glide
3. 布局懒加载：Kotlin 中 binding 使用 by lazy

## RecycleView

### 缓存机制

会将移出屏幕的列表项缓存起来不会销毁。这种缓存涉及到多重缓存机制

1. mAttachedScrap  ：当前屏幕内的可见的，为了避免出现像「局部刷新」这一类的操作，比如移除了某一项，其他项不应该被重绘而是位置的变化。
2. mCachedViews ：已经移除屏幕的，大小默认是2个数据
3. mRecyclerPool：缓存池中的项

RecyclerView最多可以缓存 N（屏幕最多可显示的item数） + 2 (屏幕外的缓存) + 5*M (M代表M个ViewType，缓存池的缓存) 只有最后一级的缓存池查找到才会调用bindViewHolder，其他的不会

并且RecycleView还会采用预加载机制异步地预取屏幕外的项目，填充屏幕空白区域，确保这些项目在需要展示时已经被预加载，默认预加载**两屏**

**RecyclerView的缓存机制,滑动10个，再滑回去，会有几个执行onBindView？**

如果一开始滑动的是新数据，那么滑动10个，就会走10个bindview方法。然后滑回去，会走10-2个bindview方法。一共18次调用。

如果一开始滑动的是老数据，那么滑动10-2个，就会走8个bindview方法。然后滑回去，会走10-2个bindview方法。一共16次调用。

### **LinearLayoutManager的预拉取机制**

1. 预拉取指预先拉取待进入屏幕区域内的一部分列表项视图并缓存起来，从而减少因视图创建或数据绑定等耗时操作所引起的卡顿。
2. RecyclerView也把预拉取的实际工作委托给了一个名为GapWorker的
3. 预拉取的三个时机：被拖动、惯性滑动、嵌套滚动
4. 预拉取的数据会缓存在第二级缓存里面，此时第二级缓存的容量变为3。虽然缓存复用的对象和预拉取的对象共用同一个mCachedViews结构，但二者是分组存放的，且缓存复用的对象是排在预拉取的对象前面的
5. 预抓取利用了UI线程绘制完成后将帧发送渲染之后的一段空闲时间安排工作，有一个最后期限，必须在下一帧开始绘制之前完成

## 项目上线后有监听内存泄漏的那种机制吗

LeakCanary ，一个内存泄漏分析框架，只需要引入依赖即可，会自动检测`Activity` 、`Fragment` 、`View` 、`ViewModel` 、`Service` 对象的内存泄漏

##  加载大图需要注意些什么

Android中图片以位图（Bitmap）的形式存在。

加载大图需要注意两个方面，一个是加载耗时，一个是存储空间。加载耗时意味着必须放到子线程中去完成，存储空间则需要涉及缓存机制，分割加载，图片缩放裁剪等问题。

项目中用的最多的也是Glide，它有多级的缓存机制，加载图像。考虑到网络状态可以使用Network Connection Class库去监听网络状态，根据网络情况选择合适的图片质量。

位深：对Bitmap进行压缩存储时存储**每个像素所用的bit数**，位数越多，图像的色彩也就越丰富细腻。常见的是色深32位(ARGB_8888)一个像素占用四个字节的内存

## 开源框架：OKHttp了解源码(几个核心亮点一定要记好)

特性：

1. 支持基于HTTP/2的共享socket连接
2. 连接池减少请求延迟
3. GZIP压缩减少响应的数据大小
4. 缓存相应内容，避免重复请求
5. 网络出现问题后，OKHttp保持不变，自动从问题中恢复

使用：

1. 封装OkHttpUtils的工具类实现get和post请求的方法，传入url和Callback参数即可
2. 创建OkHttpClient设置超时时间，BasicAuth
3. 创建Request传入url
4. 创建请求call ： Call call = okHttpClient.newCall(request);
5. 设置callback ： call.enqueue(mCallback);

其实这里有性能浪费，每次调用sendGet方法时都会创建一个新的OkHttpClient实例，刚好的情况是使用单例，第一次创建OkHttpClient的实例，后面调用同一个实例。

**拦截器：（责任链模式）**

为了避免请求发送者和多个请求处理者关系耦合，因此将所有请求处理者连成一条引用链。请求发生时沿着链传递，直到有对象处理它为止。在请求的过程中，我们随时可以拦截请求的数据，并插入我们自己的业务代码（**自定义拦截器**）。


优点：将请求和处理分离，两者各自注重实现自己的功能。还可以创建自己的拦截器，在指定的位置拦截处理消息。
缺点：性能问题，一个请求必须从头遍历整个链条，直到找到符合要求的处理类。在链条特别长，性能是个很大的问题。

**双任务队列**:

分别是等待队列和执行队列，新加入的请求任务 AsyncCall 首先会进入 ReadAsyncCall 队列中，然后进行一系列的判断后，加入 RunningAsyncCall 队列中，然后，利用线程池去执行这个请求任务AsyncCall。

亮点：OkHttp最出彩的地方就是在try/finally中调用了finished函数，可以主动控制等待队列的移动，而不是采用锁或者wait/notify，极大减少了编码复杂性。

**Socket连接池复用机制**:

网络连接的过程中，避免不了 3 次握手和 4 次挥手，而 http 请求，往往都是响应式的请求方式，请求成功之后，连接立马就断掉。下个请求到来，重新去建立连接，这样就造成了一定程度上的浪费。OkHttp 通过 通过**KeepAlive**机制，保活了 5 条链路 5 分钟的生命周期，在这 5 分钟内，若是有请求到来，可以直接使用之前的 链路。

## Kotlin
### 协程的优势

官方给它的定义就是：轻量级线程。

**轻量**：体现在上下文切换效率（CPU调度的时候如果两个线程不属于同一个进程）比较高，和函数调用差不多。并且也不需要加锁了，因为都是在同一个线程上去跑的。

**协作式并发**: 程序员可以精准的控制执行顺序和时机：两种挂起函数launch和withContext 来选择并行还是串行执行协程中的任务。还可以通过制定不同的调度器来制定任务在那个线程中执行。

**高并发性**：这里官方举了一个例子，开启五万个协程和五万个线程打印五万个点，协程可以让很多的协程任务放在一个线程上去执行，通过CPU时间片的调度去完成任务。

**线程切换**：方便执行I/O操作，通过调度器方便的切换任务执行执行的线程而不用使用回调函数

**协程的delay也比线程的sleep更有优势**：sleep会让线程卡主啥也不做，而delay会让出线程

### 挂起函数

协程的挂起本质就是切线程

协程代码块不是一开始就切换线程执行的，他是会执行到挂起函数的时候将协程从当前线程挂起。此时当前线程的代码仍然会继续执行，只是跳过了协程中的任务。然后协程中的代码根据调度器跑到其他线程里面去完成任务，完成之后再切回来。在此过程中，协程代码块中的任务会继续进行，而不是卡住不动

挂起函数要么在协程里面被调用要么在另一个挂起函数里面被调用。一般用suspend关键词去修饰挂起函数

### Compose的特点 - 可组合函数、声明式开发框架

https://juejin.cn/post/7070158120831418381#heading-1

原生 View 体系下，需要减少布局的嵌套层次，布局嵌套越深，测量的次数会成指数级增长，绘制的时间越长。而Compose不允许进行多次测量，多层嵌套测量次数只会线性增长。简而言之，父节点会在其子节点之前进行**（固有特性测量）**，然后在其子节点的尺寸和放置位置确定之后再对自身进行调整。绘制步骤从以前的测量、布局绘制，变成了现在的**组合、布局、绘制**。

所以在写界面的时候我们通常会在一个composable函数里面组合多个composable函数。

**固有特性测量**就用于满足 **父布局和子项的宽高需要两者来共同确定** 这种需求，其提供了一种机制用于在正式测量前能够让布局组件预先获取到子项对尺寸的 **期望值**，这些期望值包括：在特定的宽度下，子项能够正常显示的最小高度和最大高度分别是多少？以及在特定的高度下，子项能够正常显示的最小宽度和最大宽度又分别是多少？在拿到这些期望值后，也就知道了父布局在特定宽度或高度下能够正常显示的尺寸大小范围

## 其他

### 图像加载框架-Glide

https://blog.csdn.net/qq_32019367/article/details/103883118

1. 通过网络链接加载图像

2. 生命周期集成：Glide与Activity和Fragment的生命周期进行集成，确保在适当的时机停止和销毁请求，避免内存泄漏和无效的请求。

3. 缓存机制：使用内存缓存和磁盘缓存来提高图片加载的性能，也是一个多级缓存机制（活动、内存、磁盘、网络）涉及 LRU(缓存淘汰算法/最近最少使用算法)缓存机制

三个缓存方案

| ActiveResource | 内存缓存，采用Map<Key, WeakReference> 弱引用的方案保存正在使用的资源，防止出现LRU导致正在使用的资源被回收 |
| -------------- | ------------------------------------------------------------ |
| LruCache       | 内存缓存，采用最近最少使用的策略，保证资源的使用效率，且尽量避免出现OOM问题 |
| DiskLruCache   | 磁盘缓存，最近最少使用的策略，减少对网络耗时的请求操作       |

