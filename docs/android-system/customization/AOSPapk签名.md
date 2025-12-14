# 生成签名文件release key，通过Android源码对apk进行签名

## 简介
现在apk都需要签名，Flutter做的项目官方规定编译apk必须签名。
签名的好处：
1. 应用来源验证： 应用签名允许Android系统验证应用的来源。每个应用都使用开发者的私钥进行签名，而应用的签名信息包含在应用的APK文件中。当用户尝试安装应用时，系统会检查应用的签名，以确保它与系统中已知的相匹配。
2. 应用完整性验证： 应用签名有助于确保应用在传输过程中没有被篡改。如果应用在传输过程中被修改，其签名将失效，系统会拒绝安装或运行该应用。
3. 权限声明： 应用签名也与应用的权限声明相关。Android系统使用应用签名来确保应用对敏感系统资源和API的访问受到控制。如果应用的签名与其声明的权限不匹配，系统会拒绝授予应用相应的权限。
4. 防止重放攻击： 应用签名可以防止重放攻击，因为攻击者无法将已签名应用的部分替换为其他内容而不影响签名的有效性
## 相关文档
Android标准签名key文件位于源码的如下位置：`/build/target/product/security/README`
这个README 给出了相关说明：

```java
For detailed information on key types and image signing, please see:

https://source.android.com/devices/tech/ota/sign_builds.html

The test keys in this directory are used in development only and should
NEVER be used to sign packages in publicly released images (as that would
open a major security hole).

key generation
--------------

The following commands were used to generate the test key pairs:

  development/tools/make_key testkey  '/C=US/ST=California/L=Mountain View/O=Android/OU=Android/CN=Android/emailAddress=android@android.com'
  development/tools/make_key platform '/C=US/ST=California/L=Mountain View/O=Android/OU=Android/CN=Android/emailAddress=android@android.com'
  development/tools/make_key shared   '/C=US/ST=California/L=Mountain View/O=Android/OU=Android/CN=Android/emailAddress=android@android.com'
  development/tools/make_key media    '/C=US/ST=California/L=Mountain View/O=Android/OU=Android/CN=Android/emailAddress=android@android.com'

signing using the openssl commandline (for boot/system images)
--------------------------------------------------------------

1. convert pk8 format key to pem format
   % openssl pkcs8 -inform DER -nocrypt -in testkey.pk8 -out testkey.pem

2. create a signature using the pem format key
   % openssl dgst -binary -sha1 -sign testkey.pem FILE > FILE.sig

extracting public keys for embedding
------------------------------------

dumpkey.jar is a Java tool that takes an x.509 certificate in PEM format as
input and prints a C structure to standard output:

    $ java -jar out/host/linux-x86/framework/dumpkey.jar build/target/product/security/testkey.x509.pem
    {64,0xc926ad21,{1795090719,2141396315,950055447,2581568430,4268923165,1920809988,546586521,3498997798,1776797858,3740060814,1805317999,1429410244,129622599,1422441418,1783893377,1222374759,2563319927,323993566,28517732,609753416,1826472888,215237850,4261642700,4049082591,3228462402,774857746,154822455,2497198897,2758199418,3019015328,2794777644,87251430,2534927978,120774784,571297800,3695899472,2479925187,3811625450,3401832990,2394869647,3267246207,950095497,555058928,414729973,1136544882,3044590084,465547824,4058146728,2731796054,1689838846,3890756939,1048029507,895090649,247140249,178744550,3547885223,3165179243,109881576,3944604415,1044303212,3772373029,2985150306,3737520932,3599964420},{3437017481,3784475129,2800224972,3086222688,251333580,2131931323,512774938,325948880,2657486437,2102694287,3820568226,792812816,1026422502,2053275343,2800889200,3113586810,165549746,4273519969,4065247892,1902789247,772932719,3941848426,3652744109,216871947,3164400649,1942378755,3996765851,1055777370,964047799,629391717,2232744317,3910558992,191868569,2758883837,3682816752,2997714732,2702529250,3570700455,3776873832,3924067546,3555689545,2758825434,1323144535,61311905,1997411085,376844204,213777604,4077323584,9135381,1625809335,2804742137,2952293945,1117190829,4237312782,1825108855,3013147971,1111251351,2568837572,1684324211,2520978805,367251975,810756730,2353784344,1175080310}}

This is called by build/make/core/Makefile to incorporate the OTA signing keys
into the recovery image.

```
## 四种key
可以看到在Android系统中，有四种常见的签名密钥，分别是testkey、platform、shared和media。每个密钥用于签署不同类型的应用或组件，具有不同的权限和用途。
1. testkey：
   类型： 开发和测试使用。
   特点： 通常用于开发和测试阶段，不是用于生产环境。应用使用 testkey 签名时，系统会将其标记为测试版本，通常会有一些限制，例如无法安装在未解锁的设备上。
