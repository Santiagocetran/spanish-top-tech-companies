# Argentina Tech Jobs — implementation plan

**Status (updated 2026-11-16):** The local P0–P1 foundation and V0 vertical slice are implemented, followed by bounded offline Greenhouse description/pay contracts. See [V0 handoff](LOCAL_V0.md), [current increment](GREENHOUSE_CONTRACT.md) and their execution/review evidence. This document remains the corrected target architecture; later-phase tasks are not claims of implemented behavior. Real employer registries remain empty, and live crawling, hosting, MCP transports and production publication have not started. Public-launch readiness remains unproven.

**Working name:** `argentina-tech-jobs` (owner and public name to be approved before publication).

**Source reviewed:** `pugarte7/spanish-top-tech-companies`, `main` at `2042874594e81fb3eba74f084f7ad0cd0fb05049`. Remote HEAD was checked against this revision. Review date: November 16, 2026.

## 1. Decision and product boundary

Fork for provenance and reuse, but build an Argentina-focused, jobs-first product rather than a translated Spanish salary-ranking site. Its promise is:

> Find technology positions located in Argentina or plausibly available to someone residing in Argentina, with explicit evidence and uncertainty about eligibility.

This is geographic eligibility, not a guarantee that an individual meets work authorization, qualifications, employment or immigration requirements. Remote location, employer headquarters and the applicant's citizenship are different concepts.

### First release

- A manually curated employer/source registry; postings are collected and refreshed automatically.
- A qualification target of 30 approved employer boards, subject to a source-feasibility checkpoint; not promised existing coverage and not invented in this plan.
- Argentina onsite/hybrid positions and Argentina-compatible remote positions, separated by workplace and eligibility confidence.
- Greenhouse, Lever and Ashby as the initial production adapter allowlist. Other adapters remain disabled until their own acceptance contract passes.
- Search by text, company, role, seniority, workplace, Argentina location, eligibility and explicit compensation tuple.
- Spanish-first responsive website; English-ready strings, with English launch optional.
- A read-only MCP interface and downloadable public JSON using the same search logic.
- Evidence, source links, lifecycle status and last successful observation visible for every listing.
- Maintainer review of ambiguous cases and community submissions through GitHub issues/PRs. No account system or admin application initially.

### Explicitly out of scope

Salary leaderboards, Levels.fyi ingestion, currency conversion, estimated salaries, net-pay/tax calculations, candidate accounts/CVs, application submission, application telemetry, email alerts, semantic/vector search, universal ATS coverage, public arbitrary-URL crawling, paid scraping services and a full multi-country framework, multi-query reconciliation and manual job ingestion.

**Manual work means maintaining sources and resolving uncertainty, not re-entering every job.** Submitted job URLs are research leads for source onboarding in v1, not automatically published records. Manual job ingestion is deferred until a separate manual-source contract defines evidence, identity, review validity and expiry; it must not use inventory-based closure.

## 2. What was actually inspected and executed

### Baseline evidence

Local checkout: `<review-checkout>`.

Actual runtime: Node `v22.23.4`, npm `10.9.9`, Python `3.13.5`. Upstream CI specifies Node 22 and Python 3.12, so the local Python result is not an exact CI-environment reproduction.

| Check | Actual result | Evidence file |
|---|---|---|
| `npm ci --omit=dev --ignore-scripts` | Exit 0; npm reported zero vulnerabilities for this installed production dependency set | Tool execution; not a complete security assessment |
| `python3 tests/test_pipeline.py` | Exit 0; all checks passed | `pipeline.log` |
| `python3 scripts/site.py && node tests/mcp.test.mjs` | Exit 0; static build and MCP checks passed | `site-mcp.log` |
| `node tests/jobs.test.mjs` | Exit 0; fixture crawl and fallback checks passed | `jobs.log` |
| `git status --porcelain` after checks | Empty; tracked source unchanged | Tool execution |

Tests exercise offline fixtures. They do not establish live Argentina coverage, permissions to reuse employer content, production performance or MCP protocol certification. No full live crawl or deployed endpoint was tested. Intentional simulated failures appear in test logs and are not production outages.

### Source-based findings that change the design

| Finding | Evidence at reviewed revision | Required response |
|---|---|---|
| Companies and board seeds depend on Spanish salary aggregates and Levels.fyi slugs | `scripts/site.py:934–963`; `lib/ats/presets/spain.js` | Independent company/source IDs and registry. No salary prerequisite. |
| Spain filtering is embedded in job indexing; LATAM/Americas title signals can reject otherwise placeless remote jobs | `scripts/jobs.mjs:38–49,117–137,154–155` | Replace the eligibility decision, not just display strings. |
| The shared location classifier does not represent Argentina correctly | `lib/ats/ranking/location.js`; executable probe below | Preserve raw country/location inputs and introduce target-country eligibility independent of legacy ranking classes. |
| Country metadata can be discarded or narrowed to US/Canada | `normalize.js:13–27`; `sourceValidation.js:111–136`; `workday.js:53–65`; `ashbyLocations.js` | Preserve per-location country metadata before legacy normalization. |
| Some adapters themselves default searches to Spain | `eightfold.js:21,35`; `oracle.js:19,36`; Spain preset's Workday/SmartRecruiters settings | Explicit query plans, no hidden country defaults; enable adapters only after review. |
| Pay may silently default to USD/year; geographic pay tiers can collapse to an unsuitable summary | `normalize.js:6–14`; `greenhouse.js:18–33`; `lever.js:18–33`; `ashbyCompensation.js:24–44,69–106` | Nullable currency/period, multiple scoped ranges, no inferred USD or Argentina pay. |
| Invalid payloads may look like empty boards; some adapters cap results or swallow detail failures | `lever.js:57–60`; `greenhouse.js:66–69`; `ashby.js:16–20`; `workday.js:129–179` | Structured completeness contract; partial results must never close missing postings. |
| Crawl failures can reuse old postings and publication can succeed without a fresh crawl | `scripts/jobs.mjs:19–31,315–343,424–493` | Explicit degradation, freshness and publish gates. |
| MCP search uses Spain salary fallback and can relax city filters when no city matches | `api/mcp.js:782–836,1004–1141` | Job-only search; no hidden eligibility, location or pay relaxation. |
| Inherited production telemetry has the original project's default token | `api/_track.js:10–14`; `scripts/site.py:78–103` | Telemetry off, remove inherited defaults and endpoint rewrites. |
| Stdio and crawler paths can fall back to the original live site | `scripts/mcp-stdio.mjs:17–23`; `scripts/jobs.mjs:53–59` | Fail closed without explicit local/configured data; never silently serve Spain. |
| Existing application guidance includes a rule to answer Spain when location is unknown | `api/mcp.js:2479–2481` | Remove application tools/guidance from v1, not translate this behavior. |
| CI includes release, registry and scheduled publication workflows | `.github/workflows/{deploy,registry,release,weekly}.yml`; `server.json` | Disable external publication until new owner/configuration is approved. |

Executable probe of `analyzeLocation()` returned:

| Input | Current class / country |
|---|---|
| `Argentina` | `other` / `unknown` |
| `Buenos Aires, Argentina` | `other` / `unknown` |
| `Remote - Argentina` | `remote-global` / `unknown` |
| `Remote - LATAM` | `remote-global` / `unknown` |
| `Remote - Brazil` | `remote-global` / `unknown` |
| `Remote - AR` | `remote-us` / `US` |

