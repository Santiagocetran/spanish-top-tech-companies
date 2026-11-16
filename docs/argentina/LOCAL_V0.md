# Local V0 handoff

Implemented on `implement/argentina-v0` in an isolated worktree from remote main `54f8f689bb1c84fa3271250bda3cef4ae6a62916`. Fetch confirmed no later main changes; the original checkout was clean and was not edited. No push, PR, Actions setting change, hosting, registry publication or live employer crawl occurred.

## Acceptance mapping

| Scope | Implemented local behavior |
| --- | --- |
| P0 | Explicit enforced local identity/configuration; Node pin and existing dependency lock; five inherited workflows archived outside discovery; snapshot-only, fail-closed build; no legacy routes or function artifacts; upstream notices unchanged. |
| P1 | Strict company/source/job/evidence/snapshot contracts; independent company identity; duplicate source/provider checks; bounded safe URLs and provider identity; unsupported schemas rejected with explicit fixture rebuild example; empty real registry; synthetic fixtures clearly labelled. |
| V0 / minimum P2–P3 | Synthetic Greenhouse listing → validated adapter envelope → canonical options/evidence → deterministic confirmed/likely/unknown/ineligible policy. Required eligibility evidence and optional pay enrichment are distinct. |
| V0 / minimum P4 | Atomic local JSON state; complete versus incomplete inventory; required failures retained unverified; replay hashes and ordered runs; 24-hour absence closure; reopening; current-registry removals; evidence retained with surviving jobs. |
| V0 / minimum P5 | Pure validated search and getJob; exact option-coherent filters; explicit pay tuple and employment scope; evidence, effective freshness, filters and counts; deterministic certainty/relevance/freshness/ID ordering. No salary-dataset import. |

Geographic eligibility is not personal work authorization. Optional pay failure does not refresh or invalidate eligibility; pay freshness is independent. At exactly 48 hours a verified job becomes stale, and at seven days it expires from active results. Missing/closed/removed jobs cannot be restored by include_stale. Persisted validity/expiry timestamps describe an as-of snapshot; reads use one supplied clock instant.

## Demonstration

From the implementation worktree, using Node 22.23.4:

```sh
npm ci --ignore-scripts
npm run validate:registry
npm test
npm run demo
npm run snapshot:check -- .cache/ar-demo/snapshot.json
npm run build -- --snapshot .cache/ar-demo/snapshot.json
```

The demo fixes time to `2026-11-16T00:00:00.000Z`. It writes five invented jobs to `.cache/ar-demo/snapshot.json`. Default search returns these IDs in order:

1. `job_ccd1d04df847ae9a67f2b17c2102a37b` — provider 101, confirmed Argentina remote.
2. `job_22c7adc778303b8f6c63a8cf574f57cd` — provider 105, likely LATAM remote.

Provider 103 is geographically ineligible (US-only), 104 is unknown (bare remote, opt-in), and 102 is an out-of-scope recruiter. The result count is two, not five. The output is synthetic test evidence, never collected jobs or proof of coverage.

Build generates only `_site-ar/index.html`, `_site-ar/api/v1/jobs.json` and `_site-ar/artifact-manifest.json`; the manifest's function inventory is empty. Build without an explicit snapshot fails and clears old generated output. Existing API handlers remain historical and are excluded by `.vercelignore`; no deployed route behavior is claimed.

The explicit fixture command accepts a prior local file for reconciliation:

```sh
npm run crawl -- --fixture tests/fixtures/ar/greenhouse.json --registry tests/fixtures/ar/registry.json --now 2026-11-16T00:00:00.000Z --out .cache/ar-run/snapshot.json
```

Add `--previous .cache/ar-run/snapshot.json` to replay. The same run ID cannot be reused with different input. A schema change requires an explicit rebuild without `--previous`; invalid candidates leave the last good file untouched. Producer SHA records local Git HEAD, so runs during uncommitted development identify the base commit; use a clean committed checkout for frozen provenance.

## Actual verification

Node v22.23.4, npm 10.9.9, Python 3.13.5. Python differs from upstream CI's 3.12. All commands below executed locally:

| Command | Result | Evidence |
| --- | --- | --- |
| Baseline production dependency install and inherited checks | All exit 0; no baseline test failures | [Baseline ledger](evidence/BASELINE.md) and baseline logs |
| `npm ci --ignore-scripts` | Exit 0, 17 packages installed | [install.log](evidence/install.log) |
| `npm test` | 27 passed, 0 failed | [tests.log](evidence/tests.log) |
| `npm run demo` | Exit 0; two expected IDs | [demo.log](evidence/demo.log) |
| Registry / snapshot validation and explicit build | Exit 0 | [registry.log](evidence/registry.log), [snapshot.log](evidence/snapshot.log), [build.log](evidence/build.log) |
| `python3 tests/test_pipeline.py` | Exit 0 | [final-python.log](evidence/final-python.log) |
| `python3 scripts/site.py` / `node tests/mcp.test.mjs` | Both exit 0 | [final-site.log](evidence/final-site.log), [final-mcp.log](evidence/final-mcp.log) |
| `node tests/jobs.test.mjs` | Exit 0 | [final-jobs.log](evidence/final-jobs.log) |
| `npm audit --json` | Exit 1: two high-severity entries in inherited development dependencies | [dependency-audit.json](evidence/dependency-audit.json) |

The audit entries are `playwright` / `@playwright/test` for GHSA-7mvr-c777-76hp (browser download certificate verification). Versions are unchanged from upstream. No browsers were downloaded or used for V0, and no forced dependency upgrade was performed. The initial `--omit=dev` baseline reported no production dependency vulnerabilities. Intermediate integration failures in development logs were corrected before the final passing run; they are not baseline failures or unresolved regressions.

Network-denial tests cover fetch, HTTP(S), socket and DNS transports in demo/build processes. Privacy canaries in unapproved fields and descriptions do not reach persisted/search output. These tests are bounded evidence, not a universal PII scrubber or a production egress policy. Historical explicit site checks retain upstream behavior and may fetch map topology; only the Argentina default test/build path promises offline execution.

Three GPT-6.1 Sol implementation agents and a separate GPT-6.1 Sol reviewer were used. Review caught and corrected restricted location/title false positives, source-removal retention, lost prior evidence, validation bypass, employment/pay scope mismatch and falsy malformed pay filters. See [independent review](evidence/REVIEW.md). Parent review additionally checked the full diff, strengthened same-option and completeness tests, and verified the integrated commands.

## Boundaries and next milestone

This is a working bounded slice, not completion of all P2–P5. Greenhouse V0 requires a positive provider ID; untrustworthy/missing IDs reject rather than merge or invent URL identity. Title/location normalization uses a small explicit vocabulary. Unrecognized qualifiers or nonempty descriptions become unknown/unverified; there is no general description parser. Full employer/source review, aliases/migrations, overrides and content tombstones remain future work. Real registry files are empty.

Compensation contracts and filters are tested with constructed canonical ranges; the raw fixture adapter extracts no pay. Unknown currency/period/basis never becomes USD/year/gross. Search is bounded to at most 100 matching jobs and rejects an overbroad query; pagination/cursors and transport are deferred. No production quality-gate coordinator, database, remote writer, browser UI, MCP, deployment or source-feasibility research was built.

Next bounded milestone: complete offline Greenhouse contract fixtures for required description evidence and explicit scoped compensation, expand the reviewed vocabulary and held-out synthetic regressions, then perform a separately scoped source ownership/permission feasibility review. Live requests and production publication require their own authorization and acceptance gates.
