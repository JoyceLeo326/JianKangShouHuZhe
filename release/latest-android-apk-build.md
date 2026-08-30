# Android 正式直装包

状态：已完成并通过离线包体检查

- 应用：健康守护者
- 版本：`1.1.0`
- Android 构建号：`13`
- 包名：`com.joyceleo.jiankangshouhuzhe`
- EAS profile：`production-apk`
- EAS environment：`production`
- EAS build ID：`57365df0-b4dc-41e8-80db-363e249f47f7`
- 构建页面：<https://expo.dev/accounts/joyce_leo/projects/jiankang-shouhuzhe/builds/57365df0-b4dc-41e8-80db-363e249f47f7>
- 云端制品：<https://expo.dev/artifacts/eas/VAgkH01Dc8YSBJg81vcVfS36fwWnNqBKJKc6x6rFS0w.apk>
- EAS fingerprint：`befd02a88a49e3a29522551bb9912db0cc97d7ac`

## 本地制品

- 文件：`release/HealthGuardian-1.1.0-Android.apk`
- 大小：`66,230,390` bytes
- SHA256：`3C89BC174C9C81022D2DBFB6B94C4BD0E6A281EE00225E7A95F6BE8A3BBE3F76`

## 包体检查

- 主 Activity：`com.joyceleo.jiankangshouhuzhe.MainActivity`
- minSdk：`24`
- targetSdk：`36`
- `debuggable`：未设置，Android release 默认值为 `false`
- 签名：APK Signature Scheme v2
- 签名证书 SHA256：`018E2968B06650B432A30F8E368189D732B60ED4011B0A10E69C7FCCAEC25BA0`
- 权限：`INTERNET`、`VIBRATE`、应用自身的动态接收器保护权限
- 已确认不存在：`SYSTEM_ALERT_WINDOW`、`READ_EXTERNAL_STORAGE`、`WRITE_EXTERNAL_STORAGE`

## 安装验证边界

本机已找到 ADB 客户端，但检查时没有连接中的 Android 设备或模拟器，因此本轮不能宣称完成真机安装、启动和重启回读。连接设备并允许 USB 调试后可执行：

```powershell
adb install -r release/HealthGuardian-1.1.0-Android.apk
adb shell monkey -p com.joyceleo.jiankangshouhuzhe -c android.intent.category.LAUNCHER 1
```

首次启动、空数据工作区、离线本地保存、康复反馈回流、报告导出与医疗边界由项目自动化测试覆盖；真机触控和进程重启后的持久化回读仍应在发布设备上补验。
