# 下一步操作

## 当前交付物

项目已经具备 Android 端安装、Google Play 上架资料、账号服务、隐私政策、用户协议、账号注销与数据删除能力。

最新构建已经完成：

- 上架用 AAB 构建：`92e84ac2-c9fe-428e-beb8-af6e23023a09`
- 正式直装 APK 构建：`b3775202-b534-4d23-8e81-79044275dac2`（版本 `1.1.0`，构建号 `16`）

本地文件：

- `release/jiankang-shouhuzhe-production.aab`
- `release/HealthGuardian-v1.1.0-android.apk`

## Android 直接安装

从正式发布页下载 APK，在 Android 浏览器或文件管理器中打开文件并按系统提示完成安装。安装完成后，点击桌面上的“健康守护者”图标即可直接进入工作台；不需要 Expo Go 或电脑连接。

Android 手机正式使用以 EAS 签名的 `release/HealthGuardian-v1.1.0-android.apk` 为准；哈希与安装验收见 `release/latest-android-apk-build.md`。

## 开发环境运行

```powershell
cd <project-directory>\JianKangShouHuZhe
npx expo start
```

## 本地运行账号服务

```powershell
cd <project-directory>\JianKangShouHuZhe
npm run server
```

初始账号：

- 邮箱：`doctor@jiankang.app`
- 密码：`Password2026`

如果要让正式构建连接公网账号服务，需要在 EAS 环境变量中设置：

`EXPO_PUBLIC_API_BASE_URL=https://你的后端域名`

## Google Play 操作顺序

你本人需要完成：

1. 注册 Google Play Console。
2. 支付开发者注册费。
3. 创建应用，应用名填写“健康守护者”。
4. 上传最新生产 AAB。
5. 填写商店资料。
6. 填写隐私政策公网 HTTPS 网址。
7. 填写 Data safety 和 Health apps declaration。
8. 先提交内部测试或封闭测试。
9. 审核通过后再申请正式发布。

已准备的上架资料：

- `release/store-listing.md`
- `release/privacy-policy.md`
- `release/user-agreement.md`
- `release/google-play-data-safety.md`
- `release/health-app-declaration.md`
- `release/test-checklist.md`

已准备的手机截图：

- `release/google-play-screenshot-workbench.png`
- `release/google-play-screenshot-devices.png`
- `release/google-play-screenshot-training.png`
- `release/google-play-screenshot-reports.png`

## 注意事项

Google Play 要求隐私政策必须是公网 HTTPS 网址，不能填写本地文件路径。正式提交前，需要把隐私政策发布成网页。
