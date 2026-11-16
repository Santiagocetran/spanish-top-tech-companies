import './deny-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixturePipeline } from '../../scripts/crawl-jobs.mjs';
import { searchJobs, getJob } from '../../lib/jobs/search.js';
import { readSnapshot, writeSnapshot } from '../../lib/jobs/snapshot.js';

const now = '2026-11-16T00:00:00.000Z';
const confirmed = 'job_ccd1d04df847ae9a67f2b17c2102a37b';
const likely = 'job_22c7adc778303b8f6c63a8cf574f57cd';
const unknown = 'job_26b00489de11c134bdfca943e717604c';

test('offline raw fixture to file to exact search, replay, absence and explicit rebuild', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ar-v0-'));
  try {
    const out = join(dir, 'snapshot.json');
    const options = { fixture: 'tests/fixtures/ar/greenhouse.json', registry: 'tests/fixtures/ar/registry.json', out, now };
    const first = await fixturePipeline(options);
    const result = searchJobs(await readSnapshot(out), {}, now);
    assert.deepEqual(result.results.map(j => j.job_id), [confirmed, likely]);
    assert.equal(result.total, 2);
    assert.equal(result.results[0].evidence_valid_until, '2026-11-18T00:00:00.000Z');
    assert.equal(result.results[0].unverified_expires_at, '2026-11-23T00:00:00.000Z');
    assert.equal(result.returned, 2);
    assert.equal(result.has_more, false);
    assert.deepEqual(result.counts.eligibility, { confirmed: 1, likely: 1 });
    assert.deepEqual(searchJobs(first, { eligibility: ['unknown'] }, now).results.map(j => j.job_id), [unknown]);
    assert.equal(getJob(first, 'job_1193cced37c32ffd71298fcc6eaeaec5', now).recommended, false);
    assert.deepEqual(await fixturePipeline({ ...options, previous: out }), first);

    const empty = join(dir, 'empty.json');
    await writeFile(empty, JSON.stringify({ jobs: [] }));
    const missing = await fixturePipeline({ ...options, fixture: empty, previous: out, now: '2026-11-17T00:00:00.000Z' });
    assert.equal(missing.jobs.length, 5);
    assert.ok(missing.jobs.every(j => j.status === 'missing' && j.missing_complete_runs === 1));
    assert.equal(searchJobs(missing, {}, '2026-11-17T00:00:00.000Z').total, 0);
    assert.deepEqual(await fixturePipeline({ ...options, fixture: empty, previous: out, now: '2026-11-17T00:00:00.000Z' }), missing);
    const closed = await fixturePipeline({ ...options, fixture: empty, previous: out, now: '2026-11-18T00:00:00.000Z' });
    assert.ok(closed.jobs.every(j => j.status === 'closed' && j.missing_complete_runs === 2));

    // Version migration is an explicit rebuild, never silent coercion of old state.
    const oldPath = join(dir, 'unsupported.json');
    await writeFile(oldPath, JSON.stringify({ ...first, schema_version: 'ar-v0-0' }));
    await assert.rejects(fixturePipeline({ ...options, previous: oldPath }));
    assert.deepEqual(await readSnapshot(out), closed); // failed candidate leaves last good file untouched
    assert.deepEqual(await fixturePipeline(options), first); // explicit no-previous rebuild
    await assert.rejects(writeSnapshot(out, { ...first, evidence: [] }));
    assert.deepEqual(await readSnapshot(out), first);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('unapproved provider fields and descriptions never leak to persisted state', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ar-privacy-'));
  try {
    const raw = JSON.parse(await readFile('tests/fixtures/ar/greenhouse.json', 'utf8'));
    const canary = 'Canary Person canary@example.invalid +54-11-5555-0123 token_secret_123';
    raw.jobs[0].unapproved_metadata = { private: canary };
    raw.jobs[0].content = canary;
    const fixture = join(dir, 'raw.json'), out = join(dir, 'snapshot.json');
    await writeFile(fixture, JSON.stringify(raw));
    const snapshot = await fixturePipeline({ fixture, registry: 'tests/fixtures/ar/registry.json', out, now });
    assert.equal(snapshot.jobs.find(j => j.job_id === confirmed).eligibility.status, 'unknown');
    assert.ok(!(await readFile(out, 'utf8')).includes(canary));
    assert.ok(!JSON.stringify(searchJobs(snapshot, { include_stale: true, eligibility: ['unknown'] }, now)).includes(canary));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
