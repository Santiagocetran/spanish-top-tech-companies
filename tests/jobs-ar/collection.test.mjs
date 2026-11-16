import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectGreenhouse } from '../../lib/jobs/collect-greenhouse.js';
import { reconcileSnapshot } from '../../lib/jobs/lifecycle.js';
import { stableJobId } from '../../lib/jobs/registry.js';
import { AdapterEnvelopeSchema, RULES_VERSION } from '../../lib/jobs/schema.js';
const fixture = name => JSON.parse(readFileSync(new URL(`../fixtures/ar/${name}.json`, import.meta.url)));
const registry = fixture('registry');
const fullInventory = () => { const raw = fixture('greenhouse'); raw.jobs.forEach(job => { job.content = ''; }); return { ...raw, meta: { total: raw.jobs.length } }; };
const observed_at = '2026-11-16T00:00:00.000Z';
const defaults = () => ({ source: structuredClone(registry.sources[0]), company: structuredClone(registry.companies[0]), run_id: 'collection_test', observed_at });
const transportFor = (body, extra = {}) => async ({ url }) => ({ status: 200, url, body, ...extra });

test('collection requires injected transport and rejects invalid sources before dispatch', async () => {
  await assert.rejects(collectGreenhouse(defaults()), /TRANSPORT_REQUIRED/);
  let calls = 0;
  const source = { ...defaults().source, enabled: false };
  await assert.rejects(collectGreenhouse({ ...defaults(), source, transport: async () => { calls++; } }));
  assert.equal(calls, 0);
});

test('single full inventory emits validated jobs/evidence and exact provider request', async () => {
  const calls = [];
  const result = await collectGreenhouse({ ...defaults(), transport: async request => {
    calls.push(request);
    assert.equal(request.url, 'https://boards-api.greenhouse.io/v1/boards/synthetic/jobs?content=true');
    assert.equal(request.method, 'GET');
    assert.ok(request.signal instanceof AbortSignal);
    return { status: 200, url: request.url, body: fullInventory() };
  } });
  AdapterEnvelopeSchema.parse(result.envelope);
  assert.equal(calls.length, 1);
  assert.equal(result.envelope.inventory_complete, true);
  assert.equal(result.envelope.jobs.length, 5);
  assert.equal(result.envelope.observed_ids.length, 5);
  assert.ok(result.evidence.length >= 5);
});

test('empty array is complete; malformed 200, failures and redirects never mean empty inventory', async () => {
  const empty = await collectGreenhouse({ ...defaults(), transport: transportFor({ jobs: [], meta: { total: 0 } }) });
  assert.equal(empty.envelope.inventory_complete, true);
  assert.equal(empty.envelope.status, 'complete');
  for (const [response, status] of [
    [{ status: 200, body: {} }, 'invalid_payload'],
    [{ status: 200, body: { jobs: null } }, 'invalid_payload'],
    [{ status: 404 }, 'failed'], [{ status: 403 }, 'blocked'], [{ status: 429 }, 'throttled'],
    [{ status: 302 }, 'failed'], [{ status: 200, url: 'https://evil.example/jobs', body: { jobs: [] } }, 'failed'],
  ]) {
    const { envelope } = await collectGreenhouse({ ...defaults(), transport: async () => response });
    assert.equal(envelope.status, status);
    assert.equal(envelope.inventory_complete, false);
  }
});

test('caps and pagination hints never produce complete inventory', async () => {
  for (const [body, extra] of [
    [{ ...fullInventory(), next_page: 2 }, {}],
    [{ ...fullInventory(), meta: { total: 100 } }, {}],
    [fullInventory(), { truncated: true }],
  ]) {
    const { envelope } = await collectGreenhouse({ ...defaults(), transport: transportFor(body, extra) });
    assert.equal(envelope.status, 'partial');
    assert.equal(envelope.inventory_complete, false);
    assert.equal(envelope.truncated, true);
    assert.equal(envelope.request_count, 1);
  }
  const { envelope } = await collectGreenhouse({ ...defaults(), transport: transportFor({ jobs: [], padding: 'a'.repeat(1024 * 1024) }) });
  assert.equal(envelope.inventory_complete, false);
  assert.ok(envelope.issues.includes('RESPONSE_SIZE_CAP'));
});

test('listed IDs survive required evidence failures without preventing unrelated absence reconciliation', async () => {
  const raw = fullInventory();
  delete raw.jobs[0].title;
  raw.jobs[1].content = 'Unrecognized restriction.';
  const { envelope } = await collectGreenhouse({ ...defaults(), transport: transportFor(raw) });
  assert.equal(envelope.inventory_complete, true);
  assert.equal(envelope.observed_ids.length, 5);
  assert.equal(envelope.required_evidence_failures.length, 2);
  assert.equal(envelope.jobs.length, 4);
  assert.ok(envelope.observed_ids.includes(envelope.required_evidence_failures[0]));
});

