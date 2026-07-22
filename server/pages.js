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
    <p><strong>个人作品演示：</strong>以下患者、训练与设备数据均为虚构演示数据。本项目没有医疗合规认证，也不承诺云端备份或持续在线服务。</p>
    <p>健康守护者重视用户隐私和个人信息保护。本说明如实介绍演示项目如何处理信息。</p>
    <h2>我们可能收集的信息</h2>
    <p>账号信息：姓名、邮箱和身份角色等。记录信息：用户录入的档案、评估、训练建议草案、训练记录、设备状态与记录摘要。请勿在公开演示部署中录入真实敏感医疗数据。</p>
    <h2>信息使用目的</h2>
    <p>用于提供账号登录、训练记录、设备状态演示、记录摘要和删除能力，不用于广告画像。</p>
    <h2>信息保存与删除</h2>
    <p>默认工作区在 Web 端使用 localStorage（通过 AsyncStorage 适配），原生端使用 AsyncStorage；存储不可用时仅保存在当前运行内存。只有用户选择并成功登录可选服务端账号时，工作区数据才会提交到该服务端。用户可在 App 内“我的 - 注销账号与删除数据”清除对应存储中的账号及数据。</p>
    <h2>信息共享</h2>
    <p>项目不出售信息。用户主动配置第三方 AI 服务后，所提交的对话和记录会按用户选择发送到对应服务商或用户配置的代理，请同时阅读相应服务条款。</p>
    <h2>医疗健康说明</h2>
    <p>健康守护者用于训练记录整理和作品演示，不提供诊断，不能替代医生或康复师，也不用于急救。紧急情况请立即联系当地急救服务。</p>
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
    <p>健康守护者提供演示档案、设备状态、评估记录、训练建议草案、互动训练、训练记录和记录摘要等功能。</p>
    <h2>用户责任</h2>
    <p>用户应保证录入信息真实、合法，不得利用本应用从事违法违规活动。</p>
    <h2>医疗免责声明</h2>
    <p>本应用是个人作品演示，仅用于训练记录整理；不提供诊断，训练建议草案不构成治疗方案，不能替代医生或康复师，也不用于急救。紧急情况请联系当地急救服务。</p>
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
    <p>删除本地工作区会清除当前设备持久化数据；删除可选服务端账号会请求移除服务端的账号资料、档案、评估、训练建议草案、训练记录、记录摘要和设备数据。</p>
    <h2>人工协助</h2>
    <p>如果无法登录 App，请发送邮件至开发者联系邮箱，并提供注册邮箱。开发者将在核验身份后处理删除请求。</p>
  `);
}

function healthDisclaimer() {
  return page('健康应用声明', `
    <h1>健康应用声明</h1>
    <p>健康守护者是个人作品演示，用于手部康复训练记录整理、设备状态展示和趋势摘要；以下患者、训练与设备数据均为虚构演示数据。</p>
    <p>本应用不提供诊断，不能替代医生或康复师，也不用于急救，不保证康复效果。紧急情况请联系当地急救服务。</p>
  `);
}

module.exports = {
  privacyPolicy,
  terms,
  accountDeletion,
  healthDisclaimer
};
