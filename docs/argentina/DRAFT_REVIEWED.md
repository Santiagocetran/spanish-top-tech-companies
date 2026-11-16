# Argentina Tech Jobs — implementation plan

**Status:** Complete draft awaiting independent audit. Planning only; no fork, commits, deployment, employer registry or production crawler has been created.

**Working name:** `argentina-tech-jobs` (owner and public name to be approved before publication).

**Source reviewed:** `pugarte7/spanish-top-tech-companies`, `main` at `2042874594e81fb3eba74f084f7ad0cd0fb05049`. Remote HEAD was checked against this revision. Review date: November 16, 2026.

## 1. Decision and product boundary

Fork for provenance and reuse, but build an Argentina-focused, jobs-first product rather than a translated Spanish salary-ranking site. Its promise is:

> Find technology positions located in Argentina or plausibly available to someone residing in Argentina, with explicit evidence and uncertainty about eligibility.

This is geographic eligibility, not a guarantee that an individual meets work authorization, qualifications, employment or immigration requirements. Remote location, employer headquarters and the applicant's citizenship are different concepts.

### First release

- A manually curated employer/source registry; postings are collected and refreshed automatically.
- An initial 30 approved employer boards, selected after source discovery, not invented in this plan.
- Argentina onsite/hybrid positions and Argentina-compatible remote positions, separated by workplace and eligibility confidence.
- Greenhouse, Lever and Ashby as the initial production adapter allowlist. Other adapters remain disabled until their own acceptance contract passes.
- Search by text, company, role, seniority, workplace, Argentina location, eligibility and explicit compensation tuple.
- Spanish-first responsive website; English-ready strings, with English launch optional.
- A read-only MCP interface and downloadable public JSON using the same search logic.
- Evidence, source links, lifecycle status and last successful observation visible for every listing.
- Maintainer review of ambiguous cases and community submissions through GitHub issues/PRs. No account system or admin application initially.

### Explicitly out of scope

Salary leaderboards, Levels.fyi ingestion, currency conversion, estimated salaries, net-pay/tax calculations, candidate accounts/CVs, application submission, application telemetry, email alerts, semantic/vector search, universal ATS coverage, public arbitrary-URL crawling, paid scraping services and a full multi-country framework.

**Manual work means maintaining sources and resolving uncertainty, not re-entering every job.** A submitted job URL becomes a reviewed source/manual record with an expiry; it never bypasses the same validation and eligibility rules.

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
| `data/registry/manual-jobs.json` | Optional URL-only fallback records with review/expiry, no arbitrary runtime fetching |
| `data/taxonomy/roles.json` | Small reviewed tech-role vocabulary, decoupled from salary taxonomy |
| `lib/jobs/{schema,registry,normalize}.js` | Canonical schemas and validation, stable identity, normalized evidence |
| `lib/jobs/{geography,eligibility,compensation}.js` | Argentina logic, unknown handling, scoped pay |
| `lib/jobs/{lifecycle,snapshot,search}.js` | Reconciliation, generation validation and shared search |
| `lib/ats/sources/{greenhouse,lever,ashby}.js` | Initial contract-compliant adapters; preserve source metadata |
| `lib/ats/sources/{normalize,sourceValidation,http,sourceRedirects}.js` | Eliminate lossy/inferred values on new path; strict payload and URL controls |
| `lib/ats/sources/{ashbyCompensation,ashbyLocations}.js` | Keep multiple location/pay scopes, not one legacy-selected summary |
| `lib/ats/sources/registry.js` | Explicit allowlist and result-envelope support for enabled adapters |
| `scripts/{validate-registry,crawl-jobs,build-job-site,check-snapshot,review-jobs}.mjs` | Separate validation, crawling, publication and review commands |
| `api/mcp.js`, `scripts/mcp-stdio.mjs` | Job-only tool surface sharing `lib/jobs/search.js`; no old data fallbacks |
| `web/jobs/{app.js,style.css}` | Lightweight job list and evidence panels; no salary-map dependency |
| `.github/workflows/{ci,crawl,deploy}.yml` | Offline PR tests, trusted scheduled crawl, snapshot-pinned deployment |
| `tests/jobs-ar/`, `tests/fixtures/ar/`, `tests/site/` | Unit, contract, lifecycle, transport and browser coverage |
| `docs/{ELIGIBILITY,DATA_SOURCES,OPERATIONS,UPSTREAM}.md` | Public methodology, sourcing review, runbook and divergence log |

