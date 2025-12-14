---
sidebar: false
title: Android 应用开发
date: 2024-12-14
tags:
 - Android
---

<style>
/* 文章元信息居中 */
.VPDoc .content-container .content .doc-box,
.VPDoc .content-container .content .doc-box > * {
  text-align: center;
  justify-content: center;
}
</style>

### 📚 入门基础

1. [嵌入式 Android 学习入门](./basics/嵌入式安卓学习入门.html) - 嵌入式 Android 开发环境搭建与入门指南
2. [ADB 命令手册](./basics/adb-command.html) - Android 调试桥常用命令速查
3. [编程规范](./basics/style-guide.html) - Android 项目代码规范与最佳实践
4. [《第一行代码》笔记](./basics/第一行代码Android笔记.html) - 经典入门书籍的学习笔记整理

### 🧩 四大组件

1. [Activity](./components/Activity.html) - 应用界面的基本单元，管理用户交互
2. [Service](./components/Service.html) - 后台任务处理，无界面长时间运行
3. [Broadcast](./components/Broadcast.html) - 系统和应用间的消息传递机制
4. [ContentProvider](./components/ContentProvider.html) - 跨应用数据共享的标准接口
5. [Fragment](./components/Fragment.html) - 可复用的 UI 模块，灵活组合界面
6. [Intent](./components/Intent.html) - 组件间通信的信使，启动与数据传递
7. [Bundle](./components/Bundle.html) - 键值对数据容器，用于组件间传参
8. [Context](./components/Context.html) - 应用环境上下文，访问资源和服务

### 🚀 Jetpack 架构组件

1. [Lifecycle](./components/Lifecycle.html) - 感知组件生命周期，避免内存泄漏
2. [ViewModel](./components/ViewModel.html) - 管理界面数据，配置变更时保持状态
3. [LiveData](./components/LiveData.html) - 可观察的数据持有者，生命周期感知
4. [DataBinding](./components/DataBinding.html) - 声明式绑定 UI 与数据，减少模板代码
5. [RecyclerView](./components/RecyclerView.html) - 高性能列表展示，支持复杂布局
6. [ViewPager](./components/ViewPager.html) - 页面滑动切换，实现引导页和 Tab 页
