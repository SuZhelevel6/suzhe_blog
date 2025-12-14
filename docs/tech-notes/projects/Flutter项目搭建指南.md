# Flutter 项目搭建完整指南

> **文档定位**: 本指南面向 AI 和程序员，基于真实项目提交历史，提供从零开始搭建专业级 Flutter 项目的完整流程
>
> **项目信息**: flutter_run - 跨平台应用（Android, iOS, macOS, Web）
> **架构模式**: Clean Architecture + Feature-First
> **状态管理**: BLoC (flutter_bloc)
> **最低要求**: Flutter 3.9.0+, Dart 3.9.0+

---

## 📚 目录

- [第一章：开发规范](#第一章开发规范)
- [第二章：项目初始化](#第二章项目初始化)
- [第三章：Clean Architecture 核心基础设施](#第三章clean-architecture-核心基础设施)
- [第四章：路由系统和页面框架](#第四章路由系统和页面框架)
- [第五章：桌面端适配和窗口控制](#第五章桌面端适配和窗口控制)
- [第六章：应用生命周期管理](#第六章应用生命周期管理)
- [第七章：启动页实现](#第七章启动页实现)
- [第八章：设置系统实现](#第八章设置系统实现)
- [第九章：国际化系统](#第九章国际化系统)
- [第十章：网络请求与数据层](#第十章网络请求与数据层)
- [第十一章：Widget 组件库模块](#第十一章widget-组件库模块)
- [第十二章：依赖注入 (GetIt)](#第十二章依赖注入-getit)
- [附录](#附录)

---

## 第一章：开发规范

### 1.1 Git 提交规范 (Conventional Commits)

采用 [Conventional Commits](https://www.conventionalcommits.org/) 规范，确保提交历史清晰可追溯。

#### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(blog): 实现博客文章列表` |
| `fix` | Bug 修复 | `fix(router): 修复路由跳转闪烁问题` |
| `docs` | 文档变更 | `docs: 更新 README 安装说明` |
| `style` | 代码格式 | `style: 格式化代码` |
| `refactor` | 重构 | `refactor(network): 抽取通用错误处理` |
| `perf` | 性能优化 | `perf(list): 优化列表滚动性能` |
| `test` | 测试 | `test(blog): 添加 BLoC 单元测试` |
| `chore` | 构建/工具 | `chore: 更新依赖到最新版本` |
| `revert` | 回退 | `revert: 回退 feat(xxx)` |

#### 提交示例

```bash
# 提交格式示例
git commit -m "feat(blog): 实现博客文章界面及 macOS 网络权限配置

- 添加 BlogBloc 状态管理
- 实现文章列表 UI
- 配置 macOS 网络权限
- 集成 Dio 网络请求"

# 本项目实际提交记录
git log --oneline --reverse
# a264210 chore: 初始化 Flutter 项目
# 4cf7411 chore: 配置 pubspec.yaml 基础推荐配置
# cf99495 feat: 实现 Clean Architecture 核心基础设施
# d4f599b feat: 实现 go_router 路由管理和页面框架
# ...
```

---

### 1.2 代码注释规范 (Effective Dart)

遵循 [Effective Dart: Documentation](https://dart.dev/guides/language/effective-dart/documentation) 规范。

#### 1.2.1 文档注释 (Doc Comments)

使用 `///` 为公共 API 编写文档注释：

```dart
/// 博客文章数据仓库接口。
///
/// 定义博客模块的数据操作契约，遵循 Clean Architecture 的依赖倒置原则。
/// Presentation 层依赖此接口，而非具体实现。
///
/// 职责:
/// - 获取轮播图数据
/// - 获取文章列表（支持分页）
/// - 处理网络异常并返回统一的 [Result] 类型
///
/// 设计原则:
/// - 所有方法返回 [Result<T>] 封装成功/失败状态
/// - 不抛出异常，所有错误通过 [Failure] 返回
/// - 实现类位于 data 层，负责数据源切换（远程/本地/Mock）
abstract class BlogRepository {
  /// 获取首页轮播图。
  ///
  /// 返回 [Result<List<BannerModel>>]:
  /// - [Success]: 包含轮播图列表（可能为空）
  /// - [Failure]: 包含具体错误信息（网络/业务/未知）
  ///
  /// 示例:
  /// ```dart
  /// final result = await repository.getBanners();
  /// result.when(
  ///   success: (banners) => print('获取到 ${banners.length} 个轮播图'),
  ///   failure: (error) => print('失败: ${error.message}'),
  /// );
  /// ```
  Future<Result<List<BannerModel>>> getBanners();

  /// 获取文章列表（分页）。
  ///
  /// [page] 页码，从 0 开始
  /// 返回 [Result<List<ArticleModel>>]
  Future<Result<List<ArticleModel>>> getArticles(int page);
}
```

#### 1.2.2 实现注释 (Implementation Comments)

使用 `//` 为复杂逻辑添加说明：

```dart
class BlogRepositoryImpl implements BlogRepository {
  final BlogRemoteDataSource _remoteDataSource;

  const BlogRepositoryImpl(this._remoteDataSource);

  @override
  Future<Result<List<BannerModel>>> getBanners() async {
    try {
      // 步骤1: 调用远程数据源获取数据
      final response = await _remoteDataSource.getBanners();

      // 步骤2: 检查业务逻辑是否成功（errorCode == 0）
      if (response.errorCode == 0) {
        // 成功: 返回数据（data 可能为 null）
        return Success(response.data ?? []);
      } else {
        // 业务失败: 转换为 ApiFailure
        return Failure(ApiFailure(response.errorMsg ?? '未知错误'));
      }
    } on DioException catch (e) {
      // 网络异常: 转换为 NetworkFailure
      return Failure(NetworkFailure(e.message ?? '网络错误'));
    } catch (e) {
      // 未知异常: 转换为 UnknownFailure
      return Failure(UnknownFailure(e.toString()));
    }
  }
}
```

#### 1.2.3 注释原则

**✅ 应该写的注释**:
- 解释"为什么"而非"是什么"
- 复杂算法的思路和时间复杂度
- 非显而易见的业务规则
- 副作用和注意事项

**❌ 不应该写的注释**:
- 重复代码内容（`i++  // i 加 1`）
- 显而易见的注释
- 注释掉的代码（使用 Git 管理历史）
- 过时的注释

---

### 1.3 命名规范

遵循 [Effective Dart: Style](https://dart.dev/guides/language/effective-dart/style) 规范。

| 类型 | 命名方式 | 示例 |
|------|---------|------|
| **类/枚举/类型** | UpperCamelCase | `BlogRepository`, `ThemeMode`, `ApiResponse<T>` |
| **文件/目录** | snake_case | `blog_repository.dart`, `core/network/` |
| **变量/函数/参数** | lowerCamelCase | `userName`, `fetchData()`, `pageSize` |
| **常量** | lowerCamelCase | `defaultTimeout`, `maxRetryCount` |
| **私有成员** | _lowerCamelCase | `_apiClient`, `_loadData()` |

**示例**:

```dart
// ✅ 正确命名
class BlogRepository {}                    // 类名: UpperCamelCase
abstract class ApiClient {}               // 抽象类: UpperCamelCase
enum ThemeMode { light, dark, system }    // 枚举: UpperCamelCase

// 文件名: snake_case
// lib/features/blog/domain/repositories/blog_repository.dart
// lib/core/network/api_client.dart

// 变量和函数: lowerCamelCase
int currentPage = 0;
String userName = 'Flutter';
Future<void> loadArticles() async {}

// 常量: lowerCamelCase
const int defaultPageSize = 20;
const Duration defaultTimeout = Duration(seconds: 10);

// 私有成员: _lowerCamelCase
final ApiClient _apiClient;
void _handleError(Failure failure) {}

// ❌ 错误命名
class blog_repository {}          // 错误: 应使用 UpperCamelCase
const int DEFAULT_PAGE_SIZE = 20; // 错误: 应使用 lowerCamelCase
int UserName = '';                // 错误: 变量应使用 lowerCamelCase
```

---

## 第二章：项目初始化

> **对应提交**:
> - `a264210` chore: 初始化 Flutter 项目
> - `4cf7411` chore: 配置 pubspec.yaml 基础推荐配置
> - `aaa072f` chore: 配置全平台 Icon
> - `64bb547` chore: 更新所有依赖到最新版本

### 2.1 创建 Flutter 项目

#### 2.1.1 使用 Flutter CLI 创建项目

```bash
# 创建项目
flutter create flutter_run --platforms=android,ios,macos,web

# 进入项目目录
cd flutter_run

# 检查 Flutter 环境
flutter doctor

# 运行项目（验证）
flutter run
```

**生成的目录结构**:
```
flutter_run/
├── android/          # Android 平台代码
├── ios/              # iOS 平台代码
├── macos/            # macOS 平台代码
├── web/              # Web 平台代码
├── lib/              # Dart 代码主目录
│   └── main.dart     # 应用入口
├── test/             # 测试代码
├── pubspec.yaml      # 项目配置文件
└── README.md         # 项目说明
```

---

### 2.2 配置 pubspec.yaml

`pubspec.yaml` 是 Flutter 项目的配置文件，定义项目信息、依赖、资源等。

#### 2.2.1 基础配置

```yaml
name: flutter_run
description: "A new Flutter project."
publish_to: 'none'  # 不发布到 pub.dev
version: 1.0.0+1    # 版本号+构建号

environment:
  sdk: ^3.9.0       # Dart SDK 版本约束
```

**版本号说明**:
- `1.0.0`: 语义化版本号 (主版本.次版本.修订号)
- `+1`: 构建号（每次发布递增）

---

#### 2.2.2 依赖管理策略

本项目采用**分类注释**方式组织依赖，提高可维护性：

```yaml
# ==================== 核心依赖 ====================
dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:  # 国际化支持
    sdk: flutter
  intl: any               # 国际化工具

  # ==================== UI 组件 ====================
  cupertino_icons: ^1.0.8          # iOS 风格图标
  window_manager: ^0.5.1           # 桌面窗口管理
  url_launcher: ^6.3.1             # URL 启动器

  # ==================== 网络请求 ====================
  dio: ^5.9.0                      # HTTP 客户端
  pretty_dio_logger: ^1.4.0        # Dio 日志（开发环境）
  json_annotation: ^4.9.0          # JSON 注解

  # ==================== 状态管理 ====================
  flutter_bloc: ^8.1.6             # BLoC 状态管理
  equatable: ^2.0.5                # 相等性比较（用于 State）

  # ==================== 路由管理 ====================
  go_router: ^17.0.0               # 声明式路由

  # ==================== 应用启动 ====================
  fx_boot_starter: ^0.1.1          # 启动框架

  # ==================== 本地存储 ====================
  shared_preferences: ^2.3.3       # 键值对存储

  # ==================== 日志管理 ====================
  talker: ^4.6.2                   # 日志核心
  talker_flutter: ^4.6.2           # Flutter 集成
  talker_dio_logger: ^4.5.0        # Dio 日志拦截
  talker_bloc_logger: ^4.4.1       # BLoC 日志拦截

# ==================== 开发依赖 ====================
dev_dependencies:
  flutter_test:
    sdk: flutter

  flutter_lints: ^6.0.0            # Lint 规则
  flutter_launcher_icons: ^0.14.4  # 图标生成工具
  flutter_native_splash: ^2.3.7    # 启动屏生成工具
  build_runner: ^2.4.9             # 代码生成器
  json_serializable: ^6.9.0        # JSON 序列化代码生成
```

**依赖选择原则**:
1. **核心依赖**: 必须依赖（Flutter SDK、国际化）
2. **功能依赖**: 按需选择（网络、状态管理、路由）
3. **开发依赖**: 仅开发阶段使用（测试、代码生成、工具）

---

#### 2.2.3 Flutter 配置

```yaml
flutter:
  uses-material-design: true  # 启用 Material Design
  generate: true              # 启用国际化代码生成

  assets:
    - assets/images/          # 图片资源目录
```

**资源管理**:
- `assets/images/`: 存放应用图片资源
- `generate: true`: 自动生成国际化代码（需配合 `l10n.yaml`）

---

### 2.3 配置全平台 Icon

使用 `flutter_launcher_icons` 插件自动生成全平台应用图标。

#### 2.3.1 准备图标

1. 设计应用图标（推荐尺寸: 1024x1024 px）
2. 保存为 `assets/images/app_icon.png`

#### 2.3.2 配置 flutter_launcher_icons

在 `pubspec.yaml` 中添加配置：

```yaml
flutter_launcher_icons:
  android: true                              # 生成 Android 图标
  ios: true                                  # 生成 iOS 图标
  macos:
    generate: true                           # 生成 macOS 图标
    image_path: "assets/images/app_icon.png"
  web:
    generate: true                           # 生成 Web 图标
  image_path: "assets/images/app_icon.png"   # 图标路径
  adaptive_icon_background: "#FFFFFF"        # Android 自适应图标背景色
  adaptive_icon_foreground: "assets/images/app_icon.png"  # 前景图片
```

#### 2.3.3 生成图标

```bash
# 安装依赖
flutter pub get

# 生成全平台图标
flutter pub run flutter_launcher_icons

# 输出示例:
# ✓ Creating Android launcher icons
# ✓ Creating iOS launcher icons
# ✓ Creating macOS launcher icons
# ✓ Creating Web launcher icons
```

**生成位置**:
- Android: `android/app/src/main/res/mipmap-*/`
- iOS: `ios/Runner/Assets.xcassets/AppIcon.appiconset/`
- macOS: `macos/Runner/Assets.xcassets/AppIcon.appiconset/`
- Web: `web/icons/`

---

### 2.4 依赖管理和版本更新

#### 2.4.1 查看过期依赖

```bash
# 检查可更新的依赖
flutter pub outdated

# 输出示例:
# Package Name    Current  Upgradable  Resolvable  Latest
# dio             5.7.0    5.9.0       5.9.0       5.9.0
# go_router       14.0.0   17.0.0      17.0.0      17.0.0
```

#### 2.4.2 更新依赖

```bash
# 更新所有依赖到最新兼容版本
flutter pub upgrade

# 或手动修改 pubspec.yaml 版本号后执行
flutter pub get
```

#### 2.4.3 版本约束说明

```yaml
dependencies:
  # 固定版本（不推荐，除非有特殊需求）
  dio: 5.9.0

  # 兼容版本约束（推荐）
  dio: ^5.9.0        # >=5.9.0 <6.0.0
  go_router: ^17.0.0  # >=17.0.0 <18.0.0

  # 任意版本（不推荐用于生产环境）
  intl: any

  # 范围约束
  dio: ">=5.0.0 <6.0.0"
```

**推荐做法**:
- 使用 `^` 约束（自动获取小版本更新）
- 定期执行 `flutter pub upgrade` 更新依赖
- 更新后运行测试确保兼容性

---

### 2.5 初始化 Git 仓库

```bash
# 初始化 Git
git init

# 添加 .gitignore（Flutter 自动生成）
# 已包含：build/、.dart_tool/、*.g.dart 等

# 首次提交
git add .
git commit -m "chore: 初始化 Flutter 项目"

# 配置 pubspec.yaml
git add pubspec.yaml
git commit -m "chore: 配置 pubspec.yaml 基础推荐配置"

# 配置图标
git add .
git commit -m "chore: 配置全平台 Icon"
```

---

## 第三章：Clean Architecture 核心基础设施

> **对应提交**: `cf99495` feat: 实现 Clean Architecture 核心基础设施
>
> **本章目标**: 搭建符合 Clean Architecture 的基础设施层，包括错误处理、Result 模式、网络层、日志系统和平台适配。

### 3.1 Clean Architecture 概述

#### 3.1.1 架构设计理念

本项目采用 **Clean Architecture（整洁架构）** 设计模式,这是一种以业务逻辑为核心、高度解耦的软件架构方法论。

**核心思想**
- **依赖倒置**:外层依赖内层,内层永不依赖外层。最核心的业务逻辑(Domain层)不依赖任何外部框架、UI或数据库,确保业务规则的独立性和可测试性
- **关注点分离**:将应用分为 Presentation(表现层)、Domain(领域层)、Data(数据层)、Core(基础设施层)四个层次,每层职责单一明确,互不干扰
- **面向接口编程**:Domain 层定义抽象的 Repository 接口,Data 层负责具体实现,Presentation 层通过接口调用,实现技术细节与业务逻辑的完全解耦

**分层职责**

**1. Presentation 层(表现层)**
- **职责**:负责 UI 渲染和用户交互,使用 BLoC/Cubit 管理页面状态
- **依赖关系**:依赖 Domain 层的 Repository 接口和 Entity,通过 BLoC 调用业务逻辑
- **技术选型**:Flutter Widget + flutter_bloc

**2. Domain 层(领域层 - 核心)**
- **职责**:定义业务实体(Entity)和业务规则(Repository 接口),是整个架构的核心,不包含任何实现细节
- **依赖关系**:完全独立,不依赖任何外部框架、UI 或数据源
- **包含内容**:Entity(实体类)、Repository Interface(仓库接口抽象)

**3. Data 层(数据层)**
- **职责**:实现 Domain 层定义的 Repository 接口,负责数据获取和持久化(网络请求、本地缓存、数据库)
- **依赖关系**:依赖 Domain 层的接口,实现具体的数据操作逻辑
- **包含内容**:Repository Implementation(仓库实现)、DataSource(数据源:Remote/Local)、Model(数据模型,可与 Entity 转换)

**4. Core 层(基础设施层)**
- **职责**:提供跨层次的通用能力,如错误处理、网络封装、日志系统、平台适配等
- **依赖关系**:被所有层使用,自身不依赖业务逻辑
- **包含内容**:Result 模式、Exception/Failure、ApiClient、Logger、Platform Adapter

**整体优势**
1. **高可测试性**:Domain 层完全独立,可以轻松编写单元测试而无需模拟 UI 或网络
2. **易于维护**:每层职责清晰,修改某一层不会影响其他层,降低维护成本
3. **技术无关性**:业务逻辑与技术实现分离,未来可以轻松替换 UI 框架或数据源而不影响核心业务
4. **团队协作友好**:前端、后端、业务逻辑可以并行开发,只需遵循接口契约

---

#### 3.1.2 架构分层

```
┌──────────────────────────────────────────┐
│   Presentation Layer (UI + BLoC)       │  ← 表现层
├──────────────────────────────────────────┤
│   Domain Layer (Entities + Repository) │  ← 领域层（核心）
├──────────────────────────────────────────┤
│   Data Layer (Repository Impl + API)   │  ← 数据层
└──────────────────────────────────────────┘
         ↓
    Core Infrastructure                    ← 基础设施层
```

**依赖规则**:
- 外层依赖内层（Presentation → Domain ← Data）
- 内层不依赖外层
- Domain 层是核心，不依赖任何外部框架

#### 3.1.3 项目目录结构

```
lib/
├── core/                    # 核心基础设施层
│   ├── error/              # 错误处理
│   │   ├── exceptions.dart # 异常类
│   │   └── failures.dart   # 失败类
│   ├── network/            # 网络层
│   │   ├── api_client.dart     # Dio 客户端
│   │   ├── api_response.dart   # API 响应封装
│   │   └── result.dart         # Result 模式
│   ├── logging/            # 日志系统
│   │   ├── talker_config.dart      # Talker 配置
│   │   ├── app_logger.dart         # 应用日志
│   │   └── app_bloc_observer.dart  # BLoC 日志观察器
│   ├── platform/           # 平台适配
│   │   ├── os.dart             # 操作系统检测
│   │   ├── app_env.dart        # 应用环境
│   │   └── platform_adapter.dart  # 平台适配器
│   └── ...
│
└── features/               # 业务功能模块（垂直切分）
    └── blog/              # 示例：博客模块
        ├── data/          # 数据层
        ├── domain/        # 领域层
        └── presentation/  # 表现层
```

---

### 3.2 错误处理机制

#### 3.2.1 设计原则

Clean Architecture 中的错误处理遵循以下原则：
1. **不抛出异常**: 所有错误通过 `Result` 类型返回
2. **分层处理**: 异常在 Data 层捕获，转换为 Failure 返回
3. **类型安全**: 使用 sealed class 确保穷尽性检查

#### 3.2.2 架构设计概述

本项目采用**三层错误处理架构**,从底层到上层依次为:异常(Exception)、失败(Failure)、结果(Result)。

**1. 异常层(Exception)**
- **实现方式**:先定义一个抽象基类 `AppException`,包含统一的 `message` 属性和 `toString()` 方法,然后针对不同场景派生具体异常子类,如 `ServerException`(服务器错误)、`NetworkException`(网络错误)、`CacheException`(缓存错误)等
- **作用目的**:在底层(如数据源层)直接抛出语义明确的异常类型,让调用方能够精准识别错误来源,同时所有异常都遵循统一的接口规范

**2. 失败层(Failure)**
- **实现方式**:定义抽象基类 `Failure`,使用 Dart 3 的 `sealed class` 特性,然后派生业务失败子类,如 `NetworkFailure`(网络失败)、`ServerFailure`(服务器失败)、`CacheFailure`(缓存失败)等
- **作用目的**:将底层技术异常转换为业务层可理解的失败信息,解耦技术实现与业务逻辑。Repository 层捕获 Exception 后转换为对应的 Failure,使上层业务代码无需关心底层技术细节

**3. 结果层(Result)**
- **实现方式**:使用 `sealed class Result<T>` 定义统一的返回类型,包含两个子类:`Success<T>`(成功,携带泛型数据)和 `Failure`(失败,携带失败信息)。所有数据请求必须返回 `Result` 类型
- **作用目的**:强制调用方处理成功和失败两种情况(利用 sealed class 的编译期穷举检查),彻底避免传统方式忘记写 `try-catch` 导致的崩溃问题。通过模式匹配(如 `when`/`map` 方法)优雅地处理不同结果

**整体优势**
1. **分层明确**:技术异常、业务失败、结果封装三层职责清晰,互不耦合
2. **类型安全**:编译期即可发现未处理的错误情况,运行时更稳定
3. **语义清晰**:每层都有明确的类型定义,代码可读性和可维护性大幅提升
4. **强制处理**:sealed class + Result 模式让开发者无法忽略错误处理,从架构层面保证代码健壮性

---

#### 3.2.3 Exception（异常）

`lib/core/error/exceptions.dart`

```dart
/// 网络异常
///
/// 在 Data 层捕获 DioException 后转换为此异常
class NetworkException implements Exception {
  final String message;
  final int? statusCode;

  const NetworkException(this.message, [this.statusCode]);

  @override
  String toString() => 'NetworkException: $message (code: $statusCode)';
}

/// 服务器异常
///
/// API 返回错误码时使用（如 errorCode != 0）
class ServerException implements Exception {
  final String message;
  final int errorCode;

  const ServerException(this.message, this.errorCode);

  @override
  String toString() => 'ServerException: $message (code: $errorCode)';
}

/// 缓存异常
class CacheException implements Exception {
  final String message;

  const CacheException(this.message);

  @override
  String toString() => 'CacheException: $message';
}
```

**使用场景**:
- `NetworkException`: Dio 请求失败（网络超时、连接失败等）
- `ServerException`: API 业务逻辑错误（errorCode != 0）
- `CacheException`: 本地缓存读写失败

---

#### 3.2.4 Failure（失败）

`lib/core/error/failures.dart`

```dart
/// 失败抽象基类
///
/// 所有失败类型的基类，使用 sealed class 确保穷尽性检查。
/// Presentation 层通过 Result.when() 处理不同失败类型。
sealed class Failure {
  final String message;

  const Failure(this.message);
}

/// 网络失败
///
/// 对应 NetworkException，表示网络层面的错误。
class NetworkFailure extends Failure {
  const NetworkFailure(super.message);
}

/// API 失败
///
/// 对应 ServerException，表示业务逻辑错误。
class ApiFailure extends Failure {
  final int? errorCode;

  const ApiFailure(super.message, [this.errorCode]);
}

/// 缓存失败
class CacheFailure extends Failure {
  const CacheFailure(super.message);
}

/// 未知失败
///
/// 捕获所有未预期的异常。
class UnknownFailure extends Failure {
  const UnknownFailure(super.message);
}
```

**设计优势**:
- ✅ `sealed class`: 编译时确保所有 Failure 类型被处理
- ✅ 清晰的错误分类（网络/业务/缓存/未知）
- ✅ 统一的错误消息接口

---

### 3.3 Result 模式实现

#### 3.3.1 为什么使用 Result 模式？

**问题**: 传统异常处理的缺点
```dart
// ❌ 传统方式：抛出异常
Future<List<Article>> getArticles() async {
  try {
    final response = await api.getArticles();
    return response.data;
  } catch (e) {
    throw Exception('Failed to load articles');  // 调用方可能忘记捕获
  }
}

// 调用方必须记得 try-catch
try {
  final articles = await repository.getArticles();
} catch (e) {
  // 处理错误
}
```

**解决方案**: Result 模式强制错误处理
```dart
// ✅ Result 模式：强制处理成功/失败
Future<Result<List<Article>>> getArticles() async {
  // ...
  return Success(articles);  // 或 Failure(error)
}

// 调用方必须处理成功和失败（编译时检查）
final result = await repository.getArticles();
result.when(
  success: (articles) => print('Success'),
  failure: (error) => print('Error: ${error.message}'),
);
```

---

#### 3.3.2 Result 实现

`lib/core/network/result.dart`

```dart
/// Result 类型
///
/// 封装操作的成功/失败状态，强制调用方处理两种情况。
///
/// 设计原则:
/// - 使用 sealed class 确保穷尽性检查
/// - 提供 when() 方法进行模式匹配
/// - 支持链式调用（map、flatMap）
///
/// 示例:
/// ```dart
/// final result = await repository.getArticles();
/// result.when(
///   success: (articles) => print('获取到 ${articles.length} 篇文章'),
///   failure: (error) => print('错误: ${error.message}'),
/// );
/// ```
sealed class Result<T> {
  const Result();

  /// 模式匹配方法
  ///
  /// 强制调用方同时处理成功和失败情况。
  R when<R>({
    required R Function(T data) success,
    required R Function(Failure failure) failure,
  }) {
    return switch (this) {
      Success(:final data) => success(data),
      Failure(:final failure) => failure(failure),
    };
  }

  /// 是否成功
  bool get isSuccess => this is Success<T>;

  /// 是否失败
  bool get isFailure => this is Failure<T>;

  /// 获取数据（仅当成功时）
  T? get dataOrNull => switch (this) {
    Success(:final data) => data,
    _ => null,
  };

  /// 获取错误（仅当失败时）
  Failure? get failureOrNull => switch (this) {
    Failure(:final failure) => failure,
    _ => null,
  };
}

/// 成功结果
class Success<T> extends Result<T> {
  final T data;

  const Success(this.data);
}

/// 失败结果
class Failure<T> extends Result<T> {
  final Failure failure;

  const Failure(this.failure);
}
```

**使用示例**:

```dart
// Data 层：Repository 实现
@override
Future<Result<List<Article>>> getArticles(int page) async {
  try {
    final response = await _api.getArticleList(page);

    if (response.errorCode == 0) {
      return Success(response.data ?? []);  // ✅ 成功
    } else {
      return Failure(ApiFailure(response.errorMsg ?? '未知错误'));  // ❌ 业务失败
    }
  } on DioException catch (e) {
    return Failure(NetworkFailure(e.message ?? '网络错误'));  // ❌ 网络失败
  } catch (e) {
    return Failure(UnknownFailure(e.toString()));  // ❌ 未知失败
  }
}

// Presentation 层：BLoC 调用
Future<void> loadArticles() async {
  emit(const BlogLoading());

  final result = await _repository.getArticles(currentPage);

  result.when(
    success: (articles) {
      emit(BlogLoaded(articles));
    },
    failure: (error) {
      emit(BlogError(error.message));
    },
  );
}
```

**设计优势**:
- ✅ 编译时强制错误处理（使用 sealed class）
- ✅ 类型安全（Success\<T\> 和 Failure\<T\>）
- ✅ 清晰的成功/失败分支
- ✅ 避免异常抛出导致的应用崩溃

---

### 3.4 网络层设计

#### 3.4.1 架构设计概述

网络层是应用与远程服务器通信的核心基础设施,负责 HTTP 请求、响应处理、错误转换等功能。

**核心组件**

**1. ApiClient（HTTP 客户端）**
- **职责**:封装 Dio 实例,提供统一的网络请求能力,配置全局请求参数(baseUrl、超时、请求头)和拦截器(日志、错误处理)
- **实现方式**:基于 Dio 库封装,提供 get/post/put/delete 等方法,通过拦截器统一处理错误并转换为自定义 Exception
- **使用场景**:作为最底层的 HTTP 客户端,被上层 Service 或 DataSource 调用

**2. ApiResponse（响应包装）**
- **职责**:封装服务器返回的标准响应格式,统一处理 errorCode/errorMsg/data 三段式结构
- **实现方式**:使用泛型 `ApiResponse<T>` 配合 json_serializable 自动生成序列化代码,提供 isSuccess 便捷属性判断业务成功
- **使用场景**:所有 API 接口的返回类型,在 DataSource 层将 ApiResponse 转换为 Result 类型

**3. API 管理层（待优化）**
- **当前问题**:API 路径和请求逻辑散落在各个 DataSource 中,缺少统一管理,导致代码重复、难以维护
- **优化方向**:引入 Service 层或 Retrofit 统一管理 API 端点,实现类型安全和代码复用(详见 3.4.3)

**数据流转**

```
[Server]
   ↓ HTTP Response
[ApiClient] → 处理网络错误 → 抛出 NetworkException/ServerException
   ↓ ApiResponse<T>
[DataSource] → 检查 errorCode → 转换为 Result<T>
   ↓ Result<T>
[Repository] → 传递结果
   ↓ Result<T>
[BLoC] → 模式匹配 → 更新 UI 状态
```

**设计优势**
1. **分层清晰**:ApiClient 处理技术细节,DataSource 处理业务转换,Repository 定义契约
2. **错误可控**:网络错误在 ApiClient 层转换为 Exception,业务错误在 DataSource 层转换为 Failure
3. **易于测试**:可以轻松 Mock ApiClient 或 DataSource 进行单元测试
4. **可扩展性**:未来可以添加缓存层、重试机制、请求合并等高级功能

---

#### 3.4.2 ApiClient（Dio 客户端封装）

`lib/core/network/api_client.dart`

```dart
import 'package:dio/dio.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import '../logging/app_logger.dart';

/// API 客户端单例
///
/// 封装 Dio 实例，提供全局网络请求能力。
///
/// 职责:
/// - 配置 Dio 基础参数（BaseURL、超时等）
/// - 添加拦截器（日志、错误处理）
/// - 提供全局单例访问
///
/// 使用:
/// ```dart
/// final dio = ApiClient.instance.dio;
/// final response = await dio.get('/api/articles');
/// ```
class ApiClient {
  // 单例模式
  static final ApiClient _instance = ApiClient._internal();
  static ApiClient get instance => _instance;

  late final Dio _dio;
  Dio get dio => _dio;

  ApiClient._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: 'https://www.wanandroid.com',  // API 基础地址
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    _setupInterceptors();
  }

  /// 配置拦截器
  void _setupInterceptors() {
    _dio.interceptors.add(
      PrettyDioLogger(
        requestHeader: true,
        requestBody: true,
        responseBody: true,
        responseHeader: false,
        error: true,
        compact: true,
        maxWidth: 90,
      ),
    );

    // 可选：添加 Talker 日志拦截器
    // _dio.interceptors.add(TalkerDioLogger(talker: AppLogger.talker));
  }

  // 防止外部实例化
  factory ApiClient() => _instance;
}
```

**设计要点**:
- ✅ 单例模式：全局共享 Dio 实例，避免重复创建
- ✅ 配置分离：BaseURL、超时等配置集中管理
- ✅ 拦截器：日志、错误处理等通用逻辑

---

#### 3.4.3 ApiResponse（API 响应封装）

`lib/core/network/api_response.dart`

```dart
import 'package:json_annotation/json_annotation.dart';

part 'api_response.g.dart';

/// 通用 API 响应包装类
///
/// 玩Android API 的统一响应格式:
/// ```json
/// {
///   "data": {...},
///   "errorCode": 0,
///   "errorMsg": ""
/// }
/// ```
///
/// 设计原则:
/// - 泛型 [T] 支持不同数据类型
/// - errorCode == 0 表示成功
/// - 使用 json_serializable 自动生成序列化代码
@JsonSerializable(genericArgumentFactories: true)
class ApiResponse<T> {
  final T? data;
  final int errorCode;
  final String? errorMsg;

  const ApiResponse({
    this.data,
    required this.errorCode,
    this.errorMsg,
  });

  /// 是否成功
  bool get isSuccess => errorCode == 0;

  /// JSON 反序列化
  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) fromJsonT,
  ) =>
      _$ApiResponseFromJson(json, fromJsonT);

  /// JSON 序列化
  Map<String, dynamic> toJson(Object? Function(T value) toJsonT) =>
      _$ApiResponseToJson(this, toJsonT);
}
```

**使用示例**:

```dart
// 1. 定义 API 接口（使用 Retrofit）
@RestApi()
abstract class BlogApi {
  factory BlogApi(Dio dio) = _BlogApi;

  @GET('/banner/json')
  Future<ApiResponse<List<BannerModel>>> getBanners();

  @GET('/article/list/{page}/json')
  Future<ApiResponse<ArticleListData>> getArticleList(@Path('page') int page);
}

// 2. 调用 API
final api = BlogApi(ApiClient.instance.dio);
final response = await api.getBanners();

if (response.isSuccess) {
  final banners = response.data ?? [];
  print('获取到 ${banners.length} 个轮播图');
} else {
  print('错误: ${response.errorMsg}');
}
```

**代码生成**:

```bash
# 生成 api_response.g.dart
flutter pub run build_runner build --delete-conflicting-outputs
```

---

#### 3.4.4 API 管理方案对比（优化方向）

当前项目的 API 请求逻辑散落在各个 DataSource 中,存在代码重复、难以维护的问题。以下是几种 API 统一管理方案的对比,供后续优化参考。

**方案 1：常量管理 + 当前方式**

**实现思路**:创建 API 路径常量类,集中管理所有端点路径,DataSource 继续使用 ApiClient 直接请求。

**示例**:
```dart
// lib/core/network/api_endpoints.dart
class ApiEndpoints {
  static const String banners = '/banner/json';
  static String articleList(int page) => '/article/list/$page/json';
}

// DataSource 使用
final response = await _apiClient.get(ApiEndpoints.banners);
```

**优劣分析**:
- ✅ 实现简单,无需引入新依赖,学习成本低
- ✅ 路径集中管理,修改方便
- ❌ 仍需手动 JSON 解析,代码冗余
- ❌ 缺少类型安全,运行时才能发现错误
- 📌 **适用场景**:小型项目,API 数量少于 10 个

---

**方案 2：Service 层封装**

**实现思路**:创建 BaseService 封装通用请求逻辑,业务 Service 继承 BaseService 定义具体 API,DataSource 委托给 Service。

**示例**:
```dart
// lib/core/network/base_service.dart
abstract class BaseService {
  final ApiClient client;

  Future<ApiResponse<T>> getRequest<T>(
    String path,
    T Function(dynamic json) fromJson,
  ) async {
    final response = await client.get(path);
    return ApiResponse.fromJson(response.data!, fromJson);
  }
}

// lib/features/blog/data/services/blog_service.dart
class BlogService extends BaseService {
  Future<ApiResponse<List<BannerModel>>> getBanners() {
    return getRequest('/banner/json',
      (json) => (json as List).map((e) => BannerModel.fromJson(e)).toList()
    );
  }
}

// DataSource 使用
class BlogRemoteDataSourceImpl {
  final BlogService _service;

  Future<ApiResponse<List<BannerModel>>> fetchBanners() =>
    _service.getBanners();
}
```

**优劣分析**:
- ✅ API 集中在 Service 层,便于管理
- ✅ BaseService 减少重复代码
- ✅ 职责清晰:Service 管理 API,DataSource 实现接口
- ✅ 无需额外依赖
- ❌ 仍需手动编写 JSON 解析逻辑
- ❌ 缺少编译期类型检查
- 📌 **适用场景**:中型项目,API 数量 10-30 个,不想引入代码生成

---

**方案 3：Retrofit（代码生成）**

**实现思路**:使用 retrofit 库(Flutter 版),通过注解定义 API 接口,自动生成请求代码和 JSON 解析逻辑。

**示例**:
```dart
// lib/core/network/api/blog_api.dart
import 'package:retrofit/retrofit.dart';

part 'blog_api.g.dart';

@RestApi(baseUrl: "https://www.wanandroid.com")
abstract class BlogApi {
  factory BlogApi(Dio dio) = _BlogApi;

  @GET("/banner/json")
  Future<ApiResponse<List<BannerModel>>> getBanners();

  @GET("/article/list/{page}/json")
  Future<ApiResponse<ArticleListResponse>> getArticles(
    @Path("page") int page,
  );
}

// DataSource 使用
class BlogRemoteDataSourceImpl {
  final BlogApi _api;

  Future<ApiResponse<List<BannerModel>>> fetchBanners() =>
    _api.getBanners();
}
```

**优劣分析**:
- ✅ 类型安全,编译期检查 API 定义
- ✅ 自动生成 JSON 解析代码,无需手动编写
- ✅ 代码简洁,符合 Android Retrofit 习惯
- ✅ 易于 Mock 和测试
- ❌ 引入新依赖和学习成本
- ❌ 需要代码生成步骤
- ❌ 生成代码可能难以调试
- 📌 **适用场景**:大中型项目,API 数量超过 30 个,团队熟悉 Retrofit

---

**方案 4：混合方案（推荐）**

**实现思路**:结合方案 1 和方案 2,使用常量管理路径 + Service 层封装逻辑,利用现有的 json_serializable。

**示例**:
```dart
// lib/core/network/api_endpoints.dart
class ApiEndpoints {
  static const String banners = '/banner/json';
  static String articleList(int page) => '/article/list/$page/json';
}

// lib/core/network/base_service.dart
abstract class BaseService {
  final ApiClient client;

  Future<ApiResponse<T>> getRequest<T>(
    String path,
    T Function(dynamic json) fromJson,
  ) async {
    final response = await client.get(path);
    return ApiResponse.fromJson(response.data!, fromJson);
  }
}

// lib/features/blog/data/services/blog_service.dart
class BlogService extends BaseService {
  Future<ApiResponse<List<BannerModel>>> getBanners() {
    return getRequest(ApiEndpoints.banners,
      (json) => (json as List).map((e) => BannerModel.fromJson(e)).toList()
    );
  }
}
```

**优劣分析**:
- ✅ 路径统一管理,修改方便
- ✅ Service 层减少重复代码
- ✅ 无需新依赖,利用现有 json_serializable
- ✅ 渐进式优化,未来可迁移到 Retrofit
- ✅ 职责清晰,易于理解
- ❌ 仍需手动编写部分解析代码
- 📌 **适用场景**:中型项目,希望平衡简洁性和可维护性(当前项目推荐)

---

**方案选择建议**

| 项目规模 | API 数量 | 推荐方案 | 理由 |
|---------|---------|---------|------|
| 小型 | < 10 | 方案 1 | 简单直接,无需过度设计 |
| 中型 | 10-30 | 方案 4 ⭐ | 平衡可维护性和复杂度 |
| 大型 | > 30 | 方案 3 | 类型安全,自动化程度高 |

**当前项目建议**:采用方案 4(混合方案),在保持简洁的同时提升可维护性,为未来扩展预留空间。

---

### 3.5 日志系统（Talker）

#### 3.5.1 架构设计概述

日志系统是应用开发和运维的重要基础设施,负责记录应用运行状态、调试信息、错误追踪等,帮助开发者快速定位问题。

**核心组件**

**1. TalkerConfig（全局配置）**
- **职责**:管理 Talker 实例的全局配置,包括日志级别、输出方式、历史记录等,提供统一的日志入口
- **实现方式**:使用单例模式封装 Talker 实例,通过 `TalkerFlutter.init()` 初始化配置,提供静态访问器供全局使用
- **配置项**:日志级别(verbose/debug/info/warning/error)、彩色输出、控制台日志、历史记录持久化

**2. AppLogger（应用日志封装）**
- **职责**:为应用提供统一的日志接口,封装 Talker 的底层 API,简化日志调用并提供语义化方法
- **实现方式**:静态工具类,内部委托给 TalkerConfig.talker,提供 debug/info/warning/error 等分级方法,支持异常和堆栈追踪
- **扩展功能**:提供 logRequest/logResponse 等业务日志方法,方便追踪网络请求

**3. AppBlocObserver（BLoC 日志观察器）**
- **职责**:自动监听所有 BLoC/Cubit 的生命周期和状态变化,记录创建、事件、状态转换、错误、销毁等关键节点
- **实现方式**:继承 `BlocObserver`,重写 onCreate/onChange/onEvent/onError/onClose 方法,通过 AppLogger 输出日志
- **监听内容**:BLoC 创建/销毁、事件触发、状态变化(currentState → nextState)、异常捕获

**4. TalkerDioLogger（网络日志拦截器）**
- **职责**:拦截所有 Dio 网络请求和响应,自动记录请求方法、URL、参数、响应状态、耗时等信息
- **实现方式**:作为 Dio 拦截器添加到 ApiClient,根据环境配置决定日志详细程度(开发环境详细,生产环境精简)
- **记录内容**:请求头/请求体/响应头/响应体/错误信息/请求耗时

**日志流转**

```
[应用各层]
   ↓
[AppLogger.info/error/debug] → 统一日志入口
   ↓
[TalkerConfig.talker] → Talker 核心
   ↓ ├─ 控制台输出（开发调试）
   ↓ ├─ 历史记录存储（持久化）
   ↓ └─ TalkerScreen 查看器（可视化）

[BLoC 状态管理]
   ↓
[AppBlocObserver] → 自动监听 BLoC 事件
   ↓
[AppLogger] → 输出 BLoC 日志

[网络请求]
   ↓
[TalkerDioLogger 拦截器] → 拦截 Dio 请求
   ↓
[TalkerConfig.talker] → 输出网络日志
```

**设计优势**
1. **统一入口**:AppLogger 提供一致的日志接口,避免直接使用 Talker 导致的耦合
2. **自动化**:BLoC 和网络日志自动记录,无需手动调用,减少遗漏
3. **分级管理**:支持多级日志(debug/info/warning/error),可根据环境动态调整
4. **可视化**:内置 TalkerScreen 提供日志查看 UI,方便现场调试
5. **持久化**:日志历史记录可持久化存储,支持问题追溯
6. **开发友好**:彩色输出、格式化、堆栈追踪,提升调试效率

**使用场景**
- **应用启动**:记录初始化步骤和耗时
- **网络请求**:自动记录所有 API 调用(通过 TalkerDioLogger)
- **状态管理**:自动记录所有 BLoC 状态变化(通过 AppBlocObserver)
- **错误追踪**:记录异常信息和堆栈,便于问题定位
- **性能监控**:记录关键操作耗时,分析性能瓶颈

---

#### 3.5.2 为什么使用 Talker？

Talker 是一个全面的 Flutter 日志库，提供：
- ✅ 多种日志级别（debug/info/warning/error）
- ✅ 集成 Dio/BLoC/路由日志
- ✅ 日志持久化和查看器 UI
- ✅ 彩色输出和格式化

#### 3.5.3 Talker 配置

`lib/core/logging/talker_config.dart`

```dart
import 'package:talker_flutter/talker_flutter.dart';

/// Talker 全局配置
///
/// 单例模式管理 Talker 实例，提供全局日志能力。
///
/// 使用:
/// ```dart
/// TalkerConfig.talker.info('应用启动');
/// TalkerConfig.talker.error('网络请求失败', error, stackTrace);
/// ```
class TalkerConfig {
  static final Talker _talker = TalkerFlutter.init(
    settings: TalkerSettings(
      // 启用所有日志类型
      enabled: true,
      useConsoleLogs: true,  // 控制台输出
      useHistory: true,      // 保存历史记录
    ),
    logger: TalkerLogger(
      settings: TalkerLoggerSettings(
        // 日志级别（开发环境显示所有，生产环境仅 error）
        level: LogLevel.verbose,
        enableColors: true,  // 彩色输出
      ),
    ),
  );

  static Talker get talker => _talker;

  /// 初始化 Talker
  static void init() {
    talker.info('Talker 日志系统已初始化');
  }

  /// 显示日志查看器
  static void showLogs(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TalkerScreen(talker: talker),
      ),
    );
  }
}
```

---

#### 3.5.4 应用日志封装

`lib/core/logging/app_logger.dart`

```dart
import 'talker_config.dart';

/// 应用日志工具类
///
/// 提供统一的日志接口，内部使用 Talker。
class AppLogger {
  static final talker = TalkerConfig.talker;

  /// Debug 日志
  static void debug(String message) {
    talker.debug(message);
  }

  /// Info 日志
  static void info(String message) {
    talker.info(message);
  }

  /// Warning 日志
  static void warning(String message, [Object? exception, StackTrace? stackTrace]) {
    talker.warning(message, exception, stackTrace);
  }

  /// Error 日志
  static void error(String message, [Object? exception, StackTrace? stackTrace]) {
    talker.error(message, exception, stackTrace);
  }

  /// 记录网络请求
  static void logRequest(String method, String url, {Map<String, dynamic>? data}) {
    talker.info('[$method] $url ${data != null ? '\nData: $data' : ''}');
  }

  /// 记录网络响应
  static void logResponse(String url, int statusCode, {dynamic data}) {
    talker.info('[$statusCode] $url ${data != null ? '\nResponse: $data' : ''}');
  }
}
```

**使用示例**:

```dart
// 应用启动
AppLogger.info('Flutter Run 应用启动');

// 网络请求
AppLogger.logRequest('GET', '/api/articles');
AppLogger.logResponse('/api/articles', 200, data: articles);

// 错误日志
try {
  await fetchData();
} catch (e, stackTrace) {
  AppLogger.error('数据加载失败', e, stackTrace);
}
```

---

#### 3.5.5 BLoC 日志观察器

`lib/core/logging/app_bloc_observer.dart`

```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'app_logger.dart';

/// BLoC 日志观察器
///
/// 监听所有 BLoC/Cubit 的状态变化和事件。
class AppBlocObserver extends BlocObserver {
  @override
  void onCreate(BlocBase bloc) {
    super.onCreate(bloc);
    AppLogger.debug('BLoC Created: ${bloc.runtimeType}');
  }

  @override
  void onChange(BlocBase bloc, Change change) {
    super.onChange(bloc, change);
    AppLogger.debug(
      'BLoC Changed: ${bloc.runtimeType}\n'
      'Current: ${change.currentState}\n'
      'Next: ${change.nextState}',
    );
  }

  @override
  void onEvent(Bloc bloc, Object? event) {
    super.onEvent(bloc, event);
    AppLogger.debug('BLoC Event: ${bloc.runtimeType} - $event');
  }

  @override
  void onError(BlocBase bloc, Object error, StackTrace stackTrace) {
    super.onError(bloc, error, stackTrace);
    AppLogger.error('BLoC Error: ${bloc.runtimeType}', error, stackTrace);
  }

  @override
  void onClose(BlocBase bloc) {
    super.onClose(bloc);
    AppLogger.debug('BLoC Closed: ${bloc.runtimeType}');
  }
}
```

**注册观察器**:

```dart
// lib/main.dart
void main() {
  // 初始化 Talker
  TalkerConfig.init();

  // 注册 BLoC 观察器
  Bloc.observer = AppBlocObserver();

  runApp(const MyApp());
}
```

---

### 3.6 BLoC/Cubit 状态管理

#### 3.6.1 架构设计概述

BLoC (Business Logic Component) 是本项目采用的状态管理方案,负责管理 UI 状态、处理业务逻辑、协调数据流转,是 Clean Architecture 中 Presentation 层的核心组件。

**核心概念**

**1. BLoC 模式**
- **全称**:Business Logic Component(业务逻辑组件)
- **设计理念**:将业务逻辑与 UI 完全分离,通过事件(Event)驱动状态(State)变化,UI 监听状态更新并重新渲染
- **数据流**:单向数据流 - UI 发送 Event → BLoC 处理 → 发出新 State → UI 更新
- **适用场景**:复杂的业务逻辑、需要事件驱动的场景(如列表加载、表单提交)

**2. Cubit 模式**
- **定义**:BLoC 的简化版本,直接通过方法调用触发状态变化,无需定义 Event
- **设计理念**:更轻量、更直观,适合简单的状态管理场景
- **数据流**:UI 调用方法 → Cubit 处理 → 发出新 State → UI 更新
- **适用场景**:简单的状态管理、配置管理、开关状态

**BLoC vs Cubit 对比**

| 特性 | BLoC | Cubit |
|------|------|-------|
| 复杂度 | 较高(需要定义 Event) | 较低(直接调用方法) |
| 事件追踪 | ✅ 完整的事件日志 | ❌ 无事件概念 |
| 适用场景 | 复杂业务逻辑 | 简单状态管理 |
| 代码量 | 较多 | 较少 |
| 可测试性 | ✅ 事件可单独测试 | ✅ 方法可直接测试 |
| 项目示例 | BlogBloc | SettingsCubit |

**核心组件**

**1. State(状态)**
- **职责**:表示 UI 在某一时刻的完整状态,是不可变的数据类
- **实现方式**:使用 sealed class 或普通类,配合 Equatable 实现值比较,确保状态变化可被检测
- **状态类型**:通常包含 Initial(初始)、Loading(加载中)、Loaded(已加载)、Error(错误)等

**2. Event(事件 - 仅 BLoC)**
- **职责**:表示用户操作或系统事件,触发业务逻辑执行
- **实现方式**:使用 sealed class 定义所有可能的事件类型,确保事件可穷举
- **事件类型**:如 LoadData、RefreshData、UpdateItem 等

**3. BLoC/Cubit(业务逻辑组件)**
- **职责**:接收事件或方法调用,执行业务逻辑,调用 Repository 获取数据,发出新状态
- **生命周期**:由 BlocProvider 管理,支持全局或页面级作用域
- **核心方法**:
  - BLoC: `on<Event>()` 注册事件处理器
  - Cubit: 直接定义业务方法
  - 共同: `emit()` 发出新状态

**4. BlocProvider(提供器)**
- **职责**:在 Widget 树中提供 BLoC/Cubit 实例,管理其生命周期(创建、销毁)
- **实现方式**:使用 InheritedWidget 实现依赖注入,子组件通过 `context.read()` 或 `context.watch()` 访问
- **作用域**:可以是全局(App 级别)或局部(Page 级别)

**5. BlocBuilder(构建器)**
- **职责**:监听 BLoC/Cubit 的状态变化,根据新状态重新构建 UI
- **实现方式**:使用 StreamBuilder 监听状态流,每次状态变化时触发 builder 回调
- **性能优化**:支持 buildWhen 条件判断,避免不必要的重建

**6. BlocListener(监听器)**
- **职责**:监听状态变化并执行副作用(如导航、显示 SnackBar),不重建 UI
- **实现方式**:监听状态流,根据 listenWhen 条件决定是否执行 listener 回调
- **使用场景**:显示提示、导航跳转、日志记录等一次性操作

**数据流转(以 BlogBloc 为例)**

```
[UI 层 - BlogPage]
   ↓ 用户下拉刷新
[发送事件] add(RefreshBlogData())
   ↓
[BlogBloc] on<RefreshBlogData>() 事件处理器
   ↓
[调用 Repository] _repository.getArticles()
   ↓
[Repository 返回] Result<List<Article>>
   ↓
[BLoC 处理 Result]
   ├─ Success → emit(BlogLoaded(articles))
   └─ Failure → emit(BlogError(message))
   ↓
[BlocBuilder 监听到新状态]
   ↓
[UI 重建] 根据状态渲染对应 Widget
   ├─ BlogLoaded → 显示文章列表
   └─ BlogError → 显示错误提示
```

**项目中的实际应用**

**1. SettingsCubit - 全局设置管理**
- **作用域**:全局(整个应用)
- **生命周期**:应用启动时创建,应用关闭时销毁
- **状态**:SettingsState(包含主题、语言、字体等配置)
- **方法**:setThemeMode()、setThemeColor()、setLanguage()
- **使用位置**:`AppRouter.createRouterApp()` 中的 BlocProvider
- **数据持久化**:使用 SharedPreferences 保存设置

**2. BlogBloc - 博客页面状态管理**
- **作用域**:页面级(仅 BlogPage)
- **生命周期**:进入页面时创建,离开页面时销毁
- **状态**:BlogInitial、BlogLoading、BlogLoaded、BlogError
- **事件**:LoadBlogData、RefreshBlogData、LoadMoreArticles
- **使用位置**:`BlogPage` 中的 BlocProvider
- **业务逻辑**:轮播图加载、文章分页、下拉刷新、错误处理

**使用示例**

**示例 1: BlocProvider 提供 BLoC**
```dart
// 页面级 BLoC
BlocProvider(
  create: (context) => BlogBloc(repository)..add(LoadBlogData()),
  child: BlogPage(),
)

// 全局 Cubit
BlocProvider(
  create: (context) => SettingsCubit()..init(),
  child: MaterialApp.router(...),
)
```

**示例 2: BlocBuilder 构建 UI**
```dart
BlocBuilder<BlogBloc, BlogState>(
  builder: (context, state) {
    return switch (state) {
      BlogInitial() => const SizedBox.shrink(),
      BlogLoading() => const CircularProgressIndicator(),
      BlogLoaded(:final articles) => ListView.builder(...),
      BlogError(:final message) => Text('错误: $message'),
    };
  },
)
```

**示例 3: BlocListener 处理副作用**
```dart
BlocListener<BlogBloc, BlogState>(
  listener: (context, state) {
    if (state is BlogError) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(state.message)),
      );
    }
  },
  child: BlogContent(),
)
```

**示例 4: 发送事件/调用方法**
```dart
// BLoC: 发送事件
context.read<BlogBloc>().add(RefreshBlogData());

// Cubit: 调用方法
context.read<SettingsCubit>().setThemeMode(ThemeMode.dark);
```

---

#### 3.6.2 BLoC vs 其他状态管理方案对比

Flutter 生态中有多种状态管理方案,以下是与 BLoC 的详细对比。

**方案 1: Provider**

**核心思想**:基于 InheritedWidget 的依赖注入和状态管理。

**优势**:
- ✅ 简单易学,官方推荐
- ✅ 轻量级,性能优秀
- ✅ 与 Flutter 深度集成

**劣势**:
- ❌ 缺少明确的架构模式
- ❌ 业务逻辑容易与 UI 耦合
- ❌ 大型项目难以维护

**适用场景**:小型项目、简单状态共享

---

**方案 2: Riverpod**

**核心思想**:Provider 的改进版,编译时安全、无 Context 依赖。

**优势**:
- ✅ 编译时类型安全
- ✅ 无需 BuildContext
- ✅ 更好的测试支持
- ✅ 自动资源管理

**劣势**:
- ❌ 学习曲线陡峭
- ❌ 概念较多(Provider、StateNotifier、FutureProvider 等)
- ❌ 社区资源相对较少

**适用场景**:中大型项目、重视类型安全的团队

---

**方案 3: GetX**

**核心思想**:全家桶式解决方案,包含状态管理、路由、依赖注入。

**优势**:
- ✅ 功能全面(状态管理 + 路由 + DI)
- ✅ 代码简洁,开发效率高
- ✅ 性能优秀(响应式更新)

**劣势**:
- ❌ 过度依赖框架,难以迁移
- ❌ 违背 Flutter 设计理念(如不使用 BuildContext)
- ❌ 全局状态容易导致混乱

**适用场景**:快速原型、小型商业项目

---

**方案 4: Redux**

**核心思想**:单向数据流,全局单一状态树。

**优势**:
- ✅ 可预测的状态管理
- ✅ 完整的开发者工具(时间旅行调试)
- ✅ 社区成熟(来自 React 生态)

**劣势**:
- ❌ 样板代码过多
- ❌ 学习曲线陡峭
- ❌ 不适合小型项目

**适用场景**:超大型项目、需要状态回溯

---

**方案 5: BLoC (本项目采用)**

**核心思想**:事件驱动的业务逻辑组件,强制分离 UI 和业务逻辑。

**优势**:
- ✅ 架构清晰,强制分离关注点
- ✅ 可测试性极强(Event/State 独立测试)
- ✅ 完整的日志和调试工具(BlocObserver)
- ✅ 适配 Clean Architecture
- ✅ 状态可追溯(事件日志)
- ✅ 团队协作友好(统一模式)

**劣势**:
- ❌ 学习曲线较陡(需理解 Event/State 概念)
- ❌ 样板代码较多(需定义 Event、State、BLoC)
- ❌ 简单场景可能过度设计

**适用场景**:中大型项目、重视架构和可维护性的团队

---

**方案选择建议**

| 项目规模 | 团队经验 | 推荐方案 | 理由 |
|---------|---------|---------|------|
| 小型 | 新手 | Provider | 简单易学,快速上手 |
| 小型 | 有经验 | Riverpod | 类型安全,现代化 |
| 中型 | 新手 | GetX | 全家桶,开发效率高 |
| 中型 | 有经验 | BLoC ⭐ | 架构清晰,可维护性强 |
| 大型 | 有经验 | BLoC / Redux | 强架构约束,可扩展 |

**本项目选择 BLoC 的原因**:
1. **符合 Clean Architecture**:BLoC 天然适配分层架构,职责清晰
2. **可测试性强**:Event 和 State 都可独立测试,覆盖率高
3. **团队协作友好**:统一的模式减少代码风格差异
4. **状态可追溯**:完整的事件日志便于问题排查
5. **长期维护**:清晰的架构降低维护成本

---

#### 3.6.3 BLoC 最佳实践

**1. 状态设计原则**
- ✅ 使用 sealed class 或 Equatable 确保状态可比较
- ✅ 状态应是不可变的(使用 final 字段)
- ✅ 避免在 State 中存储逻辑,只存储数据
- ✅ 使用 copyWith 方法更新状态

**2. 事件设计原则**
- ✅ 事件名使用动词(Load、Refresh、Update)
- ✅ 一个事件对应一个明确的用户操作
- ✅ 避免事件携带过多参数

**3. BLoC 职责边界**
- ✅ BLoC 只处理业务逻辑,不直接操作 UI
- ✅ 通过 Repository 获取数据,不直接调用 API
- ✅ 使用 Result 模式处理错误,不抛出异常

**4. 性能优化**
- ✅ 使用 buildWhen 减少不必要的重建
- ✅ 避免在 BLoC 中进行耗时同步操作
- ✅ 合理划分 BLoC 作用域(全局 vs 页面级)

**5. 测试建议**
- ✅ 为每个 BLoC 编写单元测试
- ✅ 使用 blocTest 包简化测试编写
- ✅ Mock Repository 隔离测试

---

### 3.7 平台适配层

#### 3.7.1 操作系统检测

`lib/core/platform/os.dart`

```dart
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

/// 操作系统枚举
enum OS {
  android,
  ios,
  macos,
  windows,
  linux,
  web,
  unknown;

  /// 获取当前操作系统
  static OS get current {
    if (kIsWeb) return OS.web;

    if (Platform.isAndroid) return OS.android;
    if (Platform.isIOS) return OS.ios;
    if (Platform.isMacOS) return OS.macos;
    if (Platform.isWindows) return OS.windows;
    if (Platform.isLinux) return OS.linux;

    return OS.unknown;
  }

  /// 是否为移动端
  bool get isMobile => this == OS.android || this == OS.ios;

  /// 是否为桌面端
  bool get isDesktop => this == OS.macos || this == OS.windows || this == OS.linux;

  /// 是否为 Web
  bool get isWeb => this == OS.web;
}
```

---

#### 3.6.2 平台适配器

`lib/core/platform/platform_adapter.dart`

```dart
import 'os.dart';
import '../logging/app_logger.dart';

/// 平台适配器
///
/// 根据不同平台提供差异化功能。
class PlatformAdapter {
  /// 打印平台信息
  static void printPlatformInfo() {
    final os = OS.current;
    AppLogger.info('当前平台: $os (${os.isMobile ? '移动端' : os.isDesktop ? '桌面端' : 'Web'})');
  }

  /// 获取推荐的侧边栏宽度
  static double getSidebarWidth() {
    return OS.current.isDesktop ? 240.0 : 0.0;  // 桌面端显示侧边栏
  }

  /// 获取推荐的内容最大宽度
  static double getMaxContentWidth() {
    return OS.current.isDesktop ? 1200.0 : double.infinity;
  }

  /// 是否显示桌面窗口控制按钮
  static bool get shouldShowWindowButtons => OS.current.isDesktop;
}
```

**使用示例**:

```dart
// 自适应布局
Widget build(BuildContext context) {
  final showSidebar = OS.current.isDesktop;

  return Scaffold(
    body: Row(
      children: [
        if (showSidebar)
          SizedBox(
            width: PlatformAdapter.getSidebarWidth(),
            child: const NavigationRail(...),
          ),
        Expanded(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: PlatformAdapter.getMaxContentWidth(),
            ),
            child: content,
          ),
        ),
      ],
    ),
  );
}
```

---

### 3.8 小结

本章完成了 Clean Architecture 的核心基础设施搭建：

| 模块 | 职责 | 文件 |
|------|------|------|
| **错误处理** | Exception/Failure 分离 | `core/error/` |
| **Result 模式** | 强制错误处理 | `core/network/result.dart` |
| **网络层** | Dio 封装 + API 响应 | `core/network/` |
| **日志系统** | Talker 集成 | `core/logging/` |
| **BLoC 状态管理** | 业务逻辑与 UI 分离 | `flutter_bloc` |
| **平台适配** | 跨平台差异处理 | `core/platform/` |

**下一章**: 基于这些基础设施，实现路由系统和页面框架。

---

## 第四章：路由系统和页面框架

> **对应提交**: `d4f599b` feat: 实现 go_router 路由管理和页面框架
>
> **本章目标**: 使用 go_router 实现声明式路由管理，搭建多标签页面框架。

### 4.1 架构设计概述

路由系统是应用导航的核心基础设施,负责管理页面跳转、URL 解析、导航栏状态、深度链接等功能。

**核心组件**

**1. go_router（路由引擎）**
- **职责**:提供声明式路由配置,管理路由栈、URL 解析、页面跳转等核心功能
- **实现方式**:使用 `GoRouter` 类定义路由表,通过 `GoRoute` 配置路径和页面映射,支持 `ShellRoute` 实现嵌套导航
- **核心功能**:
  - 路径匹配:支持静态路径(/blog)和动态参数(/user/:id)
  - 路由守卫:通过 redirect 实现权限检查和条件跳转
  - Deep Link:自动解析 URL,支持 Web 和移动端深度链接
  - 错误处理:内置 errorBuilder 处理 404 和路由错误

**2. AppRouter（路由配置）**
- **职责**:封装 GoRouter 配置,定义应用的路由表,管理 Splash 和主应用路由的分离
- **实现方式**:静态类提供 `createRouter()` 方法创建 GoRouter 实例,使用 `ShellRoute` 包裹主功能页面实现导航栏外壳
- **设计特点**:
  - Splash 独立路由:启动页不在 ShellRoute 内,避免显示导航栏
  - 平台适配:桌面端使用 ShellRoute 显示侧边导航,移动端直接展示页面
  - 嵌套路由:Settings 页面的子路由通过 routes 参数配置

**3. ShellRoute（导航外壳）**
- **职责**:为子路由提供持久化的外壳界面,实现导航栏在页面切换时保持不变
- **实现方式**:包裹所有主功能路由,builder 返回带导航栏的布局组件,child 参数是当前路由的页面
- **使用场景**:
  - 桌面端:AppDeskNavigation(侧边导航栏 + 内容区)
  - 移动端:直接展示页面,不使用 ShellRoute

**4. AppDeskNavigation（桌面导航）**
- **职责**:桌面端的侧边导航栏组件,提供导航菜单、路由跳转、当前页高亮等功能
- **实现方式**:接收 content 作为内容区,使用 Row 布局实现侧边栏 + 内容的分栏结构
- **导航逻辑**:监听当前路由路径,高亮对应菜单项,点击菜单使用 `context.go()` 跳转

**5. AppTab（导航模型）**
- **职责**:定义应用的主导航标签数据模型,包含路径、图标、标题等信息
- **实现方式**:使用枚举定义所有标签,每个标签包含 path、icon、title、国际化 key 等属性
- **使用位置**:AppDeskNavigation 读取 AppTab 列表渲染导航菜单

**路由流转**

```
[应用启动]
   ↓
[GoRouter.initialLocation = '/'] → Splash 页面
   ↓ 启动完成后
[context.go('/widget')] → 跳转到首页
   ↓
[GoRouter 匹配路由] /widget
   ↓
[判断平台] 是否桌面端?
   ├─ 是 → ShellRoute
   │         ↓
   │      AppDeskNavigation(侧边导航 + WidgetPage)
   │
   └─ 否 → 直接渲染 WidgetPage

[用户点击导航菜单]
   ↓
[context.go('/blog')] → 触发路由跳转
   ↓
[GoRouter 匹配路由] /blog
   ↓
[ShellRoute.builder] 保持 AppDeskNavigation 不变
   ↓
[ShellRoute.child] 更新为 BlogPage
   ↓
[UI 重建] 导航栏保持,内容区更新为 BlogPage
```

**设计优势**
1. **声明式配置**:所有路由在一处定义,结构清晰,易于维护
2. **平台适配**:通过 PlatformAdapter 自动适配桌面端和移动端的导航方式
3. **持久化导航**:ShellRoute 确保导航栏在页面切换时不重建,提升性能
4. **类型安全**:路径使用字符串常量,编译期可检查
5. **Deep Link 支持**:自动解析 URL,支持 Web 分享和移动端唤起
6. **错误处理**:统一的 404 页面,提供返回首页功能

**路由结构**

```
/ (Splash)                        ← 独立路由
│
└─ ShellRoute (桌面端)            ← 导航外壳
    ├─ /widget                    ← 组件库页面
    ├─ /blog                      ← 博客页面
    ├─ /painter                   ← 画板页面
    ├─ /knowledge                 ← 知识库页面
    ├─ /tools                     ← 工具页面
    ├─ /account                   ← 账号页面
    └─ /settings                  ← 设置页面
        ├─ /settings/theme_mode   ← 主题模式设置
        ├─ /settings/theme_color  ← 主题色设置
        ├─ /settings/font         ← 字体设置
        ├─ /settings/language     ← 语言设置
        ├─ /settings/version      ← 版本信息
        └─ /settings/logs         ← 日志查看器
```

**使用场景**
- **应用启动**:从 Splash 自动跳转到首页
- **页面跳转**:点击导航菜单切换页面
- **嵌套导航**:Settings 页面内的子页面跳转
- **Deep Link**:通过 URL 直接访问特定页面
- **错误处理**:访问不存在的路径显示 404 页面

---

### 4.2 为什么选择 go_router？

**传统路由的问题**:
```dart
// ❌ 命令式路由：代码冗长，类型不安全
Navigator.push(
  context,
  MaterialPageRoute(builder: (context) => BlogPage()),
);

// ❌ 不支持 Deep Link
// ❌ 不支持路由守卫
// ❌ 嵌套路由复杂
```

**go_router 的优势**:
- ✅ 声明式路由配置
- ✅ 支持 Deep Link 和 Web URL
- ✅ 类型安全的路由导航
- ✅ 支持 ShellRoute（嵌套导航）
- ✅ 内置错误页面处理
- ✅ 路由重定向和守卫

---

### 4.3 路由配置

#### 4.3.1 AppRouter 设计

`lib/core/router/app_router.dart`

```dart
import 'package:go_router/go_router.dart';
import '../platform/platform_adapter.dart';
import '../navigation/view/desktop/app_desk_navigation.dart';
import '../app/splash/splash_page.dart';
// ...导入各页面

/// AppRouter: 应用路由配置
///
/// 使用 ShellRoute 实现导航栏外壳
class AppRouter {
  /// 创建 GoRouter 实例
  static GoRouter createRouter() {
    // Splash 路由（独立，不在 ShellRoute 内）
    final splashRoute = GoRoute(
      path: '/',
      builder: (context, state) => const FlutterRunSplash(),
    );

    // 主功能路由（除去 Splash）
    final mainRoutes = [
      GoRoute(
        path: '/widget',
        builder: (context, state) => const WidgetPage(),
      ),
      GoRoute(
        path: '/blog',
        builder: (context, state) => const BlogPage(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsPage(),
        routes: [
          // 子路由：设置页面的各个子页面
          GoRoute(
            path: 'theme_mode',  // 完整路径: /settings/theme_mode
            builder: (context, state) => const ThemeModePage(),
          ),
          GoRoute(
            path: 'theme_color',
            builder: (context, state) => const ThemeColorPage(),
          ),
          GoRoute(
            path: 'language',
            builder: (context, state) => const LanguageSettingPage(),
          ),
        ],
      ),
    ];

    return GoRouter(
      initialLocation: '/', // 初始路由为 Splash
      routes: <RouteBase>[
        // Splash 路由（独立）
        splashRoute,

        // 主体路由 - 根据平台判断是否使用 ShellRoute
        if (PlatformAdapter.isDesktopUI)
          ShellRoute(
            // 桌面端：使用 ShellRoute 包裹导航栏
            builder: (context, state, Widget child) =>
                AppDeskNavigation(content: child),
            routes: mainRoutes,
          ),
        if (!PlatformAdapter.isDesktopUI)
          // 移动端：直接使用路由
          ...mainRoutes,
      ],
      // 错误页面
      errorBuilder: (context, state) => Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text('页面不存在: ${state.uri}'),
              ElevatedButton(
                onPressed: () => context.go('/widget'),
                child: const Text('返回首页'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

**设计要点**:
1. **Splash 独立路由**: 不在导航栏外壳内，避免显示导航栏
2. **ShellRoute 条件使用**: 桌面端使用外壳，移动端不使用
3. **子路由配置**: 使用 `routes` 参数定义嵌套路由
4. **错误处理**: 提供友好的 404 页面

---

#### 4.2.2 ShellRoute 原理

**ShellRoute 的作用**: 为一组路由提供共同的外壳（如导航栏）

```
┌─────────────────────────────────────┐
│   AppDeskNavigation (外壳)         │
│  ┌─────────────┬─────────────────┐ │
│  │ Navigation  │                 │ │
│  │   Rail      │     child       │ │  ← child 根据路由变化
│  │  (侧边栏)   │  (WidgetPage/   │ │
│  │             │   BlogPage/...) │ │
│  └─────────────┴─────────────────┘ │
└─────────────────────────────────────┘
```

**路由导航示例**:

```dart
// 在任意页面中导航
context.go('/blog');          // 跳转到博客页面
context.go('/settings/theme_mode');  // 跳转到主题设置
context.push('/settings');    // 压栈导航（可返回）
context.pop();                // 返回上一页
```

---

### 4.4 AppTab 导航模型

#### 4.4.1 定义导航标签

`lib/core/navigation/model/app_tab.dart`

```dart
import 'package:flutter/material.dart';

/// 应用标签页枚举
///
/// 定义应用的所有主要功能模块
enum AppTab {
  widget('/widget', Icons.widgets_outlined),
  blog('/blog', Icons.article_outlined),
  painter('/painter', Icons.brush_outlined),
  knowledge('/knowledge', Icons.school_outlined),
  tools('/tools', Icons.build_outlined),
  account('/account', Icons.person_outlined);

  final String path;
  final IconData icon;

  const AppTab(this.path, this.icon);

  /// 获取国际化标签
  String label(BuildContext context) {
    final l10n = context.l10n;
    switch (this) {
      case AppTab.widget:
        return l10n.navWidget;
      case AppTab.blog:
        return l10n.navBlog;
      case AppTab.painter:
        return l10n.navPainter;
      case AppTab.knowledge:
        return l10n.navKnowledge;
      case AppTab.tools:
        return l10n.navTools;
      case AppTab.account:
        return l10n.navAccount;
    }
  }
}
```

**设计优势**:
- ✅ 集中管理所有标签页配置
- ✅ 类型安全的枚举
- ✅ 图标和路径关联
- ✅ 方便扩展新标签页

---

### 4.5 集成 MaterialApp

#### 4.5.1 创建 RouterApp

`lib/core/router/app_router.dart`（续）

```dart
/// 创建 MaterialApp.router 实例
static Widget createRouterApp() {
  final router = createRouter();

  // 创建全局的 SettingsCubit 实例
  return BlocProvider(
    create: (context) => SettingsCubit()..init(),
    child: BlocBuilder<SettingsCubit, dynamic>(
      builder: (context, settingsState) {
        final settings = context.watch<SettingsCubit>().state;

        // 根据语言代码确定 Locale
        Locale? locale;
        if (settings.languageCode != null) {
          locale = Locale(settings.languageCode!);
        }

        return MaterialApp.router(
          title: 'Flutter Run',
          debugShowCheckedModeBanner: false,
          routerConfig: router,  // ✅ 使用 GoRouter

          // 国际化配置
          locale: locale,
          localizationsDelegates: const [
            AppLocalizationsDelegate(),
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: const [
            Locale('zh', 'CN'), // 简体中文
            Locale('en', 'US'), // 英文
          ],

          // 主题配置（根据设置动态切换）
          themeMode: settings.themeMode,
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(
              seedColor: settings.themeColor,
            ),
            useMaterial3: true,
          ),
          darkTheme: ThemeData(
            colorScheme: ColorScheme.fromSeed(
              seedColor: settings.themeColor,
              brightness: Brightness.dark,
            ),
            useMaterial3: true,
          ),

          // 字体缩放
          builder: (context, child) {
            return MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: TextScaler.linear(settings.fontScale),
              ),
              child: child!,
            );
          },
        );
      },
    ),
  );
}
```

**设计要点**:
1. **全局 SettingsCubit**: 管理应用设置状态
2. **响应式主题**: 根据设置动态切换主题色和模式
3. **国际化集成**: 支持中英文切换
4. **字体缩放**: 支持用户自定义字体大小

---

### 4.6 小结

本章完成了路由系统的搭建：

| 组件 | 职责 | 文件 |
|------|------|------|
| **AppRouter** | 路由配置和创建 | `core/router/app_router.dart` |
| **AppTab** | 导航标签模型 | `core/navigation/model/app_tab.dart` |
| **ShellRoute** | 桌面端导航外壳 | 条件使用 |
| **GoRouter** | 声明式路由管理 | go_router 包 |

**下一章**: 实现桌面端的响应式布局和自定义窗口控制。

---

## 第五章：桌面端适配和窗口控制

> **对应提交**:
> - `e7472c4` feat: 优化桌面端 UI - 修复导航栏溢出并美化窗口控制按钮
> - `e961e5c` feat: 隐藏 macOS 原生窗口控制按钮
>
> **本章目标**: 实现桌面端的响应式布局、自定义窗口控制按钮、隐藏原生标题栏。

### 5.1 桌面端 UI 设计

#### 5.1.1 AppDeskNavigation（桌面导航外壳）

`lib/core/navigation/view/desktop/app_desk_navigation.dart`

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../model/app_tab.dart';
import 'desk_navigation_rail.dart';
import 'window_buttons.dart';

/// 桌面端导航外壳
///
/// 左侧：NavigationRail（垂直导航栏）
/// 右侧：内容区域
/// 顶部：自定义窗口控制按钮
class AppDeskNavigation extends StatelessWidget {
  final Widget content;

  const AppDeskNavigation({
    super.key,
    required this.content,
  });

  @override
  Widget build(BuildContext context) {
    // 获取当前路由路径
    final location = GoRouterState.of(context).uri.path;
    final currentTab = AppTab.fromPath(location);

    return Scaffold(
      body: Row(
        children: [
          // 左侧：NavigationRail
          DeskNavigationRail(
            selectedTab: currentTab ?? AppTab.widget,
            onTabSelected: (tab) {
              context.go(tab.path);
            },
          ),

          // 分割线
          const VerticalDivider(width: 1, thickness: 1),

          // 右侧：内容区域
          Expanded(
            child: Column(
              children: [
                // 顶部：自定义窗口控制按钮（macOS）
                const WindowButtons(),

                // 内容
                Expanded(child: content),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

**布局示例**:
```
┌────────┬─────────────────────────────┐
│  Nav   │ Window Buttons (macOS)      │
│  Rail  ├─────────────────────────────┤
│        │                             │
│ Widget │                             │
│  Blog  │        Content              │
│  ...   │       (child)               │
│        │                             │
└────────┴─────────────────────────────┘
```

---

#### 5.1.2 DeskNavigationRail（导航栏）

`lib/core/navigation/view/desktop/desk_navigation_rail.dart`

```dart
import 'package:flutter/material.dart';
import '../../model/app_tab.dart';

/// 桌面端导航栏（垂直）
class DeskNavigationRail extends StatelessWidget {
  final AppTab selectedTab;
  final ValueChanged<AppTab> onTabSelected;

  const DeskNavigationRail({
    super.key,
    required this.selectedTab,
    required this.onTabSelected,
  });

  @override
  Widget build(BuildContext context) {
    return NavigationRail(
      selectedIndex: selectedTab.index,
      onDestinationSelected: (index) {
        onTabSelected(AppTab.values[index]);
      },
      labelType: NavigationRailLabelType.all,  // 显示标签文字
      destinations: AppTab.values.map((tab) {
        return NavigationRailDestination(
          icon: Icon(tab.icon),
          selectedIcon: Icon(tab.activeIcon),
          label: Text(tab.label),
        );
      }).toList(),
    );
  }
}
```

**设计要点**:
- ✅ 使用 Flutter 内置的 NavigationRail 组件
- ✅ 自动显示图标和标签
- ✅ 根据 AppTab 枚举生成

---

### 5.2 自定义窗口控制按钮

#### 5.2.1 为什么需要自定义窗口按钮？

**问题**: macOS 原生窗口控制按钮（红/黄/绿）占据顶部空间，与应用 UI 不协调。

**解决方案**: 隐藏原生按钮，自定义实现窗口控制。

#### 5.2.2 WindowButtons 实现

`lib/core/navigation/view/desktop/window_buttons.dart`

```dart
import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';
import '../../../platform/os.dart';

/// 自定义窗口控制按钮（仅 macOS）
class WindowButtons extends StatelessWidget {
  const WindowButtons({super.key});

  @override
  Widget build(BuildContext context) {
    // 仅在 macOS 上显示
    if (OS.current != OS.macos) {
      return const SizedBox.shrink();
    }

    return Container(
      height: 48,  // macOS 标题栏高度
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).dividerColor,
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          const SizedBox(width: 16),

          // 关闭按钮
          _WindowButton(
            color: const Color(0xFFFF5F57),
            onTap: () => windowManager.close(),
            icon: Icons.close,
          ),
          const SizedBox(width: 8),

          // 最小化按钮
          _WindowButton(
            color: const Color(0xFFFFBD2E),
            onTap: () => windowManager.minimize(),
            icon: Icons.remove,
          ),
          const SizedBox(width: 8),

          // 最大化/恢复按钮
          FutureBuilder<bool>(
            future: windowManager.isMaximized(),
            builder: (context, snapshot) {
              final isMaximized = snapshot.data ?? false;
              return _WindowButton(
                color: const Color(0xFF28C940),
                onTap: () async {
                  if (isMaximized) {
                    await windowManager.unmaximize();
                  } else {
                    await windowManager.maximize();
                  }
                  // 触发重建
                  (context as Element).markNeedsBuild();
                },
                icon: isMaximized ? Icons.fullscreen_exit : Icons.fullscreen,
              );
            },
          ),

          const Spacer(),

          // 标题（可选）
          Text(
            'Flutter Run',
            style: Theme.of(context).textTheme.titleSmall,
          ),

          const Spacer(),
          const SizedBox(width: 80),  // 右侧留白
        ],
      ),
    );
  }
}

/// 单个窗口按钮
class _WindowButton extends StatefulWidget {
  final Color color;
  final VoidCallback onTap;
  final IconData icon;

  const _WindowButton({
    required this.color,
    required this.onTap,
    required this.icon,
  });

  @override
  State<_WindowButton> createState() => _WindowButtonState();
}

class _WindowButtonState extends State<_WindowButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: widget.color,
            shape: BoxShape.circle,
          ),
          child: _isHovered
              ? Icon(
                  widget.icon,
                  size: 8,
                  color: Colors.black54,
                )
              : null,
        ),
      ),
    );
  }
}
```

**设计要点**:
1. **macOS 风格**: 红/黄/绿三色圆形按钮
2. **悬停显示图标**: 鼠标悬停时显示功能图标
3. **动态状态**: 最大化按钮根据窗口状态变化

---

### 5.3 隐藏原生窗口控制按钮

#### 5.3.1 配置 window_manager

`lib/main.dart`（初始化部分）

```dart
import 'package:window_manager/window_manager.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 初始化 window_manager（仅桌面端）
  if (PlatformAdapter.isDesktop) {
    await windowManager.ensureInitialized();

    // 配置窗口属性
    WindowOptions windowOptions = const WindowOptions(
      size: Size(1200, 800),           // 初始大小
      minimumSize: Size(800, 600),     // 最小大小
      center: true,                    // 居中显示
      backgroundColor: Colors.transparent,
      skipTaskbar: false,
      titleBarStyle: TitleBarStyle.hidden,  // ✅ 隐藏原生标题栏
    );

    windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }

  // 启动应用
  runApp(const MyApp());
}
```

**关键配置**:
- `titleBarStyle: TitleBarStyle.hidden`: 隐藏原生标题栏
- `size`: 设置初始窗口大小
- `minimumSize`: 限制最小窗口大小
- `center: true`: 启动时居中显示

---

### 5.4 响应式布局

#### 5.4.1 PlatformAdapter 增强

`lib/core/platform/platform_adapter.dart`（续）

```dart
class PlatformAdapter {
  /// 是否为桌面端 UI（包括 Web 大屏）
  static bool get isDesktopUI {
    return OS.current.isDesktop;
  }

  /// 是否为移动端 UI
  static bool get isMobileUI {
    return OS.current.isMobile;
  }

  /// 获取内容区域最大宽度
  static double getMaxContentWidth(BuildContext context) {
    if (isDesktopUI) {
      return 1200.0;  // 桌面端限制最大宽度
    }
    return MediaQuery.of(context).size.width;  // 移动端全宽
  }

  /// 获取导航栏宽度
  static double getNavigationRailWidth() {
    return isDesktopUI ? 72.0 : 0.0;
  }
}
```

**使用示例**:

```dart
// 页面中使用
Widget build(BuildContext context) {
  return Center(
    child: ConstrainedBox(
      constraints: BoxConstraints(
        maxWidth: PlatformAdapter.getMaxContentWidth(context),
      ),
      child: content,
    ),
  );
}
```

---

### 5.5 小结

本章完成了桌面端的 UI 适配：

| 组件 | 职责 | 平台 |
|------|------|------|
| **AppDeskNavigation** | 桌面导航外壳 | Desktop |
| **DeskNavigationRail** | 垂直导航栏 | Desktop |
| **WindowButtons** | 自定义窗口按钮 | macOS |
| **TitleBarStyle.hidden** | 隐藏原生标题栏 | Desktop |
| **PlatformAdapter** | 平台差异适配 | All |

**下一章**: 使用 FxStarter 框架管理应用启动生命周期。

---

## 第六章：应用生命周期管理

> **对应提交**: `05837e4` feat: 集成 FxStarter 启动框架管理应用生命周期
>
> **本章目标**: 使用 fx_boot_starter 框架管理应用启动流程，包括初始化、数据加载、错误处理。

### 6.1 为什么需要启动框架？

#### 6.1.1 架构设计概述

应用启动是整个应用生命周期的第一个关键阶段,涉及资源初始化、配置加载、服务注册等多项任务。传统方式将所有初始化代码堆砌在 main() 函数中,导致代码混乱、难以维护、错误处理困难。

**核心问题分析**

**1. 传统启动方式的痛点**
- **代码混乱**:所有初始化逻辑集中在 main() 函数,难以理清执行顺序和依赖关系
- **错误处理困难**:缺乏统一的错误捕获机制,某个初始化失败可能导致整个应用崩溃
- **缺乏生命周期管理**:无法区分"加载中"、"成功"、"失败"等状态,难以实现启动页和错误页
- **扩展性差**:新增初始化任务需要修改 main() 函数,容易引入问题

**2. 启动框架的解决方案**
- **标准化流程**:定义 `main() → 显示Splash → 执行任务 → 回调通知 → 跳转主页` 的标准流程
- **任务编排**:将初始化任务封装为 Repository,支持顺序执行和依赖管理
- **生命周期钩子**:提供 onLoaded/onStartSuccess/onStartError/onGlobalError 等回调,精确控制启动各阶段
- **状态驱动**:通过状态通知机制,让 Splash 页面能够响应启动状态变化

**设计优势**
1. **职责分离**:main() 函数只负责启动框架,具体任务由 Repository 执行
2. **可测试性**:启动任务可以独立测试,不依赖 UI
3. **错误恢复**:提供错误处理钩子,支持显示错误页或重试机制
4. **可观测性**:启动过程可以被监听和记录,便于性能分析和问题排查

---

#### 6.1.2 传统启动方式问题示例

**问题**: 传统 main() 函数启动流程混乱
```dart
// ❌ 传统方式：启动逻辑混乱
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 一堆初始化代码...
  await initTalker();
  await initWindowManager();
  await loadSettings();
  await loadUserData();
  // ...

  runApp(const MyApp());  // 何时调用？如何处理错误？
}
```

**FxStarter 的优势**:
- ✅ 标准化启动流程
- ✅ 生命周期钩子（onLoaded/onStartSuccess/onStartError）
- ✅ 异步任务编排
- ✅ Splash 页面集成
- ✅ 错误处理和重试

---

### 6.2 FxStarter 核心概念

#### 6.2.1 架构设计概述

FxStarter 是一个轻量级的 Flutter 应用启动框架,采用"Mixin + Repository + Listener"的架构模式,将启动流程标准化为可配置、可监听、可扩展的组件体系。

**核心组件职责**

**1. FxStarter（启动器 Mixin）**
- **职责**:作为应用启动的核心控制器,定义启动流程骨架,提供生命周期钩子
- **实现方式**:通过 Mixin 混入应用类,要求实现 `app`(根Widget) 和 `repository`(启动任务仓库) 两个抽象属性
- **核心方法**:run() 方法启动应用,内部协调 Widget 渲染、任务执行、状态通知、钩子回调

**2. AppStartRepository（启动任务仓库）**
- **职责**:封装所有启动时需要执行的异步任务,返回应用配置数据
- **实现方式**:抽象类定义 `initApp(BuildContext context)` 方法,子类实现具体初始化逻辑
- **设计理念**:遵循 Repository 模式,将"数据获取"与"流程控制"分离,便于测试和替换

**3. AppStartListener（启动状态监听器）**
- **职责**:在 Widget 树中监听启动状态变化,驱动 UI 更新(如 Splash 页面)
- **实现方式**:基于 InheritedWidget 和 ChangeNotifier,提供 onStartSuccess/onStartError 回调
- **使用场景**:Splash 页面监听启动完成后自动跳转到主页

**4. AppConfig（应用配置模型）**
- **职责**:存储启动任务返回的配置数据,在整个应用生命周期内可用
- **实现方式**:简单的数据类,可根据项目需求扩展字段(版本号、环境、功能开关等)

**架构流程图**

```
┌─────────────────────────────────────────────────────────────┐
│                    FxApplication.run()                       │
│  (混入 FxStarter Mixin)                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  1. 创建 AppStartNotifier (状态通知器)                        │
│  2. 构建 Widget 树 (MaterialApp + AppStartListener)          │
│  3. 调用 runApp() 显示 Splash 页面                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  4. 执行 repository.initApp(context)                         │
│     - 初始化 Flutter Binding                                 │
│     - 初始化日志系统                                          │
│     - 初始化窗口管理器(桌面端)                                 │
│     - 加载应用配置                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  5. 更新 AppStartNotifier 状态为 success/error               │
│  6. 触发生命周期钩子:                                         │
│     - onLoaded(context, cost, config)                        │
│     - onStartSuccess(context, config) 或 onStartError(...)   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  7. AppStartListener 监听到状态变化                           │
│  8. Splash 页面执行跳转逻辑 → 进入主页                         │
└─────────────────────────────────────────────────────────────┘
```

**设计优势**
1. **关注点分离**:启动流程、初始化任务、UI 响应三者解耦
2. **类型安全**:泛型 AppConfig 确保配置数据类型正确
3. **易于扩展**:新增初始化任务只需修改 Repository,不影响其他组件
4. **统一错误处理**:所有启动异常通过 onStartError 钩子集中处理

---

#### 6.2.2 启动流程

```
main()
  ↓
FxApplication.run()
  ↓
显示 Splash 页面（AppStartListener）
  ↓
执行 repository.initApp()（异步任务）
  ↓
onLoaded() 回调（数据加载完成）
  ↓
onStartSuccess() 回调（启动成功）
  ↓
Splash 自动跳转到主页
```

#### 6.2.2 核心组件

| 组件 | 职责 |
|------|------|
| **FxStarter** | 启动框架核心 Mixin |
| **AppStartRepository** | 启动任务仓库接口 |
| **AppConfig** | 应用配置数据模型 |
| **AppStartListener** | 启动状态监听器 |

---

### 6.3 实现 AppConfig

#### 6.3.1 架构设计概述

AppConfig 是应用启动过程中生成的配置数据模型,承载了启动任务执行后需要在整个应用生命周期内使用的配置信息。

**设计思路**

**1. 数据模型定位**
- **职责**:作为 AppStartRepository.initApp() 的返回值,封装启动阶段获取的所有配置数据
- **生命周期**:创建于启动阶段,存活于整个应用运行期间,可通过 Context 或全局变量访问
- **扩展性**:根据项目需求添加字段,如版本号、环境标识、功能开关、服务端配置等

**2. 常见配置项**
- **version**:应用版本号,用于显示和版本检查
- **environment**:运行环境(dev/staging/prod),控制 API 地址、日志级别等
- **settings**:动态配置项,如功能开关、A/B 测试参数、服务端下发的配置
- **userInfo**:登录用户信息(如果启动时需要恢复登录状态)

**3. 设计原则**
- **不可变性**:配置创建后不应被修改,使用 const 构造函数和 final 字段
- **简单性**:只包含启动阶段需要的数据,运行时动态数据使用其他状态管理方案
- **可序列化**:如需持久化或跨 Isolate 传递,应支持 JSON 序列化

**使用场景**
```
启动任务 → 加载远程配置 → 创建 AppConfig
              ↓
onLoaded(config) → 根据 config.environment 配置日志级别
              ↓
onStartSuccess(config) → 根据 config.version 检查更新
              ↓
主页 → 根据 config.settings 显示/隐藏功能入口
```

---

#### 6.3.2 定义应用配置

`lib/core/app/app_config.dart`

```dart
/// 应用配置数据模型
///
/// 存储应用启动时加载的配置信息
class AppConfig {
  final String version;          // 应用版本
  final String environment;      // 运行环境（dev/prod）
  final Map<String, dynamic> settings;  // 其他设置

  const AppConfig({
    this.version = '1.0.0',
    this.environment = 'prod',
    this.settings = const {},
  });

  @override
  String toString() {
    return 'AppConfig(version: $version, env: $environment)';
  }
}
```

---

### 6.4 实现 AppStartRepository

#### 6.4.1 架构设计概述

AppStartRepository 是启动框架的核心执行单元,负责封装和编排所有应用启动时需要执行的初始化任务。遵循 Repository 模式,将"做什么"与"如何协调"分离。

**设计思路**

**1. 职责边界**
- **负责**:执行初始化任务(绑定初始化、日志配置、窗口管理、配置加载等),返回配置数据
- **不负责**:决定执行时机、处理 UI 响应、管理启动状态——这些由 FxStarter 框架负责

**2. 任务编排原则**
- **顺序执行**:关键任务按依赖顺序执行,如先初始化 Binding 再初始化窗口管理器
- **平台判断**:根据运行平台执行特定任务,如桌面端初始化窗口管理器,移动端可能初始化推送服务
- **错误传播**:任务执行失败应抛出异常,由框架的 onStartError 钩子统一处理

**3. 常见初始化任务**
| 任务 | 说明 | 平台 |
|------|------|------|
| WidgetsFlutterBinding | Flutter 引擎绑定,必须最先执行 | 全平台 |
| 日志系统初始化 | 配置 Talker 等日志框架 | 全平台 |
| 窗口管理器 | 配置桌面窗口大小、标题栏样式 | 桌面端 |
| 数据库初始化 | 打开本地数据库、执行迁移 | 全平台 |
| 网络配置 | 配置 Dio 拦截器、证书校验 | 全平台 |
| 用户状态恢复 | 从本地存储恢复登录态 | 全平台 |
| 远程配置拉取 | 从服务端获取功能开关等配置 | 全平台 |

**4. 实现模式**
```dart
class FlutterRunStartRepository extends AppStartRepository<AppConfig> {
  @override
  Future<AppConfig> initApp(BuildContext context) async {
    // 任务 1: 基础初始化
    WidgetsFlutterBinding.ensureInitialized();

    // 任务 2: 日志系统
    TalkerConfig.init();

    // 任务 3: 平台特定初始化
    if (PlatformAdapter.isDesktop) {
      await _initWindowManager();
    }

    // 任务 4: 加载配置(可能是异步的)
    final config = await _loadConfig();

    return config;
  }
}
```

**设计优势**
1. **单一职责**:只负责执行初始化任务,不涉及 UI 和流程控制
2. **可测试性**:可以单独测试 Repository,Mock 掉平台相关的依赖
3. **可替换性**:不同环境可以使用不同的 Repository 实现(生产/测试/Mock)
4. **日志可追踪**:每个任务完成后记录日志,便于排查启动问题

---

#### 6.4.2 启动任务仓库

`lib/core/app/app_start_repository.dart`

```dart
import 'package:flutter/widgets.dart';
import 'package:fx_boot_starter/fx_boot_starter.dart';
import 'package:window_manager/window_manager.dart';
import '../logging/talker_config.dart';
import '../logging/app_logger.dart';
import '../platform/platform_adapter.dart';
import 'app_config.dart';

/// Flutter Run 启动任务仓库
///
/// 负责执行应用启动时的异步任务
class FlutterRunStartRepository extends AppStartRepository<AppConfig> {
  const FlutterRunStartRepository();

  @override
  Future<AppConfig> initApp(BuildContext context) async {
    AppLogger.info('=== 开始执行启动任务 ===');

    // 任务 1: 初始化 Flutter Widgets Binding
    WidgetsFlutterBinding.ensureInitialized();
    AppLogger.info('✓ Flutter Widgets Binding 初始化完成');

    // 任务 2: 初始化 Talker 日志系统
    TalkerConfig.init();
    AppLogger.info('✓ Talker 日志系统初始化完成');

    // 任务 3: 初始化窗口管理器（仅桌面端）
    if (PlatformAdapter.isDesktop) {
      await _initWindowManager();
      AppLogger.info('✓ Window Manager 初始化完成');
    }

    // 任务 4: 打印平台信息
    PlatformAdapter.printPlatformInfo();

    // 任务 5: 加载应用配置（模拟异步加载）
    await Future.delayed(const Duration(milliseconds: 500));
    final config = const AppConfig(
      version: '1.0.0',
      environment: 'prod',
    );
    AppLogger.info('✓ 应用配置加载完成: $config');

    AppLogger.info('=== 启动任务执行完成 ===');

    return config;
  }

  /// 初始化窗口管理器
  Future<void> _initWindowManager() async {
    await windowManager.ensureInitialized();

    const windowOptions = WindowOptions(
      size: Size(1200, 800),
      minimumSize: Size(800, 600),
      center: true,
      backgroundColor: Colors.transparent,
      skipTaskbar: false,
      titleBarStyle: TitleBarStyle.hidden,  // 隐藏原生标题栏
    );

    await windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }
}
```

**设计要点**:
1. **顺序执行**: 关键任务按顺序初始化
2. **平台判断**: 桌面端才初始化窗口管理器
3. **异步加载**: 模拟配置加载（实际可从网络/本地加载）
4. **日志记录**: 每个任务完成后记录日志

---

### 6.5 实现 FxApplication

#### 6.5.1 架构设计概述

FxApplication 是项目中实际使用的启动器类,通过混入 FxStarter Mixin 获得启动框架能力,并实现项目特定的配置和生命周期处理逻辑。

**设计思路**

**1. 类设计**
- **混入模式**:使用 `with FxStarter<AppConfig>` 混入启动框架能力,泛型参数指定配置类型
- **必须实现**:`app` 属性(返回根 Widget)、`repository` 属性(返回启动任务仓库)
- **可选覆盖**:四个生命周期钩子方法,根据需要覆盖实现

**2. 生命周期钩子**

| 钩子方法 | 触发时机 | 典型用途 |
|---------|---------|---------|
| `onLoaded(context, cost, state)` | 启动任务完成后 | 配置全局状态、初始化 BLoC 观察器、记录启动耗时 |
| `onStartSuccess(context, state)` | 启动成功后 | 检查版本更新、显示公告弹窗、初始化第三方 SDK |
| `onStartError(context, error, trace)` | 启动失败时 | 显示错误页面、提供重试按钮、上报错误日志 |
| `onGlobalError(error, stack)` | 运行时未捕获异常 | 全局错误上报、记录崩溃日志、显示错误提示 |

**3. 执行时序**
```
const FxApplication().run(args)
        ↓
┌───────────────────────────────────┐
│ 1. 获取 repository 属性            │
│ 2. 获取 app 属性 (根 Widget)        │
│ 3. 执行 repository.initApp()       │
│    ├── 成功: 触发 onLoaded         │
│    │         触发 onStartSuccess    │
│    └── 失败: 触发 onStartError      │
└───────────────────────────────────┘
```

**4. 全局错误处理**

FxStarter 会自动配置 Flutter 的错误处理机制:
- `FlutterError.onError`:捕获 Widget 构建和渲染期间的错误
- `PlatformDispatcher.onError`:捕获异步代码中未处理的异常
- 所有捕获的错误都会转发到 `onGlobalError` 钩子

**设计优势**
1. **声明式配置**:通过属性和方法覆盖来配置启动行为,代码清晰
2. **类型安全**:泛型 AppConfig 确保配置数据类型正确,编译期检查
3. **生命周期完整**:覆盖了启动的各个阶段,开发者可以精确控制行为
4. **错误兜底**:全局错误处理确保应用不会因未处理异常而崩溃

---

#### 6.5.2 应用启动器

`lib/core/app/fx_application.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:fx_boot_starter/fx_boot_starter.dart';
import 'app_config.dart';
import 'app_start_repository.dart';
import '../router/app_router.dart';
import '../logging/app_logger.dart';
import '../logging/app_bloc_observer.dart';

/// FxApplication: 应用启动器
///
/// 混入 FxStarter 框架，负责整个应用的启动生命周期管理
class FxApplication with FxStarter<AppConfig> {
  const FxApplication();

  /// 必须实现: 根 Widget
  @override
  Widget get app => AppRouter.createRouterApp();

  /// 必须实现: 启动数据仓库
  @override
  AppStartRepository<AppConfig> get repository =>
      const FlutterRunStartRepository();

  /// 生命周期钩子 1: 数据加载完成
  ///
  /// 在 repository.initApp() 执行完成后调用
  @override
  void onLoaded(BuildContext context, int cost, AppConfig state) async {
    AppLogger.info('=== onLoaded 回调 ===');
    AppLogger.info('启动耗时: $cost ms');
    AppLogger.info('应用配置: $state');

    // 配置 BLoC 观察器
    Bloc.observer = AppBlocObserver();
    AppLogger.info('BLoC 观察器已配置');
  }

  /// 生命周期钩子 2: 启动成功
  ///
  /// 在 onLoaded 之后调用
  @override
  void onStartSuccess(BuildContext context, AppConfig state) {
    AppLogger.info('=== onStartSuccess 回调 ===');
    AppLogger.info('启动成功，应用已就绪!');
    AppLogger.info('Splash 将在延迟后自动跳转到首页');
  }

  /// 生命周期钩子 3: 启动失败
  @override
  void onStartError(BuildContext context, Object error, StackTrace trace) {
    AppLogger.error('=== onStartError 回调 ===');
    AppLogger.error('启动失败: $error', error, trace);

    // TODO: 显示错误页面或重试按钮
  }

  /// 生命周期钩子 4: 全局错误处理
  @override
  void onGlobalError(Object error, StackTrace stack) {
    AppLogger.error('=== onGlobalError 回调 ===');
    AppLogger.error('全局错误: $error', error, stack);

    // 可以在这里上报错误到日志平台
  }
}
```

**生命周期钩子说明**:

| 钩子 | 触发时机 | 用途 |
|------|---------|------|
| `onLoaded` | 数据加载完成 | 初始化 BLoC、全局状态 |
| `onStartSuccess` | 启动成功 | 检查更新、显示公告 |
| `onStartError` | 启动失败 | 显示错误页、提供重试 |
| `onGlobalError` | 运行时错误 | 上报日志、记录错误 |

---

### 6.6 修改 main.dart

#### 6.6.1 架构设计概述

main.dart 是 Flutter 应用的入口文件,集成启动框架后,其职责从"执行所有初始化"简化为"启动框架"。这体现了关注点分离和职责单一原则。

**设计思路**

**1. 职责变化对比**

| 方面 | 传统方式 | FxStarter 方式 |
|------|---------|---------------|
| 代码量 | 30+ 行初始化代码 | 3-5 行启动代码 |
| 职责 | 执行所有初始化任务 | 仅启动框架 |
| 错误处理 | 需要手动 try-catch | 框架自动处理 |
| 可维护性 | 新增任务需修改 main() | 修改 Repository 即可 |
| 启动页 | 需要额外实现 | 框架自动管理 |

**2. 最小化入口原则**

main() 函数应该尽可能简洁,只做以下事情:
1. **必要的预初始化**:如日志系统(需要最早可用以记录启动过程)
2. **启动框架**:调用 FxApplication().run(args)
3. **传递启动参数**:将命令行参数传递给框架(桌面端可能需要)

**3. 初始化时机选择**

| 初始化项 | 推荐位置 | 原因 |
|---------|---------|------|
| 日志系统 | main() 中 | 需要最早可用,记录启动过程 |
| Flutter Binding | Repository 中 | 框架控制时机 |
| 窗口管理器 | Repository 中 | 依赖 Binding,需要顺序控制 |
| 数据库/网络 | Repository 中 | 可能耗时,需要异步处理 |
| BLoC 观察器 | onLoaded 钩子中 | 在 Widget 树构建后配置 |

**4. 代码演进**
```dart
// 演进前: 30+ 行，职责混乱
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initTalker();
  await initWindowManager();
  await loadSettings();
  await loadUserData();
  // ... 更多初始化
  runApp(const MyApp());
}

// 演进后: 3 行，职责清晰
void main(List<String> args) {
  TalkerConfig.init();              // 预初始化日志
  const FxApplication().run(args);  // 启动框架
}
```

**设计优势**
1. **入口简洁**:main() 函数一目了然,易于理解
2. **关注点分离**:初始化逻辑移至 Repository,启动流程由框架管理
3. **可维护性**:新增初始化任务不需要修改 main.dart
4. **一致性**:所有启动相关逻辑集中在 core/app 目录下

---

#### 6.6.2 简化启动流程

`lib/main.dart`

```dart
import 'core/app/fx_application.dart';
import 'core/logging/talker_config.dart';
import 'core/platform/platform_adapter.dart';

/// Flutter Run - 主入口
///
/// 启动流程（通过 FxStarter 框架管理）:
/// 1. FxApplication.run() 启动应用
/// 2. 显示启动页面（Splash）
/// 3. FlutterRunStartRepository.initApp() 执行启动任务
/// 4. onLoaded() 回调 - 配置 BLoC 观察器
/// 5. onStartSuccess() 回调 - 启动完成
/// 6. Splash 自动跳转到首页
void main(List<String> args) {
  // 打印平台信息
  PlatformAdapter.printPlatformInfo();

  // 初始化 Talker（必须在最早期完成）
  TalkerConfig.init();

  // 启动应用
  const FxApplication().run(args);
}
```

**对比传统方式**:
```dart
// ❌ 传统方式：30+ 行初始化代码
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initTalker();
  await initWindowManager();
  await loadSettings();
  // ...
  runApp(const MyApp());
}

// ✅ FxStarter 方式：3 行代码
void main(List<String> args) {
  TalkerConfig.init();
  const FxApplication().run(args);
}
```

---

### 6.7 小结

本章完成了应用生命周期管理：

| 组件 | 职责 | 文件 |
|------|------|------|
| **FxApplication** | 应用启动器 | `core/app/fx_application.dart` |
| **AppStartRepository** | 启动任务仓库 | `core/app/app_start_repository.dart` |
| **AppConfig** | 应用配置模型 | `core/app/app_config.dart` |
| **生命周期钩子** | 启动流程控制 | onLoaded/onStartSuccess/... |

**下一章**: 实现路由式 Splash 启动页。

---

## 第七章：启动页实现

> **对应提交**: `05837e4` feat(splash): 实现路由方式的 Splash 启动页及淡入动画
>
> **本章目标**: 实现带动画的 Splash 页面，监听启动状态并自动跳转到首页。

### 7.1 Splash 设计方案

**需求**:
1. 显示应用 Logo 和名称
2. 显示启动动画（淡入效果）
3. 监听启动状态
4. 启动成功后自动跳转到首页

**设计方案**: 使用 FxStarter 的 `AppStartListener`

---

### 7.2 实现 FlutterRunSplash

`lib/core/app/splash/splash_page.dart`

```dart
import 'package:flutter/material.dart';
import 'package:fx_boot_starter/fx_boot_starter.dart';
import 'package:go_router/go_router.dart';
import '../app_config.dart';
import '../../logging/app_logger.dart';

/// Flutter Run Splash 页面
///
/// 使用 FxStarter 的 AppStartListener 监听启动状态
class FlutterRunSplash extends StatelessWidget {
  const FlutterRunSplash({super.key});

  @override
  Widget build(BuildContext context) {
    return AppStartListener<AppConfig>(
      onStartSuccess: (context, config) {
        AppLogger.info('Splash 监听到启动成功，准备跳转到首页');

        // 延迟 500ms 后跳转（让动画完成）
        Future.delayed(const Duration(milliseconds: 500), () {
          if (context.mounted) {
            context.go('/widget');  // 跳转到首页
          }
        });
      },
      builder: (context) {
        return const Scaffold(
          body: Center(
            child: _SplashContent(),
          ),
        );
      },
    );
  }
}

/// Splash 内容（Logo + 动画）
class _SplashContent extends StatefulWidget {
  const _SplashContent();

  @override
  State<_SplashContent> createState() => _SplashContentState();
}

class _SplashContentState extends State<_SplashContent>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    // 创建动画控制器
    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    // 淡入动画
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeIn,
      ),
    );

    // 启动动画
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Logo
          Icon(
            Icons.flutter_dash,
            size: 120,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: 24),

          // 应用名称
          Text(
            'Flutter Run',
            style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
          ),
          const SizedBox(height: 16),

          // 加载指示器
          SizedBox(
            width: 200,
            child: LinearProgressIndicator(
              backgroundColor: Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(
                Theme.of(context).colorScheme.primary,
              ),
            ),
          ),
          const SizedBox(height: 16),

          // 提示文字
          Text(
            '正在加载...',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey,
                ),
          ),
        ],
      ),
    );
  }
}
```

**设计要点**:
1. **AppStartListener**: 监听启动状态变化
2. **FadeTransition**: 淡入动画效果
3. **自动跳转**: 启动成功后自动导航到首页
4. **延迟跳转**: 确保动画完成后再跳转

---

### 7.3 AppStartListener 原理

**工作流程**:
```
FxApplication.run()
  ↓
创建 AppStartNotifier（状态通知器）
  ↓
执行 repository.initApp()
  ↓
更新 AppStartNotifier 状态
  ↓
AppStartListener 监听到状态变化
  ↓
触发 onStartSuccess 回调
  ↓
执行跳转逻辑
```

**状态类型**:
```dart
enum AppStartState {
  loading,   // 加载中
  success,   // 成功
  error,     // 失败
}
```

---

### 7.4 路由集成

#### 7.4.1 将 Splash 设为初始路由

`lib/core/router/app_router.dart`（已实现）

```dart
static GoRouter createRouter() {
  return GoRouter(
    initialLocation: '/',  // ✅ 初始路由为 Splash
    routes: <RouteBase>[
      // Splash 路由（独立，不在 ShellRoute 内）
      GoRoute(
        path: '/',
        builder: (context, state) => const FlutterRunSplash(),
      ),
      // ... 其他路由
    ],
  );
}
```

**为什么 Splash 独立？**
- ❌ 如果放在 ShellRoute 内，会显示导航栏（不符合预期）
- ✅ 独立路由确保 Splash 全屏显示

---

### 7.5 小结

本章完成了启动页实现：

| 组件 | 职责 | 文件 |
|------|------|------|
| **FlutterRunSplash** | Splash 页面 | `core/app/splash/splash_page.dart` |
| **AppStartListener** | 启动状态监听器 | FxStarter 提供 |
| **FadeTransition** | 淡入动画 | Flutter 内置 |
| **自动跳转** | 启动成功后导航 | context.go('/widget') |


---


## 第八章：设置系统实现

> **对应提交**: `612fb9c` feat(settings): 实现完整的设置系统及 FlutterPlay 风格界面
>
> **本章目标**: 实现应用设置系统，包括主题模式、主题色、字体大小、语言切换等功能。

### 8.1 设置系统架构

**需求分析**:
- 主题模式切换（亮色/暗色/跟随系统）
- 主题色选择（多种预设颜色）
- 字体大小调节
- 语言切换（中文/英文）
- 持久化存储（本地保存设置）

**架构设计**: 使用 Cubit 管理设置状态，SharedPreferences 持久化

```
SettingsPage (UI)
  ↓
SettingsCubit (状态管理)
  ↓
SharedPreferences (持久化存储)
```

---

### 8.2 SettingsState 状态模型

#### 8.2.1 定义状态

`lib/core/settings/settings_state.dart`

```dart
import 'package:flutter/material.dart';
import 'package:equatable/equatable.dart';

/// 设置状态
///
/// 使用 Equatable 简化相等性比较
class SettingsState extends Equatable {
  final ThemeMode themeMode;      // 主题模式
  final Color themeColor;         // 主题色
  final double fontScale;         // 字体缩放比例
  final String? languageCode;     // 语言代码（null 表示跟随系统）

  const SettingsState({
    this.themeMode = ThemeMode.system,
    this.themeColor = Colors.blue,
    this.fontScale = 1.0,
    this.languageCode,
  });

  /// 复制并修改部分字段
  SettingsState copyWith({
    ThemeMode? themeMode,
    Color? themeColor,
    double? fontScale,
    String? languageCode,
  }) {
    return SettingsState(
      themeMode: themeMode ?? this.themeMode,
      themeColor: themeColor ?? this.themeColor,
      fontScale: fontScale ?? this.fontScale,
      languageCode: languageCode ?? this.languageCode,
    );
  }

  /// JSON 序列化
  Map<String, dynamic> toJson() {
    return {
      'themeMode': themeMode.name,
      'themeColor': themeColor.value,
      'fontScale': fontScale,
      'languageCode': languageCode,
    };
  }

  /// JSON 反序列化
  factory SettingsState.fromJson(Map<String, dynamic> json) {
    return SettingsState(
      themeMode: ThemeMode.values.firstWhere(
        (mode) => mode.name == json['themeMode'],
        orElse: () => ThemeMode.system,
      ),
      themeColor: Color(json['themeColor'] ?? Colors.blue.value),
      fontScale: json['fontScale'] ?? 1.0,
      languageCode: json['languageCode'],
    );
  }

  @override
  List<Object?> get props => [themeMode, themeColor, fontScale, languageCode];
}
```

**设计要点**:
- ✅ 使用 Equatable 自动实现 == 和 hashCode
- ✅ copyWith 方法方便创建新状态
- ✅ JSON 序列化/反序列化支持持久化

---

### 8.3 SettingsCubit 实现

`lib/core/settings/settings_cubit.dart`（已读取）

```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'settings_state.dart';
import '../logging/app_logger.dart';

/// 设置管理 Cubit
class SettingsCubit extends Cubit<SettingsState> {
  static const String _storageKey = 'app_settings';

  SettingsCubit() : super(const SettingsState());

  /// 初始化设置（从本地存储加载）
  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonString = prefs.getString(_storageKey);

      if (jsonString != null) {
        final json = jsonDecode(jsonString) as Map<String, dynamic>;
        final loadedState = SettingsState.fromJson(json);
        emit(loadedState);
        AppLogger.info('设置加载成功');
      }
    } catch (e, stackTrace) {
      AppLogger.error('加载设置失败', e, stackTrace);
    }
  }

  /// 保存设置到本地存储
  Future<void> _saveSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonString = jsonEncode(state.toJson());
      await prefs.setString(_storageKey, jsonString);
    } catch (e, stackTrace) {
      AppLogger.error('保存设置失败', e, stackTrace);
    }
  }

  /// 设置主题模式
  Future<void> setThemeMode(ThemeMode mode) async {
    emit(state.copyWith(themeMode: mode));
    await _saveSettings();
  }

  /// 设置主题色
  Future<void> setThemeColor(Color color) async {
    emit(state.copyWith(themeColor: color));
    await _saveSettings();
  }

  /// 设置字体缩放比例
  Future<void> setFontScale(double scale) async {
    emit(state.copyWith(fontScale: scale));
    await _saveSettings();
  }

  /// 设置语言
  Future<void> setLanguage(String? languageCode) async {
    emit(state.copyWith(languageCode: languageCode));
    await _saveSettings();
  }
}
```

**设计要点**:
1. **自动持久化**: 每次修改设置后自动保存
2. **初始化加载**: 应用启动时从本地加载设置
3. **错误处理**: 加载/保存失败不影响应用运行

---

### 8.4 Settings 页面实现

#### 8.4.1 主题模式设置页

`lib/features/settings/presentation/pages/theme_mode_page.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/settings/settings_cubit.dart';

/// 主题模式设置页面
class ThemeModePage extends StatelessWidget {
  const ThemeModePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('主题模式'),
      ),
      body: BlocBuilder<SettingsCubit, dynamic>(
        builder: (context, state) {
          final currentMode = context.watch<SettingsCubit>().state.themeMode;

          return ListView(
            children: [
              _buildModeOption(
                context,
                title: '跟随系统',
                subtitle: '自动根据系统设置切换',
                mode: ThemeMode.system,
                currentMode: currentMode,
              ),
              _buildModeOption(
                context,
                title: '亮色模式',
                subtitle: '始终使用亮色主题',
                mode: ThemeMode.light,
                currentMode: currentMode,
              ),
              _buildModeOption(
                context,
                title: '暗色模式',
                subtitle: '始终使用暗色主题',
                mode: ThemeMode.dark,
                currentMode: currentMode,
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildModeOption(
    BuildContext context, {
    required String title,
    required String subtitle,
    required ThemeMode mode,
    required ThemeMode currentMode,
  }) {
    final isSelected = mode == currentMode;

    return ListTile(
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: isSelected
          ? Icon(Icons.check, color: Theme.of(context).colorScheme.primary)
          : null,
      onTap: () {
        context.read<SettingsCubit>().setThemeMode(mode);
      },
    );
  }
}
```

---

#### 8.4.2 主题色设置页

`lib/features/settings/presentation/pages/theme_color_page.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/settings/settings_cubit.dart';

/// 主题色设置页面
class ThemeColorPage extends StatelessWidget {
  const ThemeColorPage({super.key});

  // 预设主题色
  static const List<Color> presetColors = [
    Colors.blue,
    Colors.red,
    Colors.green,
    Colors.orange,
    Colors.purple,
    Colors.pink,
    Colors.teal,
    Colors.indigo,
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('主题色'),
      ),
      body: BlocBuilder<SettingsCubit, dynamic>(
        builder: (context, state) {
          final currentColor = context.watch<SettingsCubit>().state.themeColor;

          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              mainAxisSpacing: 16,
              crossAxisSpacing: 16,
            ),
            itemCount: presetColors.length,
            itemBuilder: (context, index) {
              final color = presetColors[index];
              final isSelected = color.value == currentColor.value;

              return GestureDetector(
                onTap: () {
                  context.read<SettingsCubit>().setThemeColor(color);
                },
                child: Container(
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected ? Colors.white : Colors.transparent,
                      width: 3,
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: color.withOpacity(0.5),
                              blurRadius: 8,
                              spreadRadius: 2,
                            )
                          ]
                        : null,
                  ),
                  child: isSelected
                      ? const Icon(Icons.check, color: Colors.white, size: 32)
                      : null,
                ),
              );
            },
          );
        },
      ),
    );
  }
}
```

---

#### 8.4.3 字体设置页

`lib/features/settings/presentation/pages/font_setting_page.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/settings/settings_cubit.dart';

/// 字体设置页面
class FontSettingPage extends StatelessWidget {
  const FontSettingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('字体大小'),
      ),
      body: BlocBuilder<SettingsCubit, dynamic>(
        builder: (context, state) {
          final fontScale = context.watch<SettingsCubit>().state.fontScale;

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    // 预览文本
                    Text(
                      '预览文本',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'The quick brown fox jumps over the lazy dog',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              const Divider(),
              // 滑块
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(
                  children: [
                    const Text('A', style: TextStyle(fontSize: 12)),
                    Expanded(
                      child: Slider(
                        value: fontScale,
                        min: 0.8,
                        max: 1.5,
                        divisions: 7,
                        label: '${(fontScale * 100).toInt()}%',
                        onChanged: (value) {
                          context.read<SettingsCubit>().setFontScale(value);
                        },
                      ),
                    ),
                    const Text('A', style: TextStyle(fontSize: 24)),
                  ],
                ),
              ),
              // 当前值
              Text(
                '当前: ${(fontScale * 100).toInt()}%',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          );
        },
      ),
    );
  }
}
```

---

### 8.5 集成到应用

#### 8.5.1 在 AppRouter 中应用设置

`lib/core/router/app_router.dart`（关键代码）

```dart
static Widget createRouterApp() {
  final router = createRouter();

  // 创建全局 SettingsCubit
  return BlocProvider(
    create: (context) => SettingsCubit()..init(),  // ✅ 初始化并加载设置
    child: BlocBuilder<SettingsCubit, dynamic>(
      builder: (context, settingsState) {
        final settings = context.watch<SettingsCubit>().state;

        return MaterialApp.router(
          // ...
          themeMode: settings.themeMode,  // ✅ 应用主题模式
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(
              seedColor: settings.themeColor,  // ✅ 应用主题色
            ),
            useMaterial3: true,
          ),
          darkTheme: ThemeData(
            colorScheme: ColorScheme.fromSeed(
              seedColor: settings.themeColor,
              brightness: Brightness.dark,
            ),
            useMaterial3: true,
          ),
          builder: (context, child) {
            return MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: TextScaler.linear(settings.fontScale),  // ✅ 应用字体缩放
              ),
              child: child!,
            );
          },
        );
      },
    ),
  );
}
```

**设计优势**:
1. **响应式更新**: 设置变化自动触发 UI 重建
2. **全局生效**: 所有页面自动应用新设置
3. **持久化**: 应用重启后设置保持

---

### 8.6 小结

本章完成了设置系统实现：

| 组件 | 职责 | 文件 |
|------|------|------|
| **SettingsState** | 设置状态模型 | `core/settings/settings_state.dart` |
| **SettingsCubit** | 设置状态管理 | `core/settings/settings_cubit.dart` |
| **ThemeModePage** | 主题模式设置 | `features/settings/.../theme_mode_page.dart` |
| **ThemeColorPage** | 主题色设置 | `features/settings/.../theme_color_page.dart` |
| **FontSettingPage** | 字体设置 | `features/settings/.../font_setting_page.dart` |

**下一章**: 实现完整的国际化系统。

---

## 第九章：国际化系统

> **对应提交**: `7c9f3b1` feat(i18n): 实现完整的国际化系统，支持中英文切换
>
> **本章目标**: 实现应用的多语言支持（中英文），采用手写 Dart 类的方式实现国际化。

### 9.1 Flutter 国际化方案

#### 9.1.1 架构设计概述

国际化(i18n)是应用面向全球用户的基础能力,Flutter 提供了多种实现方案。本项目采用**手写 Dart 类**的方式,相比官方 ARB 文件方案,具有更好的灵活性和可控性。

**方案对比**

| 特性 | ARB 文件方案 | 手写 Dart 类方案(本项目) |
|------|-------------|------------------------|
| 实现方式 | `.arb` JSON 文件 + 代码生成 | 直接编写 Dart 类 |
| 类型安全 | ✅ 生成代码保证 | ✅ 编译期检查 |
| IDE 支持 | 需要插件 | 原生支持(跳转、重构) |
| 灵活性 | 受限于 ARB 格式 | 可自定义任意逻辑 |
| 维护性 | 需要同步 ARB 和代码 | 直接修改 Dart 文件 |
| 适用场景 | 大型多语言项目 | 中小型项目、快速迭代 |

**核心组件**

**1. AppLocalizations（国际化基类）**
- **职责**:定义所有需要国际化的文本接口,提供静态 `of(context)` 方法获取实例
- **实现方式**:抽象类,定义所有翻译键为抽象 getter,子类提供具体翻译
- **设计理念**:契约优先,确保所有语言实现完整覆盖所有翻译键

**2. AppLocalizationsZh / AppLocalizationsEn（语言实现类）**
- **职责**:继承基类,提供具体语言的翻译文本
- **实现方式**:const 类,所有翻译作为 getter 返回
- **扩展方式**:新增语言只需添加新的实现类

**3. AppLocalizationsDelegate（本地化委托）**
- **职责**:作为 Flutter 本地化系统的桥梁,根据 Locale 加载对应的语言实现
- **实现方式**:继承 `LocalizationsDelegate<AppLocalizations>`,实现 isSupported/load/shouldReload 方法

**4. LocalizationExtension（便捷扩展）**
- **职责**:提供 `context.l10n` 快捷方式,简化获取国际化实例的代码
- **实现方式**:BuildContext 扩展方法

**架构流程**

```
┌─────────────────────────────────────────────────────────────┐
│                    MaterialApp.router                        │
│  localizationsDelegates: [AppLocalizationsDelegate(), ...]  │
│  supportedLocales: [Locale('zh'), Locale('en')]             │
│  locale: settings.languageCode                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            AppLocalizationsDelegate.load(locale)             │
│  根据 locale.languageCode 返回对应的语言实现类                  │
│  'zh' → AppLocalizationsZh()                                 │
│  'en' → AppLocalizationsEn()                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                Widget 中使用翻译文本                          │
│  final l10n = context.l10n;  // 或 AppLocalizations.of(context) │
│  Text(l10n.settings)         // 获取翻译文本                   │
└─────────────────────────────────────────────────────────────┘
```

**设计优势**
1. **无需代码生成**:避免 `flutter gen-l10n` 构建步骤,减少构建复杂度
2. **IDE 友好**:可以直接跳转到翻译定义,支持重构和查找引用
3. **灵活扩展**:可以在翻译类中添加任意逻辑(如带参数的翻译、复数形式等)
4. **编译期检查**:新增翻译键后,所有语言实现必须同步实现,否则编译报错

---

#### 9.1.2 方案选择

本项目采用**手写 Dart 类**方案而非官方 ARB 文件方案,原因：

- ✅ 无需额外配置和代码生成步骤
- ✅ IDE 原生支持跳转和重构
- ✅ 编译期类型安全
- ✅ 更灵活的翻译逻辑支持

**文件结构**:
```
lib/core/l10n/
├── l10n.dart                    # 导出文件 + BuildContext 扩展
├── app_localizations.dart       # 国际化基类 + 委托
├── app_localizations_zh.dart    # 中文实现
└── app_localizations_en.dart    # 英文实现
```

---

### 9.2 实现国际化基类

#### 9.2.1 AppLocalizations 基类

`lib/core/l10n/app_localizations.dart`

```dart
import 'package:flutter/material.dart';
import 'app_localizations_zh.dart';
import 'app_localizations_en.dart';

/// 应用国际化基类
///
/// 定义所有需要国际化的文本
abstract class AppLocalizations {
  const AppLocalizations();

  /// 从上下文获取当前语言的国际化实例
  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  /// 语言代码
  String get languageCode;

  // ==================== 通用 ====================
  String get appName => 'Flutter Run';

  // ==================== 导航栏 ====================
  String get navWidget;
  String get navBlog;
  String get navPainter;
  String get navKnowledge;
  String get navTools;
  String get navAccount;

  // ==================== 设置页面 ====================
  String get settings;
  String get darkMode;
  String get themeColor;
  String get fontSettings;
  String get languageSettings;
  String get versionInfo;
  String get logViewer;

  // ==================== 主题模式 ====================
  String get themeModeTitle;
  String get followSystem;
  String get followSystemDesc;
  String get manualSettings;
  String get lightMode;
  String get darkModeOption;
  String get themeModeChanged;
  String get followSystemEnabled;
  String get followSystemDisabled;
  String get lightModeEnabled;
  String get darkModeEnabled;

  // ==================== 主题色 ====================
  String get themeColorTitle;
  String get currentThemeColor;
  String get presetColors;
  String get customColor;
  String get themeColorChanged;

  // 主题色名称
  String get themeColorRed;
  String get themeColorOrange;
  String get themeColorYellow;
  String get themeColorGreen;
  String get themeColorBlue;
  String get themeColorIndigo;
  String get themeColorPurple;
  String get themeColorDeepPurple;
  String get themeColorTeal;
  String get themeColorCyan;

  // ==================== 字体设置 ====================
  String get fontSettingsTitle;
  String get fontScale;
  String get fontScaleDesc;
  String get previewText;
  String get previewTextContent;
  String get fontScaleChanged;

  // ==================== 语言设置 ====================
  String get languageSettingsTitle;
  String get languageSimplifiedChinese;
  String get languageEnglish;
  String get languageChanged;

  // ==================== 版本信息 ====================
  String get versionInfoTitle;
  String get currentVersion;
  String get buildNumber;
  String get flutterVersion;
  String get dartVersion;
  String get platform;

  // ==================== Widget 集录 ====================
  String get widgetShowcase;
  String get widgetCategoryStateless;
  String get widgetCategoryStateful;
  String get widgetCategoryOther;
  String get widgetPreview;
  String get widgetSampleCode;
  String get copyCode;
  String get codeCopied;
  String get noWidgets;

  // ... 更多翻译键
}

/// 国际化委托
class AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return ['zh', 'en'].contains(locale.languageCode);
  }

  @override
  Future<AppLocalizations> load(Locale locale) async {
    // 根据语言代码返回对应的国际化实例
    switch (locale.languageCode) {
      case 'zh':
        return const AppLocalizationsZh();
      case 'en':
        return const AppLocalizationsEn();
      default:
        return const AppLocalizationsZh();  // 默认中文
    }
  }

  @override
  bool shouldReload(AppLocalizationsDelegate old) => false;
}
```

**设计要点**:
1. **抽象基类**: 定义所有翻译键为抽象 getter
2. **静态 of 方法**: 提供标准的获取方式
3. **分组注释**: 按功能模块组织翻译键,便于维护
4. **委托类**: 实现 Flutter 本地化系统接口

---

### 9.3 实现语言翻译类

#### 9.3.1 中文翻译

`lib/core/l10n/app_localizations_zh.dart`

```dart
import 'app_localizations.dart';

/// 简体中文国际化
class AppLocalizationsZh extends AppLocalizations {
  const AppLocalizationsZh();

  @override
  String get languageCode => 'zh';

  // ==================== 导航栏 ====================
  @override
  String get navWidget => '组件集录';

  @override
  String get navBlog => '博客文章';

  @override
  String get navPainter => '绘制集录';

  @override
  String get navKnowledge => '知识集锦';

  @override
  String get navTools => '工具宝箱';

  @override
  String get navAccount => '应用信息';

  // ==================== 设置页面 ====================
  @override
  String get settings => '设置';

  @override
  String get darkMode => '深色模式';

  @override
  String get themeColor => '主题色';

  @override
  String get fontSettings => '字体设置';

  @override
  String get languageSettings => '语言设置';

  // ==================== 主题模式 ====================
  @override
  String get themeModeTitle => '深色模式';

  @override
  String get followSystem => '跟随系统';

  @override
  String get followSystemDesc => '自动根据系统设置切换主题';

  @override
  String get manualSettings => '手动设置';

  @override
  String get lightMode => '浅色模式';

  @override
  String get darkModeOption => '深色模式';

  // ==================== 语言设置 ====================
  @override
  String get languageSettingsTitle => '语言设置';

  @override
  String get languageSimplifiedChinese => '简体中文';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageChanged => '语言已切换';

  // ... 其他翻译
}
```

---

#### 9.3.2 英文翻译

`lib/core/l10n/app_localizations_en.dart`

```dart
import 'app_localizations.dart';

/// English localization
class AppLocalizationsEn extends AppLocalizations {
  const AppLocalizationsEn();

  @override
  String get languageCode => 'en';

  // ==================== Navigation ====================
  @override
  String get navWidget => 'Widgets';

  @override
  String get navBlog => 'Blog';

  @override
  String get navPainter => 'Painter';

  @override
  String get navKnowledge => 'Knowledge';

  @override
  String get navTools => 'Tools';

  @override
  String get navAccount => 'Account';

  // ==================== Settings Page ====================
  @override
  String get settings => 'Settings';

  @override
  String get darkMode => 'Dark Mode';

  @override
  String get themeColor => 'Theme Color';

  @override
  String get fontSettings => 'Font Settings';

  @override
  String get languageSettings => 'Language';

  // ==================== Theme Mode ====================
  @override
  String get themeModeTitle => 'Dark Mode';

  @override
  String get followSystem => 'Follow System';

  @override
  String get followSystemDesc => 'Automatically switch theme based on system settings';

  @override
  String get manualSettings => 'Manual Settings';

  @override
  String get lightMode => 'Light Mode';

  @override
  String get darkModeOption => 'Dark Mode';

  // ==================== Language Settings ====================
  @override
  String get languageSettingsTitle => 'Language';

  @override
  String get languageSimplifiedChinese => '简体中文';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageChanged => 'Language changed';

  // ... 其他翻译
}
```

---

### 9.4 创建便捷扩展

`lib/core/l10n/l10n.dart`

```dart
import 'package:flutter/widgets.dart';
import 'app_localizations.dart';

/// 国际化导出文件
///
/// 统一导出所有国际化相关类
export 'app_localizations.dart';
export 'app_localizations_zh.dart';
export 'app_localizations_en.dart';

/// BuildContext 扩展，便捷获取国际化文本
extension LocalizationExtension on BuildContext {
  /// 获取国际化实例
  AppLocalizations get l10n => AppLocalizations.of(this);
}
```

**使用对比**:
```dart
// 标准方式
final l10n = AppLocalizations.of(context);
Text(l10n.settings);

// 扩展方式（推荐）
Text(context.l10n.settings);
```

---

### 9.5 使用国际化

#### 9.5.1 在页面中使用

```dart
import 'package:flutter/material.dart';
import '../../../../core/l10n/l10n.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;  // ✅ 使用扩展方法获取

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.settings),  // ✅ 使用翻译文本
      ),
      body: ListView(
        children: [
          ListTile(
            leading: const Icon(Icons.dark_mode),
            title: Text(l10n.darkMode),
          ),
          ListTile(
            leading: const Icon(Icons.color_lens),
            title: Text(l10n.themeColor),
          ),
          ListTile(
            leading: const Icon(Icons.language),
            title: Text(l10n.languageSettings),
          ),
        ],
      ),
    );
  }
}
```

---

#### 9.5.2 语言切换实现

`lib/features/settings/presentation/pages/language_setting_page.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/settings/settings_cubit.dart';
import '../../../../core/l10n/l10n.dart';

/// 语言设置页
class LanguageSettingPage extends StatelessWidget {
  const LanguageSettingPage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final themeColor = Theme.of(context).primaryColor;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.languageSettingsTitle),
        centerTitle: true,
      ),
      body: BlocBuilder<SettingsCubit, dynamic>(
        builder: (context, state) {
          final cubit = context.read<SettingsCubit>();
          final currentLanguage = state.languageCode;

          return Column(
            children: [
              const SizedBox(height: 16),
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    // 简体中文
                    _LanguageOption(
                      title: l10n.languageSimplifiedChinese,
                      languageCode: 'zh',
                      currentLanguageCode: currentLanguage ?? 'zh',
                      themeColor: themeColor,
                      onTap: () {
                        cubit.setLanguage('zh');
                        _showSnackBar(context, l10n.languageChanged);
                      },
                    ),
                    const Divider(height: 1, indent: 16, endIndent: 16),
                    // English
                    _LanguageOption(
                      title: l10n.languageEnglish,
                      languageCode: 'en',
                      currentLanguageCode: currentLanguage ?? 'zh',
                      themeColor: themeColor,
                      onTap: () {
                        cubit.setLanguage('en');
                        _showSnackBar(context, l10n.languageChanged);
                      },
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), duration: const Duration(seconds: 1)),
    );
  }
}

/// 语言选项组件
class _LanguageOption extends StatelessWidget {
  final String title;
  final String? languageCode;
  final String? currentLanguageCode;
  final Color themeColor;
  final VoidCallback onTap;

  const _LanguageOption({
    required this.title,
    required this.languageCode,
    required this.currentLanguageCode,
    required this.themeColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = languageCode == currentLanguageCode;

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Row(
          children: [
            Expanded(child: Text(title)),
            if (isSelected)
              Icon(Icons.check, size: 20, color: themeColor),
          ],
        ),
      ),
    );
  }
}
```

---

### 9.6 配置 MaterialApp

`lib/core/router/app_router.dart`（关键代码）

```dart
import 'package:flutter_localizations/flutter_localizations.dart';
import '../l10n/l10n.dart';

static Widget createRouterApp() {
  return BlocProvider(
    create: (context) => SettingsCubit()..init(),
    child: BlocBuilder<SettingsCubit, dynamic>(
      builder: (context, settingsState) {
        final settings = context.watch<SettingsCubit>().state;

        // ✅ 根据设置确定 Locale
        Locale? locale;
        if (settings.languageCode != null) {
          locale = Locale(settings.languageCode!);
        }

        return MaterialApp.router(
          title: 'Flutter Run',
          // ✅ 国际化配置
          locale: locale,
          localizationsDelegates: const [
            AppLocalizationsDelegate(),           // ✅ 应用自定义翻译
            GlobalMaterialLocalizations.delegate, // Flutter Material 组件翻译
            GlobalWidgetsLocalizations.delegate,  // Flutter Widgets 翻译
            GlobalCupertinoLocalizations.delegate,// iOS 风格组件翻译
          ],
          supportedLocales: const [
            Locale('zh', 'CN'), // 简体中文
            Locale('en', 'US'), // 英文
          ],
          // 主题配置...
        );
      },
    ),
  );
}
```

**配置说明**:
1. **locale**: 当前语言,由 SettingsCubit 管理,null 时跟随系统
2. **localizationsDelegates**: 翻译委托列表,包含应用自定义翻译和 Flutter 内置翻译
3. **supportedLocales**: 支持的语言列表

---

### 9.7 添加新语言

添加新语言只需三步：

**步骤 1**: 创建语言实现类

```dart
// lib/core/l10n/app_localizations_ja.dart
class AppLocalizationsJa extends AppLocalizations {
  const AppLocalizationsJa();

  @override
  String get languageCode => 'ja';

  @override
  String get navWidget => 'ウィジェット';

  // ... 实现所有抽象 getter
}
```

**步骤 2**: 修改委托类

```dart
@override
Future<AppLocalizations> load(Locale locale) async {
  switch (locale.languageCode) {
    case 'zh':
      return const AppLocalizationsZh();
    case 'en':
      return const AppLocalizationsEn();
    case 'ja':
      return const AppLocalizationsJa();  // 新增
    default:
      return const AppLocalizationsZh();
  }
}

@override
bool isSupported(Locale locale) {
  return ['zh', 'en', 'ja'].contains(locale.languageCode);  // 新增 'ja'
}
```

**步骤 3**: 更新 supportedLocales

```dart
supportedLocales: const [
  Locale('zh', 'CN'),
  Locale('en', 'US'),
  Locale('ja', 'JP'),  // 新增
],
```

---

### 9.8 小结

本章完成了国际化系统：

| 组件 | 职责 | 文件 |
|------|------|------|
| **AppLocalizations** | 国际化基类,定义翻译键 | `core/l10n/app_localizations.dart` |
| **AppLocalizationsZh** | 中文翻译实现 | `core/l10n/app_localizations_zh.dart` |
| **AppLocalizationsEn** | 英文翻译实现 | `core/l10n/app_localizations_en.dart` |
| **AppLocalizationsDelegate** | 本地化委托 | `core/l10n/app_localizations.dart` |
| **LocalizationExtension** | 便捷扩展 | `core/l10n/l10n.dart` |
| **LanguageSettingPage** | 语言切换页面 | `features/settings/.../language_setting_page.dart` |

**手写方案 vs ARB 方案**:
- 本项目选择手写 Dart 类方案,适合中小型项目快速迭代
- 大型多语言项目(10+ 语言)可考虑 ARB 文件方案

**下一章**: 实现完整的网络请求与数据层（Blog 模块）。

---

## 第十章：网络请求与数据层

> **对应提交**: `da45c16` feat(blog): 实现博客文章界面及 macOS 网络权限配置
>
> **本章目标**: 实现 Blog 模块的完整三层架构（Domain/Data/Presentation），集成网络请求。

### 10.1 Blog 模块架构

**完整的 Clean Architecture 实现**:

```
lib/features/blog/
├── domain/                 # 领域层（核心）
│   ├── entities/          # 业务实体
│   │   ├── blog_article.dart
│   │   └── banner.dart
│   └── repositories/      # 仓储接口
│       └── blog_repository.dart
│
├── data/                   # 数据层
│   ├── models/            # 数据模型（DTO）
│   │   ├── article_model.dart
│   │   └── banner_model.dart
│   ├── datasources/       # 数据源
│   │   └── blog_remote_datasource.dart
│   └── repositories/      # 仓储实现
│       └── blog_repository_impl.dart
│
└── presentation/           # 表现层
    ├── bloc/              # BLoC 状态管理
    │   ├── blog_bloc.dart
    │   ├── blog_event.dart
    │   └── blog_state.dart
    ├── pages/             # 页面
    │   └── blog_page.dart
    └── widgets/           # 组件
        ├── article_card.dart
        └── blog_banner_section.dart
```

---

### 10.2 Domain 层

#### 10.2.1 定义业务实体

`lib/features/blog/domain/entities/blog_article.dart`

```dart
/// 博客文章实体（业务对象）
///
/// 纯 Dart 类，不依赖任何外部框架
class BlogArticle {
  final int id;
  final String title;
  final String author;
  final String publishTime;
  final String? desc;          // 简介
  final String? coverImageUrl; // 封面图
  final int chapterId;
  final String chapterName;
  final String link;

  const BlogArticle({
    required this.id,
    required this.title,
    required this.author,
    required this.publishTime,
    this.desc,
    this.coverImageUrl,
    required this.chapterId,
    required this.chapterName,
    required this.link,
  });
}
```

**设计原则**:
- ✅ 纯 Dart 类（不依赖 Flutter/JSON）
- ✅ 不可变（所有字段 final）
- ✅ 代表业务概念

---

#### 10.2.2 定义仓储接口

`lib/features/blog/domain/repositories/blog_repository.dart`

```dart
import '../../core/network/result.dart';
import '../entities/blog_article.dart';
import '../entities/banner.dart';

/// 博客数据仓储接口
///
/// 定义博客模块的数据操作契约（依赖倒置）
abstract class BlogRepository {
  /// 获取轮播图
  Future<Result<List<Banner>>> getBanners();

  /// 获取文章列表（分页）
  Future<Result<List<BlogArticle>>> getArticles(int page);
}
```

**设计原则**:
- ✅ 定义在 Domain 层（核心）
- ✅ 返回 Result 类型（强制错误处理）
- ✅ 返回业务实体（而非 DTO）

---

### 10.3 Data 层

#### 10.3.1 定义数据模型（DTO）

`lib/features/blog/data/models/article_model.dart`

```dart
import 'package:json_annotation/json_annotation.dart';
import '../../domain/entities/blog_article.dart';

part 'article_model.g.dart';

/// 文章数据模型（DTO）
///
/// 用于 JSON 序列化/反序列化
@JsonSerializable()
class ArticleModel {
  final int id;
  final String title;
  final String author;
  @JsonKey(name: 'niceDate')
  final String publishTime;
  final String? desc;
  @JsonKey(name: 'envelopePic')
  final String? coverImageUrl;
  final int chapterId;
  final String chapterName;
  final String link;

  const ArticleModel({
    required this.id,
    required this.title,
    required this.author,
    required this.publishTime,
    this.desc,
    this.coverImageUrl,
    required this.chapterId,
    required this.chapterName,
    required this.link,
  });

  /// JSON 反序列化
  factory ArticleModel.fromJson(Map<String, dynamic> json) =>
      _$ArticleModelFromJson(json);

  /// JSON 序列化
  Map<String, dynamic> toJson() => _$ArticleModelToJson(this);

  /// 转换为业务实体
  BlogArticle toEntity() {
    return BlogArticle(
      id: id,
      title: title,
      author: author,
      publishTime: publishTime,
      desc: desc,
      coverImageUrl: coverImageUrl,
      chapterId: chapterId,
      chapterName: chapterName,
      link: link,
    );
  }
}
```

**代码生成**:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

---

#### 10.3.2 定义远程数据源

`lib/features/blog/data/datasources/blog_remote_datasource.dart`

```dart
import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../../../../core/network/api_response.dart';
import '../models/article_model.dart';
import '../models/banner_model.dart';

part 'blog_remote_datasource.g.dart';

/// 博客远程数据源（Retrofit API）
@RestApi()
abstract class BlogRemoteDataSource {
  factory BlogRemoteDataSource(Dio dio) = _BlogRemoteDataSource;

  /// 获取轮播图
  @GET('/banner/json')
  Future<ApiResponse<List<BannerModel>>> getBanners();

  /// 获取文章列表
  @GET('/article/list/{page}/json')
  Future<ApiResponse<ArticleListData>> getArticleList(@Path('page') int page);
}

/// 文章列表数据包装
@JsonSerializable()
class ArticleListData {
  final List<ArticleModel>? datas;
  final int curPage;
  final int pageCount;

  const ArticleListData({
    this.datas,
    required this.curPage,
    required this.pageCount,
  });

  factory ArticleListData.fromJson(Map<String, dynamic> json) =>
      _$ArticleListDataFromJson(json);
}
```

**Retrofit 优势**:
- ✅ 声明式 API 定义
- ✅ 自动生成网络请求代码
- ✅ 类型安全

---

#### 10.3.3 实现 Repository

`lib/features/blog/data/repositories/blog_repository_impl.dart`

```dart
import '../../../../core/network/result.dart';
import '../../../../core/error/failures.dart';
import 'package:dio/dio.dart';
import '../../domain/entities/blog_article.dart';
import '../../domain/entities/banner.dart';
import '../../domain/repositories/blog_repository.dart';
import '../datasources/blog_remote_datasource.dart';

/// 博客仓储实现
class BlogRepositoryImpl implements BlogRepository {
  final BlogRemoteDataSource _remoteDataSource;

  const BlogRepositoryImpl(this._remoteDataSource);

  @override
  Future<Result<List<Banner>>> getBanners() async {
    try {
      // 1. 调用远程数据源
      final response = await _remoteDataSource.getBanners();

      // 2. 检查业务逻辑成功
      if (response.errorCode == 0) {
        // 3. 转换 DTO → Entity
        final banners = response.data?.map((dto) => dto.toEntity()).toList() ?? [];
        return Success(banners);
      } else {
        // 业务失败
        return Failure(ApiFailure(response.errorMsg ?? '未知错误'));
      }
    } on DioException catch (e) {
      // 网络异常
      return Failure(NetworkFailure(e.message ?? '网络错误'));
    } catch (e) {
      // 未知异常
      return Failure(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<Result<List<BlogArticle>>> getArticles(int page) async {
    try {
      final response = await _remoteDataSource.getArticleList(page);

      if (response.errorCode == 0) {
        final articles = response.data?.datas
            ?.map((dto) => dto.toEntity())
            .toList() ?? [];
        return Success(articles);
      } else {
        return Failure(ApiFailure(response.errorMsg ?? '未知错误'));
      }
    } on DioException catch (e) {
      return Failure(NetworkFailure(e.message ?? '网络错误'));
    } catch (e) {
      return Failure(UnknownFailure(e.toString()));
    }
  }
}
```

**设计要点**:
1. **异常转换**: 捕获 DioException 转为 NetworkFailure
2. **DTO → Entity**: 数据层返回业务实体
3. **Result 封装**: 统一的成功/失败返回

---

### 10.4 Presentation 层

#### 10.4.1 定义 BLoC 事件

`lib/features/blog/presentation/bloc/blog_event.dart`

```dart
import 'package:equatable/equatable.dart';

/// Blog 事件基类
sealed class BlogEvent extends Equatable {
  const BlogEvent();

  @override
  List<Object> get props => [];
}

/// 加载初始数据
class BlogLoadInitial extends BlogEvent {
  const BlogLoadInitial();
}

/// 加载更多文章
class BlogLoadMore extends BlogEvent {
  const BlogLoadMore();
}

/// 刷新数据
class BlogRefresh extends BlogEvent {
  const BlogRefresh();
}
```

---

#### 10.4.2 定义 BLoC 状态

`lib/features/blog/presentation/bloc/blog_state.dart`

```dart
import 'package:equatable/equatable.dart';
import '../../domain/entities/blog_article.dart';
import '../../domain/entities/banner.dart';

/// Blog 状态基类
sealed class BlogState extends Equatable {
  const BlogState();

  @override
  List<Object?> get props => [];
}

/// 初始状态
class BlogInitial extends BlogState {
  const BlogInitial();
}

/// 加载中
class BlogLoading extends BlogState {
  const BlogLoading();
}

/// 加载成功
class BlogLoaded extends BlogState {
  final List<Banner> banners;
  final List<BlogArticle> articles;
  final int currentPage;
  final bool hasMore;

  const BlogLoaded({
    required this.banners,
    required this.articles,
    required this.currentPage,
    this.hasMore = true,
  });

  @override
  List<Object?> get props => [banners, articles, currentPage, hasMore];

  BlogLoaded copyWith({
    List<Banner>? banners,
    List<BlogArticle>? articles,
    int? currentPage,
    bool? hasMore,
  }) {
    return BlogLoaded(
      banners: banners ?? this.banners,
      articles: articles ?? this.articles,
      currentPage: currentPage ?? this.currentPage,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

/// 加载失败
class BlogError extends BlogState {
  final String message;

  const BlogError(this.message);

  @override
  List<Object?> get props => [message];
}
```

---

#### 10.4.3 实现 BLoC

`lib/features/blog/presentation/bloc/blog_bloc.dart`

```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/repositories/blog_repository.dart';
import 'blog_event.dart';
import 'blog_state.dart';

/// 博客 BLoC
class BlogBloc extends Bloc<BlogEvent, BlogState> {
  final BlogRepository _repository;

  BlogBloc(this._repository) : super(const BlogInitial()) {
    on<BlogLoadInitial>(_onLoadInitial);
    on<BlogLoadMore>(_onLoadMore);
    on<BlogRefresh>(_onRefresh);
  }

  /// 加载初始数据
  Future<void> _onLoadInitial(
    BlogLoadInitial event,
    Emitter<BlogState> emit,
  ) async {
    emit(const BlogLoading());

    // 并发请求轮播图和文章
    final results = await Future.wait([
      _repository.getBanners(),
      _repository.getArticles(0),
    ]);

    final bannersResult = results[0];
    final articlesResult = results[1];

    // 处理结果
    if (bannersResult.isSuccess && articlesResult.isSuccess) {
      emit(BlogLoaded(
        banners: bannersResult.dataOrNull!,
        articles: articlesResult.dataOrNull!,
        currentPage: 0,
        hasMore: articlesResult.dataOrNull!.isNotEmpty,
      ));
    } else {
      final error = bannersResult.failureOrNull ?? articlesResult.failureOrNull!;
      emit(BlogError(error.message));
    }
  }

  /// 加载更多文章
  Future<void> _onLoadMore(
    BlogLoadMore event,
    Emitter<BlogState> emit,
  ) async {
    if (state is! BlogLoaded) return;

    final currentState = state as BlogLoaded;
    if (!currentState.hasMore) return;  // 没有更多数据

    final nextPage = currentState.currentPage + 1;
    final result = await _repository.getArticles(nextPage);

    result.when(
      success: (newArticles) {
        emit(currentState.copyWith(
          articles: [...currentState.articles, ...newArticles],
          currentPage: nextPage,
          hasMore: newArticles.isNotEmpty,
        ));
      },
      failure: (error) {
        emit(BlogError(error.message));
      },
    );
  }

  /// 刷新数据
  Future<void> _onRefresh(
    BlogRefresh event,
    Emitter<BlogState> emit,
  ) async {
    add(const BlogLoadInitial());  // 重新加载初始数据
  }
}
```

**设计要点**:
1. **事件驱动**: 通过事件触发状态变化
2. **并发请求**: 使用 Future.wait 提高性能
3. **分页加载**: 支持加载更多
4. **下拉刷新**: 重新加载初始数据

---

#### 10.4.4 实现页面

`lib/features/blog/presentation/pages/blog_page.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/network/api_client.dart';
import '../../data/datasources/blog_remote_datasource.dart';
import '../../data/repositories/blog_repository_impl.dart';
import '../bloc/blog_bloc.dart';
import '../bloc/blog_event.dart';
import '../bloc/blog_state.dart';
import '../widgets/article_card.dart';
import '../widgets/blog_banner_section.dart';

class BlogPage extends StatelessWidget {
  const BlogPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => BlogBloc(
        BlogRepositoryImpl(
          BlogRemoteDataSource(ApiClient.instance.dio),
        ),
      )..add(const BlogLoadInitial()),  // ✅ 自动加载
      child: const BlogView(),
    );
  }
}

class BlogView extends StatelessWidget {
  const BlogView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('博客'),
      ),
      body: BlocBuilder<BlogBloc, BlogState>(
        builder: (context, state) {
          return switch (state) {
            BlogInitial() => const SizedBox.shrink(),
            BlogLoading() => const Center(child: CircularProgressIndicator()),
            BlogError(:final message) => Center(child: Text('错误: $message')),
            BlogLoaded() => _buildContent(context, state),
          };
        },
      ),
    );
  }

  Widget _buildContent(BuildContext context, BlogLoaded state) {
    return RefreshIndicator(
      onRefresh: () async {
        context.read<BlogBloc>().add(const BlogRefresh());
      },
      child: ListView.builder(
        itemCount: state.articles.length + 1,  // +1 for banner
        itemBuilder: (context, index) {
          if (index == 0) {
            // 轮播图
            return BlogBannerSection(banners: state.banners);
          }

          final article = state.articles[index - 1];
          return ArticleCard(article: article);
        },
      ),
    );
  }
}
```

---

### 10.5 macOS 网络权限配置

**问题**: macOS 默认启用 App Sandbox，禁止网络请求

**解决方案**: 配置网络权限

`macos/Runner/DebugProfile.entitlements`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- ✅ 允许出站网络连接 -->
    <key>com.apple.security.network.client</key>
    <true/>
    
    <!-- 其他权限... -->
</dict>
</plist>
```

`macos/Runner/Release.entitlements`（同样配置）

---

### 10.6 小结

本章完成了完整的 Clean Architecture 三层实现：

| 层级 | 组件 | 职责 |
|------|------|------|
| **Domain** | BlogArticle | 业务实体 |
|  | BlogRepository | 仓储接口 |
| **Data** | ArticleModel | 数据模型（DTO） |
|  | BlogRemoteDataSource | 远程数据源（Retrofit） |
|  | BlogRepositoryImpl | 仓储实现 |
| **Presentation** | BlogBloc | 状态管理 |
|  | BlogPage | UI 页面 |

**下一章**: 实现 Widget 组件库模块。

---

## 第十一章：Widget 组件库模块

> **对应提交**: `b3e1d14` feat(widget): 实现组件集录页面
>
> **本章目标**: 实现 Widget 组件展示系统，提供组件分类和预览功能。

### 11.1 Widget 模块设计

**需求**:
- 展示 Flutter 常用组件
- 按分类组织（基础/布局/交互/动画等）
- 点击跳转到组件详情页

**数据来源**: 本地 Mock 数据（后续可替换为远程 API）

---

### 11.2 Domain 层

#### 11.2.1 定义模型

`lib/features/widget/domain/models/widget_info.dart`

```dart
/// Widget 信息
class WidgetInfo {
  final String name;         // 组件名称
  final String description;  // 简介
  final String route;        // 路由路径

  const WidgetInfo({
    required this.name,
    required this.description,
    required this.route,
  });
}
```

`lib/features/widget/domain/models/widget_category.dart`

```dart
import 'widget_info.dart';

/// Widget 分类
class WidgetCategory {
  final String name;         // 分类名称
  final IconData icon;       // 分类图标
  final List<WidgetInfo> items;  // 组件列表

  const WidgetCategory({
    required this.name,
    required this.icon,
    required this.items,
  });
}
```

---

### 11.3 Data 层

#### 11.3.1 Mock 数据

`lib/features/widget/data/mock_widget_data.dart`

```dart
import 'package:flutter/material.dart';
import '../domain/models/widget_category.dart';
import '../domain/models/widget_info.dart';

/// Widget 分类 Mock 数据
final List<WidgetCategory> mockWidgetCategories = [
  WidgetCategory(
    name: '基础组件',
    icon: Icons.widgets,
    items: [
      const WidgetInfo(
        name: 'Text',
        description: '文本显示组件',
        route: '/widget/text',
      ),
      const WidgetInfo(
        name: 'Button',
        description: '按钮组件（ElevatedButton, TextButton, etc）',
        route: '/widget/button',
      ),
      const WidgetInfo(
        name: 'Icon',
        description: '图标组件',
        route: '/widget/icon',
      ),
      const WidgetInfo(
        name: 'Image',
        description: '图片组件',
        route: '/widget/image',
      ),
    ],
  ),
  WidgetCategory(
    name: '布局组件',
    icon: Icons.view_column,
    items: [
      const WidgetInfo(
        name: 'Container',
        description: '容器组件（背景、边框、阴影等）',
        route: '/widget/container',
      ),
      const WidgetInfo(
        name: 'Row & Column',
        description: '行列布局',
        route: '/widget/row_column',
      ),
      const WidgetInfo(
        name: 'Stack',
        description: '层叠布局',
        route: '/widget/stack',
      ),
      const WidgetInfo(
        name: 'Flex',
        description: '弹性布局',
        route: '/widget/flex',
      ),
    ],
  ),
  WidgetCategory(
    name: '列表组件',
    icon: Icons.list,
    items: [
      const WidgetInfo(
        name: 'ListView',
        description: '列表视图',
        route: '/widget/listview',
      ),
      const WidgetInfo(
        name: 'GridView',
        description: '网格视图',
        route: '/widget/gridview',
      ),
      const WidgetInfo(
        name: 'CustomScrollView',
        description: '自定义滚动视图（Sliver）',
        route: '/widget/custom_scrollview',
      ),
    ],
  ),
  WidgetCategory(
    name: '交互组件',
    icon: Icons.touch_app,
    items: [
      const WidgetInfo(
        name: 'GestureDetector',
        description: '手势检测',
        route: '/widget/gesture_detector',
      ),
      const WidgetInfo(
        name: 'TextField',
        description: '文本输入框',
        route: '/widget/textfield',
      ),
      const WidgetInfo(
        name: 'Checkbox & Radio',
        description: '复选框和单选框',
        route: '/widget/checkbox_radio',
      ),
      const WidgetInfo(
        name: 'Switch & Slider',
        description: '开关和滑块',
        route: '/widget/switch_slider',
      ),
    ],
  ),
  WidgetCategory(
    name: '动画组件',
    icon: Icons.animation,
    items: [
      const WidgetInfo(
        name: 'AnimatedContainer',
        description: '隐式动画容器',
        route: '/widget/animated_container',
      ),
      const WidgetInfo(
        name: 'Hero',
        description: '页面过渡动画',
        route: '/widget/hero',
      ),
      const WidgetInfo(
        name: 'AnimationController',
        description: '显式动画控制器',
        route: '/widget/animation_controller',
      ),
    ],
  ),
];
```

---

### 11.4 Presentation 层

#### 11.4.1 Widget 页面

`lib/features/widget/presentation/pages/widget_page.dart`

```dart
import 'package:flutter/material.dart';
import '../../data/mock_widget_data.dart';
import '../widgets/widget_card.dart';

class WidgetPage extends StatelessWidget {
  const WidgetPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('组件集录'),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: mockWidgetCategories.length,
        itemBuilder: (context, index) {
          final category = mockWidgetCategories[index];
          return _buildCategory(context, category);
        },
      ),
    );
  }

  Widget _buildCategory(BuildContext context, WidgetCategory category) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 分类标题
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Row(
            children: [
              Icon(category.icon, size: 24),
              const SizedBox(width: 8),
              Text(
                category.name,
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ],
          ),
        ),

        // 组件卡片网格
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 3,
          ),
          itemCount: category.items.length,
          itemBuilder: (context, itemIndex) {
            final widget = category.items[itemIndex];
            return WidgetCard(widgetInfo: widget);
          },
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}
```

---

#### 11.4.2 Widget 卡片

`lib/features/widget/presentation/widgets/widget_card.dart`

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../domain/models/widget_info.dart';

class WidgetCard extends StatelessWidget {
  final WidgetInfo widgetInfo;

  const WidgetCard({
    super.key,
    required this.widgetInfo,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: () {
          // TODO: 跳转到组件详情页
          context.push(widgetInfo.route);
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widgetInfo.name,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                widgetInfo.description,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey,
                    ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

---

### 11.5 小结

本章完成了 Widget 组件库模块：

| 组件 | 职责 | 文件 |
|------|------|------|
| **WidgetInfo** | 组件信息模型 | `domain/models/widget_info.dart` |
| **WidgetCategory** | 组件分类模型 | `domain/models/widget_category.dart` |
| **mockWidgetCategories** | Mock 数据 | `data/mock_widget_data.dart` |
| **WidgetPage** | 组件列表页面 | `presentation/pages/widget_page.dart` |
| **WidgetCard** | 组件卡片 | `presentation/widgets/widget_card.dart` |

**改进方向**（参考第三章分析报告）:
- 添加 Domain 层 Repository 接口
- 将 Mock 数据移至 Repository 实现
- 支持远程 API 切换

---

## 第十二章：依赖注入 (GetIt)

> **本章目标**: 理解依赖注入的概念和作用，掌握 GetIt 的使用方法，学会在项目中正确配置和使用依赖注入。

### 12.1 架构设计概述

#### 12.1.1 什么是依赖注入

**依赖注入 (Dependency Injection, DI)** 是一种设计模式，用于实现控制反转 (Inversion of Control, IoC)。核心思想是：**对象不自己创建依赖，而是由外部注入**。

**不使用依赖注入**:

```dart
class BlogBloc {
  // ❌ 直接在类内部创建依赖
  final BlogRepository _repository = BlogRepositoryImpl(
    BlogRemoteDataSourceImpl(ApiClient()),
  );
}
```

**使用依赖注入**:

```dart
class BlogBloc {
  // ✅ 依赖通过构造函数注入
  final BlogRepository _repository;

  BlogBloc(this._repository);
}
```

#### 12.1.2 为什么需要依赖注入

| 问题 | 不使用 DI | 使用 DI |
|------|----------|---------|
| **耦合度** | 高度耦合，类直接依赖具体实现 | 松耦合，只依赖抽象接口 |
| **可测试性** | 难以测试，无法替换为 Mock | 易于测试，可注入 Mock 实现 |
| **可维护性** | 修改实现需要改动多处代码 | 只需修改配置，调用方无感知 |
| **复用性** | 依赖写死，难以复用 | 灵活配置，易于复用 |

#### 12.1.3 依赖注入与 Clean Architecture

在 Clean Architecture 中，依赖注入是实现**依赖倒置原则 (DIP)** 的关键手段：

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌─────────────┐                                            │
│  │   BlogBloc  │ ◄──── 依赖 BlogRepository (接口)           │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ GetIt 注入具体实现
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  ┌─────────────────────┐                                    │
│  │  BlogRepository     │ ◄──── 抽象接口 (定义在 Domain 层)  │
│  │  (abstract class)   │                                    │
│  └─────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ 实现
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌─────────────────────┐    ┌──────────────────────────┐   │
│  │ BlogRepositoryImpl  │───►│ BlogRemoteDataSourceImpl │   │
│  └─────────────────────┘    └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**依赖方向**: 高层模块不依赖低层模块，两者都依赖抽象（接口）。

---

### 12.2 依赖注入方案对比

Flutter 生态中有多种依赖注入方案，以下是主流方案对比：

#### 12.2.1 方案对比表

| 特性 | GetIt | Provider | Riverpod | Injectable |
|------|-------|----------|----------|------------|
| **类型** | Service Locator | DI + 状态管理 | DI + 状态管理 | 代码生成 DI |
| **学习曲线** | ⭐ 简单 | ⭐⭐ 中等 | ⭐⭐⭐ 较陡 | ⭐⭐ 中等 |
| **与 Widget 树耦合** | ❌ 无关 | ✅ 强耦合 | ✅ 强耦合 | ❌ 无关 |
| **编译时安全** | ❌ 运行时检查 | ❌ 运行时检查 | ✅ 编译时检查 | ✅ 编译时检查 |
| **代码生成** | ❌ 不需要 | ❌ 不需要 | ❌ 不需要 | ✅ 需要 |
| **异步初始化** | ✅ 支持 | ⚠️ 需配合 FutureProvider | ✅ 支持 | ✅ 支持 |
| **作用域管理** | ✅ 支持 | ✅ 支持 | ✅ 支持 | ✅ 支持 |
| **适用场景** | 服务层 DI | 状态 + UI 交互 | 复杂状态管理 | 大型项目 |
| **与 BLoC 配合** | ⭐⭐⭐ 完美 | ⭐⭐ 一般 | ⭐⭐ 一般 | ⭐⭐⭐ 完美 |

#### 12.2.2 各方案简介

**1. GetIt (Service Locator)**

```dart
// 注册
getIt.registerLazySingleton<ApiClient>(() => ApiClient());

// 使用
final apiClient = getIt<ApiClient>();
```

**2. Provider**

```dart
// 注册（需要在 Widget 树中）
MultiProvider(
  providers: [
    Provider<ApiClient>(create: (_) => ApiClient()),
  ],
  child: MyApp(),
)

// 使用（必须在 Widget 树中）
final apiClient = context.read<ApiClient>();
```

**3. Riverpod**

```dart
// 定义（全局）
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

// 使用
final apiClient = ref.watch(apiClientProvider);
```

**4. Injectable (基于 GetIt + 代码生成)**

```dart
// 使用注解
@singleton
class ApiClient {}

// 自动生成注册代码
await configureDependencies();
```

#### 12.2.3 为什么选择 GetIt

本项目选择 GetIt 的理由：

| 理由 | 说明 |
|------|------|
| **简单直接** | 无需代码生成，API 简洁，5 分钟上手 |
| **与 Widget 树解耦** | 在任何地方都能获取依赖，不限于 Widget 中 |
| **与 BLoC 完美配合** | BLoC 已负责状态管理，GetIt 专注于 DI |
| **灵活的注册方式** | 支持单例、懒加载、工厂等多种模式 |
| **社区成熟** | 使用广泛，文档完善，问题容易解决 |

**关键决策**:

- 状态管理 → BLoC（已在第三章引入）
- 依赖注入 → GetIt（本章）

这样职责分明，避免一个库承担过多责任。

---

### 12.3 GetIt 实现详解

#### 12.3.1 添加依赖

```yaml
# pubspec.yaml
dependencies:
  get_it: ^8.0.3
```

```bash
flutter pub get
```

#### 12.3.2 创建注入配置文件

`lib/core/di/injection.dart`

```dart
import 'package:flutter/widgets.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../network/api_client.dart';
import '../settings/settings_cubit.dart';
import '../../features/blog/data/datasources/blog_remote_datasource.dart';
import '../../features/blog/data/repositories/blog_repository_impl.dart';
import '../../features/blog/domain/repositories/blog_repository.dart';
import '../../features/blog/presentation/bloc/blog_bloc.dart';

/// 全局依赖注入容器实例
///
/// 使用方式:
/// ```dart
/// // 获取单例
/// final apiClient = getIt<ApiClient>();
///
/// // 获取工厂实例(每次调用创建新实例)
/// final blogBloc = getIt<BlogBloc>();
/// ```
final GetIt getIt = GetIt.instance;

/// 初始化依赖注入
///
/// 在应用启动时调用此方法初始化所有依赖
/// 必须在 runApp() 之前调用
Future<void> setupDependencies() async {
  // ==================== Flutter Binding ====================
  // 确保 Flutter binding 初始化 (SharedPreferences 需要)
  WidgetsFlutterBinding.ensureInitialized();

  // ==================== 外部依赖 ====================
  // SharedPreferences (异步初始化,需要 await)
  final sharedPreferences = await SharedPreferences.getInstance();
  getIt.registerSingleton<SharedPreferences>(sharedPreferences);

  // ==================== 核心服务 ====================
  // ApiClient - 网络请求客户端 (单例)
  getIt.registerLazySingleton<ApiClient>(() => ApiClient());

  // ==================== Blog 模块 ====================
  _setupBlogModule();

  // ==================== Settings 模块 ====================
  _setupSettingsModule();
}

/// 配置 Blog 模块依赖
void _setupBlogModule() {
  // DataSource - 数据源 (单例)
  getIt.registerLazySingleton<BlogRemoteDataSource>(
    () => BlogRemoteDataSourceImpl(getIt<ApiClient>()),
  );

  // Repository - 仓储 (单例)
  getIt.registerLazySingleton<BlogRepository>(
    () => BlogRepositoryImpl(getIt<BlogRemoteDataSource>()),
  );

  // Bloc - 业务逻辑组件 (工厂,每次创建新实例)
  // 使用 Factory 是因为每个页面需要独立的 Bloc 实例
  getIt.registerFactory<BlogBloc>(
    () => BlogBloc(getIt<BlogRepository>()),
  );
}

/// 配置 Settings 模块依赖
void _setupSettingsModule() {
  // SettingsCubit - 设置状态管理 (单例)
  // 使用单例是因为设置是全局共享的
  getIt.registerLazySingleton<SettingsCubit>(
    () => SettingsCubit(),
  );
}

/// 重置依赖注入容器
///
/// 主要用于测试场景,重置所有已注册的依赖
Future<void> resetDependencies() async {
  await getIt.reset();
}
```

#### 12.3.3 在 main.dart 中初始化

```dart
import 'core/di/injection.dart';

void main() async {
  // 初始化依赖注入容器
  // 必须在 runApp() 之前完成
  await setupDependencies();

  runApp(const MyApp());
}
```

#### 12.3.4 在页面中使用

```dart
import '../../../../core/di/injection.dart';
import '../bloc/blog_bloc.dart';

class BlogPage extends StatelessWidget {
  const BlogPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      // 通过 getIt 获取 BlogBloc 实例
      create: (context) => getIt<BlogBloc>()..add(const LoadBlogData()),
      child: const _BlogContent(),
    );
  }
}
```

---

### 12.4 注册方式详解

GetIt 提供三种主要的注册方式，适用于不同场景：

#### 12.4.1 注册方式对比

| 注册方式 | 创建时机 | 实例数量 | 适用场景 |
|----------|----------|----------|----------|
| `registerSingleton` | 注册时立即创建 | 全局唯一 | 需要预加载的服务 |
| `registerLazySingleton` | 首次获取时创建 | 全局唯一 | 大多数服务层组件 |
| `registerFactory` | 每次获取都创建 | 每次新实例 | BLoC/Cubit、临时对象 |

#### 12.4.2 registerSingleton - 立即单例

```dart
// 注册时立即创建实例
// 适用于：需要异步初始化、必须预加载的服务

final sharedPreferences = await SharedPreferences.getInstance();
getIt.registerSingleton<SharedPreferences>(sharedPreferences);

// 特点：
// - 注册时就创建实例（需要 await）
// - 全局唯一，所有调用返回同一实例
// - 适合需要提前初始化的外部依赖
```

#### 12.4.3 registerLazySingleton - 懒加载单例

```dart
// 首次调用 getIt<T>() 时才创建实例
// 适用于：大多数服务层组件

getIt.registerLazySingleton<ApiClient>(() => ApiClient());
getIt.registerLazySingleton<BlogRepository>(
  () => BlogRepositoryImpl(getIt<BlogRemoteDataSource>()),
);

// 特点：
// - 延迟创建，节省启动时间
// - 全局唯一，所有调用返回同一实例
// - 适合无状态的服务类
```

#### 12.4.4 registerFactory - 工厂模式

```dart
// 每次调用 getIt<T>() 都创建新实例
// 适用于：BLoC、有状态的临时对象

getIt.registerFactory<BlogBloc>(
  () => BlogBloc(getIt<BlogRepository>()),
);

// 特点：
// - 每次调用都创建新实例
// - 适合需要独立状态的组件
// - BLoC/Cubit 必须使用此方式（每个页面需要独立实例）
```

#### 12.4.5 决策流程图

```
需要注册一个依赖
        │
        ▼
   需要异步初始化？
     ╱        ╲
   是          否
    │           │
    ▼           ▼
registerSingleton   需要多个实例？
                     ╱        ╲
                   是          否
                    │           │
                    ▼           ▼
              registerFactory  registerLazySingleton
```

---

### 12.5 判断哪些组件需要注入

#### 12.5.1 需要注入的组件

| 组件类型 | 是否注入 | 注册方式 | 原因 |
|----------|----------|----------|------|
| **ApiClient** | ✅ | LazySingleton | 全局唯一，管理网络配置 |
| **DataSource** | ✅ | LazySingleton | 封装数据访问，便于替换 |
| **Repository** | ✅ | LazySingleton | 业务逻辑层，接口抽象 |
| **BLoC/Cubit** | ✅ | Factory | 每个页面需要独立状态 |
| **全局 Cubit** | ✅ | LazySingleton | 如 SettingsCubit，全局共享 |
| **外部 SDK** | ✅ | Singleton | 如 SharedPreferences |

#### 12.5.2 不需要注入的组件

| 组件类型 | 是否注入 | 原因 |
|----------|----------|------|
| **Widget** | ❌ | Widget 由 Flutter 框架管理 |
| **Model/Entity** | ❌ | 纯数据类，无依赖 |
| **工具函数** | ❌ | 静态方法，无需实例化 |
| **常量配置** | ❌ | 直接使用静态常量 |
| **简单页面状态** | ❌ | 用 StatefulWidget 即可 |

#### 12.5.3 判断原则

问自己以下问题：

1. **这个类有外部依赖吗？**
   - 是 → 考虑注入
   - 否 → 通常不需要注入

2. **这个类需要被测试时替换为 Mock 吗？**
   - 是 → 必须注入
   - 否 → 可以不注入

3. **这个类的实例需要全局共享吗？**
   - 是 → 注入为 Singleton
   - 否 → 考虑是否需要注入

4. **这个类是否跨越架构层边界？**
   - 是（如 Repository）→ 必须注入
   - 否 → 可以不注入

---

### 12.6 依赖链与自动解析

GetIt 会自动解析依赖链，按正确顺序创建实例：

#### 12.6.1 依赖链示例

```dart
// 注册顺序可以任意，GetIt 会自动处理依赖关系
getIt.registerLazySingleton<ApiClient>(() => ApiClient());

getIt.registerLazySingleton<BlogRemoteDataSource>(
  () => BlogRemoteDataSourceImpl(getIt<ApiClient>()),  // 依赖 ApiClient
);

getIt.registerLazySingleton<BlogRepository>(
  () => BlogRepositoryImpl(getIt<BlogRemoteDataSource>()),  // 依赖 DataSource
);

getIt.registerFactory<BlogBloc>(
  () => BlogBloc(getIt<BlogRepository>()),  // 依赖 Repository
);
```

#### 12.6.2 解析过程

当调用 `getIt<BlogBloc>()` 时：

```
1. getIt<BlogBloc>()
   │
   ├─► 需要 BlogRepository
   │   │
   │   ├─► 需要 BlogRemoteDataSource
   │   │   │
   │   │   ├─► 需要 ApiClient
   │   │   │   │
   │   │   │   └─► ApiClient 无依赖，创建并返回
   │   │   │
   │   │   └─► 使用 ApiClient 创建 BlogRemoteDataSourceImpl
   │   │
   │   └─► 使用 DataSource 创建 BlogRepositoryImpl
   │
   └─► 使用 Repository 创建 BlogBloc，返回新实例
```

---

### 12.7 模块化组织

当项目变大时，建议按模块组织依赖注入：

#### 12.7.1 目录结构

```
lib/
  core/
    di/
      injection.dart           # 主入口，调用各模块配置
      modules/
        core_module.dart       # 核心服务（ApiClient, SharedPreferences）
        blog_module.dart       # Blog 模块依赖
        settings_module.dart   # Settings 模块依赖
```

#### 12.7.2 模块化示例

`lib/core/di/modules/blog_module.dart`

```dart
import 'package:get_it/get_it.dart';
import '../../../features/blog/data/datasources/blog_remote_datasource.dart';
import '../../../features/blog/data/repositories/blog_repository_impl.dart';
import '../../../features/blog/domain/repositories/blog_repository.dart';
import '../../../features/blog/presentation/bloc/blog_bloc.dart';
import '../../network/api_client.dart';

/// 配置 Blog 模块依赖
void setupBlogModule(GetIt getIt) {
  getIt.registerLazySingleton<BlogRemoteDataSource>(
    () => BlogRemoteDataSourceImpl(getIt<ApiClient>()),
  );

  getIt.registerLazySingleton<BlogRepository>(
    () => BlogRepositoryImpl(getIt<BlogRemoteDataSource>()),
  );

  getIt.registerFactory<BlogBloc>(
    () => BlogBloc(getIt<BlogRepository>()),
  );
}
```

`lib/core/di/injection.dart`

```dart
import 'modules/core_module.dart';
import 'modules/blog_module.dart';
import 'modules/settings_module.dart';

Future<void> setupDependencies() async {
  await setupCoreModule(getIt);   // 核心服务（需要 await）
  setupBlogModule(getIt);         // Blog 模块
  setupSettingsModule(getIt);     // Settings 模块
}
```

---

### 12.8 测试中使用

依赖注入的主要优势之一是便于测试：

#### 12.8.1 替换为 Mock

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

// 创建 Mock 类
class MockBlogRepository extends Mock implements BlogRepository {}

void main() {
  late MockBlogRepository mockRepository;
  late BlogBloc bloc;

  setUp(() {
    // 重置 GetIt
    getIt.reset();

    // 注册 Mock
    mockRepository = MockBlogRepository();
    getIt.registerSingleton<BlogRepository>(mockRepository);

    // 创建被测对象
    bloc = BlogBloc(getIt<BlogRepository>());
  });

  test('should load banners', () async {
    // Arrange
    when(() => mockRepository.getBanners())
        .thenAnswer((_) async => Success([...]));

    // Act
    bloc.add(const LoadBlogData());

    // Assert
    await expectLater(
      bloc.stream,
      emits(isA<BlogLoaded>()),
    );
  });
}
```

#### 12.8.2 测试配置文件

`test/core/di/test_injection.dart`

```dart
import 'package:get_it/get_it.dart';
import 'package:mocktail/mocktail.dart';

final getIt = GetIt.instance;

/// 配置测试环境的依赖
Future<void> setupTestDependencies() async {
  await getIt.reset();

  // 注册所有 Mock
  getIt.registerSingleton<BlogRepository>(MockBlogRepository());
  getIt.registerSingleton<ApiClient>(MockApiClient());
}
```

---

### 12.9 常见问题

#### Q1: GetIt 和 Provider 可以一起用吗？

**可以**。常见模式：

- GetIt：管理服务层依赖（ApiClient, Repository）
- Provider/BlocProvider：管理 UI 层状态（BLoC, Cubit）

```dart
BlocProvider(
  // GetIt 创建 BLoC，BlocProvider 管理生命周期
  create: (context) => getIt<BlogBloc>(),
  child: BlogPage(),
)
```

#### Q2: 循环依赖怎么办？

GetIt 不支持循环依赖，会抛出异常。解决方案：

1. **重新设计架构**：循环依赖通常意味着设计问题
2. **引入中间层**：通过接口或事件解耦
3. **延迟注入**：使用 `getIt.getAsync()` 或回调

#### Q3: 如何处理多环境配置？

```dart
enum Environment { dev, staging, prod }

Future<void> setupDependencies(Environment env) async {
  switch (env) {
    case Environment.dev:
      getIt.registerSingleton<ApiClient>(ApiClient(baseUrl: 'dev.api.com'));
      break;
    case Environment.prod:
      getIt.registerSingleton<ApiClient>(ApiClient(baseUrl: 'api.com'));
      break;
  }
}
```

#### Q4: 如何调试依赖注入问题？

```dart
// 检查是否已注册
if (getIt.isRegistered<ApiClient>()) {
  print('ApiClient 已注册');
}

// 开启详细日志
GetIt.I.allowReassignment = true;  // 允许覆盖注册（仅调试用）
```

---

### 12.10 小结

本章介绍了依赖注入的概念和 GetIt 的使用方法：

| 主题 | 要点 |
|------|------|
| **核心概念** | 对象不自己创建依赖，而是由外部注入 |
| **方案选择** | GetIt 简单、与 BLoC 配合好、与 Widget 树解耦 |
| **注册方式** | Singleton（立即）、LazySingleton（延迟）、Factory（每次新建） |
| **判断原则** | 有外部依赖、需要 Mock、跨层边界 → 需要注入 |
| **组织方式** | 按模块拆分，主入口统一调用 |
| **测试支持** | 轻松替换为 Mock，便于单元测试 |

**项目文件结构**:

```
lib/core/di/
  injection.dart          # 依赖注入主入口
```

**最佳实践**:

1. ✅ 在 `main()` 中 `runApp()` 之前初始化
2. ✅ Repository/DataSource 用 LazySingleton
3. ✅ BLoC/Cubit 用 Factory（除非是全局共享的）
4. ✅ 依赖接口而非实现
5. ✅ 按模块组织注册代码
6. ❌ 不要在 Widget 中直接 new 依赖
7. ❌ 不要注册无依赖的简单工具类

---

## 附录

### A. 常见问题

#### Q1: 如何添加新的依赖？

```bash
# 添加运行时依赖
flutter pub add package_name

# 添加开发依赖
flutter pub add --dev package_name

# 示例
flutter pub add dio
flutter pub add --dev build_runner
```

---

#### Q2: 如何生成代码（JSON/Retrofit）？

```bash
# 生成代码
flutter pub run build_runner build

# 生成代码（删除冲突）
flutter pub run build_runner build --delete-conflicting-outputs

# 监听文件变化自动生成
flutter pub run build_runner watch
```

---

#### Q3: 如何运行特定平台？

```bash
# macOS
flutter run -d macos

# Chrome
flutter run -d chrome

# Android 模拟器
flutter run -d emulator-5554

# 查看所有设备
flutter devices
```

---

#### Q4: 如何调试网络请求？

1. 查看 Dio 日志（已配置 PrettyDioLogger）
2. 使用 Talker 日志查看器：
   ```dart
   // 在设置页面添加按钮
   ElevatedButton(
     onPressed: () {
       TalkerConfig.showLogs(context);
     },
     child: const Text('查看日志'),
   );
   ```

---

### B. 最佳实践

#### B.1 代码组织

✅ **推荐**:
- 按功能模块垂直切分（feature-first）
- 每个模块遵循 Clean Architecture
- Core 层存放通用基础设施

❌ **不推荐**:
- 按文件类型分层（models/、views/、controllers/）
- 所有功能代码放在一个目录

---

#### B.2 状态管理

✅ **推荐**:
- 简单状态使用 StatefulWidget
- 复杂状态使用 BLoC/Cubit
- 全局状态使用 Provider/BlocProvider

❌ **不推荐**:
- 所有状态都用 BLoC（过度设计）
- 到处使用 setState（难以维护）

---

#### B.3 错误处理

✅ **推荐**:
- 使用 Result 模式强制错误处理
- 在 Data 层转换异常为 Failure
- Presentation 层展示友好错误提示

❌ **不推荐**:
- 抛出未捕获的异常
- 吞掉错误不处理
- 直接展示技术错误信息给用户

---

### C. 性能优化建议

#### C.1 列表性能

```dart
// ✅ 使用 ListView.builder（懒加载）
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) => ItemWidget(items[index]),
)

// ❌ 使用 ListView(children: [...])（一次性构建所有）
ListView(
  children: items.map((item) => ItemWidget(item)).toList(),
)
```

---

#### C.2 Widget 重建优化

```dart
// ✅ 使用 const 构造函数
const Text('Hello')

// ✅ 提取不变的 Widget 为常量
class MyWidget extends StatelessWidget {
  static const _title = Text('Title');  // ✅

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _title,  // 不会重建
        Text(dynamicContent),  // 动态内容
      ],
    );
  }
}
```

---

#### C.3 图片优化

```dart
// ✅ 使用缓存网络图片
import 'package:cached_network_image/cached_network_image.dart';

CachedNetworkImage(
  imageUrl: url,
  placeholder: (context, url) => CircularProgressIndicator(),
  errorWidget: (context, url, error) => Icon(Icons.error),
)

// ✅ 指定图片大小（避免解码大图）
Image.network(
  url,
  width: 100,
  height: 100,
  fit: BoxFit.cover,
)
```

---

### D. 参考资源

#### 官方文档
- [Flutter 官方文档](https://flutter.dev/docs)
- [Dart 语言指南](https://dart.dev/guides)
- [Effective Dart](https://dart.dev/guides/language/effective-dart)

#### 架构设计
- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Flutter Clean Architecture (Reso Coder)](https://resocoder.com/flutter-clean-architecture-tdd/)

#### 状态管理
- [flutter_bloc 文档](https://bloclibrary.dev/)
- [Provider 文档](https://pub.dev/packages/provider)

#### 网络请求
- [Dio 文档](https://pub.dev/packages/dio)
- [Retrofit 文档](https://pub.dev/packages/retrofit)

#### 代码生成
- [json_serializable](https://pub.dev/packages/json_serializable)
- [freezed](https://pub.dev/packages/freezed)

---

### E. 致谢

本项目参考了以下优秀开源项目：
- [FlutterUnit](https://github.com/toly1994328/FlutterUnit) - FxStarter 框架
- [wanandroid_flutter](https://github.com/qq326646683/flutter_wanandroid) - API 数据源
- [Flutter 官方示例](https://github.com/flutter/samples)

---

