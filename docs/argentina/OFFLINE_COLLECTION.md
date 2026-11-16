# Offline Greenhouse collection contract

This increment adds `lib/jobs/collect-greenhouse.js`. It requires an explicitly injected transport; it has no default fetch implementation, live command or production network client. Tests use synthetic in-memory responses. Source-feasibility findings are [separate research leads](SOURCE_FEASIBILITY.md).

```js
const { envelope, evidence } = await collectGreenhouse({
  source, company, run_id, observed_at,
  transport: async ({ url, method, signal, timeout_ms, max_bytes }) => {
    // Return a reviewed local fixture: { status: 200, body, url }.
    // This milestone supplies no live implementation.
  },
  enrich_pay: false,
});
```

The validated envelope can be passed as one source result to `reconcileSnapshot`; the evidence accompanies snapshot metadata. See `tests/jobs-ar/collection.test.mjs` for executable end-to-end reconciliation examples.

## Boundaries enforced

- Exact global Greenhouse hosted/source identity, safe board token and provider-only host allowlist; EU is unsupported pending a documented contract.
- Enabled source, matching verified employer, retrieval/publication review flags, no future review dates and unexpired review deadline before dispatch.
- One unfiltered list request with `content=true`; optional individual pay detail requests use only `pay_transparency=true`. No questions, application writes, redirect following or pagination guessing.
- Source request/detail caps, a bounded overall deadline, cancellation signal and 1 MiB serialized response guard. Page budget permits only the one audited list request.
- Matching `meta.total` and no truncation/pagination hints required for inventory completeness. Missing jobs array is invalid, distinct from a valid empty complete inventory.
- Native listing descriptions must be present strings: omission is required-evidence failure, not proof of no restrictions. Invalid posting identity makes inventory partial.
- Valid observed IDs with failed required evidence remain observed. Prior records stay stale without refreshing their eligibility clock; unseen malformed records are quarantined without invented title/location fields. They do not block unrelated valid records or absence reconciliation.
- Optional detail failures preserve verified listing eligibility. Compatible prior pay retains its original freshness timestamp.

The byte guard runs after the injected transport materializes JSON and does not protect a live client's stream or memory allocation. DNS resolution, address pinning, actual-destination concurrency, streaming caps, retries and permission-reviewed live behavior remain future work. The synthetic transport must honor abort; late results are not incorporated into a returned envelope. No arbitrary URL or credentials are accepted from a public user interface.

## Verification

```sh
npm test
node --test tests/jobs-ar/collection.test.mjs tests/jobs-ar/source-contract.test.mjs
```

Node v22.23.4; no new dependencies. The full suite passes 75 tests. [Execution log](evidence/collection/tests.log) and [independent review](evidence/collection/REVIEW.md) record scope and corrections. The review reproduced two gaps that are now covered: omitted descriptions being treated as verified, and unseen malformed observed IDs blocking the entire reconciliation.

The existing fixture CLI and demos remain offline. This library is not wired to a live runtime, and no sources were activated. Existing eligibility rules remain `ar-v0-2`; this change tightens collection admission and lifecycle handling, not the text classifier.
