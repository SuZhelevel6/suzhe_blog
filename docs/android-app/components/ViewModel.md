## ViewModel

ViewModel 是 Jetpack 中的一个重要组件，用于存储和管理 UI 相关数据，具备对宿主生命周期的感知能力。借助 ViewModel，在页面因配置变更（如横竖屏切换、分辨率调整、权限变更、系统字体样式变更等）导致销毁重建后，依然能复用之前保存的数据，从而提升用户体验与应用性能。

本文将深入介绍 ViewModel 的基本使用方式、常规和进阶用法、跨页面数据共享方案，以及配置变更时 ViewModel 复用的内部实现原理，并给出最佳实践建议。

---

### 1. ViewModel 的基本概念

- **生命周期感知**：ViewModel 能感知宿主（Activity、Fragment）的生命周期变化，不会因为界面销毁而立即释放，从而实现数据的持久保存。
- **数据复用**：在配置变更后，页面会重建，但获取的依然是之前创建的 ViewModel 实例，保证数据一致性。
- **内存优化**：避免在 Activity/Fragment 中直接保存大量数据，防止频繁重建带来的内存开销。

---

### 2. 使用方式

#### 2.1 常规用法

常规场景下，ViewModel 主要用于保存因配置变更而导致页面销毁重建时需要复用的数据。使用 ViewModelProvider 获取 ViewModel 实例时，系统会在内部创建并维护一个 ViewModelStore，这个存储容器通过 NonConfigurationInstances 机制实现跨配置变更复用。

示例代码

```kotlin
class MyViewModel : ViewModel() {
    // 示例数据：计数器
    var counter: Int = 0

    fun increment() {
        counter++
    }
    
    override fun onCleared() {
        super.onCleared()
        // 此处可清理资源，如取消协程、关闭数据库连接等
    }
}
```

在 Activity 中使用 ViewModel：

```kotlin
class MainActivity : AppCompatActivity() {

    private lateinit var viewModel: MyViewModel
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 通过 ViewModelProvider 获取的 ViewModel 实例会在配置变更时复用
        viewModel = ViewModelProvider(this).get(MyViewModel::class.java)
    }
}
```

#### 2.2 进阶用法 —— 使用 SavedStateHandle 实现数据持久化

在某些场景下，不仅需要在配置变更时复用数据，还需要在因内存不足、电量不足等系统原因导致页面被回收后恢复数据。此时可以借助 **savedstate** 组件，通过 SavedStateHandle 保存和恢复数据。

示例代码

```kotlin
class MySavedStateViewModel(private val state: SavedStateHandle) : ViewModel() {

    fun saveState(value: String) {
        state.set("KEY_DATA", value)
    }
    
    fun getState(): LiveData<String> {
        // 如果不存在则返回默认值
        return state.getLiveData("KEY_DATA", "默认数据")
    }
}
```

在 Activity 中使用 SavedStateViewModelFactory 获取带有 SavedStateHandle 的 ViewModel：

```kotlin
class MainActivity : AppCompatActivity() {

    private lateinit var viewModel: MySavedStateViewModel
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 使用 SavedStateViewModelFactory 构建 ViewModel
        viewModel = ViewModelProvider(this, SavedStateViewModelFactory(application, this))
            .get(MySavedStateViewModel::class.java)
    }
}
```

#### 2.3 跨页面数据共享

当需要在多个页面（如多个 Fragment）间共享数据时，可通过实现 ViewModelStoreOwner 接口来实现。例如，在宿主 Activity 内创建一个共享 ViewModel，然后由各个 Fragment 获取同一个实例，实现跨页面数据共享。

示例代码

```kotlin
class SharedViewModel : ViewModel() {
    val sharedData = MutableLiveData<String>()
}
```

在 Activity 中：

```kotlin
class MainActivity : AppCompatActivity() {

    val sharedViewModel by lazy {
        ViewModelProvider(this).get(SharedViewModel::class.java)
    }
}
```

