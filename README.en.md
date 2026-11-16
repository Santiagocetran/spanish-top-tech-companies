# Argentina Tech Jobs

[Español](README.md) · [Technical guide](docs/argentina/README.md) · [Contributing](CONTRIBUTING.md)

A prototype for discovering technology positions located in Argentina or available remotely from Argentina, with evidence and explicit uncertainty.

**Status: local synthetic demonstration.** The P0–P1 foundation, V0 vertical slice and an offline Greenhouse contract extension are implemented. There is no real employer coverage, live crawling, published Argentina website or MCP server. Real registries are empty. Application automation is out of scope.

## Run locally

Requires Git, Node **22.23.4** (`.nvmrc`) and npm **10.9.9**. Implementation currently lives on `implement/argentina-v0`.

```sh
git clone --branch implement/argentina-v0 https://github.com/Santiagocetran/spanish-top-tech-companies.git
cd spanish-top-tech-companies
npm ci --ignore-scripts
npm run validate:registry
npm test
npm run demo:greenhouse
npm run snapshot:check -- .cache/ar-greenhouse/snapshot.json
npm run build -- --snapshot .cache/ar-greenhouse/snapshot.json
```

Installation downloads dependencies; Argentina tests and demonstrations run offline. The demo uses a fixed clock and six invented postings. It returns posting 201 as **confirmed** and 202 as **likely**. A USD/month/base/gross lower-bound filter of 4000 matches only posting 201's Argentina range. A simulated pay-enrichment failure does not hide posting 202.

Build writes a labelled local index, JSON and artifact manifest to `_site-ar/`; it is not a complete web application. Build without `--snapshot` fails explicitly. `npm run demo` retains the original five-posting V0 demonstration.

## Implemented behavior

```text
Greenhouse fixture → validated records → canonical jobs and evidence
  → Argentina eligibility → local JSON lifecycle → exact search
```

- Employer/source identity independent of Levels.fyi and salary availability.
- Strict contracts, stable IDs, traceable evidence and atomic local persistence.
- **Confirmed / likely / unknown / ineligible** eligibility. Bare remote is insufficient; broad LATAM/global wording is not confirmed. Personal work authorization is separate.
- Location, workplace, eligibility and pay filters must match the same posting option.
- Explicit currency, period and pay scope; no guessed defaults or conversions.
- Inventory completeness, required evidence and optional pay enrichment are separate. Replay does not double-count absence.
- Read-time freshness: stale at 48 hours and expired-unverified at seven days, with independent pay freshness.

Parsing supports a bounded vocabulary and HTML subset. Unrecognized prose stays unknown; no real-world accuracy is claimed. Snapshots predating rules `ar-v0-2` require an explicit rebuild.

## Documentation and verification

- [Developer guide and commands](docs/argentina/README.md)
- [Current Greenhouse contracts, limits and evidence](docs/argentina/GREENHOUSE_CONTRACT.md)
- [V0 handoff and historical baseline](docs/argentina/LOCAL_V0.md)
- [Corrected implementation plan](docs/argentina/IMPLEMENTATION_PLAN.md) and [audit resolutions](docs/argentina/AUDIT_DISPOSITION.md)
- [Latest independent review](docs/argentina/evidence/greenhouse-contract/REVIEW.md)

Latest verification records **57 passing tests**, offline demo/build checks and passing historical job regressions. Two high-severity audit entries remain in inherited Playwright development dependencies, which this prototype does not use. Results and limitations are documented; they do not establish production readiness.

Inherited workflows are archived outside `.github/workflows/`. Schedules, deployment, releases and MCP publication remain disabled. The Argentina runtime does not load Spanish data, telemetry or legacy endpoints.

## Next steps

Expand offline per-location-option contracts and realistic permission-reviewed fixtures, then review source feasibility, ownership and permissions. Live crawling, other ATS adapters, MCP, a full website and publication belong to later stages; these commands enable none of them.

## Provenance and licenses

Forked from [pugarte7/spanish-top-tech-companies](https://github.com/pugarte7/spanish-top-tech-companies). Original attribution, the [MIT code license](LICENSE) and [inherited data license](LICENSE-DATA) are preserved. Historical Spanish data is not presented as Argentina data. No additional third-party data rights are granted.

Historical Spain code, guidance and regressions remain isolated for traceability; their services belong to upstream. See [provenance and divergences](docs/UPSTREAM.md).