test('unreliable or duplicate IDs invalidate coverage, never merge silently', async () => {
  for (const corrupt of [raw => raw.jobs.push(raw.jobs[0]), raw => { raw.jobs[0].id = ''; }]) {
    const raw = fullInventory(); corrupt(raw);
    const { envelope } = await collectGreenhouse({ ...defaults(), transport: transportFor(raw) });
    assert.equal(envelope.inventory_complete, false);
    assert.equal(envelope.status, 'partial');
  }
});

test('optional detail failure and request/detail caps preserve listing geographic evidence', async () => {
  const raw = fullInventory();
  const config = defaults();
  config.source.limits.details = 1;
  config.source.limits.requests = 2;
  const calls = [];
  const { envelope } = await collectGreenhouse({ ...config, enrich_pay: true, transport: async request => {
    calls.push(request.url);
    if (calls.length === 1) return { status: 200, body: raw };
    assert.equal(request.url, 'https://boards-api.greenhouse.io/v1/boards/synthetic/jobs/101?pay_transparency=true');
    throw new Error('PRIVATE recruiter@example.com token-secret');
  } });
  assert.equal(envelope.inventory_complete, true);
  assert.equal(envelope.jobs[0].eligibility.status, 'confirmed');
  assert.equal(envelope.jobs[0].eligibility_evidence_complete, true);
  assert.equal(envelope.optional_enrichment_failures.length, 5);
  assert.equal(calls.length, 2);
  assert.doesNotMatch(JSON.stringify(envelope), /PRIVATE|recruiter|token-secret/);
});

test('deadline rejects late transport response and aborts request without mutation', async () => {
  const config = defaults();
  config.source.limits.timeout_ms = 10;
  let time = 0;
  let signal;
  const result = await collectGreenhouse({ ...config, clock: () => time, transport: async request => {
    signal = request.signal;
    time = 10;
    return { status: 200, body: fullInventory() };
  } });
  assert.equal(result.envelope.inventory_complete, false);
  assert.deepEqual(result.envelope.jobs, []);
  assert.ok(result.envelope.issues.includes('TIME_CAP'));
  assert.equal(signal.aborted, true);
});

test('successful optional native pay detail attaches only its own option range', async () => {
  const config = defaults();
  config.source.limits.details = 1;
  config.source.limits.requests = 2;
  const raw = fullInventory();
  raw.jobs = [raw.jobs[0]];
  raw.meta.total = 1;
  const result = await collectGreenhouse({ ...config, enrich_pay: true, transport: async ({ url }) => ({
    status: 200, url,
    body: url.includes('pay_transparency') ? {
      id: 101,
      pay_input_ranges: [{ min_cents: 10000000, max_cents: 12000000, currency_type: 'USD', title: 'Argentina annual gross base salary' }],
    } : raw,
  }) });
  assert.equal(result.envelope.inventory_complete, true);
  assert.equal(result.envelope.jobs[0].compensation_enrichment_status, 'success');
  assert.equal(result.envelope.jobs[0].compensation[0].argentina_applicable, true);
  assert.equal(result.envelope.jobs[0].compensation[0].min, 100000);
  assert.equal(result.evidence.length, 2);
});

test('request budget skips optional dispatch and hanging transport obeys deadline', async () => {
  const config = defaults();
  config.source.limits.requests = 1;
  config.source.limits.details = 10;
  const capped = await collectGreenhouse({ ...config, enrich_pay: true, transport: transportFor(fullInventory()) });
  assert.equal(capped.envelope.request_count, 1);
  assert.equal(capped.envelope.inventory_complete, true);
  assert.ok(capped.envelope.issues.includes('REQUEST_CAP'));
  config.source.limits.timeout_ms = 5;
  let signal;
  const timed = await collectGreenhouse({ ...config, transport: request => { signal = request.signal; return new Promise(() => {}); } });
  assert.ok(timed.envelope.issues.includes('TIME_CAP'));
  assert.equal(signal.aborted, true);
  assert.equal(timed.envelope.jobs.length, 0);
});

test('missing meta.total is incomplete and EU collection is unsupported', async () => {
  const missingTotal = await collectGreenhouse({ ...defaults(), transport: transportFor(fixture('greenhouse')) });
  assert.equal(missingTotal.envelope.status, 'partial');
  assert.equal(missingTotal.envelope.inventory_complete, false);
  const config = defaults();
  config.source.region = 'eu';
  config.source.canonical_board_url = 'https://boards.eu.greenhouse.io/synthetic';
  config.source.allowed_hosts = ['boards.eu.greenhouse.io'];
  let calls = 0;
  await assert.rejects(collectGreenhouse({ ...config, transport: async () => { calls++; } }), /UNSUPPORTED_SOURCE_REGION/);
  assert.equal(calls, 0);
});

