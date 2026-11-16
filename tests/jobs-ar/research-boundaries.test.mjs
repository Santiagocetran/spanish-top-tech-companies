import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeGreenhouse } from '../../lib/jobs/normalize.js';
import { reconcileSnapshot } from '../../lib/jobs/lifecycle.js';
import { searchJobs } from '../../lib/jobs/search.js';
import { RULES_VERSION, SCHEMA_VERSION } from '../../lib/jobs/schema.js';

// Invented offline application fields; no employer content or live response.
const fixture = name => JSON.parse(readFileSync(new URL(`../fixtures/ar/${name}.json`, import.meta.url)));
const registry = fixture('registry');
const now = '2026-11-16T00:00:00.000Z';
const countryQuestion = {
  label: 'Country of residence',
  fields: [{ name: 'country', type: 'multi_value_single_select', values: [
    { label: 'Argentina', value: 'AR' }, { label: 'United States', value: 'US' },
  ] }],
};
const expectationQuestion = {
  label: 'What is your expected monthly salary in USD?',
  fields: [{ name: 'salary_expectation', type: 'input_text', value: '6000' }],
};

function normalize({ location = 'Remote', content = '', questions = [], details } = {}) {
  const raw = fixture('greenhouse');
  raw.jobs = [{ ...raw.jobs[0], location: { name: location }, content, questions }];
  return normalizeGreenhouse(raw, {
    source: registry.sources[0], company: registry.companies[0], observed_at: now, details,
  });
}

function snapshot(normalized) {
  return reconcileSnapshot(null, {
    run_id: 'synthetic_research_boundary', observed_at: now,
    sources: [{ source_id: registry.sources[0].source_id, inventory_plan_hash: 'synthetic_plan_v1',
      inventory_complete: true, status: 'complete', truncated: false, coverage_scope: 'full_board', jobs: normalized.jobs }],
  }, {
    sources: registry.sources,
    metadata: { dataset_kind: 'synthetic', schema_version: SCHEMA_VERSION, rules_version: RULES_VERSION,
      generation_id: 'synthetic_research_boundary', producer_code_sha: '0'.repeat(40),
      registry_hash: '0'.repeat(64), removal_policy_version: 'v1', evidence: normalized.evidence },
  });
}

const pay = { currency: 'USD', period: 'month', component: 'base', basis: 'gross', min_amount: 5000 };

test('country selector options do not establish posting-specific Argentina eligibility', () => {
  const bare = normalize();
  const form = normalize({ questions: [countryQuestion] });
  assert.equal(form.jobs[0].eligibility.status, 'unknown');
  assert.deepEqual(form.jobs[0].eligibility, bare.jobs[0].eligibility);
  assert.deepEqual(form.evidence, bare.evidence);
  assert.equal(searchJobs(snapshot(form), {}, now).total, 0);
  assert.doesNotMatch(JSON.stringify(form), /Country of residence|multi_value_single_select/);
});

test('country dropdown embedded in description is unsupported rather than hiring evidence', () => {
  const normalized = normalize({ content: '<label>Country of residence</label><select><option>Argentina</option><option>United States</option></select>' });
  assert.equal(normalized.jobs[0].eligibility.status, 'unknown');
  assert.equal(normalized.jobs[0].eligibility_evidence_complete, false);
  assert.equal(searchJobs(snapshot(normalized), {}, now).total, 0);
  assert.ok(!normalized.evidence.some(item => item.assertion_type === 'scope'));
});

test('candidate USD monthly expectations never become employer compensation or pay matches', () => {
  const normalized = normalize({ location: 'Remote — Argentina', questions: [countryQuestion, expectationQuestion] });
  const state = snapshot(normalized);
  assert.equal(searchJobs(state, {}, now).total, 1);
  assert.deepEqual(normalized.jobs[0].compensation, []);
  assert.equal(normalized.jobs[0].compensation_enrichment_status, 'not_requested');
  assert.ok(!normalized.evidence.some(item => item.assertion_type === 'compensation'));
  assert.equal(searchJobs(state, { pay }, now).total, 0);
  assert.doesNotMatch(JSON.stringify(normalized), /salary_expectation|6000|expected monthly/);
});

test('salary expectation prose is unsupported and cannot satisfy pay filtering', () => {
  const normalized = normalize({ location: 'Remote — Argentina', content: 'What is your expected monthly salary in USD? My expectation is USD 6000 per month.' });
  assert.equal(normalized.jobs[0].eligibility.status, 'unknown');
  assert.deepEqual(normalized.jobs[0].compensation, []);
  assert.equal(searchJobs(snapshot(normalized), { eligibility: ['unknown'], pay }, now).total, 0);
});

test('explicit employer pay remains filterable independently of application questions', () => {
  const normalized = normalize({ location: 'Remote — Argentina', questions: [expectationQuestion], details: {
    101: { status: 'success', id: 101, pay_input_ranges: [{ min_cents: 500000, max_cents: 700000,
      currency_type: 'USD', title: 'Argentina monthly gross base salary' }] },
  } });
  assert.equal(normalized.jobs[0].compensation[0].source_kind, 'employer');
  assert.equal(normalized.jobs[0].compensation[0].min, 5000);
  assert.equal(searchJobs(snapshot(normalized), { pay }, now).total, 1);
});
