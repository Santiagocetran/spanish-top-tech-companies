import { fixturePipeline } from './crawl-jobs.mjs';
import { searchJobs } from '../lib/jobs/search.js';
const now = '2026-11-16T00:00:00.000Z';
try {
  const snapshot = await fixturePipeline({fixture:'tests/fixtures/ar/greenhouse.json',registry:'tests/fixtures/ar/registry.json',out:'.cache/ar-demo/snapshot.json',now});
  const result = searchJobs(snapshot,{},now);
  console.log(JSON.stringify({demo:'SYNTHETIC_ONLY',as_of:now,generation_id:snapshot.generation_id,job_ids:result.results.map(j=>j.job_id),snapshot:'.cache/ar-demo/snapshot.json'},null,2));
} catch { console.error('DEMO_FAILED'); process.exitCode=1; }