在多个 Fragment 中均通过宿主 Activity 获取共享 ViewModel：

```kotlin
class FirstFragment : Fragment() {

    private lateinit var sharedViewModel: SharedViewModel
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        sharedViewModel = ViewModelProvider(requireActivity()).get(SharedViewModel::class.java)
        // 使用 sharedViewModel 共享数据
    }
}
```

---

### 3. 配置变更时 ViewModel 复用的实现原理

要理解 ViewModel 如何在配置变更时复用数据，关键在于 **ViewModelProvider** 和 **ViewModelStore** 的工作机制，以及 Android 系统的 **NonConfigurationInstances** 机制。

#### 3.1 ViewModelProvider 与 ViewModelStore

- **ViewModelProvider**：负责创建和管理 ViewModel 实例。每个调用 ViewModelProvider 的 Activity 或 Fragment 内部都会关联一个 ViewModelStore。
- **ViewModelStore**：底层使用一个 HashMap 来存储已创建的 ViewModel 实例。键为 ViewModel 类名，值为对应的实例。
- **复用原理**：当 Activity 因配置变更（如横竖屏切换）而销毁重建时，系统会通过 getLastNonConfigurationInstance() 方法将 ViewModelStore 中的 ViewModel 传递给新创建的 Activity。这样新实例在调用 ViewModelProvider 时会获取到之前保存的 ViewModel 实例，而不是重新创建。

#### 3.2 NonConfigurationInstances 机制

- Android 系统在配置变更时，并不会直接销毁所有对象，而是将需要保留的对象（例如 ViewModelStore、Fragment 实例）保存在 NonConfigurationInstances 中。
- 在页面重建后，通过调用 getLastNonConfigurationInstance() 方法，从 NonConfigurationInstances 中恢复 ViewModelStore，从而使 ViewModel 实例得以复用。

#### 3.3 内部流程示例

伪代码描述了配置变更时的内部处理逻辑：

```java
// Activity 在销毁前
onRetainNonConfigurationInstance() {
    // 将 ViewModelStore 保存到 NonConfigurationInstances
    return viewModelStore;
}

// Activity 重建时
onCreate() {
    // 从 NonConfigurationInstances 中恢复 ViewModelStore
    viewModelStore = getLastNonConfigurationInstance();
    // ViewModelProvider 利用恢复的 ViewModelStore 获取已有的 ViewModel 实例
    viewModel = viewModelProvider.get(MyViewModel.class);
}
```

这种机制确保了配置变更后获取的 ViewModel 实例与之前一致，从而实现数据的持久化。

---

### 4. ViewModel 的最佳实践

为了充分发挥 ViewModel 的优势，并避免常见的坑，建议遵循以下最佳实践：

1. **避免持有 UI 引用**  
   切勿在 ViewModel 中直接引用 Activity、Fragment 或 View，防止内存泄漏。若需应用上下文，请使用 ApplicationContext，并考虑继承 AndroidViewModel。

2. **使用 Repository 模式**  
   将数据源操作（如网络请求、数据库访问）封装在 Repository 中，并在 ViewModel 中调用，保持职责单一。

3. **利用 SavedStateHandle 保存状态**  
   对于需要在进程被杀死后恢复的数据，使用 SavedStateHandle 保存状态。配合 SavedStateViewModelFactory 可实现数据持久化。

4. **共享 ViewModel 实现跨页面通信**  
   在宿主 Activity 中创建共享 ViewModel，由多个 Fragment 通过 ViewModelProvider(requireActivity()) 获取同一实例，实现数据共享与通信。

5. **及时清理资源**  
   在 ViewModel 的 onCleared() 方法中释放资源，如取消协程、关闭数据库连接等，确保应用性能稳定。

6. **避免过度依赖 ViewModel 存储大量数据**  
   ViewModel 主要用于保存与 UI 相关的状态数据，不适合存储大量非 UI 数据。对于大数据量，建议使用本地缓存或数据库。

---