The final case is an Arkansas abbreviation collision. A literal global replacement of `AR`, `Spain` or country codes would be unsafe. Source structured country codes must be distinguished from free-text abbreviations; Spanish region codes are not country codes either.

### Licenses and data sourcing

The repository labels code MIT, with the original copyright notice, and aggregate data CC BY-SA 4.0. `LICENSE-DATA` explicitly says third-party rights are not granted by that file. Preserve MIT notices and provenance; do not transplant Spanish aggregates into Argentina results. Keep a third-party source inventory and record applicable terms/republication decisions. Public accessibility alone is not a blanket permission to crawl or republish.

`CLAUDE.md:79–85,123–154` describes the private salary CSV, authenticated collection and maintainer-machine refresh, including the maintainer's acknowledgement of a Levels.fyi terms conflict. Do not inherit that dependency. This is a sourcing risk observation, not a legal opinion.

## 3. Architecture and scope of the fork

### Data flow

```text
Maintainer-reviewed companies + sources + policies
                  |
                  v
Bounded ATS adapters -> validated source records + crawl completeness
                  |
                  v
Canonical job normalization (retain country, scope, pay evidence)
                  |
                  v
Deterministic Argentina eligibility + review overrides + classification
                  |
                  v
Lifecycle reconciliation against last validated snapshot
                  |
                  v
Validation / safety / coverage gates
                  |
                  v
Versioned sanitized snapshot -> static website + read-only MCP
```

A review queue is derived alongside the snapshot; it does not block unrelated verified jobs. No LLM is required in the ingestion path. Optional future model extraction may suggest evidence, never silently promote eligibility.

### Runtime choices

- Keep JavaScript ES modules and Node 22 for the first implementation. Reuse installed `zod` and existing adapter utilities. Pin versions and use the lockfile.
- Use a small Node job-site generator rather than adapting the salary/map-oriented Python generator. Preserve a baseline reference for the old pipeline; do not require the Spanish dataset in the Argentina runtime.
- JSON source-control files are the initial registry. No PostgreSQL, Redis, vector database or queue service is needed for 30 boards.
- Reuse adapter internals selectively. Introduce a new job-domain boundary rather than exporting legacy `locationClass` as country truth.
- Keep shared changes narrow and document them in `docs/UPSTREAM.md`. Review upstream updates deliberately; no automated merges into production.
- The fork is Argentina-only at the product layer. A small country policy module is useful; full Spain/Argentina product compatibility is not a v1 obligation.

### Proposed modules and responsibility map

Paths below are planned, not already implemented.

| New or changed path | Responsibility |
|---|---|
| `config/project.json` | Owner/repository identity, public origin, product name, target country, locale, telemetry disabled |
| `data/registry/companies.json` | Stable employer identities and aliases; independent of salary vendors |
| `data/registry/sources.json` | Verified boards, explicit query plans, terms review, enabled adapter, allowed hosts |
| `data/registry/overrides.json` | Reviewed evidence-backed job decisions, bound to content and expiry |
| `data/registry/removals.json` | Approved source/job/content tombstones, versioned independently of crawl success |
| `data/taxonomy/roles.json` | Small reviewed tech-role vocabulary, decoupled from salary taxonomy |
| `lib/jobs/{schema,registry,normalize}.js` | Canonical schemas and validation, stable identity, normalized evidence |
| `lib/jobs/{geography,eligibility,compensation}.js` | Argentina logic, unknown handling, scoped pay |
| `lib/jobs/{lifecycle,snapshot,search}.js` | Reconciliation, generation validation and shared search |
| `lib/ats/sources/{greenhouse,lever,ashby}.js` | Initial contract-compliant adapters; preserve source metadata |
| `lib/ats/sources/{normalize,sourceValidation,http,sourceRedirects}.js` | Eliminate lossy/inferred values on new path; strict payload and URL controls |
| `lib/ats/sources/{ashbyCompensation,ashbyLocations}.js`, `ashbyHosted.js` | Keep all location/pay scopes and country metadata; disable automatic hosted-HTML fallback in v1 |
| `lib/ats/sources/registry.js` | Explicit allowlist and result-envelope support for enabled adapters |
| `scripts/{validate-registry,crawl-jobs,build-job-site,check-snapshot,review-jobs}.mjs` | Separate validation, crawling, publication and review commands |
| `api/mcp.js`, `scripts/mcp-stdio.mjs` | Job-only tool surface sharing `lib/jobs/search.js`; no old data fallbacks |
| `web/jobs/{app.js,style.css}` | Lightweight job list and evidence panels; no salary-map dependency |
| `.github/workflows/{ci,crawl,deploy}.yml`, `vercel.json` | Offline PR tests, trusted scheduled crawl, snapshot-only build and pinned deployment |
| `api/{star,stars}.js`, `api/_track.js` | Remove legacy public handlers/telemetry from deployed function inventory |
| `tests/jobs-ar/`, `tests/fixtures/ar/`, `tests/site/` | Unit, contract, lifecycle, transport and browser coverage |
| `docs/{ELIGIBILITY,DATA_SOURCES,OPERATIONS,UPSTREAM}.md` | Public methodology, sourcing review, runbook and divergence log |

Retire or isolate the production references to `scripts/site.py`, `scripts/boards.mjs`, `presets/spain.js`, `data/data.json`, `data/companies/`, `scripts/fetch_spain.py`, salary SEO and offer-history workflow. Keep appropriate original license/provenance and regression evidence. Do not fabricate an Argentina-shaped salary `data.json` merely to keep old code working.

`api/_classify.js` mixes reusable text/role matching with Spanish region data. Extract reusable title/keyword matching into the new job domain and replace geographical lookup with country-qualified Argentina locations. Preserve tested behavior for generic titles; unknown seniority must not silently become mid-level.

## 4. Data contracts

All public envelopes include `schema_version`, `generation_id`, `generated_at`, `producer_code_sha`, `registry_hash`, `rules_version`, `removal_policy_version`, `freshness_policy` and `target_country: "AR"`. Consumers reject unsupported versions, mismatched target countries and mixed generations. Changing the schema requires migration fixtures or an explicit rebuild, not silent coercion.

### Employer

- `company_id`: immutable project-owned identifier, never a display name or Levels.fyi slug.
- `name`, `aliases`, `website`, `careers_url`.
- `company_type`: product, services, recruiting, other, unknown; do not imply quality from this field.
- `verification`: employer-owned evidence URL, checked timestamp, reviewer and status.
- `hiring_policies[]`: scope, evidence, checked date and expiry. These are background context, not proof a particular posting accepts Argentina.

### Source / board

- `source_id`, `company_id`, `ats`, `board`, `region`, `enabled`.
- `canonical_board_url`, `ownership_evidence_url`, `verified_at`, `review_due_at`.
- `inventory_plan`: v1 is one audited unfiltered inventory per source, with plan hash and explicit empty query/country facets; empty never means a hidden Spain default. Multi-query plans are deferred.
- `allowed_hosts`, request/page/detail/time caps and adapter contract version.
- `coverage_scope`: audited full-board inventory in v1; incomplete or unproven coverage is reported, never represented as exhaustive.
- `permission_review`: URL/terms reference, reviewed date, allowed retrieval/publication scope, reviewer; disabled pending review.
- A valid board with zero current jobs remains a valid source. Do not require active Argentina jobs to retain it.
- Shared corporate boards are crawled once; verified brand-to-company mappings assign jobs. Unknown brands retain source owner plus published brand, not an invented employer association.

