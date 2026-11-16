import { createHash } from 'node:crypto';
import { CompanySchema, SourceSchema } from './schema.js';

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

export function validateRegistry({ companies, sources }) {
  const validatedCompanies = companies.map(value => CompanySchema.parse(value));
  const validatedSources = sources.map(value => SourceSchema.parse(value));
  const identities = [
    validatedCompanies.map(value => value.company_id),
    validatedSources.map(value => value.source_id),
    validatedSources.map(sourceIdentity),
  ];
  for (const values of identities) {
    if (new Set(values).size !== values.length) throw new Error('DUPLICATE_REGISTRY_IDENTITY');
  }
  if (validatedSources.some(source => new URL(source.canonical_board_url).pathname !== `/${source.board}`)) {
    throw new Error('BOARD_URL_IDENTITY_MISMATCH');
  }
  const companyIds = new Set(validatedCompanies.map(value => value.company_id));
  if (validatedSources.some(source => !companyIds.has(source.company_id))) {
    throw new Error('UNKNOWN_COMPANY');
  }
  return { companies: validatedCompanies, sources: validatedSources };
}
