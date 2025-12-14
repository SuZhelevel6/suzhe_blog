# DVB APP 开发关键文件清单

如果你要开发一个实现**搜台、锁台、播放**功能的 APP，以下是必须参考的核心文件列表。

---

## 🎯 最关键的 3 个文件（必看）

### 1. **DTVInputService.java** ⭐⭐⭐⭐⭐
- **路径**: `vendor/amlogic/reference/apps/TvInput/DroidLogicTvInput/src/com/droidlogic/tvinput/services/DTVInputService.java`
- **为什么重要**: 这是完整的 DTV 实现，包含搜台、锁台、播放的所有核心代码
- **关键内容**:
  - `onTune()` - 锁台实现
  - `startPlayProgram()` - 播放实现
  - `onSelectTrack()` - 音轨/字幕切换
  - `RecordingSession` - DVR 录制
- **使用建议**: 直接参考或继承此类

### 2. **TvControlManager.java** ⭐⭐⭐⭐⭐
- **路径**: `vendor/amlogic/reference/tv/frameworks/core/java/com/droidlogic/app/tv/TvControlManager.java`
- **为什么重要**: 封装了所有底层 TV 硬件操作的 Java 接口
- **关键方法**:
  ```java
  DtvAutoScan() // 自动搜台
  DtvManualScan() // 手动搜台
  DtvStopScan() // 停止搜台
  DtvSetProgramme() // 锁台
  DtvSetVideoPID() // 设置视频 PID
  DtvSetAudioPID() // 设置音频 PID
  PlayDtmb() // 启动播放
  ```
- **使用建议**: 这是调用底层驱动的唯一入口，必须使用

### 3. **TvDataBaseManager.java** ⭐⭐⭐⭐
- **路径**: `vendor/amlogic/reference/tv/frameworks/core/java/com/droidlogic/app/tv/TvDataBaseManager.java`
- **为什么重要**: 管理频道数据库，搜台后的频道信息保存和读取
- **关键方法**:
  ```java
  insertChannel() // 保存搜到的频道
  getChannelList() // 获取频道列表
  getChannelInfo() // 获取频道详情
  updateChannel() // 更新频道信息
  deleteChannel() // 删除频道
  ```

---

## 📚 搜台功能相关文件

### 核心实现
1. **TvScanConfig.java**
   - 路径: `vendor/amlogic/reference/tv/frameworks/core/java/com/droidlogic/app/tv/TvScanConfig.java`
   - 功能: 搜台配置（搜台模式、TV 标准、国家设置）

2. **TvChannelParams.java**
   - 路径: `vendor/amlogic/reference/tv/frameworks/core/java/com/droidlogic/app/tv/TvChannelParams.java`
   - 功能: 频道参数封装（频率、调制、带宽、符号率）

### 高级示例（DTVKit）
3. **DtvKitDVBTCScanPresenter.java**
   - 路径: `vendor/amlogic/reference/external/DTVKit/android-inputsource/app/src/main/java/org/dtvkit/inputsource/searchguide/DtvKitDVBTCScanPresenter.java`
   - 功能: DVB-T/C 自动搜台完整实现

4. **ScanChannelFragment.java**
   - 路径: `vendor/amlogic/reference/external/DTVKit/android-inputsource/app/src/main/droidlogic/java/com/droidlogic/fragment/ScanChannelFragment.java`
   - 功能: 搜台 UI 界面完整实现

5. **NativeScanCallback.java**
   - 路径: `vendor/amlogic/reference/external/DTVKit/android-inputsource/logicdtvkit/src/logictuner/main/java/org/droidlogic/dtvkit/tuner/NativeScanCallback.java`
   - 功能: 扫描回调处理（锁定、解锁、进度更新）

### 搜台事件监听
在 `TvControlManager.java` 中定义的接口：
```java
public interface ScannerEventListener {
    void onScannerEvent(int type, int percent, int totalcount,
                       int lock, TvChannelParams params);
}
```

