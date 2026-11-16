# Chewie job-search research handoff

Compiled 2026-11-16 against `implement/argentina-v0` at
`7855dcce8ed0f1323dac27ac98a117395b749520`.

**Research only. Not a registry, collected inventory, current-open list or import-ready dataset.**
No employer pages/APIs were crawled, applications submitted, sources activated,
workflows enabled or deployment configuration changed for this contribution.

## Artifacts and evidence quality

- [Source candidates](../../data/research/chewie-source-candidates.json): 12 employer/source leads.
- [Job leads](../../data/research/chewie-job-leads.json): 23 historical references, including 10 unresolved shortlinks.

These are an intentionally separate research schema (`chewie-research-1`), not the
runtime job/source contracts. All records have `status: research_only`.

Recovered evidence has three classes:

1. **Saved references:** dated 2026-11-09 references to public postings, with saved
   titles. This is the date of the reference, not a verified page observation.
2. **User-supplied public links:** public URLs and, where supplied, employer/title
   labels. Their dates were not recoverable and remain null. Labels are not proof
   of what the destination currently says.

3. **Reported prior direct observations:** earlier same-session public-page research
   reported observations on 2026-11-16 for Proofpoint, IOL, Plexus, Rain and
   Mercury Command. These are explicitly labelled reports of prior observations,
   not newly fetched page evidence. Only one short location quote is retained;
   other conditions are paraphrased and exact-wording fields stay null.

Provider names/tokens and board roots derived from URL structure are explicitly
marked as inferences. Corporate-to-board ownership evidence, exact location and
workplace wording, current availability, permission and compensation fields remain
null where not recovered. No original page body or exact-revision public snapshot
was available for independent reinspection. Secondary summaries suggesting richer
locations, pay or resolved shortlinks were not promoted into verified facts.

A title mentioning Latin America is retained only as a broad regional signal, not
Argentina confirmation. A URL slug saying hybrid/remote is not treated as the
posting's exact workplace declaration. Unknown location options are null, not an
invented worldwide option. Null compensation means not established, not unpaid.

## Priorities for the implementation reviewer

| Priority | Candidate | Why investigate | Gate still missing |
| --- | --- | --- | --- |
| 1 | Proofpoint / Workday | Prior observation explicitly named Argentina remote | Reverify posting and corporate ownership; Workday is outside initial adapter scope |
| 1 | CodeRoad / Greenhouse | Recoverable concrete posting and board token; closest to the current offline Greenhouse contract | Employer-owned outbound board link, terms review, current posting and Argentina evidence |
| 2 | Superhuman / Ashby | Saved title explicitly names Latin America; useful broad-region boundary example | Country exclusions, full location options and source ownership; Ashby is not enabled by this contribution |
| 2 | fal and Blacksmith Agency / Ashby | Concrete provider IDs and source tokens from saved technical-role references | Exact geography, ownership, permission and future Ashby contract |
| 3 | IOL, ZS, Talent Connect | Direct branded careers-host references from the search history | Do not guess provider from page layout/domain; establish canonical board and job-specific scope |
| 3 | Escalate Ops / Zoho Recruit; Credencial Payments / Hiringroom | Concrete non-initial-allowlist provider paths expose realistic source-coverage gaps | Ownership and permission, full posting evidence, separately approved adapter work |

Priority is an inference about research usefulness, not a claim of open roles,
Argentina eligibility or source approval. A recruiting intermediary must not be
silently treated as the end employer. A familiar employer label in an ATS URL is
not an ownership chain. Official corporate websites/careers URLs have therefore
not been guessed from names.

The original twelve-link shortlist names Hive, Rain, Mercury, Blackbaud, Netic,
Simplot Company, Chime, Harmonic, Shinkei and Leader Bank. Repeated Chime/Mercury
labels are separate references, not proved duplicate jobs. Two shortlinks were
matched to prior reported Rain and Mercury Command observations; ten remain unresolved. Preserve them until
provider IDs/canonical links establish identity. The two LinkedIn IDs were associated with Proofpoint and Plexus by prior research
reports; these associations are not new page verification.

## Problems and gaps revealed

- **Stale saved links:** a saved URL is not an open vacancy. Record an actual
  page observation separately from saved-reference/import time; never refresh
  lifecycle clocks merely by adding this research.
- **Duplicate discovery:** shortlinks and direct links can refer to the same job,
  but titles/company names alone cannot justify merging. Resolve canonical
  provider identity later, without erasing location variants.
- **Misleading remote wording:** the Talent Connect slug is insufficient; the
  Superhuman title only supplies regional context. Retrieve exact restrictions
  before choosing local/remote options. Bare remote, LATAM and headquarters are
  not country-specific proof.
- **Foreign residence:** prior Mercury Command research reported US/Canada-only
  remote options; Plexus remote was within Spain. Rain role metadata was New York
  onsite despite flexible corporate benefits. These are historical exclusion
  examples, with paraphrases distinguished from exact quotations.
- **Compensation ambiguity:** no publishable exact pay tuples were recovered.
  Keep currency, period, component and gross/net basis null; never convert a
  dollar symbol to USD or attach a foreign pay tier to an Argentina option.
- **Permission vs accessibility:** public URLs do not grant collection/reuse
  rights. No candidate has a completed permission review in these artifacts.
- **Adapter coverage:** Hiringroom, Zoho Recruit and unidentified branded hosts
  are not initial Greenhouse/Lever/Ashby activation candidates. Record coverage
  limitations rather than routing them through an incompatible adapter.

Proofpoint and IOL are historically promising country/local examples; Mercury
Command, Plexus and Rain illustrate foreign geography and misleading remote
context. None is current-verified. Remaining records stay unknown. Unresolved
links are excluded from evaluation, not declared geographically ineligible.

## Recommended bounded next steps

1. Review these references alongside [source feasibility](SOURCE_FEASIBILITY.md).
2. Establish the employer-owned careers-to-board chain and terms/reuse decision
   for one Greenhouse candidate before considering any real-source activation.
3. In a separately scoped source review, capture dated, short posting-specific
   country/workplace/restriction evidence and all location/pay options. Preserve
   public provenance, not personal application histories or full descriptions.
4. After permission review, derive sanitized realistic fixtures for the existing
   [Greenhouse contract](GREENHOUSE_CONTRACT.md) and
   [offline collection contract](OFFLINE_COLLECTION.md). They should exercise
   broad-region ambiguity, foreign mandatory office attendance, multi-location
   pay separation, stale references and suspected duplicates.
5. Follow the [implementation plan](IMPLEMENTATION_PLAN.md) gates. Neither this
   contribution nor a public provider endpoint approves a crawl, registry entry,
   deployment, application or source-service write.

## Validation and limits

JSON syntax, unique research IDs, required research-only markers, HTTPS URL
structure, tracking-parameter absence (functional Greenhouse board/job identifiers retained) and relative documentation link targets
are checked locally. External links are **not** live-checked: doing so would be
new source retrieval outside this historical-evidence task. No assertion of
current reachability is made. Full diff and `git diff --check` are inspected.
Runtime tests are not evidence for these real employers; no runtime source was
changed. Existing user work is preserved in its original worktrees.

Not recovered: authoritative corporate ownership chains, source reuse terms,
exact current posting bodies, original page-check times, reliable pay tuples,
foreign-residence exclusion quotations and canonical destinations for the
shortlinks. Personal CVs, recruiter identities/contact details, messages,
application status/answers and preferences are deliberately absent.
