# Android 预加载类分段优化分析

本文档详细分析 Amlogic 提供的预加载类分段优化 patch (PD#SWPL-135363)，包括其在 Android 启动流程中的位置、原始实现、问题分析及优化方案。

---

## 目录

- [1. 优化概述](#1-优化概述)
- [2. 在启动流程中的位置](#2-在启动流程中的位置)
- [3. 原始实现分析](#3-原始实现分析)
- [4. 问题分析](#4-问题分析)
- [5. 优化方案详解](#5-优化方案详解)
- [6. 代码变更对比](#6-代码变更对比)
- [7. 预加载类分类](#7-预加载类分类)
- [8. 性能影响分析](#8-性能影响分析)
- [9. 如何应用此 Patch](#9-如何应用此-patch)

---

## 1. 优化概述

### 1.1 Patch 信息

| 项目 | 内容 |
|------|------|
| **问题编号** | PD#SWPL-135363 |
| **作者** | Yan Fang1 <yan.fang1@amlogic.com> |
| **日期** | 2024-12-12 |
| **验证平台** | Android U (Android 14) |

### 1.2 优化目标

将 Zygote 启动时的预加载类 (preloaded-classes) 分成两部分：

1. **早期预加载类 (preloaded-classes-early)**: 约 123 个耗时较长的关键类
2. **延迟预加载类 (preloaded-classes)**: 其余约 6000+ 个资源消耗较少的类

---

## 2. 在启动流程中的位置

根据 [ANDROID_BOOT_PROCESS.md](./ANDROID_BOOT_PROCESS.md)，此优化发生在 **Zygote 进程启动阶段**：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  启动流程                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Bootloader (BL1→BL2→BL31→BL33/U-Boot)     ~2.2s                        │
│  2. Linux Kernel 启动                          ~0.2s                        │
│  3. Init 进程 (First Stage + Second Stage)    ~5.8s                        │
│  4. Zygote 进程启动  ←← 【优化发生在这里】      ~1.0s                        │
│     ├── 创建 Java 虚拟机 (ART)                                              │
│     ├── 预加载 Java 类  ←← 【核心优化点】                                    │
│     ├── 预加载资源                                                          │
│     └── 创建 Socket 监听                                                    │
│  5. SystemServer 进程启动                      ~8.0s                        │
│  6. Launcher 启动                              ~2.8s                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Zygote 启动详细流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    app_process64 启动                            │
│                    (由 init 通过 init.zygote64.rc 启动)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ZygoteInit.main()                                               │
│  ├── RuntimeInit.preForkInit()                                   │
│  ├── 【原始】preload()  ←← 一次性加载所有类                        │
│  │   或                                                          │
│  ├── 【优化后】firstpreload()  ←← 先加载 early 类                 │
│  │       └── preloadClasses(PRELOADED_CLASSES_EARLY)             │
│  ├── 【优化后】preload()  ←← 再加载剩余类                         │
│  │       └── preloadClasses(PRELOADED_CLASSES)                   │
│  ├── gcAndFinalize()                                             │
│  ├── Zygote.initNativeState()                                    │
│  └── forkSystemServer()                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 原始实现分析

### 3.1 关键代码位置

```
frameworks/base/
├── core/java/com/android/internal/os/
│   └── ZygoteInit.java          # Zygote Java 入口，预加载逻辑
├── config/
│   └── preloaded-classes        # 预加载类列表 (约 6000+ 类)
```

### 3.2 原始 preload() 方法

**文件**: `frameworks/base/core/java/com/android/internal/os/ZygoteInit.java`

```java
// 原始实现 (AOSP)
static void preload(TimingsTraceLog bootTimingsTraceLog) {
    Log.d(TAG, "begin preload");
    bootTimingsTraceLog.traceBegin("BeginPreload");
    beginPreload();
    bootTimingsTraceLog.traceEnd(); // BeginPreload

    // 【耗时操作】一次性加载所有 6000+ 个类
    bootTimingsTraceLog.traceBegin("PreloadClasses");
    preloadClasses();  // 读取 /system/etc/preloaded-classes
    bootTimingsTraceLog.traceEnd(); // PreloadClasses

    bootTimingsTraceLog.traceBegin("CacheNonBootClasspathClassLoaders");
    cacheNonBootClasspathClassLoaders();
    bootTimingsTraceLog.traceEnd();

    bootTimingsTraceLog.traceBegin("PreloadResources");
    preloadResources();  // 预加载 Drawable、ColorStateList 等
    bootTimingsTraceLog.traceEnd();

    Trace.traceBegin(Trace.TRACE_TAG_DALVIK, "PreloadAppProcessHALs");
    nativePreloadAppProcessHALs();
    Trace.traceEnd(Trace.TRACE_TAG_DALVIK);

    Trace.traceBegin(Trace.TRACE_TAG_DALVIK, "PreloadGraphicsDriver");
    maybePreloadGraphicsDriver();
    Trace.traceEnd(Trace.TRACE_TAG_DALVIK);

    preloadSharedLibraries();  // 加载 libandroid.so, libjnigraphics.so
    preloadTextResources();    // 初始化 Hyphenator, FontCache
    WebViewFactory.prepareWebViewInZygote();

    endPreload();
    warmUpJcaProviders();
    Log.d(TAG, "end preload");

    sPreloadComplete = true;
}
```

### 3.3 原始 preloadClasses() 方法

```java
private static final String PRELOADED_CLASSES = "/system/etc/preloaded-classes";

private static void preloadClasses() {
    final VMRuntime runtime = VMRuntime.getRuntime();

    InputStream is;
    try {
        is = new FileInputStream(PRELOADED_CLASSES);
    } catch (FileNotFoundException e) {
        Log.e(TAG, "Couldn't find " + PRELOADED_CLASSES + ".");
        return;
    }

    Log.i(TAG, "Preloading classes...");
    long startTime = SystemClock.uptimeMillis();

    // 降低权限
    // ...

    try {
        BufferedReader br = new BufferedReader(new InputStreamReader(is),
                                               Zygote.SOCKET_BUFFER_SIZE);
        int count = 0;
        String line;
        while ((line = br.readLine()) != null) {
            line = line.trim();
            if (line.startsWith("#") || line.equals("")) {
                continue;
            }

            Trace.traceBegin(Trace.TRACE_TAG_DALVIK, line);
            try {
                // 【核心】使用 Class.forName 加载并初始化类
                Class.forName(line, true, null);
                count++;
            } catch (ClassNotFoundException e) {
                // ...
            }
            Trace.traceEnd(Trace.TRACE_TAG_DALVIK);
        }

        Log.i(TAG, "...preloaded " + count + " classes in "
                + (SystemClock.uptimeMillis() - startTime) + "ms.");
    } catch (IOException e) {
        Log.e(TAG, "Error reading " + PRELOADED_CLASSES + ".", e);
    } finally {
        IoUtils.closeQuietly(is);
        runtime.preloadDexCaches();
        // 恢复权限
    }
}
```

### 3.4 原始 main() 方法调用流程

```java
public static void main(String[] argv) {
    // ...

    if (abiList == null) {
        throw new RuntimeException("No ABI list supplied.");
    }

    // 【原始】直接调用 preload，一次性加载所有内容
    if (!enableLazyPreload) {
        bootTimingsTraceLog.traceBegin("ZygotePreload");
        EventLog.writeEvent(LOG_BOOT_PROGRESS_PRELOAD_START,
                SystemClock.uptimeMillis());
        preload(bootTimingsTraceLog);  // ←← 一次性加载所有 6000+ 类
        EventLog.writeEvent(LOG_BOOT_PROGRESS_PRELOAD_END,
                SystemClock.uptimeMillis());
        bootTimingsTraceLog.traceEnd();
    }

    // ...
}
```

---

## 4. 问题分析

### 4.1 问题描述

**问题**: 预加载类耗时过长，特别是在启用 lazy preload 时，会导致 `VisitClasses()` 在 ZygoteFork 时花费约 **3.5 秒**。

### 4.2 问题根因

1. **类加载顺序不优化**
   - 原始实现按文件顺序加载所有类
   - 部分类初始化时间特别长（涉及 Native 库、复杂静态初始化）
   - 这些耗时类分散在列表各处

2. **Lazy Preload 的副作用**
   - 当启用 `--enable-lazy-preload` 时，类加载推迟到 fork 之后
   - `VisitClasses()` 需要遍历所有已加载的类
   - 如果关键类没有提前加载，fork 时的类遍历会非常慢

3. **内存和 COW 影响**
   - Zygote fork 子进程使用 Copy-On-Write (COW) 机制
   - 未预加载的类在子进程中加载时触发 COW
   - 导致内存使用增加和启动变慢

### 4.3 耗时类示例

部分初始化耗时较长的类：

| 类名 | 耗时原因 |
|------|---------|
| `android.graphics.Typeface` | 字体解析、Native 库加载 |
| `android.graphics.FontFamily` | 字体系统初始化 |
| `android.icu.impl.*` | ICU 国际化库数据加载 |
| `android.media.MediaRouter` | 媒体路由服务连接 |
| `android.provider.Settings$*` | 数据库查询、缓存初始化 |
| `android.app.SystemServiceRegistry` | 系统服务注册表构建 |

---

## 5. 优化方案详解

### 5.1 优化策略

**核心思想**: 将预加载类分为两批，先加载耗时的关键类，再加载其余类。

```
原始流程:
┌────────────────────────────────────────────────────┐
│  preload()                                          │
│  └── preloadClasses()  [6000+ 类，一次性加载]        │
│      ├── android.app.Activity                       │
│      ├── android.app.ActivityThread  ←← 耗时        │
│      ├── android.graphics.Typeface   ←← 耗时        │
│      ├── ...                                        │
│      └── java.util.Scanner           ←← 耗时        │
└────────────────────────────────────────────────────┘

优化后流程:
┌────────────────────────────────────────────────────┐
│  firstpreload()  【新增，在 preload 之前调用】        │
│  └── preloadClasses(PRELOADED_CLASSES_EARLY)        │
│      ├── android.app.ActivityThread  ←← 耗时类      │
│      ├── android.graphics.Typeface   ←← 耗时类      │
│      ├── android.icu.impl.*          ←← 耗时类      │
│      └── ... (共 123 个关键类)                      │
├────────────────────────────────────────────────────┤
│  preload()  【修改，只加载剩余类】                    │
│  └── preloadClasses(PRELOADED_CLASSES)              │
│      └── ... (约 5900+ 个普通类)                    │
└────────────────────────────────────────────────────┘
```

### 5.2 修改的文件

| 文件 | 修改内容 |
|------|---------|
| `frameworks/base/core/java/com/android/internal/os/ZygoteInit.java` | 新增 `firstpreload()` 方法，修改 `preloadClasses()` 参数 |
| `frameworks/base/config/preloaded-classes` | 移除早期加载的 83 个类 |
| `frameworks/base/config/preloaded-classes-early` | **新增**，包含 123 个关键类 |
| `build/make/target/product/base_system.mk` | 添加复制 `preloaded-classes-early` 到系统 |

---

## 6. 代码变更对比

### 6.1 ZygoteInit.java 变更

#### 6.1.1 新增常量

```java
// 原有
private static final String PRELOADED_CLASSES = "/system/etc/preloaded-classes";

// 新增
private static final String PRELOADED_CLASSES_EARLY = "/system/etc/preloaded-classes-early";
```

#### 6.1.2 新增 firstpreload() 方法

```java
// 【新增】早期预加载方法
static void firstpreload(TimingsTraceLog bootTimingsTraceLog) {
    Log.d(TAG, "begin preload");
    bootTimingsTraceLog.traceBegin("BeginPreload");
    beginPreload();
    bootTimingsTraceLog.traceEnd(); // BeginPreload

    // 【关键】先加载耗时的关键类
    bootTimingsTraceLog.traceBegin("PreloadClassesEarly");
    preloadClasses(PRELOADED_CLASSES_EARLY);  // 加载 123 个关键类
    bootTimingsTraceLog.traceEnd(); // PreloadClasses

    bootTimingsTraceLog.traceBegin("CacheNonBootClasspathClassLoaders");
    cacheNonBootClasspathClassLoaders();
    bootTimingsTraceLog.traceEnd();

    bootTimingsTraceLog.traceBegin("PreloadResources");
    preloadResources();
    bootTimingsTraceLog.traceEnd();

    Trace.traceBegin(Trace.TRACE_TAG_DALVIK, "PreloadAppProcessHALs");
    nativePreloadAppProcessHALs();
    Trace.traceEnd(Trace.TRACE_TAG_DALVIK);

    Trace.traceBegin(Trace.TRACE_TAG_DALVIK, "PreloadGraphicsDriver");
    maybePreloadGraphicsDriver();
    Trace.traceEnd(Trace.TRACE_TAG_DALVIK);

    preloadSharedLibraries();
    preloadTextResources();
    WebViewFactory.prepareWebViewInZygote();

    sPreloadComplete = true;
}
```

#### 6.1.3 修改 preload() 方法

```java
// 【修改后】只负责加载剩余的普通类
static void preload(TimingsTraceLog bootTimingsTraceLog) {
    bootTimingsTraceLog.traceBegin("PreloadClasses");
    preloadClasses(PRELOADED_CLASSES);  // 加载剩余的 5900+ 类
    bootTimingsTraceLog.traceEnd(); // PreloadClasses
}
```

#### 6.1.4 修改 preloadClasses() 方法签名

```java
// 原有
private static void preloadClasses() {
    // ...
    is = new FileInputStream(PRELOADED_CLASSES);
    // ...
}

// 修改后：添加 path 参数
private static void preloadClasses(String path) {
    final VMRuntime runtime = VMRuntime.getRuntime();

    InputStream is;
    try {
        is = new FileInputStream(path);  // 使用传入的路径
    } catch (FileNotFoundException e) {
        Log.e(TAG, "Couldn't find " + path + ".");
        return;
    }

    // ... 其余逻辑不变
}
```

#### 6.1.5 修改 main() 方法调用顺序

```java
public static void main(String[] argv) {
    // ...

    if (abiList == null) {
        throw new RuntimeException("No ABI list supplied.");
    }

    // 【新增】先执行早期预加载
    firstpreload(bootTimingsTraceLog);

    // 【修改】再执行剩余类加载
    if (!enableLazyPreload) {
        bootTimingsTraceLog.traceBegin("ZygotePreload");
        EventLog.writeEvent(LOG_BOOT_PROGRESS_PRELOAD_START,
                SystemClock.uptimeMillis());
        preload(bootTimingsTraceLog);  // 现在只加载剩余类
        EventLog.writeEvent(LOG_BOOT_PROGRESS_PRELOAD_END,
                SystemClock.uptimeMillis());
        bootTimingsTraceLog.traceEnd();
    }

    // ...
}
```

### 6.2 base_system.mk 变更

```makefile
# 原有
PRODUCT_COPY_FILES += $(call add-to-product-copy-files-if-exists,\
    frameworks/base/config/preloaded-classes:system/etc/preloaded-classes)

# 新增
PRODUCT_COPY_FILES += $(call add-to-product-copy-files-if-exists,\
    frameworks/base/config/preloaded-classes-early:system/etc/preloaded-classes-early)
```

---

## 7. 预加载类分类

### 7.1 早期预加载类列表 (preloaded-classes-early)

共 **123 个类**，主要包括：

#### 7.1.1 核心 Framework 类

```
android.app.ActivityThread
android.app.AppOpsManager
android.app.ContextImpl$ApplicationContentResolver
android.app.DisabledWallpaperManager
android.app.Notification$Builder
android.app.SystemServiceRegistry
android.app.admin.DevicePolicyManager
```

#### 7.1.2 图形系统类

```
android.graphics.FontFamily
android.graphics.Typeface
android.graphics.Rect$UnflattenHelper
android.graphics.drawable.GradientDrawable$Orientation
```

#### 7.1.3 ICU 国际化类

```
android.icu.impl.CaseMapImpl
android.icu.impl.DayPeriodRules
android.icu.impl.IDNA2003
android.icu.impl.JavaTimeZone
android.icu.impl.LocaleDisplayNamesImpl
android.icu.impl.Norm2AllModes$NFCSingleton
android.icu.impl.Norm2AllModes$NFKCSingleton
android.icu.impl.Norm2AllModes$NFKC_CFSingleton
android.icu.impl.StaticUnicodeSets
android.icu.impl.UCharacterName
android.icu.impl.UTS46
android.icu.impl.coll.CollationBuilder
android.icu.impl.coll.CollationRoot
android.icu.impl.locale.KeyTypeData
android.icu.impl.locale.LocaleDistance
android.icu.impl.locale.XLikelySubtags
android.icu.text.AnyTransliterator
```

#### 7.1.4 媒体相关类

```
android.media.CamcorderProfile
android.media.ExifInterface
android.media.MediaRouter
android.media.SoundPool
android.media.audiofx.AudioEffect
android.media.session.MediaSessionLegacyHelper
```

#### 7.1.5 系统设置类

```
android.provider.Settings$Global
android.provider.Settings$Secure
android.provider.Settings$System
```

#### 7.1.6 硬件相关类

```
android.hardware.SyncFence
android.hardware.camera2.DngCreator
android.hardware.camera2.utils.SurfaceUtils
android.hardware.location.ActivityRecognitionHardware
android.hardware.soundtrigger.SoundTrigger
```

#### 7.1.7 Telephony 类

```
com.android.internal.telephony.BaseCommands
com.android.internal.telephony.GsmAlphabet
com.android.internal.telephony.metrics.ImsStats
```

#### 7.1.8 Java 核心类

```
java.lang.Error
java.time.zone.IcuZoneRulesProvider$ZoneRulesCache
java.util.Scanner
java.util.prefs.AbstractPreferences
```

### 7.2 从 preloaded-classes 移除的类

这 123 个类（实际从原列表移除约 83 行，因为有些类在原列表中不存在）从主列表移动到早期列表，避免重复加载。

---

## 8. 性能影响分析

### 8.1 优化效果

| 指标 | 优化前 | 优化后 | 改善 |
|------|-------|-------|------|
| VisitClasses() 耗时 | ~3.5s | < 1s | **~70% 减少** |
| Zygote fork 时间 | 较长 | 更短 | 显著改善 |
| 首次 App 启动时间 | 较长 | 更短 | 改善 |

### 8.2 优化原理

1. **关键路径优化**
   - 将耗时类提前加载，避免 fork 时的阻塞
   - 减少 `VisitClasses()` 的等待时间

2. **内存共享优化**
   - 关键类在 Zygote 中提前初始化
   - fork 后的子进程直接共享这些类的内存
   - 减少 COW 触发次数

3. **并行化潜力**
   - 分段加载允许未来进一步优化
   - 可以在等待 I/O 时并行执行其他初始化

### 8.3 适用场景

- **嵌入式设备**: 内存和 CPU 资源有限的设备
- **电视盒子**: 需要快速启动到桌面
- **低端手机**: 减少启动黑屏时间

---

## 9. 如何应用此 Patch

### 9.1 Patch 文件列表

```
0023/
├── build#make#0001.patch           # build/make 仓库的修改
├── frameworks#base#0001.patch      # frameworks/base 仓库的修改
└── preloaded-classes               # 完整的预加载类列表 (可选参考)
```

### 9.2 应用步骤

#### 步骤 1: 应用 frameworks/base patch

```bash
cd frameworks/base
git apply /path/to/0023/frameworks#base#0001.patch
```

#### 步骤 2: 应用 build/make patch

```bash
cd build/make
git apply /path/to/0023/build#make#0001.patch
```

#### 步骤 3: 验证文件

```bash
# 确认新文件已创建
ls frameworks/base/config/preloaded-classes-early

# 确认 preloaded-classes 已修改
wc -l frameworks/base/config/preloaded-classes
# 应该比原来少约 83 行
```

#### 步骤 4: 重新编译

```bash
source build/envsetup.sh && lunch ross-userdebug && make -j16
```

### 9.3 验证优化效果

```bash
# 查看启动日志
adb logcat -b events | grep -E "boot_progress|preload"

# 查看 Zygote 预加载时间
adb logcat | grep -E "Zygote|preload"

# 使用 bootchart 分析
adb shell 'touch /data/bootchart/enabled'
adb reboot
# 收集 bootchart 数据进行分析
```

---

## 附录：关键代码路径参考

| 文件 | 路径 | 说明 |
|------|------|------|
| ZygoteInit.java | `frameworks/base/core/java/com/android/internal/os/ZygoteInit.java` | Zygote 主类 |
| preloaded-classes | `frameworks/base/config/preloaded-classes` | 预加载类列表 |
| preloaded-classes-early | `frameworks/base/config/preloaded-classes-early` | 早期预加载类列表 (新增) |
| base_system.mk | `build/make/target/product/base_system.mk` | 系统产品配置 |

---
