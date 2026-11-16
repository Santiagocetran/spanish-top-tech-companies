# Independent audit — Argentina Tech Jobs implementation plan

**Verdict:** Sound product direction, but not yet executable without corrections. No critical/emergency exploit was demonstrated: this is a plan, not a deployed implementation. Several **high-priority design gaps** could produce false eligibility, false closures, stale recommendations or resurrected takedowns if implemented literally. Approve only the fixture-first local slice after correcting the contracts below; do not treat the full pilot as validated.

## Scope and evidence

- Read the COMPLETE `IMPLEMENTATION_PLAN.md`, lines 1–544, not merely the implementation stages.
- Independently checked the local repository at `<review-checkout>`; HEAD is `2042874594e81fb3eba74f084f7ad0cd0fb05049`, and initial `git status --short` was empty.
- Inspected actual adapters, normalization, HTTP/redirect handling, logger/redaction, hosted Ashby fallback, deployment/CI/weekly workflows, Vercel configuration, package manifest and maintainer guidance. Used targeted searches in the crawler. Did not change source or plan and did not crawl live employer boards, deploy or publish.
- Reproduced all six location-classifier results in plan lines 73–80. A separate **synthetic, fetch-stubbed** Ashby probe reproduced `isRemote=true` without `workplaceType` becoming `workplaceType=remote`, while an ARG country was discarded. This is not live data. The first probe mistakenly passed a string to the array API and failed; the corrected array-input probe exited 0.
- Retrieved official Ashby, Greenhouse and Lever documentation successfully during this audit using direct Python HTTP requests. The web-extraction tool failed because its configured backend is search-only; the direct-request alternative succeeded. Therefore the parent's failed documentation extraction need not remain the final evidentiary limitation. Exact live-source compatibility and permission remain unverified.
- The supplied baseline logs were not rerun as a full suite; this audit concerns the plan and independent targeted source/probe checks, not implementation certification.

References below use **plan line numbers in the reviewed draft** and **repository-relative source paths at the pinned SHA**.

## High-priority corrections

### H1 — Separate inventory completeness, eligibility evidence and optional enrichment

**Evidence:** Plan 191–192, 254, 268–278, 296–303, 432, 459. It allows Greenhouse pay-detail failure to leave a valid job, but also makes any listed-ID detail failure stale; it says partial results cannot increment missing counters without distinguishing a complete list with optional detail failures. The schema lacks the `last successful detail observation` timestamp used by retention. Greenhouse currently returns descriptions from its listing request (`greenhouse.js:60–79`); Lever and Ashby also normalize list-payload descriptions. An HTTP detail request is not intrinsically required for complete eligibility evidence.

**Failure:** An optional pay request could hide an otherwise freshly verified job, or unnecessarily prevent closure of other postings absent from a complete inventory. Conversely a list sighting could refresh restrictions that were actually retained from old details.

**Exact recommended change:** Replace `detail_complete` as the decision switch with separate `inventory_complete`, `eligibility_evidence_complete`, and `compensation_enrichment_status`, plus `last_inventory_seen_at`, `last_eligibility_verified_at`, and per-pay evidence timestamps. Define complete evidence by required fields/semantics, not endpoint type. Allow list data to satisfy eligibility evidence. Missing counters depend only on complete applicable inventory and observed IDs; optional compensation failure neither makes fresh eligibility stale nor prevents absence reconciliation. Failed required evidence marks the affected job unverified without inventing closure. An unseen ID with failed required detail gets a minimal unverified record, not a fabricated full job.

**Acceptance additions:** Complete list + pay-only failure preserves a fresh eligible job; complete list + required-detail failure retains that ID without closure; an unrelated absent ID advances absence on the same complete list; incomplete inventory never advances absence. Define how optional failures affect the pilot's source-success metric.

### H2 — Specify an actual freshness policy, including time-only outages

**Evidence:** Plan 302–303 uses seven days of retention, excludes stale by default, and 338/440 requires current-time filtering. It never states the age at which an `open` job becomes stale when no run occurs, and the referenced detail timestamp is absent. A halted scheduler or rejected generation leaves the old snapshot's jobs `open`.

