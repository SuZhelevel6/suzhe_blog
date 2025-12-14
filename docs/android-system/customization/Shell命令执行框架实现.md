# Android 系统级 Shell 命令执行框架实现

## 概述

本文详细介绍 Android 系统级 Shell 命令执行框架的设计与实现，该框架允许 System App 安全地执行高权限 Shell 命令。通过 HAL 层封装、进程隔离和严格的权限控制，实现了安全可靠的命令执行能力。

### 核心技术点

- **跨进程通信（IPC）**：采用 HIDL/AIDL 实现 System App → Vendor HAL 的安全调用，通过 Binder 机制保证进程隔离
- **硬件抽象层（HAL）开发**：在 vendor 分区实现自定义 HAL 服务，封装底层 `popen()/execve()` 等系统调用
- **安全权限控制**：基于 SELinux 精细化权限策略，限制仅允许 system_app 进程调用 HAL 接口
- **JNI 与 Native 开发**：通过 JNI 桥接 Java 层与 C++ 实现，优化字符串编码转换与内存管理
- **系统服务架构**：符合 Android Treble 架构，解耦 Framework 与 Vendor 实现，支持稳定的 ABI 接口

### 应用场景

- 系统配置修改（网络配置、音量调节等）
- 系统属性读写（`getprop`/`setprop`）
- 文件操作（需要 root 权限的目录）
- OEM 特殊功能（如 OEMKEY 写入）

---

## 一、权限基础知识

### 1.1 UID 和 SELinux 域

Linux 用户权限是根据创建用户时分配的用户 ID（UID）来识别的。在 Android 系统中，不同的进程以不同的 UID 运行，拥有不同的权限。

#### 常用权限检查命令

```bash
# 检查 SELinux 域以及权限
ls -lZ /data/local/tmp/

# 查看当前用户信息
id            # 显示当前用户的 UID、GID 和所属组
whoami        # 显示当前用户名
groups        # 显示当前用户所属的所有组

# 查看文件/目录权限
ls -l         # 查看当前目录下的文件权限（所有者、组、权限）
ls -ld /path  # 查看指定目录本身的权限（而不是其内容）
stat /path    # 显示文件的详细权限、inode、时间等信息

# 查看 SELinux 相关（Android/Linux）
ls -lZ /path   # 查看文件/目录的 SELinux 上下文
getenforce     # 查看 SELinux 当前模式（Enforcing/Permissive/Disabled）
sestatus       # 查看 SELinux 详细状态

# 查看进程权限
ps -ef | grep [process]  # 查看进程的运行用户（UID）
top -n 1                 # 查看运行中的进程及其用户
```

### 1.2 不同权限级别对比

#### root 权限（adb shell + su 执行）
- **UID**：0（root）
- **GROUPS**：root log readproc
- **SELinux 域**：u:r:shell:s0 或 u:r:su:s0
- **权限**：root 对 `/data/local/tmp` 可写，shell 域对 `/system/bin/toybox` 也有 execute 权限
- **结果**：`touch /data/local/tmp/test.txt` 成功

#### system 权限
- **UID**：1000（system）
- **SELinux 域**：u:r:aidl_hwstbcmdservice:s0
- **权限**：aidl_hwstbcmdservice 对 `/system/bin/toybox` 的 execute 权限没有
- **结果**：`touch` 看似执行成功（exit code 0），但文件根本没创建

#### shell 权限
- **UID**：2000（shell）
- **GROUPS**：shell log readproc
- **SELinux 域**：u:r:shell:s0

**重要提示**：`touch /data/local/tmp/test.txt` 以及写入 oemkey 这种操作都需要 root 权限。服务的权限在 init.rc 中通过 `user` 和 `group` 声明。

---

## 二、方案一：JNI + HIDL 实现

### 2.1 架构设计

#### 整体目录结构

```
vendor/xxxx/common/libraries/hwstbcmdapi/
├── hidl_wrapper/      # HAL 层实现（HIDL 服务端）
├── java/              # Java 层接口（供应用调用）
├── jni/               # JNI 桥接层（Java ↔ Native）
└── libs/              # HIDL 客户端实现
```

#### 为什么属于 HAL

这个代码属于 HAL（Hardware Abstraction Layer，硬件抽象层），因为：
- **硬件交互**：`StbCmdShellhal.c` 最终调用 `popen()` 执行底层 Shell 命令
- **标准接口**：通过 `hardware/interfaces` 定义的 HIDL 接口对外提供服务
- **进程隔离**：通过 `init.rc` 启动为 `vendor.stbcmd-hal` 进程

#### 调用流程

```
┌─────────────────────────────────────────────────────────────┐
│                     App (Java)                              │
│                     调用 ShellCmd.exec()                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                1. Java 入口层                               │
│                ShellCmd.java                                │
│                (编译成 jar 包)                              │
└──────────────────────┬──────────────────────────────────────┘
                       │ JNI 调用
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                2. JNI 桥接层                                │
│                cn_xxxx_adp_cmd.cpp                          │
│                (libhistbcmdservice_jni.so)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ C++ 客户端调用
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                3. HIDL 客户端层                             │
│                HiStbcmdserviceManagerClient.cpp             │
│                (libhistbcmdservicemanageclient.so)          │
└──────────────────────┬──────────────────────────────────────┘
                       │ Binder IPC (hwservicemanager)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                4. HIDL 服务层                               │
│                Hwstbcmdservice.cpp                          │
│                (vendor.xxxx.stbcmd@1.0-service)             │
└──────────────────────┬──────────────────────────────────────┘
                       │ 本地调用
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                5. HAL 实现层                                │
│                StbCmdShellhal.c                             │
│                (执行 popen() 系统调用)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
                   Linux Kernel
                   执行 Shell 命令
```

### 2.2 设计优势

**JNI + HIDL 双重隔离**：
- **JNI**：解决 Java 代码调用 C 代码的问题
- **HIDL**：强制进程隔离，被调用的代码和调用方（System APP）不运行在同一个进程

**进程隔离的好处**：
- System APP 运行在 system 进程（UID 1000）
- Vendor HAL 运行在独立进程（如 `vendor.halservice`）
- HAL 的崩溃不影响 APP，提高系统稳定性
- 符合 Android Treble 项目的初衷（系统框架和硬件驱动独立升级）

**HIDL 服务进程管理**：
- 由 Vendor 厂商的 `init.rc` 文件定义
- 专用 HAL 进程：如 `vendor.xxxx.stbcmd@1.0-service`
- 共享 HAL 进程：多个 HIDL 服务可能合并到一个进程

