# 健康守护者正式发布站

构建命令：

```powershell
npm ci
npm run test:release-site
npm run build:web:release
npm run check:web:release
```

构建结果位于 `dist/release-site`：根目录是正式产品与多端下载入口，`/app/` 是完整 Expo Web 应用。该目录同时可作为独立静态镜像，不包含 APK、Windows ZIP 或其他发布大文件；构建会拒绝单个超过 10 MiB 的托管文件。

版本、文件名、主下载与备用下载均来自 `release-manifest.json`。v1.1.0 的 GitHub Release 稳定路径已作为默认主入口；Netlify 构建环境可以覆盖以下字段：

- `HEALTH_ANDROID_DOWNLOAD_URL`
- `HEALTH_ANDROID_FALLBACK_URL`（可填 EAS Android 制品地址）
- `HEALTH_ANDROID_SHA256`
- `HEALTH_WINDOWS_DOWNLOAD_URL`
- `HEALTH_WINDOWS_FALLBACK_URL`
- `HEALTH_WINDOWS_SHA256`

正式站点固定为 `https://jiankang-shouhuzhe.netlify.app`，在线应用固定为 `https://jiankang-shouhuzhe.netlify.app/app/`。

## Android 直接安装

从产品页的 Android 下载卡下载 APK，按系统提示完成安装，再点击桌面上的“健康守护者”图标即可直接进入工作台。正式 APK 是可独立使用的 Android App，不需要 Expo Go 或电脑连接；首次进入时按应用内提示完成隐私确认即可开始记录。

Netlify、GitHub 与 Expo 等第三方服务在中国大陆的实际可达性受当地网络环境影响，不作绝对保证。主下载不可用时，可切换产品页提供的备用下载入口；APK 安装完成后，核心流程可在本机使用。
