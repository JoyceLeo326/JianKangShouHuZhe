const REPORT_DISCLAIMER = '本报告根据已录入记录整理，不构成诊断或处方，不替代医生、康复师或其他专业人员的评估；紧急情况请联系当地急救服务。';

function cleanText(value, fallback = '') {
  const text = value == null ? '' : String(value).trim();
  return text || fallback;
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function buildReportModel(input, generatedAt = new Date().toISOString()) {
  const patient = input.patient || {};
  const records = (input.records || []).filter((item) => !patient.name || item.patient === patient.name);
  const assessments = (input.assessments || []).filter((item) => !patient.name || item.patient === patient.name);
  const dates = [...records, ...assessments].map((item) => item.date).filter(Boolean).sort();
  const missingFields = [];
  records.forEach((item) => {
    if (item.duration == null || item.duration === '') missingFields.push(`训练 ${item.id || '未知'}：训练时长`);
    if (item.completion == null || item.completion === '') missingFields.push(`训练 ${item.id || '未知'}：完成度`);
    if (item.score == null || item.score === '') missingFields.push(`训练 ${item.id || '未知'}：得分`);
    if (!item.source) missingFields.push(`训练 ${item.id || '未知'}：数据来源`);
    if (String(item.source || '').startsWith('device:') && item.deviceQuality == null) missingFields.push(`训练 ${item.id || '未知'}：设备质量`);
  });
  assessments.forEach((item) => {
    if (item.grip == null || item.grip === '') missingFields.push(`评估 ${item.id || '未知'}：握力`);
    if (item.rom == null || item.rom === '') missingFields.push(`评估 ${item.id || '未知'}：关节活动度`);
    if (item.pain == null || item.pain === '') missingFields.push(`评估 ${item.id || '未知'}：疼痛评分`);
    if (item.adl == null || item.adl === '') missingFields.push(`评估 ${item.id || '未知'}：日常生活能力`);
    if (!item.source) missingFields.push(`评估 ${item.id || '未知'}：数据来源`);
  });
  if (!dates.length) missingFields.push('时间范围');
  if (!patient.id) missingFields.push('患者稳定 ID');

  const signer = input.signer && input.signer.signedAt && input.signer.name ? input.signer : null;
  return {
    schemaVersion: 'jkshz-report-1',
    reportId: cleanText(input.reportId, `report-${generatedAt.replace(/\D/g, '').slice(0, 14)}`),
    title: cleanText(input.title, '康复阶段记录'),
    institution: cleanText(input.institution, '未填写'),
    patient: { id: cleanText(patient.id, '未记录'), name: cleanText(patient.name, '未记录') },
    generatedAt,
    timeRange: { from: dates[0] || '未记录', to: dates[dates.length - 1] || '未记录' },
    dataSources: sortedUnique([...records, ...assessments].map((item) => item.source || '未记录')),
    records,
    assessments,
    missingFields: sortedUnique(missingFields),
    signature: signer
      ? { status: 'signed', display: '已记录人工签署', name: signer.name, signedAt: signer.signedAt, credential: cleanText(signer.credential, '未记录') }
      : { status: 'unsigned', display: '未签署', name: null, signedAt: null, credential: null },
    summary: cleanText(input.summary, '未填写阶段摘要。'),
    disclaimer: REPORT_DISCLAIMER,
  };
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function reportToCsv(model) {
  const rows = [
    ['字段', '内容'],
    ['报告版本', model.schemaVersion],
    ['报告 ID', model.reportId],
    ['标题', model.title],
    ['机构', model.institution],
    ['患者 ID', model.patient.id],
    ['患者姓名', model.patient.name],
    ['时间范围', `${model.timeRange.from} 至 ${model.timeRange.to}`],
    ['生成时间', model.generatedAt],
    ['数据来源', model.dataSources.join('；')],
    ['缺失字段', model.missingFields.length ? model.missingFields.join('；') : '无'],
    ['人工签署状态', model.signature.status],
    ['签署人', model.signature.name || '未记录'],
    ['签署资质', model.signature.credential || '未记录'],
    ['签署时间', model.signature.signedAt || '未记录'],
    ['摘要', model.summary],
    ['免责声明', model.disclaimer],
    [],
    ['训练记录'],
    ['记录 ID', '日期', '类型', '时长（分钟）', '完成度（%）', '得分', '数据来源', '设备质量'],
    ...model.records.map((item) => [item.id, item.date, item.type, item.duration, item.completion, item.score, item.source, item.deviceQuality]),
    [],
    ['评估记录'],
    ['记录 ID', '日期', '握力（kg）', '活动度（%）', '疼痛（0-10）', 'ADL（%）', '未验证旧版汇总分', '数据来源'],
    ...model.assessments.map((item) => [item.id, item.date, item.grip, item.rom, item.pain, item.adl, item.score, item.source]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}

function wrapText(text, width = 42) {
  const source = cleanText(text);
  const lines = [];
  for (const rawLine of source.split(/\r?\n/)) {
    if (!rawLine) {
      lines.push('');
      continue;
    }
    for (let index = 0; index < rawLine.length; index += width) lines.push(rawLine.slice(index, index + width));
  }
  return lines;
}

function utf16Hex(text) {
  let hex = 'FEFF';
  for (let index = 0; index < text.length; index += 1) hex += text.charCodeAt(index).toString(16).padStart(4, '0').toUpperCase();
  return hex;
}

function asciiBytes(text) {
  const out = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) out[index] = text.charCodeAt(index) & 0xff;
  return out;
}

function reportToPdfBytes(model) {
  const lines = [
    model.title,
    `报告 ID：${model.reportId}`,
    `机构：${model.institution}`,
    `患者：${model.patient.name}（ID：${model.patient.id}）`,
    `时间范围：${model.timeRange.from} 至 ${model.timeRange.to}`,
    `生成时间：${model.generatedAt}`,
    `数据来源：${model.dataSources.join('；') || '未记录'}`,
    `人工签署：${model.signature.display}`,
    model.signature.name ? `签署人：${model.signature.name}；资质：${model.signature.credential}；签署时间：${model.signature.signedAt}` : '签署人：未记录',
    '',
    '阶段摘要',
    ...wrapText(model.summary),
    '',
    '缺失字段',
    ...(model.missingFields.length ? model.missingFields.map((item) => `- ${item}`) : ['- 无']),
    '',
    '训练记录',
    ...model.records.flatMap((item) => wrapText(`${item.date || '无日期'}｜${item.type || '无类型'}｜时长 ${item.duration ?? '缺失'} 分钟｜完成度 ${item.completion ?? '缺失'}%｜得分 ${item.score ?? '缺失'}｜来源 ${item.source || '未记录'}`)),
    '',
    '评估记录',
    ...model.assessments.flatMap((item) => wrapText(`${item.date || '无日期'}｜握力 ${item.grip ?? '缺失'}kg｜活动度 ${item.rom ?? '缺失'}%｜疼痛 ${item.pain ?? '缺失'}/10｜ADL ${item.adl ?? '缺失'}%｜来源 ${item.source || '未记录'}`)),
    '',
    '免责声明',
    ...wrapText(model.disclaimer),
  ];
  const chunks = [];
  for (let index = 0; index < lines.length; index += 40) chunks.push(lines.slice(index, index + 40));

  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [4 0 R] >>';
  objects[4] = '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 4 >> >>';
  const pageIds = [];
  chunks.forEach((chunk, pageIndex) => {
    const pageId = 5 + pageIndex * 2;
    const contentId = pageId + 1;
    pageIds.push(pageId);
    const commands = ['BT', '/F1 10 Tf', '48 800 Td'];
    chunk.forEach((line, lineIndex) => {
      if (lineIndex) commands.push('0 -18 Td');
      commands.push(`<${utf16Hex(line || ' ')}> Tj`);
    });
    commands.push('ET');
    const stream = commands.join('\n');
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  objects[2] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return asciiBytes(pdf);
}

module.exports = { REPORT_DISCLAIMER, buildReportModel, reportToCsv, reportToPdfBytes };
