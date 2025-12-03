# Glauncher 技术深度方案

> **目标**：提炼项目中有技术深度的亮点，为 Flutter APP 岗位面试准备素材
> **核心思路**：不是堆砌技术名词，而是体现**问题分析 → 方案设计 → 权衡取舍**的思辨能力

---

## 一、原生性能监控 SDK 方案（建议新增实现）

### 1.1 问题背景

Flutter 应用在 TV 设备上运行时，需要实时监控系统性能（CPU、内存、帧率），用于：
- 开发阶段定位性能瓶颈
- 生产环境收集性能指标
- 用户侧展示设备状态

**挑战**：
- Flutter 层无法直接获取系统级性能数据
- 高频采集可能阻塞 UI 线程
- 大量数据传输可能造成 Channel 拥塞

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│  Flutter 层                                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  PerformanceOverlay Widget                                 │  │
│  │  ├── CPU 使用率实时曲线 (LineChart)                        │  │
│  │  ├── 内存占用趋势图 (AreaChart)                            │  │
│  │  └── FPS 帧率监控 (实时数值 + 警告)                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↑                                   │
│                     Stream<PerformanceData>                      │
│                              ↑                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  PerformanceChannel (EventChannel)                         │  │
│  │  - 订阅/取消订阅控制                                       │  │
│  │  - 数据反序列化                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↑                                   │
├──────────────────────────────┼───────────────────────────────────┤
│  Native 层 (Kotlin/Java)     ↑                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  PerformanceEventStreamHandler                             │  │
│  │  implements EventChannel.StreamHandler                     │  │
│  │  ├── onListen(): 启动采集线程                              │  │
│  │  └── onCancel(): 停止采集，释放资源                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↑                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  PerformanceCollector (独立 HandlerThread)                 │  │
│  │  ├── CPU 采集: /proc/stat 解析                             │  │
│  │  ├── 内存采集: ActivityManager.getMemoryInfo()             │  │
│  │  ├── FPS 采集: Choreographer.FrameCallback                 │  │
│  │  ├── 采样率动态调整 (前台 500ms / 后台 2000ms)             │  │
│  │  └── 数据聚合 + 节流推送 (防止 Channel 拥塞)               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 核心技术点

#### 1.3.1 独立线程采集（避免阻塞 UI）

```java
public class PerformanceCollector {
    private HandlerThread collectorThread;
    private Handler collectorHandler;
    private Handler mainHandler;

    public void start(EventChannel.EventSink eventSink) {
        // 创建独立后台线程
        collectorThread = new HandlerThread("PerformanceCollector");
        collectorThread.start();
        collectorHandler = new Handler(collectorThread.getLooper());
        mainHandler = new Handler(Looper.getMainLooper());

        // 在后台线程执行采集
        collectorHandler.post(new CollectRunnable(eventSink));
    }

    private class CollectRunnable implements Runnable {
        private final EventChannel.EventSink eventSink;
        private final DataAggregator aggregator = new DataAggregator();

        @Override
        public void run() {
            // 采集数据
            float cpuUsage = collectCpuUsage();
            long memoryUsage = collectMemoryUsage();
            int fps = collectFps();

            // 聚合数据（节流）
            if (aggregator.shouldEmit()) {
                Map<String, Object> data = aggregator.aggregate(cpuUsage, memoryUsage, fps);

                // 切换到主线程发送（EventChannel 要求）
                mainHandler.post(() -> eventSink.success(data));
            }

            // 动态采样率
            int interval = isAppInForeground() ? 500 : 2000;
            collectorHandler.postDelayed(this, interval);
        }
    }
}
```

**技术要点**：
- **HandlerThread**：创建带消息队列的后台线程，避免频繁创建/销毁线程
- **Handler 切换**：采集在后台线程，发送在主线程（EventChannel 的要求）
- **动态采样率**：前台高频（500ms）保证实时性，后台低频（2000ms）省电

#### 1.3.2 背压处理（防止 Channel 拥塞）

