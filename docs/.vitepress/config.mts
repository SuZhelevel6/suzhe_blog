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
      { text: '关于我', link: '/AboutMe.md' },
      {
        text: 'Android系统',
        items: [
          {
            // 一些规范
            items: [
              { text: '安卓基础入门知识导览', link: '/study-notes/android/guide/index.md' },
            ]
          },
          {
            items: [
              { text: '安卓应用层知识导览', link: '/study-notes/android/UI/index.md' }
            ]
          },
          {
            items: [
              { text: '安卓系统层知识导览', link: '/study-notes/android/theory/index.md' }
            ]
          },
          {
            // 系统层功能修改
            items: [
              { text: '安卓系统层修改一览', link: '/study-notes/android/function/index.md' }
            ]
          },
          {
            // 面经
            items:[
              { text: '基础问题', link: '/interview-notes/basenotes.md' },
              { text: '安卓问题', link: '/interview-notes/Android-notes.md' },
            ]
          },

        ],
      },
      {
        text: '项目汇总',
        items: [
          { text: 'TS码流解析工具', link: '/project-summary/TS码流解析工具.md' },
          { text: 'glauncher', link: '/project-summary/glauncher.md' },
          { text: 'Compose TV', link: '/project-summary/ComposeTV.md' },
          { text: 'OTA软件', link: '/project-summary/OTA软件.md' },
          { text: 'Launcher3', link: '/project-summary/Launcher3.md' },
        ]
      },
      { 
        text: '学习笔记', 
        items: [
          { text: 'Java笔记', link: '/study-notes/java/summary' },
          { text: 'Kotlin基础语法', link: '/study-notes/kotlin/kotlin笔记.md' },
          { text: 'Kotlin协程', link: '/study-notes/kotlin/kotlin协程.md' },
          { text: 'Flutter笔记', link: '/study-notes/flutter/Flutter笔记.md' },
          { text: 'shell脚本', link: '/study-notes/other/shell脚本.md' },
          { text: '软考知识点', link: '/study-notes/other/软考知识点.md' },
          { text: 'Jetpack', link: '/study-notes/jetpack/index.md'}
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
