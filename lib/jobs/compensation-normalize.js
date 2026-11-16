import { z } from 'zod';
import { CompensationSchema, EvidenceSchema, SafeUrlSchema, TimestampSchema } from './schema.js';
import { hash } from './registry.js';

// Offline V0 detail contract. These range fields mirror the inherited adapter.
// Only the exact bounded title grammar below supplies additional semantics.
const RawRangeSchema = z.strictObject({
  min_cents: z.number().int().nonnegative().nullable().optional(),
  max_cents: z.number().int().nonnegative().nullable().optional(),
  currency_type: z.string().max(8).nullable().optional(),
  title: z.string().max(200).optional(),
}).refine(range => range.min_cents == null || range.max_cents == null
  || range.min_cents <= range.max_cents);

export const OptionalCompensationDetailSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('success'), pay_input_ranges: z.array(RawRangeSchema).max(30) }),
  z.strictObject({ status: z.literal('failed') }),
  z.strictObject({ status: z.literal('not_requested') }),
]);

const CURRENCIES = new Set(['USD', 'ARS', 'EUR', 'GBP', 'BRL', 'CAD']);
const PERIODS = { annual: 'year', monthly: 'month', hourly: 'hour' };
const TITLE_PATTERN = /^(Argentina|Worldwide|US) (annual|monthly|hourly) (gross|net) (?:(employee|contractor) )?(base salary|bonus|equity)$/i;

function parsePayTitle(title = '') {
  const match = TITLE_PATTERN.exec(title.trim());
  if (!match) return {};
  const country = match[1].toLowerCase();
  const component = match[5].toLowerCase();
  return {
    period: PERIODS[match[2].toLowerCase()],
    basis: match[3].toLowerCase(),
    employment_scope: match[4]?.toLowerCase() ?? 'unknown',
    component: component === 'base salary' ? 'base' : component,
    geographic_scope: country === 'argentina' ? 'AR' : country === 'worldwide' ? 'global' : 'other',
    argentina_applicable: country !== 'us',
  };
}

const emptyResult = status => ({ ranges: [], evidence: [], status });

export function normalizeCompensation(raw, { job_id, option_id, source_url, observed_at }) {
  SafeUrlSchema.parse(source_url);
  TimestampSchema.parse(observed_at);
  if (raw === undefined) return emptyResult('not_requested');
  const parsed = OptionalCompensationDetailSchema.safeParse(raw);
  if (!parsed.success) return emptyResult('failed');
  if (parsed.data.status !== 'success') return emptyResult(parsed.data.status);

  const ranges = [];
  const evidence = [];
  for (const [index, input] of parsed.data.pay_input_ranges.entries()) {
    const semantics = parsePayTitle(input.title);
    const content_hash = hash(input);
    const range_id = `pay_${hash([job_id, index, content_hash]).slice(0, 24)}`;
    const evidence_id = `ev_${hash([job_id, 'pay_input_ranges', index, content_hash]).slice(0, 24)}`;
    const currency = typeof input.currency_type === 'string' ? input.currency_type.toUpperCase() : null;

    // Preserve every tier. Unknown semantics never become dollars, annual pay,
    // gross base salary, employee compensation or Argentina applicability.
    ranges.push(CompensationSchema.parse({
      range_id,
      min: input.min_cents == null ? null : input.min_cents / 100,
      max: input.max_cents == null ? null : input.max_cents / 100,
      currency: CURRENCIES.has(currency) ? currency : null,
      period: semantics.period ?? null,
      component: semantics.component ?? 'unknown',
      basis: semantics.basis ?? 'unknown',
      geographic_scope: semantics.geographic_scope ?? 'unknown',
      employment_scope: semantics.employment_scope ?? 'unknown',
      source_kind: 'employer',
      argentina_applicable: semantics.argentina_applicable ?? false,
      option_ids: [option_id],
      evidence_refs: [evidence_id],
      verified_at: observed_at,
    }));
    evidence.push(EvidenceSchema.parse({
      evidence_id, source_url, field_path: `pay_input_ranges[${index}]`,
      observed_at, content_hash, assertion_type: 'compensation', scope: job_id,
    }));
  }
  return { ranges, evidence, status: 'success' };
}