**Exact recommended change:** Add versioned `freshness_policy` with explicit defaults, e.g. `fresh_for_hours=48` for daily crawling and `unverified_retention_days=7`, measured from the last successful required-evidence verification. An explicit required-evidence failure can mark stale immediately; silence becomes stale at the age threshold. `include_stale` permits only stale records inside retention, never expired/missing/closed/disabled records. Treat malformed/future timestamps as invalid or unknown rather than fresh. Apply effective freshness to `find_jobs`, `get_job`, filters/counts and browser views. Static JSON must carry validity fields and state that statuses are as-of the generation, not promise a file mutates with time; avoid pre-rendered fresh claims that persist without JavaScript.

**Acceptance additions:** Advance only the clock with no crawl; test just before/at both thresholds, suspended browser tabs, last-good snapshots after rejected runs, and direct `get_job` calls. A single shared `now` is captured per response.

### H3 — Takedown and disable safety must outrank publish holds and rollback

**Evidence:** Plan 304, 315, 324–330, 388. A disabled source is said to leave public results immediately, but publication can be held on failures or a large results drop. Rolling the alias back to an older immutable build can reintroduce a removed source or sensitive excerpt. The plan recognizes historical Git/caches but does not connect this to rollback behavior.

**Exact recommended change:** Add a removal-only publication path that applies approved source/job/content tombstones to the last-good snapshot without requiring a successful crawl and without being blocked by availability/drop thresholds. Every promotion, code-only build and rollback must enforce the current removal policy. Prefer rebuilding a known-good code/data pair with current removals; do not alias-promote an old artifact that predates a removal. Define whether older deployment URLs remain public and how to revoke/delete affected deployments and purge caches. Explain that a downloaded public snapshot cannot be recalled.

**Acceptance additions:** Disable the source while every remaining board fails; remove enough records to cross the drop threshold; then roll back code. None may restore the removed record via search, `get_job`, downloadable JSON or a retained deployment URL under operator control.

### H4 — Ashby needs an explicit contract decision, not just a three-name allowlist

**Evidence:** `ashby.js:16–25,28–36,46–49` automatically falls back from an API 404 to hosted HTML and treats bare `isRemote=true` as fully remote. `ashbyHosted.js:8–20,124–135` introduces a different HTML schema, a 500-item schema ceiling and serial detail fetching; it does not return the proposed completeness envelope. `ashbyLocations.js:4–22` recognizes only US/Canada and expects nested postal metadata for every location. Official Ashby docs say `isRemote` can mean Remote **or Hybrid**, show secondary-location country fields directly under `address`, and use alpha-3 country examples. Plan 238 tests explicit Hybrid but not absent/unknown workplace type; the responsibility map omits the hosted fallback.

**Exact recommended change:** For v1, make the Ashby public posting API the only enabled transport and disable automatic hosted fallback. An API 404 is source failure/review. If hosted fallback is wanted, give it a separately enabled contract/version, budgets, terms review and completeness fixtures. Never infer fully remote from Ashby `isRemote` alone; use explicit `workplaceType` or sufficiently clear posting evidence, otherwise unknown. Normalize primary and secondary address shapes independently and map documented alpha-2/alpha-3/name country values without interpreting arbitrary free text as codes. Preserve raw values.

**Acceptance additions:** Missing/unknown `workplaceType` with `isRemote=true`; ARG in primary and secondary addresses; conflicting named locations; API 404 must not silently start HTML crawling. Verify confidential/unlisted handling on any enabled transport.

### H5 — Query unions cannot prove full remote coverage merely by having three labels

**Evidence:** Plan 173–175, 283–285, 298–300. The suggested future `Argentina + regional remote + global` union is not necessarily exhaustive: ATS facets can omit remote jobs, omit synonyms, or use different location semantics. Membership history also does not prove all scopes that *could now contain* a job; a job can move to another query's scope while that query fails.

**Exact recommended change:** State that v1 supports one audited unfiltered inventory per source; defer multi-query reconciliation until a concrete adapter requires it. For that extension, distinguish query completion from proven board coverage. Store query-plan version/hash and scope semantics. Any positive sighting wins across queries; absence closure requires a documented exhaustive union with every relevant query complete in the same reconciliation epoch. If exhaustiveness cannot be established, claim coverage only of observed scopes and use stale/expired-unverified rather than source-wide closure. Do not call an AR/remote/global union full coverage without an adapter-specific proof/test corpus.

