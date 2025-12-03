# Launcher设计的难点

1. 性能优化：Launcher作为用户与设备交互的第一界面，必须保证启动速度快、响应迅速，并且在使用过程中保持流畅的滑动和切换效果。这需要对UI线程和后台线程的任务进行合理的分配和管理，以及对资源的高效利用。
2. 数据管理与缓存：Launcher需要管理大量的应用数据、图标和小部件信息。有效地管理这些数据，并且在用户需要时快速地加载和刷新，是一个技术挑战。此外，需要考虑到数据缓存的策略，以减少网络请求和提升性能。
3. 自定义功能：提供一些自定义功能，如图标和小部件的大小调整、手势操作等，以增加用户对Launcher的个性化定制。这需要设计灵活的架构，并且在不影响性能的前提下实现。

# Launcher3

## 基本界面

页面一:主界面是一个Workspace的控件 ，里面有如下的几个组件：

1. SearchDropTargetView的控件：搜索框
2. CellLayout：应用图标
3. PageIndicator：页面导航
4. Hotseat：菜单按钮

## 数据加载流程

1. ### 基础概念：

Launcher:继承Activity,是桌面的主界面,因此可知,桌面其实就是一个activity,只是和平常的应用不同,他用来显示图标、Widget和文件夹等;

LauncherModel:继承BroadcastReceiver,由此可知他是一个广播接收器,用来接收广播,另外,LauncherModel还主要加载数据;

LauncherProvider:继承ContentProvider,主要是处理数据库操作;

LauncherAppState:单例模式的全局管理类,主要是初始化一些对象,注册广播等.

Compat:兼容包,带有这个后缀的都是做兼容处理的类.

1. ### 默认图标配置

主要是加载内置应用

首先workspace 的xml有几种不同的布局文件，分别是4*4 ，5*5，5*6

hotseat的xml中则是配置了几个常用应用，

1. ### Launcher启动过程

安卓源码中的startHomeActivityLocked这个方法调用的启动Launcher，它会根绝我们在MAnifest.xml的配置文件中找到Intent.CATEGORY_HOME 标记的应用。在内置了多个Launcher的时候会让你选择将哪个作为主屏幕，一般只编译一个Launcher就默认使用这个。

1. ### Launcher初始化

**attachApplication方法：**使用thread.bindApplication方法来绑定application绑定 Application ，创建 Context，phoneWindow、WindowManager

**ContentProvider的onCreate方法**：启动严苛模式和创建数据库，将ContentProvider放置到整个Launcher的管理类LauncherAppState中，以方便获取。

**Launcher中的onCreate方法：**

1. 初始化LauncherAppState
2. 初始化手机固件信息对象DeviceProfile
3. 初始化拖拽管理器DragController
4. 初始化小部件管理器，加载布局，初始化桌面各个控件，并且设置各个控件的位置

1. ### 数据加载

应用加载：获取手机中所有的应用列表，把小部件和快捷方式放到WidgetsModel对象中，在后期加载中可以从这个里面获取小部件和快捷方式。

应用绑定：加载workspace的应用并且进行绑定，解析应用的数据放到数据库里面。过滤图标是在workspace中还是在Hotseat中，不同的位置放置不同的分类，然后进行排序处理

## 绑定屏幕、图标、文件夹和Widget

bindAddScreens方法：

通过for循环添加CellLayout

三个for循环，分别绑定图标、文件夹、小部件，最后调用到Workspace中的addInScreen方法，小部件占用不只是一个图标，有可能几个图标的位置，因此会有占用的位置个数的参数

## 应用安装更新和卸载

应用的安装和更新都是通过应用市场来启动，而应用的卸载是通过桌面或者系统的app管理来启动的，因此我们将应用的安装和更新一起来讲，而应用的卸载单独来讲。

### 应用的安装更新

安装或者更新应用时，会调用系统的安装界面，并执行安装程序，在应用安装或者更新完成后系统会发出对应的广播，通过对应广播Launcher会执行相应的加载程序。有一个App管理的兼容库：LauncherAppsCompat

```Bash
public interface OnAppsChangedCallbackCompat {
        void onPackageRemoved(String packageName, UserHandleCompat user);
        void onPackageAdded(String packageName, UserHandleCompat user);
        void onPackageChanged(String packageName, UserHandleCompat user);
        void onPackagesAvailable(String[] packageNames, UserHandleCompat user, boolean replacing);
        void onPackagesUnavailable(String[] packageNames, UserHandleCompat user, boolean replacing);
    }
```

这几个方法来管理应用的移出、添加、改变、可用、不可用，具体的实现在LauncherModel中

### 应用的卸载

原生桌面的卸载应用是将图标拖拽到卸载框进行卸载的，在完成拖拽时会调用completeDrop这个方法。

首先会判断是否是系统应用，如果是系统应用返回false，如果不是启动卸载界面并且返回true。启动卸载界面是通过Intent.ACTION_DELETE这个action启动的，如果能够卸载，执行完卸载返回到桌面时，或者取消返回到桌面时，检测是否卸载成功。最后removeWorkspaceItem方法移除图标

## Workspace滑动

Workspace继承PagedView，而PagedView又继承ViewGroup，PagedView是分页的自定义View。

workspace滑动就是onTouchEvent事件，workspace继承PagedView，因此他的onTouchEvent事件是在PagedView中实现的