function page(title, body) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body{margin:0;background:#f4f7fa;color:#18212f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.7}
    main{max-width:860px;margin:0 auto;padding:32px 18px 64px}
    h1{font-size:30px;margin:0 0 8px}
    h2{font-size:20px;margin-top:28px}
    .card{background:#fff;border:1px solid #e4eaf1;border-radius:18px;padding:24px;box-shadow:0 10px 28px rgba(15,27,42,.06)}
    .muted{color:#657386}
    a{color:#1a9a9b}
  </style>
</head>
<body><main><div class="card">${body}</div></main></body></html>`;
}

function privacyPolicy() {
  return page('健康守护者隐私政策', `
    <h1>健康守护者隐私政策</h1>
    <p class="muted">更新日期：2026年7月27日</p>
    <p>本说明介绍健康守护者如何处理你录入的账号、康复记录、训练反馈和设备资料。</p>
    <h2>我们可能收集的信息</h2>
    <p>只有在你主动录入或连接服务时，应用才会处理相应信息，包括显示名称、邮箱、患者档案、评估、处方草稿、训练记录、报告、设备资料、授权版本和操作审计。</p>
    <h2>信息使用目的</h2>
    <p>用于保存工作区、整理记录、生成待复核摘要、导出报告、处理同步冲突和响应你的数据权利请求，不用于广告画像。</p>
    <h2>信息保存与删除</h2>
    <p>工作区默认保存在当前设备。连接账号服务后，应用才会向所配置的服务同步数据。你可以在“我的”中导出个人数据、撤回敏感信息授权或清除本机数据；已连接账号可请求删除账号及其服务端数据。</p>
    <h2>信息共享</h2>
    <p>应用不出售信息。只有在你配置模型服务、确认敏感信息授权并主动提交后，所选记录才会发送到对应服务商。API Key 只保留在当前会话中。</p>
    <h2>医疗健康说明</h2>
    <p>健康守护者用于康复记录和人工复核，不提供自动诊断或自动处方，不能替代医生或康复师，也不用于急救。紧急情况请立即联系当地急救服务。</p>
    <h2>联系方式</h2>
    <p>开发者：健康守护者项目组<br/>邮箱：jrleo326@gmail.com</p>
  `);
}

function terms() {
  return page('健康守护者用户协议', `
    <h1>健康守护者用户协议</h1>
    <p class="muted">更新日期：2026年7月27日</p>
    <p>使用健康守护者前，请阅读并理解本协议。</p>
    <h2>服务内容</h2>
    <p>健康守护者提供患者档案、评估、处方草稿、训练安全自查、训练记录、阶段报告、信息整理和数据导出等功能。</p>
    <h2>用户责任</h2>
    <p>用户应确保有权处理所录入的信息，并核对记录、报告和 AI 输出。发现紧急症状时，不应等待应用反馈。</p>
    <h2>医疗免责声明</h2>
    <p>本应用不提供自动诊断或自动处方。处方内容必须由具备相应资质的专业人员审核；AI 输出均为待复核文本，不能替代医生或康复师，也不用于急救。</p>
    <h2>账号与数据</h2>
    <p>用户可通过 App 内注销入口删除账号及数据。删除操作完成后，相关业务数据将无法继续恢复。</p>
  `);
}

function accountDeletion() {
  return page('账号删除说明', `
    <h1>账号删除说明</h1>
    <p>你可以在健康守护者 App 内删除账号及数据。</p>
    <h2>App 内操作路径</h2>
    <p>清除本机工作区：打开 App → 我的 → 清除本机数据。已连接账号时，可在账号服务中选择删除账号及数据。</p>
    <h2>删除范围</h2>
    <p>删除本地工作区会清除当前设备持久化数据；删除可选服务端账号会请求移除服务端的账号资料、档案、评估、训练建议草案、训练记录、记录摘要和设备数据。</p>
    <h2>人工协助</h2>
    <p>如果无法登录 App，请发送邮件至开发者联系邮箱，并提供注册邮箱。开发者将在核验身份后处理删除请求。</p>
  `);
}

function healthDisclaimer() {
  return page('健康应用声明', `
    <h1>健康应用声明</h1>
    <p>健康守护者用于手部康复记录、训练安全自查、阶段报告和人工复核。</p>
    <p>本应用不提供自动诊断或自动处方，不能替代医生或康复师，也不用于急救，不保证康复效果。紧急情况请立即联系当地急救服务。</p>
  `);
}

module.exports = {
  privacyPolicy,
  terms,
  accountDeletion,
  healthDisclaimer
};