```java
public class DataAggregator {
    private static final int EMIT_INTERVAL_MS = 500;
    private long lastEmitTime = 0;

    private final List<Float> cpuSamples = new ArrayList<>();
    private final List<Long> memorySamples = new ArrayList<>();
    private final List<Integer> fpsSamples = new ArrayList<>();

    public boolean shouldEmit() {
        return System.currentTimeMillis() - lastEmitTime >= EMIT_INTERVAL_MS;
    }

    public Map<String, Object> aggregate(float cpu, long memory, int fps) {
        cpuSamples.add(cpu);
        memorySamples.add(memory);
        fpsSamples.add(fps);

        // 计算聚合值
        Map<String, Object> result = new HashMap<>();
        result.put("cpu_avg", average(cpuSamples));
        result.put("cpu_max", max(cpuSamples));
        result.put("memory_avg", average(memorySamples));
        result.put("fps_avg", average(fpsSamples));
        result.put("fps_min", min(fpsSamples));  // FPS 关注最小值（卡顿）
        result.put("timestamp", System.currentTimeMillis());

        // 清空缓存
        cpuSamples.clear();
        memorySamples.clear();
        fpsSamples.clear();
        lastEmitTime = System.currentTimeMillis();

        return result;
    }
}
```

**技术要点**：
- **节流**：不是每次采集都发送，而是聚合后定时发送
- **聚合策略**：CPU/内存取平均值，FPS 取最小值（最小值代表卡顿）
- **防止内存泄漏**：发送后清空缓存

#### 1.3.3 生命周期感知

```java
public class PerformanceEventStreamHandler implements
        EventChannel.StreamHandler,
        Application.ActivityLifecycleCallbacks {

    private boolean isAppInForeground = true;
    private int activityCount = 0;

    @Override
    public void onActivityStarted(Activity activity) {
        activityCount++;
        if (activityCount == 1) {
            isAppInForeground = true;
            // 切换到高频采集模式
            collector.setInterval(500);
        }
    }

    @Override
    public void onActivityStopped(Activity activity) {
        activityCount--;
        if (activityCount == 0) {
            isAppInForeground = false;
            // 切换到低频采集模式
            collector.setInterval(2000);
        }
    }

    @Override
    public void onCancel(Object arguments) {
        // 取消监听时释放资源
        collector.stop();
        application.unregisterActivityLifecycleCallbacks(this);
    }
}
```

**技术要点**：
- **ActivityLifecycleCallbacks**：感知应用前后台状态
- **资源管理**：onCancel 时释放所有资源，防止内存泄漏
- **优雅降级**：后台时降低采集频率，减少功耗

### 1.4 面试话术

> **问：你在项目中是如何实现 Flutter 与原生通信的？**
>
> 答：我实现了一个性能监控 SDK，需要持续获取系统 CPU、内存、FPS 数据。
>
> 首先分析了几个技术挑战：
> 1. Flutter 层无法直接获取系统级数据，需要通过 Platform Channel
> 2. 高频采集不能阻塞 UI 线程
> 3. 大量数据传输可能造成 Channel 拥塞
>
> 针对这些问题，我设计了三层架构：
> 1. **独立采集线程**：使用 HandlerThread 创建后台线程，采集操作不影响 UI
> 2. **数据聚合 + 节流**：不是每次采集都发送，而是聚合多次采样后定时推送，防止 Channel 拥塞
> 3. **生命周期感知**：前台高频采集保证实时性，后台低频采集节省电量
>
> 这个方案体现了**性能与实时性的权衡**，以及**资源管理的最佳实践**。

---

## 二、系统级网络配置服务（跨进程 IPC 方案）

### 2.1 问题背景

普通 APP（包括 Flutter 应用）无法直接调用系统级网络配置 API：
- `WifiManager.setStaticIpConfiguration()` 需要 `NETWORK_SETTINGS` 权限
- 该权限仅授予系统签名应用

**业务需求**：
- 用户需要在 Launcher 中配置静态 IP / DHCP
- 第三方应用也需要调用网络配置功能

### 2.2 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│  普通 APP (Flutter Launcher)                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  NetworkConfigService                                      │  │
│  │  - setStaticIp(ip, gateway, dns)                          │  │
│  │  - enableDhcp()                                           │  │
│  │  - getNetworkConfig()                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼ 发送广播 (Intent)                  │
│                              │                                   │
├──────────────────────────────┼───────────────────────────────────┤
│  System Service APP (系统签名)│                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  NetworkConfigReceiver extends BroadcastReceiver          │  │
│  │  ├── 1. 校验调用方包名/签名（安全白名单）                  │  │
│  │  ├── 2. 解析 Intent 参数                                  │  │
│  │  ├── 3. 调用系统 API 执行网络配置                         │  │
│  │  └── 4. 通过 PendingIntent 回调结果                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼ 调用系统 API                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Android Framework                                         │  │
│  │  - WifiManager.setStaticIpConfiguration()                 │  │
│  │  - ConnectivityManager.setNetworkPreference()             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 核心技术点

