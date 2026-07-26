const test = require('node:test');
const assert = require('node:assert/strict');
const { queueLocalSnapshot, detectSnapshotConflict, mergeNonConflictingSnapshots, resolveSnapshotConflict } = require('../../src/domain/sync-queue');

test('offline queue deduplicates identical snapshots and keeps bounded history', () => {
  let queue = [];
  queue = queueLocalSnapshot(queue, { patients: [{ id: 'p-1' }] }, '2026-07-27T12:00:00.000Z');
  queue = queueLocalSnapshot(queue, { patients: [{ id: 'p-1' }] }, '2026-07-27T12:01:00.000Z');
  assert.equal(queue.length, 1);
  assert.equal(queue[0].status, 'waiting_for_remote');
});

test('conflict detection names changed top-level collections', () => {
  const base = { patients: [{ id: 'p-1', name: '原值' }], records: [] };
  const local = { patients: [{ id: 'p-1', name: '本机值' }], records: [] };
  const remote = { patients: [{ id: 'p-1', name: '远端值' }], records: [{ id: 'r-1' }] };
  const conflict = detectSnapshotConflict(base, local, remote, '2026-07-27T12:00:00.000Z');
  assert.equal(conflict.status, 'needs_review');
  assert.deepEqual(conflict.collections, ['patients']);
  assert.equal(resolveSnapshotConflict(conflict, 'local').status, 'resolved_local');
});

test('conflict detection does not invent a conflict without divergent edits', () => {
  const base = { patients: [] };
  assert.equal(detectSnapshotConflict(base, { patients: [{ id: 'p-1' }] }, base), null);
});

test('non-conflicting merge preserves both local and remote-only changes', () => {
  const base = { patients: [], records: [], auditEvents: [] };
  const local = { patients: [{ id: 'p-1' }], records: [], auditEvents: [{ id: 'a-local', at: '2026-07-27T12:00:00Z' }] };
  const remote = { patients: [], records: [{ id: 'r-1' }], auditEvents: [{ id: 'a-remote', at: '2026-07-27T12:01:00Z' }] };
  assert.deepEqual(mergeNonConflictingSnapshots(base, local, remote), {
    patients: [{ id: 'p-1' }],
    records: [{ id: 'r-1' }],
    auditEvents: [
      { id: 'a-remote', at: '2026-07-27T12:01:00Z' },
      { id: 'a-local', at: '2026-07-27T12:00:00Z' },
    ],
  });
});
