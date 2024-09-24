# AOSP Settings 展示所有应用
## 背景

Android 11 的AOSP settings的默认情况中，点击应用和通知，展示全部应用之后里面是筛选过的应用。（APP 哦info界面）

有很多内置的应用以及插件是被过滤掉的不显示的。

但是客户提出想要在右上角菜单栏加一个菜单，可以选择显示或者不显示全部的apps

经过研究之后发现加菜单比较麻烦。所以选择在顶部加一个按钮来实现。

## 一、APP info界面入口

packages/apps/Settings/src/com/android/settings/applications/RecentAppsPreferenceController.java

```C
    public void displayPreference(PreferenceScreen screen) {
        super.displayPreference(screen);

        mDivider = screen.findPreference(KEY_DIVIDER);
        mRecentAppsPreference = screen.findPreference(getPreferenceKey());
        final View view = mRecentAppsPreference.findViewById(R.id.app_entities_header);
        mAppEntitiesController = AppEntitiesHeaderController.newInstance(mContext, view)
                .setHeaderTitleRes(R.string.recent_app_category_title)
                .setHeaderDetailsClickListener((View v) -> {
                    mMetricsFeatureProvider.logClickedPreference(mRecentAppsPreference,
                            getMetricsCategory());
                    new SubSettingLauncher(mContext)
                            .setDestination(ManageApplications.class.getName())
                            .setArguments(null /* arguments */)
                            .setTitleRes(R.string.application_info_label)
                            .setSourceMetricsCategory(getMetricsCategory())
                            .launch();
                });          
    }
```

