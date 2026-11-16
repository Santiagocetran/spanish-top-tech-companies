import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeGreenhouse } from '../../lib/jobs/normalize.js';
import { reconcileSnapshot } from '../../lib/jobs/lifecycle.js';
import { searchJobs } from '../../lib/jobs/search.js';
import { RULES_VERSION, SCHEMA_VERSION } from '../../lib/jobs/schema.js';
import { extractDescription } from '../../lib/jobs/description.js';
import { normalizeCompensation } from '../../lib/jobs/compensation-normalize.js';
import { evaluateEligibility } from '../../lib/jobs/eligibility.js';
import { matchCompensation } from '../../lib/jobs/compensation.js';

// Independently selected synthetic cases, held apart from adapter development
// fixtures. They are regression evidence, not a real-world evaluation sample.
const now = '2026-11-16T00:00:00.000Z';
const context = { job_id: 'held_out_job', option_id: 'held_out_option',
  source_url: 'https://boards.greenhouse.io/synthetic/jobs/501', observed_at: now };
const base = { workplace: 'remote', scope: 'unknown', locations: [],
  allowed_countries: [], excluded_countries: [], exhaustive_countries: false,
  mandatory_foreign_residence: false, conflicting_evidence: false, evidence_refs: [] };
function status(content, initial = base) {
  const extracted = extractDescription(content, context);
  return evaluateEligibility({ ...initial, ...extracted.patch,
    conflicting_evidence: !extracted.complete || extracted.patch.conflicting_evidence === true,
  }, { now }).status;
}

test('held-out descriptions distinguish job scope, negation, background and unrelated requirements', () => {
  const cases = [
    ['<div><strong>This position is remote in Argentina.</strong></div>', 'confirmed'],
    ['<p>Este puesto permite trabajar desde Argentina.</p><p>Se requieren viajes ocasionales.</p>', 'confirmed'],
    ['Our company has offices in Argentina.', 'unknown'],
    ['Our company is headquartered in Argentina. This is a remote role.', 'unknown'],
    ['Our company is headquartered in the United States. This role is remote from Argentina.', 'confirmed'],
    ['This role is remote across LATAM. Overlap with US business hours is required.', 'likely'],
    ['This role is not remote from Argentina.', 'unknown'],
    ['Argentina is not ineligible.', 'unknown'],
    ['No se permite trabajar desde Argentina.', 'ineligible'],
    ['Este puesto permite trabajar desde Argentina. Este puesto excluye Argentina.', 'unknown'],
    ['This role is remote in Argentina. This role requires weekly attendance in the London office.', 'unknown'],
    ['This role is remote in Argentina. US work authorization is required.', 'unknown'],
    ['This role is remote from Argentina, except applicants living there.', 'unknown'],
    ['Our company hires worldwide. This role requires residence in Brazil.', 'unknown'],
  ];
  for (const [content, expected] of cases) assert.equal(status(content), expected, content);
});

test('held-out unsupported markup and hidden restrictions fail safely without excerpts', () => {
  for (const content of [
    '<p class="eligibility">This role is remote from Argentina.</p>',
    '<p>This role is remote from Argentina.</p><!-- US only -->',
    '<p>This role is remote from Argentina.</p><script>US only</script>',
    '<p>This role is remote from Argentina.</p><span hidden>US only</span>',
    '<p>This role is remote from Argentina.</p><',
    '<p>This role is remote from Argentina.</p>&unknown;',
    '<p>This role is remote from Argentina</div>',
    '<strong>This role is remote from Argentina',
    '</p>This role is remote from Argentina<p>',
    '<p><div>This role is remote from Argentina</p></div>',
  ]) {
    assert.equal(status(content), 'unknown', content);
    const result = extractDescription(content, context);
    assert.ok(!JSON.stringify(result).includes('This role is remote from Argentina'));
    assert.ok(!JSON.stringify(result).includes('US only'));
  }
});

test('held-out raw posting restrictions cannot be overridden by favorable description clauses', () => {
  const registry = JSON.parse(readFileSync(new URL('../fixtures/ar/registry.json', import.meta.url)));
  const original = JSON.parse(readFileSync(new URL('../fixtures/ar/greenhouse.json', import.meta.url))).jobs[0];
  const cases = [
    { title: 'Software Engineer — must reside in Brazil', location: { name: 'Remote' }, content: 'This role is remote from Argentina.' },
    { location: { name: 'Remote — US only' }, content: 'This role is remote from Argentina.' },
    { location: { name: 'Buenos Aires, Argentina' }, content: 'This role is remote from Argentina.' },
    { location: { name: 'Remote — Argentina' }, content: 'No se permite trabajar desde Argentina.' },
    { location: { name: 'Remote — Argentina; hybrid in London' }, content: 'This role is remote from Argentina.' },
  ];
  for (const patch of cases) {
    const { jobs } = normalizeGreenhouse({ jobs: [{ ...original, ...patch }] }, {
      source: registry.sources[0], company: registry.companies[0], observed_at: now,
    });
    assert.equal(jobs[0].eligibility.status, 'unknown', JSON.stringify(patch));
  }
});

