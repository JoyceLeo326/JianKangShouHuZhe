# 健康守护者 Windows 桌面版

版本：1.1.0  
架构：Windows x64

## 交付文件

- `HealthGuardian-1.1.0-Windows-x64.exe`：免安装可执行文件。
- `HealthGuardian-1.1.0-Windows-x64.zip`：解压后运行 `HealthGuardian.exe`。
- `SHA256SUMS.txt`：交付文件完整性校验值。
- `RUNTIME-SMOKE.json`：启动和本地持久化自动检查记录。

## 使用方式

直接打开 `HealthGuardian-1.1.0-Windows-x64.exe`，应用会在独立窗口中运行。核心界面来自同一份正式 Expo Web 构建，不依赖远程网页；应用数据保存在当前 Windows 用户的 `AppData/Roaming/HealthGuardian` 目录，关闭和再次打开后仍会保留。

外部 HTTPS 链接交由系统默认浏览器打开。桌面窗口禁用 Node.js 集成并启用上下文隔离、渲染器沙箱、Web 安全、权限拒绝和单实例保护。

## 校验

在 PowerShell 中运行：

```powershell
Get-FileHash .\HealthGuardian-1.1.0-Windows-x64.exe -Algorithm SHA256
Get-FileHash .\HealthGuardian-1.1.0-Windows-x64.zip -Algorithm SHA256
```

将输出与 `SHA256SUMS.txt` 对照。当前自动构建未使用商业代码签名证书；Windows 可能显示来源确认提示，确认文件哈希后可继续打开。

## 复现构建与检查

```powershell
npm ci
npm run verify:desktop
```

该命令依次执行桌面安全配置测试、Electron 运行时可用性检查、Expo Web 静态导出、Windows x64 打包、制品完整性检查，以及正式界面导航和两次启动后的 `localStorage` 写入/回读检查。默认使用国内 Electron 镜像补齐缺失的运行时，也可通过 `ELECTRON_MIRROR` 指定组织内部镜像。