2. platform：
   类型： Android平台的系统应用。
   特点： 用于签署Android平台的系统应用，这些应用是由设备制造商提供的预装应用。这种签名允许应用访问系统的一些敏感权限和功能，而这些权限通常不允许其他应用获得。
3. shared：
   类型： 平台的共享系统库。
   特点： 主要用于签署Android平台上的共享系统库，这些库可以由多个应用共享。共享库可以提供一组通用的功能，供系统上的多个应用使用。这使得库可以更好地重用，减少重复的代码。
4. media：
   类型： 用于签署媒体库。
   特点： 主要用于签署Android平台上的媒体库，这些库提供音频和视频处理功能。这样的签名允许库访问系统上的音频和视频资源，这对于多媒体应用和功能非常重要。

应用程序的Android.mk中有一个LOCAL_CERTIFICATE字段，由它指定哪个key签名，未指定的默认用testkey。
Android.bp中为：certificate: “platform”。`build/target/product/security`目录下查看：

![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/5f76d222f6288032ef7f374935685111.png)
.pk8代表私钥，.x509.pem公钥，它们都是成对出现。
## 生成key
从README可知，key是通过`development/tools`目录下的make_key脚本生成的，脚本需要传入两个参数。其中第一个参数是key的名字，我们可以不修改，使用aosp默认的4个key的名字；第二个参数即是具体的一些属性，此为key真正的关键（我们需要修改的部分），下面对第二个参数的一些具体属性做出分析解释：

```java
C —> Country Name (2 letter code) #国家名称（2 个字母代码）
ST —> State or Province Name (full name) #州或省名称（全名）
L —> Locality Name (eg, city) #地区名称（例如，城市）
O —> Organization Name (eg, company) #组织名称（例如，公司）
OU —> Organizational Unit Name (eg, section) #组织单位名称（例如，部分）
CN —> Common Name (eg, your name or your server’s hostname) #通用名称（例如，您的姓名或服务器的主机名）
emailAddress —> Contact email address #联系电子邮件地址
```

因此，在生成key 的时候我们只需要AOSP的根目录使用以下命令，注意替换面的内容为自己的信息。

```java
  development/tools/make_key testkey  '/C=US/ST=California/L=Mountain View/O=Android/OU=Android/CN=Android/emailAddress=android@android.com'
  development/tools/make_key platform '/C=US/ST=California/L=Mountain View/O=Android/OU=Android/CN=Android/emailAddress=android@android.com'
  development/tools/make_key shared   '/C=US/ST=California/L=Mountain View/O=Android/OU=Android/CN=Android/emailAddress=android@android.com'
  development/tools/make_key media    '/C=US/ST=California/L=Mountain View/O=Android/OU=Android/CN=Android/emailAddress=android@android.com'
```

值得注意的是用make_key生成key的过程中会提示输入password，可以不输入，直接enter。
生成之后我将这些key都放在了`vendor/xxxx/android-certs/releasekey`路径下
## 验证key
在生成key后，再使用OpenSSL的工具来验证一下生成的key是否正常进入到`/build/target/product/security`目录，执行如下命令：

```java
openssl x509 -noout -subject -issuer -in platform.x509.pem 
```

执行后正确输出你的参数信息即可
## 修改系统默认签名key
在上面提到如果apk中的编译选项LOCAL_CERTIFICATE没有设置的话，就会使用默认的testkey作为签名key，我们可以修改成自己想要的key，按照上面的步骤制作一个releasekey。
1. 在build/make/core/Makefile中增加如下内容

