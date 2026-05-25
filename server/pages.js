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
    <p class="muted">更新日期：2026年4月26日</p>
    <p>健康守护者重视用户隐私和个人信息保护。本政策说明我们如何收集、使用、保存和保护你的信息。</p>
    <h2>我们可能收集的信息</h2>
    <p>账号信息：姓名、邮箱、手机号、身份角色等。患者与康复信息：患者档案、康复评估、训练处方、训练记录、设备状态、数据报告等。应用运行信息：设备型号、系统版本、错误日志和基础使用日志。</p>
    <h2>信息使用目的</h2>
    <p>用于提供账号登录、康复训练记录、设备管理、数据报告、账号安全、数据备份、应用稳定性改进和平台合规。</p>
    <h2>信息保存与删除</h2>
    <p>用户可在 App 内“我的 - 注销账号与删除数据”删除账号及相关数据。删除后，账号、患者档案、训练记录、报告和设备数据将从业务数据库中移除。</p>
    <h2>信息共享</h2>
    <p>未经授权，我们不会出售个人信息。为提供服务所需的云服务器、数据库、日志和安全服务可能处理必要数据。我们会要求相关服务仅按本应用目的处理数据。</p>
    <h2>医疗健康说明</h2>
    <p>健康守护者用于康复训练记录和辅助管理，不提供医疗诊断，不替代医生、康复师或其他专业医疗人员意见。</p>
    <h2>联系方式</h2>
    <p>开发者：健康守护者项目组<br/>邮箱：jrleo326@gmail.com</p>
  `);
}

function terms() {
  return page('健康守护者用户协议', `
    <h1>健康守护者用户协议</h1>
    <p class="muted">更新日期：2026年4月26日</p>
    <p>使用健康守护者前，请阅读并理解本协议。</p>
    <h2>服务内容</h2>
    <p>健康守护者提供患者档案、设备管理、康复评估、训练处方、互动训练、训练记录和康复报告等功能。</p>
    <h2>用户责任</h2>
    <p>用户应保证录入信息真实、合法，不得利用本应用从事违法违规活动。</p>
    <h2>医疗免责声明</h2>
    <p>本应用仅用于康复训练记录和辅助管理，不构成医疗诊断、治疗方案或紧急医疗服务。用户应根据医生、康复师或其他专业医疗人员意见进行训练和康复决策。</p>
    <h2>账号与数据</h2>
    <p>用户可通过 App 内注销入口删除账号及数据。删除操作完成后，相关业务数据将无法继续恢复。</p>
  `);
}

function accountDeletion() {
  return page('账号删除说明', `
    <h1>账号删除说明</h1>
    <p>你可以在健康守护者 App 内删除账号及数据。</p>
    <h2>App 内操作路径</h2>
    <p>打开 App → 我的 → 更多 → 注销账号与删除数据 → 确认删除。</p>
    <h2>删除范围</h2>
    <p>删除账号后，账号资料、患者档案、康复评估、训练处方、训练记录、康复报告和设备数据将从业务数据库中删除。</p>
    <h2>人工协助</h2>
    <p>如果无法登录 App，请发送邮件至开发者联系邮箱，并提供注册邮箱。开发者将在核验身份后处理删除请求。</p>
  `);
}

function healthDisclaimer() {
  return page('健康应用声明', `
    <h1>健康应用声明</h1>
    <p>健康守护者用于手部康复训练记录、康复过程管理、设备状态查看和数据报告。</p>
    <p>本应用不提供医疗诊断，不替代医生、康复师或其他专业医疗人员意见，不用于紧急医疗服务，也不保证康复效果。</p>
  `);
}

module.exports = {
  privacyPolicy,
  terms,
  accountDeletion,
  healthDisclaimer
};
