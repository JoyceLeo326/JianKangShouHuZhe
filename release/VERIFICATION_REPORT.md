# 健康守护者交付自查报告

检查日期：2026-05-02

## 结论

项目在技术交付层面已经具备 Android 上架提交所需的核心文件：AAB、测试 APK、商店图标、Feature Graphic、手机截图、商店文案、隐私政策、用户协议、账号删除说明、Data safety 填写参考、Health apps declaration 填写参考、构建记录和校验和。

## 已完成检查

- `npm run check:syntax`：通过。
- `npm test`：通过。
- `npx expo-doctor`：17/17 通过。
- `npm run export:android`：通过。
- `npm run check:h5`：通过，覆盖 H5 展示页主要交互和 320/390/430 三种手机宽度布局。
- `npm audit --audit-level=high`：通过，高危漏洞为 0。
- 展示文案扫描：未发现不适合正式展示的说明性或占位性文案。
- AAB/APK 压缩包结构检查：可读取。
- Google Play 手机截图尺寸检查：`1170x2532`。
- Google Play 图标尺寸检查：`512x512`。
- Feature Graphic 尺寸检查：`1024x500`。

## 界面与交互检查范围

已自动检查：

- 登录进入工作台。
- 底部导航切换：工作台、设备、训练、数据、我的。
- 设备同步、连接状态切换和删除确认。
- 患者新增。
- 康复评估新增。
- 训练处方生成。
- 互动抓握训练开始、点击训练、完成并生成记录。
- 训练记录新增与删除。
- 康复报告生成、查看、导出与删除。
- 趋势分析、数据仓储页面。
- 个人资料编辑。
- 关于、隐私政策、用户协议弹窗。
- 320、390、430 像素宽度下无横向溢出、主要按钮无文字裁切、底部导航正常。

验收截图目录：

`release/layout-check-screenshots`

## 当前构建

Production AAB：

- 文件：`01_android_app_bundle_upload/jiankang-shouhuzhe-1.0.0-build9-production.aab`
- 构建 ID：`92e84ac2-c9fe-428e-beb8-af6e23023a09`
- 版本：`1.0.0 (9)`

Preview APK：

- 文件：`02_android_phone_install_test/jiankang-shouhuzhe-1.0.0-build8-preview.apk`
- 构建 ID：`16200320-1a96-4d9b-9e9c-3682ea53486c`
- 版本：`1.0.0 (8)`

## 说明

`npm audit` 仍会提示 Expo 工具链中的中危传递依赖。可用修复路径会强制降级 Expo 到旧大版本，存在破坏当前构建链路的风险，因此没有执行破坏性修复。高危审计已通过。

## 仍需人工完成

Google Play Console 的账号注册、付款、隐私政策 HTTPS URL、问卷勾选、内容分级、测试轨道创建和送审按钮必须由开发者本人完成。
