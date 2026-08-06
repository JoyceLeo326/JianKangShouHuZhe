const BOUNDARY = '本结果只整理用户输入和既有专业方案，不构成诊断或处方；出现紧急症状请联系当地急救服务。';
const FEEDBACK_SCHEMA = 'jkshz-recovery-feedback-1';
const FEEDBACK_FEELINGS = new Set(['轻松', '适中', '疲劳', '出现不适']);

function cleanText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function clampNumber(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function createRecoveryFeedbackRecord(input = {}) {
  const feeling = cleanText(input.feeling, '尚未反馈');
  return {
    schemaVersion: FEEDBACK_SCHEMA,
    createdAt: cleanText(input.createdAt, new Date().toISOString()),
    feeling: FEEDBACK_FEELINGS.has(feeling) ? feeling : '尚未反馈',
    note: cleanText(input.note),
    goal: cleanText(input.goal, '记录今天的康复情况'),
    selectedId: cleanText(input.selectedId),
    context: {
      pain: clampNumber(input.pain, 0, 10),
      redFlags: Array.isArray(input.redFlags) ? input.redFlags.filter(Boolean).map(String) : [],
      hasApprovedPrescription: Boolean(input.hasApprovedPrescription),
      availableMinutes: clampNumber(input.availableMinutes, 0, 180),
    },
  };
}

function parseRecoveryFeedback(raw) {
  if (!raw) return null;
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!value || typeof value !== 'object') return null;
    return createRecoveryFeedbackRecord({
      ...value,
      ...(value.context || {}),
      createdAt: value.createdAt,
    });
  } catch (error) {
    return null;
  }
}

function summarizePriorFeedback(raw) {
  const feedback = parseRecoveryFeedback(raw);
  if (!feedback) {
    return {
      status: 'none',
      feeling: '暂无',
      summary: '暂无上次完成反馈，本次只根据当前输入排序。',
      impact: '未使用历史反馈改变优先级。',
    };
  }

  if (feedback.feeling === '出现不适') {
    return {
      ...feedback,
      status: 'needs_review',
      summary: `上次反馈“出现不适”${feedback.note ? `：${feedback.note}` : '。'}`,
      impact: '上次记录了不适，所以本次优先复盘，不把继续训练作为首选。',
    };
  }
  if (feedback.feeling === '疲劳') {
    return {
      ...feedback,
      status: 'needs_review',
      summary: `上次反馈“疲劳”${feedback.note ? `：${feedback.note}` : '。'}`,
      impact: '上次记录了疲劳，所以本次先确认恢复情况，再决定是否执行已批准方案。',
    };
  }
  return {
    ...feedback,
    status: 'reviewed',
    summary: `上次反馈“${feedback.feeling}”${feedback.note ? `：${feedback.note}` : '。'}`,
    impact: '上次未记录疲劳或不适，因此不提高复盘优先级；当前状态仍单独判断。',
  };
}

function normalizeInput(input = {}) {
  return {
    goal: cleanText(input.goal, '记录今天的康复情况'),
    pain: clampNumber(input.pain, 0, 10),
    redFlags: Array.isArray(input.redFlags) ? input.redFlags.filter(Boolean).map(String) : [],
    hasApprovedPrescription: Boolean(input.hasApprovedPrescription),
    availableMinutes: clampNumber(input.availableMinutes, 0, 180),
  };
}

function candidate(id, title, description, benefit, tradeoff, allowsTraining = false) {
  return { id, title, description, benefit, tradeoff, allowsTraining };
}

function evaluationResult({ level, label, conflict, canConfirm, input, candidates, recommendation, priorFeedback }) {
  return {
    level,
    label,
    conflict,
    canConfirm,
    input,
    candidates: candidates.map((item, index) => ({ ...item, rank: index + 1 })),
    recommendation,
    priorFeedback,
    boundary: BOUNDARY,
  };
}