#### 2.3.1 安全校验机制

```java
public class NetworkConfigReceiver extends BroadcastReceiver {

    // 白名单：允许调用的包名
    private static final Set<String> ALLOWED_PACKAGES = Set.of(
        "cn.giec.glauncher",
        "cn.giec.settings"
    );

    @Override
    public void onReceive(Context context, Intent intent) {
        // 1. 校验调用方包名
        String callerPackage = intent.getStringExtra("caller_package");
        if (!ALLOWED_PACKAGES.contains(callerPackage)) {
            Log.w(TAG, "Rejected request from unauthorized package: " + callerPackage);
            sendResult(intent, false, "Unauthorized caller");
            return;
        }

        // 2. 校验调用方签名（可选，更安全）
        if (!verifyCallerSignature(context, callerPackage)) {
            sendResult(intent, false, "Invalid signature");
            return;
        }

        // 3. 执行网络配置
        String action = intent.getStringExtra("action");
        switch (action) {
            case "SET_STATIC_IP":
                handleSetStaticIp(context, intent);
                break;
            case "ENABLE_DHCP":
                handleEnableDhcp(context, intent);
                break;
        }
    }

    private boolean verifyCallerSignature(Context context, String packageName) {
        try {
            PackageInfo info = context.getPackageManager()
                .getPackageInfo(packageName, PackageManager.GET_SIGNATURES);
            // 比较签名哈希值
            String signatureHash = getSignatureHash(info.signatures[0]);
            return TRUSTED_SIGNATURES.contains(signatureHash);
        } catch (Exception e) {
            return false;
        }
    }
}
```

**技术要点**：
- **包名白名单**：只允许特定应用调用
- **签名校验**：防止包名伪造
- **拒绝策略**：未授权请求记录日志并返回错误

#### 2.3.2 异步结果回调（PendingIntent）

```java
// 调用方（Flutter 插件）
public void setStaticIp(String ip, String gateway, String dns, ResultCallback callback) {
    // 创建结果接收器
    Intent resultIntent = new Intent(context, NetworkResultReceiver.class);
    resultIntent.setAction("NETWORK_CONFIG_RESULT");

    PendingIntent pendingIntent = PendingIntent.getBroadcast(
        context,
        REQUEST_CODE,
        resultIntent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
    );

    // 发送配置请求
    Intent configIntent = new Intent("cn.giec.system.NETWORK_CONFIG");
    configIntent.putExtra("action", "SET_STATIC_IP");
    configIntent.putExtra("ip", ip);
    configIntent.putExtra("gateway", gateway);
    configIntent.putExtra("dns", dns);
    configIntent.putExtra("caller_package", context.getPackageName());
    configIntent.putExtra("result_intent", pendingIntent);

    context.sendBroadcast(configIntent);

    // 保存回调，等待结果
    pendingCallbacks.put(REQUEST_CODE, callback);
}

// 系统服务端
private void sendResult(Intent originalIntent, boolean success, String message) {
    PendingIntent resultIntent = originalIntent.getParcelableExtra("result_intent");
    if (resultIntent != null) {
        try {
            Intent resultData = new Intent();
            resultData.putExtra("success", success);
            resultData.putExtra("message", message);
            resultIntent.send(context, 0, resultData);
        } catch (PendingIntent.CanceledException e) {
            Log.e(TAG, "Failed to send result", e);
        }
    }
}
```

**技术要点**：
- **PendingIntent**：跨进程传递回调能力
- **异步模式**：调用方不阻塞，结果通过广播返回
- **FLAG_MUTABLE**：Android 12+ 要求

#### 2.3.3 Flutter 层封装

```dart
class NetworkConfigService {
  static const _channel = MethodChannel('cn.giec.glauncher/network_config');

  /// 设置静态 IP
  ///
  /// 通过系统服务代理执行，突破权限限制
  Future<Result<void>> setStaticIp({
    required String ip,
    required String gateway,
    required String dns,
  }) async {
    try {
      final result = await _channel.invokeMethod('setStaticIp', {
        'ip': ip,
        'gateway': gateway,
        'dns': dns,
      });

      if (result['success'] == true) {
        return const Success(null);
      } else {
        return Failure(ApiFailure(result['message'] ?? 'Unknown error'));
      }
    } on PlatformException catch (e) {
      return Failure(NetworkFailure(e.message ?? 'Platform error'));
    }
  }

  /// 启用 DHCP
  Future<Result<void>> enableDhcp() async {
    // 类似实现...
  }
}
```

