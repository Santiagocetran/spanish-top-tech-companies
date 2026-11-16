# Independent implementation review

Review date: 2026-11-16. Runtime: Node v22.23.4. Reviewed the local working tree based on `54f8f689bb1c84fa3271250bda3cef4ae6a62916`; implementation changes were uncommitted, so this SHA identifies the base, not a frozen implementation revision.

## Result

No remaining blocking finding identified for the authorized local synthetic P0–P1/V0 slice after correction and independent re-review. This is bounded fixture verification, not production or live-source acceptance.

Reviewed the authoritative implementation plan and audit disposition, tracked changes and new Argentina modules, commands, fixtures and tests. Checked the new default runtime boundary, registry and snapshot validation, eligibility normalization, lifecycle transitions, compensation and option-coherent search, and local artifact construction. No external network, live crawl, remote repository write or deployment was performed during this review.

## Findings and disposition

| Finding | Correction independently checked |
| --- | --- |
| Raw location substrings could confirm explicitly excluded Argentina or mandatory foreign hybrid attendance. | Normalization accepts bounded complete location forms; unsupported mixed/negated labels remain unknown. |
| Restricted titles could still confirm despite a recognized Argentina location. | Bounded recognized titles reject unreviewed qualifiers; four independently supplied foreign-residence/attendance/exclusion titles now return unknown. |
| Removing a source from the registry retained its previous jobs. | Both normal reconciliation and replay retain jobs only for explicitly enabled current sources. |
| Current-run evidence replaced evidence needed by retained prior jobs. | Reconciliation merges evidence and prunes to retained references; strict persistence accepts missing/closed carry-over with their evidence. |
| Structural snapshot validation bypassed cross-record reference validation. | Read/write/search paths use the strict domain validation boundary. |
| Compensation filtering could match employee queries to contractor pay. | Search enforces job/query/range employment coherence along with option references. |
| Falsy malformed pay filters silently disabled compensation filtering. | Every supplied pay value is validated; null, false, zero and empty-string regressions reject. |

Earlier integration issues with producer SHA format and the accepted/excluded/unknown fixture coverage were also corrected. An explicit incompatible-schema rebuild example is covered by the integration test.

## Independent execution

- `node --test tests/jobs-ar/*.test.mjs`: exit 0; 27 tests passed, zero failed.
- Additional direct normalization probes: exit 0. Three negated/mixed Argentina location labels and four restricted titles returned unknown. These probes used synthetic local JSON only.
- The suite exercises raw fixture → canonical jobs/evidence → local atomic file persistence → search, replay, complete absence/closure, freshness boundaries, required-evidence failure versus optional-pay failure, strict references, source removal, same-option filtering, and malformed queries.
- Safety tests exercise network-denied demo/build subprocesses, explicitly synthetic artifacts, disabled inherited workflows, excluded legacy functions, and fail-closed default build. They verify the tested local paths, not deployed hosting behavior.

## Explicit limitations

V0 deliberately recognizes a small vocabulary of complete title/location forms and treats other input as unknown. It does not establish real-world geographic precision or recall. Compensation is exercised through constructed canonical records; the fixture adapter does not extract pay. Source feasibility research, real employer registry and permissions, live adapter transports, full review overrides/tombstones, production concurrency/publication, MCP transports, interactive website and P2–P7 qualification remain deferred. The local static index and JSON artifact do not constitute a production serving surface.

No claim is made that every future P1/P2 domain case is implemented, that arbitrary untrusted text is universally free of personal information, or that disabled production infrastructure has been validated in a deployed environment. Subsequent source or rule changes require renewed relevant verification.

## Final incremental check

Independently inspected the subsequent search counter changes, full fixture adapter-envelope validation and CLI argument handling, IP-literal URL rejection, and explicit evidence-validity/retention fields. Geographic unknown counts now follow the applicable query filters; role unknowns are reported separately. Pay-unknown counts use an applicable fresh range on the matched option with a zero threshold, preserving the difference between unavailable pay and a known range below the requested threshold. The fixture CLI validates the complete envelope before reconciliation and still provides no network transport.

Re-ran `node --test tests/jobs-ar/search.test.mjs tests/jobs-ar/integration.test.mjs`: exit 0, seven tests passed. No new blocking finding identified; the scope and limitations above remain unchanged. No broad suite repetition was needed for this incremental check.
