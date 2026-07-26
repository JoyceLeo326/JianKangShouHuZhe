const test = require('node:test');
const assert = require('node:assert/strict');
const { createAuditEvent, createConsentVersion, withdrawConsent, exportDataEnvelope } = require('../../src/domain/privacy-audit');

test('audit events capture actor role and operation without raw health payloads', () => {
  const event = createAuditEvent({
    action: 'report_exported',
    actor: { id: 'u-1', role: 'patient' },
    objectType: 'report',
    objectId: 'rp-1',
    at: '2026-07-27T12:00:00.000Z',
    details: { format: 'pdf', patientName: '不应写入' },
  });
  assert.equal(event.actorRole, 'patient');
  assert.equal(event.details.format, 'pdf');
  assert.equal(event.details.patientName, undefined);
  assert.match(event.id, /^audit_/);
});

test('consent versions can be granted and explicitly withdrawn', () => {
  const granted = createConsentVersion({ version: 'privacy-2026-07', userId: 'u-1', at: '2026-07-27T12:00:00.000Z' });
  const withdrawn = withdrawConsent(granted, '2026-07-28T12:00:00.000Z');
  assert.equal(granted.status, 'granted');
  assert.equal(withdrawn.status, 'withdrawn');
  assert.equal(withdrawn.version, granted.version);
});

test('personal data export is versioned, complete and integrity-tagged', () => {
  const envelope = exportDataEnvelope({ patients: [{ id: 'p-1' }], auditEvents: [{ id: 'a-1' }] }, '2026-07-27T12:00:00.000Z');
  assert.equal(envelope.schemaVersion, 'jkshz-personal-export-1');
  assert.equal(envelope.data.patients[0].id, 'p-1');
  assert.match(envelope.integrity.fingerprint, /^[0-9a-f]{8}$/);
});
