# 健康守护者比赛交付说明

更新日期：2026-04-27

## 当前交付结论

当前版本建议按“比赛演示交付”处理，不按真正面向公众的大规模医疗产品处理。

最快可交付方式是把 APK 发给评委或现场安卓手机安装体验。App 已补齐完整演示闭环：账号登录/注册、患者档案、设备管理、康复评估、训练处方、互动训练、数据报告、隐私政策、用户协议、账号注销与数据删除。

## 已生成文件

最新比赛演示 APK：

`D:\JianKangShouHuZhe\健康守护者-比赛演示版-Android.apk`

Expo 云端构建页面：

https://expo.dev/accounts/joyce_leo/projects/jiankang-shouhuzhe/builds/588969c5-3475-4461-ac53-dc3e0fc5343c

APK 云端下载地址：

https://expo.dev/artifacts/eas/bW7gyBc9GHsGSYM8iGqs31.apk

## 推荐给评委的使用方式

1. 安卓手机打开 APK 链接，下载并安装。
2. 如果系统提示“未知来源应用”，允许浏览器或文件管理器安装一次。
3. 打开 App 后可以直接点“离线演示模式”，无需服务器也能完整体验。
4. 如果现场需要展示真实账号闭环，可以让电脑和手机在同一网络，电脑运行后端服务，再用演示账号登录：

演示账号：`demo@jiankang.local`

演示密码：`12345678`

## 本机后端说明

后端是低成本比赛演示版，数据保存在本机文件：

`server\data\db.json`

启动方式：

```powershell
cd C:\Users\Jerry\Desktop\JianKangShouHuZhe
npm run server
```

后端本地地址：

`http://127.0.0.1:3001`

当前局域网地址：

`http://172.20.10.13:3001`

已提供页面：

- 隐私政策：`http://172.20.10.13:3001/privacy`
- 用户协议：`http://172.20.10.13:3001/terms`
- 注销说明：`http://172.20.10.13:3001/account-deletion`
- 健康应用声明：`http://172.20.10.13:3001/health-disclaimer`

## 如果要上 Google Play

Google Play 适合正式公开发布，但不适合赶比赛时间，因为需要开发者账号、付费、资料填写、审核，审核时间不可完全控制。

如果后续仍要提交 Google Play，需要：

1. 注册并付费开通 Google Play Console。
2. 创建应用，应用名填写“健康守护者”。
3. 生成并上传正式 AAB 包。
4. 填写商店资料、隐私政策网址、Data safety、Health apps declaration。
5. 先走内部测试或封闭测试，再申请正式发布。

注意：Google Play 要求隐私政策是公网 HTTPS 网址。比赛版内置隐私政策已经可展示；正式上架时需要把隐私政策发布到公开网页。

## 当前版本定位

当前版本功能完整，适合比赛评审下载、安装、操作、答辩展示。

它不是正式医疗诊断软件，不建议存放真实敏感医疗档案，也不建议直接承诺面向公众长期运营。
