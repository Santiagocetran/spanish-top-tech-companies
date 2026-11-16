# Argentina adaptation: audited implementation plan

This fork is preparing an Argentina-focused technology job discovery service: positions located in Argentina and remote positions available to people residing there.

**Status: local P0–P1 + V0 prototype implemented.** The Argentina commands use synthetic fixtures only; no real employer coverage, live crawl, MCP transport, production website or deployment is provided. Inherited Spain code/data and service links remain historical. All inherited GitHub workflows are archived outside the discovery directory.

See the [V0 handoff](LOCAL_V0.md) for acceptance mapping, exact results, review corrections and limitations.

The next offline increment is also implemented: [Greenhouse description and pay contracts](GREENHOUSE_CONTRACT.md). Run `npm run demo:greenhouse` for its six-job synthetic demonstration.

## Run locally

Use Node `22.23.4` (`.nvmrc`) and the existing pinned lockfile:

```sh
npm ci --ignore-scripts
npm run validate:registry
npm test
npm run demo
npm run snapshot:check -- .cache/ar-demo/snapshot.json
npm run build -- --snapshot .cache/ar-demo/snapshot.json
```

The demo fixes its clock to `2026-11-16T00:00:00.000Z` and writes a deterministic, explicitly synthetic snapshot. Its search runs at that same instant. This is reproducible test evidence, not a claim the jobs are fresh today. Search consumers must pass current time when serving real reads. Build copies the snapshot with its original as-of timestamp and writes only a labelled local index, JSON and static artifact manifest to ignored `_site-ar/`. Build without `--snapshot` fails closed, clearing prior output; there is no Spain or live-data fallback.

For explicit local orchestration:

```sh
npm run crawl -- --fixture tests/fixtures/ar/greenhouse.json --registry tests/fixtures/ar/registry.json --now 2026-11-16T00:00:00.000Z --out .cache/ar-run/snapshot.json
```

Add `--previous <local snapshot.json>` to exercise lifecycle reconciliation. This `crawl` command accepts fixtures only and has no network transport. Configuration in `config/project.json` enforces Argentina and disables telemetry, crawling and publication. Registry defaults validate the synthetic fixture, not an approved employer registry.

Historical regressions remain explicit: `npm run test:legacy:python`, `npm run test:legacy:jobs`, and `npm run test:legacy:mcp`. They retain upstream behavior; the inherited site builder can fetch map topology, so these are not an offline guarantee. Argentina tests preload transport denial for subprocess demo/build checks. See [upstream divergence](../UPSTREAM.md) and [baseline evidence](evidence/BASELINE.md).

No remote settings, hosting or deployed route behavior were changed or tested. Source feasibility research is deferred by the local milestone scope: no employer discovery or real registry is claimed. Production qualification, source permissions, real adapter transport and P2–P7 remain outstanding.

## Start here

1. [Corrected implementation plan](IMPLEMENTATION_PLAN.md) — architecture, schemas, phased work and acceptance criteria.
2. [Audit resolutions](AUDIT_DISPOSITION.md) — disposition of all 14 independent review findings.
3. [Independent audit](AUDIT.md) — the original review; line references point to the [reviewed draft](DRAFT_REVIEWED.md).

The implemented **P0–P1 + V0** slice proves local fixture normalization, Argentina eligibility, lifecycle tracking and pure search. The implementation plan remains the authoritative scope for later phases; its original planning status describes the earlier stage.

## Recorded baseline

Reviewed upstream revision: `2042874594e81fb3eba74f084f7ad0cd0fb05049`.

These checks passed during the planning review, before implementation:

- [Python pipeline checks](pipeline.log)
- [Site build and MCP checks](site-mcp.log)
- [Job fixture checks](jobs.log)

The logs include deliberately simulated failures used by the tests. They do not establish live Argentina coverage or production readiness. The local Python runtime differed from upstream CI; details are in the implementation plan.

Audit/draft statements that no fork or publication had occurred describe the earlier review stage. Local environment paths have been replaced with portable references for publication. No private dataset or credentials are included.

## Provenance

Forked from [pugarte7/spanish-top-tech-companies](https://github.com/pugarte7/spanish-top-tech-companies). Original code and data notices remain in [LICENSE](../../LICENSE) and [LICENSE-DATA](../../LICENSE-DATA). The Argentina plan does not relabel the upstream Spanish dataset or grant additional rights to third-party data.
