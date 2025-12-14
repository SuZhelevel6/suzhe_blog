<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'
import { data as stats } from '../../../stats.data'

const route = useRoute()

// 格式化字数
function formatWordCount(count: number): string {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + ' 万'
  }
  return count.toLocaleString()
}

function modifyStats() {
  // 只在首页显示
  const isHomePage = route.path === '/' ||
                     route.path === '/index.html' ||
                     route.path === '/suzhe_blog/' ||
                     route.path === '/suzhe_blog/index.html'
  if (!isHomePage) {
    return
  }

  const tryModify = () => {
    // 修改原有的统计数据（把"周更新"改成"总字数"）
    const overviewItems = document.querySelectorAll('.overview-data .overview-item')
    if (overviewItems.length >= 3) {
      const thirdItem = overviewItems[2]
      const countEl = thirdItem.querySelector('.count')
      const labelEl = thirdItem.querySelector('.label')
      if (countEl && labelEl && labelEl.textContent === '周更新') {
        countEl.textContent = formatWordCount(stats.totalWords)
        labelEl.textContent = '总字数'
        return true
      }
    }
    return false
  }

  if (!tryModify()) {
    setTimeout(() => {
      if (!tryModify()) {
        setTimeout(tryModify, 500)
      }
    }, 100)
  }
}

// 监听路由变化
watch(() => route.path, () => {
  setTimeout(modifyStats, 100)
})

onMounted(() => {
  modifyStats()
})
</script>

<template>
  <!-- 无渲染组件 -->
</template>
