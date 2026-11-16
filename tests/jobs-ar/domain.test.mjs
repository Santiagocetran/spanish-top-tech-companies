import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeGreenhouse } from '../../lib/jobs/normalize.js';
import { validateRegistry,stableJobId } from '../../lib/jobs/registry.js';
import { normalizeLocation,normalizeCountry,normalizeWorkplace } from '../../lib/jobs/geography.js';
import { evaluateEligibility,classifyRole } from '../../lib/jobs/eligibility.js';
import { matchCompensation } from '../../lib/jobs/compensation.js';
import { JobSchema,SnapshotSchema,SafeUrlSchema } from '../../lib/jobs/schema.js';
const fixture=name=>JSON.parse(readFileSync(new URL(`../fixtures/ar/${name}.json`,import.meta.url)));
const registry=fixture('registry'), source=registry.sources[0], company=registry.companies[0], now='2026-11-16T00:00:00.000Z';
const normalize=(payload=fixture('greenhouse'))=>normalizeGreenhouse(payload,{source,company,observed_at:now});
test('synthetic provider fixture becomes strict canonical jobs and bounded evidence',()=>{const {jobs,evidence}=normalize();assert.equal(jobs[0].eligibility.status,'confirmed');assert.equal(jobs[1].role_scope,'out_of_scope');assert.equal(evidence.length,5);assert.equal(JobSchema.safeParse({...jobs[0],description:'private'}).success,false);assert.equal(SnapshotSchema.safeParse({schema_version:'old',target_country:'ES'}).success,false);});
test('registry and provider identities reject collisions and remain independent of title',()=>{validateRegistry(registry);assert.throws(()=>validateRegistry({...registry,sources:[source,{...source,source_id:'another'}]}));assert.throws(()=>stableJobId(source,''));const raw=fixture('greenhouse');raw.jobs.push(raw.jobs[0]);assert.throws(()=>normalize(raw));assert.equal(stableJobId(source,'101'),stableJobId({...source,source_id:'renamed'},'101'));assert.notEqual(stableJobId(source,'101'),stableJobId({...source,region:'eu'},'101'));});
test('untrusted payloads and URLs cannot cross persistence boundary',()=>{for(const payload of [{},{jobs:null},{jobs:[{id:0}]}])assert.throws(()=>normalize(payload));for(const url of ['http://example.com','https://a.com?token=secret','https://a:b@example.com'])assert.equal(SafeUrlSchema.safeParse(url).success,false);});
test('geography preserves ambiguity and documented provider enum mappings',()=>{assert.equal(normalizeCountry('ARG'),'AR');assert.equal(normalizeLocation('Remote - AR').country,null);assert.equal(normalizeLocation('Córdoba').country,null);assert.equal(normalizeLocation('Córdoba, Spain').city,'ES:CORDOBA');assert.equal(normalizeLocation('Buenos Aires, Argentina').province,null);assert.equal(normalizeLocation('CABA, Argentina').city,'AR:CABA');assert.equal(normalizeWorkplace('on-site'),'onsite');assert.equal(normalizeWorkplace(true),'unknown');assert.equal(classifyRole('Mechanical Engineer').role_scope,'unknown');});
test('option-scoped restrictions defeat broad language; uncertainty remains unknown',()=>{const base=normalize().jobs[0].location_options[0];for(const [patch,status] of [[{scope:'worldwide',excluded_countries:['AR']},'ineligible'],[{scope:'LATAM',allowed_countries:['MX','CO'],exhaustive_countries:true},'ineligible'],[{scope:'LATAM',allowed_countries:[]},'likely'],[{scope:'unknown',allowed_countries:[]},'unknown'],[{conflicting_evidence:true},'unknown'],[{mandatory_foreign_residence:true},'ineligible'],[{workplace:'onsite'},'confirmed']])assert.equal(evaluateEligibility({...base,...patch},{now}).status,status);for(const text of ['remoto desde Argentina','Worldwide except Argentina','LATAM (Mexico and Colombia only)','Remote — not restricted to the US']){const raw=fixture('greenhouse');raw.jobs[0].location.name=text;const status=normalize(raw).jobs[0].eligibility.status;assert.equal(status, text.includes('except')||text.includes('only')?'ineligible':text.includes('Argentina')?'confirmed':'unknown');}});
test('pay matches exact tuple, option, applicability and fresh evidence only',()=>{const range={min:100,max:200,currency:'USD',period:'year',component:'base',basis:'gross',argentina_applicable:true,geographic_scope:'AR',option_ids:['ar_remote'],verified_at:now};const filter={currency:'USD',period:'year',min_amount:100};assert.equal(matchCompensation(range,filter,'ar_remote',{now}),true);for(const patch of [{basis:'unknown'},{currency:null},{argentina_applicable:false},{geographic_scope:'other'},{min:null}])assert.equal(matchCompensation({...range,...patch},filter,'ar_remote',{now}),false);assert.equal(matchCompensation(range,filter,'us_hybrid',{now}),false);assert.equal(matchCompensation(range,filter,'ar_remote',{now:'2026-11-18T00:00:00.000Z'}),false);assert.throws(()=>matchCompensation(range,{...filter,min_amount:Infinity},'ar_remote',{now}));});

test('unparsed descriptions and title restrictions cannot confirm Argentina',()=>{for(const patch of [{content:'US residents only'},{title:'Software Engineer — Madrid weekly attendance'}]){const raw=fixture('greenhouse');Object.assign(raw.jobs[0],patch);const result=normalize(raw).jobs[0];assert.equal(result.eligibility.status,'unknown');assert.equal(result.eligibility_evidence_complete,false);}const raw=fixture('greenhouse');raw.jobs[0].absolute_url='https://boards.greenhouse.io/other/jobs/101';assert.throws(()=>normalize(raw));});

test('unsupported mixed and negated location labels never confirm by substring', () => {
  for (const text of ['Remote - Argentina excluded', 'Remote - Argentina (not eligible)', 'Remote - Argentina; hybrid in New York', 'Argentina except Buenos Aires', 'Not remote - Argentina']) {
    const raw = fixture('greenhouse');
    raw.jobs[0].location.name = text;
    const job = normalize(raw).jobs[0];
    assert.equal(job.eligibility.status, 'unknown', text);
    assert.equal(job.eligibility_evidence_complete, false, text);
  }
});

test('technology role taxonomy includes data QA and security, leaves generic engineering unknown', () => {
  for (const title of ['Data Engineer', 'QA Engineer', 'Security Engineer']) assert.equal(classifyRole(title).role_scope, 'in_scope');
  for (const title of ['Mechanical Engineer', 'Civil Engineer']) assert.equal(classifyRole(title).role_scope, 'unknown');
});

test('unreviewed title qualifiers never confirm eligibility', () => {
  for (const title of [
    'Software Engineer — must reside in USA',
    'Software Engineer — United States residents required',
    'Software Engineer — hybrid attendance London',
    'Software Engineer — Argentina not eligible',
  ]) {
    const raw = fixture('greenhouse');
    raw.jobs[0].title = title;
    const job = normalize(raw).jobs[0];
    assert.equal(job.eligibility.status, 'unknown', title);
    assert.equal(job.eligibility_evidence_complete, false, title);
    assert.equal(job.role_scope, 'unknown', title);
  }
  const raw = fixture('greenhouse');
  raw.jobs[0].title = 'Senior Software Engineer';
  assert.equal(normalize(raw).jobs[0].eligibility.status, 'confirmed');
});
