const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateRecoverySituation,
  buildRecoveryHandoff,
  createRecoveryFeedbackRecord,
  parseRecoveryFeedback,
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
  assert.deepEqual(result.candidates.map((item) => item.id), ['pause_and_contact', 'urgent_help_if_severe', 'record_for_handoff']);
  assert.match(result.conflict, /暂停训练/);
  assert.equal(result.recommendation.candidateId, 'pause_and_contact');
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
  assert.deepEqual(result.candidates.map((item) => item.id), ['record_and_review', 'contact_team', 'record_only']);
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
  assert.deepEqual(result.candidates.map((item) => item.id), ['follow_approved', 'review_then_decide', 'record_only']);
  assert.match(result.candidates[0].description, /已批准处方/);
  assert.equal(result.recommendation.candidateId, 'follow_approved');
  result.candidates.forEach((candidate) => {
    assert.ok(candidate.benefit, `${candidate.id} should explain its benefit`);
    assert.ok(candidate.tradeoff, `${candidate.id} should explain its tradeoff`);
  });
});

test('stored discomfort feedback is parsed, shown in the next review and causally raises priority', () => {
  const previousFeedback = parseRecoveryFeedback(JSON.stringify({
    schemaVersion: 'jkshz-recovery-feedback-1',
    createdAt: '2026-08-05T12:00:00.000Z',
    feeling: '出现不适',
    note: '完成后手腕更不舒服',
    goal: '按既有计划训练',
    selectedId: 'follow_approved',
  }));
  const baseline = evaluateRecoverySituation({
    goal: '恢复抓握稳定性', pain: 2, redFlags: [], hasApprovedPrescription: true, availableMinutes: 20,
  });
  const reviewed = evaluateRecoverySituation({
    goal: '恢复抓握稳定性', pain: 2, redFlags: [], hasApprovedPrescription: true, availableMinutes: 20,
    previousFeedback,
  });

  assert.equal(baseline.level, 'ready');
  assert.equal(reviewed.level, 'review');
  assert.equal(reviewed.priorFeedback.feeling, '出现不适');
  assert.equal(reviewed.recommendation.candidateId, 'review_previous_discomfort');
  assert.equal(reviewed.recommendation.priority, '优先复盘');
  assert.match(reviewed.recommendation.reason, /上次.*出现不适.*所以/);
  assert.deepEqual(reviewed.candidates.map((item) => item.id), [
    'review_previous_discomfort', 'contact_team', 'record_only',
  ]);
});

test('short available time causally changes the recommended option without inventing a dose', () => {
  const result = evaluateRecoverySituation({
    goal: '完成今天的手部训练', pain: 1, redFlags: [], hasApprovedPrescription: true, availableMinutes: 6,
  });

  assert.equal(result.level, 'ready');
  assert.equal(result.recommendation.candidateId, 'record_only');
  assert.match(result.recommendation.reason, /只有 6 分钟，所以/);
  assert.equal(result.candidates[0].id, 'record_only');
  assert.doesNotMatch(JSON.stringify(result), /每组|次数|公斤|阻力/);
});

test('feedback records are versioned and preserve the confirmed context for the next review', () => {
  const record = createRecoveryFeedbackRecord({
    feeling: '疲劳',
    note: '训练后需要较长休息',
    goal: '恢复抓握稳定性',
    selectedId: 'follow_approved',
    pain: 3,
    redFlags: [],
    hasApprovedPrescription: true,
    availableMinutes: 20,
    createdAt: '2026-08-05T12:00:00.000Z',
  });

  assert.equal(record.schemaVersion, 'jkshz-recovery-feedback-1');
  assert.equal(record.feeling, '疲劳');
  assert.equal(record.context.pain, 3);
  assert.equal(parseRecoveryFeedback(JSON.stringify(record)).note, '训练后需要较长休息');
  assert.equal(parseRecoveryFeedback('{broken'), null);
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
  assert.equal(handoff.recommendation.candidateId, 'follow_approved');
  assert.match(text, /风险判断/);
  assert.match(text, /建议优先级/);
  assert.match(text, /方案权衡/);
  assert.match(text, /无新增不适/);
  assert.match(text, /不构成诊断或处方/);
});