function evaluateRecoverySituation(input = {}) {
  const normalized = normalizeInput(input);
  const priorFeedback = summarizePriorFeedback(input.previousFeedback);

  if (normalized.redFlags.length || normalized.pain >= 7) {
    const conflict = normalized.redFlags.length
      ? `发现 ${normalized.redFlags.length} 项异常信号，请暂停训练并联系负责的医生或康复师。`
      : '当前疼痛评分较高，请暂停训练并联系负责的医生或康复师。';
    return evaluationResult({
      level: 'stop',
      label: '需要先停止',
      conflict,
      canConfirm: false,
      input: normalized,
      candidates: [
        candidate('pause_and_contact', '停止本次训练并联系专业人员', '保留本次症状记录，联系负责的医生或康复师。', '避免在当前风险未澄清时继续训练。', '需要等待专业人员判断，今天的训练可能取消。'),
        candidate('urgent_help_if_severe', '突然或严重时联系当地急救', '若症状突然出现、快速加重或涉及呼吸和意识，联系当地急救服务。', '为可能的紧急情况争取处置时间。', '仅适用于突然或严重情形，不能替代现场判断。'),
        candidate('record_for_handoff', '只记录并准备交接', '不训练，整理异常信号、疼痛和发生时间，供求助时说明。', '减少关键信息遗漏，便于专业人员复核。', '记录本身不会处理症状，仍需按风险联系专业人员。'),
      ],
      recommendation: {
        candidateId: 'pause_and_contact',
        priority: '立即处理',
        reason: `${conflict} 所以“停止并联系专业人员”排在第一位。`,
      },
      priorFeedback,
    });
  }

  if (priorFeedback.status === 'needs_review') {
    const discomfort = priorFeedback.feeling === '出现不适';
    const candidateId = discomfort ? 'review_previous_discomfort' : 'review_previous_fatigue';
    const feeling = priorFeedback.feeling;
    return evaluationResult({
      level: 'review',
      label: discomfort ? '优先复盘上次不适' : '先复盘上次疲劳',
      conflict: `${priorFeedback.summary} 本次当前输入未触发停止条件，但历史反馈需要先被复盘。`,
      canConfirm: true,
      input: normalized,
      candidates: [
        candidate(candidateId, `先复盘上次${feeling}`, '整理上次选择、完成感受与本次状态，再决定下一步。', '让上次真实反馈直接进入本次判断，避免被遗漏。', '会推迟本次训练，但不会擅自修改专业方案。'),
        candidate('contact_team', '联系康复团队', '将上次反馈和本次状态交给负责的专业人员确认。', '可获得针对既有专业方案的复核。', '需要等待回复，不能保证立即开始训练。'),
        candidate('record_only', '今天只记录，不训练', '保留当前状态与原因，等待后续复核。', '最保守且不引入新的训练风险。', '今天不会推进训练目标。'),
      ],
      recommendation: {
        candidateId,
        priority: discomfort ? '优先复盘' : '先复盘',
        reason: `上次反馈为“${feeling}”，所以本次先复盘该反馈，再决定是否继续。`,
      },
      priorFeedback,
    });
  }

  if (normalized.pain >= 4) {
    return evaluationResult({
      level: 'review',
      label: '先复盘当前疼痛',
      conflict: `当前疼痛为 ${normalized.pain}/10，未达到应用的停止阈值，但需要先核对是否适合继续。`,
      canConfirm: true,
      input: normalized,
      candidates: [
        candidate('review_current_pain', '先记录疼痛并复盘', '记录当前评分、目标和已有专业方案，再决定是否继续。', '让当前疼痛直接影响决策优先级。', '会延后训练，且应用不会给出诊断。'),
        candidate('contact_team', '联系康复团队', '把当前变化交给负责的专业人员确认。', '能由了解既往情况的专业人员复核。', '需要等待回复。'),
        candidate('record_only', '今天只记录，不训练', '不开始训练，只保留当前状态。', '不在疼痛变化未澄清时增加训练负担。', '今天不会推进训练目标。'),
      ],
      recommendation: {
        candidateId: 'review_current_pain',
        priority: '优先复盘',
        reason: `当前疼痛为 ${normalized.pain}/10，所以先记录并复盘，再决定是否继续。`,
      },
      priorFeedback,
    });
  }

  if (!normalized.hasApprovedPrescription) {
    return evaluationResult({
      level: 'review',
      label: '等待专业确认',
      conflict: '当前没有可核验的已批准处方，不能由应用生成训练剂量。',
      canConfirm: true,
      input: normalized,
      candidates: [
        candidate('record_and_review', '只记录现状并提交复盘', '整理目标、疼痛和可用时间，交给负责的专业人员确认。', '保留完整上下文，不擅自开始训练。', '需要等待专业复核。'),
        candidate('contact_team', '联系康复团队', '暂不开始训练，先补齐有效处方或当日专业意见。', '可确认现有方案是否仍有效。', '需要额外沟通时间。'),
        candidate('record_only', '今天只记录，不训练', '保存本次状态，之后取得有效方案再决定。', '无需登录也能保留本机记录。', '今天不会推进训练目标。'),
      ],
      recommendation: {
        candidateId: 'record_and_review',
        priority: '需要确认',
        reason: '没有可核验的已批准处方，所以优先记录并提交复盘，应用不生成训练剂量。',
      },
      priorFeedback,
    });
  }

  const regularCandidates = [
    candidate('follow_approved', '按已批准处方执行', '核对已批准处方版本，只执行专业人员确认过的内容并记录反馈。', '在既有专业边界内推进今天的目标。', '仍需留意当前感受；应用不会判断动作或剂量。', true),
    candidate('review_then_decide', '先复盘，再决定是否执行', '先对照上次反馈和当前状态，再由你确认是否执行已批准方案。', '多一次核对，适合对当天状态不确定时。', '会增加决策时间。'),
    candidate('record_only', '今天只记录，不训练', '保留当前状态和原因，下一次复盘时再决定。', '最保守，不增加训练负担。', '今天不会推进训练目标。'),
  ];

  if (normalized.availableMinutes < 10) {
    return evaluationResult({
      level: 'ready',
      label: '时间不足，优先保留记录',
      conflict: `当前只有 ${normalized.availableMinutes} 分钟，应用无法确认已批准方案能否完整执行。`,
      canConfirm: true,
      input: normalized,
      candidates: [regularCandidates[2], regularCandidates[1], regularCandidates[0]],
      recommendation: {
        candidateId: 'record_only',
        priority: '时间优先',
        reason: `当前只有 ${normalized.availableMinutes} 分钟，所以优先完整记录，不由应用拆分或缩减专业方案。`,
      },
      priorFeedback,
    });
  }

  return evaluationResult({
    level: 'ready',
    label: '可以继续确认',
    conflict: '未发现已选择的异常信号，且有可核验的已批准处方；仍需由你确认今天是否适合继续。',
    canConfirm: true,
    input: normalized,
    candidates: regularCandidates,
    recommendation: {
      candidateId: 'follow_approved',
      priority: '常规优先',
      reason: '当前未触发停止或复盘条件，且已有批准处方和足够时间，所以优先按已批准方案执行。',
    },
    priorFeedback,
  });
}

