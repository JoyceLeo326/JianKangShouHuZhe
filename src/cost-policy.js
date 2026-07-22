const ZERO_OWNER_COST = 'zero_owner_cost';

function resolveCostMode(env = {}) {
  return env.COST_MODE || env.EXPO_PUBLIC_COST_MODE || ZERO_OWNER_COST;
}

function evaluateCostAction({
  mode = ZERO_OWNER_COST,
  route = 'local',
  estimatedUnits = 0,
  freeUnitsRemaining = 0,
  explicitSensitiveDataConsent = false,
} = {}) {
  const estimate = Math.max(0, Number(estimatedUnits) || 0);
  const remaining = Math.max(0, Number(freeUnitsRemaining) || 0);

  if (route === 'local') return { allowed: true, reason: 'local_no_owner_cost' };
  if (route === 'byok' || route === 'byoi') {
    return explicitSensitiveDataConsent
      ? { allowed: true, reason: 'user_or_institution_funded' }
      : { allowed: false, reason: 'sensitive_data_consent_required' };
  }
  if (mode === ZERO_OWNER_COST && route === 'owner_free_quota') {
    return estimate <= remaining
      ? { allowed: true, reason: 'within_hard_free_quota' }
      : { allowed: false, reason: 'free_quota_exhausted' };
  }
  if (mode === ZERO_OWNER_COST) return { allowed: false, reason: 'owner_billing_forbidden' };
  return { allowed: true, reason: 'non_zero_cost_mode' };
}

function publicCostStatus(env = {}) {
  return {
    mode: resolveCostMode(env),
    ownerFixedCost: 0,
    automaticOverage: false,
    defaultAiRoute: 'off_or_local_demo',
    supportedContinuation: ['BYOK', 'BYOI', 'self-hosted'],
  };
}

module.exports = { ZERO_OWNER_COST, evaluateCostAction, publicCostStatus, resolveCostMode };
