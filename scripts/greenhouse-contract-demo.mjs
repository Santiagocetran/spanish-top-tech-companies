import { fixturePipeline } from './crawl-jobs.mjs';
import { searchJobs } from '../lib/jobs/search.js';
const now = '2026-11-16T00:00:00.000Z';
try {
  const snapshot = await fixturePipeline({
    fixture: 'tests/fixtures/ar/greenhouse-contract.json',
    details: 'tests/fixtures/ar/greenhouse-details.json',
    registry: 'tests/fixtures/ar/registry.json',
    now, out: '.cache/ar-greenhouse/snapshot.json',
  });
  const discovery = searchJobs(snapshot, {}, now);
  const pay = searchJobs(snapshot, {
    pay: { currency: 'USD', period: 'month', min_amount: 4000 },
  }, now);
  console.log(JSON.stringify({
    demo: 'SYNTHETIC_ONLY', rules_version: snapshot.rules_version, as_of: now,
    snapshot: '.cache/ar-greenhouse/snapshot.json',
    discovery: discovery.results.map(job => ({ id: job.external_id, eligibility: job.eligibility.status })),
    pay_query: pay.applied_filters.pay,
    pay_matches: pay.results.map(job => ({ id: job.external_id, matched_options: job.matched_options })),
    optional_pay_failures: snapshot.jobs.filter(job => job.compensation_enrichment_status === 'failed').map(job => job.external_id),
  }, null, 2));
} catch {
  console.error('GREENHOUSE_CONTRACT_DEMO_FAILED');
  process.exitCode = 1;
}
