# 解决无限循环的 udc-core 报错问题

## 现象
在基于 Android 14 的代码中，开启 ADB 功能后，内核会不断打印以下报错信息：
~~~
udc-core: couldn't find an available UDC or it's busy
~~~

## 原因

出现该问题的原因是 Android 系统在启动 adbd 时尝试将 USB 设置为设备模式（device mode）以支持 ADB 功能，但当前 USB 口被设置为 OTG 模式（On-The-Go mode）。这种配置冲突导致系统无法成功绑定 USB Gadget，从而触发无限循环的报错。


## 解决方式一：设置usb口为device模式

修改设备树文件，将 USB 口的模式从 OTG 改为设备模式：

路径：`common/common14-5.15/common/common_drivers/arch/arm64/boot/dts/amlogic/xxxxxx.dts`

~~~
&crg_otg {
	status = "okay";
	/*这里由3改成2*/
	controller-type = <2>; /* 0~3: normal, host, device, otg */
};

&crg_drd {
~~~
优缺点
* 优点：可以解决无限循环报错问题,并且可以直接使用USB口进行ADB调试。
* 缺点：设置为设备模式后，该 USB 口将无法用于读取 U 盘中的文件，功能受限。

因此，此方案并不推荐使用。

## 解决方式二：设置属性
在设备的 makefile 配置中，通过设置某个属性，避免触发报错。注意：设置这个属性并不是真的会禁止ADB 调试，实测仍然可以使用网络进行ADB调试，因此推荐这样做。

路径：`device/amlogic/common/products/xxxxx.mk`

~~~
# 禁用 ADB 功能，避免报错：udc-core: couldn't find an available UDC...
PRODUCT_PROPERTY_OVERRIDES += vendor.sys.usb.adb.disabled=true
~~~

**背后的逻辑**

`sys.usb.adb.disabled` 属性用于指示 USB ADB 功能是否被禁用，其值通过 Android 的 init.rc 脚本从 `vendor.sys.usb.adb.disabled` 复制。其具体实现可以参考以下代码片段：

路径：`packages/modules/adb/daemon/usb.cpp`
~~~
static void usb_ffs_open_thread() {
    adb_thread_setname("usb ffs open");

    // When the device is acting as a USB host, we'll be unable to bind to the USB gadget on kernels
    // that don't carry a downstream patch to enable that behavior.
    //
    // This property is copied from vendor.sys.usb.adb.disabled by an init.rc script.
    //
    // Note that this property only disables rebinding the USB gadget: setting it while an interface
    // is already bound will do nothing.
    static const char* kPropertyUsbDisabled = "sys.usb.adb.disabled";
    PropertyMonitor prop_mon;
    prop_mon.Add(kPropertyUsbDisabled, [](std::string value) {
        // Return false (i.e. break out of PropertyMonitor::Run) when the property != 1.
        return android::base::ParseBool(value) == android::base::ParseBoolResult::kTrue;
    });

    while (true) {
        unique_fd control;
        unique_fd bulk_out;
        unique_fd bulk_in;
        if (!open_functionfs(&control, &bulk_out, &bulk_in)) {
            std::this_thread::sleep_for(1s);
            continue;
        }

        if (android::base::GetBoolProperty(kPropertyUsbDisabled, false)) {
            LOG(INFO) << "pausing USB due to " << kPropertyUsbDisabled;
            prop_mon.Run();
            LOG(INFO) << "resuming USB";
        }

        atransport* transport = new atransport();
        transport->serial = "UsbFfs";
        std::promise<void> destruction_notifier;
        std::future<void> future = destruction_notifier.get_future();
        transport->SetConnection(std::make_unique<UsbFfsConnection>(
                std::move(control), std::move(bulk_out), std::move(bulk_in),
                std::move(destruction_notifier)));
        register_transport(transport);
        future.wait();
    }
}
~~~
**关键点**：
1. sys.usb.adb.disabled 决定了 USB ADB 功能是否被禁用。
* 值为 true 时，ADB 功能暂停，避免无限循环的错误。
* 默认值为 false，会触发 UsbFfsConnection 初始化，导致报错循环。
2. 通过设置 `vendor.sys.usb.adb.disabled=true`，可以有效防止 adbd 尝试绑定 USB Gadget，从而解决报错问题。