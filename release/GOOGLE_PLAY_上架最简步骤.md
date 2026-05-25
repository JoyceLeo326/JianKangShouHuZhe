# Google Play 上架最简步骤

以下按当前项目已经生成的 `release/jiankang-shouhuzhe-production.aab` 来操作。

官方参考：

- 创建和设置应用：https://support.google.com/googleplay/android-developer/answer/9859152
- Data safety：https://support.google.com/googleplay/android-developer/answer/10787469
- Health apps declaration：https://support.google.com/googleplay/android-developer/answer/14738291
- 新个人开发者账号测试要求：https://support.google.com/googleplay/android-developer/answer/14151465

## 你需要准备

- Google Play Console 开发者账号。
- 开发者付款资料。
- 应用名称：健康守护者。
- 联系邮箱。
- 隐私政策公网 HTTPS 链接。
- 最新 AAB：`release/jiankang-shouhuzhe-production.aab`。
- 手机测试 APK：`release/jiankang-shouhuzhe-preview.apk`。

## 第 1 步：创建应用

1. 打开 Google Play Console。
2. 点击 Create app。
3. App name 填写：`健康守护者`。
4. Default language 选择：`Chinese (Simplified)` 或你希望的主语言。
5. App or game 选择：`App`。
6. Free or paid 选择：`Free`。
7. 勾选开发者计划政策声明，创建应用。

## 第 2 步：填写商店资料

进入 Store presence / Main store listing：

- Short description：使用 `release/store-listing.md` 中的简短描述。
- Full description：使用 `release/store-listing.md` 中的完整描述。
- App icon：使用 `assets/icon.png`。
- Screenshots：可先使用 `release/google-play-screenshot-workbench.png`、`release/google-play-screenshot-devices.png`、`release/google-play-screenshot-training.png`、`release/google-play-screenshot-reports.png`。
- Feature graphic：如 Play Console 要求上传，再单独补一张 1024x500 图片。

## 第 3 步：填写 App content

进入 Policy / App content，按页面提示逐项完成。

需要重点填：

- Privacy policy：填写公网 HTTPS 隐私政策链接。
- Data safety：参考 `release/google-play-data-safety.md`。
- Health apps declaration：参考 `release/health-app-declaration.md`。
- App access：如果审核人员无需特殊账号即可进入，说明“用户可使用邮箱和 8 位以上密码进入应用工作区”。
- Ads：当前未接入广告，选择 No。
- Target audience：按实际目标用户选择。建议不要选择儿童作为主要受众。
- Content rating：按问卷如实填写。

## 第 4 步：上传 AAB

1. 进入 Release / Testing。
2. 先选 Internal testing 或 Closed testing。
3. 创建 release。
4. 上传 `release/jiankang-shouhuzhe-production.aab`。
5. 填写 release name，例如：`1.0.0 (9)`。
6. 保存并送审。

## 第 5 步：测试要求

如果你的 Google Play Console 是新的个人开发者账号，Google 可能要求先进行封闭测试，并满足测试人数和持续时间要求后才能申请生产发布。按 Play Console 页面提示执行即可。

企业/组织开发者账号和较早创建的账号要求可能不同，以你控制台显示为准。

## 第 6 步：正式发布

内部测试或封闭测试通过后：

1. 进入 Production。
2. 创建 Production release。
3. 选择已经上传过的 AAB，或重新上传最新 AAB。
4. 完成所有政策检查。
5. 点击 Send for review。

## 当前本地文件

- 上架包：`release/jiankang-shouhuzhe-production.aab`
- 安装包：`release/jiankang-shouhuzhe-preview.apk`
- 隐私政策草稿：`release/privacy-policy.md`
- 用户协议草稿：`release/user-agreement.md`
- 商店文案：`release/store-listing.md`
- 数据安全填写参考：`release/google-play-data-safety.md`
- 健康声明填写参考：`release/health-app-declaration.md`
