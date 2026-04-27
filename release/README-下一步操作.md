# 下一步操作

## 现在最推荐的路线

比赛时间紧，建议不要把“公开上架”作为唯一交付方式。最快、风险最低的路线是：

1. 使用 `D:\JianKangShouHuZhe\健康守护者-比赛演示版-Android.apk`。
2. 发给评委或现场准备一台安卓手机安装。
3. 打开 App 后优先使用“离线演示模式”，确保不受网络和后端影响。
4. 答辩时说明：系统已预留真实账号体系、后端接口、数据删除和隐私政策能力；比赛版为了控制成本使用轻量数据存储。

## 如果你要现场演示账号登录

电脑先运行后端：

```powershell
cd C:\Users\Jerry\Desktop\JianKangShouHuZhe
npm run server
```

手机和电脑必须连同一个 Wi-Fi 或热点。

App 登录：

- 邮箱：`demo@jiankang.local`
- 密码：`12345678`

如果登录失败，直接点“离线演示模式”。离线模式也能完整操作全部模块。

## 如果你要用 iPhone 的 Expo Go 看

电脑启动 Expo：

```powershell
cd C:\Users\Jerry\Desktop\JianKangShouHuZhe
npx expo start --lan
```

iPhone 和电脑必须在同一网络，然后用 Expo Go 扫二维码。

如果二维码一直转圈，常见原因是：

- 手机和电脑不在同一个网络。
- Windows 防火墙拦截了 Expo。
- 电脑正在使用热点或 VPN，局域网地址变了。

这种情况下，比赛交付仍然以 Android APK 为主，Expo Go 只作为你自己预览用。

## 如果后面真要 Google Play

你本人需要完成：

1. 注册 Google Play Console。
2. 支付开发者注册费。
3. 创建应用。
4. 上传 AAB。
5. 填写隐私政策公网网址。
6. 填写 Data safety 和 Health apps declaration。
7. 提交审核。

我已经准备了参考材料：

- `release/store-listing.md`
- `release/privacy-policy.md`
- `release/user-agreement.md`
- `release/google-play-data-safety.md`
- `release/health-app-declaration.md`
- `release/test-checklist.md`

## 重要说明

当前版本是比赛演示版：功能闭环完整，成本低，适合评委操作；不建议作为真实医疗业务系统直接公开运营。
