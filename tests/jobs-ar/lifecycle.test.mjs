import { RULES_VERSION } from '../../lib/jobs/schema.js';
import {readFileSync} from 'node:fs';
import {normalizeGreenhouse} from '../../lib/jobs/normalize.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveJobState,isPayFresh,reconcileSnapshot} from '../../lib/jobs/lifecycle.js';
const t='2026-11-01T00:00:00.000Z';
const at=h=>new Date(Date.parse(t)+h*3600000).toISOString();
const fixture=n=>JSON.parse(readFileSync(new URL(`../fixtures/ar/${n}.json`,import.meta.url)));
const registry=fixture('registry'), sources=registry.sources;
const normalized=normalizeGreenhouse(fixture('greenhouse'),{source:sources[0],company:registry.companies[0],observed_at:t});
const job=normalized.jobs[0];
const run=(id,h,jobs=[],extra={})=>({run_id:id,observed_at:at(h),sources:[{source_id:sources[0].source_id,inventory_plan_hash:'p',inventory_complete:true,status:'complete',truncated:false,coverage_scope:'full_board',jobs,...extra}]});
const metadata={dataset_kind:'synthetic',schema_version:'ar-v0-1',rules_version:RULES_VERSION,producer_code_sha:'0'.repeat(40),registry_hash:'0'.repeat(64),removal_policy_version:'v1',evidence:normalized.evidence};
const apply=(prev,r)=>reconcileSnapshot(prev,r,{sources,metadata:{...metadata,generation_id:r.run_id}});
test('strict fake-time eligibility and independent pay boundaries',()=>{
 assert.equal(effectiveJobState(job,at(48-0.001)),'open'); assert.equal(effectiveJobState(job,at(48)),'stale'); assert.equal(effectiveJobState(job,at(168-0.001)),'stale'); assert.equal(effectiveJobState(job,at(168)),'expired_unverified');
 assert.equal(effectiveJobState({...job,last_eligibility_verified_at:at(1)},t),'stale'); assert.equal(effectiveJobState({...job,last_eligibility_verified_at:null,first_seen_at:t},at(168)),'expired_unverified');
 assert.equal(isPayFresh({verified_at:t},at(48-0.001)),true); assert.equal(isPayFresh({verified_at:t},at(48)),false);
});
test('complete absence, replay, 24h closure, reopening and source removal',()=>{
 let state=apply(null,run('a',0,[job])); const first=state.jobs[0].first_seen_at;
 state=apply(state,run('b',1)); assert.equal(state.jobs[0].status,'missing');
 assert.deepEqual(apply(state,run('b',1)),state);
 assert.throws(()=>apply(state,run('b',1,[job])),/RUN_ID_REUSED/);
 state=apply(state,run('c',24)); assert.equal(state.jobs[0].status,'missing');
 state=apply(state,run('d',25)); assert.equal(state.jobs[0].status,'closed');
 state=apply(state,run('e',26,[job])); assert.equal(state.jobs[0].status,'open'); assert.equal(state.jobs[0].first_seen_at,first); assert.equal(state.jobs[0].reopened_at,at(26));
 assert.equal(reconcileSnapshot(state,run('e',26,[job]),{sources:[{...sources[0],enabled:false}]}).jobs.length,0);
 assert.throws(()=>apply(state,run('old',25)),/OUT_OF_ORDER/);
});
test('plan changes, partial runs, required failures and optional pay failure',()=>{
 let state=apply(null,run('a',0,[{...job,compensation:[]}]));
 state=apply(state,run('b',1,[],{inventory_complete:false})); assert.equal(state.jobs[0].missing_complete_runs,0);
 state=apply(state,run('c',2)); state=apply(state,run('d',26,[],{inventory_plan_hash:'new'})); assert.equal(state.jobs[0].missing_complete_runs,0);
 state=apply(state,run('e',27,[{...job,eligibility_evidence_complete:false}],{inventory_plan_hash:'new'})); assert.equal(state.jobs[0].last_eligibility_verified_at,t); assert.equal(state.jobs[0].status,'stale');
 state=apply(state,run('f',28,[{...job,compensation_enrichment_status:'failed'}],{inventory_plan_hash:'new'})); assert.equal(state.jobs[0].status,'open'); assert.equal(state.jobs[0].compensation.length,0);
 assert.throws(()=>apply(state,run('g',29,[],{status:'partial'})),/INVALID_COMPLETENESS/);
});
test('strict persistence and evidence survive failed/empty inventories, removals prune content',async()=>{
 const {mkdtemp,rm,readFile}=await import('node:fs/promises'); const {tmpdir}=await import('node:os'); const {join}=await import('node:path'); const {writeSnapshot,readSnapshot}=await import('../../lib/jobs/snapshot.js');
 let state=apply(null,run('persist',0,[job])); state=reconcileSnapshot(state,run('failed',1,[],{inventory_complete:false}),{sources,metadata:{...metadata,evidence:[],generation_id:'failed'}});
 assert.equal(state.evidence.length,1); const dir=await mkdtemp(join(tmpdir(),'ar-test-'));
 try { const path=join(dir,'snapshot.json'); await writeSnapshot(path,state); assert.deepEqual(await readSnapshot(path),state); await assert.rejects(writeSnapshot(path,{...state,target_country:'ES'})); assert.deepEqual(JSON.parse(await readFile(path,'utf8')),state); } finally {await rm(dir,{recursive:true,force:true});}
 const removed=reconcileSnapshot(state,{run_id:'removed',observed_at:at(2),sources:[]},{sources:[],metadata:{...metadata,evidence:[],generation_id:'removed'}});
 assert.equal(removed.jobs.length,0); assert.equal(removed.evidence.length,0);
});

