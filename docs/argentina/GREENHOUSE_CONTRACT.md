# Offline Greenhouse description and compensation increment

This increment continues the local V0 slice from commit `eee33a3`. It changes no live transport, employer registry, hosting or publication configuration. All fixtures remain invented. Existing dependencies and upstream code are unchanged.

## What works

The listing normalizer now evaluates a finite vocabulary of complete English/Spanish posting clauses. Explicit Argentina permission can establish confirmed eligibility; broad LATAM/worldwide clauses remain likely. Exclusions and conflicting location/description statements fail safely. Company offices/headquarters are background, not hiring scope. Work authorization is retained as a candidate-dependent review requirement; US-hours overlap and occasional travel are disclosed conditions rather than automatic geographic rejection.

Every clause must be recognized for required evidence to be complete. Unsupported prose, unknown entities, attributes, hidden elements and malformed/unbalanced HTML become unknown/unverified. The HTML handling is deliberately narrower than a browser parser. Arbitrary job descriptions are not claimed to be supported. Body content and excerpts are never persisted; evidence contains source URL, field path, hash, observation time and assertion type. Free-text `AR` remains ambiguous.

Optional pay details preserve all supplied `pay_input_ranges` using the fields already present in the repository's inherited Greenhouse adapter: `min_cents`, `max_cents`, `currency_type`, and `title`. Cents must be nonnegative safe integers, and reversed ranges fail enrichment. This is offline contract verification, not verification of current live API compatibility.

Additional semantics require this complete explicit title grammar:

```text
(Argentina|Worldwide|US) (annual|monthly|hourly) (gross|net)
[employee|contractor] (base salary|bonus|equity)
```

For example, `Argentina monthly gross contractor base salary` with explicit USD and 400000 cents becomes a USD 4000/month gross base range scoped to Argentina contractors. `Salary`, `$`, missing currency, missing period, incomplete titles and US-only ranges cannot silently satisfy Argentina pay filters. A pay title never assigns the job's employment relationship. No manual annotations are accepted as provider fields, and no FX or annualization is performed.

Failed or malformed optional detail bodies affect pay enrichment only. Inventory completeness and freshly verified eligibility remain independent. On optional pay failure, unchanged content/options preserve compatible prior ranges and option references with their original timestamp. Changed content or geographic/employment context discards old pay; expired pay never satisfies current filters. Explicit posting-ID or source-ID mismatches reject the candidate rather than attaching another posting's pay.

## Run

```sh
cd /home/agent/argentina-v0
npm test
npm run demo:greenhouse
npm run snapshot:check -- .cache/ar-greenhouse/snapshot.json
npm run build -- --snapshot .cache/ar-greenhouse/snapshot.json
```

The demo fixes time to `2026-11-16T00:00:00.000Z` and returns provider 201 as confirmed and 202 as likely. Its USD/month/base/gross lower-bound query at 4000 returns only 201's Argentina range. The much higher US annual band does not match. Provider 202 remains visible despite simulated pay failure. Remaining invented jobs exercise exclusion, corporate-only background, authorization uncertainty and unrecognized foreign-residence wording.

The explicit command is:

```sh
npm run crawl -- --fixture tests/fixtures/ar/greenhouse-contract.json --details tests/fixtures/ar/greenhouse-details.json --registry tests/fixtures/ar/registry.json --now 2026-11-16T00:00:00.000Z --out .cache/ar-greenhouse/snapshot.json
```

`--details` is an optional local file. Its orchestration wrapper is **synthetic**, not a Greenhouse response:

```json
{
  "dataset_kind": "synthetic",
  "source_id": "synthetic_greenhouse",
  "details": {
    "201": {"id": 201, "status": "success", "pay_input_ranges": []},
    "202": {"id": 202, "status": "failed"}
  }
}
```

Keys must identify jobs in the supplied listing. A supplied `id` must agree with the key, and `source_id` must match the registry. An absent key means not requested; an empty successful range array means successfully observed no ranges. Known-job malformed optional payloads become pay failure. A malformed wrapper, unknown job key or conflicting identity is a fatal input contract error.

## Compatibility and verification

Schema remains `ar-v0-1`; eligibility rules are now `ar-v0-2`. Snapshots evaluated under older rules are rejected. Rebuild explicitly from fixtures without `--previous`; no silent reinterpretation or migration of old decisions. The run hash includes detail input and rules version. The original `npm run demo` remains reproducible with the new rules.

Node v22.23.4 / npm 10.9.9, unchanged toolchain. No dependency install or upgrade was needed for this increment. The existing inherited Playwright audit finding remains recorded in the V0 handoff.

| Check | Actual result | Evidence |
| --- | --- | --- |
| Pre-change `npm test` | 27 passed | [baseline.log](evidence/greenhouse-contract/baseline.log) |
| Final `npm test` | 57 passed, zero failures | [tests.log](evidence/greenhouse-contract/tests.log) |
| New demo with network transports denied | Exit 0, exact expected results | [demo.log](evidence/greenhouse-contract/demo.log) |
| Snapshot check / explicit build with network denied | Exit 0 | [snapshot.log](evidence/greenhouse-contract/snapshot.log), [build.log](evidence/greenhouse-contract/build.log) |
| Historical job adapter regressions | Exit 0 | [legacy-jobs.log](evidence/greenhouse-contract/legacy-jobs.log) |
| Independent Sol review | 57 tests passed independently, including seven independently selected adversarial tests | [REVIEW.md](evidence/greenhouse-contract/REVIEW.md) |

Review reproduced and corrected lost pay-option references during optional failure, malformed optional bodies incorrectly failing the whole run, and malformed HTML incorrectly accepted as complete evidence. Parent review additionally bound detail files to their source, rejected unsafe/fractional cents, preserved explicit falsy payload failures, and removed ambiguous free-text AR interpretation. Existing tests were retained; older rules literals in test setup now use the exported version.

## Remaining boundary

This is still a narrow synthetic contract, not a live Greenhouse adapter or a broad natural-language classifier. Real descriptions will frequently be unknown. It does not prove employer permissions, real job coverage, provider schema stability or population-level eligibility accuracy. Independently chosen synthetic cases are now regression tests, not a held-out real-world quality metric.

Next bounded work: strengthen the offline multi-location/source contract with explicit per-option evidence and realistic permission-reviewed payload shapes, then undertake a separately scoped source-feasibility review. Live requests, other adapters, production writers, scheduling, website/MCP transports and publication remain outside this increment.
