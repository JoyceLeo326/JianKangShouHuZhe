# 后端服务说明

## 已实现能力

后端位于 `server` 文件夹，已实现：

- 注册账号
- 登录账号
- 获取当前用户
- 修改姓名和身份
- 读取 App 数据
- 保存 App 数据
- 注销账号并删除数据
- 隐私政策页面
- 用户协议页面
- 账号删除说明页面
- 健康应用声明页面

## 本地运行

```powershell
cd C:\Users\Jerry\Desktop\JianKangShouHuZhe
npm run server
```

默认端口：`3001`

健康检查：

`http://127.0.0.1:3001/health`

初始账号：

- 邮箱：`doctor@jiankang.app`
- 密码：`Password2026`

## 数据保存位置

默认保存到：

`server\data\db.json`

该后端提供账号、资料保存、数据读取、数据同步和账号删除能力。正式部署时应配置稳定的服务器、HTTPS 域名、强随机 `JWT_SECRET` 和定期数据备份。

## App 连接地址

生产构建可通过 `EXPO_PUBLIC_API_BASE_URL` 指向公网 HTTPS 接口：

```powershell
eas env:create --environment production --name EXPO_PUBLIC_API_BASE_URL --value https://你的后端域名
```

如果暂不配置公网账号服务，App 仍可进入当前工作区并完整使用患者档案、设备管理、康复评估、训练处方、互动训练和数据报告等功能。

## 正式公开发布建议

长期公开运行建议升级为：

- 云服务器或云函数
- HTTPS 域名
- PostgreSQL 或 MySQL
- 自动备份
- 访问日志和删除审计
- 更完整的健康数据合规审查
