# 预定义屏幕分辨率与屏幕像素密度 (Density)

本文以 Amlogic Android 14 的代码为例，详细探讨如何预定义屏幕分辨率与像素密度的设置方法，以及如何处理 HDMI EDID 信息对分辨率的影响。

## 如何查看当前屏幕分辨率与像素密度
我们可以通过以下命令查看设备的当前分辨率与像素密度：
`adb shell wm size`
`adb shell wm density`
这些命令会分别返回屏幕的分辨率（如 1920x1080）和像素密度（如 320）。

## prop属性的定义

在设备的 mk 文件中，通常会预定义以下三个属性以设置默认分辨率和密度。这些属性的配置示例如下：
路径：`device/xxxxxxx/xxxx/xxxx.mk`
~~~
#config of AM301 1080P UI surfaceflinger
PRODUCT_PRODUCT_PROPERTIES += \
    ro.surface_flinger.max_graphics_width=1920  \
    ro.surface_flinger.max_graphics_height=1080 \
    ro.sf.lcd_density=240
~~~
上述配置定义了系统支持的最大分辨率为 1920x1080，并设置了像素密度为 240。

## xhdpi 的设置
分辨率配置还涉及 PRODUCT_AAPT_PREF_CONFIG 属性的设置。它通常定义在设备的 device.mk 文件中：
路径：`device/xxxxxxx/xxxx/device.mk`
~~~
ifeq ($(BOARD_COMPILE_ATV), true)
PRODUCT_AAPT_PREF_CONFIG := xhdpi
else
PRODUCT_AAPT_PREF_CONFIG := hdpi
endif
~~~

通过设置该属性，可以控制系统优先采用的屏幕配置。我们也可以通过强制覆盖的方式确保使用特定的配置，例如：
~~~
# 强制设置为 xhdpi，分辨率：1920x1080，密度：320
override PRODUCT_AAPT_PREF_CONFIG := xhdpi
~~~

xhdpi 对应的密度值为 320。以下是 DPI 和其对应类别的映射表：

路径：`build/make/core/Makefil`
~~~
# We roughly use the medium point between the primary densities to split buckets.
# ------160------240------320----------480------------640------
#       mdpi     hdpi    xhdpi        xxhdpi        xxxhdpi
~~~

此外，还需要确保与屏幕分辨率相关的 XML 文件正确配置。例如：

路径：`device/xxxxx/common/products/xxx/display_config_aosp.xml`
~~~
<displayConfiguration>
    <densityMapping>
         <density>
            <height>480</height>
            <width>720</width>
            <density>120</density>
         </density>
         <density>
            <height>720</height>
            <width>1280</width>
            <density>160</density>
         </density>
         <density>
            <height>1080</height>
            <width>1920</width>
            <density>320</density>
         </density>
         <density>
            <height>2160</height>
            <width>3840</width>
            <density>480</density>
         </density>
         <density>
            <height>2160</height>
            <width>4096</width>
            <density>480</density>
         </density>
    </densityMapping>
</displayConfiguration>
~~~
一般完成了 Prop 属性和 xhdpi 的设定就可以固定好默认分辨率了。

## bootloader 中的edid设置

在某些情况下，设备插入 HDMI 显示器和不插入 HDMI 显示器时的开机分辨率可能不同。这主要与 Bootloader 中的 EDID 配置有关。

EDID (Extended Display Identification Data) 是显示设备的标识数据，其中包含显示器性能的详细参数，例如供应商信息、最大图像大小、颜色设置、频率范围等。它相当于显示器的 “身份证” 和 “技能证书”。

在 U-Boot 中，系统会解析 HDMI 的 EDID 信息以确定分辨率。以下是相关代码的几个关键点：

1. EDID 数据检查：
路径：`bootloader/uboot-repo/***/***/cmd_hdmitx21.c`
~~~
		if (!hdev->pxp_mode) {
			if (!hdmitx_edid_check_data_valid(0, hdev->rawedid)) {
				/* in SWPL-34712: if EDID parsing error in kernel,
				 * only forcely output default mode(480p,RGB,8bit)
				 * in sysctl, not save the default mode to env.
				 * if uboot follow this rule, will cause issue OTT-19333:
				 * uboot read edid error and then output default mode,
				 * without save it mode env. if then kernel edid normal,
				 * sysctrl/kernel get mode from env, the actual output
				 * mode differs with outputmode env,it will
				 * cause display abnormal(such as stretch). so don't
				 * follow this rule in uboot, that's to say the actual
				 * output mode needs to stays with the outputmode env.
				 */
				printf("edid parsing ng, forcely output 1080p, rgb,8bit\n");
				save_default_720p();
				hdev->vic = HDMI_16_1920x1080p60_16x9;
				hdev->para =
					hdmitx21_get_fmtpara("1080p60hz", "rgb,8bit");
				hdev->para->cs = HDMI_COLORSPACE_RGB;
				hdev->para->cd = COLORDEPTH_24B;
				hdmitx21_set(hdev);
				return CMD_RET_SUCCESS;
			}
		}
~~~
如果 EDID 解析失败，系统会强制输出默认模式（如 1080p60hz）。

2. 设置回退模式

路径：`bootloader/uboot-repo/***/***/hdmi_edid_parsing.c`
~~~
/*
 * if the EDID is invalid, then set the fallback mode
 * Resolution & RefreshRate:
 *   1920x1080p60hz 16:9
 *   1280x720p60hz 16:9 (default)
 *   720x480p 16:9
 * ColorSpace: RGB
 * ColorDepth: 8bit
 */
static void edid_set_fallback_mode(struct rx_cap *prxcap)
{
	if (!prxcap)
		return;

	/* EDID extended blk chk error, set the 720p60, rgb,8bit */
	prxcap->IEEEOUI = HDMI_IEEEOUI;
	prxcap->Max_TMDS_Clock1 = DEFAULT_MAX_TMDS_CLK; /* 165MHZ / 5 */
	prxcap->native_Mode = 0; /* only RGB */
	prxcap->dc_y444 = 0; /* only 8bit */
	prxcap->VIC_count = 0x3;
	prxcap->VIC[0] = HDMI_1920x1080p60_16x9;
	prxcap->VIC[1] = HDMI_1280x720p60_16x9;
	prxcap->VIC[2] = HDMI_720x480p60_16x9;
	prxcap->native_VIC = HDMI_1920x1080p60_16x9;
}

/* add default VICs for all zeroes case */
static void hdmitx_edid_set_default_vic(struct rx_cap *prxcap)
{
	prxcap->VIC_count = 0x2;
	prxcap->VIC[0] = HDMI_720x480p60_16x9;
	prxcap->VIC[1] = HDMI_1280x720p60_16x9;
	prxcap->native_VIC = HDMI_1920x1080p60_16x9;
	/* hdmitx_device->vic_count = prxcap->VIC_count; */
	printf("set default vic\n");
}
~~~
默认情况下，回退分辨率会优先设置为 1080p60hz 或更低。


3. `bootloader/uboot-repo/***/hdmi_common.h`
~~~
#define DEFAULT_HDMI_MODE               "1080p60hz"
~~~

4. `hardware/***/mode_private.h`

~~~
#define MESON_DEFAULT_HDMI_MODE             "1080p60hz"
~~~