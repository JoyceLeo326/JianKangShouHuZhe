# 健康守护者交付与上架说明

更新日期：2026-04-28

## 当前状态

健康守护者已经具备完整移动端功能闭环：账号登录/注册、患者档案、设备管理、康复评估、训练处方、互动训练、数据报告、个人中心、隐私政策、用户协议、账号注销与数据删除。

## 最新构建

新的 Android 构建已经完成：

- 生产 AAB：`92e84ac2-c9fe-428e-beb8-af6e23023a09`
- 预览 APK：`16200320-1a96-4d9b-9e9c-3682ea53486c`

构建页面：

- https://expo.dev/accounts/joyce_leo/projects/jiankang-shouhuzhe/builds/92e84ac2-c9fe-428e-beb8-af6e23023a09
- https://expo.dev/accounts/joyce_leo/projects/jiankang-shouhuzhe/builds/16200320-1a96-4d9b-9e9c-3682ea53486c

构建完成后：

- `.aab` 用于 Google Play Console 上传。
- `.apk` 用于安卓手机直接安装测试。

本地文件：

- `release/jiankang-shouhuzhe-production.aab`
- `release/jiankang-shouhuzhe-preview.apk`

## 账号服务

启动方式：

```powershell
cd C:\Users\Jerry\Desktop\JianKangShouHuZhe
npm run server
```

本地地址：

`http://127.0.0.1:3001`

初始账号：

- 邮箱：`doctor@jiankang.app`
- 密码：`Password2026`

已提供页面：

- 隐私政策：`http://127.0.0.1:3001/privacy`
- 用户协议：`http://127.0.0.1:3001/terms`
- 注销说明：`http://127.0.0.1:3001/account-deletion`
- 健康应用声明：`http://127.0.0.1:3001/health-disclaimer`

## Google Play 上架步骤

1. 注册并付费开通 Google Play Console。
2. 创建应用，应用名填写“健康守护者”。
3. 上传生产 AAB 包。
4. 填写商店资料、应用分类、联系方式。
5. 填写隐私政策公网 HTTPS 网址。
6. 填写 Data safety。
7. 填写 Health apps declaration。
8. 上传截图、图标和功能图。
9. 先提交内部测试或封闭测试。
10. 审核通过后申请正式发布。

## 资料文件

- `release/store-listing.md`
- `release/privacy-policy.md`
- `release/user-agreement.md`
- `release/google-play-data-safety.md`
- `release/health-app-declaration.md`
- `release/test-checklist.md`
- `release/backend-deployment.md`

## 合规说明

健康守护者用于康复训练记录、康复过程管理、设备状态查看和数据报告。本应用不提供医疗诊断，不替代医生、康复师或其他专业医疗人员意见，也不用于紧急医疗服务。
