function safeText(value, fallback = '未填写') {
  const text = String(value == null ? '' : value).trim();
  return text || fallback;
}

function reportFileName(report) {
  const title = safeText(report && report.title, '训练记录摘要')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || '训练记录摘要';
  const date = safeText(report && report.date, '未标日期').replace(/[^0-9-]/g, '') || '未标日期';
  return `${title}-${date}.md`;
}

function buildReportMarkdown(report = {}) {
  return [
    `# ${safeText(report.title, '训练记录摘要')}`,
    '',
    `- 对象：${safeText(report.patient)}`,
    `- 日期：${safeText(report.date)}`,
    `- 状态：${safeText(report.status, '草案')}`,
    '',
    '## 记录摘要',
    '',
    safeText(report.summary, '暂无摘要。'),
    '',
    '## 使用边界',
    '',
    '> 本文件由健康守护者个人作品演示整理，仅用于记录整理，不构成诊断或治疗方案，不能替代医生或康复师，也不用于急救。',
    '',
  ].join('\n');
}

module.exports = { buildReportMarkdown, reportFileName };
