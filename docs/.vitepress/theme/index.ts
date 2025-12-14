import BlogTheme from '@sugarat/theme'
import Fireworks from './components/Fireworks.vue'
import BlogStats from './components/BlogStats.vue'
import HomeWordCount from './components/HomeWordCount.vue'

// 自定义样式重载
import './style.scss'

import { h } from 'vue'

export default {
    ...BlogTheme,
    Layout: h(BlogTheme.Layout, undefined, {
        'layout-top': () => [h(Fireworks), h(HomeWordCount)]
    }),
    enhanceApp({ app, router, siteData }) {
        app.component('Fireworks', Fireworks)
        app.component('BlogStats', BlogStats)
        app.component('HomeWordCount', HomeWordCount)
    },
}