### 2.4 面试话术

> **问：你提到实现了网络配置功能，普通应用怎么调用系统 API？**
>
> 答：这是一个典型的权限突破问题。系统级网络配置 API 需要 `NETWORK_SETTINGS` 权限，只有系统签名应用才能获得。
>
> 我设计了一个**跨进程代理方案**：
> 1. **系统服务层**：创建一个系统签名的 Service APP，它有权限调用系统 API
> 2. **广播通信**：普通 APP 通过广播发送配置请求
> 3. **安全校验**：系统服务校验调用方的包名和签名，只允许白名单应用调用
> 4. **异步回调**：通过 PendingIntent 实现跨进程结果返回
>
> 这个方案的核心是**权限隔离**：普通 APP 没有系统权限，但可以通过可信的代理服务间接执行特权操作。同时通过白名单机制保证安全性。

---

## 三、TV 焦点导航系统（已有代码分析）

### 3.1 代码分析

分析 `custom_traversal_policy.dart`，发现你实现了一个**行优先焦点遍历算法**：

```dart
class RowByRowTraversalPolicy extends FocusTraversalPolicy
    with DirectionalFocusTraversalPolicyMixin {

  @override
  bool inDirection(FocusNode currentNode, TraversalDirection direction) {
    // 1. 获取所有可聚焦节点
    List<FocusNode>? nodes = currentNode.nearestScope?.traversalDescendants.toList();

    // 2. 根据方向筛选候选节点
    NodeSearcher searcher = NodeSearcher(direction);
    List<CandidateNode> candidates = searcher.findCandidates(nodes, currentNode);

    // 3. 从候选节点中选择最佳目标
    FocusNode nextNode = searcher.findBestFocusNode(candidates, currentNode);
    nextNode.requestFocus();
    return true;
  }
}
```

### 3.2 技术亮点

| 亮点 | 说明 |
|------|------|
| **解决 Flutter 默认策略问题** | 默认策略会"跳行"，在 TV 场景下体验差 |
| **几何位置计算** | 使用节点中心点坐标判断相对位置 |
| **欧几里得距离** | 同行多个候选时，选择距离最近的 |
| **Extension 扩展** | 通过扩展方法让代码更易读 |

### 3.3 可优化方向（面试加分项）

如果想进一步提升这个模块的技术含量，可以考虑：

1. **焦点记忆**：切换行时记住上一行的焦点位置，返回时恢复
2. **边界处理**：到达边界时的循环/回弹策略
3. **动画过渡**：焦点切换时的平滑滚动动画（你已有 `EnsureVisible`）
4. **性能优化**：缓存节点位置，避免每次遍历重新计算

### 3.4 面试话术

> **问：TV 应用的焦点导航有什么特殊之处？**
>
> 答：TV 应用使用遥控器操作，与手机触摸交互完全不同。Flutter 默认的焦点遍历策略会产生"跳行"问题——比如在网格布局中按下键，焦点可能跳到不相邻的行。
>
> 我实现了一个**行优先遍历算法**：
> 1. 根据方向筛选候选节点（比如按下键只考虑下方节点）
> 2. 同行有多个候选时，使用欧几里得距离选择最近的
> 3. 通过 FocusNode 的 Extension 方法封装几何计算，代码更清晰
>
> 这个方案解决了 Flutter 默认策略在 TV 场景下的体验问题。

---

## 四、网络状态监听系统（已有代码分析）

### 4.1 代码分析

分析 `NetworkEventStreamHandler.java`，发现了一个**多 API 版本兼容**的实现：

```java
@Override
public void onListen(Object arguments, EventChannel.EventSink events) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        // Android 12+ 使用 TelephonyCallback
        _networkCallback = new NetworkCallbackImplApi31(events, null);
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        // Android 8+ 使用 NetworkCallback + Handler
        _networkCallback = new NetworkCallbackImpl(events, null);
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        // Android 7 使用 NetworkCallback
        _networkCallback = new NetworkCallbackImpl(events, _handler);
    } else {
        // Android 6 及以下使用 BroadcastReceiver
        _networkChangeReceiver = new NetworkChangeReceiver(events);
        context.registerReceiver(_networkChangeReceiver, filter);
    }
}
```

