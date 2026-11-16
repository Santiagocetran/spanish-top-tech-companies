import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRegistry, validateSourceForCollection, stableJobId } from '../../lib/jobs/registry.js';
const registry = JSON.parse(readFileSync(new URL('../fixtures/ar/registry.json', import.meta.url)));
const source = registry.sources[0], company = registry.companies[0];
const now = '2026-11-16T00:00:00.000Z';
const validate = value => validateRegistry({ companies: [company], sources: [value] });

test('empty and disabled registries remain inspectable without collection permission', () => {
  assert.deepEqual(validateRegistry({ companies: [], sources: [] }), { companies: [], sources: [] });
  const disabled = { ...source, enabled: false, permission_review: { ...source.permission_review, retrieval: false, publication: false } };
  assert.equal(validate(disabled).sources.length, 1);
  assert.throws(() => validateSourceForCollection(disabled, company, now), /SOURCE_DISABLED/);
  assert.equal(validateSourceForCollection(source, company, now).source.source_id, source.source_id);
});

test('canonical board and allowed hosts bind exact provider, region and board', () => {
  for (const host of ['boards.greenhouse.io', 'job-boards.greenhouse.io']) {
    assert.equal(validate({ ...source, canonical_board_url: `https://${host}/${source.board}`, allowed_hosts: [host] }).sources.length, 1);
  }
  const eu = { ...source, region: 'eu', canonical_board_url: `https://boards.eu.greenhouse.io/${source.board}`, allowed_hosts: ['boards.eu.greenhouse.io'] };
  assert.throws(() => validate(eu), /UNSUPPORTED_SOURCE_REGION/);
  for (const canonical_board_url of [
    `https://example.com/${source.board}`, `https://boards.greenhouse.io.evil.example/${source.board}`,
    `https://boards.greenhouse.io/${source.board}/`, `https://boards.greenhouse.io/another`,
    `https://boards.eu.greenhouse.io/${source.board}`, `https://boards-api.greenhouse.io/${source.board}`,
    `https://boards.greenhouse.io/${source.board}?token=secret`,
  ]) assert.throws(() => validate({ ...source, canonical_board_url }));
  for (const allowed_hosts of [['evil.example'], ['boards.greenhouse.io', 'evil.example'], ['boards.eu.greenhouse.io'], ['boards.greenhouse.io', 'boards.greenhouse.io'], ['*.greenhouse.io'], ['127.0.0.1']]) {
    assert.throws(() => validate({ ...source, allowed_hosts }));
  }
  assert.throws(() => validate({ ...source, board: 'foo:bar', canonical_board_url: 'https://boards.greenhouse.io/foo:bar' }));
});

test('collection requires current reviewed employer, ownership and permissions', () => {
  assert.throws(() => validateSourceForCollection(source, { ...company, company_id: 'other' }, now), /COMPANY_SOURCE_MISMATCH/);
  assert.throws(() => validateSourceForCollection(source, { ...company, verification: { ...company.verification, status: 'pending' } }, now), /COMPANY_UNVERIFIED/);
  assert.throws(() => validateSourceForCollection({ ...source, review_due_at: now }, company, now), /SOURCE_REVIEW_EXPIRED/);
  for (const patch of [
    { verified_at: '2026-11-17T00:00:00.000Z' },
    { permission_review: { ...source.permission_review, reviewed_at: '2026-11-17T00:00:00.000Z' } },
    { permission_review: { ...source.permission_review, retrieval: false } },
    { permission_review: { ...source.permission_review, publication: false } },
  ]) assert.throws(() => validateSourceForCollection({ ...source, ...patch }, company, now));
  assert.throws(() => validateSourceForCollection(source, company, 'bad'));
});

test('duplicate source identity rejects alternate IDs and stable identity is region-qualified', () => {
  assert.throws(() => validateRegistry({ companies: [company], sources: [source, { ...source, source_id: 'alias' }] }), /DUPLICATE_REGISTRY_IDENTITY/);
  assert.notEqual(stableJobId(source, '101'), stableJobId({ ...source, region: 'eu' }, '101'));
});
