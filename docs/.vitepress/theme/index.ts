import BlogTheme from '@sugarat/theme'
import Fireworks from './components/Fireworks.vue'

// 自定义样式重载
import './style.scss'

// 自定义主题色
// import './user-theme.css'
import { h } from 'vue'

export default {
    ...BlogTheme,
    Layout: h(BlogTheme.Layout, undefined, {
        'layout-top': () => h(Fireworks) // 在 layout-top 插槽中渲染 Fireworks 组件
    }),
    enhanceApp({ app, router, siteData }) {
        app.component('Fireworks', Fireworks) // 注册 Fireworks 组件
    },
}
