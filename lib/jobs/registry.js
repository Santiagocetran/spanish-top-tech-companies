import { createHash } from 'node:crypto';
import { CompanySchema, SourceSchema, TimestampSchema } from './schema.js';

export function hash(value) {
  return createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex');
}

export function sourceIdentity(source) {
  return [source.ats, source.region, source.board].join(':');
}

export function stableJobId(source, externalId) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,159}$/.test(String(externalId ?? ''))) {
    throw new Error('UNSAFE_POSTING_ID');
  }
  return `job_${hash([sourceIdentity(source), String(externalId)]).slice(0, 32)}`;
}

const HOSTED_HOSTS = Object.freeze({
  global: ['boards.greenhouse.io', 'job-boards.greenhouse.io'],
});

function validateSourceIdentity(source) {
  const hosts = HOSTED_HOSTS[source.region];
  if (!hosts) throw new Error('UNSUPPORTED_SOURCE_REGION');
  const canonical = new URL(source.canonical_board_url);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(source.board)
    || !hosts.includes(canonical.hostname)
    || canonical.pathname !== `/${source.board}`) {
    throw new Error('BOARD_URL_IDENTITY_MISMATCH');
  }
  if (new Set(source.allowed_hosts).size !== source.allowed_hosts.length
    || !source.allowed_hosts.includes(canonical.hostname)
    || source.allowed_hosts.some(host => !hosts.includes(host))) {
    throw new Error('UNAPPROVED_SOURCE_HOST');
  }
  return source;
}

// Collection has an explicit clock. Static registry inspection remains valid for
// disabled/pending sources and for an empty registry; it does not authorize IO.
export function validateSourceForCollection(value, employer, now) {
  const source = validateSourceIdentity(SourceSchema.parse(value));
  const company = CompanySchema.parse(employer);
  TimestampSchema.parse(now);
  const current = Date.parse(now);
  if (source.company_id !== company.company_id) throw new Error('COMPANY_SOURCE_MISMATCH');
  if (!source.enabled) throw new Error('SOURCE_DISABLED');
  if (!source.permission_review.retrieval || !source.permission_review.publication) {
    throw new Error('SOURCE_PERMISSION_REQUIRED');
  }
  if (company.verification.status !== 'verified') throw new Error('COMPANY_UNVERIFIED');
  const reviewed = [source.verified_at, source.permission_review.reviewed_at, company.verification.checked_at];
  if (reviewed.some(value => Date.parse(value) > current)) throw new Error('FUTURE_SOURCE_REVIEW');
  if (Date.parse(source.review_due_at) <= current) throw new Error('SOURCE_REVIEW_EXPIRED');
  return { source, company };
}

export function validateRegistry({ companies, sources }) {
  const validatedCompanies = companies.map(value => CompanySchema.parse(value));
  const validatedSources = sources.map(value => validateSourceIdentity(SourceSchema.parse(value)));
  const identities = [
    validatedCompanies.map(value => value.company_id),
    validatedSources.map(value => value.source_id),
    validatedSources.map(sourceIdentity),
  ];
  for (const values of identities) {
    if (new Set(values).size !== values.length) throw new Error('DUPLICATE_REGISTRY_IDENTITY');
  }
  const companyIds = new Set(validatedCompanies.map(value => value.company_id));
  if (validatedSources.some(source => !companyIds.has(source.company_id))) {
    throw new Error('UNKNOWN_COMPANY');
  }
  return { companies: validatedCompanies, sources: validatedSources };
}
