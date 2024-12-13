# 解决 Android 应用日志中 JDWP 报错问题

## 现象

在基于 Android 11 的代码中，如果关闭 **USB 调试**，日志中会反复出现以下报错：
~~~
failed to connect to jdwp control socket: Connection refused
~~~
而启用开发者选项的 **USB 调试** 后，日志中则不会出现该问题。

## 原因

报错的根本原因出现在 ART 虚拟机 中的 adbconnection 模块，该模块的代码实现了一个无限循环逻辑：

路径：`art/adbconnection/adbconnection.cc`

~~~
bool AdbConnectionState::SetupAdbConnection() {
  int sleep_ms = 500;
  const int sleep_max_ms = 2 * 1000;

  const AdbConnectionClientInfo infos[] = {
    {.type = AdbConnectionClientInfoType::pid, .data.pid = static_cast<uint64_t>(getpid())},
    {.type = AdbConnectionClientInfoType::debuggable, .data.debuggable = true},
  };
  const AdbConnectionClientInfo* info_ptrs[] = {&infos[0], &infos[1]};

  while (!shutting_down_) {
    // If adbd isn't running, because USB debugging was disabled or
    // perhaps the system is restarting it for "adb root", the
    // connect() will fail.  We loop here forever waiting for it
    // to come back.
    //
    // Waking up and polling every couple of seconds is generally a
    // bad thing to do, but we only do this if the application is
    // debuggable *and* adbd isn't running.  Still, for the sake
    // of battery life, we should consider timing out and giving
    // up after a few minutes in case somebody ships an app with
    // the debuggable flag set.
    control_ctx_.reset(adbconnection_client_new(info_ptrs, std::size(infos)));
    if (control_ctx_) {
      return true;
    }

    // We failed to connect.
    usleep(sleep_ms * 1000);

    sleep_ms += (sleep_ms >> 1);
    if (sleep_ms > sleep_max_ms) {
      sleep_ms = sleep_max_ms;
    }  
  }
~~~

**无限循环触发条件**
1. 关闭 USB 调试：此时 adbd 服务未运行，adbconnection_client_new() 方法无法建立连接。
2. 应用标记为可调试（debuggable=true）：系统会持续尝试连接 JDWP 控制 Socket，即使失败也不会终止循环。

**连接失败的根本原因**

函数 `adbconnection_client_new` 中尝试连接 JDWP 控制 Socket，但因 adbd 未运行导致连接失败

路径：`system/core/adb/libs/adbconnection/adbconnection_client.cpp`
~~~
int rc = connect(ctx->control_socket_.get(), reinterpret_cast<sockaddr*>(&addr), addr_len);
if (rc != 0) {
    PLOG(ERROR) << "failed to connect to jdwp control socket";
    return nullptr;
}
~~~

具体触发条件：
* adbconnection_client_new 方法会调用 connect 尝试建立 Unix 域套接字（AF_UNIX）。
* 当 JDWP 控制 Socket 无法找到或连接被拒绝时，会输出 Connection refused 错误。

## 解决方式

### 方法一：禁用应用的可调试标记

将应用的 AndroidManifest.xml 中的 debuggable 属性设置为 false：
~~~
<application
    android:debuggable="false"
    ...>
</application>
~~~
但是系统中有太多其他的APP，没办法保证每个APP都将 debuggable 属性设置为 false

### 方法二：修改无限循环逻辑

对 adbconnection.cc 中的无限循环逻辑进行优化，引入超时机制或条件限制。例如，在 while 循环中加入超时退出逻辑：
~~~
+  int max_retries = 10; // max retries
+  int retry_count = 0;  // current retries
  while (!shutting_down_) {
    control_ctx_.reset(adbconnection_client_new(info_ptrs, std::size(infos)));
    if (control_ctx_) {
      return true;
    }

    // We failed to connect.
    usleep(sleep_ms * 1000);

    sleep_ms += (sleep_ms >> 1);
    if (sleep_ms > sleep_max_ms) {
      sleep_ms = sleep_max_ms;
    }

+    // set loop limit and exit the loop after reaching the max retries
+    retry_count++;
+    VLOG(jdwp) << "Retry attempt #" << retry_count;
+    if (retry_count >= max_retries) {
+        VLOG(jdwp) << "Reach max retrie, exit the loop";
+        break;
+    }    
  }

  return false;
}
~~~