### Job

- `job_id`: stable hash of canonical source identity and external posting key; query IDs are never part of identity. Source uniqueness includes ATS, hosting region and board. Document per-adapter keys: provider ID where present; otherwise a validated provider posting key from a documented/tested canonical hosted URL, or a source-scoped canonical URL hash with explicit migration handling. Missing trustworthy identity quarantines the record, never merges empty IDs. Preserve raw canonical inputs in the sanitized identity record, subject to the URL policy. Source-ID changes require an explicit alias migration.
- `company_id`, `source_id`, `external_id`, `title`, `url`, `apply_url`.
- `locations[]`: raw text plus nullable country/province/city and evidence; do not flatten offices into one winning country.
- `location_options[]`: each option has an ID, locations, workplace (remote/hybrid/onsite/unknown), eligibility, restrictions and applicable compensation references. Use one option only when source semantics genuinely describe one. Posting-level values are summaries, never sufficient for option-sensitive filtering.
- `employment_relationship`: employee, contractor, unknown. Separate `schedule_type`: full_time, part_time, internship, temporary, unknown. Full-time is not proof of employee status.
- `roles[]`, `role_scope` (in_scope/out_of_scope/unknown), nullable `seniority`; required-experience and language fields are optional enhancements, populated only from explicit evidence and not launch blockers.
- `eligibility`: status, scope, reason codes, evidence references, requirements, unresolved conflicts, evaluated timestamp and rules version.
- `compensation[]`: range min/max, nullable currency/period, base/bonus/equity/unknown component, gross/net/unknown basis, geographic scope, employment scope, source kind, applicability to Argentina and evidence reference.
- `posted_at` nullable and provenance (published/updated/estimated); never pretend an updated date is original posting date.
- `first_seen_at`, `last_inventory_seen_at`, `last_attempted_at`, `last_eligibility_verified_at`, `content_hash`, `status`, `missing_since`, `missing_complete_runs`, `closed_at` and `reopened_at` nullable. Compensation evidence has its own observed/verified timestamp.
- `inventory_complete` is per source/run; `eligibility_evidence_complete` and `compensation_enrichment_status` are per job. Completeness refers to required semantics, not whether a separate detail endpoint was called. A complete listing payload can fully verify eligibility; optional pay enrichment cannot change that. Missing required evidence yields unknown/unverified rather than permissive eligibility.

### Evidence and overrides

Evidence contains `source_url`, `field_path` or short text excerpt, observation timestamp, content hash, assertion type and scope. Extract only short relevant excerpts, remove contact information, and do not publish entire descriptions or recruiter personal details. For very small or unclear evidence, link to the source instead of asserting certainty.

An override contains job ID, content hash, corrected structured fields/eligibility, reason, source evidence, reviewer, review date and expiry (default 30 days). A material location/requirements/pay change or expiry invalidates the override and reopens review. An override cannot promote a listing using only company reputation. Every decision is traceable.

Full job descriptions/raw responses may be processed in memory or an ignored local `.cache/raw/` directory, cleared at run completion and bounded to a 24-hour cleanup TTL after interruptions. Never upload that cache through Actions cache/artifacts, commit it or serve it. Sanitized, permitted fixtures are separate test assets. Public-repository Actions artifacts are not private storage. Apply an allowlist-based persistence boundary to every emitted field, report and log: structured issue codes instead of arbitrary exceptions/bodies; only reviewed URL query parameters needed for a canonical public posting; no credentials or tracking/contact query values. Withhold questionable excerpts rather than claiming regexes can identify every person or contact. Regex masking is defense-in-depth only.

## 5. Argentina eligibility policy

### Status meanings and default presentation

- **confirmed**: the posting explicitly names Argentina as an allowed work/residence location, or an Argentina onsite/hybrid work location; no unresolved contradictory restriction. This means geographic match, not personal hiring approval.
- **likely**: a broad LATAM/South America/Americas/worldwide remote scope plausibly includes Argentina, but no posting-specific Argentina confirmation. Display the reason and need to verify.
- **unknown**: insufficient evidence, contradictory structured/text fields, unresolved employment-location constraints, missing details or generic remote wording.
- **ineligible**: explicit applicable restrictions exclude working from Argentina or require a foreign office/residence incompatible with the selected scope.

Default discovery shows confirmed and likely, visibly distinguished. A `confirmed_only` filter is available. Unknown is opt-in in a separate section; ineligible is kept for diagnostics/review but never returned as a recommended alternative. Broad regional wording is not advertised as confirmed.

### Decision sequence

1. Parse workplace and each actual job location separately from employer addresses and corporate boilerplate.
2. Collect candidate residence/hiring scope, explicitly allowed and excluded countries, authorization requirements, foreign-office attendance and schedule/travel conditions from structured fields and relevant text.
3. Apply explicit posting-specific exclusions to the relevant location option. An unambiguous exclusion of Argentina defeats generic global/region language. If contradictory specific evidence cannot be scoped, classify unknown and queue review.
4. Evaluate multiple location options independently: one valid Argentina option is sufficient unless a global requirement rules it out. A New York office beside a remote Argentina option does not disqualify the latter.
5. For onsite/hybrid, confirm only an identified Argentina job location. Remote work for a foreign office with mandatory foreign attendance is not Argentina-remote. Occasional travel is a disclosed requirement, not automatically a foreign-residence requirement.
6. Remote Argentina explicitly named -> confirmed; broad inclusive scope -> likely; bare remote -> unknown. Explicit country lists excluding Argentina -> ineligible when the list is clearly exhaustive.
7. Work authorization and citizenship requirements remain explicit candidate-dependent requirements. If they imply foreign residency that conflicts with Argentina, reject; if their implications are ambiguous, downgrade to unknown. Do not infer the user's citizenship or authorization.
8. Apply valid reviewed overrides, preserving original machine decision and reasons.
9. Apply freshness separately. Eligibility does not imply that an old posting is still open.

### Technology-role scope and option-aware filtering

V1 includes software engineering, QA/test engineering, data/ML/AI, platform/DevOps/SRE, security engineering, technical architecture, product management, UX/product design and explicitly technical support/solutions engineering. Generic sales, recruiting, HR, finance and operations roles are out of scope, even at technology companies. Unknown titles are reviewable but excluded from default tech results; this is separate from geographic uncertainty. Keep the taxonomy small and versioned.

Remote/city/province/eligibility/pay constraints must be satisfied by the **same location option**. Argentina onsite plus US remote cannot match Argentina-remote. Remote Argentina plus US hybrid may match only the Argentina option and its pay. Use country-qualified city IDs and distinguish CABA from Buenos Aires province; ambiguous place names remain unknown.

### Required regression cases