```java
--- a/build/make/core/Makefile
+++ b/build/make/core/Makefile
@@ -328,6 +328,12 @@ BUILD_KEYS := test-keys
 else
 BUILD_KEYS := dev-keys
 endif
+
+# Here is a customization of which key signature to use
+ifeq ($(DEFAULT_SYSTEM_DEV_CERTIFICATE),vendor/xxxx/android-certs/releasekey)
+BUILD_KEYS := release-keys
+endif
+
 BUILD_VERSION_TAGS += $(BUILD_KEYS)
 BUILD_VERSION_TAGS := $(subst $(space),$(comma),$(sort $(BUILD_VERSION_TAGS)))
```

2. 在具体产品的mk中增加如下内容，vendor/xxxx/android-certs/releasekey为我存放各种key的路径

```java
--- a/device/amlogic/ohm/ohm.mk
+++ b/device/amlogic/ohm/ohm.mk
@@ -424,3 +424,7 @@ endif
 PRODUCT_PACKAGES += \
        Settings \
        SettingsIntelligence
+
+# android sign key
+PRODUCT_DEFAULT_DEV_CERTIFICATE := vendor/xxxx/android-certs/releasekey
+
```

3. 修改/system/sepolicy/prebuilts/api/30.0/private/keys.conf下的内容

```java
--- a/system/sepolicy/prebuilts/api/30.0/private/keys.conf
+++ b/system/sepolicy/prebuilts/api/30.0/private/keys.conf
@@ -22,7 +22,7 @@ ALL : $DEFAULT_SYSTEM_DEV_CERTIFICATE/shared.x509.pem

 # Example of ALL TARGET_BUILD_VARIANTS
 [@RELEASE]
-ENG       : $DEFAULT_SYSTEM_DEV_CERTIFICATE/testkey.x509.pem
-USER      : $DEFAULT_SYSTEM_DEV_CERTIFICATE/testkey.x509.pem
-USERDEBUG : $DEFAULT_SYSTEM_DEV_CERTIFICATE/testkey.x509.pem
+ENG       : $DEFAULT_SYSTEM_DEV_CERTIFICATE/releasekey.x509.pem
+USER      : $DEFAULT_SYSTEM_DEV_CERTIFICATE/releasekey.x509.pem
+USERDEBUG : $DEFAULT_SYSTEM_DEV_CERTIFICATE/releasekey.x509.pem
4. 修改/system/sepolicy/private/keys.conf下的内容
--- a/system/sepolicy/private/keys.conf
+++ b/system/sepolicy/private/keys.conf
@@ -22,7 +22,7 @@ ALL : $DEFAULT_SYSTEM_DEV_CERTIFICATE/shared.x509.pem

 # Example of ALL TARGET_BUILD_VARIANTS
 [@RELEASE]
-ENG       : $DEFAULT_SYSTEM_DEV_CERTIFICATE/testkey.x509.pem
-USER      : $DEFAULT_SYSTEM_DEV_CERTIFICATE/testkey.x509.pem
-USERDEBUG : $DEFAULT_SYSTEM_DEV_CERTIFICATE/testkey.x509.pem
+ENG       : $DEFAULT_SYSTEM_DEV_CERTIFICATE/releasekey.x509.pem
+USER      : $DEFAULT_SYSTEM_DEV_CERTIFICATE/releasekey.x509.pem
+USERDEBUG : $DEFAULT_SYSTEM_DEV_CERTIFICATE/releasekey.x509.pem
```

5. 验证打包编译好的系统使用的签名
   编译完成之后也可以在build.prop中查看到变量：

```java
adb root
adb remount
adb shell
cd system
cat build.prop
```

会看到一行ro.build.tags=release-keys。
6. 生成 generate_verity_key
   首先：

```java
make generate_verity_key (mmm system/extras/verity/)
```

然后执行：

```java
out/host/linux-x86/bin/generate_verity_key -convert build/target/product/security/verity.x509.pem  verity_key
```

