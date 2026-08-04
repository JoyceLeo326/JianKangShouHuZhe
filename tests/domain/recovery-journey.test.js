const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateRecoverySituation,
  buildRecoveryHandoff,
  recoveryHandoffToText,
} = require('../../src/domain/recovery-journey');

test('red flags stop the journey before any training choice', () => {
  const result = evaluateRecoverySituation({
    goal: '恢复抓握稳定性',
    pain: 8,
    redFlags: ['皮肤颜色突然改变'],
    hasApprovedPrescription: true,
    availableMinutes: 20,
  });

  assert.equal(result.level, 'stop');
  assert.equal(result.canConfirm, false);
  assert.deepEqual(result.candidates.map((item) => item.id), ['pause_and_contact']);
  assert.match(result.conflict, /暂停训练/);
});

test('missing professional approval becomes a review path instead of an invented dose', () => {
  const result = evaluateRecoverySituation({
    goal: '完成今天的手部训练',
    pain: 2,
    redFlags: [],
    hasApprovedPrescription: false,
    availableMinutes: 15,
  });

  assert.equal(result.level, 'review');
  assert.equal(result.canConfirm, true);
  assert.deepEqual(result.candidates.map((item) => item.id), ['record_and_review', 'contact_team']);
  assert.doesNotMatch(JSON.stringify(result), /每组|次数|公斤|阻力/);
});

test('an approved low-risk session offers traceable workflow choices', () => {
  const result = evaluateRecoverySituation({
    goal: '按既有计划训练并记录反馈',
    pain: 3,
    redFlags: [],
    hasApprovedPrescription: true,
    availableMinutes: 20,
  });

  assert.equal(result.level, 'ready');
  assert.deepEqual(result.candidates.map((item) => item.id), ['follow_approved', 'record_only']);
  assert.match(result.candidates[0].description, /已批准处方/);
});

test('confirmed result exports the user inputs, risk decision and return feedback', () => {
  const evaluation = evaluateRecoverySituation({
    goal: '按既有计划训练并记录反馈', pain: 3, redFlags: [], hasApprovedPrescription: true, availableMinutes: 20,
  });
  assert.throws(() => buildRecoveryHandoff({ evaluation, selectedId: 'follow_approved', confirmed: false }), /人工确认/);

  const handoff = buildRecoveryHandoff({
    evaluation,
    selectedId: 'follow_approved',
    confirmed: true,
    feedback: { feeling: '轻松', note: '无新增不适' },
    createdAt: '2026-08-04T12:00:00.000Z',
  });
  const text = recoveryHandoffToText(handoff);

  assert.equal(handoff.confirmation.status, 'confirmed_by_user');
  assert.equal(handoff.feedback.feeling, '轻松');
  assert.match(text, /风险判断/);
  assert.match(text, /无新增不适/);
  assert.match(text, /不构成诊断或处方/);
});
