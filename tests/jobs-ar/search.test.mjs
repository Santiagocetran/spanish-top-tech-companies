import { RULES_VERSION } from '../../lib/jobs/schema.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchJobs,getJob} from '../../lib/jobs/search.js';
import {normalizeGreenhouse} from '../../lib/jobs/normalize.js';
import {reconcileSnapshot} from '../../lib/jobs/lifecycle.js';
const fixture=n=>JSON.parse(readFileSync(new URL(`../fixtures/ar/${n}.json`,import.meta.url)));
const registry=fixture('registry'),now='2026-11-16T00:00:00.000Z';
const normalized=normalizeGreenhouse(fixture('greenhouse'),{source:registry.sources[0],company:registry.companies[0],observed_at:now});
const snapshot=reconcileSnapshot(null,{run_id:'r',observed_at:now,sources:[{source_id:registry.sources[0].source_id,inventory_plan_hash:'p',inventory_complete:true,status:'complete',truncated:false,coverage_scope:'full_board',jobs:normalized.jobs}]},{sources:registry.sources,metadata:{dataset_kind:'synthetic',schema_version:'ar-v0-1',rules_version:RULES_VERSION,generation_id:'g',producer_code_sha:'0'.repeat(40),registry_hash:'0'.repeat(64),removal_policy_version:'v1',evidence:normalized.evidence}});
const job=snapshot.jobs.find(j=>j.external_id==='101');
const one=j=>({...snapshot,jobs:[j]});
test('fixture exact IDs, evidence, applied defaults and honest counts',()=>{
 const r=searchJobs(snapshot,{},now); assert.deepEqual(r.results.map(j=>j.external_id),['101','105']); assert.equal(r.total,2); assert.equal(r.excluded_unknown,1); assert.equal(r.counts.company[job.company_id],2); assert.equal(r.results[0].evidence.length,1); assert.deepEqual(r.applied_filters.eligibility,['confirmed','likely']);
 assert.equal(searchJobs(snapshot,{city:'AR:ROSARIO'},now).total,0);
 assert.equal(searchJobs(snapshot,{workplace:'hybrid'},now).total,0);
});
test('option coherent pay with exact tuple, fresh range and explicit defaults',()=>{
 const ar={...job.location_options[0],option_id:'ar',compensation_refs:['pay']};
 const range={range_id:'pay',min:100,max:200,currency:'USD',period:'year',component:'base',basis:'gross',argentina_applicable:true,geographic_scope:'AR',employment_scope:'unknown',source_kind:'employer',option_ids:['ar'],evidence_refs:[],verified_at:now};
 const s=one({...job,location_options:[ar],compensation:[range]}); const pay={currency:'USD',period:'year',min_amount:100};
 assert.equal(searchJobs(s,{pay},now).total,1); assert.equal(searchJobs(one({...s.jobs[0],employment_relationship:'employee',compensation:[{...range,employment_scope:'contractor'}]}),{pay,employment_relationship:'employee'},now).total,0); assert.equal(searchJobs(s,{pay:{...pay,min_amount:101}},now).total,0); assert.equal(searchJobs(s,{pay:{...pay,min_amount:101,threshold_mode:'range_reaches'}},now).total,1);
 assert.equal(searchJobs(one({...s.jobs[0],location_options:[{...ar,compensation_refs:[]}]}),{pay},now).total,0);
 assert.equal(searchJobs(one({...s.jobs[0],compensation:[{...range,geographic_scope:'other'}]}),{pay},now).total,0);
});
test('freshness, unknown opt-in and strict query/snapshot rejection',()=>{
 const at='2026-11-18T00:00:00.000Z'; assert.equal(searchJobs(snapshot,{},at).total,0); assert.equal(searchJobs(snapshot,{include_stale:true},at).total,2); assert.equal(getJob(snapshot,job.job_id,at).recommended,false);
 const unknown=one({...job,location_options:job.location_options.map(o=>({...o,eligibility:{...o.eligibility,status:'unknown'}}))}); assert.equal(searchJobs(unknown,{},now).total,0); assert.equal(searchJobs(unknown,{eligibility:['unknown']},now).total,1);
 for(const q of [{limit:0},{text:1},{workplace:'space'},{pay:{currency:'XXX',period:'year',min_amount:10}}]) assert.throws(()=>searchJobs(snapshot,q,now));
 assert.throws(()=>searchJobs({...snapshot,schema_version:'old'},{},now)); assert.throws(()=>getJob({...snapshot,target_country:'ES'},job.job_id,now));
});

test('location, workplace and pay filters must match the same option', () => {
  const original = job.location_options[0];
  const ar = { ...original, option_id: 'ar-onsite', workplace: 'onsite', locations: [{ ...original.locations[0], country: 'AR', city: 'AR:CABA', province: 'AR:C' }] };
  const us = { ...original, option_id: 'us-remote', scope: 'other', allowed_countries: ['US'], exhaustive_countries: true, locations: [{ ...original.locations[0], country: 'US', city: 'US:NEW_YORK', province: null }], eligibility: { ...original.eligibility, status: 'ineligible' } };
  const mixed = one({ ...job, location_options: [ar, us] });
  assert.equal(searchJobs(mixed, { workplace: 'remote' }, now).total, 0);
  assert.equal(searchJobs(mixed, { workplace: 'onsite', city: 'AR:CABA' }, now).total, 1);
  assert.equal(searchJobs(mixed, { workplace: 'remote', city: 'AR:CABA' }, now).total, 0);
  const reverse = one({ ...job, location_options: [{ ...ar, workplace: 'remote' }, { ...us, workplace: 'hybrid' }] });
  assert.equal(searchJobs(reverse, { workplace: 'remote' }, now).total, 1);
  assert.equal(searchJobs(reverse, { workplace: 'hybrid' }, now).total, 0);
});

test('malformed pay cannot silently remove a requested compensation filter', () => {
  for (const pay of [null, false, 0, '', {}, { currency: 'USD', min_amount: 1 }]) {
    assert.throws(() => searchJobs(snapshot, { pay }, now));
  }
});
