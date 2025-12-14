# Bundle 

## 一、Bundle 的定义与本质
**Bundle** 是 Android 系统中用于存储 **键值对（Key-Value）**  数据的数据容器类，其核心特性包括：  
- **跨进程序列化**：实现 `Parcelable` 接口，支持高效序列化与反序列化  
- **数据类型支持**：可存储基本类型、`String`、`Parcelable` 对象、`Serializable` 对象及它们的集合类型  
- **轻量化设计**：基于 `ArrayMap` 实现（相比 `HashMap` 内存占用更低）  

**经典使用场景**：  
```java  
// 状态保存  
@Override  
protected void onSaveInstanceState(Bundle outState) {  
    outState.putString("key_text", "Hello Bundle");  
}  

// 状态恢复  
@Override  
protected void onCreate(Bundle savedInstanceState) {  
    if (savedInstanceState != null) {  
        String text = savedInstanceState.getString("key_text");  
    }  
}  
```  

## 二、Bundle 的常见使用场景

### 1. **Activity/Fragment 状态保存与恢复**  
- **触发时机**：  
  - 屏幕旋转等配置变更  
  - 系统内存不足回收后台 Activity  
  - 用户按下 Home 键/切换应用  
- **生命周期关联**：  
  `onSaveInstanceState()` → `onRestoreInstanceState()` / `onCreate()`  

### 2. **Activity/Fragment 间数据传输**  
```kotlin  
// 发送方  
val intent = Intent(this, TargetActivity::class.java).apply {  
    putExtra("user", User("Alice", 25))  
}  
startActivity(intent)  

// 接收方  
val user = intent?.getParcelableExtra<User>("user")  
```  

### 3. **进程间通信（IPC）**  
- 通过 `Binder` 驱动传递 Bundle 数据（如 `Service` 与 `Activity` 通信）  
- 跨进程数据需实现 `Parcelable` 接口  

### 4. **Fragment 参数传递**  
```kotlin  
val fragment = MyFragment().apply {  
    arguments = bundleOf("id" to 1001)  
}  
```

## 三、Bundle 的核心 API 方法

### 数据存取方法
| 方法签名                                 | 说明                          |  
|----------------------------------------|------------------------------|  
| `putString(String key, String value)`  | 存储字符串                     |  
| `getString(String key)`                | 读取字符串                     |  
| `putParcelable(String key, Parcelable value)` | 存储可序列化对象                |  
| `getParcelable(String key)`           | 读取可序列化对象                |  
| `putBundle(String key, Bundle value)` | 嵌套存储 Bundle（树形结构）      |  

### 辅助方法
| 方法签名                          | 说明                          |  
|---------------------------------|------------------------------|  
| `containsKey(String key)`       | 检查是否包含指定键              |  
| `remove(String key)`            | 移除指定键值对                 |  
| `keySet()`                      | 获取所有键的集合               |  
| `size()`                        | 获取键值对数量                 |  


## 四、Bundle 的底层实现机制

### 1. **数据结构设计**  
- 底层使用 **双数组存储**（`ArrayMap` 结构）：  
  - `mKeys`: 存储键名的 `Object[]` 数组  
  - `mValues`: 存储值的 `Object[]` 数组  
- 优势：内存紧凑，适合少量数据场景  

### 2. **序列化与反序列化**  
- 基于 `Parcel` 实现高效二进制序列化：  
```java  
  // 序列化过程  
  Parcel parcel = Parcel.obtain();  
  bundle.writeToParcel(parcel, 0);  
  byte[] bytes = parcel.marshall();  

  // 反序列化  
  Parcel newParcel = Parcel.obtain();  
  newParcel.unmarshall(bytes, 0, bytes.length);  
  Bundle newBundle = new Bundle();  
  newBundle.readFromParcel(newParcel);  
``` 

### 3. **数据大小限制**  
- **TransactionTooLargeException**：  
  - Android 限制单个 Binder 事务数据不超过 **1MB**  
  - 包含 Bundle 的 IPC 调用需控制数据量  

### 4. **版本兼容性**  
- **Android 7.0+**：Bundle 数据存储改用 `PersistableBundle` 优化  
- **Android 10+**：严格模式检测 Bundle 内存泄漏  


## 五、最佳实践与常见问题

### 1. **状态保存原则**  
- **轻量化存储**：仅保存 UI 状态（如输入文本、滚动位置），避免存储大对象  
- **ViewModel 优先**：复杂数据应通过 `ViewModel` + `LiveData` 管理  

### 2. **避免直接存储 Bitmap**  
```kotlin  
// 错误做法（易触发 TransactionTooLargeException）  
outState.putParcelable("bitmap", largeBitmap)  

// 正确做法：存储 URI 或文件路径  
outState.putString("image_path", "/sdcard/image.jpg")  
```  

### 3. **版本间差异处理**  
- 使用 `@RequiresApi` 注解处理不同 API 级别的方法兼容性  
- 使用 `Build.VERSION.SDK_INT` 做运行时版本判断  

### 4. **调试技巧**  
- **查看 Bundle 内容**：  
  ```shell  
  adb shell dumpsys activity activities | grep "Hist #"  
  ```  
- **检测内存泄漏**：通过 Android Studio 的 `Memory Profiler` 分析 Bundle 内存占用  

