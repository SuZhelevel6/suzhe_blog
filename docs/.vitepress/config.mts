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
  // base,
  lang: 'zh-cn',
  title: "SuZhe Blog",
  description: "A Personal Knowledge Base",
  lastUpdated: true,
  // 详见：https://vitepress.dev/zh/reference/site-config#head
  head: [
    // 配置网站的图标（显示在浏览器的 tab 上）
    // ['link', { rel: 'icon', href: `${base}favicon.ico` }], // 修改了 base 这里也需要同步修改
    ['link', { rel: 'icon', href: '/logo.svg' }]
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
      { text: '主页', link: '/' },
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
          { text: '安卓', link: '/study-notes/android/summary' },
          { text: '其他', link: '/study-notes/other/summary' }
        ] 
      },
      { text: '阅读笔记', link: '/reading-notes/summary.md' },
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/xuanyulevel6'
      }
    ],
    
  }
})