- `Buenos Aires, Argentina` onsite -> confirmed local, never remote.
- `Córdoba, Argentina` vs `Córdoba, Spain`; ambiguous `Córdoba` -> unknown country.
- Structured `country=AR` -> Argentina; free-text `AR` without context -> ambiguous, not automatically Argentina or Arkansas.
- `Remote — Argentina` -> confirmed unless contradicted by a specific restriction.
- `Remote — LATAM`, `Remote — South America`, `Remote — Americas`, `Worldwide remote` -> likely when unrestricted.
- `Remote` -> unknown; `Remote — US only` and `Remote — Brazil only` -> ineligible.
- `LATAM (Mexico and Colombia only)` -> ineligible.
- `Worldwide except Argentina` -> ineligible.
- US-hours overlap without a US-residence requirement -> schedule condition, not US-only eligibility.
- Employer headquartered in the US with explicit Argentina-remote position -> confirmed.
- Generic Argentina office in corporate footer without Argentina job scope -> not confirmation.
- Ashby `isRemote=true` plus `workplaceType=Hybrid` -> hybrid; missing/unknown workplaceType stays unknown unless explicit posting evidence resolves it. Bare isRemote is not proof of fully remote.
- Ashby primary postal-address and secondary direct-address `ARG` values normalize to Argentina independently; raw country values remain available.
- Lever documented `on-site` maps to canonical `onsite`; unknown provider enums remain unknown.
- Non-tech roles are excluded by role scope; remote-AR/hybrid-US and onsite-AR/remote-US option-cross-contamination tests pass.
- Remote text plus weekly mandatory attendance in Madrid -> ineligible for Argentina-remote.
- Argentina role with mandatory occasional travel -> retain and disclose travel.
- Multi-location Argentina/US role -> evaluate per option and preserve location-specific pay.
- Conflicting job title, structured country and description -> unknown/review unless explicit scoping resolves it.
- Negated phrases such as `not restricted to the US` must not trigger US-only rejection.
- Spanish wording: `remoto desde Argentina`, `residir en`, `excluye Argentina`, `presencial`, `híbrido`.

IANA timezone identifiers may be stored for a stated schedule; do not equate a matching UTC offset with hiring eligibility. No automatic schedule compatibility score in v1 unless a date-aware implementation and fixtures cover daylight-saving changes.

## 6. Compensation policy

- Employer-stated pay only in v1. Unknown pay remains searchable when no pay filter is applied.
- Retain original amount, currency, period, component and applicable geography; do not select the highest or first range across countries.
- A bare `$` is ambiguous. Missing currency, missing interval, malformed ranges, US-only bands on worldwide jobs and ambiguous multi-tier summaries cannot satisfy an Argentina salary filter.
- Never default missing values to USD or annual. Fix both normalization and adapter-local defaults.
- For Greenhouse, verify the documented detail endpoint's pay-transparency support; do not assume the listing endpoint provides all bands. Detail failure can leave pay unknown without deleting a valid job.
- For Ashby, retain all structured tiers and their titles; only a range with justified Argentina applicability participates in pay filtering. Do not use the existing summary fallback as proof.
- A clear single global range on a geographically matched job may be applicable; an unscoped band whose applicability cannot be established stays unverified.
- Descriptive pay parsing may expose an evidence snippet, but only validated explicit currency/period/base-pay extraction can become filterable. Do not introduce heuristic annualization.
- Initial pay search uses `{currency, period, component, basis, min_amount, threshold_mode}`. Currency and period are required when min_amount is supplied; component defaults explicitly to `base` and basis to `gross`. Unknown basis never silently becomes gross: an explicit separate `basis=unknown` query can include it with a warning. Validate finite nonnegative amounts and supported currency/period/component/basis values. Default `threshold_mode=lower_bound` requires an explicit lower bound at or above the threshold. Optional `range_reaches` compares an explicit upper bound and labels that weaker match. Unknown/non-applicable ranges are excluded with a count.
- Each result identifies the exact eligible option and range that satisfied the pay tuple; display other bands as separate scoped information, never select the highest as a promised offer. This conservative basis/applicability rule reduces pay-filter coverage and the UI must say so. Compare salary amounts only within an identical currency/period/component/basis tuple. No cross-currency sorting. Employee/contractor filters remain separate; unprovided relationships remain unknown.
- Default ranking is textual relevance, eligibility certainty, freshness and stable ID, not unsupported compensation estimates.

No ARS/USD conversion, inflation adjustment, benefits valuation, tax/net-pay advice or assumed extra salary payments in v1.

## 7. Crawl contract, identity and lifecycle

### Adapter envelope

For enabled sources, the adapter contract must return an envelope rather than an unqualified job array:

```text
{ source_id, inventory_id, jobs, observed_ids,
  inventory_complete, required_evidence_failures, optional_enrichment_failures,
  truncated, coverage_scope, inventory_plan_hash, run_id,
  attempted_at, completed_at, status, issues, request_count }
```

`status` distinguishes complete, partial, throttled, blocked, invalid_payload and failed. `observed_ids` includes listed jobs whose required evidence could not be refreshed. Track eligibility-evidence success and optional pay success separately from inventory status. Optional pay failure neither hides a freshly verified job nor prevents absence reconciliation for unrelated IDs. End-of-pagination is validated; reaching a cap is partial, not complete. A 200 response missing the expected array is invalid payload, not a valid empty board. A valid empty array on a verified source is a complete empty observation.

A compatibility wrapper around old adapters returning arrays cannot assert completeness unless that adapter has been audited and tested. Production allowlist enforcement prevents unreviewed adapter types from silently joining the crawl. The initial Ashby transport is the public posting API only: disable inherited API-404-to-hosted-HTML fallback; 404 triggers source review. Hosted HTML would require a separately approved contract, terms review, budgets and fixtures. Validate listing visibility and never publish confidential/unlisted records. For Lever, verify documented skip/limit and response semantics before claiming one request is exhaustive; lack of pagination code alone proves neither truncation nor completeness. Normalize provider country formats (documented alpha-2/alpha-3/names) and provider workplace enums explicitly, preserving raw values.

### Collection behavior

- Start with full-board retrieval for Greenhouse/Lever/Ashby where their contracts support it. Add bounded detail requests only when necessary.
- Apply eligibility after collection, not as a country query that drops worldwide/region-remote jobs.
- V1 supports a single audited unfiltered full-board inventory per source; multi-query collection/reconciliation is deferred. A country-only AR query or Argentina/regional/global query union does not prove exhaustive remote coverage.
- A later multi-query adapter must version its plan and document whether the union is exhaustive. Positive sightings win across queries; absence-based closure requires all relevant queries in a proven exhaustive union to complete in the same run. Moving between scopes, failed queries and plan changes must not create false closures. If exhaustiveness cannot be established, report observed-scope coverage and use stale/expired-unverified instead of source-wide absence closure. No speculative query algebra is required for v1.
- Enforce actual-destination-host concurrency, including redirects and detail hosts; the current top-level host queue alone is insufficient if adapters cross hosts. Start with one in-flight request per host, a minimum one-second interval, bounded exponential backoff respecting Retry-After, and a configurable global concurrency limit.
- All requests have timeout and response-size caps. A shared abort signal cancels requests on run deadline, and late completions cannot mutate a published generation.
- 401/403/captcha/login blocks are operational failures; do not bypass them or turn them into empty boards. No candidate or employer credentials in the crawler.

### Stable identity and deduplication

Use the per-adapter source/posting identity contract above, independent of filters, title and currency. Normalize URLs only with documented tested rules; preserve source IDs exactly. A posting without a usable ID but with a stable canonical provider URL has an explicit URL-derived identity; otherwise quarantine it. Deduplicate duplicate query sightings by stable job ID. Cross-board duplicates are linked only with explicit requisition/canonical-link evidence; do not merge merely matching titles and erase distinct countries/contracts. Suspected duplicates can be labeled without discarding records.

