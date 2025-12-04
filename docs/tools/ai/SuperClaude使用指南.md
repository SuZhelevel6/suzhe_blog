# SuperClaude 使用指南

> 将 Claude Code 转换为结构化开发平台的元编程配置框架

---

## 🚀 快速参考

### 📚 完整文档链接

| 类型 | 说明 | 文档链接 |
|------|------|---------|
| 🎯 **斜杠命令** | 完整的 /sc 命令列表 | [commands.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/docs/user-guide/commands.md) |
| 🤖 **智能体指南** | 16个专业智能体详解 | [agents.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/docs/user-guide/agents.md) |
| 🎨 **行为模式** | 7种自适应模式说明 | [modes.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/docs/user-guide/modes.md) |
| 🚩 **标志指南** | 控制行为参数详解 | [flags.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/docs/user-guide/flags.md) |
| 🔧 **MCP服务器** | 8个服务器集成配置 | [mcp-servers.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/docs/user-guide/mcp-servers.md) |
| 💼 **会话管理** | 保存和恢复状态 | [session-management.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/docs/user-guide/session-management.md) |

### ⚡ 常用命令速查

```bash
# 安装与验证
pipx install superclaude         # 安装
superclaude install              # 配置到 Claude Code
superclaude doctor               # 验证安装

# 项目规划
/sc:brainstorm 想法描述         # 头脑风暴
/sc:design 架构需求             # 架构设计
/sc:workflow PRD文档路径         # 生成工作流

# 开发实施
/sc:implement 功能描述           # 功能实现
/sc:refactor 目标代码           # 代码重构
/sc:troubleshoot 问题描述       # 问题诊断

# 测试与质量
/sc:test 测试目标               # 执行测试
/sc:analyze 分析目标            # 代码分析
/sc:review 审查目标             # 代码审查

# 研究与文档
/sc:research --depth=deep 主题   # 深度研究
/sc:document 文档目标            # 生成文档
/sc:explain 概念或代码          # 清晰解释

# 构建与部署
/sc:build 构建目标              # 构建项目
/sc:git 操作说明                # Git 操作

# 会话管理
/sc:save "会话描述"             # 保存会话
/sc:load                        # 加载会话

# 工具与推荐
/sc:recommend 需求描述          # 智能推荐命令
/sc:help                        # 帮助信息
```

### 🎯 核心智能体速查

```bash
/sc:pm                          # 项目经理 - 总协调
/sc:architect                   # 架构规划师 - 技术方案
/sc:coder                       # 代码实现者 - 编写代码
/sc:tester                      # 测试工程师 - 质量保证
/sc:reviewer                    # 代码审查员 - 代码审查
/sc:debugger                    # 调试专家 - 问题诊断
```

### 💡 使用技巧

```bash
# 1. 智能推荐 - 不确定用什么命令时
/sc:recommend 我想优化数据库查询性能

# 2. 组合使用 - 完整开发流程
/sc:brainstorm → /sc:design → /sc:implement → /sc:test → /sc:review

# 3. 深度研究 - 选择合适深度
--depth=quick        # 快速(2分钟)
--depth=standard     # 标准(5分钟,默认)
--depth=deep         # 深入(8分钟)
--depth=exhaustive   # 详尽(10分钟)

# 4. 会话持久化 - 长期项目
/sc:save "项目阶段说明"    # 定期保存
/sc:load                   # 恢复上次状态
```

### 🔥 典型场景

```bash
# 场景1: 新功能开发
/sc:brainstorm 用户认证功能设计思路
/sc:design 认证系统架构
/sc:implement JWT认证功能
/sc:test 认证功能测试
/sc:security 认证代码安全审计

# 场景2: Bug修复
/sc:troubleshoot 登录失败问题
/sc:debugger 定位根本原因
# 修复后
/sc:test 回归测试
/sc:git "fix: 修复登录验证逻辑"

# 场景3: 技术调研
/sc:research --depth=deep Kubernetes生产最佳实践
/sc:document 整理调研报告

# 场景4: 代码优化
/sc:analyze 分析性能瓶颈
/sc:refactor 优化数据库查询
/sc:review 审查重构代码
```

---

## 📖 目录