**Acceptance additions:** A posting moves between scopes; one query fails; a newly introduced global label is not returned by existing filters; a query-plan change cannot be compared to the old absence baseline. Retain full-board v1 simplicity rather than implementing speculative query algebra now.

### H6 — Make data/code promotion and optimistic conflict handling executable

**Evidence:** Plan 159, 313–330, 497. Shared concurrency and optimistic comparison are good but do not define what happens on conflict, which data SHA code-only deployment selects, how sanitized old state is reclassified after rule changes, or where the last healthy production pair is recorded. The `source_commit` embedded in a snapshot is its producer, not necessarily the code that renders it. Current deployment workflow (`.github/workflows/deploy.yml:22–47,70–84`) has one workflow lock and builds/crawls together; the new crawl/deploy separation must not accidentally acquire the same lock in a parent job while waiting for its child.

**Exact recommended change:** Record a release manifest with `producer_code_sha`, `serving_code_sha`, `data_commit`, schema/rules/registry hashes, generation, removal-policy version and validation result. Preserve a durable last-healthy release pointer separately from the latest data commit. On data-branch CAS conflict, refetch and recompute reconciliation from the new state or abort/retry; never force-push or merely rebase precomputed lifecycle JSON. Deployment gets an explicit code/data pair. A code-only change may reuse data only if schema/rules/registry compatibility is declared; eligibility-affecting changes require a new validated generation, with recrawl if retained structured evidence is insufficient. Serialization is a correctness lock, not a guarantee every queued schedule executes. Add bounded retry/recovery behavior and define retained crawl state versus publishable state when quality gates hold publication.

**Acceptance additions:** Two writers starting from one base; data committed but deploy failed; code-only deployment racing a crawl; rule change with old evidence; an older queued run; deployment smoke failure after alias switch. Require one monotonic healthy release selection and no double-counted absence run IDs.

## Medium-priority corrections

### M1 — Salary tuple is promised but not actually queryable

