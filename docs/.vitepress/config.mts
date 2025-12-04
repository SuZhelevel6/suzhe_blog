import { defineConfig } from 'vitepress'

// 导入主题的配置
import { blogTheme } from './blog-theme'

// Vitepress 默认配置
// 详见文档：https://vitepress.dev/reference/site-config
export default defineConfig({
  // 继承博客主题(@sugarat/theme)
  extends: blogTheme,
  base: '/suzhe_blog/',
  lang: 'zh-cn',
  title: "SuZhe Blog",
  description: "A Personal Knowledge Base",
  lastUpdated: true,
  // 详见：https://vitepress.dev/zh/reference/site-config#head
  head: [
    ['link', { rel: 'icon', href: '/suzhe_blog/logo.svg' }]
  ],
  themeConfig: {
    // 展示 2,6 级标题在目录中
    outline: {
      level: [2, 6],
      label: '目录'
    },
    // 默认文案修改
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '相关文章',
    lastUpdatedText: '上次更新于',

    // 设置logo
    logo: '/logo.svg',

    nav: [
      { text: '关于本博客', link: '/AboutMe.md' },
      {
        text: 'Android 开发',
        items: [
          {
            text: '入门基础',
            items: [
              { text: '嵌入式安卓学习入门', link: '/android/basics/嵌入式安卓学习入门.md' },
              { text: 'ADB 命令手册', link: '/android/basics/adb-command.md' },
              { text: '编程规范', link: '/android/basics/style-guide.md' },
              { text: '《第一行代码》笔记', link: '/android/basics/第一行代码Android笔记.md' },
            ],
          },
          {
            text: '系统原理',
            items: [
              { text: 'Android 系统启动流程', link: '/android/framework/Android系统启动流程.md' },
              { text: '源码与编译', link: '/android/framework/源码与编译.md' },
              { text: '编译系统', link: '/android/framework/编译系统.md' },
              { text: '进程间通信(一)', link: '/android/framework/进程间通信(一).md' },
              { text: '进程间通信(二)', link: '/android/framework/进程间通信(二).md' },
              { text: 'Binder 机制', link: '/android/framework/进程通信机制Binder.md' },
              { text: 'Android 进程和线程', link: '/android/framework/Android进程和线程.md' },
              { text: 'Handler 机制', link: '/android/framework/线程通信机制Handler.md' },
              { text: 'AsyncTask (已过时)', link: '/android/framework/线程通信机制AsyncTask.md' },
              { text: 'Android 权限机制', link: '/android/framework/Android权限机制.md' },
              { text: 'OTA 升级机制', link: '/android/framework/OTA升级机制.md' },
            ],
          },
          {
            text: '组件开发',
            items: [
              { text: 'Activity', link: '/android/components/Activity.md' },
              { text: 'Service', link: '/android/components/Service.md' },
              { text: 'Broadcast', link: '/android/components/Broadcast.md' },
              { text: 'ContentProvider', link: '/android/components/ContentProvider.md' },
              { text: 'Fragment', link: '/android/components/Fragment.md' },
              { text: 'Context', link: '/android/components/Context.md' },
              { text: 'Intent', link: '/android/components/Intent.md' },
              { text: 'Bundle', link: '/android/components/Bundle.md' },
              { text: 'Lifecycle', link: '/android/components/Lifecycle.md' },
              { text: 'ViewModel', link: '/android/components/ViewModel.md' },
              { text: 'LiveData', link: '/android/components/LiveData.md' },
              { text: 'RecyclerView', link: '/android/components/RecyclerView.md' },
              { text: 'ViewPager', link: '/android/components/ViewPager.md' },
              { text: 'ViewPager2', link: '/android/components/ViewPager2.md' },
              { text: 'DataBinding', link: '/android/components/DataBinding.md' },
              { text: 'WorkManager', link: '/android/components/WorkManager.md' },
            ],
          },
          {
            text: '系统定制',
            items: [
              { text: 'Amlogic S905x 方案合集', link: '/android/customization/Amlogics905x方案合集.md' },
              { text: 'Amlogic 产品名称定义', link: '/android/customization/Amlogic产品名称定义.md' },
              { text: '红外遥控器配置', link: '/android/customization/Amlogic方案红外遥控器配置.md' },
              { text: 'DVB Tuner 驱动分析', link: '/android/customization/DVBTuner驱动运作机制分析.md' },
              { text: 'CXD2878 多型号兼容', link: '/android/customization/CXD2878Tuner多型号动态兼容实现方案.md' },
              { text: 'Shell 命令执行框架', link: '/android/customization/Shell命令执行框架实现.md' },
              { text: '休眠和屏保', link: '/android/customization/sleep-screensaver.md' },
              { text: 'WIFI 随机 MAC 地址', link: '/android/customization/WIFI随机MAC地址.md' },
              { text: '签名和权限', link: '/android/customization/安卓的签名和权限.md' },
              { text: 'APK 签名', link: '/android/customization/AOSPapk签名.md' },
              { text: 'Settings 展示所有应用', link: '/android/customization/AOSPSettings展示所有应用.md' },
              { text: '屏幕旋转按钮', link: '/android/customization/Settings添加屏幕旋转按钮.md' },
              { text: '分辨率与 density', link: '/android/customization/分辨率与density.md' },
              { text: '修改默认音量', link: '/android/customization/修改默认音量和最大音量.md' },
              { text: '开机启动日志服务', link: '/android/customization/开机启动日志捕捉服务.md' },
              { text: '去除升级时间戳校验', link: '/android/customization/去除升级时间戳校验.md' },
              { text: 'Provision 解决 HOME 键失效', link: '/android/customization/Provision解决Home键失效.md' },
              { text: 'udc-core 报错修复', link: '/android/customization/udc-core报错.md' },
              { text: 'JDWP 报错修复', link: '/android/customization/jdwp报错.md' },
            ],
          },
        ],
      },
      {
        text: '编程语言',
        items: [
          { text: 'Kotlin 基础', link: '/programming/kotlin/kotlin笔记.md' },
          { text: 'Kotlin 协程', link: '/programming/kotlin/kotlin协程.md' },
          { text: 'Shell 脚本', link: '/programming/shell/shell脚本.md' },
        ],
      },
      {
        text: '跨平台开发',
        items: [
          { text: 'Flutter 笔记', link: '/cross-platform/flutter/Flutter笔记.md' },
          { text: 'Flutter 项目搭建指南', link: '/projects/Flutter项目搭建指南.md' },
        ],
      },
      {
        text: '项目实战',
        items: [
          { text: 'Compose TV', link: '/projects/ComposeTV.md' },
          { text: 'TS 码流解析工具', link: '/projects/TS码流解析工具.md' },
          { text: 'Kotlin 项目开发手册', link: '/projects/Kotlin项目开发手册.md' },
        ],
      },
      {
        text: '读书笔记',
        items: [
          { text: '软考知识点', link: '/reading/tech/软考知识点.md' },
          { text: '思维模型', link: '/reading/non-tech/思维模型.md' },
          { text: '知识树', link: '/reading/non-tech/知识树.md' },
        ],
      },
      {
        text: '工具资源',
        items: [
          {
            text: 'Git',
            items: [
              { text: 'Git 使用导览', link: '/tools/git/git-use-note.md' },
              { text: 'Git 命令清单', link: '/tools/git/git-note.md' },
            ],
          },
          {
            text: 'AI 工具',
            items: [
              { text: 'SuperClaude 使用指南', link: '/tools/ai/SuperClaude使用指南.md' },
              { text: 'CLAUDE.md 配置', link: '/tools/ai/CLAUDE配置.md' },
            ],
          },
        ],
      },
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/SuZhelevel6'
      }
    ],
  }
})
