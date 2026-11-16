# Audit disposition — Argentina Tech Jobs plan

**Status:** Independent audit completed; parent corrections applied to IMPLEMENTATION_PLAN.md. This resolves planning findings, not implementation acceptance. No second independent audit of the corrected text is claimed.

The auditor reviewed the complete archived draft (`DRAFT_REVIEWED.md`) and independently inspected source at `2042874594e81fb3eba74f084f7ad0cd0fb05049`. Its original report is preserved unchanged in `AUDIT.md`. Draft line references in that report refer to the archive, not the corrected plan.

## Resolution matrix

| ID | Priority | Disposition | Changes in corrected plan |
|---|---|---|---|
| H1 | High | Applied | Sections 4, 7, 11: distinguish complete inventory, required eligibility evidence and optional pay enrichment; separate timestamps; list payload can verify evidence; optional pay failure cannot hide a fresh job or block unrelated absence reconciliation. |
| H2 | High | Applied | Section 7: explicit 48-hour fresh window and seven-day unverified retention; malformed/future dates fail safely; all read surfaces use current time; pay age tracked independently; fake-clock boundary tests. |
| H3 | High | Applied | Section 8: removal-only publication bypasses availability/drop gates; current tombstones apply to promotion and rollback; unsafe rollback artifacts rebuilt; old controlled deployments/caches revoked; downloaded copies cannot be recalled. |
| H4 | High | Applied; optional transport deferred | Sections 3, 5, 7: Ashby public posting API only; disable hosted-HTML fallback; bare isRemote never proves fully remote; primary/secondary country shapes and alpha-3 country inputs explicitly tested; visibility safeguards retained. |
| H5 | High | Applied by simplifying v1 | Sections 4, 7: one audited unfiltered inventory per source; multi-query reconciliation deferred. Future unions require proof of exhaustive coverage and same-run completion before absence closure. |
| H6 | High | Applied | Section 8: explicit producer/serving/data identities; conflict recompute-or-abort, no force push/rebased lifecycle JSON; compatibility gates and recrawl when needed; protected release-state branch and healthy pointer; bounded retries and safe rollback. |
| M1 | Medium | Applied | Section 6: full pay filter tuple includes component/basis, explicit base/gross defaults, unknown-basis opt-in, finite amount validation and exact matched-range/option references. |
| M2 | Medium | Applied | Sections 4–5, 9: versioned tech-role inclusion scope; unknown roles separate from geography; location options bind workplace/eligibility/pay; CABA vs province and Lever on-site mapping tested. |
| M3 | Medium | Applied | V0/P7: source feasibility checkpoint; public targets not promised coverage; independent held-out sample/rubric/seed/strata; zero-known-exclusion violations across confirmed AND likely; material changes requalify; smaller private pilot labelled honestly. |
| M4 | Medium | Applied | Sections 4, 10, 13: allowlist-based public/log output boundary, structured issue codes, URL query policy, bounded ignored raw cache with no uploads, PII canaries and separate hosting-log policy. |
| M5 | Medium | Applied | Module map/P0/P6: vercel.json and api/star.js/api/stars.js explicitly retired from active build; snapshot-only build; deployed route/function allowlist and forbidden-egress tests; new User-Agent identity. |
| M6 | Medium | Applied | Section 9: canonical query hash, generation/removal version, bounded search-time context and ten-minute cursor lifetime; freshness boundary invalidates cursor rather than exposing expired results. |
| M7 | Medium | Applied | V0 milestone explicitly borrows minimal P2–P5 pieces without production infrastructure; local Git writer tests precede authorized remote publishing; effort estimate labelled low-confidence and re-estimated after feasibility. |
| M8 | Medium | Applied; optional feature deferred | Sections 1, 4, 7: per-provider identity contract and safe URL-derived fallback, quarantine absent identity; ATS region part of source uniqueness; manual submissions are onboarding leads, not published jobs. |

## Parent verification

- Read the full audit and inspected the cited Ashby location/hosted fallback, legacy star handlers, logger and redaction code directly.
- Independently retrieved official Ashby, Greenhouse and Lever documentation after earlier extraction failures; direct HTTP retrieval returned 200 for all three. This resolves the earlier documentation-access limitation, not live employer compatibility.
- Applied corrections to the plan itself rather than merely appending an audit disclaimer.
- Checked updated sections for obsolete detail/query/manual-record contracts, stage-dependency inconsistencies and missing audit resolutions.
- Preserved the original draft and unedited independent audit for traceability.
- Source repository remains at the reviewed SHA with no tracked changes. No implementation, GitHub fork, push, live employer crawl or deployment was performed.

## Baseline evidence versus remaining uncertainty

Inherited Python pipeline, static build/MCP tests and job fixture tests all completed with exit 0 in the parent review. Logs are included beside the plan. Node was v22.23.4 and Python was 3.13.5; the latter differs from upstream CI's 3.12. Audit probes used synthetic/stubbed inputs and are not job-market data.

Still unverified: actual 30-board availability and source permissions, Argentina job supply, held-out eligibility accuracy, production resource costs, hosted protocol/client compatibility and operational reliability. P7 remains a real qualification gate, not an estimate or assertion that those criteria already pass.

## Ready-to-start boundary

The corrected plan is ready for an authorized **local P0–P1 + V0** work package. That package proves one synthetic Greenhouse fixture through normalization, eligibility, local lifecycle and pure search. It needs no live source credentials, remote write permissions or hosting. Public identity, budget, source ownership and production permissions are decisions for later stages, not reasons to block that local slice.
