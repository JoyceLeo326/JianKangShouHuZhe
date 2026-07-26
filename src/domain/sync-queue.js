const { fingerprint, stableStringify } = require('./privacy-audit');
const APPEND_ONLY_KEYS = new Set(['auditEvents']);

function queueLocalSnapshot(queue, snapshot, at = new Date().toISOString(), maxEntries = 12) {
  const nextFingerprint = fingerprint(snapshot);
  if (queue.some((item) => item.fingerprint === nextFingerprint && item.status === 'waiting_for_remote')) return queue;
  const item = {
    id: `outbox_${at.replace(/\D/g, '')}_${nextFingerprint}`,
    fingerprint: nextFingerprint,
    createdAt: at,
    status: 'waiting_for_remote',
    snapshot,
  };
  return [...queue.filter((entry) => entry.status !== 'waiting_for_remote'), item].slice(-maxEntries);
}

function changedFrom(base, next, key) {
  return stableStringify(base && base[key]) !== stableStringify(next && next[key]);
}

function detectSnapshotConflict(base, local, remote, at = new Date().toISOString()) {
  const keys = [...new Set([...Object.keys(base || {}), ...Object.keys(local || {}), ...Object.keys(remote || {})])].sort();
  const collections = keys.filter((key) => !APPEND_ONLY_KEYS.has(key)
    && changedFrom(base, local, key)
    && changedFrom(base, remote, key)
    && stableStringify(local[key]) !== stableStringify(remote[key]));
  if (!collections.length) return null;
  return {
    id: `conflict_${at.replace(/\D/g, '')}_${fingerprint({ collections, local, remote })}`,
    status: 'needs_review',
    detectedAt: at,
    collections,
    baseFingerprint: fingerprint(base),
    localFingerprint: fingerprint(local),
    remoteFingerprint: fingerprint(remote),
  };
}

function mergeNonConflictingSnapshots(base, local, remote) {
  const conflict = detectSnapshotConflict(base, local, remote);
  if (conflict) throw new Error(`存在未解决冲突：${conflict.collections.join('、')}`);
  const keys = [...new Set([...Object.keys(base || {}), ...Object.keys(local || {}), ...Object.keys(remote || {})])];
  return Object.fromEntries(keys.map((key) => {
    if (APPEND_ONLY_KEYS.has(key)) {
      const merged = new Map();
      [...(remote[key] || []), ...(local[key] || [])].forEach((item) => {
        if (item && item.id) merged.set(item.id, item);
      });
      return [key, [...merged.values()].sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))];
    }
    const localChanged = changedFrom(base, local, key);
    return [key, localChanged ? local[key] : remote[key]];
  }));
}

function resolveSnapshotConflict(conflict, decision, at = new Date().toISOString()) {
  if (!['local', 'remote'].includes(decision)) throw new Error('冲突决定必须是 local 或 remote');
  return { ...conflict, status: decision === 'local' ? 'resolved_local' : 'resolved_remote', decision, resolvedAt: at };
}

module.exports = { queueLocalSnapshot, detectSnapshotConflict, mergeNonConflictingSnapshots, resolveSnapshotConflict };
