const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReportModel, reportToCsv, reportToPdfBytes } = require('../../src/domain/report-export');

const generatedAt = '2026-07-27T12:00:00.000Z';
const input = {
  title: '阶段康复记录',
  patient: { id: 'p-1', name: '测试患者' },
  records: [
    { id: 'r-1', patient: '测试患者', date: '2026-07-25', type: '线下训练', duration: 20, completion: 80, score: 70, source: 'manual_entry' },
    { id: 'r-2', patient: '测试患者', date: '2026-07-27', type: '设备训练', duration: 15, completion: 90, score: 82, source: 'device:adapter-a', deviceQuality: null },
  ],
  assessments: [{ id: 'a-1', patient: '测试患者', date: '2026-07-26', grip: null, rom: 60, pain: 3, adl: 70, source: 'manual_entry' }],
  signer: null,
};

test('buildReportModel derives traceable range, sources and missing fields', () => {
  const model = buildReportModel(input, generatedAt);
  assert.equal(model.generatedAt, generatedAt);
  assert.deepEqual(model.timeRange, { from: '2026-07-25', to: '2026-07-27' });
  assert.deepEqual(model.dataSources, ['device:adapter-a', 'manual_entry']);
  assert.equal(model.signature.status, 'unsigned');
  assert.ok(model.missingFields.includes('评估 a-1：握力'));
  assert.ok(model.missingFields.includes('训练 r-2：设备质量'));
  assert.match(model.disclaimer, /不构成诊断或处方/);
});

test('reportToCsv emits a real UTF-8 CSV with provenance and boundaries', () => {
  const csv = reportToCsv(buildReportModel(input, generatedAt));
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /数据来源/);
  assert.match(csv, /manual_entry/);
  assert.match(csv, /"人工签署状态","unsigned"/);
  assert.match(csv, /测试患者/);
});

test('reportToPdfBytes emits a structurally valid PDF byte stream', () => {
  const bytes = reportToPdfBytes(buildReportModel(input, generatedAt));
  const text = new TextDecoder('latin1').decode(bytes);
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length > 800);
  assert.match(text, /^%PDF-1\.4/);
  assert.match(text, /\/Type \/Page/);
  assert.match(text, /\/UniGB-UCS2-H/);
  assert.match(text, /%%EOF\s*$/);
});

test('signature is only marked signed when a real name and signed timestamp exist', () => {
  const signed = buildReportModel({
    ...input,
    signer: { name: '复核人员', credential: '机构已核验', signedAt: generatedAt },
  }, generatedAt);
  assert.equal(signed.signature.status, 'signed');
  assert.equal(signed.signature.credential, '机构已核验');
  assert.match(reportToCsv(signed), /签署资质/);
  assert.equal(buildReportModel({ ...input, signer: { name: '仅有姓名' } }, generatedAt).signature.status, 'unsigned');
});