---

## 三、JNI 实现详解

### 3.1 目录结构

```
├── java
│   └── cn
│       └── xxxx
│           └── shellcmd
│               └── ShellCmd.java
└── jni
    ├── Android.mk
    ├── cn_xxxx_adp_cmd.cpp
    └── cn_xxxx_shellcmd_ShellCmd.h
```

### 3.2 步骤 1：Java 层声明 Native 方法

**路径**：`vendor/xxxx/common/libraries/hwstbcmdapi/java/cn/xxxx/shellcmd/ShellCmd.java`

```java
public class ShellCmd {
    // 声明 native 方法
    public static native String hsInvokeJni(String cmd, int type);

    // 加载动态库
    static {
        System.loadLibrary("histbcmdservice_jni");
    }

    // 对外提供的执行方法
    public static String exec(String cmd, boolean isReturn) {
        // 添加 PATH 环境变量
        String fullCmd = "PATH=/system/bin:/system/xbin:/vendor/bin:/vendor/xbin " + cmd;
        if (isReturn) {
            return hsInvokeJni(fullCmd, 1);  // 需要返回结果
        } else {
            return hsInvokeJni(fullCmd, 0);  // 不需要返回结果
        }
    }
}
```

**关键说明**：
- `native` 关键字：标记该方法由 C/C++ 实现
- `System.loadLibrary()`：加载编译后的动态库（`libhistbcmdservice_jni.so`）
- `exec()` 方法会自动添加 PATH 环境变量，确保命令可以找到

### 3.3 步骤 2：生成 JNI 头文件

```bash
# 在 java 目录下执行
cd vendor/xxxx/common/libraries/hwstbcmdapi/java

# 一键生成 .class 文件和 .h 文件
javac -h ../jni cn/xxxx/shellcmd/ShellCmd.java
```

**生成的目录结构**：

```
.
├── cn
│   └── xxxx
│       └── shellcmd
│           ├── ShellCmd.class  # 生成的
│           └── ShellCmd.java
└── jni  # 生成的
    └── cn_xxxx_shellcmd_ShellCmd.h
```

**生成的头文件内容**：`vendor/xxxx/common/libraries/hwstbcmdapi/jni/cn_xxxx_shellcmd_ShellCmd.h`

```c
#include <jni.h>

#ifndef _Included_cn_xxxx_shellcmd_ShellCmd
#define _Included_cn_xxxx_shellcmd_ShellCmd
#ifdef __cplusplus
extern "C" {
#endif

/*
 * Class:     cn_xxxx_shellcmd_ShellCmd
 * Method:    hsInvokeJni
 * Signature: (Ljava/lang/String;I)Ljava/lang/String;
 */
JNIEXPORT jstring JNICALL Java_cn_xxxx_shellcmd_ShellCmd_hsInvokeJni
  (JNIEnv *, jclass, jstring, jint);

#ifdef __cplusplus
}
#endif
#endif
```

### 3.4 步骤 3：实现 JNI 函数

**路径**：`vendor/xxxx/common/libraries/hwstbcmdapi/jni/cn_xxxx_adp_cmd.cpp`

```cpp
// JNIEXPORT 和 JNICALL 是 JNI 规范要求的宏，确保函数能被 Java 虚拟机识别
// 返回值 jstring 表示返回 Java 的 String 对象
// 函数名格式必须为 Java_包名_类名_方法名（下划线代替点号）
JNIEXPORT jstring JNICALL Java_cn_xxxx_shellcmd_ShellCmd_hsInvokeJni(
    JNIEnv* env,          // JNI 环境指针，提供所有 JNI 函数
    jclass clazz,         // 调用该方法的 Java 类（静态方法时为 jclass，非静态为 jobject）
    jstring request,      // Java 传入的命令字符串（jstring 类型）
    jint type             // 执行类型（如是否返回结果）
) {
    // 1. 打印调试日志（ALOGE 是 Android 的 ERROR 级别日志）
    ALOGE("JNI Java_hsInvokeJni request %s type= %d\n", request, type);

    // 2. 将 Java 的 jstring 转为 C 字符串（临时快速转换）
    const char* tmp = env->GetStringUTFChars(request, NULL);
    if (tmp == NULL) {
        // 内存不足时直接返回错误
        return env->NewStringUTF("error");
    }

    // 3. 使用更安全的自定义转换函数（处理 UTF-8 编码）
    char* requestStr = jstringToChar(env, request);

    // 4. 调用 HIDL 客户端执行命令（核心逻辑）
    char* reply = HiStbcmdserviceManagerClient().hsInvokeHalClient(requestStr, type);

    // 5. 打印返回结果
    ALOGE("JNI Java_hsInvokeJni reply %s\n", reply);

    // 6. 将 C 字符串回复转为 Java 的 jstring
    jstring result = env->NewStringUTF(reply);

    // 7. 释放资源（关键！避免内存泄漏）
    env->ReleaseStringUTFChars(request, tmp); // 释放临时字符串
    free(requestStr);                         // 释放 jstringToChar 分配的内存
    // 注意：reply 的内存由 HIDL 客户端管理，此处不释放

    return result;
}
```

**字符串转换辅助函数**：

```cpp
// Java String 转 C 字符串（安全版本）
static char* jstringToChar(JNIEnv* env, jstring jstr) {
    char* rtn = NULL;
    jclass clsstring = env->FindClass("java/lang/String");
    jstring strencode = env->NewStringUTF("utf-8");
    jmethodID mid = env->GetMethodID(clsstring, "getBytes", "(Ljava/lang/String;)[B");
    jbyteArray barr = (jbyteArray) env->CallObjectMethod(jstr, mid, strencode);
    jsize alen = env->GetArrayLength(barr);
    jbyte* ba = env->GetByteArrayElements(barr, JNI_FALSE);
    if (alen > 0) {
        rtn = (char*) malloc(alen + 1);
        memcpy(rtn, ba, alen);
        rtn[alen] = 0;
    }
    env->ReleaseByteArrayElements(barr, ba, 0);
    return rtn;
}
```

### 3.5 步骤 4：注册 JNI 方法

在 `JNI_OnLoad` 中动态注册 Native 方法（替代静态头文件）：

