// Fixture-only orchestration. This command has no live transport.
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { requireLocalConfig } from './argentina-config.mjs';
import { validateRegistry } from '../lib/jobs/registry.js';
import { normalizeGreenhouse } from '../lib/jobs/normalize.js';
import { reconcileSnapshot } from '../lib/jobs/lifecycle.js';
import { readSnapshot, writeSnapshot } from '../lib/jobs/snapshot.js';
import { AdapterEnvelopeSchema, SCHEMA_VERSION, RULES_VERSION } from '../lib/jobs/schema.js';

const DetailsFileSchema = z.strictObject({
  dataset_kind: z.literal('synthetic'),
  source_id: z.string().min(1),
  details: z.record(z.string().regex(/^[1-9][0-9]*$/), z.unknown()),
});

export async function fixturePipeline({ fixture, registry, details, previous, out, now }) {
  await requireLocalConfig();
  const raw = JSON.parse(await readFile(fixture, 'utf8'));
  const detailFile = details ? DetailsFileSchema.parse(JSON.parse(await readFile(details, 'utf8'))) : null;
  const detailRecords = detailFile?.details ?? {};
  const records = validateRegistry(JSON.parse(await readFile(registry, 'utf8')));
  if (records.sources.length !== 1 || !now || !out) throw new Error('FIXTURE_INPUT_INVALID');
  const source = records.sources[0];
  if (detailFile && detailFile.source_id !== source.source_id) throw new Error('DETAIL_SOURCE_MISMATCH');
  const company = records.companies.find(c => c.company_id === source.company_id);
  const normalized = normalizeGreenhouse(raw, { source, company, observed_at: now, details: detailRecords });
  const hash = createHash('sha256').update(JSON.stringify({ raw, details: detailRecords, registry: records, now, rules_version: RULES_VERSION })).digest('hex');
  const runId = `fixture-${hash.slice(0, 24)}`;
  const envelope = AdapterEnvelopeSchema.parse({
    source_id: source.source_id,
    inventory_id: runId,
    run_id: runId,
    inventory_plan_hash: source.inventory_plan.hash,
    inventory_complete: true,
    status: 'complete',
    truncated: false,
    coverage_scope: 'full_board',
    jobs: normalized.jobs,
    observed_ids: normalized.jobs.map(job => job.job_id),
    required_evidence_failures: normalized.jobs.filter(job => !job.eligibility_evidence_complete).map(job => job.job_id),
    optional_enrichment_failures: normalized.jobs.filter(job => job.compensation_enrichment_status === 'failed').map(job => job.job_id),
    attempted_at: now,
    completed_at: now,
    issues: [],
    request_count: 0,
  });
  const prior = previous ? await readSnapshot(previous) : null;
  const snapshot = reconcileSnapshot(prior, {
    run_id: runId, observed_at: now, sources: [envelope],
  }, {
    sources: records.sources,
    metadata: {
      dataset_kind: 'synthetic',
      schema_version: SCHEMA_VERSION,
      generation_id: runId,
      producer_code_sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      registry_hash: createHash('sha256').update(JSON.stringify(records)).digest('hex'),
      rules_version: RULES_VERSION,
      removal_policy_version: 'none-v0',
      freshness_policy: { fresh_for_hours: 48, unverified_retention_days: 7 },
      target_country: 'AR',
      evidence: normalized.evidence,
    },
  });
  await writeSnapshot(out, snapshot);
  return snapshot;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  try {
    const args = process.argv.slice(2), options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--fixture', '--registry', '--details', '--previous', '--out', '--now'].includes(args[i]) || !args[i + 1]) throw new Error('INVALID_ARGUMENT');
      const key = args[i].slice(2);
      if (key in options) throw new Error('DUPLICATE_ARGUMENT');
      options[key] = args[i + 1];
    }
    if (!options.fixture || !options.registry || !options.now || !options.out) throw new Error('MISSING_ARGUMENT');
    await fixturePipeline(options);
    console.log('FIXTURE_PIPELINE_OK');
  } catch {
    console.error('FIXTURE_PIPELINE_INVALID: explicit --fixture --registry --now --out required; no live crawl');
    process.exitCode = 1;
  }
}
