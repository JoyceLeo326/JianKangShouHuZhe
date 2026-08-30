# Android 正式直装包

状态：已完成并通过离线包体检查

- 应用：健康守护者
- 版本：`1.1.0`
- Android 构建号：`16`
- 包名：`com.joyceleo.jiankangshouhuzhe`
- EAS profile：`production-apk`
- EAS environment：`production`
- EAS build ID：`b3775202-b534-4d23-8e81-79044275dac2`
- 构建页面：<https://expo.dev/accounts/joyce_leo/projects/jiankang-shouhuzhe/builds/b3775202-b534-4d23-8e81-79044275dac2>
- 云端制品：<https://expo.dev/artifacts/eas/uXlFRCLA6cSayN2Uo1kgsiSZQy_fijQHVVmNiuTpjMw.apk>
- EAS fingerprint：`2accdfe7317c699ed739ff64a9e66b8e1e0f7f4a`

## 本地制品

- 文件：`release/HealthGuardian-v1.1.0-android.apk`
- 大小：`65,095,714` bytes
- SHA256：`F6C87AB7408E903F255240D490B1FEF4D295277BF7378CD92BAAE5A055D4BC24`

## 包体检查

- 主 Activity：`com.joyceleo.jiankangshouhuzhe.MainActivity`
- minSdk：`24`
- targetSdk：`36`
- `debuggable`：未设置，Android release 默认值为 `false`
- 签名：APK Signature Scheme v2
- 签名证书 SHA256：`018E2968B06650B432A30F8E368189D732B60ED4011B0A10E69C7FCCAEC25BA0`
- 权限：`INTERNET`、`VIBRATE`、应用自身的动态接收器保护权限
- 已确认不存在：相机、麦克风、定位、通讯录、电话、短信、通知、照片/文件、身体传感器、`SYSTEM_ALERT_WINDOW`、`READ_EXTERNAL_STORAGE`、`WRITE_EXTERNAL_STORAGE`

安装时唯一可能需要手动开启的是 Android 系统针对下载来源的“安装未知应用”开关。只需临时允许本次使用的浏览器或文件管理器；该开关属于安装来源授权，不是健康守护者的运行时权限，安装后可关闭。产品下载页已提供小米/Redmi、华为、荣耀、OPPO/一加/realme、vivo/iQOO、三星的具体菜单路径。

## 安装与持久化验证

最终包已在清空数据的 Android 15 x86_64 环境中完成安装和系统 Launcher 启动。首屏直接显示“今日工作状态”和六个可操作工具入口，不包含交付演示措辞；安全自查、患者建档、新建评估、训练中心、记录反馈、数据与交接均已逐项打开验证。

确认隐私授权并保存虚拟档案 `HGFinal16` 后，应用被强制停止并从 Launcher 再次启动。再次启动产生新进程，`MainActivity` 正常位于前台；档案与授权均成功回读，日志中未发现 `FATAL` 或 `AndroidRuntime` 崩溃。
