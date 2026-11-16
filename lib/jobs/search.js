import { PayFilterSchema, matchCompensation } from './compensation.js';
import { validateSnapshot } from './snapshot.js';
import { effectiveJobState } from './lifecycle.js';
const keys = new Set(['text','company_id','roles','seniority','workplace','province','city','eligibility','employment_relationship','pay','include_stale','exclude_ids','limit']);
const list = v => v === undefined ? [] : Array.isArray(v) ? v : [v];
const matches = (value, filter) => !list(filter).length || list(filter).includes(value);
function queryCheck(query) {
  if (!query || typeof query!=='object' || Array.isArray(query) || Object.keys(query).some(k=>!keys.has(k))) throw new Error('INVALID_QUERY');
  if(query.text !== undefined && typeof query.text!=='string') throw new Error('INVALID_QUERY');
  for(const [key,allowed] of Object.entries({workplace:['remote','hybrid','onsite','unknown'],eligibility:['confirmed','likely','unknown'],employment_relationship:['employee','contractor','unknown']})) if(list(query[key]).some(v=>!allowed.includes(v))) throw new Error('INVALID_QUERY');
  if (query.include_stale !== undefined && typeof query.include_stale!=='boolean') throw new Error('INVALID_QUERY');
  if (!Number.isInteger(query.limit ?? 100) || (query.limit ?? 100)<1 || (query.limit ?? 100)>100 || list(query.exclude_ids).length>100 || (query.text?.length ?? 0)>200) throw new Error('INVALID_QUERY');
  for (const key of ['company_id','roles','seniority','workplace','province','city','eligibility','employment_relationship','exclude_ids']) if (list(query[key]).some(v=>typeof v!=='string'||v.length>200)) throw new Error('INVALID_QUERY');
  if (query.pay !== undefined) {
    PayFilterSchema.parse(query.pay);
  }
}
function eligibleOptions(job, query, now, policy) {
  return (job.location_options ?? []).flatMap(option=>{
    if (!list(query.eligibility ?? ['confirmed','likely']).includes(option.eligibility?.status) || !matches(option.eligibility.status,query.eligibility) || !matches(option.workplace,query.workplace)) return [];
    if (query.city || query.province) {
      if (!(option.locations ?? []).some(location=>location.country==='AR' && matches(location.city,query.city) && matches(location.province,query.province))) return [];
    }
    let ranges=[];
    if (query.pay) {
      const p=query.pay;
      ranges=(job.compensation ?? []).filter(range=>option.compensation_refs?.includes(range.range_id) && (job.employment_relationship==='unknown' || range.employment_scope===job.employment_relationship) && (!query.employment_relationship || list(query.employment_relationship).includes(range.employment_scope)) && matchCompensation(range,p,option.option_id,{now,employment_relationship:job.employment_relationship}));
      if (!ranges.length) return [];
    }
    return [{option_id:option.option_id,compensation_refs:ranges.map(r=>r.compensation_id ?? r.range_id)}];
  });
}
export function searchJobs(snapshot, query = {}, now = new Date().toISOString()) {
  queryCheck(query);
  validateSnapshot(snapshot);
  const results=[]; let excluded_unknown=0; let excluded_unknown_pay=0; let excluded_unknown_role=0;
  for (const job of snapshot.jobs) {
    const state=effectiveJobState(job,now,snapshot.freshness_policy);
    if (job.role_scope!=='in_scope') { if(job.role_scope==='unknown') excluded_unknown_role++; continue; }
    if (!(state==='open'||query.include_stale&&state==='stale') || list(query.exclude_ids).includes(job.job_id) || !matches(job.company_id,query.company_id) || !matches(job.seniority ?? 'unknown',query.seniority) || !matches(job.employment_relationship,query.employment_relationship)) continue;
    if (list(query.roles).length && !job.roles?.some(role=>list(query.roles).includes(role))) continue;
    if (query.text && !`${job.title} ${job.company_id}`.toLocaleLowerCase().includes(query.text.toLocaleLowerCase())) continue;
    const matched_options=eligibleOptions(job,query,now,snapshot.freshness_policy);
    if (!matched_options.length) {
      if (!list(query.eligibility ?? ['confirmed', 'likely']).includes('unknown')
        && eligibleOptions(job, { ...query, eligibility: ['unknown'] }, now, snapshot.freshness_policy).length) excluded_unknown++;
      if (query.pay && eligibleOptions(job, { ...query, pay: undefined }, now, snapshot.freshness_policy).length
        && !eligibleOptions(job, { ...query, pay: { ...query.pay, min_amount: 0 } }, now, snapshot.freshness_policy).length) excluded_unknown_pay++;
      continue;
    }
    const evidence_refs=new Set([...(job.eligibility?.evidence_refs ?? []),...job.location_options.flatMap(o=>o.evidence_refs ?? []),...(job.compensation ?? []).flatMap(r=>r.evidence_refs ?? [])]);
    results.push({...job,effective_status:state,matched_options,evidence:(snapshot.evidence ?? []).filter(e=>evidence_refs.has(e.evidence_id))});
  }
  const certainty=j=>Math.min(...j.matched_options.map(m=>({confirmed:0,likely:1,unknown:2})[j.location_options.find(o=>o.option_id===m.option_id).eligibility.status]));
  const relevance=j=>query.text ? (j.title.toLowerCase()===query.text.toLowerCase()?0:j.title.toLowerCase().startsWith(query.text.toLowerCase())?1:2) : 0;
  results.sort((a,b)=>relevance(a)-relevance(b)||certainty(a)-certainty(b)||(a.effective_status==='open'?0:1)-(b.effective_status==='open'?0:1)||(Date.parse(b.last_eligibility_verified_at)||0)-(Date.parse(a.last_eligibility_verified_at)||0)||a.job_id.localeCompare(b.job_id));
  if(results.length>(query.limit ?? 100)) throw new Error('QUERY_TOO_BROAD');
  const counts={company:{},eligibility:{},workplace:{}};
  for(const job of results) {
    counts.company[job.company_id]=(counts.company[job.company_id]??0)+1;
    for(const key of ['eligibility','workplace']) for(const value of new Set(job.matched_options.map(match=>{const option=job.location_options.find(o=>o.option_id===match.option_id); return key==='eligibility'?option.eligibility.status:option.workplace;}))) counts[key][value]=(counts[key][value]??0)+1;
  }
  return {generation_id:snapshot.generation_id,as_of:now,applied_filters:{include_stale:false,eligibility:['confirmed','likely'],limit:100,...structuredClone(query),...(query.pay?{pay:PayFilterSchema.parse(query.pay)}:{})},results,total:results.length,returned:results.length,has_more:false,counts,excluded_unknown,excluded_unknown_pay,excluded_unknown_role};
}
export function getJob(snapshot,id,now=new Date().toISOString()) {
  validateSnapshot(snapshot);
  const job=snapshot.jobs.find(job=>job.job_id===id&&job.status!=='removed');
  if(!job) return null;
  const effective_status=effectiveJobState(job,now,snapshot.freshness_policy);
  const recommended=effective_status==='open' && job.role_scope==='in_scope' && eligibleOptions(job,{},now,snapshot.freshness_policy).length>0;
  return {...structuredClone(job),evidence:snapshot.evidence.filter(e=>e.scope===job.job_id),effective_status,recommended};
}
