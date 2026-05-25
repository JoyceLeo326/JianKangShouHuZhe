# Google Play Data safety 填写参考

官方入口：Play Console > Policy > App content > Data safety

官方说明：Google Play 要求所有发布到 Google Play 的应用完成 Data safety 表单；“Collect” 指从 App 将用户数据传输到设备外部。

参考链接：

- https://support.google.com/googleplay/android-developer/answer/10787469

## 当前构建的建议填写

当前 Android 构建未配置公网 `EXPO_PUBLIC_API_BASE_URL`，账号入口和康复数据保存在当前工作区，不会上传到开发者服务器，也未接入广告、统计、崩溃分析或第三方 SDK 数据收集。

因此，按当前构建行为建议：

- Does your app collect or share any of the required user data types? `No`
- Is all of the user data collected by your app encrypted in transit? 当前构建不传输用户数据；如果表单要求回答，选择符合“不收集”的路径。
- Do you provide a way for users to request that their data is deleted? `Yes`
- Privacy policy: 必须提供公网 HTTPS 隐私政策 URL。

## 如果后续接入公网账号服务

如果正式提交前设置了 `EXPO_PUBLIC_API_BASE_URL`，让 App 把账号资料、患者档案、训练记录或报告上传到服务器，则 Data safety 必须改为 `Yes`，并按真实行为披露：

- Personal info：姓名、邮箱、身份角色。
- Health and fitness：康复评估、训练记录、疼痛评分、活动度、处方、报告。
- App activity：训练完成情况、功能使用记录。
- Device or other IDs：设备编号、连接状态。
- Diagnostics：如果接入崩溃分析或日志服务，需要披露。

数据用途：

- App functionality
- Account management
- Analytics / Diagnostics（仅在接入相应服务时选择）

共享给第三方：

- 当前构建：`No`
- 接入云服务、统计 SDK、崩溃分析、广告 SDK 后，按服务商实际处理方式填写。

加密传输：

- 接入服务器时必须使用 HTTPS。