Retire or isolate the production references to `scripts/site.py`, `scripts/boards.mjs`, `presets/spain.js`, `data/data.json`, `data/companies/`, `scripts/fetch_spain.py`, salary SEO and offer-history workflow. Keep appropriate original license/provenance and regression evidence. Do not fabricate an Argentina-shaped salary `data.json` merely to keep old code working.

`api/_classify.js` mixes reusable text/role matching with Spanish region data. Extract reusable title/keyword matching into the new job domain and replace geographical lookup with country-qualified Argentina locations. Preserve tested behavior for generic titles; unknown seniority must not silently become mid-level.

## 4. Data contracts

All public envelopes include `schema_version`, `generation_id`, `generated_at`, `source_commit`, `registry_hash`, `rules_version` and `target_country: "AR"`. Consumers reject unsupported versions, mismatched target countries and mixed generations. Changing the schema requires migration fixtures or an explicit rebuild, not silent coercion.

### Employer

- `company_id`: immutable project-owned identifier, never a display name or Levels.fyi slug.
- `name`, `aliases`, `website`, `careers_url`.
- `company_type`: product, services, recruiting, other, unknown; do not imply quality from this field.
- `verification`: employer-owned evidence URL, checked timestamp, reviewer and status.
- `hiring_policies[]`: scope, evidence, checked date and expiry. These are background context, not proof a particular posting accepts Argentina.

### Source / board

- `source_id`, `company_id`, `ats`, `board`, `region`, `enabled`.
- `canonical_board_url`, `ownership_evidence_url`, `verified_at`, `review_due_at`.
- `query_plan[]`: stable query IDs with explicit query/country facets; an empty query is explicitly unfiltered, never a hidden Spain default.
- `allowed_hosts`, request/page/detail/time caps and adapter contract version.
- `coverage_scope`: full board or documented set of query scopes.
- `permission_review`: URL/terms reference, reviewed date, allowed retrieval/publication scope, reviewer; disabled pending review.
- A valid board with zero current jobs remains a valid source. Do not require active Argentina jobs to retain it.
- Shared corporate boards are crawled once; verified brand-to-company mappings assign jobs. Unknown brands retain source owner plus published brand, not an invented employer association.

### Job

- `job_id`: stable hash of canonical source identity and external posting ID; query IDs are not part of job identity. Persist canonical input for debugging. If source IDs change, use an explicit migration/alias map.
- `company_id`, `source_id`, `external_id`, `title`, `url`, `apply_url`.
- `locations[]`: raw text plus nullable country/province/city and evidence; do not flatten offices into one winning country.
- `workplace`: remote, hybrid, onsite, unknown.
- `employment_relationship`: employee, contractor, unknown. Separate `schedule_type`: full_time, part_time, internship, temporary, unknown. Full-time is not proof of employee status.
- `roles[]`, nullable `seniority`, required-experience range and language requirements, each with evidence where extracted.
- `eligibility`: status, scope, reason codes, evidence references, requirements, unresolved conflicts, evaluated timestamp and rules version.
- `compensation[]`: range min/max, nullable currency/period, base/bonus/equity/unknown component, gross/net/unknown basis, geographic scope, employment scope, source kind, applicability to Argentina and evidence reference.
- `posted_at` nullable and provenance (published/updated/estimated); never pretend an updated date is original posting date.
- `first_seen_at`, `last_seen_at`, `last_checked_at`, `last_complete_seen_at`, `content_hash`, `status`, `missing_since`, `missing_complete_runs`, `closed_at` nullable.
- `source_coverage` and `detail_complete`; missing description produces unknown evidence, not permissive eligibility.

### Evidence and overrides

Evidence contains `source_url`, `field_path` or short text excerpt, observation timestamp, content hash, assertion type and scope. Extract only short relevant excerpts, remove contact information, and do not publish entire descriptions or recruiter personal details. For very small or unclear evidence, link to the source instead of asserting certainty.

An override contains job ID, content hash, corrected structured fields/eligibility, reason, source evidence, reviewer, review date and expiry (default 30 days). A material location/requirements/pay change or expiry invalidates the override and reopens review. An override cannot promote a listing using only company reputation. Every decision is traceable.

