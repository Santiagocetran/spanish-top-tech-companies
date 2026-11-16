# Independent offline Greenhouse contract review

Date: 2026-11-16. Runtime: Node v22.23.4. Reviewed the working-tree changes based on `eee33a38161593c4e1194ff49c7ca5ed243c0cb1`; that revision identifies the base, not a frozen implementation commit.

## Result and scope

No remaining blocking finding identified for this bounded synthetic milestone after corrections. Independently inspected description extraction and normalization, native-shaped compensation parsing, optional-detail orchestration and identity checks, lifecycle pay carry-over, and affected schemas. Added the independent synthetic cases in `tests/jobs-ar/held-out-contract.test.mjs`; did not edit production modules. No live requests, external writes, deployment or real employer data were used.

The cases were selected separately from the implementation fixtures and then retained as regression tests. They are now development evidence, not a frozen held-out accuracy benchmark or an estimate of real-world precision/recall.

## Findings corrected during review

| Finding | Evidence and verified correction |
| --- | --- |
| Optional detail failure retained prior compensation but lost option-to-range references, making still-fresh pay disappear from salary search. | A successful AR pay observation followed one hour later by a failed detail returned zero salary results. The held-out regression initially failed. Lifecycle now carries both ranges and references only across unchanged content and material option context; the regression passes without refreshing pay timestamps. Separate tests invalidate carry-over when context changes. |
| Malformed known-ID optional bodies could abort normalization of an otherwise valid inventory. | Null/scalar/array values were rejected by the map precheck. Known-ID malformed bodies now produce failed optional enrichment while preserving the eligible listing. Independently tested null, false, zero, empty/nonempty strings, array and malformed success body. Unknown IDs and explicit conflicting posting identities remain fatal contract errors. |
| The HTML allowlist accepted unbalanced/crossed allowed tags as complete input. | Four direct probes initially returned complete for mismatched, missing, reversed and crossed tags. A tag stack now rejects these forms. All four are covered by held-out regression assertions. |

Also checked that supplied falsy compensation bodies are failures rather than silently treated as not requested; only absent input uses not-requested status. The CLI detail wrapper binds the details file to its registry source before normalizing provider IDs.

## Independent verification

- `node --test tests/jobs-ar/held-out-contract.test.mjs`: exit 0; seven tests pass after fixes.
- `node --test tests/jobs-ar/*.test.mjs`: exit 0; 57 tests pass, zero failures.
- The held-out cases cover EN/ES posting-specific positives, corporate background without posting eligibility, regional scope, negation and double-negation uncertainty, conflicting specifics, US authorization versus residence, occasional travel/time overlap, unsupported and hidden HTML, title/location restrictions resisting favorable body text, missing pay currency/period/basis/component/scope, explicit AR versus US tiers, malformed optional data, and usable still-fresh pay after an optional outage.
- Existing regressions remain in the full suite; this review did not weaken them. Network-denied local demo/build checks also pass in that suite.

Final incremental check: inspected the narrowing that leaves free-text `AR` shorthand unsupported, preserving the original country-code ambiguity rule. Re-ran the full suite afterward: 57/57 pass, exit 0.

## Limits

Description extraction recognizes a finite, anchored vocabulary and a small balanced HTML subset. Unrecognized prose remains unknown; it is not general natural-language understanding or a browser HTML parser. Native pay amounts and currency are preserved, while only the documented exact title grammar supplies additional pay dimensions. Unsupported titles keep dimensions unknown; no period, currency, gross basis or Argentina applicability is guessed.

The detail status wrapper is local synthetic orchestration, not a claim that Greenhouse sends those status fields. Native-shaped fixture fields and offline grammar tests do not establish compatibility with an actual employer's board, network transport, pagination, permissions, caps, production failure rates, or real compensation labels. Full bodies/excerpts are not persisted; these canary assertions demonstrate covered cases, not universal personal-information detection.

Rules version changed, and incompatible prior snapshots require an explicit rebuild. This milestone does not authorize live crawling, real-source onboarding, remote persistence/publication or deployment, nor satisfy the later P2–P7 production qualification gates.
