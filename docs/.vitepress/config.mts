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
    nav: [
      { text: '关于我', link: '/AboutMe.md' },
      {
        text: 'Android面经',
        items: [
          { text: '基础问题', link: '/interview-notes/basenotes.md' },
          { text: '安卓问题', link: '/interview-notes/Android-notes.md' },
          { text: '算法题', link: '/' },
        ]
      },
      {
        text: '项目汇总',
        items: [
          { text: 'Launcher3', link: '/project-summary/Launcher3.md' },
          { text: 'WanAndroid客户端', link: '/project-summary/WanAndroid客户端.md' },
          { text: 'Compose TV', link: '/project-summary/Compose-TV.md' },
          { text: 'ExoPlayer', link: '/project-summary/ExoPlayer.md' },
          { text: 'OTA软件', link: '/project-summary/OTA软件.md' },
          { text: 'glauncher', link: '/project-summary/glauncher.md' },
          { text: 'AOSP定制', link: '/project-summary/AOSP定制.md' },
          { text: '产测软件', link: '/project-summary/产测软件.md' }
        ]
      },
      { 
        text: '学习笔记', 
        items: [
          { text: 'Java', link: '/study-notes/java/summary' },
          { text: 'Kotlin', link: '/study-notes/kotlin/summary' },
          { text: 'Flutter', link: '/study-notes/flutter/summary' },
          { text: '其他', link: '/study-notes/other/summary' }
        ] 
      },
      { text: '阅读笔记', link: '/reading-notes/summary.md' },
      {
        text: '安卓开发经验',
        items: [
          { text: '嵌入式安卓学习入门', link: '/study-notes/android/experience/嵌入式安卓学习入门.md' },
          { text: 'ADB命令', link: '/study-notes/android/guide/adb-command.md' },
        ]
      },
      {
        text: '源码阅读系列',
        items: [
          { text: 'Android系统启动流程', link: '/study-notes/android/theory/Android系统启动流程.md' },
          { text: 'OTA升级机制', link: '/study-notes/android/theory/OTA升级机制.md' },
        ]
      },
      {
        text: '功能修改系列',
        items: [
          { text: '休眠和屏保', link: '/study-notes/android/function/sleep-screensaver.md' },
          { text: 'WIFI随机MAC地址', link: '/study-notes/android/function/WIFI随机MAC地址.md' },
          { text: '安卓的签名和权限', link: '/study-notes/android/function/安卓的签名和权限.md' },
          { text: '对apk进行签名', link: '/study-notes/android/function/AOSPapk签名.md' },
          { text: 'AOSP Settings 展示所有应用', link: '/study-notes/android/function/AOSPSettings展示所有应用.md' },
        ]
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