```cpp
// 1. 定义 JNI 方法映射表（Java 方法 ↔ Native 函数）
static JNINativeMethod gMethods[] = {
    {
        "hsInvokeJni",                                // Java 方法名
        "(Ljava/lang/String;I)Ljava/lang/String;",    // 方法签名（参数和返回值类型）
        (void*)Java_cn_xxxx_shellcmd_ShellCmd_hsInvokeJni // 对应的 Native 函数指针
    },
    // 可添加更多方法...
};

// 2. 注册方法到 Java 类
static int register_android_histbcmdservicemanage_common(JNIEnv* env) {
    // 使用 AndroidRuntime 的辅助函数注册
    return AndroidRuntime::registerNativeMethods(
        env,                               // JNIEnv 指针
        "cn/xxxx/shellcmd/ShellCmd",       // Java 类全名（路径格式）
        gMethods,                          // 方法映射表
        NELEM(gMethods)                    // 方法数量（计算数组长度）
    );
}

// 3. JNI 库加载入口（动态库加载时自动调用）
jint JNI_OnLoad(JavaVM* vm, void* reserved) {
    JNIEnv* env = NULL;
    jint result = -1;

    // 3.1 获取 JNIEnv 指针（检查 JNI 版本）
    if (vm->GetEnv((void**)&env, JNI_VERSION_1_4) != JNI_OK) {
        return result; // 初始化失败
    }

    // 3.2 注册 Native 方法
    if (register_android_histbcmdservicemanage_common(env) < 0) {
        return result; // 注册失败
    }

    // 3.3 返回支持的 JNI 版本（必须与 Java 层匹配）
    return JNI_VERSION_1_4;
}
```

### 3.6 步骤 5：编译配置（Android.mk）

**路径**：`vendor/xxxx/common/libraries/hwstbcmdapi/jni/Android.mk`

```makefile
# 设置当前模块的构建路径
LOCAL_PATH := $(call my-dir)

###############################################
## libhistbcmdservice_jni（JNI 动态库）
###############################################
include $(CLEAR_VARS)

# 模块属性配置
LOCAL_MODULE := libhistbcmdservice_jni  # 生成的库名称
LOCAL_MODULE_TAGS := optional

# 编译标志
LOCAL_CFLAGS := -DANDROID_NDK
LOCAL_MULTILIB := both  # 同时编译 32 位和 64 位版本

# 源文件
LOCAL_SRC_FILES := cn_xxxx_adp_cmd.cpp

# 链接的系统库
LOCAL_LDLIBS := -ldl -llog

# 头文件搜索路径
LOCAL_C_INCLUDES += \
    $(JNI_H_INCLUDE) \
    $(LOCAL_PATH)/../libs \
    $(TOP)/frameworks/base/core/jni \
    # ... 其他头文件路径

# 依赖的共享库
LOCAL_SHARED_LIBRARIES := \
    libandroid_runtime \
    libbinder \
    libutils \
    libcutils \
    libhistbcmdservicemanageclient \
    libhwbinder \
    libnativehelper

# 构建共享库
include $(BUILD_SHARED_LIBRARY)
```

### 3.7 步骤 6：Java 层调用

```java
// 执行命令并获取返回值
String result = ShellCmd.exec("ls /data", true);
System.out.println("Command output: " + result);

// 执行命令不获取返回值
ShellCmd.exec("ifconfig wlan0 down", false);
```

---

## 四、HIDL 实现详解

### 4.1 步骤 1：定义 HIDL 接口

**路径**：`hardware/interfaces/hwstbcmdservice/1.0/IHwstbcmdservice.hal`

```java
package xxxx.hardware.hwstbcmdservice@1.0;

interface IHwstbcmdservice {
    hsInvokeHal(string request, int32_t type) generates(string result);
};
```

这是一个简单的 HAL 接口，定义了一个方法 `hsInvokeHal`，接收字符串请求和类型参数，返回字符串结果。

### 4.2 步骤 2：生成 HIDL 代码框架

使用 `hidl-gen` 工具生成代码框架：

```bash
. vendor/xxxx/hardware/interfaces/update-makefiles.sh
```

**脚本内容**：`vendor/xxxx/hardware/interfaces/update-makefiles.sh`

```bash
#!/bin/bash

# 加载 AOSP 提供的 HIDL 工具链辅助脚本
source ./system/tools/hidl/update-makefiles-helper.sh

# 调用自动化更新函数
do_makefiles_update \
    "xxxx.hardware:vendor/xxxx/hardware/interfaces/" \
    "android.hardware:hardware/interfaces" \
    "android.hidl:system/libhidl/transport"
```

**作用**：为 HIDL 接口生成对应的 `Android.bp` 或 `Android.mk` 构建文件。

### 4.3 步骤 3：实现 HAL 服务

**路径**：`hardware/interfaces/hwstbcmdservice/1.0/default/Hwstbcmdservice.cpp`

```cpp
Return<void> Hwstbcmdservice::hsInvokeHal(
    const hidl_string& request,
    int32_t type,
    hsInvokeHal_cb _hidl_cb
) {
    const char* result = hsInvokeNative(request.c_str(), type);
    hidl_string cb(result);
    _hidl_cb(cb);
    return Void();
}
```

这里调用了本地函数 `hsInvokeNative` 执行实际命令，并通过回调返回结果。

### 4.4 步骤 4：实现服务主程序

**路径**：`hardware/interfaces/hwstbcmdservice/1.0/default/service.cpp`

```cpp
int main() {
    // 使用 vndbinder 而不是标准 binder
    android::ProcessState::initWithDriver("/dev/vndbinder");
    android::ProcessState::self()->setThreadPoolMaxThreadCount(4);
    android::ProcessState::self()->startThreadPool();
    configureRpcThreadpool(1, true);

    // 创建并注册服务实例
    android::sp<IHwstbcmdservice> service = new Hwstbcmdservice();
    service->registerAsService("default");

    joinRpcThreadpool();
    return 0;
}
```

**关键点**：
1. 使用 `vndbinder` 而不是标准 binder（vendor 分区专用）
2. 设置线程池大小
3. 注册服务实例为 "default"

### 4.5 步骤 5：实现客户端调用

**路径**：`common/libraries/hwstbcmdapi/libs/HiStbcmdserviceManagerClient.cpp`

```cpp
char* HiStbcmdserviceManagerClient::hsInvokeHalClient(char* request, int type) {
    sp<IHwstbcmdservice> mHal = IHwstbcmdservice::getService();
    if(mHal != 0) {
        auto cbfun = [&](hidl_string strReply) {
            memcpy(result, strReply.c_str(), strReply.size() + 1);
        };
        mHal->hsInvokeHal(request, type, cbfun);
    }
    return result;
}
```

