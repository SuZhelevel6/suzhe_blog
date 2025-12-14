# DVB APP 开发参考指南

本文档为开发搜台、锁台、播放功能的 Android TV 应用提供参考文件列表和开发指导。

---

## 📑 目录

1. [核心参考文件](#核心参考文件)
2. [搜台功能参考](#搜台功能参考)
3. [锁台功能参考](#锁台功能参考)
4. [播放功能参考](#播放功能参考)
5. [数据库管理参考](#数据库管理参考)
6. [完整开发示例](#完整开发示例)
7. [开发建议](#开发建议)

---

## 核心参考文件

### 1. TvInputService 基础实现

#### **DroidLogicTvInputService** - TvInputService 抽象基类
- **路径**: `vendor/amlogic/reference/apps/TvInput/DroidLogicTvInput/src/com/droidlogic/tvinput/services/DroidLogicTvInputService.java`
- **功能**:
  - TvInputService 的基础封装
  - 硬件资源管理
  - Session 创建和管理
  - 信号监听和回调
- **关键方法**:
  ```java
  public abstract Session onCreateSession(String inputId);
  protected void acquireHardware(TvInputInfo info);
  protected void registerInput(String inputId);
  ```

#### **DTVInputService** - 数字电视 Input 实现
- **路径**: `vendor/amlogic/reference/apps/TvInput/DroidLogicTvInput/src/com/droidlogic/tvinput/services/DTVInputService.java`
- **功能**:
  - 完整的 DTV 实现
  - 搜台、锁台、播放的具体实现
  - EPG 数据处理
  - 字幕和音轨处理
  - DVR 录制功能
- **关键类**:
  ```java
  public class DTVInputService extends DroidLogicTvInputService {
      class DTVSessionImpl extends TvInputBaseSession {
          @Override
          public boolean onTune(Uri channelUri) { ... }

          @Override
          public void onRelease() { ... }

          @Override
          public boolean onSelectTrack(int type, String trackId) { ... }
      }

      class RecordingSession extends TvInputService.RecordingSession {
          // DVR 录制实现
      }
  }
  ```

#### **TvInputBaseSession** - Session 基类
- **路径**: `vendor/amlogic/reference/apps/TvInput/DroidLogicTvInput/src/com/droidlogic/tvinput/services/TvInputBaseSession.java`
- **功能**:
  - Session 生命周期管理
  - 表面视图管理
  - 输入事件处理
  - 字幕显示

---

## 搜台功能参考

### 1. 核心搜台控制类

#### **TvControlManager** - 底层 TV 控制管理器
- **路径**: `vendor/amlogic/reference/tv/frameworks/core/java/com/droidlogic/app/tv/TvControlManager.java`
- **功能**: 封装了所有与 TV 硬件交互的接口
- **关键搜台方法**:
  ```java
  // 开始自动搜台
  public void DtvAutoScan();

  // 手动搜台
  public void DtvManualScan(int beginFreq, int endFreq, int modulation);

  // 停止搜台
  public void DtvStopScan();

  // 获取当前频道信息
  public ChannelInfo getCurrentChannelInfo();

  // 设置调谐参数
  public boolean DtvSetProgramme(TvChannelParams params);
  ```

#### **TvScanConfig** - 搜台配置管理
- **路径**: `vendor/amlogic/reference/tv/frameworks/core/java/com/droidlogic/app/tv/TvScanConfig.java`
- **功能**:
  - 搜台模式定义（自动/手动/NIT）
  - 支持的 TV 标准（ATSC/DVB-T/DVB-C/DVB-S/ISDB-T 等）
  - 国家/地区配置
  - 频率范围配置
- **重要常量**:
  ```java
  // 搜台模式
  public static final int TV_SEARCH_MANUAL_INDEX = 0; // 手动搜台
  public static final int TV_SEARCH_AUTO_INDEX = 1; // 自动搜台
  public static final int TV_SEARCH_NIT_INDEX = 3; // NIT 搜台

  // TV 标准
  public static final int TV_SEARCH_TYPE_ATSC_T_INDEX = 4;
  public static final int TV_SEARCH_TYPE_DVBC_INDEX = 7;
  public static final int TV_SEARCH_TYPE_DVBT_INDEX = 9;
  public static final int TV_SEARCH_TYPE_ISDBT_INDEX = 10;
  ```

#### **TvChannelParams** - 频道参数类
- **路径**: `vendor/amlogic/reference/tv/frameworks/core/java/com/droidlogic/app/tv/TvChannelParams.java`
- **功能**: 封装调谐参数（频率、调制方式、符号率、带宽等）
- **示例**:
  ```java
  TvChannelParams params = new TvChannelParams();
  params.setFrequency(474000000); // 474MHz
  params.setBandwidth(8); // 8MHz
  params.setModulation(64); // 64QAM
  ```

### 2. DTVKit 高级搜台实现

#### **DtvKitDVBTCScanPresenter** - DVB-T/C 搜台呈现器
- **路径**: `vendor/amlogic/reference/external/DTVKit/android-inputsource/app/src/main/java/org/dtvkit/inputsource/searchguide/DtvKitDVBTCScanPresenter.java`
- **功能**:
  - DVB-T/C 自动搜台
  - 频点扫描和信号监测
  - 搜台进度回调

#### **NativeScanCallback** - JNI 搜台回调
- **路径**: `vendor/amlogic/reference/external/DTVKit/android-inputsource/logicdtvkit/src/logictuner/main/java/org/droidlogic/dtvkit/tuner/NativeScanCallback.java`
- **功能**:
  - 接收底层扫描事件
  - 频道发现通知
  - 扫描进度更新

#### **ScanChannelFragment** - 搜台 UI 界面
- **路径**: `vendor/amlogic/reference/external/DTVKit/android-inputsource/app/src/main/droidlogic/java/com/droidlogic/fragment/ScanChannelFragment.java`
- **功能**: 完整的搜台 UI 实现，可直接参考

### 3. 搜台监听器接口

#### **ScannerEventListener** - 扫描事件监听
在 `TvControlManager.java` 中定义：
```java
public interface ScannerEventListener {
    void onScannerEvent(int type, int precent, int totalcount, int lock,
                       TvChannelParams params);
}
```

**扫描事件类型**:
- `EVENT_SCAN_BEGIN` - 开始扫描
- `EVENT_SCAN_END` - 扫描结束
- `EVENT_SCAN_PROGRESS` - 扫描进度更新
- `EVENT_STORE_BEGIN` - 开始存储频道
- `EVENT_STORE_END` - 存储频道完成

---

## 锁台功能参考

### 1. 调谐和锁定

#### **onTune() 方法实现**
在 `DTVInputService.java` 的 `DTVSessionImpl` 类中：

```java
@Override
public boolean onTune(Uri channelUri) {
    // 1. 从数据库获取频道信息
    ChannelInfo channel = mTvDataBaseManager.getChannelInfo(channelUri);

    // 2. 构造调谐参数
    TvChannelParams params = new TvChannelParams();
    params.setMode(channel.getType());        // DTV类型
    params.setFrequency(channel.getFrequency());
    params.setModulation(channel.getModulation());
    params.setBandwidth(channel.getBandwidth());
    params.setSymbolRate(channel.getSymbolRate());

    // 3. 调用底层锁台
    boolean success = mTvControlManager.DtvSetProgramme(params);

    // 4. 启动播放
    if (success) {
        startPlayProgram(channel);
    }

    return success;
}
```

#### **TvControlManager.DtvSetProgramme()** - 核心锁台方法
```java
public boolean DtvSetProgramme(TvChannelParams params) {
    // 通过HIDL调用HAL层
    // HAL层打开/dev/dvb0.frontend0
    // 调用ioctl(FE_SET_PROPERTY)设置调谐参数
    // 等待锁定信号
}
```

### 2. 信号监测

#### **TvInSignalInfo** - 信号质量监测
- **路径**: `vendor/amlogic/reference/tv/frameworks/core/java/com/droidlogic/app/tv/TvInSignalInfo.java`
- **功能**:
  - 实时监测信号强度
  - SNR (信噪比) 监测
  - BER (误码率) 监测
  - 锁定状态检测

```java
public interface SigInfoChangeListener {
    void onSigChange(TvInSignalInfo signal);
}

// 信号信息包含:
signal.sigStatus      // 信号状态
signal.sigStrength    // 信号强度 (0-100)
signal.sigSnr         // 信噪比
signal.sigBer         // 误码率
```

---

## 播放功能参考

### 1. 播放器启动

#### **startPlayProgram() 方法**
在 `DTVInputService.java` 中：

```java
private void startPlayProgram(ChannelInfo channel) {
    // 1. 设置视频/音频PID
    mTvControlManager.DtvSetAudioPID(channel.getAudioPid());
    mTvControlManager.DtvSetVideoPID(channel.getVideoPid());

    // 2. 设置PCR PID
    mTvControlManager.DtvSetPcrPID(channel.getPcrPid());

    // 3. 启动播放
    mTvControlManager.PlayDtmb(getMainVideoFormat());

    // 4. 设置音轨
    selectAudioTrack(channel.getAudioPids());

    // 5. 启动字幕
    if (hasSubtitle) {
        startSubtitle();
    }
}
```

### 2. 音视频轨道管理

#### **Track 选择**
```java
@Override
public boolean onSelectTrack(int type, String trackId) {
    switch (type) {
        case TvTrackInfo.TYPE_AUDIO:
            // 切换音轨
            switchAudioTrack(trackId);
            break;
        case TvTrackInfo.TYPE_SUBTITLE:
            // 切换字幕
            switchSubtitle(trackId);
            break;
    }
    return true;
}

private void switchAudioTrack(String trackId) {
    int pid = Integer.parseInt(trackId);
    mTvControlManager.DtvSwitchAudioTrack(pid, audioFormat);
}
```

### 3. MediaSession 和播放器控制

#### **TvPlayerActivity** - 播放器 Activity 示例
- **路径**: `vendor/amlogic/reference/apps/AmStreamingInputService/testapp/apps/AmStreamingInputTest/src/main/java/com/droidlogic/streaming/inputsourcetest/base/activity/TvPlayerActivity.java`
- **功能**:
  - TvView 集成
  - 播放控制
  - 频道切换
  - 事件处理

```java
public class TvPlayerActivity extends Activity {
    private TvView mTvView;

    private void setupTvView() {
        mTvView = findViewById(R.id.tv_view);
        mTvView.setCallback(new TvView.TvInputCallback() {
            @Override
            public void onConnectionFailed(String inputId) {
                // 连接失败处理
            }

            @Override
            public void onVideoAvailable(String inputId) {
                // 视频可用，播放开始
            }

            @Override
            public void onVideoUnavailable(String inputId, int reason) {
                // 视频不可用处理
            }
        });
    }

    private void tuneToChannel(Uri channelUri) {
        mTvView.tune(inputId, channelUri);
    }
}
```

---

## 数据库管理参考

### 1. 频道数据库

#### **TvDataBaseManager** - TV 数据库管理器
- **路径**: `vendor/amlogic/reference/tv/frameworks/core/java/com/droidlogic/app/tv/TvDataBaseManager.java`
- **功能**:
  - 频道信息增删改查
  - 使用 Android TvContract ContentProvider
  - 频道列表管理

```java
// 查询频道
ChannelInfo getChannelInfo(Uri channelUri);
List<ChannelInfo> getChannelList(String inputId, int type);

// 插入频道
Uri insertChannel(ChannelInfo channel);

// 更新频道
void updateChannel(ChannelInfo channel);

// 删除频道
void deleteChannel(long channelId);
```

#### **ChannelInfo** - 频道信息类
- **路径**: `vendor/amlogic/reference/tv/frameworks/core/java/com/droidlogic/app/tv/ChannelInfo.java`
- **包含字段**:
  ```java
  public class ChannelInfo {
      private long id; // 频道 ID
      private int type; // DTV/ATV
      private String displayName; // 显示名称
      private int displayNumber; // 频道号
      private int frequency; // 频率
      private int bandwidth; // 带宽
      private int modulation; // 调制方式
      private int symbolRate; // 符号率
      private int videoPid; // 视频 PID
      private int audioPid; // 音频 PID
      private int pcrPid; // PCR PID
      private ArrayList<Integer> audioPids; // 多音轨
      private ArrayList<Subtitle> subtitles; // 字幕列表
      // ... 其他字段
  }
  ```

### 2. EPG 数据管理

#### **DTVEpgScanner** - EPG 扫描器
- **路径**: `vendor/amlogic/reference/apps/TvInput/DroidLogicTvInput/src/com/droidlogic/tvinput/services/DTVEpgScanner.java`
- **功能**:
  - 后台 EPG 数据采集
  - EIT 表解析
  - 节目信息存储

---

## 完整开发示例

### 示例 1: DroidLogic 官方实现（推荐参考）

**完整项目路径**:
```
vendor/amlogic/reference/apps/TvInput/DroidLogicTvInput/
├── src/com/droidlogic/tvinput/
│   ├── services/
│   │   ├── DroidLogicTvInputService.java   # 基类
│   │   ├── DTVInputService.java            # DTV实现 ⭐
│   │   ├── ATVInputService.java            # ATV实现
│   │   ├── TvInputBaseSession.java         # Session基类
│   │   └── DTVEpgScanner.java              # EPG扫描
│   ├── widget/
│   │   ├── DTVSubtitleView.java            # 字幕显示
│   │   └── OverlayView.java                # 叠加视图
│   └── Utils.java                           # 工具类
└── AndroidManifest.xml
```

**关键配置 (AndroidManifest.xml)**:
```xml
<service
    android:name=".services.DTVInputService"
    android:label="@string/dtv_input_label"
    android:permission="android.permission.BIND_TV_INPUT">
    <intent-filter>
        <action android:name="android.media.tv.TvInputService" />
    </intent-filter>
    <meta-data
        android:name="android.media.tv.input"
        android:resource="@xml/dtv_input_service" />
</service>
```

**TvInputService 配置 (res/xml/dtv_input_service.xml)**:
```xml
<tv-input xmlns:android="http://schemas.android.com/apk/res/android"
    android:setupActivity="com.droidlogic.tvinput.settings.TvInputSetupActivity"
    android:settingsActivity="com.droidlogic.tvinput.settings.TvInputSettingsActivity"
    android:canRecord="true"
    android:tunerCount="4" />
```

### 示例 2: DTVKit 高级实现

**完整项目路径**:
```
vendor/amlogic/reference/external/DTVKit/android-inputsource/
├── DtvkitTvInput.java                      # 主服务 ⭐
├── logicdtvkit/src/logictuner/
│   ├── TunerAdapter.java                   # Tuner API封装
│   ├── FilterAdapter.java                  # Filter封装
│   └── NativeScanCallback.java             # 扫描回调
└── app/src/main/
    ├── droidlogic/java/com/droidlogic/fragment/
    │   ├── ScanChannelFragment.java        # 搜台UI ⭐
    │   └── ScanMainActivity.java           # 搜台主界面
    └── java/org/dtvkit/inputsource/
        ├── DtvKitDVBTCScanPresenter.java   # DVB-T/C扫描器 ⭐
        └── FvpScanActivity.java            # 扫描Activity
```

### 示例 3: 简单测试应用

**Sample Tuner TV Input** (官方示例):
- **路径**: `packages/apps/TV/tuner/sampletunertvinput/`
- **文件**:
  - `SampleTunerTvInputService.java` - 演示如何使用 android.media.tv.tuner API
  - `SampleTunerTvInputSetupActivity.java` - 设置界面

---

## 开发建议

### 1. 推荐的开发方式

#### **方案 A: 基于 DroidLogicTvInputService 开发（推荐）**

**优点**:
- 已封装硬件交互
- 支持多种 TV 标准
- 完整的错误处理
- 集成 EPG、字幕、音轨管理

**开发步骤**:
1. 创建新的 Service 继承 `DroidLogicTvInputService`
2. 实现 `onCreateSession()` 方法
3. 在 Session 中实现 `onTune()` 和播放逻辑
4. 配置 AndroidManifest.xml
5. 使用 `TvControlManager` 调用底层接口

**示例代码**:
```java
public class MyTvInputService extends DroidLogicTvInputService {

    @Override
    public Session onCreateSession(String inputId) {
        MySession session = new MySession(this, inputId);
        registerSession(session);
        return session;
    }

    class MySession extends TvInputBaseSession {

        @Override
        public boolean onTune(Uri channelUri) {
            // 1. 获取频道信息
            ChannelInfo channel = getChannelFromUri(channelUri);

            // 2. 设置调谐参数
            TvChannelParams params = buildTuneParams(channel);

            // 3. 调用TvControlManager锁台
            boolean locked = mTvControlManager.DtvSetProgramme(params);

            // 4. 启动播放
            if (locked) {
                startPlayback(channel);
            }

            return locked;
        }

        private void startPlayback(ChannelInfo channel) {
            // 设置PID
            mTvControlManager.DtvSetVideoPID(channel.getVideoPid());
            mTvControlManager.DtvSetAudioPID(channel.getAudioPid());

            // 启动播放
            mTvControlManager.PlayDtmb(0);
        }
    }
}
```

#### **方案 B: 使用 android.media.tv.tuner API（新方式）**

**优点**:
- Android 标准 API
- 更灵活的控制
- 适合自定义需求

**开发步骤**:
1. 使用 `Tuner` 类打开 Frontend
2. 配置调谐参数并 tune
3. 打开 Demux 和 Filter
4. 配置 PID 过滤
5. 读取 TS 流并播放

**示例代码**:
```java
// 1. 打开Tuner
Tuner tuner = new Tuner(context, null, 100);

// 2. 打开Frontend
int[] ids = tuner.getFrontendIds();
FrontendInfo info = tuner.getFrontendInfoById(ids[0]);
Frontend frontend = tuner.openFrontendByHandle(info.getHandle());

// 3. 配置调谐参数
DvbtFrontendSettings settings = DvbtFrontendSettings.builder()
    .setFrequency(474000000)  // 474MHz
    .setBandwidth(DvbtFrontendSettings.BANDWIDTH_8MHZ)
    .setModulation(DvbtFrontendSettings.MODULATION_64QAM)
    .build();

// 4. 调谐
int result = frontend.tune(settings);

// 5. 打开Demux
Demux demux = tuner.openDemux();

// 6. 创建Filter
Filter videoFilter = demux.openFilter(
    Filter.TYPE_TS,
    Filter.SUBTYPE_VIDEO,
    1024 * 1024,  // buffer size
    getMainExecutor(),
    filterCallback
);

// 7. 配置Filter
TsFilterConfiguration filterConfig = TsFilterConfiguration
    .builder()
    .setTpid(videoPid)
    .build();
videoFilter.configure(filterConfig);

// 8. 启动Filter
videoFilter.start();
```

### 2. 关键技术点

#### **A. 搜台流程**
```
用户启动搜台
    ↓
设置搜台参数 (频率范围、标准、带宽)
    ↓
调用 TvControlManager.DtvAutoScan() 或 DtvManualScan()
    ↓
注册 ScannerEventListener 监听扫描事件
    ↓
接收频道发现事件
    ↓
保存频道到数据库 (TvDataBaseManager.insertChannel())
    ↓
更新UI显示搜台进度
    ↓
搜台完成
```

**关键代码**:
```java
// 设置扫描监听
mTvControlManager.setScannerListener(new TvControlManager.ScannerEventListener() {
    @Override
    public void onScannerEvent(int type, int percent, int totalCount,
                              int lock, TvChannelParams params) {
        switch (type) {
            case TvControlManager.EVENT_SCAN_PROGRESS:
                updateProgress(percent);
                break;
            case TvControlManager.EVENT_SCAN_END:
                onScanComplete(totalCount);
                break;
        }
    }
});

// 开始自动搜台
mTvControlManager.DtvAutoScan();
```

#### **B. 锁台和播放流程**
```
用户选择频道
    ↓
从数据库读取 ChannelInfo
    ↓
构造 TvChannelParams
    ↓
调用 TvControlManager.DtvSetProgramme(params)
    ↓
等待锁定 (监听信号质量)
    ↓
设置视频/音频PID
    ↓
启动播放器 (TvControlManager.PlayDtmb())
    ↓
显示视频画面
```

#### **C. 信号监测**
```java
mTvControlManager.setSigInfoChangeListener(new TvInSignalInfo.SigInfoChangeListener() {
    @Override
    public void onSigChange(TvInSignalInfo signal) {
        // 更新UI显示信号强度
        updateSignalStrength(signal.sigStrength);
        updateSignalQuality(signal.sigSnr);

        // 检查信号丢失
        if (signal.sigStatus == TvInSignalInfo.SIG_STATUS_UNLOCK) {
            showNoSignalMessage();
        }
    }
});
```

### 3. 必需权限配置

**AndroidManifest.xml**:
```xml
<!-- TV Input权限 -->
<uses-permission android:name="android.permission.BIND_TV_INPUT" />
<uses-permission android:name="com.android.providers.tv.permission.READ_EPG_DATA" />
<uses-permission android:name="com.android.providers.tv.permission.WRITE_EPG_DATA" />

<!-- 访问TV硬件 -->
<uses-permission android:name="android.permission.TV_INPUT_HARDWARE" />

<!-- 网络和存储 -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<!-- DVR录制 -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- 系统级权限 (需要系统签名) -->
<uses-permission android:name="android.permission.ACCESS_ALL_EXTERNAL_STORAGE" />
```

### 4. 依赖库配置

**build.gradle** (或 Android.bp):
```gradle
dependencies {
    // Android TV库
    implementation 'androidx.leanback:leanback:1.0.0'
    implementation 'androidx.tvprovider:tvprovider:1.0.0'

    // DroidLogic库 (需要添加到项目)
    implementation files('libs/droidlogic-tv.jar')
    implementation files('libs/droidlogic-tvinput.jar')
}
```

### 5. 调试技巧

#### **查看日志**:
```bash
# TV Input相关
adb logcat -s DTVInputService DroidLogicTvInputService

# TvControlManager
adb logcat -s TvControlManager

# HAL层
adb logcat -s droidlogic_frontend

# DVB驱动
adb shell dmesg | grep CXD2878
```

#### **查看频道数据库**:
```bash
adb shell content query --uri content://android.media.tv/channel
```

#### **测试调谐**:
```bash
# 通过adb设置频点测试
adb shell setprop vendor.tv.dtv.test.frequency 474000000
```

---

## 核心 API 速查表

### TvControlManager 常用方法

| 方法 | 功能 | 参数 |
|------|------|------|
| `DtvAutoScan()` | 自动搜台 | 无 |
| `DtvManualScan(freq, freq, mod)` | 手动搜台 | 起始频率, 结束频率, 调制方式 |
| `DtvStopScan()` | 停止搜台 | 无 |
| `DtvSetProgramme(params)` | 锁台 | TvChannelParams |
| `DtvSetVideoPID(pid)` | 设置视频 PID | PID 值 |
| `DtvSetAudioPID(pid)` | 设置音频 PID | PID 值 |
| `PlayDtmb(format)` | 启动播放 | 视频格式 |
| `StopPlaying()` | 停止播放 | 无 |
| `getCurrentChannelInfo()` | 获取当前频道 | 返回 ChannelInfo |

### ChannelInfo 主要字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `frequency` | int | 频率 (Hz) |
| `bandwidth` | int | 带宽 (6/7/8 MHz) |
| `modulation` | int | 调制方式 (16/32/64/128/256 QAM) |
| `symbolRate` | int | 符号率 |
| `videoPid` | int | 视频 PID |
| `audioPid` | int | 音频 PID |
| `pcrPid` | int | PCR PID |
| `serviceId` | int | 服务 ID |
| `displayNumber` | int | 频道号 |
| `displayName` | String | 频道名 |

---

## 总结

开发 DTV 应用的最佳实践：

1. **参考 DTVInputService.java** - 这是最完整的实现，包含搜台、锁台、播放的所有细节
2. **使用 TvControlManager** - 封装了所有底层操作，无需直接操作 HAL
3. **集成 TvDataBaseManager** - 使用标准的 TV ContentProvider 管理频道
4. **参考 DTVKit** - 如需高级功能（CI、PVR、多 tuner），可参考 DTVKit 实现
5. **使用 TvView** - 在 Activity 中显示 TV 内容的标准方式

**最小可运行示例**: 参考 `DTVInputService.java` + `TvPlayerActivity.java` 的组合即可实现基本的搜台、锁台、播放功能。