### Lifecycle state machine

- New successfully read job -> `open`; retain first_seen on later sightings.
- Listed ID with failed required eligibility evidence -> retain the last known job as stale/unverified, not closed; never refresh old eligibility timestamps merely from an ID sighting. A new ID lacking required evidence gets a minimal unverified record, not invented fields. Complete listing-provided evidence counts as verification even without a detail request. Pay-only enrichment failure leaves fresh geographic eligibility intact.
- Missing after one complete audited full-board inventory -> `missing`; hide from default results pending confirmation. The inventory may be complete despite required-evidence failures on other observed IDs; those failures cannot close the observed IDs but do not prevent reconciliation of truly absent ones.
- Missing after two complete observations at least 24 hours apart -> `closed`, with a closure reason. Closure means no longer observed in that source, not proof of employer outcome.
- Partial, capped, failed or changed inventory plans never increment missing counters. Replaying the same run_id is idempotent and cannot increment absence twice.
- A board 404 is a source failure requiring review, not automatic closure of all its postings. A verified individual posting explicitly closed can close that job immediately.
- On source failure, retain previous records for at most seven days since `last_eligibility_verified_at`, flagged stale. Default search excludes stale records; opt-in may include them only inside the retention window. Optional pay failure does not trigger this geographic-staleness rule.
- After the retention window, remove from active results without claiming confirmed closure; use `expired_unverified`.
- Disabled/taken-down sources leave all controlled public surfaces through the removal-only publication path below, independent of crawl success; carry-over and rollback cannot resurrect them.
- A posting that reappears preserves identity and first_seen, clears missing counters, records reopened_at and reevaluates evidence.

### Effective freshness at read time

Versioned defaults: `fresh_for_hours=48`, `unverified_retention_days=7`, measured from last_eligibility_verified_at. At 48 hours without verification, effective state is stale even if the saved status says open; at seven days it is expired_unverified. Explicit required-evidence failure may mark stale sooner. Unknown/malformed/future timestamps are rejected or unverified, never fresh. Missing/closed/disabled/expired records cannot be made recommended by include_stale.

Capture one now per response and apply the same effective policy to search, get_job, counts, filters and browser rendering; get_job may explain a closed/expired record but never recommend it, and removed content must not be returned. Static JSON includes evidence-valid-until and expiry timestamps and states that stored statuses are as-of generation. Avoid permanent pre-rendered fresh claims; refresh the browser on visibility/resume and timer boundaries. Pay evidence freshness is independent: v1 uses the same 48-hour freshness interval measured from each pay range's verified timestamp, and stale pay cannot satisfy current pay filters. A pay refresh cannot refresh eligibility or vice versa.

Use fake clocks to test just-before/at both age thresholds, a stopped scheduler, rejected-generation last-good data, a resumed browser tab and direct get_job; no sleeping in lifecycle tests.

## 8. Persistence, publication and deployment

### Initial storage design

Use a dedicated `job-data` branch for sanitized canonical state and generated public snapshots. Main holds code, registry and tests. This deliberately avoids a database service and keeps the pilot reproducible.

Branch contents: manifest, current normalized state (including lifecycle/run IDs and inventory-plan identity), public jobs snapshot and board-health report. Code/data publication records distinguish producer code from serving code. No raw payloads, full descriptions, CVs, email addresses, authorization data or credentials. Store only publication-approved evidence excerpts. Closed/expired state is retained for 90 days in the current state file; active records preserve first_seen indefinitely. Git history is not a deletion mechanism: sensitive content must never enter it. A documented takedown process must cover public deployment caches and historical Git objects when required.

Growth is monitored monthly; JSON or Git exceeding practical clone/build budgets triggers a separate object-storage migration decision, not an unplanned dependency now.

### Trusted scheduled workflow

1. Check out an exact main SHA and record registry/rules hashes. Only trusted default-branch/manual/scheduled jobs receive write/deploy permissions.
2. Read a validated prior state pinned to a data-branch commit, or use an explicit bootstrap empty state. No fallback to upstream Spanish production.
3. Crawl into a temporary generation, reconcile and validate schemas, country, totals, identity uniqueness, link safety and evidence.
4. Hold ordinary publication on structural invalidity, zero successful sources or suspicious complete-source disappearance; preserve the last valid production snapshot and emit a failing alert. Never commit structurally invalid state. A schema-valid candidate held only by quality gates may be retained as sanitized, explicitly unpromoted candidate state; it is not the default prior reconciliation base. On retry, reconcile from the last accepted state with unique run IDs. Removal-only publication is exempt from availability/drop gates, not structural/privacy validation.
5. Initially hold if more than 20% of enabled sources fail, or active results drop by more than 30% without an explained registry change. Thresholds are configurable and recorded; a maintainer may approve a reviewed override tied to the generation, never disable validation generally.
6. Write complete sanitized generation files atomically and commit to job-data using compare-and-swap against the starting data commit. On conflict, refetch and recompute reconciliation against the newly accepted state, or abort and retry once as a fresh run; never force-push or rebase precomputed lifecycle JSON. Build using an explicit data commit and serving code SHA; producer code remains recorded separately.
7. Deploy the immutable build. Read back the deployed manifest plus a known job and query to verify generation match before marking the release healthy. Maintain a durable protected release record in a separate release-state branch (only the trusted coordinator may write it): producer_code_sha, serving_code_sha, data_commit, generation_id, schema/rules/registry hashes, removal_policy_version, validation outcome, deployment handle and health timestamp. Update releases/<release_id>.json and healthy.json with compare-and-swap only after read-back smoke passes. Each promotion has a monotonically increasing release sequence; an explicit rollback is a new sequence pointing at a safe older code/data pair, not an accidental stale promotion. No credentials are stored there. Latest data commit is not the healthy pointer.
8. If deployment or post-switch smoke fails after data commit, do not claim production healthy. Retry the exact compatible pair once; otherwise restore the last-healthy release using the current removal policy. An older artifact may be reused only if it enforces that same policy; otherwise rebuild the old compatible code/data pair with current removals. Record failure and keep the healthy pointer unchanged. Data branch advancement alone is not deployment success.

Serialize production mutation through a single coordinator or a non-nested shared publication lock; never hold the lock while awaiting a child that needs it, and never cancel an active publication. Compute can happen outside the lock; CAS and current code/removal checks inside it remain authoritative. Queue serialization is not a promise every scheduled run executes. Old queued workflow runs must check source revisions before promotion so they cannot roll production back accidentally. Code-only deploys require an explicit data SHA and declared schema/rules/registry compatibility; eligibility-affecting changes require a new validated generation, and recrawl if retained structured evidence is insufficient. No silent deployment of old decisions under new rules. PR previews use fixture data with no write secrets, no production promotion and no live-source access by default.

### Removal policy outranks ordinary publication gates

Approved source/job/content tombstones have a monotonic removal_policy_version. A removal-only command applies current tombstones to the last-good snapshot and publishes without needing any successful crawl or passing the result-drop threshold. All promotions, code-only builds and rollbacks apply current removals, checked again under the publication lock. A withdrawal that cannot be safely filtered triggers temporary unavailability of the affected surface, not continued exposure.

Protect old deployment URLs from public access or revoke/delete affected immutable deployments, purge operator-controlled caches and remove affected current/history artifacts under the takedown runbook. Old downloaded public snapshots cannot be recalled; disclose that limit. Test removal while every board fails, removal exceeding the drop gate, rollback to older code and direct access to retained deployment URLs. Search, get_job and downloadable JSON must not restore removed content.

