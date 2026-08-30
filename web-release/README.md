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
