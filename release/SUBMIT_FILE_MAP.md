# 健康守护者 Google Play 提交文件对照表

更新时间：2026-05-02

这个目录已经按 Google Play Console 的提交位置分类。除 Google Play 账号注册、付款、页面勾选、问卷选择和最终送审按钮外，技术文件已经整理在本目录中。

## 1. Release / Testing 或 Production

上传文件：

`01_android_app_bundle_upload/jiankang-shouhuzhe-1.0.0-build9-production.aab`

用途：Google Play 上传的 Android App Bundle。

Release name 建议填写：

`1.0.0 (9)`

## 2. 安卓手机安装测试

安装文件：

`02_android_phone_install_test/jiankang-shouhuzhe-1.0.0-build8-preview.apk`

用途：发给测试手机直接安装，不上传到 Google Play 的 Production release。

## 3. Store presence / Main store listing

应用名称：

`健康守护者`

商店文案：

`04_store_listing_text/store-listing.md`

App icon：

`03_store_listing_assets/icon-512.png`

Feature graphic：

`03_store_listing_assets/feature-graphic-1024x500.png`

Phone screenshots：

- `03_store_listing_assets/screenshots/phone-01-workbench.png`
- `03_store_listing_assets/screenshots/phone-02-devices.png`
- `03_store_listing_assets/screenshots/phone-03-training.png`
- `03_store_listing_assets/screenshots/phone-04-reports.png`

## 4. Policy / App content / Privacy policy

需要先把下面这个 HTML 文件发布成公网 HTTPS 页面：

`05_policy_and_compliance/html_for_https_hosting/privacy-policy.html`

然后把生成的 HTTPS 链接填到 Play Console 的 Privacy policy 输入框。Google Play 这里填写的是 URL，不是直接上传 HTML 文件。

备用源文件：

`05_policy_and_compliance/privacy-policy.md`

## 5. Policy / App content / Data safety

填写参考：

`05_policy_and_compliance/google-play-data-safety.md`

当前构建未接入广告、统计 SDK、崩溃分析 SDK 或公网账号服务。按当前构建行为，Data safety 可按“不收集或共享 Google Play 表单要求的数据类型”的路径填写。正式提交前如果你配置了公网后端或接入第三方 SDK，必须按真实行为改填。

## 6. Policy / App content / Health apps declaration

填写参考：

`05_policy_and_compliance/health-app-declaration.md`

可托管页面：

`05_policy_and_compliance/html_for_https_hosting/health-app-declaration.html`

核心表述：应用用于康复训练记录、设备状态查看、康复过程管理和报告展示，不提供医疗诊断，不替代医生或康复师意见，不用于紧急医疗服务。

## 7. App access

如果 Play Console 询问审核人员如何进入应用，可以填写：

应用支持邮箱账号进入工作台。审核人员可使用任意邮箱格式账号和不少于 8 位的密码进入，例如：

- Email：`reviewer@jiankang.app`
- Password：`Review2026`

如果你后续接入公网账号服务，请改为提供真实可用的审核账号。

## 8. 账号删除说明

可托管页面：

`05_policy_and_compliance/html_for_https_hosting/account-deletion.html`

备用源文件：

`05_policy_and_compliance/account-deletion.md`

## 9. 构建记录和校验

校验文件：

`06_build_records/build-checksums.txt`

提交包内重命名文件校验：

`06_build_records/package-checksums.txt`

H5 多尺寸布局验收截图：

`06_build_records/layout-check-screenshots/`

生产构建记录：

- `06_build_records/latest-android-production-build.json`
- `06_build_records/latest-android-production-build.md`

预览构建记录：

- `06_build_records/latest-android-preview-build.json`
- `06_build_records/latest-android-preview-build.md`

## 10. 参考文档

- `07_reference_guides/GOOGLE_PLAY_上架最简步骤.md`
- `07_reference_guides/FINAL-交付与上架步骤.md`
- `07_reference_guides/README-下一步操作.md`
- `07_reference_guides/test-checklist.md`
- `07_reference_guides/backend-deployment.md`

## 仍需你本人完成的非技术动作

- 注册并登录 Google Play Console。
- 支付开发者账号费用。
- 填写开发者真实名称、地址、联系电话和邮箱。
- 把隐私政策 HTML 发布成公网 HTTPS URL。
- 按 Play Console 页面完成内容分级、目标受众、广告声明、Data safety、Health apps declaration 等问卷。
- 点击创建发布、送审和正式发布按钮。
