const BOUNDARY = '本结果只整理用户输入和既有专业方案，不构成诊断或处方；出现紧急症状请联系当地急救服务。';

function normalizeInput(input = {}) {
  return {
    goal: String(input.goal || '').trim() || '记录今天的康复情况',
    pain: Math.max(0, Math.min(10, Number(input.pain) || 0)),
    redFlags: Array.isArray(input.redFlags) ? input.redFlags.filter(Boolean).map(String) : [],
    hasApprovedPrescription: Boolean(input.hasApprovedPrescription),
    availableMinutes: Math.max(0, Math.min(180, Number(input.availableMinutes) || 0)),
  };
}

function evaluateRecoverySituation(input) {
  const normalized = normalizeInput(input);
  if (normalized.redFlags.length || normalized.pain >= 7) {
    return {
      level: 'stop',
      label: '需要先停止',
      conflict: normalized.redFlags.length
        ? `发现 ${normalized.redFlags.length} 项异常信号，请暂停训练并联系负责的医生或康复师。`
        : '当前疼痛评分较高，请暂停训练并联系负责的医生或康复师。',
      canConfirm: false,
      input: normalized,
      candidates: [{
        id: 'pause_and_contact',
        title: '停止本次训练并求助',
        description: '保留本次症状记录，联系专业人员；如症状突然或严重，请联系当地急救服务。',
      }],
      boundary: BOUNDARY,
    };
  }

  if (!normalized.hasApprovedPrescription) {
    return {
      level: 'review',
      label: '等待专业确认',
      conflict: '当前没有可核验的已批准处方，不能由应用生成训练剂量。',
      canConfirm: true,
      input: normalized,
      candidates: [
        { id: 'record_and_review', title: '只记录现状并提交复核', description: '整理目标、疼痛和可用时间，交给负责的专业人员确认。' },
        { id: 'contact_team', title: '联系康复团队', description: '暂不开始训练，先补齐有效处方或当日专业意见。' },
      ],
      boundary: BOUNDARY,
    };
  }

  return {
    level: 'ready',
    label: '可以继续确认',
    conflict: normalized.availableMinutes < 10
      ? '可用时间较短，请只执行已批准处方中能完整完成的部分，并记录未完成原因。'
      : '未发现已选择的异常信号；仍需由你确认今天是否适合继续。',
    canConfirm: true,
    input: normalized,
    candidates: [
      { id: 'follow_approved', title: '按已批准处方执行', description: '核对已批准处方版本，只执行专业人员确认过的内容并记录反馈。' },
      { id: 'record_only', title: '今天只记录，不训练', description: '保留当前状态和原因，下一次复核时再决定。' },
    ],
    boundary: BOUNDARY,
  };
}

function buildRecoveryHandoff({ evaluation, selectedId, confirmed, feedback = {}, createdAt = new Date().toISOString() }) {
  if (!confirmed) throw new Error('结果需要人工确认后才能导出');
  const selected = evaluation && evaluation.candidates && evaluation.candidates.find((item) => item.id === selectedId);
  if (!selected) throw new Error('请选择一个可用方案');
  if (!evaluation.canConfirm && selectedId !== 'pause_and_contact') throw new Error('当前风险状态不能确认训练方案');
  return {
    schemaVersion: 'jkshz-recovery-journey-1',
    createdAt,
    input: evaluation.input,
    risk: { level: evaluation.level, label: evaluation.label, conflict: evaluation.conflict },
    selection: selected,
    confirmation: { status: 'confirmed_by_user', confirmedAt: createdAt },
    feedback: {
      feeling: String(feedback.feeling || '尚未反馈'),
      note: String(feedback.note || '').trim() || '尚未补充',
    },
    boundary: evaluation.boundary || BOUNDARY,
  };
}

function recoveryHandoffToText(handoff) {
  return [
    '健康守护者 · 今日康复交接单',
    `生成时间：${handoff.createdAt}`,
    `目标：${handoff.input.goal}`,
    `疼痛：${handoff.input.pain}/10`,
    `可用时间：${handoff.input.availableMinutes} 分钟`,
    `风险判断：${handoff.risk.label}｜${handoff.risk.conflict}`,
    `人工选择：${handoff.selection.title}`,
    `选择说明：${handoff.selection.description}`,
    `完成感受：${handoff.feedback.feeling}`,
    `反馈备注：${handoff.feedback.note}`,
    `边界：${handoff.boundary}`,
  ].join('\n');
}

module.exports = { BOUNDARY, evaluateRecoverySituation, buildRecoveryHandoff, recoveryHandoffToText };
