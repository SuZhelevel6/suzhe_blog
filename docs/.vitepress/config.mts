import { defineConfig } from 'vitepress'

// 导入主题的配置
import { blogTheme } from './blog-theme'

// 如果使用 GitHub/Gitee Pages 等公共平台部署
// 通常需要修改 base 路径，通常为“/仓库名/”
// 如果项目名已经为 name.github.io 域名，则不需要修改！
// const base = process.env.GITHUB_ACTIONS === 'true'
//   ? '/vitepress-blog-sugar-template/'
//   : '/'

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
    // 配置网站的图标（显示在浏览器的 tab 上）
    // ['link', { rel: 'icon', href: `${base}favicon.ico` }], // 修改了 base 这里也需要同步修改
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
    // editLink: {
    //   pattern:
    //     'https://github.com/ATQQ/sugar-blog/tree/master/packages/blogpress/:path',
    //   text: '去 GitHub 上编辑内容'
    // },
    // TODO: 增加提效工具板块，常用的软件/AI工具，网站，插件等等。
    nav: [
      { text: '关于本博客', link: '/AboutMe.md' },
      {
        text: '安卓基础入门知识',
        items: [
          { text: '嵌入式安卓学习入门', link: '/study-notes/android/guide/嵌入式安卓学习入门.md' },
          { text: 'ADB命令', link: '/study-notes/android/guide/adb-command.md' },
          { text: 'Git使用导览', link: '/study-notes/android/guide/git-use-note.md' },
          { text: 'Git命令清单', link: '/study-notes/android/guide/git-note.md' },
          { text: '编程规范', link: '/study-notes/android/guide/style-guide.md' },
          { text: '第一行代码Android笔记', link: '/study-notes/android/guide/第一行代码Android笔记.md' },
        ],
      },
      {
        text: '安卓系统层知识',
        items: [
          {
            text: '系统知识',
            items: [
              { text: '(一)Android系统启动流程', link: '/study-notes/android/theory/Android系统启动流程.md' },
              { text: '(二)Android的源码与编译', link: '/study-notes/android/theory/源码与编译.md' },
              { text: '(三)编译系统', link: '/study-notes/android/theory/编译系统.md' },
              { text: '(四)进程间通信(一)', link: '/study-notes/android/theory/进程间通信(一).md' },
              { text: '(五)进程间通信(二)', link: '/study-notes/android/theory/进程间通信(二).md' },
              { text: '(六)Android的进程和线程', link: '/study-notes/android/theory/Android进程和线程.md' },
              { text: '(专)线程通信机制——Handler', link: '/study-notes/android/theory/线程通信机制Handler.md' },
              { text: '(专)线程通信机制——AsyncTask(过时)', link: '/study-notes/android/theory/线程通信机制AsyncTask.md' },
              { text: '(专)Android权限机制', link: '/study-notes/android/theory/Android权限机制.md' },
              { text: '(专)OTA升级机制', link: '/study-notes/android/theory/OTA升级机制.md' },
            ],
          },
          {
            text: '系统功能修改',
            items: [
              { text: 'AmlogicS905x方案合集', link: '/study-notes/android/experience/Amlogics905x方案合集.md' },
              { text: '休眠和屏保', link: '/study-notes/android/function/sleep-screensaver.md' },
              { text: 'WIFI随机MAC地址', link: '/study-notes/android/function/WIFI随机MAC地址.md' },
              { text: '安卓的签名和权限', link: '/study-notes/android/function/安卓的签名和权限.md' },
              { text: '对apk进行签名', link: '/study-notes/android/function/AOSPapk签名.md' },
              { text: 'AOSP Settings 展示所有应用', link: '/study-notes/android/function/AOSPSettings展示所有应用.md' },
              { text: 'Amlogic方案红外遥控器配置', link: '/study-notes/android/function/Amlogic方案红外遥控器配置.md' },
              { text: '添加屏幕旋转按钮', link: '/study-notes/android/function/Settings添加屏幕旋转按钮.md' },
              { text: '修改默认音量和最大音量', link: '/study-notes/android/function/修改默认音量和最大音量.md' },
              { text: '去除升级时间戳校验', link: '/study-notes/android/function/去除升级时间戳校验.md' },
              { text: '开机启动日志捕捉服务', link: '/study-notes/android/function/开机启动日志捕捉服务.md' },
              { text: '缺少开机引导导致HOME键失效', link: '/study-notes/android/function/Provision解决Home键失效.md' },
              { text: '预定义屏幕分辨率与屏幕像素密度', link: '/study-notes/android/function/分辨率与density.md' },
              { text: '解决无限循环的 udc-core 报错问题', link: '/study-notes/android/function/udc-core报错.md' },
              { text: '解决 Android 应用日志中 JDWP 报错问题', link: '/study-notes/android/function/jdwp报错.md' },
            ],
          },
        ],
      },
      {
        text: '安卓应用开发知识',
        items: [
          {
            text: '基础组件',
            items: [
              { text: 'Activity', link: '/study-notes/android/UI/base/Activity.md' },
              { text: 'Service', link: '/study-notes/android/UI/base/Service.md' },
              { text: 'Broadcast', link: '/study-notes/android/UI/base/Broadcast.md' },
              { text: 'ContentProvider', link: '/study-notes/android/UI/base/ContentProvider.md' },
              { text: 'Context', link: '/study-notes/android/UI/base/Context.md' },
              { text: 'Intent', link: '/study-notes/android/UI/base/Intent.md' },
              { text: 'Fragment', link: '/study-notes/android/UI/base/Fragment.md' },
              { text: 'Bundle', link: '/study-notes/android/UI/base/Bundle.md' },
            ],
          },
          {
            text: '重要组件',
            items: [
              { text: 'Lifecycle', link: '/study-notes/jetpack/Lifecycle.md' },
              { text: 'ViewModel', link: '/study-notes/jetpack/ViewModel.md' },
              { text: 'LiveData', link: '/study-notes/jetpack/LiveData.md' },
              { text: 'RecyclerView', link: './study-notes/jetpack/RecyclerView.md' },
              { text: 'Room(未完成)', link: './' },
              { text: 'Data Binding(未完成)', link: './' },
              { text: 'WorkManager(未完成)', link: './' },
              { text: 'ViewPager2(未完成)', link: './' },
              { text: 'RecyclerView(未完成)', link: './' },
              { text: 'ConstraintLayout(未完成)', link: './' },
              { text: 'Navigation(未完成)', link: './' },
              { text: 'Paging(未完成)', link: './' },
            ],
          },
        ],
      },
      {
        text: '其他学习笔记',
        items: [
          { text: 'Java笔记', link: '/study-notes/java/summary' },
          { text: 'Kotlin基础语法', link: '/study-notes/kotlin/kotlin笔记.md' },
          { text: 'Kotlin协程', link: '/study-notes/kotlin/kotlin协程.md' },
          { text: 'Flutter笔记', link: '/study-notes/flutter/Flutter笔记.md' },
          { text: 'shell脚本', link: '/study-notes/other/shell脚本.md' },
          { text: '软考知识点', link: '/study-notes/other/软考知识点.md' },
        ],
      },
      {
        text: '项目汇总',
        items: [
          { text: 'TS码流解析工具', link: '/project-summary/TS码流解析工具.md' },
          { text: 'GLauncher', link: '/project-summary/glauncher.md' },
          { text: 'Compose TV', link: '/project-summary/ComposeTV.md' },
          { text: 'OTA软件', link: '/project-summary/OTA软件.md' },
          { text: 'Launcher3', link: '/project-summary/Launcher3.md' },
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