---

## 🎬 播放功能相关文件

### 核心实现
1. **TvInputBaseSession.java**
   - 路径: `vendor/amlogic/reference/apps/TvInput/DroidLogicTvInput/src/com/droidlogic/tvinput/services/TvInputBaseSession.java`
   - 功能: Session 生命周期管理、Surface 管理

2. **TvPlayerActivity.java**
   - 路径: `vendor/amlogic/reference/apps/AmStreamingInputService/testapp/apps/AmStreamingInputTest/src/main/java/com/droidlogic/streaming/inputsourcetest/base/activity/TvPlayerActivity.java`
   - 功能: TvView 使用示例、播放控制

### 音轨和字幕
3. **DTVSubtitleView.java**
   - 路径: `vendor/amlogic/reference/apps/TvInput/DroidLogicTvInput/src/com/droidlogic/tvinput/widget/DTVSubtitleView.java`
   - 功能: DTV 字幕显示

---

## 🔍 信号监测相关

1. **TvInSignalInfo.java**
   - 路径: `vendor/amlogic/reference/tv/frameworks/core/java/com/droidlogic/app/tv/TvInSignalInfo.java`
   - 功能: 信号质量监测（强度、SNR、BER）
   - 接口:
     ```java
     public interface SigInfoChangeListener {
         void onSigChange(TvInSignalInfo signal);
     }
     ```

---

## 📊 数据模型相关

1. **ChannelInfo.java**
   - 路径: `vendor/amlogic/reference/tv/frameworks/core/java/com/droidlogic/app/tv/ChannelInfo.java`
   - 功能: 频道信息数据模型
   - 重要字段:
     ```java
     int frequency; // 频率
     int bandwidth; // 带宽
     int modulation; // 调制方式
     int symbolRate; // 符号率
     int videoPid; // 视频 PID
     int audioPid; // 音频 PID
     int pcrPid; // PCR PID
     String displayName; // 频道名
     int displayNumber; // 频道号
     ```

---

## 🚀 快速开发模板

### 最小实现（仅需 3 个文件）

#### 1. 你的 TvInputService
```java
// 文件: MyTvInputService.java
public class MyTvInputService extends DroidLogicTvInputService {

    @Override
    public Session onCreateSession(String inputId) {
        return new MySession(this, inputId);
    }

    class MySession extends TvInputBaseSession {
        private TvControlManager mTvControlManager;
        private TvDataBaseManager mDbManager;

        public MySession(Context context, String inputId) {
            super(context, inputId);
            mTvControlManager = TvControlManager.getInstance();
            mDbManager = new TvDataBaseManager(context);
        }

        @Override
        public boolean onTune(Uri channelUri) {
            // 1. 从数据库读取频道
            ChannelInfo channel = mDbManager.getChannelInfo(channelUri);

            // 2. 构造调谐参数
            TvChannelParams params = new TvChannelParams();
            params.setFrequency(channel.getFrequency());
            params.setModulation(channel.getModulation());
            params.setBandwidth(channel.getBandwidth());

            // 3. 锁台
            boolean locked = mTvControlManager.DtvSetProgramme(params);

            // 4. 播放
            if (locked) {
                mTvControlManager.DtvSetVideoPID(channel.getVideoPid());
                mTvControlManager.DtvSetAudioPID(channel.getAudioPid());
                mTvControlManager.PlayDtmb(0);
            }

            return locked;
        }
    }
}
```