### Delivery surfaces

Vercel remains the proposed hosting target because the repository already uses it; do not provision an account or project without owner approval. Crawl on GitHub Actions, not inside a serverless request or ordinary site build. Replace vercel.json buildCommand with snapshot-only generation, fail closed if the approved snapshot is absent, remove ingest/star rewrites, and remove api/star.js and api/stars.js from deployed functions. Assert a route/function allowlist including direct legacy handler URLs; removing UI links alone is insufficient. Replace crawler User-Agent identity/contact. Pin Vercel CLI instead of inheriting `vercel@latest`.

Bundle the exact public snapshot with both static pages and MCP deployment. MCP should load bundled/local data through an injected loader, not derive an upstream fetch target from the untrusted request Host header. Snapshot updates deploy a new generation. Stdio takes an explicit file or configured trusted origin; no indefinite cache of a mutable file, and no fallback to the original site.

Every response includes generation and freshness. A last-good snapshot may be served during an outage, but freshness filtering uses current time on read so old static records cannot remain indefinitely 'fresh'. The browser and MCP implement the same freshness policy.

## 9. Search, MCP and website behavior

### Shared query engine

A pure `searchJobs(snapshot, query, now)` function is used by the browser bundle and MCP. It validates filters and returns applied filters, results, counts, excluded-unknown counts, freshness information and a stable cursor.

- Filter parameters: text, company_id, roles, seniority, workplace, province/city, eligibility states, employment relationship, stated-pay tuple, include_stale, exclude_ids, page size/cursor.
- Unknown is a real value, not a synonym for mid-level, employee, USD or worldwide.
- Exact city/province requests remain exact. Zero matches may produce suggestions, but never silently relax geography, eligibility or compensation.
- Cursor is bound to generation, canonicalized query hash (sorted sets and explicit defaults), a search-time context and removal-policy version; maximum lifetime is ten minutes. Use a stable keyset and frozen ranking time only within that lifetime. If a freshness/expiry/removal boundary changes the eligible set before the next page, return restart-needed rather than serving records using old time or silently skipping/repeating them. Changed generation likewise requires restart. Test unchanged generation with a clock threshold crossing between pages.
- `total`, `returned`, `has_more` and grouped counts come from the same filtered set. If grouping is added later, retain per-posting IDs and per-location evidence.
- Inputs and output sizes are bounded. Default page size 20, maximum 100; exclusion lists are capped and invalid cursors rejected.

### MCP v1 tools

- `find_jobs`: shared search.
- `get_job`: one indexed job with evidence, requirements, pay and canonical application link; no live arbitrary-URL fetch.
- `list_filters`: values in the actual index plus known taxonomy, not salary aggregate dimensions.
- `source_status`: public freshness/coverage summary, without internal secrets or raw errors.

Do not register `salary_stats`, `top_companies`, `company_salaries`, `job_questions`, `application_guide` or `report_application` in v1. Return an unsupported-tool error for old names rather than stale Spain behavior. Application-form reading may be a later separately scoped feature.

Preserve the useful transport implementation only after protocol-focused tests: initialize, notifications, tools/list, tools/call, validation errors, malformed JSON, body limits, unsupported protocol versions and content types. Pin a supported released protocol version during implementation instead of trusting inherited version strings or a draft specification. Test at least two independent MCP clients locally.

For HTTP, validate Origin against configured application origins when present; document no-Origin native clients. Bind any local HTTP development server to loopback. Public anonymous read-only access is an explicit product decision with rate limits and body limits, not an inherited unrestricted endpoint for arbitrary network access. No authentication-dependent tools in v1.

### Website

- Clear tabs/filters for Argentina local and remote-from-Argentina; confirmed vs likely badges and an opt-in unknown section.
- Job cards show employer, role, raw location, workplace, relationship when known, stated pay, eligibility rationale and last verified date.
- Evidence panel shows source statements, remaining restrictions and links; never call a likely match 'verified Argentina'.
- Sorting explained; no unsupported 'top-paying' claim.
- Mobile layout, keyboard operation, labelled controls, accessible focus, empty/degraded states and date formatting.
- Direct application link opens the employer's page. No application data passes through this project.
- Public methodology, correction/takedown instructions, source coverage and operator/privacy information.
- Remove upstream analytics, star prompts, identity, contact details, social cards, registry metadata, skill instructions and original domain defaults from active runtime. Preserve attribution in a dedicated notice rather than impersonating upstream.

## 10. Security and operational safeguards

- Only reviewed source records are fetched. Public requests cannot supply fetch URLs, headers, board tokens or private credentials.
- Validate HTTPS URLs, adapter-specific board formats and exact allowed hostnames before the first request and every redirect. Reject userinfo, custom ports, localhost, private/link-local/metadata destinations and unsafe schemes. Validate DNS results or enforce an equivalent egress policy to address resolution changes; string-only host checks are insufficient.
- Separate list/detail/apply URLs. Rendering an outbound application link does not authorize the server to fetch it. Sanitize links and escape all untrusted text; no job HTML via innerHTML.
- Treat descriptions and evidence as untrusted content, not agent instructions. MCP output marks excerpts as source data and never embeds application directives from postings.
- Enforce bounded redirects, response bytes, time, requests and concurrent hosts. Honour source terms and applicable robots policies; stop on access controls rather than bypassing them.
- Logs use an allowlist of source IDs/status codes/counts, not arbitrary exception messages/stacks, serialized response bodies, URL credentials, applicant data or raw tool requests. Apply the same output boundary to current state, review queues, CI summaries, generated HTML and MCP. Seed email/phone/token/person-name canaries in unapproved input fields and assert none leak through stdout/stderr, snapshots, artifacts or public responses. Tests demonstrate covered cases, not universal PII detection. Telemetry defaults off and inherited tokens/ingest rewrites are removed. Document hosting-provider access-log retention separately; no-app-telemetry does not mean no hosting logs.
- GitHub permissions default read-only; narrow write permissions to trusted data publication and deployments. No `pull_request_target` execution of contributor code with secrets. Pin actions and dependency versions.
- Remove inherited release/registry workflows from active execution until intentional setup. Public MCP registry submission is a separate approval step.
- CI network-denial tests verify fixture builds cannot contact upstream production, analytics or live boards.
- Kill switches: disable a source, disable crawl, stop publication, roll back production. A source removal is applied before stale carry-over and validated with a regression test.

## 11. Implementation sequence and acceptance gates

Each stage should be a small reviewable PR, splitting adapter work further if needed. No stage is complete just because its files exist.

### P0 — Fork hygiene and reproducible baseline

**Dependencies:** implementation approval; GitHub owner only needed for remote publication.

Tasks: create isolated local worktree from reviewed/revalidated upstream SHA; preserve notices; record baseline; introduce identity configuration; disable production schedules, release and MCP registry publication; remove inherited telemetry/live-data fallback and routable api/star.js/api/stars.js handlers from the active deployment; inventory vercel.json/function bundles and User-Agent identity; add Node toolchain pin and unified commands. Keep original baseline tests runnable until intentional replacement is documented.

**Acceptance:** clean checkout installs with lockfile; baseline commands reproduce or environment deviations are documented; no external write during fixture CI; active new-runtime output has no accidental upstream origin/analytics token; no remote fork/push unless explicitly approved.

