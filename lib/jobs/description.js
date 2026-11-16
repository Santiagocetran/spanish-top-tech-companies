import { hash } from './registry.js';
import { EvidenceSchema } from './schema.js';

// Deliberately finite offline vocabulary. Unsupported prose requires review.
// Full bodies and excerpts never cross this boundary.
function clausesFromHtml(content) {
  if (typeof content !== 'string' || content.length > 50000) return null;
  let text = content.replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:x[0-9a-f]+|[0-9]+);/gi, entity => {
    const named = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const value = entity.slice(2, -1);
    const point = value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : Number(value);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '\ufffd';
  });
  if (/&[^\s;]{1,30};|<!--|<\s*(script|style|iframe|object|svg)\b/i.test(text)) return null;
  let invalid = false;
  const stack = [];
  text = text.replace(/<[^>]*>/g, tag => {
    const match = /^<(\/?)(p|br|div|ul|ol|li|strong|b|em|i|h[1-6])\s*(\/?)>$/i.exec(tag);
    if (!match) {
      invalid = true;
      return '';
    }
    const [, closing, rawName, selfClosing] = match;
    const name = rawName.toLowerCase();
    if (name === 'br') {
      if (closing) invalid = true;
    } else if (selfClosing) {
      // Non-void self-closing elements are ambiguous in HTML; do not recover.
      invalid = true;
    } else if (closing) {
      if (stack.pop() !== name) invalid = true;
    } else {
      stack.push(name);
    }
    return /^(p|br|div|li|h[1-6])$/.test(name) ? '\n' : '';
  });
  if (invalid || stack.length || /[<>]/.test(text)) return null;
  return text.split(/[\n.;]+/).map(value => value.trim().replace(/\s+/g, ' ')).filter(Boolean);
}

export function extractDescription(content, { job_id, source_url, observed_at }) {
  if (content === undefined || content === '') {
    return { complete: true, evidence: [], patch: {}, requirements: [] };
  }
  const clauses = clausesFromHtml(content);
  if (!clauses?.length) return { complete: false, evidence: [], patch: {}, requirements: [] };
  const patch = {};
  const requirements = [];
  const evidence = [];
  let complete = true;
  let allowsArgentina = false;
  let excludesArgentina = false;
  let foreignResidence = false;
  const scopes = new Set();

  clauses.forEach((clause, index) => {
    const text = clause.toLowerCase();
    let assertion = 'scope';
    if (/^(?:this (?:role|position) is remote (?:from|in) argentina|remote work from argentina is allowed|remoto desde argentina|este puesto permite trabajar desde argentina)$/.test(text)) {
      allowsArgentina = true;
      patch.workplace = 'remote';
      scopes.add('AR');
    } else if (/^(?:this (?:role|position) excludes argentina|argentina is not eligible|worldwide except argentina|este puesto excluye argentina|no se permite trabajar desde argentina)$/.test(text)) {
      excludesArgentina = true;
      assertion = 'restriction';
    } else if (/^(?:this (?:role|position) is remote (?:in|across) (latam|south america|the americas|worldwide)|remoto desde (latam|sudamérica|todo el mundo))$/.test(text)) {
      patch.workplace = 'remote';
      scopes.add(/latam/.test(text) ? 'LATAM' : /south america|sudamérica/.test(text) ? 'South America' : /americas/.test(text) ? 'Americas' : 'worldwide');
    } else if (/^(?:this (?:role|position) is remote|this is a remote role|este puesto es remoto)$/.test(text)) {
      patch.workplace = 'remote';
    } else if (/^(?:this (?:role|position) requires (?:weekly|daily) attendance (?:at|in) (?:the )?(?:london|madrid|new york) office|este puesto requiere asistencia (?:semanal|diaria) a la oficina de (?:madrid|londres))$/.test(text)) {
      foreignResidence = true;
      assertion = 'restriction';
    } else if (/^(?:us work authorization is required|work authorization is required|se requiere autorización de trabajo)$/.test(text)) {
      patch.conflicting_evidence = true;
      requirements.push('work_authorization_requires_review');
      assertion = 'restriction';
    } else if (/^(?:occasional travel is required|se requieren viajes ocasionales)$/.test(text)) {
      requirements.push('occasional_travel_required');
      assertion = 'restriction';
    } else if (/^(?:overlap with us business hours is required|se requiere coincidencia con el horario laboral de eeuu)$/.test(text)) {
      requirements.push('us_business_hours_overlap_required');
      assertion = 'restriction';
    } else if (/^(?:our company is headquartered in (?:the united states|argentina)|our company has offices in argentina|nuestra empresa tiene oficinas en argentina|this is a software engineering role)$/.test(text)) {
      // Explicit company background is not posting-specific hiring evidence.
      return;
    } else {
      complete = false;
      return;
    }
    const evidence_id = `ev_${hash([job_id, 'content', index, clause]).slice(0, 24)}`;
    evidence.push(EvidenceSchema.parse({
      evidence_id, source_url, field_path: `content.clause[${index}]`, observed_at,
      content_hash: hash(clause), assertion_type: assertion, scope: job_id,
    }));
  });
  if (allowsArgentina) { patch.scope = 'AR'; patch.allowed_countries = ['AR']; }
  else if (scopes.size === 1) patch.scope = [...scopes][0];
  else if (scopes.size > 1) patch.conflicting_evidence = true;
  if (excludesArgentina) patch.excluded_countries = ['AR'];
  if (foreignResidence) patch.mandatory_foreign_residence = true;
  if (allowsArgentina && (excludesArgentina || foreignResidence)) patch.conflicting_evidence = true;
  return { complete, evidence, patch, requirements };
}
