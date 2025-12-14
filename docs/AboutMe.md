---
sidebar: false
title: 关于本站
date: 2024-09-22
tags:
 - 其它
---

<style>
/* 文章元信息居中 */
.VPDoc .content-container .content .doc-box,
.VPDoc .content-container .content .doc-box > * {
  text-align: center;
  justify-content: center;
}

.about-container {
  max-width: 800px;
  margin: 0 auto;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 32px;
  background: linear-gradient(135deg, rgba(255, 107, 157, 0.1), rgba(196, 78, 255, 0.1), rgba(33, 150, 243, 0.1));
  border-radius: 20px;
  margin-bottom: 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid transparent;
  background: linear-gradient(135deg, #ff6b9d, #c44eff, #2196f3) border-box;
  object-fit: cover;
}

.profile-info h1 {
  margin: 0 0 8px 0;
  font-size: 1.8rem;
  background: linear-gradient(135deg, #ff6b9d, #c44eff, #2196f3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.profile-info .bio {
  color: var(--vp-c-text-2);
  margin: 0 0 16px 0;
  line-height: 1.6;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tech-tag {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  background: rgba(102, 126, 234, 0.15);
  color: var(--vp-c-brand-1);
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.4rem;
  margin: 40px 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid transparent;
  border-image: linear-gradient(90deg, #ff6b9d, #c44eff, #2196f3) 1;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.category-card {
  padding: 20px;
  border-radius: 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  text-decoration: none;
  color: inherit;
}

.category-card:hover {
  transform: translateY(-4px);
  border-color: rgba(102, 126, 234, 0.5);
  background: rgba(102, 126, 234, 0.08);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
}

.category-card h3 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
}

.category-card p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.contact-section {
  padding: 24px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0;
}

/* 博客统计样式 */
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

/* 兴趣爱好样式 */
.hobby-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.hobby-item {
  padding: 16px;
  text-align: center;
  border-radius: 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  transition: all 0.3s ease;
}

.hobby-item:hover {
  transform: translateY(-2px);
  border-color: rgba(102, 126, 234, 0.5);
}

.hobby-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.hobby-name {
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
}

.ending-quote {
  margin-top: 48px;
  padding: 24px;
  text-align: center;
  font-style: italic;
  color: var(--vp-c-text-2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

@media (max-width: 640px) {
  .profile-card {
    flex-direction: column;
    text-align: center;
  }

  .tech-tags {
    justify-content: center;
  }
}
</style>

<div class="about-container">

<div class="profile-card">
  <img class="profile-avatar" src="/touxiang.jpg" alt="苏柘" />
  <div class="profile-info">
    <h1>苏柘</h1>
    <p class="bio">01年生人，23年毕业，Android 开发工程师。专注于 Android 系统开发与应用开发，在代码的世界里探索、创造、成长。</p>
    <div class="tech-tags">
      <span class="tech-tag">Android</span>
      <span class="tech-tag">Kotlin</span>
      <span class="tech-tag">Java</span>
      <span class="tech-tag">Flutter</span>
      <span class="tech-tag">Jetpack Compose</span>
    </div>
  </div>
</div>

<h2 class="section-title">📚 关于本站</h2>

这是我的个人技术博客，主要记录 Android 开发过程中的学习笔记、技术探索和项目实践。希望这些内容能帮助到同样在技术道路上前行的你。

<h2 class="section-title">📊 博客统计</h2>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-number">65</div>
    <div class="stat-label">篇文章</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">4</div>
    <div class="stat-label">个分类</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">50+</div>
    <div class="stat-label">Android 相关</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">2024</div>
    <div class="stat-label">建站年份</div>
  </div>
</div>

<h2 class="section-title">🗂️ 内容导航</h2>

<div class="category-grid">
  <a class="category-card" href="./android-app/">
    <h3>📱 Android 应用</h3>
    <p>入门基础、四大组件、Jetpack 架构组件</p>
  </a>

  <a class="category-card" href="./android-system/">
    <h3>⚙️ Android 系统</h3>
    <p>系统原理、系统定制、驱动开发</p>
  </a>

  <a class="category-card" href="./tech-notes/">
    <h3>📝 技术杂谈</h3>
    <p>编程语言、跨平台开发、项目实战、读书笔记</p>
  </a>

  <a class="category-card" href="./resources/">
    <h3>🛠️ 资源收藏</h3>
    <p>Git 使用技巧、AI 工具配置</p>
  </a>
</div>

<h2 class="section-title">📮 联系我</h2>

<div class="contact-section">
  <div class="contact-item">
    <span>📧</span>
    <span>邮箱：2212294193@qq.com</span>
  </div>
</div>

<h2 class="section-title">🎯 兴趣爱好</h2>

<div class="hobby-grid">
  <div class="hobby-item">
    <div class="hobby-icon">🎮</div>
    <div class="hobby-name">游戏</div>
  </div>
  <div class="hobby-item">
    <div class="hobby-icon">📚</div>
    <div class="hobby-name">阅读</div>
  </div>
  <div class="hobby-item">
    <div class="hobby-icon">🎬</div>
    <div class="hobby-name">电影</div>
  </div>
  <div class="hobby-item">
    <div class="hobby-icon">🎵</div>
    <div class="hobby-name">音乐</div>
  </div>
  <div class="hobby-item">
    <div class="hobby-icon">✈️</div>
    <div class="hobby-name">旅行</div>
  </div>
  <div class="hobby-item">
    <div class="hobby-icon">🤖</div>
    <div class="hobby-name">折腾新技术</div>
  </div>
</div>

<div class="ending-quote">
  "当 AI 浪潮奔涌而来，唯有拥抱变革者，方能驾驭时代的风帆，驶向星辰大海。"
</div>

</div>
