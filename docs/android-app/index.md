---
sidebar: false
title: Android 应用开发
date: 2024-12-14
tags:
 - Android
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
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(33, 150, 243, 0.1));
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.page-header h1 {
  margin: 0 0 12px 0;
  font-size: 2rem;
  background: linear-gradient(135deg, #4CAF50, #2196F3);
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
  border-image: linear-gradient(90deg, #4CAF50, #2196F3) 1;
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
  border-color: rgba(76, 175, 80, 0.5);
  background: rgba(76, 175, 80, 0.1);
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

.tag-basic { background: rgba(76, 175, 80, 0.2); color: #4CAF50; }
.tag-component { background: rgba(33, 150, 243, 0.2); color: #2196F3; }
.tag-jetpack { background: rgba(156, 39, 176, 0.2); color: #9C27B0; }
</style>

<div class="index-container">

<div class="page-header">
  <h1>Android 应用开发</h1>
  <p>从入门基础到组件开发，构建高质量 Android 应用</p>
</div>

<h2 class="section-title">入门基础</h2>

<div class="article-grid">
  <a class="article-card" href="./basics/嵌入式安卓学习入门.html">
    <span class="tag tag-basic">入门</span>
    <h3>嵌入式 Android 学习入门</h3>
    <p>Android 系统开发的入门指南，涵盖开发环境搭建和基础概念</p>
  </a>

  <a class="article-card" href="./basics/adb-command.html">
    <span class="tag tag-basic">工具</span>
    <h3>ADB 命令手册</h3>
    <p>Android Debug Bridge 常用命令速查与实战技巧</p>
  </a>

  <a class="article-card" href="./basics/style-guide.html">
    <span class="tag tag-basic">规范</span>
    <h3>编程规范</h3>
    <p>Android 开发编码规范与最佳实践</p>
  </a>

  <a class="article-card" href="./basics/第一行代码Android笔记.html">
    <span class="tag tag-basic">笔记</span>
    <h3>《第一行代码》笔记</h3>
    <p>经典入门书籍的学习笔记与要点总结</p>
  </a>
</div>

<h2 class="section-title">四大组件</h2>

<div class="article-grid">
  <a class="article-card" href="./components/Activity.html">
    <span class="tag tag-component">组件</span>
    <h3>Activity</h3>
    <p>Activity 生命周期、启动模式与任务栈详解</p>
  </a>

  <a class="article-card" href="./components/Service.html">
    <span class="tag tag-component">组件</span>
    <h3>Service</h3>
    <p>后台服务的创建、绑定与生命周期管理</p>
  </a>

  <a class="article-card" href="./components/Broadcast.html">
    <span class="tag tag-component">组件</span>
    <h3>Broadcast</h3>
    <p>广播接收器的注册方式与系统广播处理</p>
  </a>

  <a class="article-card" href="./components/ContentProvider.html">
    <span class="tag tag-component">组件</span>
    <h3>ContentProvider</h3>
    <p>跨进程数据共享与内容提供者实现</p>
  </a>

  <a class="article-card" href="./components/Fragment.html">
    <span class="tag tag-component">组件</span>
    <h3>Fragment</h3>
    <p>Fragment 生命周期、通信与 Navigation 组件</p>
  </a>

  <a class="article-card" href="./components/Intent.html">
    <span class="tag tag-component">组件</span>
    <h3>Intent</h3>
    <p>显式/隐式 Intent 与组件间通信</p>
  </a>

  <a class="article-card" href="./components/Bundle.html">
    <span class="tag tag-component">组件</span>
    <h3>Bundle</h3>
    <p>数据传递与状态保存机制</p>
  </a>

  <a class="article-card" href="./components/Context.html">
    <span class="tag tag-component">核心</span>
    <h3>Context</h3>
    <p>上下文对象的类型与使用场景</p>
  </a>
</div>

<h2 class="section-title">Jetpack 架构组件</h2>

<div class="article-grid">
  <a class="article-card" href="./components/Lifecycle.html">
    <span class="tag tag-jetpack">Jetpack</span>
    <h3>Lifecycle</h3>
    <p>生命周期感知组件的原理与使用</p>
  </a>

  <a class="article-card" href="./components/ViewModel.html">
    <span class="tag tag-jetpack">Jetpack</span>
    <h3>ViewModel</h3>
    <p>UI 数据管理与配置变更处理</p>
  </a>

  <a class="article-card" href="./components/LiveData.html">
    <span class="tag tag-jetpack">Jetpack</span>
    <h3>LiveData</h3>
    <p>可观察的数据持有者与生命周期绑定</p>
  </a>

  <a class="article-card" href="./components/DataBinding.html">
    <span class="tag tag-jetpack">Jetpack</span>
    <h3>DataBinding</h3>
    <p>声明式布局与数据绑定表达式</p>
  </a>

  <a class="article-card" href="./components/RecyclerView.html">
    <span class="tag tag-jetpack">UI</span>
    <h3>RecyclerView</h3>
    <p>高效列表展示与 Adapter 模式</p>
  </a>

  <a class="article-card" href="./components/ViewPager.html">
    <span class="tag tag-jetpack">UI</span>
    <h3>ViewPager</h3>
    <p>页面滑动切换与 Fragment 集成</p>
  </a>
</div>

</div>
