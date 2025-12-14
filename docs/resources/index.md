---
sidebar: false
title: 资源收藏
date: 2024-12-14
tags:
 - 工具
 - 资源
---

<style>
.index-container {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  padding: 40px 0;
  margin-bottom: 32px;
  background: linear-gradient(135deg, rgba(233, 30, 99, 0.1), rgba(156, 39, 176, 0.1));
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.page-header h1 {
  margin: 0 0 12px 0;
  font-size: 2rem;
  background: linear-gradient(135deg, #E91E63, #9C27B0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-header p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 1.1rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.4rem;
  margin: 40px 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid transparent;
  border-image: linear-gradient(90deg, #E91E63, #9C27B0) 1;
}

.article-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.article-card {
  padding: 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  text-decoration: none;
  color: inherit;
  display: block;
}

.article-card:hover {
  transform: translateY(-4px);
  border-color: rgba(233, 30, 99, 0.5);
  background: rgba(233, 30, 99, 0.1);
}

.article-card h3 {
  margin: 0 0 8px 0;
  font-size: 1.05rem;
  color: var(--vp-c-text-1);
}

.article-card p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  margin-right: 6px;
  margin-bottom: 8px;
}

.tag-git { background: rgba(233, 30, 99, 0.2); color: #E91E63; }
.tag-ai { background: rgba(156, 39, 176, 0.2); color: #9C27B0; }
</style>

<div class="index-container">

<div class="page-header">
  <h1>资源收藏</h1>
  <p>开发工具、效率提升与实用资源</p>
</div>

<h2 class="section-title">Git 版本控制</h2>

<div class="article-grid">
  <a class="article-card" href="./git/git-use-note.html">
    <span class="tag tag-git">Git</span>
    <h3>Git 使用导览</h3>
    <p>Git 工作流程与日常使用技巧</p>
  </a>

  <a class="article-card" href="./git/git-note.html">
    <span class="tag tag-git">Git</span>
    <h3>Git 命令清单</h3>
    <p>Git 常用命令速查手册</p>
  </a>
</div>

<h2 class="section-title">AI 工具</h2>

<div class="article-grid">
  <a class="article-card" href="./ai/SuperClaude使用指南.html">
    <span class="tag tag-ai">AI</span>
    <h3>SuperClaude 使用指南</h3>
    <p>SuperClaude 增强插件使用方法</p>
  </a>

  <a class="article-card" href="./ai/CLAUDE配置.html">
    <span class="tag tag-ai">AI</span>
    <h3>CLAUDE.md 配置</h3>
    <p>Claude Code 项目配置与最佳实践</p>
  </a>
</div>

</div>
