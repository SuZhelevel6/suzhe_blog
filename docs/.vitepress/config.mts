import { defineConfig } from 'vitepress'

// 导入主题的配置
import { blogTheme } from './blog-theme'
// 导入导航栏配置
import { nav } from './configs/nav'

// 站点基础信息
const siteUrl = 'https://suzhelevel6.github.io/suzhe_blog'
const siteTitle = 'SuZhe Blog - 苏柘的技术知识库'
const siteDescription = 'Android 开发、Kotlin、Flutter 等技术笔记与项目总结'
const siteKeywords = 'Android开发,Kotlin,Flutter,系统定制,技术博客,嵌入式Android'

// Vitepress 默认配置
// 详见文档：https://vitepress.dev/reference/site-config
export default defineConfig({
  // 继承博客主题(@sugarat/theme)
  extends: blogTheme,
  base: '/suzhe_blog/',
  lang: 'zh-cn',
  title: "SuZhe Blog",
  description: siteDescription,
  lastUpdated: true,

  // Sitemap 配置
  sitemap: {
    hostname: siteUrl
  },

  // 详见：https://vitepress.dev/zh/reference/site-config#head
  head: [
    // 基础配置
    ['link', { rel: 'icon', href: '/suzhe_blog/logo.svg' }],
    ['meta', { name: 'author', content: '苏柘' }],
    ['meta', { name: 'keywords', content: siteKeywords }],

    // Open Graph (社交媒体分享)
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: siteTitle }],
    ['meta', { property: 'og:description', content: siteDescription }],
    ['meta', { property: 'og:url', content: siteUrl }],
    ['meta', { property: 'og:image', content: `${siteUrl}/logo.svg` }],
    ['meta', { property: 'og:locale', content: 'zh_CN' }],

    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: siteTitle }],
    ['meta', { name: 'twitter:description', content: siteDescription }],

    // 移动端优化
    ['meta', { name: 'theme-color', content: '#4dc2ff' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }],
  ],

  // 动态生成 canonical URL
  transformHead: ({ pageData }) => {
    const canonicalUrl = `${siteUrl}/${pageData.relativePath}`
      .replace(/index\.md$/, '')
      .replace(/\.md$/, '.html')
    return [
      ['link', { rel: 'canonical', href: canonicalUrl }]
    ]
  },
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

    // 导航栏配置（从 ./configs/nav.ts 导入）
    nav,
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/SuZhelevel6'
      }
    ],
  }
})
