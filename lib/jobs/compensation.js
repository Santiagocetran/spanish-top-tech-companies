import { z } from 'zod';

export const PayFilterSchema = z.strictObject({
  currency: z.enum(['USD', 'ARS', 'EUR', 'GBP', 'BRL', 'CAD']),
  period: z.enum(['hour', 'month', 'year']),
  component: z.enum(['base', 'bonus', 'equity', 'unknown']).default('base'),
  basis: z.enum(['gross', 'net', 'unknown']).default('gross'),
  min_amount: z.number().finite().nonnegative(),
  threshold_mode: z.enum(['lower_bound', 'range_reaches']).default('lower_bound'),
});

export function matchCompensation(range, filter, optionId, {
  now = new Date().toISOString(),
  employment_relationship = 'unknown',
} = {}) {
  const f = PayFilterSchema.parse(filter);
  const age = Date.parse(now) - Date.parse(range.verified_at);
  const employmentConflict = employment_relationship !== 'unknown'
    && range.employment_scope !== 'unknown'
    && range.employment_scope !== employment_relationship;
  if (employmentConflict || !range.argentina_applicable
    || !range.option_ids.includes(optionId)
    || !['AR', 'global'].includes(range.geographic_scope)
    || !Number.isFinite(age) || age < 0 || age >= 48 * 3600000) return false;

  if (['currency', 'period', 'component', 'basis'].some(key => range[key] !== f[key])) {
    return false;
  }
  const amount = range[f.threshold_mode === 'lower_bound' ? 'min' : 'max'];
  return Number.isFinite(amount) && amount >= f.min_amount;
}