test('held-out malformed optional bodies fail pay enrichment without aborting the listing', () => {
  const registry = JSON.parse(readFileSync(new URL('../fixtures/ar/registry.json', import.meta.url)));
  const original = JSON.parse(readFileSync(new URL('../fixtures/ar/greenhouse.json', import.meta.url))).jobs[0];
  for (const malformed of [null, false, 0, '', 'malformed', [], { status: 'success', pay_input_ranges: null }]) {
    const { jobs } = normalizeGreenhouse({ jobs: [original] }, {
      source: registry.sources[0], company: registry.companies[0], observed_at: now,
      details: { '101': malformed },
    });
    assert.equal(jobs[0].eligibility.status, 'confirmed');
    assert.equal(jobs[0].eligibility_evidence_complete, true);
    assert.equal(jobs[0].compensation_enrichment_status, 'failed');
    assert.deepEqual(jobs[0].compensation, []);
  }
});

const payFilter = { currency: 'USD', period: 'year', min_amount: 50000 };
const payInput = patch => ({ min_cents: 5000000, max_cents: 7000000, currency_type: 'USD',
  title: 'Annual gross base salary for Argentina employees', ...patch });
const detail = inputs => ({ status: 'success', pay_input_ranges: inputs });

test('held-out native pay text never silently supplies unstructured missing dimensions', () => {
  const result = normalizeCompensation(detail([payInput({})]), context);
  assert.equal(result.status, 'success');
  const [range] = result.ranges;
  assert.equal(range.min, 50000);
  assert.equal(range.max, 70000);
  // An unrecognized natural-language title cannot supply implicit defaults.
  assert.equal(matchCompensation(range, payFilter, context.option_id, { now }), false);
  for (const patch of [{currency_type: null}, {currency_type: '$'}, {currency_type: 'XYZ'}]) {
    const [unknown] = normalizeCompensation(detail([payInput(patch)]), context).ranges;
    assert.equal(unknown.currency, null);
    assert.equal(matchCompensation(unknown, payFilter, context.option_id, { now }), false);
  }
  for (const title of [
    'Argentina gross employee base salary',
    'Argentina annual employee base salary',
    'Annual gross employee base salary',
    'Argentina annual gross compensation',
    'Argentina annual gross base salary except Argentina',
    'US annual gross employee base salary',
  ]) {
    const [incomplete] = normalizeCompensation(detail([payInput({ title })]), context).ranges;
    assert.equal(matchCompensation(incomplete, payFilter, context.option_id, { now }), false, title);
  }
});

test('held-out explicit pay tiers preserve US/AR scope and optional failure', () => {
  const result = normalizeCompensation(detail([
    payInput({ title: 'US annual gross employee base salary' }),
    payInput({ title: 'Argentina annual gross employee base salary', min_cents: 3000000, max_cents: 4000000 }),
  ]), context);
  assert.equal(result.ranges.length, 2);
  assert.equal(result.ranges.filter(r => matchCompensation(r, payFilter, context.option_id, { now })).length, 0);
  assert.equal(result.ranges.filter(r => matchCompensation(r, { ...payFilter, min_amount: 30000 }, context.option_id, { now })).length, 1);
  for (const raw of [{ status: 'failed' }, detail([payInput({ min_cents: -1 })]), detail([payInput({ min_cents: 8000000 })]), detail([payInput({ annotations: { option_ids: ['foreign_option'] } })])]) {
    const failed = normalizeCompensation(raw, context);
    assert.equal(failed.status, 'failed');
    assert.deepEqual(failed.ranges, []);
    assert.deepEqual(failed.evidence, []);
  }
});

test('held-out optional detail outage preserves still-fresh pay with usable option references', () => {
  const registry = JSON.parse(readFileSync(new URL('../fixtures/ar/registry.json', import.meta.url)));
  const raw = JSON.parse(readFileSync(new URL('../fixtures/ar/greenhouse.json', import.meta.url)));
  raw.jobs = [raw.jobs[0]];
  const apply = (previous, detailData, observed_at, run_id) => {
    const normalized = normalizeGreenhouse(raw, { source: registry.sources[0], company: registry.companies[0],
      observed_at, details: { '101': detailData } });
    return reconcileSnapshot(previous, { run_id, observed_at, sources: [{
      source_id: registry.sources[0].source_id, inventory_plan_hash: 'p', inventory_complete: true,
      status: 'complete', truncated: false, coverage_scope: 'full_board', jobs: normalized.jobs,
    }] }, { sources: registry.sources, metadata: { dataset_kind: 'synthetic', schema_version: SCHEMA_VERSION,
      rules_version: RULES_VERSION, generation_id: run_id, producer_code_sha: '0'.repeat(40),
      registry_hash: '0'.repeat(64), removal_policy_version: 'v1', evidence: normalized.evidence } });
  };
  const good = apply(null, detail([payInput({ title: 'Argentina annual gross base salary' })]), now, 'heldout_pay_good');
  assert.equal(searchJobs(good, { pay: payFilter }, now).total, 1);
  const later = '2026-11-16T01:00:00.000Z';
  const failed = apply(good, { status: 'failed' }, later, 'heldout_pay_failure');
  assert.equal(searchJobs(failed, {}, later).total, 1);
  assert.equal(failed.jobs[0].compensation[0].verified_at, now);
  assert.equal(searchJobs(failed, { pay: payFilter }, later).total, 1);
});
