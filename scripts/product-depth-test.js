const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('App.js');
const legal = read('server/pages.js');
const readme = read('README.md');
const combined = `${app}\n${legal}\n${readme}`;

[
  '个人作品演示',
  '以下患者、训练与设备数据均为虚构演示数据',
  'AI 康复助手',
  '记录解读',
  '训练建议草案',
  '不提供诊断',
  '不能替代医生或康复师',
  '不用于急救',
  'localStorage',
  'AsyncStorage',
  '当前运行内存',
  '可选服务端账号',
].forEach((text) => assert.match(combined, new RegExp(text), `missing product boundary: ${text}`));
assert.match(app, /<Text style=\{styles\.productBoundaryTitle\}>个人作品演示<\/Text>/, 'signed-in UI must show the demo label');
assert.match(app, /<Text style=\{styles\.loginDisclosureTitle\}>个人作品演示 · 非医疗服务<\/Text>/, 'login UI must show the demo label');
assert.match(app, /以下患者、训练与设备数据均为虚构演示数据/, 'the UI must label demo records as fictional');

[
  'AI 康复博士',
  'AI康复博士',
  'AI 智能博士',
  '病例分析',
  '智能生成处方',
  '导出准备中',
  '解读病情、优化训练处方',
].forEach((text) => assert.doesNotMatch(app, new RegExp(text), `unsafe or fake UI copy remains: ${text}`));

const { buildReportMarkdown, reportFileName } = require('../src/report-export');
const report = {
  patient: '演示患者 A',
  title: '第 4 周记录摘要',
  date: '2026-07-23',
  status: '草案',
  summary: '握力记录较上周增加；此处仅复述录入数据。',
};
const markdown = buildReportMarkdown(report);
assert.match(markdown, /^# 第 4 周记录摘要/m);
assert.match(markdown, /演示患者 A/);
assert.match(markdown, /仅用于记录整理，不构成诊断或治疗方案/);
assert.equal(reportFileName(report), '第-4-周记录摘要-2026-07-23.md');
assert.match(app, /URL\.createObjectURL/);
assert.match(app, /非 Web 端已生成 Markdown 文本/);

console.log('Product-depth test passed: medical boundaries, truthful storage copy, demo disclosure, and real report export are present.');
