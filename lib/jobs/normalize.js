import { z } from 'zod';
import { SourceSchema, CompanySchema, JobSchema, EvidenceSchema, SafeUrlSchema } from './schema.js';
import { hash, stableJobId } from './registry.js';
import { normalizeLocation } from './geography.js';
import { evaluateEligibility, summarizeEligibility, classifyRole } from './eligibility.js';
const RawJob=z.object({id:z.number().int().positive(),
    title:z.string().min(1).max(200),absolute_url:z.string(),location:z.object({name:z.string().max(300)}),updated_at:z.string().optional(),content:z.string().optional()});
export function normalizeGreenhouse(payload,{source,company,observed_at}) {
 source=SourceSchema.parse(source); company=CompanySchema.parse(company);
 if(source.company_id!==company.company_id) throw new Error('COMPANY_SOURCE_MISMATCH');
 const raw=z.object({jobs:z.array(RawJob)}).parse(payload);
  const evidence=[];
  const seen=new Set();
 const jobs=raw.jobs.map(item=>{
  const external_id=String(item.id);
  if(seen.has(external_id)) throw new Error('DUPLICATE_POSTING_ID');
  seen.add(external_id);
  const url=SafeUrlSchema.parse(item.absolute_url);
  if(new URL(url).pathname !== `/${source.board}/jobs/${external_id}`) throw new Error('POSTING_URL_IDENTITY_MISMATCH');
  if(!source.allowed_hosts.includes(new URL(url).hostname)) throw new Error('UNAPPROVED_POSTING_HOST');
  const job_id=stableJobId(source,external_id);
  const evidence_id=`ev_${hash([job_id,item.location.name]).slice(0,24)}`;
  evidence.push(EvidenceSchema.parse({evidence_id,source_url:url,field_path:'location.name',observed_at,
    content_hash:hash(item.location.name),assertion_type:'location',
    scope:job_id}));
  const location=normalizeLocation(item.location.name,null,[evidence_id]);
  const text=item.location.name;
  const workplace=/\b(remote|remoto)\b/i.test(text)?'remote':/h[ií]brid/i.test(text)?'hybrid':location.country?'onsite':'unknown';
  const scope=location.country==='AR'?'AR':/LATAM/i.test(text)?'LATAM':/South America|Sudam[eé]rica/i.test(text)?'South America':/Americas/i.test(text)?'Americas':/worldwide|global/i.test(text)?'worldwide':'unknown';
  // V0 recognizes only complete, bounded location forms. Mixed options, negations
  // and explanatory text require review rather than substring confirmation.
  const recognizedLocation = /^(?:(?:remote|remoto)\s*(?:[—–-]\s*|desde\s+)?(?:Argentina|LATAM|South America|Sudamérica|Americas|worldwide|global)|worldwide remote|remote|(?:Buenos Aires|CABA|Córdoba), Argentina|(?:Remote\s*[—–-]\s*)?(?:US only|Brazil only)|LATAM \(Mexico and Colombia only\)|Worldwide except Argentina)$/i.test(text.trim());
  // A title can contain hiring restrictions too. V0 accepts only reviewed plain
  // role titles; qualifiers require evidence review rather than country guessing.
  const recognizedTitle = /^(?:(?:senior|junior|staff|principal|lead)\s+)?(?:software engineer|software developer|backend engineer|frontend engineer|full stack engineer|data engineer|data scientist|machine learning engineer|qa engineer|test engineer|security engineer|platform engineer|solutions engineer|devops engineer|sre|product manager|product designer|ux designer|technical support engineer|technical architect|recruiter)$/i.test(item.title.trim());
  const unsupportedContent = !recognizedLocation || !recognizedTitle || Boolean(item.content?.trim());
  const option = {
    option_id:`${job_id}_0`,
    locations:[location],workplace,scope,
    allowed_countries:location.country?[location.country]:[],
    excluded_countries:/except Argentina|excluye Argentina/i.test(text)?['AR']:[],
    exhaustive_countries:/\bonly\b|solamente/i.test(text),
    mandatory_foreign_residence:false,
    conflicting_evidence:unsupportedContent,
    restrictions:[],
    evidence_refs:[evidence_id],
    compensation_refs:[]};
  option.eligibility=evaluateEligibility(option,{now:observed_at});
  return JobSchema.parse({
    job_id,
    company_id:company.company_id,
    source_id:source.source_id,external_id,
    identity:{ats:source.ats,region:source.region,board:source.board,external_id},
    title:item.title,url,
    apply_url:url,
    locations:[location],
    location_options:[option],
    employment_relationship:'unknown',
    schedule_type:'unknown',...(recognizedTitle ? classifyRole(item.title) : { roles: [], role_scope: 'unknown' }),
    seniority:null,
    eligibility:summarizeEligibility([option]),
    compensation:[],
    posted_at:null,
    posted_at_provenance:null,
    first_seen_at:null,
    last_inventory_seen_at:null,
    last_attempted_at:null,
    last_eligibility_verified_at:observed_at,
    content_hash:hash({title:item.title,location:item.location.name}),
    status:'open',
    missing_since:null,
    missing_complete_runs:0,
    closed_at:null,
    reopened_at:null,
    eligibility_evidence_complete:!unsupportedContent,
    compensation_enrichment_status:'not_requested'});
 });
 return {jobs,evidence};
}
