import { z } from 'zod';
import { AdapterEnvelopeSchema, TimestampSchema } from './schema.js';
import { hash, stableJobId, validateSourceForCollection } from './registry.js';
import { normalizeGreenhouse } from './normalize.js';

const MAX_BYTES = 1024 * 1024;
const ProviderId = z.number().int().positive().safe();

// This is an offline collection contract, not a network client. Callers must
// inject transport; there is deliberately no fetch import or network fallback.
export async function collectGreenhouse({
  source, company, run_id, observed_at, transport, clock = Date.now, enrich_pay = false,
}) {
  if (typeof transport !== 'function') throw new Error('TRANSPORT_REQUIRED');
  TimestampSchema.parse(observed_at);
  ({ source, company } = validateSourceForCollection(source, company, observed_at));
  // The reviewed official contract documents the global API only.
  if (source.region !== 'global') throw new Error('UNSUPPORTED_COLLECTION_REGION');
  const apiHost = 'boards-api.greenhouse.io';
  const base = `https://${apiHost}/v1/boards/${encodeURIComponent(source.board)}/jobs`;
  const started = clock();
  if (!Number.isFinite(started)) throw new Error('INVALID_CLOCK');
  const deadline = started + Math.min(source.limits.timeout_ms, 60000);
  const envelope = {
    source_id: source.source_id,
    inventory_id: `inventory_${hash([source.source_id, run_id]).slice(0, 24)}`,
    jobs: [], observed_ids: [], inventory_complete: false,
    required_evidence_failures: [], optional_enrichment_failures: [],
    truncated: false, coverage_scope: 'full_board',
    inventory_plan_hash: source.inventory_plan.hash, run_id,
    attempted_at: observed_at, completed_at: observed_at,
    status: 'failed', issues: [], request_count: 0,
  };
  const evidence = [];
  // Validate caller-owned identifiers before any transport dispatch.
  AdapterEnvelopeSchema.parse(envelope);
  const finish = () => ({ envelope: AdapterEnvelopeSchema.parse(envelope), evidence });
  const issue = code => { if (!envelope.issues.includes(code)) envelope.issues.push(code); };

  async function request(url) {
    const parsed = new URL(url);
    const list = `${base}?content=true`;
    const detail = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[0-9]+\\?pay_transparency=true$`);
    if (parsed.hostname !== apiHost || (url !== list && !detail.test(url))) {
      return { error: 'DESTINATION_REJECTED' };
    }
    const remaining = deadline - clock();
    if (!(remaining > 0)) return { error: 'TIME_CAP' };
    if (envelope.request_count >= source.limits.requests) return { error: 'REQUEST_CAP' };
    envelope.request_count++;
    const controller = new AbortController();
    let timer;
    try {
      const response = await Promise.race([
        Promise.resolve().then(() => transport({ url, method: 'GET', signal: controller.signal, timeout_ms: remaining, max_bytes: MAX_BYTES })),
        new Promise(resolve => { timer = setTimeout(() => { controller.abort(); resolve({ timed_out: true }); }, remaining); }),
      ]);
      if (response?.timed_out || clock() >= deadline) return { error: 'TIME_CAP' };
      if (!response || typeof response !== 'object' || !Number.isInteger(response.status)) return { error: 'INVALID_TRANSPORT_RESPONSE' };
      if (response.url !== undefined && response.url !== url) return { error: 'REDIRECT_REJECTED' };
      if (response.status >= 300 && response.status < 400) return { error: 'REDIRECT_REJECTED' };
      if (response.status !== 200) return { error: response.status === 429 ? 'THROTTLED' : [401, 403].includes(response.status) ? 'BLOCKED' : 'HTTP_FAILURE' };
      let serialized;
      try { serialized = JSON.stringify(response.body); } catch { return { error: 'INVALID_PAYLOAD' }; }
      if (typeof serialized !== 'string') return { error: 'INVALID_PAYLOAD' };
      if (Buffer.byteLength(serialized, 'utf8') > MAX_BYTES) return { error: 'RESPONSE_SIZE_CAP' };
      return { body: response.body, truncated: response.truncated === true };
    } catch {
      return { error: 'TRANSPORT_FAILURE' };
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }

  const listed = await request(`${base}?content=true`);
  if (listed.error) {
    issue(listed.error);
    envelope.status = listed.error === 'THROTTLED' ? 'throttled' : listed.error === 'BLOCKED' ? 'blocked' : ['INVALID_PAYLOAD', 'RESPONSE_SIZE_CAP', 'INVALID_TRANSPORT_RESPONSE'].includes(listed.error) ? 'invalid_payload' : 'failed';
    return finish();
  }
  if (!listed.body || !Array.isArray(listed.body.jobs)) {
    envelope.status = 'invalid_payload';
    issue('MISSING_JOBS_ARRAY');
    return finish();
  }
  // V0 has exactly one unfiltered list request. It never follows pagination
  // hints, guesses missing pages, or calls a capped response exhaustive.
  // Requiring matching meta.total is our conservative offline gate; the docs
  // call this all posts but do not promise a transactional inventory snapshot.
  const more = listed.truncated || listed.body.next_page != null || listed.body.next != null;
  const total = listed.body.meta?.total;
  const totalInvalid = !Number.isSafeInteger(total) || total < 0 || total !== listed.body.jobs.length;
  envelope.truncated = Boolean(more || totalInvalid);
  envelope.inventory_complete = !envelope.truncated;
  envelope.status = envelope.inventory_complete ? 'complete' : 'partial';
  if (envelope.truncated) issue('INVENTORY_TRUNCATED');
  const seen = new Set();
  let detailCount = 0;

  for (const rawJob of listed.body.jobs) {
    const parsedId = ProviderId.safeParse(rawJob?.id);
    if (!parsedId.success || seen.has(rawJob.id)) {
      envelope.inventory_complete = false;
      envelope.status = 'partial';
      issue(parsedId.success ? 'DUPLICATE_POSTING_ID' : 'INVALID_POSTING_ID');
      continue;
    }
    seen.add(rawJob.id);
    const jobId = stableJobId(source, String(rawJob.id));
    envelope.observed_ids.push(jobId);
    // content=true is part of this collection contract. The legacy fixture
    // normalizer remains permissive, but collection cannot verify a missing body.
    if (typeof rawJob.content !== 'string') {
      envelope.required_evidence_failures.push(jobId);
      issue('REQUIRED_CONTENT_MISSING');
      continue;
    }
    let details;
    if (enrich_pay) {
      let pay;
      if (detailCount >= source.limits.details) pay = { error: 'DETAIL_CAP' };
      else {
        detailCount++;
        pay = await request(`${base}/${rawJob.id}?pay_transparency=true`);
      }
      if (pay.error || pay.truncated || !pay.body || pay.body.id !== rawJob.id) {
        details = { [rawJob.id]: { status: 'failed', id: rawJob.id } };
        issue(pay.error ?? 'INVALID_DETAIL_PAYLOAD');
      } else {
        details = { [rawJob.id]: { status: 'success', id: rawJob.id, pay_input_ranges: pay.body.pay_input_ranges } };
      }
    }
    try {
      const normalized = normalizeGreenhouse({ jobs: [rawJob] }, { source, company, observed_at, details });
      const job = normalized.jobs[0];
      envelope.jobs.push(job);
      evidence.push(...normalized.evidence);
      if (!job.eligibility_evidence_complete) envelope.required_evidence_failures.push(jobId);
      if (job.compensation_enrichment_status === 'failed') envelope.optional_enrichment_failures.push(jobId);
    } catch {
      envelope.required_evidence_failures.push(jobId);
      issue('REQUIRED_JOB_EVIDENCE_INVALID');
    }
  }
  return finish();
}