Full job descriptions/raw responses may be processed in memory or an ignored local cache but are not uploaded as public artifacts, committed to Git or served by MCP. Sanitized, permitted fixtures are separate test assets. Public-repository Actions artifacts are not private storage.

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
- `isRemote=true` plus `workplaceType=Hybrid` -> hybrid, never fully remote.
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
- Initial pay search uses `{currency, period, min_amount, threshold_mode}` with currency and period required when min_amount is supplied. Default `threshold_mode=lower_bound` requires an explicit lower bound at or above the threshold. Optional `range_reaches` compares an explicit upper bound and labels that weaker match. Unknown/non-applicable ranges are excluded with a count.
- Compare salary amounts only within an identical currency/period/component/basis tuple. No cross-currency sorting. Employee/contractor filters remain separate; unprovided relationships remain unknown.
- Default ranking is textual relevance, eligibility certainty, freshness and stable ID, not unsupported compensation estimates.

No ARS/USD conversion, inflation adjustment, benefits valuation, tax/net-pay advice or assumed extra salary payments in v1.

## 7. Crawl contract, identity and lifecycle

### Adapter envelope

For enabled sources, the adapter contract must return an envelope rather than an unqualified job array:

```text
{ source_id, query_id, jobs, observed_ids,
  list_complete, detail_failures, truncated, coverage_scope,
  attempted_at, completed_at, status, issues, request_count }
```

`status` distinguishes complete, partial, throttled, blocked, invalid_payload and failed. `observed_ids` includes listed jobs whose details failed. End-of-pagination is validated; reaching a cap is partial, not complete. A 200 response missing the expected array is invalid payload, not a valid empty board. A valid empty array on a verified source is a complete empty observation.

A compatibility wrapper around old adapters returning arrays cannot assert completeness unless that adapter has been audited and tested. Production allowlist enforcement prevents unreviewed adapter types from silently joining the crawl.

### Collection behavior

- Start with full-board retrieval for Greenhouse/Lever/Ashby where their contracts support it. Add bounded detail requests only when necessary.
- Apply eligibility after collection, not as a country query that drops worldwide/region-remote jobs.
- Later large-board adapters need explicitly tested query unions (Argentina + regional remote + global) or complete retrieval. A country-only `AR` server filter is not complete remote coverage.
- Reconcile query scopes independently and retain a membership map from jobs to query IDs. Changing query plans resets closure baselines for affected scopes.
- Enforce actual-destination-host concurrency, including redirects and detail hosts; the current top-level host queue alone is insufficient if adapters cross hosts. Start with one in-flight request per host, a minimum one-second interval, bounded exponential backoff respecting Retry-After, and a configurable global concurrency limit.
- All requests have timeout and response-size caps. A shared abort signal cancels requests on run deadline, and late completions cannot mutate a published generation.
- 401/403/captcha/login blocks are operational failures; do not bypass them or turn them into empty boards. No candidate or employer credentials in the crawler.

### Stable identity and deduplication

Use ATS/source/external posting identity, independent of filters, title and currency. Normalize URLs only with documented rules; preserve source IDs exactly. Deduplicate duplicate query sightings by stable job ID. Cross-board duplicates are linked only with explicit requisition/canonical-link evidence; do not merge merely matching titles and erase distinct countries/contracts. Suspected duplicates can be labeled without discarding records.

### Lifecycle state machine

- New successfully read job -> `open`; retain first_seen on later sightings.
- Listed ID with failed detail -> retain last known job as `stale`/detail-unverified, not closed; do not refresh evidence timestamps from old details.
- Missing after one complete observation of every scope that could contain it -> `missing`; hide from default results pending confirmation.
- Missing after two complete observations at least 24 hours apart -> `closed`, with a closure reason. Closure means no longer observed in that source, not proof of employer outcome.
- Partial, capped, failed or changed query scopes never increment missing counters.
- A board 404 is a source failure requiring review, not automatic closure of all its postings. A verified individual posting explicitly closed can close that job immediately.
- On source failure, retain previous records for at most seven days since their last successful detail observation, flagged stale. Default search excludes stale records; opt-in may include them with timestamps.
- After the retention window, remove from active results without claiming confirmed closure; use `expired_unverified`.
- Disabled/taken-down sources immediately leave public results and are not resurrected through carry-over.
- A posting that reappears preserves identity and first_seen, clears missing counters, records reopened_at and reevaluates evidence.

Use fake clocks to test boundary conditions; no sleeping in lifecycle tests.

## 8. Persistence, publication and deployment

### Initial storage design

Use a dedicated `job-data` branch for sanitized canonical state and generated public snapshots. Main holds code, registry and tests. This deliberately avoids a database service and keeps the pilot reproducible.

