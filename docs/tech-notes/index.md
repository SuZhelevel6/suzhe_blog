---
sidebar: false
title: 技术杂谈
date: 2024-12-14
tags:
 - 技术
 - 笔记
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
  background: linear-gradient(135deg, rgba(103, 58, 183, 0.1), rgba(0, 188, 212, 0.1));
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.page-header h1 {
  margin: 0 0 12px 0;
  font-size: 2rem;
  background: linear-gradient(135deg, #673AB7, #00BCD4);
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
  border-image: linear-gradient(90deg, #673AB7, #00BCD4) 1;
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
  border-color: rgba(103, 58, 183, 0.5);
  background: rgba(103, 58, 183, 0.1);
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

.tag-kotlin { background: rgba(103, 58, 183, 0.2); color: #673AB7; }
.tag-flutter { background: rgba(0, 188, 212, 0.2); color: #00BCD4; }
.tag-project { background: rgba(76, 175, 80, 0.2); color: #4CAF50; }
.tag-reading { background: rgba(255, 152, 0, 0.2); color: #FF9800; }
</style>

<div class="index-container">

<div class="page-header">
  <h1>技术杂谈</h1>
  <p>编程语言、跨平台开发、项目实战与读书笔记</p>
</div>

<h2 class="section-title">编程语言</h2>

<div class="article-grid">
  <a class="article-card" href="./programming/kotlin/kotlin笔记.html">
    <span class="tag tag-kotlin">Kotlin</span>
    <h3>Kotlin 基础</h3>
    <p>Kotlin 语法特性、空安全与扩展函数</p>
  </a>

  <a class="article-card" href="./programming/kotlin/kotlin协程.html">
    <span class="tag tag-kotlin">Kotlin</span>
    <h3>Kotlin 协程</h3>
    <p>协程原理、作用域与异步编程实践</p>
  </a>

  <a class="article-card" href="./programming/shell/shell脚本.html">
    <span class="tag tag-kotlin">Shell</span>
    <h3>Shell 脚本</h3>
    <p>Shell 脚本编写与自动化任务</p>
  </a>
</div>

<h2 class="section-title">跨平台开发</h2>

<div class="article-grid">
  <a class="article-card" href="./cross-platform/flutter/Flutter笔记.html">
    <span class="tag tag-flutter">Flutter</span>
    <h3>Flutter 笔记</h3>
    <p>Flutter 开发入门与核心概念</p>
  </a>

  <a class="article-card" href="./projects/Flutter项目搭建指南.html">
    <span class="tag tag-flutter">Flutter</span>
    <h3>Flutter 项目搭建指南</h3>
    <p>Flutter 项目架构与最佳实践</p>
  </a>
</div>

<h2 class="section-title">项目实战</h2>

<div class="article-grid">
  <a class="article-card" href="./projects/ComposeTV.html">
    <span class="tag tag-project">Compose</span>
    <h3>Compose TV</h3>
    <p>Jetpack Compose for TV 开发实践</p>
  </a>

  <a class="article-card" href="./projects/TS码流解析工具.html">
    <span class="tag tag-project">工具</span>
    <h3>TS 码流解析工具</h3>
    <p>Transport Stream 码流分析工具开发</p>
  </a>

  <a class="article-card" href="./projects/Kotlin项目开发手册.html">
    <span class="tag tag-project">规范</span>
    <h3>Kotlin 项目开发手册</h3>
    <p>Kotlin 项目开发规范与模板</p>
  </a>
</div>

<h2 class="section-title">读书笔记</h2>

<div class="article-grid">
  <a class="article-card" href="./reading/tech/软考知识点.html">
    <span class="tag tag-reading">考试</span>
    <h3>软考知识点</h3>
    <p>软件设计师考试知识点整理</p>
  </a>

  <a class="article-card" href="./reading/non-tech/思维模型.html">
    <span class="tag tag-reading">思维</span>
    <h3>思维模型</h3>
    <p>常用思维模型与决策框架</p>
  </a>

  <a class="article-card" href="./reading/non-tech/知识树.html">
    <span class="tag tag-reading">知识</span>
    <h3>知识树</h3>
    <p>知识体系构建与学习方法</p>
  </a>
</div>

</div>
