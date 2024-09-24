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
      {
        text: '安卓开发经验',
        items: [
          { text: '嵌入式安卓学习入门', link: '/study-notes/android/experience/嵌入式安卓学习入门.md' },
          { text: 'ADB命令', link: '/study-notes/android/guide/adb-command.md' },
          { text: 'Git使用导览', link: '/study-notes/android/guide/git-use-note.md' },
          { text: 'Git命令清单', link: '/study-notes/android/guide/git-note.md' },
          { text: '编程规范', link: '/study-notes/android/guide/style-guide.md' },
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
      {
        text: '阅读笔记',
        items: [
          // 生活与成长
          {
            items: [
              { text: '20~30岁，我拿十年做什么', link: '/reading-notes/20~30岁，我拿十年做什么' },
              { text: '20岁的生活方式，决定30岁的打开方式', link: '/reading-notes/20岁的生活方式，决定30岁的打开方式' },
              { text: '崔璀优势星球', link: '/reading-notes/崔璀优势星球' },
              { text: '二十几岁如何投资自己', link: '/reading-notes/二十几岁如何投资自己' },
              { text: '书都不会读你还想成功', link: '/reading-notes/书都不会读你还想成功' },
              { text: '每天读点职场心理学', link: '/reading-notes/每天读点职场心理学' },
              { text: '每天演好一个情绪稳定的成年人', link: '/reading-notes/每天演好一个情绪稳定的成年人' },
              { text: '软技能：代码之外的生存指南', link: '/reading-notes/软技能-代码之外的生存指南' },
            ]
          },

          // 思维与认知
          {
            items: [
              { text: '100个思维模型', link: '/reading-notes/100个思维模型' },
              { text: 'NLP思维', link: '/reading-notes/NLP思维' },
              { text: '被讨厌的勇气', link: '/reading-notes/被讨厌的勇气' },
              { text: '认知天性:让学习轻而易举', link: '/reading-notes/认知天性-让学习轻而易举' },
              { text: '刻意练习', link: '/reading-notes/刻意练习' },
              { text: '麦肯锡结构化战略思维', link: '/reading-notes/麦肯锡结构化战略思维' },
              { text: '麦肯锡战略思考力', link: '/reading-notes/麦肯锡战略思考力' },
              { text: '学习敏锐度', link: '/reading-notes/学习敏锐度' },
              { text: '跃迁:成为高手的艺术', link: '/reading-notes/跃迁-成为高手的艺术' },
              { text: '防止上头:人生哲理', link: '/reading-notes/防止上头-人生哲理' },
            ]
          },

          // 经济与商业思维
          {
            items: [
              { text: '半小时漫画经济学', link: '/reading-notes/半小时漫画经济学' },
              { text: '麦肯锡精英高效阅读法', link: '/reading-notes/麦肯锡精英高效阅读法' },
              { text: '麦肯锡图表工作法', link: '/reading-notes/麦肯锡图表工作法' },
            ]
          },

          // 阅读与学习方法
          {
            items: [
              { text: '60分钟高效阅读', link: '/reading-notes/60分钟高效阅读' },
              { text: '再忙也要看的77条心理定律', link: '/reading-notes/再忙也要看的77条心理定律' },
            ]
          },

          // 其他书籍
          {
            items: [
              { text: '每天微躺十分钟：一本神奇的...', link: '/reading-notes/每天微躺十分钟-一本神奇的' },
              { text: '人格涨潮', link: '/reading-notes/人格涨潮' },
              { text: '三分钟一个道理', link: '/reading-notes/三分钟一个道理' },
              { text: '允许自己做自己 by 傻白', link: '/reading-notes/允许自己做自己_by_傻白' },
              { text: '知识树', link: '/reading-notes/知识树' },
            ]
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
