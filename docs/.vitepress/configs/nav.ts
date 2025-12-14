import type { DefaultTheme } from 'vitepress'

/**
 * 导航栏配置
 * 简洁的顶部导航，每个分类直接链接到索引页
 */
export const nav: DefaultTheme.NavItem[] = [
  { text: '关于本博客', link: '/AboutMe.md' },
  { text: 'Android 应用', link: '/android-app/' },
  { text: 'Android 系统', link: '/android-system/' },
  { text: '技术杂谈', link: '/tech-notes/' },
  { text: '资源收藏', link: '/resources/' },
]