function buildRecoveryHandoff({ evaluation, selectedId, confirmed, feedback = {}, createdAt = new Date().toISOString() }) {
  if (!confirmed) throw new Error('结果需要人工确认后才能导出');
  const selected = evaluation && evaluation.candidates && evaluation.candidates.find((item) => item.id === selectedId);
  if (!selected) throw new Error('请选择一个可用方案');
  if (!evaluation.canConfirm && selected.allowsTraining) throw new Error('当前风险状态不能确认训练方案');
  return {
    schemaVersion: 'jkshz-recovery-journey-2',
    createdAt,
    input: evaluation.input,
    risk: { level: evaluation.level, label: evaluation.label, conflict: evaluation.conflict },
    priorFeedback: evaluation.priorFeedback,
    recommendation: evaluation.recommendation,
    selection: selected,
    confirmation: { status: 'confirmed_by_user', confirmedAt: createdAt },
    feedback: {
      feeling: cleanText(feedback.feeling, '尚未反馈'),
      note: cleanText(feedback.note, '尚未补充'),
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
    `上次反馈：${handoff.priorFeedback.summary}`,
    `反馈影响：${handoff.priorFeedback.impact}`,
    `风险判断：${handoff.risk.label}｜${handoff.risk.conflict}`,
    `建议优先级：${handoff.recommendation.priority}`,
    `为什么优先：${handoff.recommendation.reason}`,
    `人工选择：${handoff.selection.title}`,
    `选择说明：${handoff.selection.description}`,
    `方案收益：${handoff.selection.benefit}`,
    `方案权衡：${handoff.selection.tradeoff}`,
    `完成感受：${handoff.feedback.feeling}`,
    `反馈备注：${handoff.feedback.note}`,
    `边界：${handoff.boundary}`,
  ].join('\n');
}

module.exports = {
  BOUNDARY,
  FEEDBACK_SCHEMA,
  evaluateRecoverySituation,
  buildRecoveryHandoff,
  createRecoveryFeedbackRecord,
  parseRecoveryFeedback,
  recoveryHandoffToText,
  summarizePriorFeedback,
};