### P1 — Registry, contracts and fixture-first domain

**Dependencies:** P0.

Tasks: employer/source/job/evidence/snapshot schemas; registry validation; stable IDs and aliases; role taxonomy; country-aware geography; fake-clock test harness; sanitized fixtures including all eligibility cases; source allowlist.

**Acceptance:** invalid/duplicate identifiers and unsafe source URLs fail; zero-job company needs no salary row; target country and generation checks enforced; hypothetical fixtures visibly identified as fixtures; schema migration example tested.

### V0 — Local vertical slice and source-feasibility checkpoint

**Dependencies:** P0–P1. This intentionally borrows the minimum pure/local pieces of P2–P5, rather than waiting for full infrastructure.

Tasks: one explicitly synthetic Greenhouse fixture -> canonical job/options -> Argentina eligibility -> local-file lifecycle reconciliation -> pure search. No live sources, data-branch writer, scheduler, MCP transport, browser, secrets or remote writes. Tests cover one accepted, one excluded and one unknown case plus replay/idempotence and clock expiry.

In parallel, perform a source-feasibility research checkpoint: identify potential boards and document supported transport, ownership/permission status and likely local/remote coverage. Any actual endpoint smoke requires an approved source; URL research is not a live crawl. Record unavailable/disallowed sources and ATS gaps; do not lower eligibility rules to reach a count. Re-estimate scope/effort before committing to the 30-board public qualification.

**Acceptance:** a fresh local checkout runs the fixture pipeline end to end and returns expected IDs and evidence; optional pay failure does not hide eligible jobs; repeated input does not double-count absence. No remote activity. The source feasibility report distinguishes candidates from approved boards and does not claim Argentina job coverage without evidence.

### P2 — Initial adapters and data preservation

**Dependencies:** V0.

Tasks: adapt Greenhouse, Lever and Ashby to explicit complete/partial envelopes; strict payload validation; preserve country/location/description evidence and all pay bands; remove currency/period assumptions; bounded detail enrichment; host-safe network client; cap/pagination/timeout handling. Do not enable other adapters just because upstream has them.

**Acceptance:** per-adapter fixtures prove correct mapping, malformed-200 failure, empty-board distinction, detail-failure preservation and cap handling; country/pay metadata is not lost before eligibility; safe redirect and request-budget tests pass; an optional maintainer-run live smoke records a real source URL/date/status without making CI depend on the network.

### P3 — Eligibility, compensation and review

**Dependencies:** P1–P2.

Tasks: deterministic rules, scoped evidence and conflicts, role scope and option-aware filters, structured pay validation, review queue, hash-bound overrides and expiry/invalidation. Manual job ingestion remains deferred.

**Acceptance:** all listed regression cases pass; confirmed never results from bare remote, company-only policy or a US-only restriction; unknown pay never satisfies a threshold; valid overrides are auditable and invalidated by material changes; exclusion/negation tests demonstrate sensitivity to the actual restriction.

### P4 — Crawl orchestration, lifecycle and snapshot store

**Dependencies:** P2–P3.

Tasks: bounded local crawl/run command, prior local snapshot loader, inventory-completeness-aware reconciliation, stale/missing/closed transitions, dedup, inventory-plan identity, schema validation and sanitized report generation. Develop data-branch writer conflict tests against temporary local Git repositories only. Remote persistence, scheduling and production promotion are P6 integrations, not prerequisites for pure search.

**Acceptance:** restart/replay is idempotent by run_id; incomplete inventories/404 boards never mass-close jobs; complete inventory can reconcile absent IDs while retaining observed IDs whose required evidence failed; optional pay failure changes neither inventory completeness nor fresh eligibility; repeated complete absence closes at the specified interval; source disables prevent resurrection; zero-success and threshold failures preserve last-good publication; deadline cancels actual requests; generated totals match parsed records.

### P5 — Read-only search and MCP

**Dependencies:** P3–P4.

Tasks: shared search/ranking, exact filters, generation-bound cursors, explicit compensation tuple, job-only MCP tools, local stdio and HTTP limits/Origin handling, bounded snapshot cache.

**Acceptance:** deterministic test queries return identical job IDs and ordering through direct library and MCP; unsupported salary/application tools fail clearly; generation/cursor mismatch is explicit; clock advances hide stale jobs; protocol tests and two-client local smoke pass; unavailable data is distinguished from zero matches.

### P6 — Website and controlled deployment

**Dependencies:** P4–P5.

Tasks: first finish static UI and local snapshot build; then integrate evidence/source status pages, original branding/attribution, protected preview, authorized remote data-branch writer, trusted scheduled coordinator, generation-pinned Vercel deploy, durable healthy-release record, removal-only publication and safe rollback. Keep local Git conflict tests distinct from authorized remote push.

**Acceptance:** mobile/keyboard/browser smoke tests; browser/MCP parity; HTML injection tests; fixture preview contains no real applicant data; production smoke reads matching manifest/job/query; deployment failure does not claim success; rollback drill restores a verified code/data pair. Hosting credentials/owner approval required here, not before local work.

### P7 — Source curation, shadow run and launch review

**Dependencies:** source discovery can begin after P1; production promotion requires P2–P6.

Tasks: discover 30 approved employer boards; verify ownership and publication policy; label real postings; run seven consecutive daily shadow crawls; review exclusions and unknowns; tune rules through fixtures; publish source coverage and limitations.

**Launch gates:**

- 30 approved sources, including local and international-remote employer coverage; record the actual mix instead of promising a quota without evidence.
- At least 90% of enabled sources produce a complete audited inventory on each of seven daily runs; incomplete inventories are labelled and do not create closures. Optional pay-enrichment failures do not count as inventory failures. Report required-eligibility-evidence coverage separately, including observed IDs with unavailable evidence; those jobs are never silently counted as freshly verified. Material adapter/eligibility changes reset the relevant shadow qualification.
- A held-out evaluation set of at least 100 unique real postings independently reviewed, including at least 50 classified confirmed and examples from likely, unknown and excluded sets, separate from any development/tuning sample. Freeze snapshot/rules version, record sampling seed and strata, use a written rubric and independent labeler or blinded second-pass adjudication. Tune only on a separate development sample and evaluate the held-out set afterward; if the held-out strata are too small, collect more. If unavailable, continue shadow mode rather than claiming validated coverage. A smaller permission-reviewed private pilot is allowed but is not public qualification.
- At least 95% observed geographic precision among the held-out confirmed results; report numerator, denominator, sampling method and confusion matrix, not a population guarantee. Zero known critical false positives involving explicit country exclusions or foreign mandatory office attendance applies to **all default-visible results, including likely**. Likely-label appropriateness is reported separately and is not counted as confirmed precision.
- Review a random sample of excluded/unknown postings to identify false negatives; report the observed miss count and causes, without claiming exhaustive recall beyond the crawled sources.
- No guessed currency/period in filterable compensation; no scoped US-only band presented as Argentine pay.
- Crawl budget initially capped at 60 minutes; actual request count, runtime and hosted usage recorded against owner-approved budget before launch. No price estimate is assumed here.
- Source deletion, blocked board, malformed payload, stale snapshot, deploy failure and rollback drills pass.
- Operator/source permissions, publication identity and hosting budget accepted by the owner.

## 12. Proposed command contract

These commands are implementation targets, not commands claimed to exist today:

