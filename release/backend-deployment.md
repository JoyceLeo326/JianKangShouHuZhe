# 轻量后端说明

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
- 注销账号说明页面
- 健康应用声明页面

## 本地运行

```powershell
cd C:\Users\Jerry\Desktop\JianKangShouHuZhe
npm run server
```

默认端口：`3001`

健康检查：

`http://127.0.0.1:3001/health`

演示账号：

- 邮箱：`demo@jiankang.local`
- 密码：`12345678`

## 数据保存位置

默认保存到：

`server\data\db.json`

这是比赛演示用的文件数据库，优点是成本低、部署简单。缺点是不适合大量用户和真实医疗敏感数据。

## App 连接地址

App 默认连接：

`http://172.20.10.13:3001`

如果电脑网络地址变了，需要修改 `App.js` 顶部的默认 `API_BASE_URL`，或在 EAS 构建时设置：

```powershell
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value https://你的后端域名
```

比赛版已经加入“离线演示模式”。如果后端不在线，评委仍然可以完整使用 App。

## 正式公开发布时

如果以后真的长期公开运行，建议升级为：

- 云服务器或云函数
- HTTPS 域名
- PostgreSQL 或 MySQL
- 数据备份
- 访问日志和删除审计
- 更完整的医疗合规与隐私审查
