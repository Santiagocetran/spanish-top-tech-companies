import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeCompensation } from '../../lib/jobs/compensation-normalize.js';
import { matchCompensation } from '../../lib/jobs/compensation.js';
const cases=JSON.parse(readFileSync(new URL('../fixtures/ar/pay-cases.json',import.meta.url))).cases;
const context={job_id:'synthetic_job',option_id:'ar_option',source_url:'https://boards.greenhouse.io/synthetic/jobs/101',observed_at:'2026-11-16T00:00:00.000Z'};
const normalize=raw=>normalizeCompensation(raw,context);
test('native pay tiers preserve scopes, exact explicit semantics and amounts',()=>{
 const result=normalize(cases.multiple_scopes); assert.equal(result.status,'success'); assert.equal(result.ranges.length,3); assert.equal(result.evidence.length,3);
 const [us,ar,bonus]=result.ranges; assert.equal(us.min,100000); assert.equal(us.geographic_scope,'other'); assert.equal(us.argentina_applicable,false);
 assert.equal(ar.min,4000); assert.equal(ar.max,6000); assert.equal(ar.period,'month'); assert.equal(ar.currency,'USD'); assert.equal(ar.employment_scope,'contractor'); assert.equal(ar.basis,'gross'); assert.equal(ar.component,'base'); assert.equal(ar.argentina_applicable,true);
 assert.equal(bonus.min,null); assert.equal(bonus.max,2000); assert.equal(bonus.component,'bonus'); assert.equal(bonus.employment_scope,'unknown');
 assert.deepEqual(ar.option_ids,['ar_option']); assert.equal(ar.evidence_refs[0],result.evidence[1].evidence_id); assert.equal(result.evidence[1].scope,context.job_id); assert.equal(result.evidence[1].field_path,'pay_input_ranges[1]');
 const filter={currency:'USD',period:'month',min_amount:4000}; assert.equal(matchCompensation(ar,filter,'ar_option',{now:context.observed_at}),true); assert.equal(matchCompensation(us,{...filter,period:'year'},'ar_option',{now:context.observed_at}),false);
 assert.equal(matchCompensation(ar,filter,'different_option',{now:context.observed_at}),false);
});
test('unknowns never acquire currency, period, basis or eligibility from vague title',()=>{
 const [range]=normalize(cases.unknown_semantics).ranges;
 for(const key of ['currency','period']) assert.equal(range[key],null);
 for(const key of ['basis','component','employment_scope','geographic_scope']) assert.equal(range[key],'unknown');
 assert.equal(range.argentina_applicable,false); assert.equal(normalize(cases.unsupported_currency).ranges[0].currency,null);
 for(const title of ['Salary','Argentina salary','$100000 yearly gross worldwide','Argentina annual base salary','US band','Argentina annual gross base salary except Argentina']) {
  const [r]=normalize({status:'success',pay_input_ranges:[{min_cents:100,title}]}).ranges; assert.equal(r.argentina_applicable,false); assert.equal(r.period,null);
 }
 const [explicit]=normalize({status:'success',pay_input_ranges:[{title:'Worldwide hourly net base salary'}]}).ranges;
 assert.equal(explicit.argentina_applicable,true); assert.equal(explicit.currency,null); assert.equal(explicit.period,'hour'); assert.equal(explicit.basis,'net'); assert.equal(explicit.min,null); assert.equal(explicit.max,null);
});
test('optional malformed/failure/empty responses remain distinct and bounded',()=>{
 assert.deepEqual(normalize(undefined),{ranges:[],evidence:[],status:'not_requested'});
 for(const name of ['failed','invalid_negative','invalid_reversed','invalid_numeric_string','invalid_payload']) assert.deepEqual(normalize(cases[name]),{ranges:[],evidence:[],status:'failed'});
 assert.deepEqual(normalize(cases.empty),{ranges:[],evidence:[],status:'success'});
 for(const raw of [null,false,0,{status:'success',pay_input_ranges:[{min_cents:0.5}]},{status:'success',pay_input_ranges:[{min_cents:Number.MAX_SAFE_INTEGER+1}]},{status:'success',pay_input_ranges:[{min_cents:Infinity}]},{status:'failed',error:'private person'},{status:'success',pay_input_ranges:[{title:'x'.repeat(201)}]},{status:'success',pay_input_ranges:[{annotations:{argentina_applicable:true}}]}]) assert.equal(normalize(raw).status,'failed');
 assert.deepEqual(normalize(cases.multiple_scopes),normalize(cases.multiple_scopes));
 const json=JSON.stringify(normalize({status:'success',pay_input_ranges:[{title:'private-canary@example.com',min_cents:100}]})); assert.equal(json.includes('private-canary'),false);
});
test('optional outage carries pay only across unchanged material option context', async () => {
  const { normalizeGreenhouse } = await import('../../lib/jobs/normalize.js');
  const { reconcileSnapshot } = await import('../../lib/jobs/lifecycle.js');
  const { searchJobs } = await import('../../lib/jobs/search.js');
  const { SCHEMA_VERSION, RULES_VERSION } = await import('../../lib/jobs/schema.js');
  const load = name => JSON.parse(readFileSync(new URL(`../fixtures/ar/${name}.json`, import.meta.url)));
  const registry = load('registry');
  const raw = load('greenhouse'); raw.jobs = [raw.jobs[0]];
  const apply = (previous, detail, time, id, mutate = job => job) => {
    const normalized = normalizeGreenhouse(raw, { source: registry.sources[0], company: registry.companies[0], observed_at: time, details: { '101': detail } });
    return reconcileSnapshot(previous, { run_id: id, observed_at: time, sources: [{ source_id: registry.sources[0].source_id, inventory_plan_hash: 'p', inventory_complete: true, status: 'complete', truncated: false, coverage_scope: 'full_board', jobs: normalized.jobs.map(mutate) }] }, { sources: registry.sources, metadata: { dataset_kind: 'synthetic', schema_version: SCHEMA_VERSION, rules_version: RULES_VERSION, generation_id: id, producer_code_sha: '0'.repeat(40), registry_hash: '0'.repeat(64), removal_policy_version: 'v1', evidence: normalized.evidence } });
  };
  const now = context.observed_at;
  const good = apply(null, { status: 'success', pay_input_ranges: [{ min_cents: 5000000, currency_type: 'USD', title: 'Argentina annual gross base salary' }] }, now, 'carry_good');
  const later = '2026-11-16T01:00:00.000Z';
  const failed = apply(good, { status: 'failed' }, later, 'carry_failed');
  const pay = { currency: 'USD', period: 'year', min_amount: 50000 };
  assert.equal(searchJobs(failed, { pay }, later).total, 1);
  assert.equal(failed.jobs[0].compensation[0].verified_at, now);
  for (const [id, mutate] of [
    ['changed_hash', job => ({ ...job, content_hash: 'f'.repeat(64) })],
    ['changed_option', job => ({ ...job, location_options: job.location_options.map(option => ({ ...option, workplace: 'hybrid' })) })],
  ]) {
    const changed = apply(good, { status: 'failed' }, later, id, mutate);
    assert.equal(changed.jobs[0].compensation.length, 0);
    assert.deepEqual(changed.jobs[0].location_options[0].compensation_refs, []);
    assert.equal(searchJobs(changed, { pay }, later).total, 0);
  }
});