test('complete inventory separates observed required failure, absent IDs and optional pay failure', () => {
  const second = normalized.jobs.find(j => j.external_id === '105');
  let state = apply(null, run('three-a', 0, [job, second]));
  state = apply(state, run('three-b', 1, [], { observed_ids: [job.job_id] }));
  const observed = state.jobs.find(j => j.job_id === job.job_id);
  const absent = state.jobs.find(j => j.job_id === second.job_id);
  assert.equal(observed.status, 'stale');
  assert.equal(observed.last_eligibility_verified_at, t);
  assert.equal(observed.missing_complete_runs, 0);
  assert.equal(absent.status, 'missing');
  assert.equal(absent.missing_complete_runs, 1);
  state = apply(state, run('three-c', 25, [{ ...job, compensation_enrichment_status: 'failed' }]));
  assert.equal(state.jobs.find(j => j.job_id === job.job_id).status, 'open');
  assert.equal(state.jobs.find(j => j.job_id === second.job_id).status, 'closed');
});
test('explicit failed observations quarantine unseen IDs and preserve absence safety', () => {
  const unseen = `job_${'a'.repeat(32)}`;
  let state = apply(null, run('failure-initial', 0, [job]));
  const mixed = run('failure-mixed', 1, [], {
    observed_ids: [unseen], required_evidence_failures: [unseen],
  });
  state = apply(state, mixed);
  assert.equal(state.jobs.length, 1);
  assert.equal(state.jobs[0].status, 'missing');
  assert.equal(state.jobs[0].missing_complete_runs, 1);
  state = apply(state, run('failure-prior', 25, [], {
    observed_ids: [job.job_id], required_evidence_failures: [job.job_id],
  }));
  assert.equal(state.jobs[0].status, 'stale');
  assert.equal(state.jobs[0].missing_complete_runs, 0);
  assert.equal(state.jobs[0].last_eligibility_verified_at, t);
  for (const extra of [
    { observed_ids: [unseen] },
    { observed_ids: [], required_evidence_failures: [unseen] },
    { observed_ids: [unseen, unseen], required_evidence_failures: [unseen] },
    { observed_ids: [unseen], required_evidence_failures: [unseen, unseen] },
    { observed_ids: ['invalid'], required_evidence_failures: ['invalid'] },
  ]) assert.throws(() => apply(state, run('failure-invalid', 26, [], extra)));
});