test('content=true missing/null/nonstring bodies remain observed required failures', async () => {
  for (const value of [undefined, null, 123]) {
    const raw = fullInventory();
    raw.jobs[0].content = value;
    const { envelope } = await collectGreenhouse({ ...defaults(), transport: transportFor(raw) });
    const id = stableJobId(defaults().source, '101');
    assert.equal(envelope.inventory_complete, true);
    assert.ok(envelope.observed_ids.includes(id));
    assert.ok(envelope.required_evidence_failures.includes(id));
    assert.ok(!envelope.jobs.some(job => job.job_id === id));
  }
});

test('collector failures quarantine unseen IDs and retain prior IDs while reconciling unrelated jobs', async () => {
  const apply = (previous, result, run_id, observed_at) => reconcileSnapshot(previous, { run_id, observed_at, sources: [result.envelope] }, {
    sources: registry.sources,
    metadata: { dataset_kind: 'synthetic', schema_version: 'ar-v0-1', rules_version: RULES_VERSION, producer_code_sha: '0'.repeat(40), registry_hash: '0'.repeat(64), removal_policy_version: 'v1', generation_id: run_id, evidence: result.evidence },
  });
  const initial = await collectGreenhouse({ ...defaults(), run_id: 'mixed_initial', transport: transportFor(fullInventory()) });
  const before = apply(null, initial, 'mixed_initial', observed_at);
  const raw = fullInventory();
  delete raw.jobs[0].title;
  const unseen = { ...raw.jobs[1], id: 999, absolute_url: 'https://boards.greenhouse.io/synthetic/jobs/999' };
  delete unseen.title;
  raw.jobs = [raw.jobs[0], raw.jobs[2], unseen];
  raw.meta.total = raw.jobs.length;
  const later = '2026-11-16T01:00:00.000Z';
  const result = await collectGreenhouse({ ...defaults(), run_id: 'mixed_later', observed_at: later, transport: transportFor(raw) });
  const after = apply(before, result, 'mixed_later', later);
  const knownId = stableJobId(defaults().source, '101');
  const missingId = stableJobId(defaults().source, '102');
  assert.equal(after.jobs.find(job => job.job_id === knownId).status, 'stale');
  assert.equal(after.jobs.find(job => job.job_id === knownId).last_eligibility_verified_at, observed_at);
  assert.equal(after.jobs.find(job => job.job_id === missingId).status, 'missing');
  assert.ok(!after.jobs.some(job => job.external_id === '999'));
  const fresh = apply(null, result, 'mixed_later', later);
  assert.equal(fresh.jobs.length, 1);
  assert.equal(fresh.jobs[0].external_id, '103');
});

// Synthetic transport cases inspired by source-review failure modes; no real pages.
test('HTTP 200 expired-page redirects and HTML cannot close prior inventory', async () => {
  const apply = (previous, result, run_id, at) => reconcileSnapshot(previous, {
    run_id, observed_at: at, sources: [result.envelope],
  }, { sources: registry.sources, metadata: {
    dataset_kind: 'synthetic', schema_version: 'ar-v0-1', rules_version: RULES_VERSION,
    producer_code_sha: '0'.repeat(40), registry_hash: '0'.repeat(64),
    removal_policy_version: 'v1', generation_id: run_id, evidence: result.evidence,
  } });
  const initial = await collectGreenhouse({ ...defaults(), transport: transportFor(fullInventory()) });
  const baseline = apply(null, initial, 'baseline', observed_at);
  for (const [response, issue] of [
    [{ status: 200, url: 'https://job-boards.greenhouse.io/synthetic?error=true', body: '<p>Synthetic vacancy expired</p>' }, 'REDIRECT_REJECTED'],
    [{ status: 200, body: '<html><p>Synthetic vacancy expired</p></html>' }, 'MISSING_JOBS_ARRAY'],
  ]) {
    let snapshot = baseline;
    for (const day of [17, 18]) {
      const at = `2026-11-${day}T00:00:00.000Z`;
      const run_id = `failed_${day}`;
      const result = await collectGreenhouse({ ...defaults(), run_id, observed_at: at, transport: async () => response });
      assert.equal(result.envelope.inventory_complete, false);
      assert.deepEqual(result.envelope.jobs, []);
      assert.ok(result.envelope.issues.includes(issue));
      snapshot = apply(snapshot, result, run_id, at);
      assert.equal(snapshot.jobs.length, baseline.jobs.length);
      for (const job of snapshot.jobs) {
        assert.equal(job.missing_complete_runs, 0);
        assert.equal(job.closed_at, null);
        assert.equal(job.last_eligibility_verified_at, observed_at);
      }
      assert.deepEqual(apply(snapshot, result, run_id, at), snapshot);
    }
  }
});