Branch contents: manifest, current normalized state (including lifecycle/query membership), public jobs snapshot and board-health report. No raw payloads, full descriptions, CVs, email addresses, authorization data or credentials. Store only publication-approved evidence excerpts. Closed/expired state is retained for 90 days in the current state file; active records preserve first_seen indefinitely. Git history is not a deletion mechanism: sensitive content must never enter it. A documented takedown process must cover public deployment caches and historical Git objects when required.

Growth is monitored monthly; JSON or Git exceeding practical clone/build budgets triggers a separate object-storage migration decision, not an unplanned dependency now.

### Trusted scheduled workflow

1. Check out an exact main SHA and record registry/rules hashes. Only trusted default-branch/manual/scheduled jobs receive write/deploy permissions.
2. Read a validated prior state pinned to a data-branch commit, or use an explicit bootstrap empty state. No fallback to upstream Spanish production.
3. Crawl into a temporary generation, reconcile and validate schemas, country, totals, identity uniqueness, link safety and evidence.
4. Hold publication on structural invalidity, zero successful sources or suspicious complete-source disappearance; preserve the last valid production snapshot and emit a failing alert.
5. Initially hold if more than 20% of enabled sources fail, or active results drop by more than 30% without an explained registry change. Thresholds are configurable and recorded; a maintainer may approve a reviewed override tied to the generation, never disable validation generally.
6. Write complete sanitized generation files atomically, commit to `job-data` using optimistic comparison to the starting commit, then build using that exact data commit and exact code SHA.
7. Deploy the immutable build. Read back the deployed manifest plus a known job and query to verify generation match before marking the release healthy.
8. If deployment fails after data commit, do not claim production updated. Retry the exact code/data pair or roll back the production alias to the previous verified build. Data branch advancement alone is not deployment success.

Serialize data writers and production publishers with one shared concurrency policy; never use cancel-in-progress on an active publication. Old queued workflow runs must check source revisions before deploying so they cannot roll production back accidentally. Code-only deploys reuse a validated pinned snapshot without crawling. PR previews use fixture data with no write secrets, no production promotion and no live-source access by default.

### Delivery surfaces

Vercel remains the proposed hosting target because the repository already uses it; do not provision an account or project without owner approval. Crawl on GitHub Actions, not inside a serverless request or ordinary site build. Pin Vercel CLI instead of inheriting `vercel@latest`.

Bundle the exact public snapshot with both static pages and MCP deployment. MCP should load bundled/local data through an injected loader, not derive an upstream fetch target from the untrusted request Host header. Snapshot updates deploy a new generation. Stdio takes an explicit file or configured trusted origin; no indefinite cache of a mutable file, and no fallback to the original site.

Every response includes generation and freshness. A last-good snapshot may be served during an outage, but freshness filtering uses current time on read so old static records cannot remain indefinitely 'fresh'. The browser and MCP implement the same freshness policy.

## 9. Search, MCP and website behavior

### Shared query engine

A pure `searchJobs(snapshot, query, now)` function is used by the browser bundle and MCP. It validates filters and returns applied filters, results, counts, excluded-unknown counts, freshness information and a stable cursor.

- Filter parameters: text, company_id, roles, seniority, workplace, province/city, eligibility states, employment relationship, stated-pay tuple, include_stale, exclude_ids, page size/cursor.
- Unknown is a real value, not a synonym for mid-level, employee, USD or worldwide.
- Exact city/province requests remain exact. Zero matches may produce suggestions, but never silently relax geography, eligibility or compensation.
- Cursor is bound to generation and query hash; changed-generation requests return a clear restart-needed response, not duplicate/skipped pages.
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
- Logs contain source IDs/statuses/counts, not full descriptions, URL credentials, applicant data or raw tool requests. Telemetry defaults off and inherited tokens/ingest rewrites are removed.
- GitHub permissions default read-only; narrow write permissions to trusted data publication and deployments. No `pull_request_target` execution of contributor code with secrets. Pin actions and dependency versions.
- Remove inherited release/registry workflows from active execution until intentional setup. Public MCP registry submission is a separate approval step.
- CI network-denial tests verify fixture builds cannot contact upstream production, analytics or live boards.
- Kill switches: disable a source, disable crawl, stop publication, roll back production. A source removal is applied before stale carry-over and validated with a regression test.

## 11. Implementation sequence and acceptance gates

Each stage should be a small reviewable PR, splitting adapter work further if needed. No stage is complete just because its files exist.

