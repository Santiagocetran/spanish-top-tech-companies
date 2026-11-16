import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeGreenhouse } from '../../lib/jobs/normalize.js';
import { extractDescription } from '../../lib/jobs/description.js';
const read = name => JSON.parse(readFileSync(new URL(`../fixtures/ar/${name}.json`, import.meta.url)));
const registry = read('registry');
const observed_at = '2026-11-16T00:00:00.000Z';
for (const item of read('description-cases')) {
  test(`description: ${item.name}`, () => {
    const raw = read('greenhouse');
    raw.jobs[0].location.name = item.location;
    raw.jobs[0].content = item.content;
    const { jobs, evidence } = normalizeGreenhouse(raw, { source: registry.sources[0], company: registry.companies[0], observed_at });
    assert.equal(jobs[0].eligibility.status, item.status);
    assert.equal(jobs[0].eligibility_evidence_complete, item.complete);
    assert.ok(evidence.every(value => !('excerpt' in value) && !('content' in value)));
  });
}
test('disclosed conditions persist as codes; unknown prose and contacts never persist', () => {
  const raw = read('greenhouse');
  raw.jobs[0].content = 'Occasional travel is required. Overlap with US business hours is required.';
  const options = { source: registry.sources[0], company: registry.companies[0], observed_at };
  const result = normalizeGreenhouse(raw, options);
  assert.deepEqual(result.jobs[0].location_options[0].restrictions, ['occasional_travel_required', 'us_business_hours_overlap_required']);
  raw.jobs[0].content += ' Contact Jane Private at private@example.com +54 11 5555 1234.';
  const withheld = normalizeGreenhouse(raw, options);
  assert.equal(withheld.jobs[0].eligibility.status, 'unknown');
  assert.doesNotMatch(JSON.stringify(withheld), /Jane|private@example|5555/);
  assert.notEqual(withheld.jobs[0].content_hash, result.jobs[0].content_hash);
});
test('malformed or oversized HTML cannot hide restrictions', () => {
  for (const content of ['<p title="hidden">This role is remote from Argentina</p>', '<p>This role is remote from Argentina</p><!---->', '<p>This role is remote from Argentina</p><broken', 'World except AR', 'x'.repeat(50001)]) {
    const extracted = extractDescription(content, { job_id: 'job_test', source_url: 'https://example.com/job', observed_at });
    assert.equal(extracted.complete, false);
  }
});

test('specific location and description conflicts stay unknown', () => {
  for (const [location, content] of [
    ['Buenos Aires, Argentina', 'This role is remote from Argentina.'],
    ['Remote — US only', 'This role is remote from Argentina.'],
    ['Remote — Argentina', 'This role excludes Argentina.'],
    ['Remote — Argentina', 'This role requires weekly attendance at the Madrid office.'],
  ]) {
    const raw = read('greenhouse');
    raw.jobs[0].location.name = location;
    raw.jobs[0].content = content;
    const result = normalizeGreenhouse(raw, { source: registry.sources[0], company: registry.companies[0], observed_at });
    assert.equal(result.jobs[0].eligibility.status, 'unknown', location);
  }
});

test('malformed allowed-tag nesting fails closed rather than recovering HTML', () => {
  for (const content of [
    '<p>This role is remote from Argentina</div>',
    '<strong>This role is remote from Argentina',
    '</p>This role is remote from Argentina<p>',
    '<p><div>This role is remote from Argentina</p></div>',
    '<p/>This role is remote from Argentina',
    '<p>This role is remote from Argentina</p></br>',
  ]) {
    const raw = read('greenhouse');
    raw.jobs[0].content = content;
    const result = normalizeGreenhouse(raw, { source: registry.sources[0], company: registry.companies[0], observed_at });
    assert.equal(result.jobs[0].eligibility.status, 'unknown', content);
    assert.equal(result.jobs[0].eligibility_evidence_complete, false, content);
  }
  const extracted = extractDescription('<p><strong>This role</strong> is remote from Argentina<br/></p>', { job_id: 'job_test', source_url: 'https://example.com/job', observed_at });
  assert.equal(extracted.complete, true);
});
