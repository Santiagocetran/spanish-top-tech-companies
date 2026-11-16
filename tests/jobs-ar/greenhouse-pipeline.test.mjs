import './deny-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fixturePipeline } from '../../scripts/crawl-jobs.mjs';
import { searchJobs } from '../../lib/jobs/search.js';

const now = '2026-11-16T00:00:00.000Z';
const options = {
  fixture: 'tests/fixtures/ar/greenhouse-contract.json',
  details: 'tests/fixtures/ar/greenhouse-details.json',
  registry: 'tests/fixtures/ar/registry.json', now,
};

test('description and native detail fixture to local state and scoped search', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ar-contract-'));
  try {
    const out = join(directory, 'snapshot.json');
    const snapshot = await fixturePipeline({ ...options, out });
    const byId = id => snapshot.jobs.find(job => job.external_id === id);
    assert.equal(snapshot.rules_version, 'ar-v0-2');
    assert.equal(byId('201').eligibility.status, 'confirmed');
    assert.equal(byId('202').eligibility.status, 'likely');
    assert.equal(byId('202').compensation_enrichment_status, 'failed');
    assert.equal(byId('202').status, 'open');
    assert.equal(byId('203').eligibility.status, 'ineligible');
    for (const id of ['204', '205', '206']) assert.equal(byId(id).eligibility.status, 'unknown');
    assert.equal(byId('205').location_options[0].restrictions[0], 'work_authorization_requires_review');
    assert.equal(byId('206').eligibility_evidence_complete, false);
    assert.equal(byId('201').compensation.length, 2);
    assert.deepEqual(byId('201').location_options[0].restrictions, ['us_business_hours_overlap_required', 'occasional_travel_required']);
    assert.deepEqual(new Set(searchJobs(snapshot, {}, now).results.map(job => job.external_id)), new Set(['201', '202']));
    const pay = { currency: 'USD', period: 'month', min_amount: 4000 };
    const results = searchJobs(snapshot, { pay }, now);
    assert.deepEqual(results.results.map(job => job.external_id), ['201']);
    const match = results.results[0].matched_options[0].compensation_refs;
    assert.equal(match.length, 1);
    assert.equal(byId('201').compensation.find(range => range.range_id === match[0]).geographic_scope, 'AR');
    assert.equal(searchJobs(snapshot, { pay: { currency: 'USD', period: 'year', min_amount: 90000 } }, now).total, 0);
    assert.equal(byId('204').compensation[0].currency, null);
    assert.equal(byId('204').compensation[0].period, null);
    const output = await readFile(out, 'utf8');
    assert.doesNotMatch(output, /<p>|Our company has offices|This role requires residence/);
    assert.deepEqual(await fixturePipeline({ ...options, out, previous: out }), snapshot);

    const details = JSON.parse(await readFile(options.details, 'utf8'));
    details.details['201'] = { id: 201, status: 'failed' };
    const failedPath = join(directory, 'failed-details.json');
    await writeFile(failedPath, JSON.stringify(details));
    const nextTime = '2026-11-17T00:00:00.000Z';
    const refreshed = await fixturePipeline({ ...options, details: failedPath, now: nextTime, out, previous: out });
    const refreshedJob = refreshed.jobs.find(job => job.external_id === '201');
    assert.equal(refreshedJob.status, 'open');
    assert.equal(refreshedJob.last_eligibility_verified_at, nextTime);
    assert.equal(refreshedJob.compensation_enrichment_status, 'failed');
    assert.equal(refreshedJob.compensation[0].verified_at, now);
    assert.ok(searchJobs(refreshed, {}, nextTime).results.some(job => job.external_id === '201'));

    // Incompatible rules and wrong posting identity never overwrite valid output.
    const lastGood = await readFile(out, 'utf8');
    details.details['201'].id = 999;
    await writeFile(failedPath, JSON.stringify(details));
    await assert.rejects(fixturePipeline({ ...options, details: failedPath, out }));
    assert.equal(await readFile(out, 'utf8'), lastGood);
    details.details['201'].id = 201;
    details.source_id = 'different_board';
    await writeFile(failedPath, JSON.stringify(details));
    await assert.rejects(fixturePipeline({ ...options, details: failedPath, out }), /DETAIL_SOURCE_MISMATCH/);
    assert.equal(await readFile(out, 'utf8'), lastGood);
    const oldRulesPath = join(directory, 'old-rules.json');
    await writeFile(oldRulesPath, JSON.stringify({ ...snapshot, rules_version: 'ar-v0-1' }));
    await assert.rejects(fixturePipeline({ ...options, previous: oldRulesPath, out }));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
