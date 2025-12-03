# Amlogic 产品信息定义（Dynamic fingerprint 动态指纹）

## 简介

这里主要介绍的是Amlogic方案中对name、brand、device、manufacturer四个属性的定义。
这四个属性拥有许多的拓展后缀，以`manufacturer`为例，使用`getprop | grep brand`命令可以发现有下面这些属性：

```java
[ro.product.bootimage.manufacturer]: [Amlogic]  # 启动镜像的制造商
[ro.product.manufacturer]: [Droidlogic]        # 设备的整体制造商
[ro.product.odm.manufacturer]: [Amlogic]       # ODM（原始设计制造商）部分的制造商
[ro.product.odm_dlkm.manufacturer]: [Amlogic]  # ODM的DLKM（动态加载内核模块）部分的制造商
[ro.product.product.manufacturer]: [Amlogic]   # 产品部分的制造商
[ro.product.system.manufacturer]: [Android]    # 系统镜像的制造商
[ro.product.system_dlkm.manufacturer]: [Amlogic] # 系统DLKM部分的制造商
[ro.product.system_ext.manufacturer]: [Amlogic] # 系统扩展（system_ext）部分的制造商
[ro.product.vendor.manufacturer]: [Amlogic]    # 供应商（vendor）部分的制造商
[ro.product.vendor_dlkm.manufacturer]: [Amlogic] # 供应商DLKM部分的制造商
[ro.soc.manufacturer]: [Amlogic]               # SoC（系统芯片）的制造商
```
上面的绝大部分属性可以使用mgrep命令找到其在mk文件中定义的地方，修改即可。但是有几个比较特殊，这里提出来。

## 基础属性：
```
ro.product.name         （正式名称）
ro.product.brand        （品牌）
ro.product.device       （设备）
ro.product.manufacturer （制造商）
```
以产品名ross为例，这几个属性定义在`device/amlogic/ross/oem/oem.prop`中，但是直接修改`oem.prop`中的属性或者在mk中指定属性都是无法生效的。

### 构建原理

1. 这几个属性首先在`device/amlogic/ross/device.mk`中被标记为OEM覆写属性。

```java
ifeq ($(BOARD_USES_DYNAMIC_FINGERPRINT),true)
PRODUCT_OEM_PROPERTIES := ro.product.name
PRODUCT_OEM_PROPERTIES += ro.product.brand
PRODUCT_OEM_PROPERTIES += ro.product.device
PRODUCT_OEM_PROPERTIES += ro.product.manufacturer
PRODUCT_OEM_PROPERTIES += ro.product.model
endif
```

2. 被标记的属性会从`./device/amlogic/ross/oem/oem.img`中解析并且覆盖。
也可以在编译好系统后在串口使用`cat oem/oem.prop`查看具体的值。至于为什么会是从img中解析我没有找到具体的构建代码，不过亲身实验更换img可以修改掉`oem/oem.prop`

### 解决方式

#### 方式一：取消覆写，重新指定

我们可以注释掉`device.mk`中对几个属性的标记，然后直接重新指定。
```java
--- a/device/amlogic/ross/device.mk
+++ b/device/amlogic/ross/device.mk
@@ -206,10 +206,13 @@ ifeq ($(BOARD_USES_DYNAMIC_FINGERPRINT),true)
 PRODUCT_OEM_PROPERTIES := ro.product.name
 PRODUCT_OEM_PROPERTIES += ro.product.brand
 PRODUCT_OEM_PROPERTIES += ro.product.device
-PRODUCT_OEM_PROPERTIES += ro.product.manufacturer
+#PRODUCT_OEM_PROPERTIES += ro.product.manufacturer
 PRODUCT_OEM_PROPERTIES += ro.product.model
 endif

+PRODUCT_PROPERTY_OVERRIDES += \
+    ro.product.manufacturer=MIHOYO
+

```

#### 方式二：重新编译oem.img镜像

1. 首先修改`device/amlogic/ross/oem/oem.prop`文件然后使用下面的命令构建`oem.img`
```
. build/envsetup.sh
lunch ross-user
make custom_images -j8
```

2. 将`oem.img`复制到指定目录下

```
copy out/target/product/ross/oem.img to device/amlogic/ross/oem/
```

## odm属性

下面这几个属性是同样的值，可以一起修改：
```
[ro.product.odm.manufacturer]: [MIHOYO]
[ro.product.product.manufacturer]: [MIHOYO]
[ro.product.system_ext.manufacturer]: [MIHOYO]
[ro.product.vendor.manufacturer]: [MIHOYO]
```
修改的位置在：`device/amlogic/ross/ross.mk`
```
PRODUCT_NAME := $(TARGET_PRODUCT)
PRODUCT_DEVICE := $(TARGET_PRODUCT)
PRODUCT_BRAND := MIHOYO
PRODUCT_MODEL := $(TARGET_PRODUCT)
PRODUCT_MANUFACTURER := MIHOYO
```
这边也是需要在每个产品的 mk 中去定义的，如果你想要在一个地方修改，在其他的产品中都生效，可以按照下面的做法：

`device/amlogic/common/core_amlogic.mk `
```
override PRODUCT_MANUFACTURER := MIHOYO
```
使用`override`字段对属性进行修饰，override 用于强制覆盖变量的值，确保其不会被之前的定义或其他逻辑修改。
