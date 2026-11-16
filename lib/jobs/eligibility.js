import { RULES_VERSION } from './schema.js';

export function evaluateEligibility(option, { now } = {}) {
  const base = {
    evidence_refs: option.evidence_refs ?? [],
    evaluated_at: now ?? new Date().toISOString(),
    rules_version: RULES_VERSION,
  };
  const result = (status, reason) => ({ ...base, status, reason_codes: [reason] });
  if (option.conflicting_evidence) return result('unknown', 'conflicting_evidence');
  if (option.excluded_countries?.includes('AR') || option.mandatory_foreign_residence) {
    return result('ineligible', 'explicit_restriction');
  }
  if (option.exhaustive_countries && !option.allowed_countries.includes('AR')) {
    return result('ineligible', 'exhaustive_country_exclusion');
  }
  if (option.workplace === 'remote') {
    if (option.scope === 'AR' || option.allowed_countries.includes('AR')) {
      return result('confirmed', 'explicit_argentina_remote');
    }
    if (['LATAM', 'South America', 'Americas', 'worldwide'].includes(option.scope)) {
      return result('likely', 'broad_remote_scope');
    }
    return result('unknown', 'remote_scope_unknown');
  }
  if (['onsite', 'hybrid'].includes(option.workplace)) {
    if (option.locations.some(location => location.country === 'AR')) {
      return result('confirmed', 'argentina_work_location');
    }
    return result(option.locations.some(location => location.country) ? 'ineligible' : 'unknown', 'work_location');
  }
  return result('unknown', 'workplace_unknown');
}

export function summarizeEligibility(options) {
  for (const status of ['confirmed', 'likely', 'unknown', 'ineligible']) {
    const found = options.find(option => option.eligibility.status === status);
    if (found) return found.eligibility;
  }
  throw new Error('EMPTY_OPTIONS');
}

export function classifyRole(title) {
  const text = title.toLowerCase();
  if (/\b(sales|recruiter|recruiting|finance|human resources|accountant)\b/.test(text)) {
    return { roles: [], role_scope: 'out_of_scope' };
  }
  if (/\b(data engineer|software|developer|backend|frontend|full.stack|qa engineer|test engineer|security engineer|platform engineer|solutions engineer|devops|sre|data scientist|machine learning|product manager|product design|ux|technical support|technical architect)\b/.test(text)) {
    return { roles: ['technology'], role_scope: 'in_scope' };
  }
  return { roles: [], role_scope: 'unknown' };
}
