export function normalizeCountry(value) {
  const key = String(value ?? '').trim().toLowerCase();
  return ({
    ar:'AR',arg:'AR',argentina:'AR',us:'US',usa:'US','united states':'US',es:'ES',esp:'ES',spain:'ES',br:'BR',bra:'BR',brazil:'BR',brasil:'BR',mx:'MX',mexico:'MX',co:'CO',colombia:'CO' })[key] ?? null;
}

export function normalizeLocation(raw, structuredCountry = null, evidence_refs = []) {
  const text = String(raw ?? '').trim();
  const country = structuredCountry ? normalizeCountry(structuredCountry) : /\bArgentina\b/i.test(text) ? 'AR' : /\b(Spain|España)\b/i.test(text) ? 'ES' : /\b(United States|US only)\b/i.test(text) ? 'US' : /\b(Brazil|Brasil)\b/i.test(text) ? 'BR' : null;
  let city = null;
  let province = null;
  if (country === 'AR' && /\b(CABA|Ciudad Aut[oó]noma de Buenos Aires)\b/i.test(text)) { city='AR:CABA'; province='AR:C'; }
  else if (country === 'AR' && /C[oó]rdoba/i.test(text)) {city='AR:CORDOBA';
    province='AR:X';}
  else if (country === 'AR' && /provincia de Buenos Aires|Buenos Aires province/i.test(text)) province='AR:B';
  else if (country === 'ES' && /C[oó]rdoba/i.test(text)) city='ES:CORDOBA';
  return {raw:text,country,province,city,evidence_refs};
}
export function normalizeWorkplace(value) { return ({remote:'remote',hybrid:'hybrid',onsite:'onsite','on-site':'onsite',presencial:'onsite','híbrido':'hybrid'})[String(value ?? '').toLowerCase()] ?? 'unknown'; }
