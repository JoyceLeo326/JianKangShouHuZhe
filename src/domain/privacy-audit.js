function stableStringify(value) {
  if (value == null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function fingerprint(value) {
  const text = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function safeDetails(details = {}) {
  const allowed = ['format', 'status', 'reason', 'count', 'version', 'collection', 'decision', 'provider', 'model'];
  return Object.fromEntries(Object.entries(details).filter(([key]) => allowed.includes(key)));
}

function createAuditEvent({ action, actor = {}, objectType = 'workspace', objectId = 'local', at = new Date().toISOString(), details = {} }) {
  const base = { action, actorId: actor.id || 'local_guest', actorRole: actor.role || 'unknown', objectType, objectId, at, details: safeDetails(details) };
  return { id: `audit_${at.replace(/\D/g, '')}_${fingerprint(base)}`, ...base };
}

function createConsentVersion({ version, userId, at = new Date().toISOString() }) {
  return {
    id: `consent_${fingerprint({ version, userId, at })}`,
    version,
    userId,
    status: 'granted',
    grantedAt: at,
    withdrawnAt: null,
    scopes: ['local_health_records', 'sensitive_health_information'],
  };
}

function withdrawConsent(consent, at = new Date().toISOString()) {
  return { ...consent, status: 'withdrawn', withdrawnAt: at };
}

function exportDataEnvelope(data, exportedAt = new Date().toISOString()) {
  const payload = { schemaVersion: 'jkshz-personal-export-1', exportedAt, data };
  return { ...payload, integrity: { algorithm: 'fnv1a-32', fingerprint: fingerprint(payload) } };
}

module.exports = { stableStringify, fingerprint, createAuditEvent, createConsentVersion, withdrawConsent, exportDataEnvelope };
