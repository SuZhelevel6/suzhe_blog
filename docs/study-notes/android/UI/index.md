## 安卓应用开发知识导览

### 基础知识

四大组件：
1. Activity: [点击跳转到相关博客](./base/Activity.md)
2. Service: [点击跳转到相关博客](./base/Service.md)
3. Broadcast:[点击跳转到相关博客](./base/Broadcast.md)
4. ContentProvider:[点击跳转到相关博客](./base/ContentProvider.md)

其他重要内容：
1. Context：[点击跳转到相关博客](./base/Context.md)
2. Intent：[点击跳转到相关博客](./base/Intent.md)
3. Fragment: [点击跳转到相关博客](./base/Fragment.md)
4. Bundle：[点击跳转到相关博客](./base/Bundle.md)

### Jetpack

架构组件：
* Lifecycle: [点击跳转到相关博客](../../jetpack/Lifecycle.md)
* ViewModel: [点击跳转到相关博客](../../jetpack/ViewModel.md)
* LiveData: [点击跳转到相关博客](../../jetpack/LiveData.md)
* Room：SQLite 的 ORM 抽象层，简化数据库操作。
* Data Binding：将布局中的 UI 组件与数据源绑定，简化数据更新。
* WorkManager：管理后台任务，确保任务在合适的时机执行。

UI组件：
* ViewPager2：横向/纵向滑动容器视图
* RecyclerView：高效显示大量数据的列表或网格。
* ConstraintLayout：灵活的布局工具，支持复杂的 UI 设计。
* Navigation：提供应用内导航的框架，支持复杂导航逻辑。
* Paging：分页加载大量数据，优化列表和网格的加载性能。



### 常用第三方开源库

MVN 仓库查询：https://mvnrepository.com/
开发规范：https://github.com/Blankj/AndroidStandardDevelop
开发者工具：https://paonet.com/a/7777777777777707973
流行框架速查: https://www.jianshu.com/p/2a92becdcaec

**特别推荐**

- [AndroidUtilCode](https://github.com/Blankj/AndroidUtilCode): Blankj家的util工具整理.非常全的Android常用util

**UI组件**
- [SwipePanel](https://github.com/Blankj/SwipePanel): Blankj家的侧滑控件
- [DialogX](https://github.com/kongzue/DialogX): kongzue家的Dialog组件，非常全面好用
- [QMUI](https://github.com/Tencent/QMUI_Android): 腾讯家的UI框架，我一般用来做沉浸式 ToolBar
- [CircleIndicator](https://github.com/ongakuer/CircleIndicator): 轮播图圆形指示器
- [DslTabLayout](https://github.com/angcyo/DslTabLayout): angcyo A佬的底部标签控件
- [DslAdapter](https://github.com/angcyo/DslAdapter): angcyo A佬的适配器库
- [BaseRecyclerViewAdapterHelper](https://github.com/CymChad/BaseRecyclerViewAdapterHelper): 一个非常简洁好用的的ecyclerViewAdapter
- [SmartRefreshLayout](https://github.com/scwang90/SmartRefreshLayout): 下拉刷新框架
- [SplitEditText](https://github.com/jenly1314/SplitEditText): 类似滴滴出行验证码输入框控件
- [shimmer](https://github.com/facebook/shimmer-android): 给任意控件添加闪光效果，可以用到广告界面，打开广告按钮
- [WebProgress](https://github.com/youlookwhat/WebProgress): WebView进度条
- [PictureSelector](https://github.com/LuckSiege/PictureSelector): 图片选择器
- [loadingdialog](ttps://github.com/ydstar/loadingdialog): 加载对话框
- [AndroidPicker](https://github.com/gzu-liyujiang/AndroidPicker): 安卓选择器类库
- [html-text](https://github.com/wangchenyan/html-text)html 文本显示在 TextView上
- [ByRecyclerView](https://github.com/youlookwhat/ByRecyclerView): RecyclerView 下拉刷新/加载更多、item点击/长按、头布局/尾布局/状态布局、万能分割线、Skeleton骨架图、极简adapter、嵌套滑动置顶
- [PhotoViewer](https://github.com/wanglu1209/PhotoViewer): 类似微信图片预览框架
- [ZXingLite](https://github.com/jenly1314/ZXingLite): 二维码生成扫描框架
- [banner](https://github.com/youth5201314/banner): banner轮播图框架
- [LetterIndexView](https://github.com/lgdcoder/LetterIndexView): 类似微信联系人界面右侧字母索引
- 

**实用工具**
- [Timber](https://github.com/JakeWharton/timber): 简洁的日志框架
- [MMKV](https://github.com/Tencent/MMKV): 腾讯开源的高性能keyValue存储，用来替代系统的SharedPreferences
- [PermissionX](https://github.com/guolindev/PermissionX): 郭霖的权限框架
- [Glide](https://github.com/bumptech/glide): 非常常用的图片加载框架
- [Chucker](https://github.com/ChuckerTeam/chucker): 网络请求debug工具
- [Channel](https://github.com/liangjingkanji/Channel): 基于协程跨界面通讯 的Android事件分发框架
- [commons-io](http://commons.apache.org/proper/commons-io/): 通用IO相关工具类
- [leakcanary](https://github.com/square/leakcanary): 内存泄漏检测工具
- [AppUpdate](https://github.com/azhon/AppUpdate): 应用更新工具
- [android-downloader](https://github.com/ixuea/android-downloader): 下载框架
- [Bugly](https://bugly.qq.com/docs/user-guide/instruction-manual-android/?v=1.0.0#_3): Bug检测处理



**语言工具包**
- [apache common lang3](http://commons.apache.org/proper/commons-lang/): apache common lang3工具包，使用技巧可以参考：[博客](https://blog.csdn.net/qq_23091073/article/details/126743040)
- [joda-time](https://www.joda.org/joda-time/index.html): 日期时间，运算，解析格式化工具，使用技巧可以参考：[博客](https://blog.csdn.net/weixin_43767602/article/details/127446608)
- [collections4](https://mvnrepository.com/artifact/org.apache.commons/commons-collections4): 集合工具类，使用技巧可以参考：[博客](https://blog.csdn.net/weixin_39033358/article/details/144202856)
- [Hutool](https://github.com/looly/hutool): 一个小而全的Java工具类库
- [guava](https://github.com/google/guava): Google实现的Java核心工具类,相对于Apache的工具包来说Guava在Android中用的更多

**第三方服务**

- [阿里云 OSS](https://github.com/aliyun/aliyun-oss-android-sdk)
- [支付宝支付](https://opendocs.alipay.com/open/204/105296)
- [微信支付](https://pay.weixin.qq.com/wiki/doc/api/app/app.php?chapter=8_5)
- [高德地图](https://lbs.amap.com/api/android-sdk/guide/create-project/android-studio-create-project#gradle_sdk)
- [融云IM](https://docs.rongcloud.cn/v4/5X/views/im/ui/guide/quick/include/android.html)
- [极光统计](https://docs.jiguang.cn/janalytics/client/android_guide)
- [百度语音](https://ai.baidu.com/ai-doc/SPEECH/Pkgt4wwdx#%E9%9B%86%E6%88%90%E6%8C%87%E5%8D%97)


### 常用 API

### 一些常见机制

