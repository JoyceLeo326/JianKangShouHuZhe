# 项目方零成本与医疗安全边界

默认 `COST_MODE=zero_owner_cost`：项目所有者不提供会自动产生账单的 AI、数据库、对象存储、邮件、短信或物联网账号，也不启用自动超额。免费额度不是无限资源；一旦不足，远程功能必须停止，并要求使用者连接自己的资源。

## 当前真实实现

- Web 端使用 `localStorage`，原生端使用 `AsyncStorage`；持久化不可用时只保留当前运行内存。
- AI 默认关闭并使用明确标注的本地规则演示。使用者可临时输入自己的 API Key（BYOK）；Key 只在当前运行内存中使用，不写入本地持久存储。
- 发送虚构演示患者记录到第三方模型前再次确认。真实敏感健康数据不应发送给会用内容训练模型的免费层服务。
- 可选账号 API 只有在机构填写 `EXPO_PUBLIC_API_BASE_URL` 后才启用；机构需提供自己的服务、数据库、存储和合规保障（BYOI）。
- Markdown 报告在客户端生成；记录可删除，账号删除流程会清理对应工作区。

## 正式部署路线

1. 患者端本地优先，BLE 设备由手机本地直连。
2. 机构版连接机构自己的 PostgreSQL、FHIR、对象存储和模型，或使用仓库中的 Node 服务自托管。
3. 任何免费公共试点都必须设置硬配额；耗尽时 fail closed，不自动升级付费。
4. 当前 Vercel / GitHub Pages 地址仅用于个人、非商业作品演示。Vercel Hobby 当前条款限定个人或非商业用途，不能作为商业医疗产品的默认正式环境。

本作品不是临床正式系统，不承诺医疗合规认证、SLA 或永久免费承载大量患者数据。生产使用前必须由机构完成安全、隐私、法规和临床流程评估。

## 配额核对

免费配额可能调整，部署前应复核官方页面：

- Cloudflare Workers / D1：https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare R2：https://developers.cloudflare.com/r2/pricing/
- Workers AI：https://developers.cloudflare.com/workers-ai/platform/pricing/
- Vercel 条款：https://vercel.com/legal/terms
- Gemini API 条款：https://ai.google.dev/gemini-api/terms