### P0 — Fork hygiene and reproducible baseline

**Dependencies:** implementation approval; GitHub owner only needed for remote publication.

Tasks: create isolated local worktree from reviewed/revalidated upstream SHA; preserve notices; record baseline; introduce identity configuration; disable production schedules, release and MCP registry publication; remove inherited telemetry/live-data fallback from the new runtime path; add Node toolchain pin and unified commands. Keep original baseline tests runnable until intentional replacement is documented.

**Acceptance:** clean checkout installs with lockfile; baseline commands reproduce or environment deviations are documented; no external write during fixture CI; active new-runtime output has no accidental upstream origin/analytics token; no remote fork/push unless explicitly approved.

### P1 — Registry, contracts and fixture-first domain

**Dependencies:** P0.

Tasks: employer/source/job/evidence/snapshot schemas; registry validation; stable IDs and aliases; role taxonomy; country-aware geography; fake-clock test harness; sanitized fixtures including all eligibility cases; source allowlist.

**Acceptance:** invalid/duplicate identifiers and unsafe source URLs fail; zero-job company needs no salary row; target country and generation checks enforced; hypothetical fixtures visibly identified as fixtures; schema migration example tested.

### P2 — Initial adapters and data preservation

**Dependencies:** P1.

Tasks: adapt Greenhouse, Lever and Ashby to explicit complete/partial envelopes; strict payload validation; preserve country/location/description evidence and all pay bands; remove currency/period assumptions; bounded detail enrichment; host-safe network client; cap/pagination/timeout handling. Do not enable other adapters just because upstream has them.

**Acceptance:** per-adapter fixtures prove correct mapping, malformed-200 failure, empty-board distinction, detail-failure preservation and cap handling; country/pay metadata is not lost before eligibility; safe redirect and request-budget tests pass; an optional maintainer-run live smoke records a real source URL/date/status without making CI depend on the network.

### P3 — Eligibility, compensation and review

**Dependencies:** P1–P2.

Tasks: deterministic rules, scoped evidence and conflicts, structured pay validation, review queue, hash-bound overrides, expiry/invalidation and manual-link fallback policy.

**Acceptance:** all listed regression cases pass; confirmed never results from bare remote, company-only policy or a US-only restriction; unknown pay never satisfies a threshold; valid overrides are auditable and invalidated by material changes; exclusion/negation tests demonstrate sensitivity to the actual restriction.

### P4 — Crawl orchestration, lifecycle and snapshot store

**Dependencies:** P2–P3.

Tasks: scheduled-run command, prior snapshot loader, completeness-aware reconciliation, stale/missing/closed transitions, dedup, query membership, schema validation, safe data-branch writer and report generation.

**Acceptance:** restart/replay is idempotent; partial queries/detail failures/404 boards never mass-close jobs; repeated complete absence closes at the specified interval; source disables prevent resurrection; zero-success and threshold failures preserve last-good publication; deadline cancels actual requests; generated totals match parsed records.

### P5 — Read-only search and MCP

**Dependencies:** P3–P4.

Tasks: shared search/ranking, exact filters, generation-bound cursors, explicit compensation tuple, job-only MCP tools, local stdio and HTTP limits/Origin handling, bounded snapshot cache.

**Acceptance:** deterministic test queries return identical job IDs and ordering through direct library and MCP; unsupported salary/application tools fail clearly; generation/cursor mismatch is explicit; clock advances hide stale jobs; protocol tests and two-client local smoke pass; unavailable data is distinguished from zero matches.

### P6 — Website and controlled deployment

**Dependencies:** P4–P5.

Tasks: static job UI, evidence/source status pages, original branding and attribution, fixture build, protected preview, trusted scheduled workflow, generation-pinned Vercel deploy and rollback.

**Acceptance:** mobile/keyboard/browser smoke tests; browser/MCP parity; HTML injection tests; fixture preview contains no real applicant data; production smoke reads matching manifest/job/query; deployment failure does not claim success; rollback drill restores a verified code/data pair. Hosting credentials/owner approval required here, not before local work.

### P7 — Source curation, shadow run and launch review

**Dependencies:** source discovery can begin after P1; production promotion requires P2–P6.

Tasks: discover 30 approved employer boards; verify ownership and publication policy; label real postings; run seven consecutive daily shadow crawls; review exclusions and unknowns; tune rules through fixtures; publish source coverage and limitations.

**Launch gates:**