- [项目简介](#项目简介)
- [核心统计](#核心统计)
- [安装方法](#安装方法)
- [核心功能特性](#核心功能特性)
  - [16 个专业智能体](#16-个专业智能体)
  - [30 个斜杠命令](#30-个斜杠命令)
  - [7 种行为模式](#7-种行为模式)
  - [深度研究能力](#深度研究能力)
  - [MCP 服务器集成](#mcp-服务器集成)
- [快速上手](#快速上手)
- [工作模式详解](#工作模式详解)
- [斜杠命令参考](#斜杠命令参考)
- [智能体介绍](#智能体介绍)
- [深度研究功能](#深度研究功能)
- [MCP 集成详解](#mcp-集成详解)
- [必读文档](#必读文档)
- [最佳实践](#最佳实践)
- [性能对比](#性能对比)
- [支持项目](#支持项目)
- [参考资源](#参考资源)

---

## 项目简介

**SuperClaude** 是一个创新的**元编程配置框架**，它通过行为指令注入和组件编排，将 Claude Code 转换为一个结构化的开发平台。SuperClaude 提供系统化的工作流自动化，配备强大的工具和智能代理，大幅提升开发效率。

### 版本信息

- **当前稳定版**：v4.1.9
- **开发中版本**：v5.0（引入 TypeScript 插件系统）

### 适用场景

- **软件开发**：完整的开发生命周期支持，从规划到部署
- **深度研究**：自主网络研究，多跳推理，质量评分
- **项目管理**：系统化任务组织和里程碑跟踪
- **代码审查**：安全漏洞扫描、性能分析
- **文档生成**：API 文档、技术文档自动化

---

## 核心统计

| 指标 | 数量 | 说明 |
|------|------|------|
| **斜杠命令** | 30 | 覆盖完整开发生命周期 |
| **专业智能体** | 16 | 具有领域专业知识 |
| **行为模式** | 7 | 自适应工作流程 |
| **MCP 服务器** | 8 | 集成第三方服务 |

---

## 安装方法

### 方式一：pipx 安装（推荐）

使用 Python 包管理器安装是最简单快捷的方式：

```bash
# 1. 从 PyPI 安装 SuperClaude
pipx install superclaude

# 2. 安装配置到 Claude Code
superclaude install

# 3. 验证安装是否成功
superclaude doctor
```

**优势**：
- ✅ 自动依赖管理
- ✅ 简单升级流程
- ✅ 隔离的 Python 环境

### 方式二：从 Git 仓库安装

直接从源码安装，适合开发者或需要最新功能的用户：

```bash
# 1. 克隆仓库
git clone https://github.com/SuperClaude-Org/SuperClaude_Framework.git

# 2. 进入项目目录
cd SuperClaude_Framework

# 3. 运行安装脚本
./install.sh
```

**优势**：
- ✅ 获取最新开发版本
- ✅ 可自定义配置
- ✅ 便于贡献代码

---

## 核心功能特性

### 🤖 16 个专业智能体

SuperClaude 配备了 16 个专业智能体，每个都具有特定领域的专业知识：

#### 核心智能体

1. **PM Agent（产品经理）**
   - 系统化文档管理
   - 确保项目持续学习
   - 需求分析与规划

2. **深度研究智能体**
   - 自主网络研究
   - 多跳推理（最多 5 次迭代）
   - 来源可信度评估

3. **安全工程师**
   - 真实漏洞扫描
   - 代码安全审计
   - 威胁建模

4. **前端架构师**
   - UI 模式识别
   - 组件设计建议
   - 性能优化方案

#### 其他专业智能体

- **后端架构师**：API 设计、数据库优化
- **测试工程师**：测试用例生成、自动化测试
- **DevOps 专家**：CI/CD 流水线、部署策略
- **数据分析师**：数据处理、可视化建议
- **技术文档编写者**：API 文档、用户指南
- **代码审查员**：代码质量检查、最佳实践建议
- **性能优化专家**：性能瓶颈分析、优化方案
- **UI/UX 设计师**：用户体验优化建议
- **数据库专家**：查询优化、架构设计
- **移动开发专家**：移动端最佳实践
- **云架构师**：云服务选型、成本优化
- **AI/ML 工程师**：机器学习模型建议

**特性**：
- ✨ 基于上下文的自动协调
- ✨ 按需提供领域专业知识
- ✨ 协作式问题解决

---

### 📚 30 个斜杠命令

SuperClaude 提供 30 个精心设计的斜杠命令，覆盖软件开发的完整生命周期：

#### 规划与设计（4 个）

| 命令 | 功能 | 使用场景 |
|------|------|---------|
| `/planning` | 项目规划 | 制定项目计划、分解任务 |
| `/brainstorm` | 头脑风暴 | 创意讨论、方案探索 |
| `/design` | 架构设计 | 系统设计、技术选型 |
| `/spec` | 规格说明 | 编写技术规格文档 |

#### 开发（5 个）

| 命令 | 功能 | 使用场景 |
|------|------|---------|
| `/code` | 代码生成 | 快速生成代码框架 |
| `/refactor` | 代码重构 | 优化代码结构 |
| `/debug` | 调试辅助 | 问题定位、错误修复 |
| `/test` | 测试生成 | 单元测试、集成测试 |
| `/deploy` | 部署辅助 | 部署流程、配置管理 |

#### 测试与质量（4 个）

| 命令 | 功能 | 使用场景 |
|------|------|---------|
| `/test` | 测试执行 | 运行测试套件 |
| `/quality` | 质量检查 | 代码质量分析 |
| `/security` | 安全审计 | 漏洞扫描、安全建议 |
| `/performance` | 性能分析 | 性能瓶颈检测 |

#### 文档（2 个）

| 命令 | 功能 | 使用场景 |
|------|------|---------|
| `/docs` | 文档生成 | 项目文档、使用指南 |
| `/api-docs` | API 文档 | 接口文档生成 |

#### 版本控制（1 个）

| 命令 | 功能 | 使用场景 |
|------|------|---------|
| `/git` | Git 操作 | 提交、分支管理 |

#### 项目管理（3 个）

| 命令 | 功能 | 使用场景 |
|------|------|---------|
| `/project` | 项目管理 | 项目进度跟踪 |
| `/task` | 任务管理 | 待办事项、优先级 |
| `/milestone` | 里程碑 | 设定和跟踪里程碑 |

#### 研究与分析（2 个）

| 命令 | 功能 | 使用场景 |
|------|------|---------|
| `/research` | 深度研究 | 技术调研、竞品分析 |
| `/analyze` | 代码分析 | 依赖分析、复杂度评估 |

#### 实用工具（9 个）

| 命令 | 功能 | 使用场景 |
|------|------|---------|
| `/index-repo` | 仓库索引 | 快速了解代码库结构 |
| `/agent` | 智能体调用 | 直接调用特定智能体 |
| `/recommend` | 推荐系统 | 获取最佳实践建议 |
| 其他 6 个 | 辅助功能 | 各类开发辅助 |

---

### 🎯 7 种行为模式

SuperClaude 提供 7 种智能行为模式，根据不同场景自适应调整工作流程：

#### 1. 头脑风暴模式（Brainstorming）

**核心理念**：提出正确的问题比给出答案更重要

**适用场景**：
- 项目初期的需求探索
- 技术方案的多样化讨论
- 创新想法的激发

**特点**：
- 🎨 鼓励发散思维
- 🎨 多角度问题分析
- 🎨 无批判性思维，先产生后筛选

**使用方式**：
```bash
/brainstorm 如何设计一个高可用的微服务架构？
```

---

#### 2. 商业面板模式（Business Panel）

**核心理念**：多专家战略分析

**适用场景**：
- 重大技术决策
- 架构选型评估
- 成本效益分析

**特点**：
- 👥 模拟多个专家视角
- 👥 全面的利弊分析
- 👥 战略性建议

**工作流程**：
1. 收集问题背景
2. 召集相关领域专家（智能体）
3. 多角度分析
4. 综合建议输出

---

#### 3. 深度研究模式（Deep Research）

**核心理念**：自主网络研究，多跳推理

**适用场景**：
- 新技术调研
- 竞品分析
- 学术研究

**特点**：
- 🔍 自动化信息检索
- 🔍 多跳推理（最多 5 次迭代）
- 🔍 来源可信度评估
- 🔍 综合性研究报告

**研究深度级别**：

| 深度级别 | 来源数量 | 跳数 | 预计时间 | 适用场景 |
|---------|---------|------|---------|---------|
| **快速** | 5-10 | 1 | ~2 分钟 | 快速事实查证 |
| **标准** | 10-20 | 3 | ~5 分钟 | 一般技术调研 |
| **深入** | 20-40 | 4 | ~8 分钟 | 综合分析报告 |
| **详尽** | 40+ | 5 | ~10 分钟 | 学术级研究 |

**使用示例**：
```bash
/research --depth=deep Kubernetes 在生产环境的最佳实践
```

---

#### 4. 编排模式（Orchestration）

**核心理念**：高效工具协调

**适用场景**：
- 复杂多步骤任务
- 需要多个工具配合的场景
- 自动化工作流

**特点**：
- 🎼 智能任务分解
- 🎼 工具自动选择
- 🎼 并行执行优化
- 🎼 错误自动恢复

**示例场景**：
```
任务：为新功能创建完整的发布流程
编排步骤：
1. 代码生成 (/code)
2. 单元测试 (/test)
3. 安全扫描 (/security)
4. 文档更新 (/docs)
5. Git 提交 (/git)
6. 部署准备 (/deploy)
```

---

#### 5. Token 效率模式（Token Efficiency）

**核心理念**：30-50% 的上下文节省

**适用场景**：
- 长时间对话
- 大型代码库分析
- 复杂项目管理

**优化策略**：
- 📊 智能上下文压缩
- 📊 关键信息提取
- 📊 渐进式信息加载
- 📊 重复内容去重

**效果**：
- ✅ 减少 30-50% token 使用
- ✅ 支持更长对话
- ✅ 降低成本
- ✅ 提升响应速度

---

#### 6. 任务管理模式（Task Management）

**核心理念**：系统化任务组织

**适用场景**：
- 项目进度跟踪
- 团队协作
- 多任务并行

**功能**：
- ✅ 任务创建与分配
- ✅ 优先级管理
- ✅ 进度可视化
- ✅ 依赖关系管理

**使用方式**：
```bash
/task create "实现用户认证功能" --priority=high
/task list --status=in-progress
/task update 123 --status=completed
```

---

#### 7. 内省模式（Introspection）

**核心理念**：元认知分析

**适用场景**：
- 代码质量评估
- 决策过程分析
- 学习和改进

**特点**：
- 🧠 自我评估能力
- 🧠 决策过程透明化
- 🧠 持续改进建议
- 🧠 知识沉淀

**分析维度**：
1. **代码质量**：可读性、可维护性、性能
2. **设计决策**：架构合理性、技术选型
3. **流程优化**：工作流效率、瓶颈识别
4. **学习总结**：经验教训、最佳实践

---

### 🔬 深度研究能力

SuperClaude 的深度研究功能是其核心亮点之一，提供自主的、多跳的网络研究能力。

#### 自适应规划策略

SuperClaude 会根据查询的明确程度自动选择合适的研究策略：

1. **仅规划（Plan-Only）**
   - **触发条件**：查询明确、目标清晰
   - **执行方式**：直接执行研究
   - **示例**："React 18 的新特性有哪些？"

2. **意图规划（Intent-Planning）**
   - **触发条件**：查询模糊、需求不明确
   - **执行方式**：先澄清需求，再执行研究
   - **示例**："如何优化前端性能？"（需要明确具体方向）

3. **统一模式（Unified）**【默认】
   - **触发条件**：所有场景
   - **执行方式**：协作式计划完善
   - **特点**：平衡自主性和用户参与

#### 多跳推理机制

SuperClaude 支持最多 5 次迭代的多跳推理，逐步深入研究主题：

**推理类型**：

1. **实体扩展**
   ```
   查询: "Kubernetes"
   → 跳 1: 基础概念、核心组件
   → 跳 2: Pod、Service、Deployment
   → 跳 3: 高级特性（RBAC、Network Policy）
   → 跳 4: 生产实践、故障排查
   → 跳 5: 性能优化、成本控制
   ```

2. **概念深化**
   ```
   查询: "微服务架构"
   → 跳 1: 定义和基本原则
   → 跳 2: 与单体架构对比
   → 跳 3: 服务拆分策略
   → 跳 4: 通信机制（REST、gRPC、消息队列）
   → 跳 5: 分布式事务、服务治理
   ```

3. **时间进展**
   ```
   查询: "前端框架演进"
   → 跳 1: jQuery 时代
   → 跳 2: Angular 1.x 崛起
   → 跳 3: React/Vue 双雄
   → 跳 4: 现代框架（Svelte、Solid）
   → 跳 5: 未来趋势（Islands Architecture）
   ```

4. **因果链**
   ```
   查询: "为什么需要 Docker？"
   → 跳 1: 环境一致性问题
   → 跳 2: 虚拟机的局限性
   → 跳 3: 容器化技术的诞生
   → 跳 4: Docker 的核心价值
   → 跳 5: 容器编排（Kubernetes）的必要性
   ```

#### 质量评分系统

SuperClaude 对所有来源进行可信度评估，确保研究质量：

**评分标准**：
- **0.0 - 0.4**：低可信度（非官方博客、未验证内容）
- **0.4 - 0.6**：中等可信度（技术社区、经验分享）
- **0.6 - 0.8**：高可信度（技术文档、知名博客）
- **0.8 - 1.0**：极高可信度（官方文档、学术论文）

**质量控制**：
- ✅ 最低阈值：0.6（自动过滤低质量来源）
- ✅ 目标阈值：0.8（优先采用高质量来源）
- ✅ 来源多样性：避免单一来源偏见

#### 研究报告结构

完整的研究报告通常包含：

1. **执行摘要**
   - 研究问题
   - 核心发现
   - 关键建议

2. **方法论**
   - 研究策略
   - 来源数量
   - 跳数和深度

3. **详细发现**
   - 按主题组织
   - 引用来源
   - 可信度评分

4. **综合分析**
   - 趋势总结
   - 对比分析
   - 利弊权衡

5. **行动建议**
   - 具体步骤
   - 最佳实践
   - 风险提示

6. **参考文献**
   - 完整来源列表
   - 链接和时间戳

---

### 🔧 MCP 服务器集成

SuperClaude 通过 **airis-mcp-gateway** 集成了 8 个强大的 MCP 服务器，显著提升功能和性能。

#### 集成服务器列表

| 服务器 | 功能 | 性能提升 | 主要用途 |
|--------|------|---------|---------|
| **Tavily** | 网络搜索 | 搜索速度 +200% | 深度研究主引擎 |
| **Serena** | 代码理解 | 理解速度 +150% | 代码库分析 |
| **Sequential** | Token 优化 | Token 减少 30-50% | 推理效率提升 |
| **Mindbase** | 语义搜索 | - | 跨会话知识检索 |
| **Context7** | 文档查找 | - | 官方文档快速定位 |
| **Playwright** | 内容提取 | - | JavaScript 渲染页面 |
| **Magic** | UI 生成 | - | 组件快速生成 |
| **Chrome DevTools** | 性能分析 | - | 前端性能优化 |

#### 性能对比

**不使用 MCP**：
- ✅ 功能完整
- ⚠️ 标准性能
- ⚠️ 标准 token 消耗

**使用 MCP**：
- ✅ 功能完整
- ⚡ 速度提升 2-3 倍
- ⚡ Token 减少 30-50%
- ⚡ 更好的结果质量

#### 如何启用 MCP

在github发布页写了：https://github.com/agiletec-inc/airis-mcp-gateway

---

## 快速上手

### 第一次使用

1. **安装 SuperClaude**（参见[安装方法](#安装方法)）

2. **验证安装**：
   ```bash
   superclaude doctor
   ```

3. **了解命令**：
   ```bash
   /help
   ```

4. **尝试第一个命令**：
   ```bash
   /brainstorm 我想构建一个任务管理应用，有什么好的想法？
   ```

### 典型工作流

#### 场景 1：开始新项目

```bash
# 1. 头脑风暴
/brainstorm 构建一个在线协作白板应用

# 2. 项目规划
/planning 在线协作白板应用

# 3. 架构设计
/design 白板应用的技术架构

# 4. 生成规格文档
/spec 协作白板功能规格

# 5. 代码生成
/code 实现白板核心功能

# 6. 测试
/test 白板功能测试用例

# 7. 文档
/docs 白板应用使用文档
```

#### 场景 2：深度技术调研

```bash
# 1. 快速研究
/research --depth=quick WebAssembly 基础概念

# 2. 深入研究
/research --depth=deep WebAssembly 在生产环境的应用

# 3. 详尽研究（学术级）
/research --depth=exhaustive WebAssembly 性能优化技术
```

#### 场景 3：代码审查与优化

```bash
# 1. 代码分析
/analyze 分析当前代码库的复杂度

# 2. 安全审计
/security 扫描潜在的安全漏洞

# 3. 性能分析
/performance 分析性能瓶颈

# 4. 质量检查
/quality 代码质量评估

# 5. 重构建议
/refactor 优化建议
```

---

## 工作模式详解

（此章节已在[7 种行为模式](#7-种行为模式)中详细说明）

---

## 斜杠命令参考

（此章节已在[30 个斜杠命令](#30-个斜杠命令)中详细说明）

完整命令列表和使用示例请参考项目文档：
- [PLANNING.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/PLANNING.md)
- [TASK.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/TASK.md)

---

## 智能体介绍

（此章节已在[16 个专业智能体](#16-个专业智能体)中详细说明）

### 如何调用特定智能体

使用 `/agent` 命令直接调用：

```bash
# 调用安全工程师
/agent security 审计这段代码的安全性

# 调用前端架构师
/agent frontend-architect 这个 UI 组件如何优化？

# 调用性能优化专家
/agent performance 为什么这个查询这么慢？
```

---

## 深度研究功能

（此章节已在[深度研究能力](#深度研究能力)中详细说明）

### 研究命令参数

```bash
# 基础语法
/research [--depth=LEVEL] <查询内容>

# 深度级别
--depth=quick       # 快速研究（5-10 来源，~2 分钟）
--depth=standard    # 标准研究（10-20 来源，~5 分钟）【默认】
--depth=deep        # 深入研究（20-40 来源，~8 分钟）
--depth=exhaustive  # 详尽研究（40+ 来源，~10 分钟）

# 示例
/research --depth=deep GraphQL vs REST API 性能对比
```

---

## MCP 集成详解

（此章节已在[MCP 服务器集成](#mcp-服务器集成)中详细说明）

### 推荐配置

**最小配置**（基础功能）:
- Tavily（网络搜索）
- Sequential（Token 优化）

**标准配置**（日常开发）:
- Tavily
- Serena
- Sequential
- Context7

**完整配置**（专业开发）:
- 所有 8 个服务器

---

## 必读文档

SuperClaude 框架包含 4 个核心文档，建议按以下顺序阅读：

| 文档 | 主要内容 | 阅读时机 | 重要性 |
|------|---------|---------|-------|
| **PLANNING.md** | 架构设计、设计原则、绝对规则 | 会话开始前、实施重大功能前 | ⭐⭐⭐⭐⭐ |
| **TASK.md** | 当前任务、优先级、待办事项 | 每天开始工作前 | ⭐⭐⭐⭐⭐ |
| **KNOWLEDGE.md** | 见解、最佳实践、故障排除 | 遇到问题时、学习最佳实践时 | ⭐⭐⭐⭐ |
| **CONTRIBUTING.md** | 贡献指南、PR 流程 | 提交代码前 | ⭐⭐⭐ |

### 文档访问

所有文档都在 GitHub 仓库中：
- 📄 [PLANNING.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/PLANNING.md)
- 📄 [TASK.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/TASK.md)
- 📄 [KNOWLEDGE.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/KNOWLEDGE.md)
- 📄 [CONTRIBUTING.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/CONTRIBUTING.md)

---

## 最佳实践

### 1. 选择合适的深度级别

根据实际需求选择研究深度，避免过度研究：

| 场景 | 推荐深度 | 理由 |
|------|---------|------|
| 快速查证事实 | quick | 节省时间和成本 |
| 日常技术调研 | standard | 平衡深度和效率 |
| 架构决策 | deep | 需要全面分析 |
| 学术研究、白皮书 | exhaustive | 追求完整性 |

### 2. 组合使用命令

多个命令配合使用，效果更佳：

```bash
# 完整流程示例
/brainstorm      # 先发散思维
→ /planning      # 制定计划
→ /design        # 架构设计
→ /code          # 实现代码
→ /test          # 编写测试
→ /security      # 安全检查
→ /docs          # 生成文档
→ /git           # 提交代码
```

### 3. 利用智能体专业知识

遇到特定领域问题时，直接调用相关智能体：

```bash
# 性能问题 → 性能优化专家
/agent performance

# 安全问题 → 安全工程师
/agent security

# UI 问题 → 前端架构师
/agent frontend-architect
```

### 4. 定期阅读文档

- **每周**：快速浏览 TASK.md，了解最新任务
- **每月**：深入阅读 KNOWLEDGE.md，学习最佳实践
- **每季度**：重读 PLANNING.md，巩固架构理解

### 5. 启用 MCP 加速

如果频繁使用研究和代码分析功能，强烈建议启用 MCP：

- ⚡ 速度提升 2-3 倍
- ⚡ 成本降低 30-50%
- ⚡ 结果质量更高

### 6. Token 效率优化

在长时间对话中，使用 Token 效率模式：

- 定期总结上下文
- 删除不必要的历史消息
- 使用引用而非重复粘贴代码

---

## 性能对比

### 不使用 MCP vs 使用 MCP

| 指标 | 不使用 MCP | 使用 MCP | 提升 |
|------|-----------|---------|------|
| **代码理解速度** | 基准 | 2-3x 快 | +150% |
| **研究速度** | 基准 | 2-3x 快 | +200% |
| **Token 消耗** | 基准 | 减少 30-50% | -40% |
| **结果质量** | 良好 | 优秀 | +30% |
| **功能完整性** | ✅ 完整 | ✅ 完整 | - |

### v4.1 vs 之前版本

| 改进项 | v4.0 及之前 | v4.1 | 提升 |
|-------|-----------|------|------|
| **框架占用** | 较高 | 减少 40% | -40% |
| **可用上下文** | 较少 | 增加 60% | +60% |
| **文档质量** | 基础 | 全面重写 | +200% |
| **稳定性** | 一般 | 显著提升 | +150% |
| **错误处理** | 基础 | 健壮 | +100% |

---

## 支持项目

SuperClaude 是开源项目，维护需要持续投入。如果这个工具对你有帮助，欢迎支持：

### 为什么需要支持？

- 💰 **Claude Max 订阅**：每月 100 美元用于测试和开发
- 💰 **MCP 服务成本**：第三方服务费用
- 💰 **文档维护**：持续更新和翻译
- 💰 **新功能开发**：v5.0 TypeScript 插件系统

### 如何支持？

1. **Ko-fi**：一次性捐赠
   - [https://ko-fi.com/superclaude](https://ko-fi.com/superclaude)

2. **Patreon**：月度订阅支持
   - [https://patreon.com/superclaude](https://patreon.com/superclaude)

3. **GitHub Sponsors**：灵活支持层级
   - [GitHub Sponsors](https://github.com/sponsors/SuperClaude-Org)

### 其他贡献方式

除了资金支持,你还可以通过以下方式贡献：

| 优先级 | 领域 | 具体内容 |
|--------|------|---------|
| **高** | 文档 | 改进指南、添加示例、翻译 |
| **高** | MCP 集成 | 添加新的服务器配置 |
| **中** | 工作流 | 创建命令模式、分享最佳实践 |
| **中** | 测试 | 添加测试用例、验证功能 |
| **低** | 国际化 | 翻译文档到其他语言 |

详见 [CONTRIBUTING.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/CONTRIBUTING.md)

---

## 参考资源

### 官方资源

- 🏠 **GitHub 仓库**：[SuperClaude_Framework](https://github.com/SuperClaude-Org/SuperClaude_Framework)
- 📖 **官方文档**：[superclaude.netlify.app](https://superclaude.netlify.app)
- 📦 **PyPI 包**：[superclaude](https://pypi.org/project/superclaude/)

### 核心文档

- 📄 [README 中文版](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/README-zh.md)
- 📄 [PLANNING.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/PLANNING.md) - 架构与设计原则
- 📄 [TASK.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/TASK.md) - 任务管理
- 📄 [KNOWLEDGE.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/KNOWLEDGE.md) - 最佳实践
- 📄 [CONTRIBUTING.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/CONTRIBUTING.md) - 贡献指南

### 社区

- 💬 **GitHub Discussions**：技术讨论、问题求助
- 🐛 **GitHub Issues**：bug 报告、功能请求
- 📧 **邮件列表**：重要更新通知

### 相关工具

- 🤖 **Claude Code**：[claude.ai/code](https://claude.ai/code)
- 🔌 **airis-mcp-gateway**：MCP 服务器网关
- 📚 **MCP 服务器列表**：[Model Context Protocol Servers](https://modelcontextprotocol.io/servers)

---

## 免责声明

本项目（SuperClaude）与 Anthropic 公司**无关联或认可**。Claude Code 由 Anthropic 公司构建和维护。

SuperClaude 是一个独立的社区项目,旨在增强 Claude Code 的使用体验。

---

## 更新日志

### v4.1.9（当前稳定版）

- ⚡ 性能优化：减少框架占用 40%
- 📚 文档全面改写：真实示例和用例
- 🧪 增强稳定性：核心命令错误修复
- 🔧 改进错误处理机制
- ✅ CI/CD 流水线改进

### v5.0（开发中）

- 🔮 TypeScript 插件系统
- 🔮 更强大的自定义能力
- 🔮 性能进一步优化

---

## 常见问题

### Q1: SuperClaude 和 Claude Code 有什么区别？

**A**: Claude Code 是 Anthropic 官方提供的 AI 辅助编程工具，SuperClaude 是一个**配置框架**，通过添加智能体、命令和工作流来增强 Claude Code 的功能。

### Q2: 必须启用 MCP 吗？

**A**: 不是必须的。不使用 MCP 时，SuperClaude 功能完整，只是速度稍慢、token 消耗稍高。启用 MCP 可以获得 2-3 倍的速度提升和 30-50% 的成本降低。

### Q3: 如何选择研究深度？

**A**: 参考此表格：
- 快速查证 → quick
- 日常调研 → standard
- 架构决策 → deep
- 学术研究 → exhaustive

### Q4: 哪些智能体最常用？

**A**: 根据统计，最常用的智能体是：
1. 深度研究智能体
2. 安全工程师
3. 前端架构师
4. 性能优化专家
5. PM Agent

### Q5: 如何升级到最新版本？

**A**: 使用 pipx 安装的用户：
```bash
pipx upgrade superclaude
superclaude install
```

从 Git 安装的用户：
```bash
cd SuperClaude_Framework
git pull
./install.sh
```

### Q6: 遇到问题如何获取帮助？

**A**: 按以下顺序尝试：
1. 查看 [KNOWLEDGE.md](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/KNOWLEDGE.md) 故障排除章节
2. 搜索 [GitHub Issues](https://github.com/SuperClaude-Org/SuperClaude_Framework/issues)
3. 在 GitHub Discussions 提问
4. 提交新的 Issue

---

## 总结

SuperClaude 是一个功能强大、设计精良的 Claude Code 增强框架，通过以下核心能力显著提升开发效率：

✨ **16 个专业智能体** - 提供领域专业知识
✨ **30 个斜杠命令** - 覆盖完整开发生命周期
✨ **7 种行为模式** - 自适应工作流程
✨ **深度研究能力** - 自主网络研究，多跳推理
✨ **MCP 集成** - 2-3 倍速度提升，30-50% 成本降低

无论你是个人开发者、团队负责人还是技术研究者，SuperClaude 都能为你提供系统化、智能化的开发支持。

**立即开始使用 SuperClaude，体验 AI 辅助开发的全新境界！**

```bash
# 快速开始
pipx install superclaude
superclaude install
superclaude doctor

# 第一个命令
/brainstorm 你的想法
```

---

**文档版本**: v1.0
**最后更新**: 2025-11-19
**维护者**: [SuperClaude 社区]
**许可证**: MIT
