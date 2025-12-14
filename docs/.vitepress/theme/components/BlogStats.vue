<script setup lang="ts">
import { data as stats } from '../../../stats.data'

// 格式化字数显示
function formatWordCount(count: number): string {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + ' 万'
  }
  return count.toLocaleString()
}
</script>

<template>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-number">{{ stats.totalArticles }}</div>
      <div class="stat-label">篇文章</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">4</div>
      <div class="stat-label">个分类</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">{{ stats.androidCount }}</div>
      <div class="stat-label">Android 相关</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">{{ formatWordCount(stats.totalWords) }}</div>
      <div class="stat-label">总字数</div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  padding: 20px;
  text-align: center;
  border-radius: 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #ff6b9d, #c44eff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin-top: 4px;
}
</style>