- 30 approved sources, including local and international-remote employer coverage; record the actual mix instead of promising a quota without evidence.
- At least 90% of enabled sources complete successfully on each of seven daily runs; incomplete sources are labelled and do not create closures.
- At least 100 real postings independently reviewed, including at least 50 classified confirmed and examples from likely, unknown and excluded sets. If unavailable, continue shadow mode rather than claiming validated coverage.
- At least 95% geographic precision among reviewed confirmed results; zero known critical false positives involving explicit country exclusions or foreign mandatory office attendance. Report denominator and confusion matrix, not just a percentage. Likely results are evaluated separately as appropriately labelled, not counted as confirmed.
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
| Adapter contracts | Realistic sanitized payloads; nulls; changed shapes; full/partial pagination; missing details; multi-location and multi-range pay; endpoint budgets |
| Eligibility | Positive/negative/ambiguous cases; country-code collisions; text negation; contradictory evidence; regional scope; authorization versus residence |
| Compensation | Missing $ currency, invalid intervals, negative/reversed ranges, US-only tiers, bonus vs base, employee vs contractor, strict threshold behavior |
| Lifecycle | Complete vs partial absence, missing counters, fake-time windows, reopened IDs, removed sources, query-plan changes, no repeated carry-over freshness reset |
| Publication | Mixed-generation rejection, corrupt prior state, cold bootstrap, failed data push, data committed/deploy failed, concurrent writer, rollback |
| Search/API | Browser/library/MCP parity, exact filters, cursor stability, bounded limits, unknown values, honest totals, stale-by-current-time exclusion |
| Security | SSRF/redirect/DNS policy, stored XSS, untrusted instruction text, Origin checks, body limits, forbidden telemetry/live fallbacks, no secrets in PR jobs |
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

**Planning estimate, not a delivery promise:** approximately 4–6 focused engineering weeks for one experienced maintainer, with curation running alongside development, plus the seven-day shadow qualification. Adapter surprises and source permissions are the largest uncertainties; do not trade eligibility precision for a calendar date. A three-adapter fixture-based vertical slice should precede the public pilot.

Decisions needed before publication, but not blockers to local implementation:

1. GitHub owner and final repository/product name.
2. Public vs private pilot and intended operator/contact.
3. Vercel/GitHub accounts, permission boundaries and monthly usage ceiling.
4. Who maintains the 30-source registry and reviews uncertain cases.
5. Approval of default inclusion of visibly labelled likely matches (confirmed-only remains available).

**First authorized implementation package:** P0–P1 followed by a single Greenhouse fixture flowing through normalization, eligibility, lifecycle and job search. No live crawling, remote writes or deployment until that vertical slice passes. Then bring Lever/Ashby through the same contract and proceed to the pilot. This keeps the first changes small while proving the architecture end to end.

## 16. Sources and audit trail

Primary repository evidence is pinned to the reviewed revision; line references above refer to that checkout. Source entry points:

- Repository: `https://github.com/pugarte7/spanish-top-tech-companies/tree/2042874594e81fb3eba74f084f7ad0cd0fb05049`
- Upstream methodology: `METHODOLOGY.md`, `CLAUDE.md`, `docs/CONTEXT.md`; prose contains historical rules, so executable code and tests were checked rather than treating every note as current.
- Greenhouse official Job Board API: `https://developers.greenhouse.io/job-board.html` — public GET retrieval, job detail and pay-transparency fields; application POST requires employer-issued authentication and is not in our scope.
- Ashby official posting API: `https://developers.ashbyhq.com/docs/public-job-posting-api` — structured locations, workplace type and compensation; `isRemote` alone is insufficient to distinguish hybrid.
- Lever public API source: `https://github.com/lever/postings-api` — referenced by the adapter; full fresh contract review remains a P2 task.
- MCP published transport reference checked through official search results: `https://modelcontextprotocol.io/specification/2025-11-25/basic/transports` — Origin and local binding safeguards. This plan does not assert that this dated reference is the newest protocol release.

Direct web extraction was unavailable in this environment and a direct Ashby documentation request returned HTTP 403. Official documentation search results supplied the cited contract observations; the implementation must recheck exact endpoint behavior against approved live sources. Local repository inspection and test execution were available and successful.

### Independent audit

Pending. The completed draft will be given to a separate subagent with the source checkout and baseline logs. The final revision must record findings, applied corrections, justified deferrals and remaining risks. An audit report alone is not acceptance: the parent reviewer must inspect the cited code and apply/verify corrections.
