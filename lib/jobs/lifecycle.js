import { z } from 'zod';
import { JobSchema, validateSnapshot } from './schema.js';
import { createHash } from 'node:crypto';
const RunSourceSchema=z.object({source_id:z.string().min(1),inventory_plan_hash:z.string().min(1),inventory_complete:z.boolean(),status:z.enum(['complete','partial','throttled','blocked','invalid_payload','failed']),truncated:z.boolean(),coverage_scope:z.literal('full_board'),jobs:z.array(JobSchema),observed_ids:z.array(z.string()).optional(),explicitly_closed_ids:z.array(z.string()).optional()});
const HOUR = 3600000;
export const FRESHNESS_POLICY = Object.freeze({ fresh_for_hours: 48, unverified_retention_days: 7 });
export function timestamp(value) { const n = typeof value === 'string' ? Date.parse(value) : NaN; return Number.isFinite(n) ? n : null; }
export function effectiveJobState(job, now = new Date().toISOString(), policy = FRESHNESS_POLICY) {
  const current = timestamp(now); if (current === null) throw new Error('INVALID_NOW');
  if (['removed','disabled','closed','missing','expired_unverified'].includes(job.status)) return job.status;
  const verified = timestamp(job.last_eligibility_verified_at);
  if (verified === null || verified > current) { const first=timestamp(job.first_seen_at); return first !== null && first <= current && current-first >= policy.unverified_retention_days*24*HOUR ? 'expired_unverified' : 'stale'; }
  const age = current - verified;
  if (age >= policy.unverified_retention_days * 24 * HOUR) return 'expired_unverified';
  if (job.status === 'stale' || job.eligibility_evidence_complete === false || age >= policy.fresh_for_hours * HOUR) return 'stale';
  return 'open';
}
export function isPayFresh(range, now, policy = FRESHNESS_POLICY) {
  const at = timestamp(range.verified_at ?? range.last_verified_at), current = timestamp(now);
  return at !== null && current !== null && at <= current && current - at < policy.fresh_for_hours * HOUR;
}
export function reconcileSnapshot(previous, run, { sources = [], metadata = {} } = {}) {
  if(previous) validateSnapshot(previous);
  const current = timestamp(run.observed_at);
  if (!run.run_id || current === null) throw new Error('INVALID_RUN');
  const runHash=createHash('sha256').update(JSON.stringify(run)).digest('hex');
  if (previous?.applied_run_ids?.includes(run.run_id)) {
    if(previous.run_hashes?.[run.run_id] && previous.run_hashes[run.run_id]!==runHash) throw new Error('RUN_ID_REUSED');
    const retained=previous.jobs.filter(j=>sources.find(s=>s.source_id===j.source_id)?.enabled===true);
    const retainedIds=new Set(retained.map(j=>j.job_id));
    return validateSnapshot({...structuredClone(previous),jobs:retained,evidence:previous.evidence.filter(e=>retainedIds.has(e.scope))});
  }
  if (previous && current < timestamp(previous.generated_at)) throw new Error('OUT_OF_ORDER_RUN');
  const jobs = new Map((previous?.jobs ?? []).map(j => [j.job_id, structuredClone(j)]));
  const source_state = structuredClone(previous?.source_state ?? {});
  const registry = new Map(sources.map(s => [s.source_id,s]));
  const seenSources = new Set();
  for (const result of run.sources ?? []) {
    RunSourceSchema.parse(result);
    if (seenSources.has(result.source_id)) throw new Error('DUPLICATE_SOURCE_RESULT'); seenSources.add(result.source_id);
    if (!registry.has(result.source_id)) throw new Error('UNKNOWN_SOURCE');
    if (registry.get(result.source_id)?.enabled === false) continue;
    if (result.inventory_complete && (result.status && result.status!=='complete' || result.truncated || result.coverage_scope && result.coverage_scope!=='full_board')) throw new Error('INVALID_COMPLETENESS');
    const old = source_state[result.source_id];
    const plan = result.inventory_plan_hash;
    const comparable = Boolean(plan && (!old || old.inventory_plan_hash === plan));
    const observed = new Set(result.observed_ids ?? []);
    for (const incoming of result.jobs ?? []) {
      JobSchema.parse(incoming);
      const source=registry.get(result.source_id);
      if(incoming.company_id!==source.company_id || incoming.identity.ats!==source.ats || incoming.identity.region!==source.region || incoming.identity.board!==source.board) throw new Error('JOB_SOURCE_MISMATCH');
      if(timestamp(incoming.last_eligibility_verified_at)>current || timestamp(incoming.eligibility.evaluated_at)>current || incoming.compensation.some(r=>timestamp(r.verified_at)>current)) throw new Error('FUTURE_JOB_TIMESTAMP');
      if (incoming.source_id !== result.source_id || !incoming.job_id || observed.has(`job:${incoming.job_id}`)) throw new Error('INVALID_RUN_JOB');
      observed.add(`job:${incoming.job_id}`); observed.add(incoming.job_id);
      const prior = jobs.get(incoming.job_id);
      const complete = incoming.eligibility_evidence_complete === true;
      const job = complete || !prior ? structuredClone(incoming) : structuredClone(prior);
      Object.assign(job, { first_seen_at: prior?.first_seen_at ?? run.observed_at, last_inventory_seen_at: run.observed_at, last_attempted_at: run.observed_at, eligibility_evidence_complete: complete, status: complete ? 'open' : 'stale', missing_since: null, missing_complete_runs: 0, closed_at: null });
      if (complete) job.last_eligibility_verified_at = incoming.last_eligibility_verified_at ?? incoming.eligibility.evaluated_at;
      else job.last_eligibility_verified_at = prior?.last_eligibility_verified_at ?? null;
      if (prior && ['missing','closed','expired_unverified'].includes(prior.status)) job.reopened_at = run.observed_at;
      if (incoming.compensation_enrichment_status === 'failed' && prior) job.compensation = structuredClone(prior.compensation ?? []);
      job.compensation_enrichment_status = incoming.compensation_enrichment_status ?? 'unknown';
      jobs.set(job.job_id,job);
    }
    for(const id of result.observed_ids ?? []) if(!jobs.has(id)) throw new Error('OBSERVED_ID_REQUIRES_MINIMAL_JOB');
    for (const job of jobs.values()) {
      if (job.source_id !== result.source_id) continue;
      job.last_attempted_at = run.observed_at;
      if (result.explicitly_closed_ids?.includes(job.job_id)) { job.status='closed'; job.closed_at=run.observed_at; job.closure_reason='explicit_source_closure'; continue; }
      if (observed.has(job.job_id)) {
        if (!observed.has(`job:${job.job_id}`)) { job.status='stale'; job.eligibility_evidence_complete=false; job.last_inventory_seen_at=run.observed_at; job.missing_since=null; job.missing_complete_runs=0; job.closed_at=null; }
        continue;
      }
      if (result.inventory_complete && comparable && job.status !== 'closed') {
        job.missing_since ??= run.observed_at;
        job.missing_complete_runs = (job.missing_complete_runs ?? 0) + 1;
        job.status='missing';
        if (job.missing_complete_runs >= 2 && current-timestamp(job.missing_since) >= 24*HOUR) { job.status='closed'; job.closed_at=run.observed_at; job.closure_reason='absent_from_complete_inventory'; }
      } else if (job.status === 'open') job.status='stale';
      if (!comparable && job.status === 'missing') { job.status='stale'; job.missing_since=null; job.missing_complete_runs=0; }
    }
    source_state[result.source_id] = { inventory_plan_hash: plan ?? null, last_run_id: run.run_id, last_attempted_at: run.observed_at, inventory_complete: Boolean(result.inventory_complete) };
  }
  for (const [id,job] of jobs) {
    if (registry.get(job.source_id)?.enabled !== true) { jobs.delete(id); continue; }
    if (effectiveJobState(job,run.observed_at) === 'expired_unverified') job.status='expired_unverified';
    const verified = timestamp(job.last_eligibility_verified_at);
    const expiryBase = verified ?? timestamp(job.first_seen_at);
    job.evidence_valid_until = verified === null ? null : new Date(verified + 48 * HOUR).toISOString();
    job.unverified_expires_at = expiryBase === null ? null : new Date(expiryBase + 7 * 24 * HOUR).toISOString();
  }
  const evidenceMap=new Map([...(previous?.evidence ?? []),...(metadata.evidence ?? [])].map(e=>[e.evidence_id,e]));
  const retainedRefs=new Set([...jobs.values()].flatMap(j=>[...(j.eligibility?.evidence_refs ?? []),...(j.locations ?? []).flatMap(l=>l.evidence_refs ?? []),...(j.location_options ?? []).flatMap(o=>[...(o.evidence_refs ?? []),...(o.eligibility?.evidence_refs ?? []),...(o.locations ?? []).flatMap(l=>l.evidence_refs ?? [])]),...(j.compensation ?? []).flatMap(r=>r.evidence_refs ?? [])]));
  return validateSnapshot({ ...structuredClone(previous ?? {}), ...metadata, evidence:[...evidenceMap.values()].filter(e=>retainedRefs.has(e.evidence_id)), target_country:'AR', generated_at:run.observed_at, freshness_policy: {...FRESHNESS_POLICY}, jobs:[...jobs.values()].sort((a,b)=>a.job_id.localeCompare(b.job_id)), source_state, run_hashes:{...(previous?.run_hashes ?? {}),[run.run_id]:runHash}, applied_run_ids:[...(previous?.applied_run_ids ?? []),run.run_id] });
}