**关键操作**：
- 通过 `getService()` 获取 HIDL 服务代理
- 发起异步 Binder 调用 `hsInvokeHal`
- 通过 Lambda 回调同步等待结果

### 4.6 步骤 6：HAL 层实现（底层命令执行）

**路径**：`hidl_wrapper/StbCmdShellhal.c`

```c
// 实际命令执行
int hsInvokeNative(const char* cmd, int type, char* reply) {
    FILE* fp = popen(cmd, "r"); // 关键系统调用
    if (fp) {
        if (type == 1) { // 需要返回结果
            fgets(reply, BUFFER_MAX, fp);
        }
        pclose(fp);
        return 0; // success
    }
    return -1; // error
}
```

### 4.7 步骤 7：配置 SELinux 策略

参考：[SELinux 配置详解](https://blog.csdn.net/wudexiaoade2008/article/details/143495613)

在 `common/sepolicy` 目录下配置相关策略：
- `hal_hwstbcmdservice.te`：定义域和权限
- `hwservice_contexts`：定义服务上下文
- `system_app.te`：允许 system_app 访问服务

### 4.8 步骤 8：配置构建系统

**路径**：`device-xxxx.mk`

```makefile
# HIDL client
PRODUCT_PACKAGES += \
    libhistbcmdservice_jni \
    libhistbcmdservicemanageclient \
    libstbcmdservicehal

# HIDL treble service
PRODUCT_PACKAGES += \
    xxxx.hardware.hwstbcmdservice@1.0 \
    xxxx.hardware.hwstbcmdservice@1.0-impl \
    xxxx.hardware.hwstbcmdservice@1.0-service
```

### 4.9 步骤 9：服务启动配置

**路径**：`vendor/xxxx/hardware/interfaces/hwstbcmdservice/1.0/default/xxxx.hardware.hwstbcmdservice@1.0-service.rc`

```bash
service hwstbcmdservice-1-0 /vendor/bin/hw/xxxx.hardware.hwstbcmdservice@1.0-service
    class hal
    user root
    group root system
```

**说明**：定义 HIDL 服务进程的启动方式、权限和依赖关系（Android Init Language 语法）。

### 4.10 步骤 10：配置兼容性文件

**路径**：`common/compatibility_matrix.xml`

```xml
<hal format="hidl" optional="true">
    <name>xxxx.hardware.hwstbcmdservice</name>
    <version>1.0</version>
    <interface>
        <name>IHwstbcmdservice</name>
        <instance>default</instance>
    </interface>
</hal>
```

### 4.11 使用示例

```java
// 执行命令不获取返回值
ShellCmd.exec("ifconfig wlan0 down", false);

// 执行命令并获取返回值
String result = ShellCmd.exec("getprop ro.build.display.id", true).trim();
```

---

## 五、方案二：AIDL 实现（C++ 到 C++）

### 5.1 架构设计

相比 HIDL，AIDL 方案的特点：
- **统一接口语言**：AIDL 是 Android 统一的 IPC 接口定义语言
- **版本管理**：支持接口版本冻结和演进
- **稳定性域**：通过 stability 属性控制跨分区调用
- **性能优化**：可以使用 `AServiceManager_getService` 实现异步调用

#### 调用结构

```
App (Java)
   ↓ call
ShellCmd.java
   ↓ JNI
cn_xxxx_adp_cmd.cpp
   ↓ Client
HwstbcmdserviceClient.cpp
   ↓ Binder
IHwstbcmdservice.aidl
   ↓ Service
Hwstbcmdservice.cpp
   ↓ HAL
StbCmdShellhal.c
   ↓
Execute system shell command
```

### 5.2 核心改进点

1. **跨进程通信接口设计**
   - 设计 AIDL 接口，支持 System 和 Vendor 分区间的跨分区调用
   - 冻结接口版本，保证 VINTF 稳定性
   - 解决 AIDL 跨 System/Vendor 稳定性域限制问题（BpBinder 跨域错误）

2. **AIDL 服务与客户端实现**
   - 实现 C++ 服务端，集成 `binder_manager` 和线程池
   - 开发 C++ 客户端，使用 `AServiceManager_getService` 实现异步调用
   - 绕过 system 进程对 vendor binder 的同步限制，提升调用效率

3. **SELinux 安全策略配置**
   - 定义 AIDL 服务专属 SELinux domain
   - 配置 root 用户及 root shell 组权限
   - 支持高权限操作（如 `/data` 分区文件创建）

### 5.3 步骤 1：定义 AIDL 接口文件

**路径**：`vendor/xxxx/common/libraries/hwstbcmdapi/aidl/xxxx/hardware/hwstbcmdservice/IHwstbcmdservice.aidl`

```java
package xxxx.hardware.hwstbcmdservice;

@VintfStability
interface IHwstbcmdservice {
    String hsInvokeHal(String request, int type);
}
```

**关键说明**：
- `@VintfStability`：标记这个接口为 VINTF 稳定，不需要 `unstable`
- AIDL 接口有稳定和测试两种，测试的情况下无法被 system 访问

**AIDL 稳定性域说明**：
- `system stability binder`：只能在 framework/system 进程里访问
- `vendor stability binder`：只能在 vendor 进程里访问
- `stability` 设置成 `system` 可以在 system 进程和 vendor 都访问到

### 5.4 步骤 2：AIDL 构建

参考：[AIDL 构建详解](https://blog.csdn.net/weixin_43195445/article/details/144077912)

#### 第一步：编写 bp 文件

**路径**：`vendor/xxxx/common/libraries/hwstbcmdapi/aidl/Android.bp`

```python
// ============================================================
// AIDL interface
// ============================================================
aidl_interface {
    name: "xxxx.hardware.hwstbcmdservice",
    owner: "xxxx.hardware.hwstbcmdservice",  // 一定要这个！
    system_ext_specific: true,
    vendor_available: true,
    host_supported: true,
    stability: "vintf",
    srcs: ["xxxx/hardware/hwstbcmdservice/IHwstbcmdservice.aidl"],
    backend: {
        cpp: { enabled: true },
        java: { enabled: true },
    },
}
```

**注意事项**：
1. 这个 `Android.bp` 一定要在 `srcs` 的根目录这一层
2. 由于我们要编译的是稳定库，并且是 release branch，需要写上 `owner` 属性
3. `system_ext_specific: true`：可以被 system_ext 分区里的进程使用
4. `vendor_available: true`：可以被 vendor 分区里的进程使用
5. `host_supported: true`：宿主端（linux-x86 模拟器、单元测试）也能连接

#### 第二步：生成 aidl_api 的 current 目录

```bash
m xxxx.hardware.hwstbcmdservice-update-api
```

执行完这一步会生成 `current` 文件：

```
vendor/xxxx/common/libraries/hwstbcmdapi/aidl/aidl_api/xxxx.hardware.hwstbcmdservice/
└── current
    └── xxxx
        └── hardware
            └── hwstbcmdservice
                └── IHwstbcmdservice.aidl
```

#### 第三步：冻结版本

```bash
m xxxx.hardware.hwstbcmdservice-freeze-api
```

生成版本 1 目录并冻结：

```
vendor/xxxx/common/libraries/hwstbcmdapi/aidl/aidl_api/xxxx.hardware.hwstbcmdservice/
├── 1
│   └── xxxx
│       └── hardware
│           └── hwstbcmdservice
│               ├── IHwstbcmdservice.aidl
│               └── .hash
└── current
    └── xxxx
        └── hardware
            └── hwstbcmdservice
                └── IHwstbcmdservice.aidl
```

此时 bp 文件中会自动加上：

```python
versions_with_info: [
    {
        version: "1",
        imports: [],
    },
],
frozen: true,
```

#### 第四步：NDK 绑定

生成 NDK C++ 绑定：也就是 `<aidl/.../IHwstbcmdservice.h>` 头文件和库。

```bash
m xxxx.hardware.hwstbcmdservice-V1-ndk
```

会在 `out/` 下面生成 `IHwstbcmdservice.h` 文件：

```
out/soong/.intermediates/vendor/xxxx/common/libraries/hwstbcmdapi/aidl/
  xxxx.hardware.hwstbcmdservice-V1-ndk-source/gen/include/aidl/xxxx/hardware/hwstbcmdservice/
    ├── BnHwstbcmdservice.h
    ├── BpHwstbcmdservice.h
    └── IHwstbcmdservice.h
```

### 5.5 步骤 3：实现服务端

#### 目录结构

```
vendor/xxxx/common/libraries/hwstbcmdapi/aidl/service/
├── xxxx.hardware.hwstbcmdservice-aidl-service.rc
└── Hwstbcmdservice.cpp
```

#### 第一步：实现 Hwstbcmdservice.cpp

**路径**：`common/libraries/hwstbcmdapi/aidl/service/Hwstbcmdservice.cpp`

```cpp
#include <android/binder_manager.h>
#include <android/binder_process.h>
#include <log/log.h>

#include <aidl/xxxx/hardware/hwstbcmdservice/IHwstbcmdservice.h>
#include <aidl/xxxx/hardware/hwstbcmdservice/BnHwstbcmdservice.h>

#include "StbCmdShellhal.h"

using ::ndk::ScopedAStatus;

namespace aidl {
namespace xxxx {
namespace hardware {
namespace hwstbcmdservice {

// 实现类放在 aidl::xxxx::hardware::hwstbcmdservice 命名空间
class Hwstbcmdservice : public BnHwstbcmdservice {
public:
    // 方法签名必须和 .aidl 里定义的一致
    ScopedAStatus hsInvokeHal(
        const std::string& request,
        int32_t type,
        std::string* _aidl_return
    ) override {
        ALOGE("Hwstbcmdservice::hsInvokeHal %s type:%d", request.c_str(), type);
        char* result = hsInvokeNative(request.c_str(), type);
        if (result) {
            *_aidl_return = result;
        } else {
            *_aidl_return = std::string();
        }
        ALOGE("Hwstbcmdservice::hsInvokeHal result %s", _aidl_return->c_str());
        return ScopedAStatus::ok();
    }
};

} // namespace hwstbcmdservice
} // namespace hardware
} // namespace xxxx
} // namespace aidl

int main() {
    ALOGD("Starting xxxx.hardware.hwstbcmdservice AIDL service");

    // Configure binder-thread-pool
    ABinderProcess_setThreadPoolMaxThreadCount(4);
    ABinderProcess_startThreadPool();

    // Create and register service
    auto service = ndk::SharedRefBase::make<aidl::xxxx::hardware::hwstbcmdservice::Hwstbcmdservice>();
    const std::string instance = std::string() +
        aidl::xxxx::hardware::hwstbcmdservice::IHwstbcmdservice::descriptor + "/default";

    ndk::SpAIBinder binder = service->asBinder();
    binder_status_t status = AServiceManager_addService(binder.get(), instance.c_str());
    if (status != STATUS_OK) {
        ALOGE("Failed to register service: %d", status);
        return 1;
    }

    ALOGD("Service registered successfully");
    ABinderProcess_joinThreadPool();
    return 0;
}
```

**关键代码**：`char* result = hsInvokeNative(request.c_str(), type);` 这里调用了 `StbCmdShellhal.c` 的 `hsInvokeNative` 方法去实现真正的 cmd 命令执行逻辑。

#### 第二步：添加 service.rc 文件

**路径**：`xxxx.hardware.hwstbcmdservice-aidl-service.rc`

```bash
# Android Init Language
service vendor.hwstbcmdservice-aidl /vendor/bin/hw/xxxx.hardware.hwstbcmdservice-aidl-service
    class hal                          # 归属于 hal 服务组
    user root                          # 以 root 用户身份运行
    group system shell log readproc    # 系统组权限
    capabilities NET_ADMIN SYS_TIME    # 授予 Linux 能力
    seclabel u:r:hal_hwstbcmdservice:s0  # SELinux 上下文（需与策略匹配）
    onrestart restart vendor.halservers # 崩溃后重启相关服务
    shutdown critical                  # 标记为关键服务（关机时最后退出）
```

**重要说明**：

1. **必须使用 root 用户**：不然无法在一些目录创建文件，也没法写 OEMKEY

2. **权限组设置原因**：
   - 实测 `adb shell` 是 shell 组
   - `su` 之后会变成 root shell 组
   - 因此可以执行命令 `touch /data/local/tmp/test.txt`
   - 如果不加上就没办法创建文件，因为 `/data/` 下面是 shell 用户的领域

3. **权限验证**：
   ```bash
   # /data/local/tmp/ 的所属组
   ross:/ # ls -ld /data/local/tmp/
   drwxrwx--x 3 shell shell 3452 2025-09-22 07:31 /data/local/tmp/

   # shell 的属组
   ross:/ # groups
   shell input log adb sdcard_rw ... readproc uhid readtracefs

   # shell su 的属组
   ross:/ # groups
   root input log adb sdcard_rw ... readproc uhid readtracefs
   ```

#### 第三步：补充 bp 文件

**路径**：`vendor/xxxx/common/libraries/hwstbcmdapi/aidl/Android.bp`

```python
// ============================================================
// AIDL service (cc_binary)
// ============================================================
cc_binary {
    name: "xxxx.hardware.hwstbcmdservice-aidl-service",
    vendor: true,
    relative_install_path: "hw",
    srcs: [
        "service/Hwstbcmdservice.cpp",
    ],
    shared_libs: [
        "libbinder_ndk",
        "liblog",
        "libcutils",
        "libutils",
        "xxxx.hardware.hwstbcmdservice-V1-ndk",
        "libstbcmdservicehal",
    ],
    include_dirs: [
        "vendor/xxxx/common/libraries/hwstbcmdapi/aidl_wrapper",
    ],
    init_rc: ["service/xxxx.hardware.hwstbcmdservice-aidl-service.rc"],
    cflags: [
        "-Wall",
        "-Werror",
    ],
}
```

**注意事项**：
1. `aidl_wrapper` 目录下是真正实现 cmd shell 命令的 C 代码
2. `init_rc` 是必须的，定义服务启动配置
3. `shared_libs` 里面要包含 `V1-ndk`，这样才能正确导入 `IHwstbcmdservice.h`

### 5.6 步骤 4：实现客户端

#### 目录结构

```
vendor/xxxx/common/libraries/hwstbcmdapi/aidl/client/
├── HwstbcmdserviceClient.cpp
└── HwstbcmdserviceClient.h
```

#### 第一步：完成 HwstbcmdserviceClient.cpp

**路径**：`common/libraries/hwstbcmdapi/aidl/client/HwstbcmdserviceClient.cpp`

```cpp
#include "HwstbcmdserviceClient.h"

#include <android/binder_manager.h>
#include <log/log.h>
#include <aidl/xxxx/hardware/hwstbcmdservice/IHwstbcmdservice.h>

using aidl::xxxx::hardware::hwstbcmdservice::IHwstbcmdservice;

namespace android {

char* HwstbcmdserviceClient::hsInvokeHalClient(char* request, int type) {
    ALOGE("HwstbcmdserviceClient hsInvoke %s type:%d", request, type);

    static char result[4096] = {0};
    const std::string instance = std::string() + IHwstbcmdservice::descriptor + "/default";

    if (AServiceManager_isDeclared(instance.c_str())) {
        // 注意：使用 AServiceManager_getService 而不是 AServiceManager_waitForService
        ndk::SpAIBinder binder(AServiceManager_getService(instance.c_str()));
        auto service = IHwstbcmdservice::fromBinder(binder);

        if (service != nullptr) {
            std::string reply;
            auto status = service->hsInvokeHal(request, type, &reply);
            if (status.isOk()) {
                strncpy(result, reply.c_str(), sizeof(result) - 1);
            } else {
                strcpy(result, "error");
            }
        } else {
            strcpy(result, "service_not_available");
        }
    } else {
        strcpy(result, "service_not_declared");
    }

    return result;
}

} // namespace android
```

**关键说明**：
- 客户端声明了 `hsInvokeHalClient` 方法供 JNI 的调用层调用
- 客户端导入了 `IHwstbcmdservice.h` 头文件
- **必须使用 `AServiceManager_getService`** 而不能用 `AServiceManager_waitForService`，否则会被 Binder 限制不能从 system 进程调用

#### 第二步：补充 bp 文件

**路径**：`vendor/xxxx/common/libraries/hwstbcmdapi/aidl/Android.bp`

```python
// ============================================================
// AIDL client library (cc_library_shared)
// ============================================================
cc_library_shared {
    name: "libhistbcmdservicemanageclient-aidl",
    vendor_available: true,
    srcs: ["client/HwstbcmdserviceClient.cpp"],
    shared_libs: [
        "libbinder_ndk",
        "liblog",
        "xxxx.hardware.hwstbcmdservice-V1-ndk",
    ],
    export_include_dirs: ["client"],
    cflags: [
        "-fvisibility=default",
        "-Wall",
        "-Werror",
    ],
}
```

### 5.7 步骤 5：JNI 调用

**路径**：`common/libraries/hwstbcmdapi/jni/cn_xxxx_adp_cmd.cpp`

```cpp
JNIEXPORT jstring JNICALL Java_cn_xxxx_shellcmd_ShellCmd_hsInvokeJni
  (JNIEnv *env, jclass clazz, jstring request, jint type)
{
    ALOGE("JNI Java_hsInvokeJni request %s type= %d\n", request, type);
    const char* tmp = env->GetStringUTFChars(request, NULL);
    if (tmp == NULL) {
        return env->NewStringUTF("error");
    }

    char* requestStr = jstringToChar(env, request);
    // 这里调用了 AIDL 的客户端方法
    char* reply = android::HwstbcmdserviceClient::hsInvokeHalClient(requestStr, type);
    ALOGE("JNI Java_hsInvokeJni reply %s\n", reply);
    return env->NewStringUTF(reply);
}
```

### 5.8 步骤 6：配置 SELinux 策略

参考：[SELinux 配置详解](https://blog.csdn.net/wudexiaoade2008/article/details/143495613)

解决「谁能运行 / 谁能调用 / 谁能访问」的问题。

#### 目录结构

```
vendor/xxxx/common/sepolicy/
├── aidl_hwstbcmdservice.te
├── file_contexts
├── hwservice_contexts
└── system_app.te
```

#### aidl_hwstbcmdservice.te

定义了 `aidl_hwstbcmdservice` 这个新 AIDL 服务的 SELinux domain：

```bash
# 定义 AIDL service 的安全上下文类型
type aidl_hwstbcmdservice, domain;
# 定义可执行文件类型，属于 vendor 分区文件类型
type aidl_hwstbcmdservice_exec, exec_type, vendor_file_type, file_type;
# 定义在 hwservicemanager 中注册的 hwservice 类型
type aidl_hwstbcmdservice_hwservice, hwservice_manager_type;

# 允许 init 启动这个守护进程（建立 daemon 域）
init_daemon_domain(aidl_hwstbcmdservice)

# 允许该 service 使用 Binder 机制与系统/其他服务交互
binder_use(aidl_hwstbcmdservice)
# 允许该 service 使用 VND-Binder 通道（vendor 侧 binder 通信）
vndbinder_use(aidl_hwstbcmdservice)

# 允许该 service 读取 hwservicemanager 的属性值
get_prop(aidl_hwstbcmdservice, hwservicemanager_prop)

# 赋予该 service 一些 Linux 能力（capability）
allow aidl_hwstbcmdservice aidl_hwstbcmdservice:capability {
    sys_nice net_raw net_admin setgid setuid sys_time chown sys_admin net_bind_service
};

# 允许该 service 使用 syslog 能力（capability2），用于写系统日志
allow aidl_hwstbcmdservice aidl_hwstbcmdservice:capability2 { syslog };
```

#### file_contexts

定义二进制文件的 SELinux 标签：

```bash
/vendor/bin/hw/xxxx.hardware.hwstbcmdservice-aidl-service    u:object_r:aidl_hwstbcmdservice_exec:s0
```

#### hwservice_contexts

为 AIDL service 的名字 → SELinux 类型建立映射：

```bash
aidl/xxxx/hardware/hwstbcmdservice/IHwstbcmdservice/default   u:object_r:aidl_hwstbcmdservice_hwservice:s0
```

#### system_app.te

给 system_app 添加访问 `aidl_hwstbcmdservice` 的权限：

```bash
# system_app can call into aidl_hwstbcmdservice
allow system_app aidl_hwstbcmdservice:binder { call transfer };

# for getprop
allow system_app net_dns_prop:file { map };
allow system_app apexd_prop:file { open getattr };
allow system_app boottime_prop:file { open getattr map };
```

### 5.9 步骤 7：配置兼容性文件

这些是 HAL 与 VINTF 兼容性框架的声明文件，用于 framework ↔ vendor 之间的接口契约。

#### manifest.xml

作用：声明设备端（vendor）的 AIDL HAL 服务。

```xml
<manifest version="1.0" type="device">
    <hal format="aidl">
        <name>xxxx.hardware.hwstbcmdservice</name>
        <version>1</version>
        <fqname>IHwstbcmdservice/default</fqname>
    </hal>
</manifest>
```

#### compatibility_matrix.xml

作用：framework 侧的要求，描述它期望 vendor 提供哪些 HAL。

```xml
<compatibility-matrix version="1.0" type="framework">
    <hal format="aidl" optional="true">
        <name>xxxx.hardware.hwstbcmdservice</name>
        <version>1</version>
        <interface>
            <name>IHwstbcmdservice</name>
            <instance>default</instance>
        </interface>
    </hal>
</compatibility-matrix>
```

### 5.10 Binder 稳定性隔离问题

#### 问题描述

我们的 AIDL 服务默认是 `vendor stability`（因为在 `vendor/` 下定义的），但是我们在 `system stability`（system 进程 / system app）的上下文中调用它。框架层 binder 检测到了跨稳定性域的调用，会直接拒绝并产生报错：

```
E BpBinder: Cannot do a user transaction on a vendor stability binder
(xxxx.hardware.hwstbcmdservice.IHwstbcmdservice) in a system stability context.
```

#### 原因分析

- **HIDL 方案**：从设计之初就是跨 system/vendor 边界的，所有 HAL 都走 `hwservicemanager`，直接可以通讯
- **AIDL 方案**：在 Android R (11) 才正式支持 HAL，Google 加了一层 "stability domain" 校验
- HIDL 跨 system ↔ vendor 正常，但 AIDL 默认会卡在稳定性检查
- `system stability` 的调用方不能直接用 `vendor stability binder`

#### 解决方案

客户端调用时必须使用 `AServiceManager_getService` 而不能用 `AServiceManager_waitForService`。

AIDL 确实能跨 system ↔ vendor，只是 Google 强制你走 ServiceManager 这一套，不允许随便 `getService()` 绕过稳定性检查。所以 JNI 替换成 ServiceManager 调用，就是官方的推荐解法。

---

## 六、方案三：AIDL 一步到位（Java 到 C++）

### 6.1 设计思路

AIDL 本身是语言无关的，在 Android 上，它生成的是 Java 和 C++ 双端的 Stub/Proxy，Java 和 C++ 都可以使用 AIDL。

完全可以把 Client 层改成纯 Java 版本，这样调用链就变成：

```
App (Java)
   ↓ call
HwstbcmdserviceClient.java
   ↓ Binder (Proxy)
IHwstbcmdservice.aidl
   ↓ Service (Stub)
Hwstbcmdservice.cpp
   ↓ HAL
StbCmdShellhal.c
```

**优势**：
- 简化架构，去掉 JNI 层和 C++ 客户端
- 减少编译产物和依赖关系
- 纯 Java 调用，代码更简洁

### 6.2 步骤 1：删除无用部分

不再需要 AIDL 客户端和 JNI 的东西，在 mk 中删除相关引入，也删除相关代码：

```
modified:   vendor/xxxx/common/libraries/hwstbcmdapi/Android.bp
modified:   vendor/xxxx/common/libraries/hwstbcmdapi/aidl/Android.bp
deleted:    vendor/xxxx/common/libraries/hwstbcmdapi/aidl/client/HwstbcmdserviceClient.cpp
deleted:    vendor/xxxx/common/libraries/hwstbcmdapi/aidl/client/HwstbcmdserviceClient.h
modified:   vendor/xxxx/common/libraries/hwstbcmdapi/java/cn/xxxx/shellcmd/ShellCmd.java
deleted:    vendor/xxxx/common/libraries/hwstbcmdapi/jni/Android.mk
deleted:    vendor/xxxx/common/libraries/hwstbcmdapi/jni/cn_xxxx_adp_cmd.cpp
deleted:    vendor/xxxx/common/libraries/hwstbcmdapi/jni/cn_xxxx_shellcmd_ShellCmd.h
modified:   vendor/xxxx/device-xxxx.mk
```

### 6.3 步骤 2：添加新的 AIDL 客户端 Java 文件

**路径**：`vendor/xxxx/common/libraries/hwstbcmdapi/java/cn/xxxx/shellcmd/HwstbcmdserviceClient.java`

```java
package cn.xxxx.shellcmd;

import android.os.RemoteException;
import android.os.IBinder;
import android.os.ServiceManager;
import android.util.Log;

import xxxx.hardware.hwstbcmdservice.IHwstbcmdservice;

public class HwstbcmdserviceClient {
    private static final String TAG = "HwstbcmdserviceClient";
    private static final String SERVICE_NAME = IHwstbcmdservice.DESCRIPTOR + "/default";

    private static IHwstbcmdservice getService() {
        try {
            IBinder binder = ServiceManager.getService(SERVICE_NAME);
            if (binder == null) {
                Log.e(TAG, "Failed to get service binder: " + SERVICE_NAME);
                return null;
            }
            return IHwstbcmdservice.Stub.asInterface(binder);
        } catch (Exception e) {
            Log.e(TAG, "Exception while getting service: ", e);
            return null;
        }
    }

    public static String hsInvokeHalClient(String request, int type) {
        IHwstbcmdservice service = getService();
        if (service == null) {
            return "service_not_available";
        }

        try {
            return service.hsInvokeHal(request, type);
        } catch (RemoteException e) {
            Log.e(TAG, "RemoteException: ", e);
            return "error";
        }
    }
}
```

**设计说明**：保留 `ShellCmd` 文件的存在，这样就不用动它的 mk 和 jar 包，直接加上一个 Java 文件作为 AIDL 客户端。

### 6.4 步骤 3：加入对 AIDL 的依赖

由于我们在 `cn/xxxx/shellcmd/` 下面加了 AIDL 客户端，所以需要依赖 AIDL 接口。

**路径**：`vendor/xxxx/common/libraries/hwstbcmdapi/Android.bp`

```python
// ============================================================
// Java library (static)
// ============================================================
java_library_static {
    name: "stbshellcmd",
    srcs: ["java/**/*.java"],
    platform_apis: true,
    visibility: ["//visibility:public"],
    host_supported: true,
    installable: false,
    static_libs: [
        "xxxx.hardware.hwstbcmdservice-V1-java",
    ],
}
```

**最后一步**：重新编译 jar 包。

```bash
m stbshellcmd
```

---

## 七、踩坑记录

### 7.1 问题1：touch 命令执行成功但文件未创建

**现象**：
- 使用 system 权限执行 `touch /data/local/tmp/test.txt`
- 命令返回 exit code 0（成功）
- 但是文件根本没有创建

**原因**：
- SELinux 域 `aidl_hwstbcmdservice` 对 `/system/bin/toybox` 没有 execute 权限
- 虽然命令执行了，但是被 SELinux 拦截

**解决方案**：
- 在 `init.rc` 中将服务用户设置为 `root`
- 添加必要的权限组：`system shell log readproc`
- 配置正确的 SELinux 策略

### 7.2 问题2：Binder 稳定性域错误

**现象**：
```
E BpBinder: Cannot do a user transaction on a vendor stability binder
```

**原因**：
- AIDL 服务是 `vendor stability`，但在 `system stability` 上下文中调用
- Google 强制进行稳定性域检查

**解决方案**：
- 使用 `AServiceManager_getService` 而不是 `AServiceManager_waitForService`
- 通过 ServiceManager 正确获取服务

### 7.3 问题3：AIDL 接口无法冻结

**现象**：
- 执行 `m xxx-freeze-api` 命令失败
- 提示需要 `owner` 属性

**原因**：
- 稳定版本的 AIDL 接口需要声明 owner
- Release branch 的强制要求

**解决方案**：
- 在 `Android.bp` 中添加 `owner` 属性：
  ```python
  owner: "xxxx.hardware.hwstbcmdservice",
  ```

### 7.4 问题4：JNI 头文件找不到

**现象**：
- 编译 AIDL 客户端时提示找不到 `IHwstbcmdservice.h`

**原因**：
- 没有执行 NDK 绑定步骤
- 头文件没有生成

**解决方案**：
- 执行 `m xxxx.hardware.hwstbcmdservice-V1-ndk` 生成 NDK 绑定
- 在 `shared_libs` 中添加 `xxxx.hardware.hwstbcmdservice-V1-ndk`

---

## 八、最佳实践

### 8.1 选择合适的实现方案

| 方案 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| JNI + HIDL | Android 8.0-10.0 | 进程隔离好，稳定性高 | 架构复杂，维护成本高 |
| JNI + AIDL (C++) | Android 11+ | 接口标准化，版本管理好 | 需要处理稳定性域问题 |
| AIDL (Java) | Android 11+，纯 Java 项目 | 架构简洁，代码少 | 缺少 JNI/C++ 层灵活性 |

### 8.2 安全性建议

1. **最小权限原则**
   - 只授予必要的 Linux capabilities
   - 限制 SELinux 域的访问范围
   - 避免使用过于宽松的权限

2. **命令白名单**
   - 在 HAL 层实现命令白名单机制
   - 禁止执行危险命令（如 `rm -rf`）
   - 记录所有命令执行日志

3. **输入验证**
   - 对传入的命令进行严格校验
   - 防止命令注入攻击
   - 限制命令长度和格式

### 8.3 性能优化建议

1. **线程池配置**
   - 根据实际负载调整线程池大小
   - 避免频繁创建销毁线程

2. **内存管理**
   - 及时释放 JNI 分配的内存
   - 使用智能指针管理 C++ 对象
   - 避免内存泄漏

3. **Binder 调用优化**
   - 使用异步调用减少等待时间
   - 合并多个小请求为批量请求
   - 缓存频繁访问的数据

### 8.4 调试技巧

1. **查看服务状态**
   ```bash
   # HIDL 服务
   lshal | grep hwstbcmdservice

   # AIDL 服务
   dumpsys -l | grep hwstbcmdservice
   ```

2. **查看 SELinux 日志**
   ```bash
   adb logcat | grep avc
   ```

3. **测试命令执行**
   ```bash
   # 通过 adb 测试
   adb shell "service call xxx"
   ```

---

## 九、参考资料

### 官方文档
- [Android HAL 开发指南](https://source.android.com/devices/architecture/hal)
- [HIDL 接口定义语言](https://source.android.com/devices/architecture/hidl)
- [AIDL 开发文档](https://source.android.com/devices/architecture/aidl)
- [SELinux for Android](https://source.android.com/security/selinux)

### 相关博客
- [SELinux 配置详解](https://blog.csdn.net/wudexiaoade2008/article/details/143495613)
- [AIDL 构建详解](https://blog.csdn.net/weixin_43195445/article/details/144077912)

### 代码示例
- `vendor/xxxx/common/libraries/hwstbcmdapi/` - 完整实现代码
- `hardware/interfaces/` - AOSP HAL 接口定义

---

**创建时间**：2025-11-14
**最后更新**：2025-11-14
**标签**：#Android #系统定制 #Shell #HAL #HIDL #AIDL #JNI #Binder #SELinux
