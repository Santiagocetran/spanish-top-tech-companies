# Independent offline collection review

Date: 2026-11-16. Runtime: Node v22.23.4. Reviewed the working-tree collection changes based on `a018436e795f718b3cb166ef0f83532250f266de`; the base revision is not a frozen commit of these changes.

## Result

No remaining blocking finding identified for the bounded, injected-transport collection contract after correction. This is not approval of live collection or production publication. Inspected the collector, registry/preflight validation, lifecycle integration and relevant tests. No external requests or writes were performed. Only this review report was edited by the reviewer during this increment.

## Reproduced findings and corrections

| Finding | Correction independently checked |
| --- | --- |
| A valid observed provider ID with missing required fields produced no job, then caused lifecycle to reject the entire mixed inventory with `OBSERVED_ID_REQUIRES_MINIMAL_JOB`. | Reproduced with a missing title: collection was complete with four jobs/five observed IDs, but reconciliation threw. Explicit validated required-failure IDs now permit unseen IDs to remain quarantined, retain known jobs unverified, and allow unrelated valid jobs and absence reconciliation to progress. Source mismatches, duplicate observations and failures outside the observed set reject. |
| A response to `content=true` could omit content and still produce fresh confirmed eligibility because the earlier fixture normalizer permitted absent descriptions. | Collection now requires an explicit string content field. Missing, null and nonstring bodies remain observed required-evidence failures. A present empty string is distinct from unavailable content. The old fixture normalization contract remains separate. |

An intermediate EU-region test expected a different error code after rejection moved into preflight; the assertion was aligned with `UNSUPPORTED_SOURCE_REGION`. Unsupported regional collection remains fail-closed before transport dispatch.

## Independent execution and inspection

- Initially ran the collection/source tests: all 15 passed, while the independent missing-title collection-to-lifecycle probe exposed the first integration finding.
- After fixes, ran `node --test tests/jobs-ar/*.test.mjs`: exit 0; 75 tests passed, zero failures.
- Independently exercised a real short timer with a successful list and hanging optional pay detail. The pending detail signal was aborted, only two requests dispatched, complete inventory remained complete, jobs remained geographically eligible, and all optional enrichment failures were reported.
- Inspected replay hashing and existing idempotence/clock tests alongside the new failure-ID integration. Required evidence failure does not renew the prior eligibility-verification timestamp. New failed IDs do not become fabricated public jobs.
- Checked exact hosted-board host/region/board matching, allowed-host restrictions, current source/employer review checks, source identity validation before dispatch, strict global API destinations, no redirect acceptance, response-size/request/detail/time caps, and absence of any default transport or fetch fallback.
- Completeness remains conservative: matching nonnegative safe `meta.total` and no known continuation/truncation signal are required. Missing/mismatching totals, duplicate/unreliable IDs, malformed responses and failed list requests cannot become complete empty inventories. Optional pay failures do not downgrade an otherwise complete list.

## Limits

All responses were synthetic injected objects. This review did not verify a live employer, source permissions, DNS/redirect behavior of a real network client, provider availability or actual payload compatibility. The collector deliberately has no network client; a future transport must independently implement its URL, abort, timeout and byte-limit obligations. The post-response byte check is not a streaming network-memory limit.

Only the documented global Greenhouse API contract is enabled for collection; EU remains unsupported. One unfiltered list request is used. The matching-total gate is a conservative project policy, not a guarantee of transactional inventory consistency. Explicit empty content still passes through the existing bounded eligibility rules; real-world precision/recall and job-description support remain unqualified.

Actual transport, live-source onboarding, source-feasibility research, scheduling, deployment and remote publication remain outside this milestone and require their separate authorization and acceptance gates. No production readiness or source-coverage claim follows from these tests.