**Evidence:** Plan 189, 258–259, 346. Search lists `{currency, period, min_amount, threshold_mode}` but requires identical currency/period/**component/basis** comparison. Component and gross/net/unknown selection/defaults are missing.

**Change:** Either expose validated component and basis filters or explicitly fix v1 filtering to `component=base, basis=gross` and exclude unknown basis from that filter (with an opt-in separately labelled unknown-basis query if desired). Do not infer gross solely because a source says salary. Document this coverage cost. Validate finite amounts, supported intervals/currencies and lower/upper-bound modes. Each matched posting must identify the exact range that satisfied the tuple. Define how multiple eligible ranges are selected for display, without implying the highest is an offer available in Argentina.

### M2 — Define technology-role inclusion and retain location-option semantics

**Evidence:** Plan 11, 23, 138, 184–188, 218, 344–348. Full employer boards contain non-tech roles, but no inclusion predicate distinguishes a tech-jobs service from all jobs at technology employers. One top-level `workplace` also cannot represent a remote Argentina option alongside a US hybrid option accurately.

**Change:** Add `role_scope` (in-scope/out-of-scope/unknown) with an explicit small taxonomy and launch default; choose and document whether product/design/technical support are included. Treat unknown role classification separately from geographic eligibility. Represent employment/location options with their own workplace, eligibility, restrictions and pay references, or split option records under one stable posting ID. A remote or city filter must be satisfied by the **same valid option**, not by unrelated fields on a multi-location posting. Country-qualify city IDs and distinguish CABA from Buenos Aires province.

**Tests:** Sales/recruiting roles on a tech employer's board; unknown titles; remote-AR plus hybrid-US options; Argentina onsite plus remote-US must not satisfy Argentina-remote. Include provider enum mappings: Lever officially uses `on-site`, but `lever.js:35–39` recognizes only `onsite`, silently losing the explicit workplace value. Map this documented value to canonical `onsite` rather than relying on title/location heuristics.

### M3 — Strengthen the label-review protocol before treating the pilot gates as measurable

**Evidence:** Plan 454–464, 509, 517. Thirty sources and the required real confirmed sample have no feasibility evidence yet. The draft honestly stays in shadow mode if unavailable, which is good, but the estimate must not imply that this gate can be reached on schedule. `95% precision` can mean different things if reviewers select easy jobs, label their own algorithm output, or retest the tuning sample. Likely results are default-visible but have no explicit exclusion-safety gate.

**Change:** Treat 30 boards as a qualification target, not promised initial coverage. After P1, do a source-feasibility checkpoint before committing to the full schedule; record unavailable/disallowed sources and supported-ATS coverage gaps without lowering quality rules. Specify unique sampled postings, frozen rule/snapshot version, a saved sampling seed/strata, review rubric, independent labeler or second-pass adjudication, and a held-out set after tuning. Report confirmed precision as an observed sample metric, not a population guarantee. Apply zero-known-explicit-exclusion/mandatory-foreign-office violations to **all default-visible results, including likely**, and report likely-label appropriateness separately. Define exactly which failures count against source completeness using H1, and reset/requalify after material rule/adapter changes.

**Feasibility:** A small permission-reviewed private pilot can precede the public gate. It must not be presented as having passed the 30-source/100-posting gate. No need to invent sources or relax precision to hit a date.

### M4 — Privacy/logging is a policy paragraph, not yet a verified boundary

**Evidence:** Plan 196–200, 315, 358, 384, 499. Inherited `logger.js:13–22` runs regex redaction over arbitrary serialized context; `redact.js:13–21` is not a complete Argentine/international PII scrubber. `http.js:57,81,108` includes URL/error text. `scripts/jobs.mjs:218,408,478` copies exception messages/stacks. Sanitizing excerpts alone does not cover raw locations, titles, URL query strings, reports, CI summaries or caches.

**Change:** Make the persistence boundary allowlist-based: public schema fields, bounded excerpts, safe URL query policy and structured issue codes only. Prevent arbitrary exception/body serialization; regex masking is defense-in-depth, not a privacy guarantee. Specify ignored raw-cache location, expiry/deletion, no Actions cache/artifact upload, and publish only sanitized review reports. Handle uncertainty by withholding questionable evidence rather than claiming automated redaction finds every name/contact. Add seeded email/phone/token/person-name canaries through stdout/stderr, errors, current state, snapshot, review queue, fixture artifacts and generated HTML/MCP. Decide operator hosting-access-log retention separately from application telemetry.

### M5 — Retirement must include routable legacy endpoints and the build entry point

**Evidence:** Plan 143–153, 375, 398. `vercel.json:4` still invokes the Python generator **and crawler**, `:14–19` exposes analytics/star rewrites. Removing the star UI or rewrite alone does not make retained handler code inert. `api/star.js:8–22` sends analytics then redirects to the upstream repo; `api/stars.js:5–20` makes a GitHub request using an environment token if present. `http.js:29–31` retains the upstream User-Agent identity. The new-path-only language in P0 is narrower than the final no-upstream-runtime promise.

**Change:** Add `vercel.json`, `api/star.js`, `api/stars.js`, crawler User-Agent and deployment function-bundle inventory explicitly to P0/P6 ownership. Remove or disable legacy handlers, not just links. Assert the deployed route allowlist and enumerate function artifacts. Replace the build command with snapshot-only generation and a fail-closed missing-snapshot behavior. Keep old regression fixtures isolated, not part of the active public build. Test direct legacy endpoint requests and forbidden egress, including paths no longer linked by UI.

### M6 — Time-dependent search needs a cursor stability rule

**Evidence:** Plan 338, 344, 349–350. Binding a cursor only to generation/query does not keep pagination stable when `now` changes and records age out or freshness ranking changes mid-pagination.

**Change:** Bind cursors additionally to a bounded search-time context, or use a stable keyset and reject/restart on freshness-window changes. Never use a frozen cursor time to expose records already beyond the current hard-expiry/removal boundary. Declare that such a boundary invalidates the cursor and returns restart-needed. Canonicalize filter arrays/defaults before hashing, define maximum cursor lifetime, and test a threshold crossing between pages with unchanged generation.

### M7 — Correct the stage dependencies and bound the first package

**Evidence:** Plan 402–448 makes search P5 depend on P4, whereas 527 calls the first package P0–P1 plus a fixture through normalization, eligibility, lifecycle and search (pieces from P2–P5). P4 also asks for a safe data-branch writer while the first slice forbids remote writes. The 4–6 week estimate includes three adapters, SSRF/DNS controls, lifecycle, branch promotion/rollback, two MCP clients, browser accessibility, privacy and source curation without measured throughput.

**Change:** Add a named local vertical-slice milestone explicitly borrowing minimal P2–P5 pieces: one synthetic Greenhouse fixture -> canonical job -> eligibility -> local-file lifecycle -> pure search. No data-branch writer, scheduling, MCP transport, browser, live sources or production secrets required for that milestone. Then complete adapters/domain, local store/search/UI and transport, and only then branch/deployment integrations. Separate local Git writer tests from authorized remote push. Label 4–6 weeks a low-confidence engineering hypothesis to be re-estimated after the slice and source-feasibility checkpoint; do not attach a new unsupported precise estimate. Defer multi-query algebra, manual-record ingestion and extra extracted fields unless required by observed pilot data.

### M8 — Resolve manual records and listing identity fallback, or defer them

**Evidence:** Plan 33, 137, 182, 198, 422 specifies URL-only manual records but requires external posting IDs, source completeness and detailed evidence/expiry. The actual normalization falls back to a URL hash (`normalize.js:15–17`); current Ashby official field documentation does not guarantee an `id` field, while the adapter reads `job.id` (`ashby.js:54`).

**Change:** Document each adapter's identity contract and explicit safe fallback: validated stable provider posting key parsed from a canonical hosted URL where documented/tested, or a source-scoped canonical URL hash with clear migration handling. Missing reliable identity should quarantine the record rather than merge empty IDs. Include ATS region/board identity in source uniqueness and preserve raw canonical identity inputs. Defer manual job ingestion from v1 unless a separate manual source kind defines required evidence, review-based validity timestamp, explicit expiry and no inventory-based automatic closure. URL-only pointers are not automatically publishable confirmed jobs.

## Source-claim assessment and documentation corrections

The core negative source claims were substantively borne out: lossy geography, USD/year defaults, invalid-payload-as-empty behavior, legacy production fallbacks, permissive redirect handling when no allowlist is supplied, and inherited telemetry/publication are real concerns. The reproduced `Remote - AR` Arkansas collision supports the decision not to mechanically replace strings.

Amend the final source trail (plan 535–540) as follows:

- **Ashby official Job Postings API**, retrieved during this audit: `https://developers.ashbyhq.com/docs/public-job-posting-api`, particularly field table entries for `isRemote`, `workplaceType`, primary/secondary address and `isListed`. It explicitly distinguishes Remote from Hybrid; primary/secondary address nesting differs. Exact live behavior still needs approved source fixtures. Do not claim the documentation was unavailable to the independent audit.
- **Greenhouse Job Board API**, retrieved at `https://docs.greenhouse.io/job-board.html`: pay-transparency query support is documented under individual job retrieval; descriptions may include board introduction/conclusion alongside the posting. Retain the plan's detail-enrichment caution and add boilerplate-scope fixtures. A listing URL containing the parameter does not prove listing pay support (`greenhouse.js:61`).
- **Lever official postings API repository**, retrieved at `https://github.com/lever/postings-api`: documents `skip`/`limit` and filters. The local adapter issues a single `?mode=json` call (`lever.js:50–60`). Require an explicit provider-specific completeness decision; do not infer truncation merely from its lack of paging, but equally do not assert full coverage until verified.

No changes to licensing policy are proposed here; source permissions require the planned owner review. This audit is not legal advice or proof that public ATS data may be republished without restrictions.

## Recommended parent disposition

1. Apply H1–H6 before calling the plan implementation-ready; these alter shared contracts and must precede code.
2. Fold M1–M8 into the responsible stages and acceptance matrix; defer optional features explicitly instead of silently dropping their safety contract.
3. Record the independent audit as completed **with corrections pending/applied**, not as unconditional acceptance. Preserve the distinction between the validated inherited fixture baseline, this audit's synthetic probes, and an unperformed live Argentina pilot.
4. Deliver the corrected plan and concise audit disposition; do not implement, create a remote fork, push a branch, provision hosting or publish jobs under this planning authorization.

**Files changed by auditor:** only `docs/argentina/AUDIT.md`. The implementation plan and repository source were left unchanged.
