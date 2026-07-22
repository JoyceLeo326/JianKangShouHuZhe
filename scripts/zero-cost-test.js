const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ZERO_OWNER_COST, evaluateCostAction, publicCostStatus, resolveCostMode } = require('../src/cost-policy');

assert.equal(resolveCostMode({}), ZERO_OWNER_COST);
assert.deepEqual(evaluateCostAction({ route: 'local' }), { allowed: true, reason: 'local_no_owner_cost' });
assert.deepEqual(
  evaluateCostAction({ route: 'owner_paid', estimatedUnits: 1 }),
  { allowed: false, reason: 'owner_billing_forbidden' },
);
assert.deepEqual(
  evaluateCostAction({ route: 'owner_free_quota', estimatedUnits: 11, freeUnitsRemaining: 10 }),
  { allowed: false, reason: 'free_quota_exhausted' },
);
assert.deepEqual(
  evaluateCostAction({ route: 'byok', explicitSensitiveDataConsent: false }),
  { allowed: false, reason: 'sensitive_data_consent_required' },
);
assert.deepEqual(
  evaluateCostAction({ route: 'byoi', explicitSensitiveDataConsent: true }),
  { allowed: true, reason: 'user_or_institution_funded' },
);
assert.equal(publicCostStatus({}).automaticOverage, false);

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const docs = fs.readFileSync(path.join(root, 'docs', 'zero-owner-cost.md'), 'utf8');

assert.match(app, /零成本模式/);
assert.match(app, /API Key 不会写入本地持久存储/);
assert.match(app, /发送虚构演示记录到第三方模型/);
assert.doesNotMatch(app, /API Key 只持久化在当前设备/);
assert.match(envExample, /COST_MODE=zero_owner_cost/);
assert.match(envExample, /EXPO_PUBLIC_API_BASE_URL=/);
assert.match(docs, /Vercel.*个人.*非商业.*演示/s);
assert.match(docs, /BYOK/);
assert.match(docs, /BYOI/);

console.log('Zero-owner-cost policy passed: fail-closed, BYOK/BYOI consent, no automatic overage, and truthful UI copy.');