### 4.2 技术亮点

| 亮点 | 说明 |
|------|------|
| **多版本兼容** | 适配 Android 6 到 Android 12+ 的 API 变化 |
| **继承复用** | `NetworkCallbackImplApi31` 继承 `NetworkCallbackImpl`，避免重复代码 |
| **线程安全** | 使用 Handler 确保事件在主线程发送 |
| **资源释放** | onCancel 时正确反注册监听器 |

### 4.3 面试话术

> **问：你是如何处理 Android 版本兼容问题的？**
>
> 答：以网络状态监听为例，Android 不同版本的 API 差异很大：
> - Android 12 废弃了 PhoneStateListener，需要用 TelephonyCallback
> - Android 7 引入了 NetworkCallback
> - Android 6 只能用 BroadcastReceiver
>
> 我的处理方式是**版本分层 + 继承复用**：
> 1. 在 onListen 中根据 SDK 版本选择不同实现
> 2. 高版本实现继承低版本，只覆盖差异部分
> 3. 所有实现共享同一个 EventSink，保证 Flutter 层接口统一
>
> 这样既保证了兼容性，又避免了大量重复代码。

---

## 五、并发应用加载（已有代码亮点）

### 5.1 代码分析

分析 `MainActivity.java` 中的 `getApplications()` 方法：

```java
private List<Map<String, Serializable>> getApplications() {
    // 1. 创建线程池
    ExecutorService executor = Executors.newFixedThreadPool(4);
    CompletionService<Pair<Boolean, List<ResolveInfo>>> completionService =
            new ExecutorCompletionService<>(executor);

    // 2. 并发查询 TV 应用和非 TV 应用
    completionService.submit(() -> Pair.create(false, queryIntentActivities(false)));
    completionService.submit(() -> Pair.create(true, queryIntentActivities(true)));

    // 3. 等待两个任务完成
    while (completed < 2) {
        var result = completionService.take().get();
        // 处理结果...
    }

    // 4. 并发构建应用信息
    CompletionService<Map<String, Serializable>> buildService =
            new ExecutorCompletionService<>(executor);
    for (ResolveInfo info : allActivities) {
        buildService.submit(() -> buildAppMap(info.activityInfo, false, null));
    }

    // 5. 收集结果
    while (appCount > 0) {
        applications.add(buildService.take().get());
        appCount--;
    }

    executor.shutdown();
    return applications;
}
```

### 5.2 技术亮点

| 亮点 | 说明 |
|------|------|
| **CompletionService** | 按完成顺序获取结果，而非提交顺序 |
| **两阶段并发** | 先并发查询，再并发构建，最大化并行度 |
| **固定线程池** | 控制并发数，避免创建过多线程 |
| **资源释放** | 使用完毕后 shutdown |

### 5.3 面试话术

> **问：应用列表加载有什么优化？**
>
> 答：Launcher 启动时需要加载所有应用信息，包括图标、名称等。单线程加载会很慢。
>
> 我使用了**两阶段并发**优化：
> 1. **第一阶段**：并发查询 TV 应用和普通应用列表
> 2. **第二阶段**：并发构建每个应用的详细信息
>
> 关键技术点：
> - 使用 `CompletionService` 按完成顺序获取结果，避免快任务等待慢任务
> - 使用固定大小线程池（4线程），避免创建过多线程
> - 任务完成后正确释放线程池资源

---

## 六、总结：项目亮点提炼

| 模块 | 技术深度 | 体现能力 |
|------|---------|---------|
| **性能监控 SDK**（建议新增） | 独立线程、背压处理、生命周期感知 | 性能优化、资源管理 |
| **系统级网络配置** | 跨进程 IPC、权限隔离、安全校验 | 系统设计、安全意识 |
| **TV 焦点导航** | 自定义遍历算法、几何计算 | 问题分析、算法设计 |
| **网络状态监听** | 多版本兼容、继承复用 | 兼容性处理、代码复用 |
| **并发应用加载** | CompletionService、两阶段并发 | 并发编程、性能优化 |

**面试核心思路**：不要只说"我用了 XXX 技术"，而要说"我遇到了 XXX 问题，分析后选择了 XXX 方案，权衡了 XXX 利弊"。