这里通过.setHeaderDetailsClickListener((View v)注册了"显示剩下的XX个应用"的按钮的监听事件。

这个按钮在代码里就是HeaderDetails点击之后就可以跳转到APP info界面

原本我想在这里多加一个同样的按钮，发现不是很好加。

在这段代码的下面还有一个`onCountComplete`函数，里面会计算app的数量然后返回给复数资源`R.plurals.see_all_apps_title`

```C
protected void onCountComplete(int num) {                mAppEntitiesController.setHeaderDetails(                                            mContext.getResources().getQuantityString(R.plurals.see_all_apps_title ,                                num, num));                  
    mAppEntitiesController.apply();            
}
```

## 二、APP info界面的标题部分

xml文件：packages/apps/Settings/res/layout/manage_applications_apps.xml

代码文件：packages/apps/Settings/src/com/android/settings/applications/manageapplications/ManageApplications.java

稍微梳理一下，前面的入口代码中的.launch()方法会进入到ManageApplications.java

然后会根据.setArguments(null /* arguments */)传的参数的内容，进行很多不同的处理

```C
  String className = args != null ? args.getString(EXTRA_CLASSNAME) : null;
        if (className == null) {
            className = intent.getComponent().getClassName();
        }
        if (className.equals(StorageUseActivity.class.getName())) {
            if (args != null && args.containsKey(EXTRA_VOLUME_UUID)) {
                mVolumeUuid = args.getString(EXTRA_VOLUME_UUID);
                mStorageType = args.getInt(EXTRA_STORAGE_TYPE, STORAGE_TYPE_DEFAULT);
                mListType = LIST_TYPE_STORAGE;
            } else {
                // No volume selected, display a normal list, sorted by size.
                mListType = LIST_TYPE_MAIN;
            }
            mSortOrder = R.id.sort_order_size;
        } else if (className.equals(UsageAccessSettingsActivity.class.getName())) {
        ...
        ...
        ...
```

我们传的是空参所以是

```C
else {
            if (screenTitle == -1) {
                screenTitle = R.string.application_info_label;
            }
            mListType = LIST_TYPE_MAIN;
        }
```

仅仅是把标题设置成了R.string.application_info_label而已

## 三、APP info界面的数据来源

最值得注意的是onCreateView中的代码

```C
            mRecyclerView = mListContainer.findViewById(R.id.apps_list);
            mRecyclerView.setItemAnimator(null);
            mRecyclerView.setLayoutManager(new LinearLayoutManager(
                    getContext(), RecyclerView.VERTICAL, false /* reverseLayout */));
            mRecyclerView.setAdapter(mApplications);
```

这里的 mRecyclerView 就是应用列表，setAdapter设置了一个适配器，应用列表的所有数据都来自于适配器。

因此筛选显示的应用列表的逻辑也和这个Adapter有关系。

```C
创造过滤器：
  mFilter = appFilterRegistry.get(appFilterRegistry.getDefaultFilterType(mListType));
创造适配器：
            mApplications = new ApplicationsAdapter(mApplicationsState, this, mFilter,
                    savedInstanceState);
设置适配器
  mRecyclerView.setAdapter(mApplications);
```

ApplicationsAdapter的具体内容在这个java文件的下面的部分，

## 四、APP info界面的加载函数

rebuild()函数：是用来重新加载刷新这个界面的

```C
            if (!mManageApplications.mShowSystem) {
                if (LIST_TYPES_WITH_INSTANT.contains(mManageApplications.mListType)) {
                    filterObj = new CompoundFilter(filterObj,
                            ApplicationsState.FILTER_DOWNLOADED_AND_LAUNCHER_AND_INSTANT);
                } else {
                    filterObj = new CompoundFilter(filterObj,
                            ApplicationsState.FILTER_DOWNLOADED_AND_LAUNCHER);
                }
            }
```

rebuild()函数中有这么一段代码，通过判断mManageApplications.mShowSystem的值，来选择是否要加上某些过滤器。**这就是过滤掉一些不必要的app的代码所在。**

## 五、处理方法

1. 首先在顶部加一个Button

```C
--- a/packages/apps/Settings/res/layout/manage_applications_apps.xml
+++ b/packages/apps/Settings/res/layout/manage_applications_apps.xml
@@ -32,11 +32,22 @@
             android:layout_height="match_parent"
             android:visibility="gone">

+            <Button
+                android:id="@+id/show_all_apps"
+                android:layout_width="wrap_content"
+                android:layout_height="wrap_content"
+                android:text="@string/show_all_apps_button"
+                android:layout_gravity="center_horizontal"
+                android:layout_marginStart="16dp"
+                android:layout_marginTop="16dp"
+                />
+
             <androidx.recyclerview.widget.RecyclerView
                 android:id="@+id/apps_list"
                 android:layout_width="match_parent"
                 android:layout_height="match_parent"
                 android:clipToPadding="false"
+                android:layout_marginTop="80dp"
                 android:scrollbars="none"
                 settings:fastScrollEnabled="true"
                 settings:fastScrollHorizontalThumbDrawable="@drawable/thumb_drawable"
```

这里加了一个Button同时给app列表一个上边距，防止和按钮重叠。

1. 实现按钮逻辑

```C
--- a/packages/apps/Settings/src/com/android/settings/applications/manageapplications/ManageApplications.java
+++ b/packages/apps/Settings/src/com/android/settings/applications/manageapplications/ManageApplications.java
@@ -134,6 +134,7 @@ import java.util.Arrays;
 import java.util.Collections;
 import java.util.Comparator;
 import java.util.Set;
+import android.widget.Button;

 
@@ -446,6 +447,28 @@ public class ManageApplications extends InstrumentedFragment

         mResetAppsHelper.onRestoreInstanceState(savedInstanceState);

+            Button showAllAppsButton = mRootView.findViewById(R.id.show_all_apps);
+            if (showAllAppsButton != null) {
+                if (mApplications.getShowSystem()) {
+                    showAllAppsButton.setText(R.string.show_installed_apps_button);
+                } else {
+                    showAllAppsButton.setText(R.string.show_all_apps_button);
+                }
+                showAllAppsButton.setOnClickListener(new View.OnClickListener() {
+                    @Override
+                    public void onClick(View v) {
+                        boolean newShowSystemValue = !mApplications.getShowSystem();
+                        mApplications.setShowSystem(newShowSystemValue);
+                        if (newShowSystemValue) {
+                            showAllAppsButton.setText(R.string.show_installed_apps_button);
+                        } else {
+                            showAllAppsButton.setText(R.string.show_all_apps_button);
+                        }
+                        mApplications.rebuild();
+                    }
+                });
+            }
+
         return mRootView;
     }

@@ -1243,6 +1266,19 @@
+        public void setShowSystem(boolean isShowSystem) {
+            if (mManageApplications != null) {
+                mManageApplications.mShowSystem = isShowSystem;
+            }
+        }
+
+        public boolean getShowSystem() {
+            if (mManageApplications != null) {
+                return mManageApplications.mShowSystem;
+            }
+            return false;   // default to false
+        }
+
```

首先在ApplicationsAdapter类里面加入了两个公共方法用来设置mShowSystem 的值

然后在ManageApplications类的onCreateView方法里面设置监听动态改变相应的值就好