重命名verity_key.pub为verity_key拷贝至`build/target/product/security/` 目录，替换相应的 key。
根据以上步骤把生成的相应的key替换系统中`build/target/product/security/` 目录下的key后重新编译系统，即可使用自己生成的系统签名key。
## 系统key文件生成keystore
生成keystore文件主要是给外部apk开发签名使用的；
以常用的platform签名为例：
如果之前没有生成platform.pem文件，现在可以执行以下命令生成：

```java
cd android/build/target/product/security

openssl pkcs8 -inform DER -nocrypt -in platform.pk8 -out platform.pem

openssl pkcs12 -export -in platform.x509.pem -out platform.p12 -inkey platform.pem -password pass:android -name androiddebugkey

keytool -importkeystore -deststorepass android -destkeystore ./platform.keystore -srckeystore ./platform.p12 -srcstoretype PKCS12 -srcstorepass android
```

最终的platform.keystore即为我们所要的keystore。
## AndroidStudio导入生成的keystore文件
将生成的platform.keystore放在AndroidStudio创建的项目的app/路径下
如图编辑build.gradle文件：

```java
android {
    signingConfigs {
        main {
            storeFile file("platform.keystore") //keystore文件路径
            storePassword "password"  //密钥密码
            keyAlias "yourname"  //key别名
            keyPassword "password"  //key密码
        }
    }

    buildTypes {
        debug {
            minifyEnabled false
            signingConfig signingConfigs.main
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
        release {
            minifyEnabled false
            signingConfig signingConfigs.main
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

之后clean peoject之后重新build apk并且install，apk即可拥有platform签名。
## 将编译好的apk进行系统签名
首先确认你的`/build/make/target/product/security/`目录下有.pem和.pk8的签名文件，然后确认有签名工具`prebuilts/sdk/tools/lib/signapk.jar`
然后将你要签名的apk放在在AOSP根目录使用以下命令，替换app.apk为你的apk名，替换app_signed.apk为你想要签完名的apk的名字。

```java
java -Djava.library.path="prebuilts/sdk/tools/linux/lib64" -jar ./prebuilts/sdk/tools/lib/signapk.jar ./build/make/target/product/security/platform.x509.pem ./build/make/target/product/security/platform.pk8 app.apk app_signed.apk
```
## 参考
生产key：
[Android系统签名生成&Studio导入系统keystore](https://blog.csdn.net/qq_37580586/article/details/124479855?ops_request_misc=&request_id=&biz_id=102&utm_term=Android%E7%AD%BE%E5%90%8Dreadme&utm_medium=distribute.pc_search_result.none-task-blog-2~all~sobaiduweb~default-0-124479855.142%5Ev96%5Epc_search_result_base1&spm=1018.2226.3001.4187%20%E7%AD%BE%E5%90%8Dapk%EF%BC%9A%20https://blog.csdn.net/weixin_44613278/article/details/117513475?ops_request_misc=%257B%2522request%255Fid%2522%253A%2522170070936316800213038474%2522%252C%2522scm%2522%253A%252220140713.130102334..%2522%257D&request_id=170070936316800213038474&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~sobaiduend~default-1-117513475-null-null.142%5Ev96%5Epc_search_result_base1&utm_term=Android%E6%BA%90%E7%A0%81%E7%AD%BE%E5%90%8Dapk&spm=1018.2226.3001.4187)

签名key：
[通过Android源码对apk进行签名](https://blog.csdn.net/qq_37580586/article/details/124479855?ops_request_misc=&request_id=&biz_id=102&utm_term=Android%E7%AD%BE%E5%90%8Dreadme&utm_medium=distribute.pc_search_result.none-task-blog-2~all~sobaiduweb~default-0-124479855.142%5Ev96%5Epc_search_result_base1&spm=1018.2226.3001.4187%20%E7%AD%BE%E5%90%8Dapk%EF%BC%9A%20https://blog.csdn.net/weixin_44613278/article/details/117513475?ops_request_misc=%257B%2522request%255Fid%2522%253A%2522170070936316800213038474%2522%252C%2522scm%2522%253A%252220140713.130102334..%2522%257D&request_id=170070936316800213038474&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~sobaiduend~default-1-117513475-null-null.142%5Ev96%5Epc_search_result_base1&utm_term=Android%E6%BA%90%E7%A0%81%E7%AD%BE%E5%90%8Dapk&spm=1018.2226.3001.4187)