#### 2. 搜台 Activity
```java
// 文件: ScanActivity.java
public class ScanActivity extends Activity {
    private TvControlManager mTvControlManager;
    private TvDataBaseManager mDbManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        mTvControlManager = TvControlManager.getInstance();
        mDbManager = new TvDataBaseManager(this);

        // 注册搜台监听
        mTvControlManager.setScannerListener(new TvControlManager.ScannerEventListener() {
            @Override
            public void onScannerEvent(int type, int percent, int totalCount,
                                      int lock, TvChannelParams params) {
                if (type == TvControlManager.EVENT_SCAN_PROGRESS) {
                    updateProgress(percent);
                } else if (type == TvControlManager.EVENT_SCAN_END) {
                    onScanComplete();
                }
            }
        });
    }

    private void startScan() {
        // 自动搜台
        mTvControlManager.DtvAutoScan();
    }

    private void stopScan() {
        mTvControlManager.DtvStopScan();
    }
}
```

#### 3. 播放 Activity
```java
// 文件: PlayerActivity.java
public class PlayerActivity extends Activity {
    private TvView mTvView;
    private String mInputId = "com.example/.MyTvInputService";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_player);

        mTvView = findViewById(R.id.tv_view);
        mTvView.setCallback(new TvView.TvInputCallback() {
            @Override
            public void onVideoAvailable(String inputId) {
                // 视频可用
            }

            @Override
            public void onVideoUnavailable(String inputId, int reason) {
                // 视频不可用
            }
        });
    }

    private void playChannel(Uri channelUri) {
        mTvView.tune(mInputId, channelUri);
    }
}
```

---

## 📦 必需依赖

### Jar 包依赖
```
vendor/amlogic/reference/tv/frameworks/droidlogic-tv.jar
vendor/amlogic/reference/tv/frameworks/droidlogic-tvinput.jar
```

### 权限配置（AndroidManifest.xml）
```xml
<uses-permission android:name="android.permission.BIND_TV_INPUT" />
<uses-permission android:name="com.android.providers.tv.permission.READ_EPG_DATA" />
<uses-permission android:name="com.android.providers.tv.permission.WRITE_EPG_DATA" />
<uses-permission android:name="android.permission.TV_INPUT_HARDWARE" />
```

---

## 🔧 底层 HAL 和驱动文件（可选参考）

### HAL 层
- `hardware/amlogic/tuner/1.0/Frontend.cpp` - Frontend HAL 实现
- `hardware/amlogic/tuner/1.0/frontenddevices/FrontendDevice.cpp` - 设备操作
- `hardware/amlogic/tuner/1.0/frontenddevices/HwFeState.cpp` - 设备节点管理

### 驱动层
- `common/common14-5.15/common/common_drivers/drivers/dvb/tuner/cxd2878/cxd2878.c` - CXD2878 驱动
- `common/common14-5.15/common/common_drivers/drivers/dvb/demux/aml_dvb.c` - Amlogic DVB 主驱动

---

## 📖 推荐学习顺序

1. **第一步**: 阅读 `DTVInputService.java`，理解整体架构
2. **第二步**: 研究 `TvControlManager.java`，了解可用的 API
3. **第三步**: 参考 `ScanChannelFragment.java`，学习搜台 UI 实现
4. **第四步**: 查看 `TvPlayerActivity.java`，学习 TvView 使用
5. **第五步**: 根据模板代码开始开发

---

## ⚡ 常见问题

### Q1: 我需要直接操作 HAL 层吗？
**A**: 不需要。`TvControlManager` 已经封装了所有底层操作，直接使用即可。

### Q2: 搜台的频道如何保存？
**A**: 使用 `TvDataBaseManager.insertChannel()` 保存到 Android TV 的标准数据库。

### Q3: 如何显示视频？
**A**: 在 Activity 中使用 `TvView`，调用 `mTvView.tune(inputId, channelUri)` 即可。

### Q4: 需要 system 签名吗？
**A**: 如果只做基本的搜台播放，不需要。如果需要访问硬件或录制，需要系统签名。

---

## 💡 总结

**核心三要素**:
1. **DTVInputService.java** - 学习完整实现
2. **TvControlManager.java** - 调用底层接口
3. **TvDataBaseManager.java** - 管理频道数据

有了这三个类，加上 Android 标准的 `TvView`，就可以实现完整的搜台、锁台、播放功能！
