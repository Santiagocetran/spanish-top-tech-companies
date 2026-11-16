# Argentina adaptation: audited implementation plan

This fork is preparing an Argentina-focused technology job discovery service: positions located in Argentina and remote positions available to people residing there.

**Status: planning published; implementation has not started.** Existing application code, datasets and live-service links still belong to the upstream Spain-focused project. They are not an Argentina service. GitHub Actions are disabled on this fork to prevent inherited deployment, release and registry workflows from running.

## Start here

1. [Corrected implementation plan](IMPLEMENTATION_PLAN.md) — architecture, schemas, phased work and acceptance criteria.
2. [Audit resolutions](AUDIT_DISPOSITION.md) — disposition of all 14 independent review findings.
3. [Independent audit](AUDIT.md) — the original review; line references point to the [reviewed draft](DRAFT_REVIEWED.md).

The recommended first work package is **P0–P1 + V0**: fork hygiene, data contracts and a local fixture flowing through normalization, Argentina eligibility, lifecycle tracking and search. It requires no live crawl, hosting or remote publication.

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