```text
npm run validate:registry
npm run test:unit
npm run test:contracts
npm run test:security
npm run test:mcp
npm run test:browser
npm run crawl -- --fixture tests/fixtures/ar/pilot.json --previous tests/fixtures/ar/previous.json --out .cache/ar-run
npm run snapshot:check -- .cache/ar-run
npm run build -- --snapshot .cache/ar-run/public
npm run review -- --snapshot .cache/ar-run
npm run smoke:live -- --source <approved-source-id>
```

Default test/build commands run offline. Live commands require explicit source IDs/allowlists. No command should publish, push, submit applications or use production credentials merely by building the site.

## 13. Test matrix and verification ledger

| Layer | Essential assertions |
|---|---|
| Registry/schema | Duplicate IDs, invalid country/version, unsafe URLs, unavailable employer evidence, no salary dependency |
| Adapter contracts | Sanitized payloads; malformed 200 versus empty; complete inventory with required-evidence/optional-pay failure; Lever pagination and on-site enum; Ashby primary/secondary ARG, missing workplace, visibility and disabled HTML fallback; multi-range pay; budgets |
| Eligibility | Positive/negative/ambiguous cases; country-code collisions; text negation; contradictory evidence; regional scope; authorization versus residence |
| Compensation | Missing $ currency, invalid intervals, negative/reversed ranges, US-only tiers, bonus vs base, employee vs contractor, strict threshold behavior |
| Lifecycle | Complete vs partial absence, missing counters, fake-time windows, reopened IDs, removed sources, query-plan changes, no repeated carry-over freshness reset |
| Publication | Mixed generations, corrupt state, bootstrap, CAS recompute/abort, no force push, code/data compatibility, rule change requiring recrawl, data committed/deploy failed, post-alias smoke failure, monotonic healthy pointer, removal-only publication and non-resurrecting rollback |
| Search/API | Browser/library/MCP parity, same-option geography/workplace/pay, tech-role scope, exact filters, cursor time/generation/removal boundaries, bounded limits, unknown values, honest totals and effective freshness across every read surface |
| Security | SSRF/redirect/DNS policy, XSS, untrusted source text, Origin/body limits, forbidden egress including legacy endpoints, PII canaries across output boundaries, no raw artifact/cache upload, no secrets in PR jobs |
| UI | Keyboard/mobile, status badges, evidence expansion, empty/degraded states, original-currency labels, no automatic external actions |

Use synthetic cases for unit coverage and explicitly labelled, permission-reviewed real-source fixtures for adapter regression. Never present synthetic jobs as a collected pilot dataset. Add regression tests before fixing each newly discovered real false positive. For critical gates, temporarily disable the relevant rule in an isolated test to prove the test fails for the intended reason, then restore it.

For each implementation PR record exact revision, runtime, commands, exit statuses, evidence paths, selected fixtures and live-source scope. A passing fixture suite is not a claim of live ATS reliability. After code changes invalidate affected earlier results and rerun them.

## 14. Maintenance model

- Daily automation: crawl, classify, reconcile, validate, publish or alert; no manual job entry.
- During the pilot: inspect every new confirmed result and ambiguous queue daily to establish trust.
- After launch: sample new confirmed results weekly, review material conflicts, source failures and expiring overrides; correct errors with regression tests.
- Monthly: review source ownership/permissions and crawl costs, source coverage, stale counts, Git growth and upstream changes.
- Keep a named maintainer and backup. If no one can maintain evidence/source failures, reduce enabled coverage rather than advertise a reliable unattended service.
- Community issue template requests employer/job URL and the specific correction; explicitly prohibits CVs, emails, offer letters and sensitive personal information in public issues.

## 15. Effort, decisions and first work package

**Low-confidence engineering hypothesis, not a delivery promise:** approximately 4–6 focused engineering weeks for one experienced maintainer, with curation alongside development, plus the seven-day shadow qualification. Re-estimate after V0 and source feasibility; the sample/source targets may require longer regardless of coding progress. Adapter surprises and source permissions are the largest uncertainties; do not trade eligibility precision for a calendar date. A three-adapter fixture-based vertical slice should precede the public pilot.

Decisions needed before publication, but not blockers to local implementation:

1. GitHub owner and final repository/product name.
2. Public vs private pilot and intended operator/contact.
3. Vercel/GitHub accounts, permission boundaries and monthly usage ceiling.
4. Who maintains the 30-source registry and reviews uncertain cases.
5. Approval of default inclusion of visibly labelled likely matches (confirmed-only remains available).

**Recommended first package once authorized:** P0–P1 and V0. V0 explicitly implements minimal local/pure parts of P2–P5, with no production writer, transport, UI or scheduler. After the slice, complete domain/adapters/local search, then MCP/UI, then authorized branch/deployment integrations and qualification. Passing the slice does not itself authorize live crawling, remote writes or deployment. This keeps the first changes small while proving the architecture end to end.

## 16. Sources and audit trail

Primary repository evidence is pinned to the reviewed revision; line references above refer to that checkout. Source entry points:

- Repository: `https://github.com/pugarte7/spanish-top-tech-companies/tree/2042874594e81fb3eba74f084f7ad0cd0fb05049`
- Upstream methodology: `METHODOLOGY.md`, `CLAUDE.md`, `docs/CONTEXT.md`; prose contains historical rules, so executable code and tests were checked rather than treating every note as current.
- Greenhouse official Job Board API: `https://developers.greenhouse.io/job-board.html` — public GET retrieval, job detail and pay-transparency fields; application POST requires employer-issued authentication and is not in our scope.
- Ashby official posting API: `https://developers.ashbyhq.com/docs/public-job-posting-api` — structured locations, workplace type and compensation; `isRemote` alone is insufficient to distinguish hybrid.
- Lever official public API: `https://github.com/lever/postings-api` — reviewed during audit and checked by the parent; documented on-site workplace enum and skip/limit semantics require explicit normalization and completeness tests in P2.
- MCP published transport reference checked through official search results: `https://modelcontextprotocol.io/specification/2025-11-25/basic/transports` — Origin and local binding safeguards. This plan does not assert that this dated reference is the newest protocol release.

The initial extraction tool was unavailable and one direct Ashby request returned HTTP 403. During audit, direct retrieval succeeded; the parent independently retrieved Ashby, Lever and Greenhouse official documentation with HTTP 200. Ashby primary/secondary country nesting and remote/hybrid ambiguity, Lever on-site enum and Greenhouse individual-job pay-transparency support informed the corrections. Greenhouse documentation was retrieved at https://docs.greenhouse.io/job-board.html. Live employer compatibility, permissions and Argentina coverage remain unverified; documentation access is not a live pilot. Local repository inspection and baseline execution succeeded.

### Independent audit

Completed by an independent subagent against the full draft and pinned source. The audit raised six high-priority and eight medium-priority findings. The parent inspected the cited adapter/legacy-handler/logging code, independently retrieved primary documentation, and applied or explicitly scoped out every finding. See AUDIT.md for the unedited review, AUDIT_DISPOSITION.md for the resolution matrix, and DRAFT_REVIEWED.md for the archived pre-audit draft whose line numbers the report references.

This is a corrected planning artifact, not a claim the auditor reran a second audit or certified unimplemented code. Remaining risks are source permission/coverage, real-world rule accuracy, future adapter changes and measured operating costs. Implementation and public launch have separate acceptance gates.
