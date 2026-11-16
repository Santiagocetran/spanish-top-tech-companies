# Contributing to the Argentina prototype

Read the [current guide](docs/argentina/README.md), [corrected plan](docs/argentina/IMPLEMENTATION_PLAN.md) and [Greenhouse contract limits](docs/argentina/GREENHOUSE_CONTRACT.md). Follow the [code of conduct](CODE_OF_CONDUCT.md). `DRAFT_REVIEWED.md` and the original audit are historical records, not implementation instructions.

## Local workflow

Use Node 22.23.4 and npm 10.9.9. Work on a branch; inspect existing changes before editing.

```sh
npm ci --ignore-scripts
npm run validate:registry
npm test
npm run demo:greenhouse
npm run snapshot:check -- .cache/ar-greenhouse/snapshot.json
npm run build -- --snapshot .cache/ar-greenhouse/snapshot.json
git diff --check
```

Installation may access the package registry. Default Argentina tests/builds must remain offline. Do not add live calls, publication or credentials to install/test/build scripts. Generated `.cache/` and `_site-ar/` files are ignored and must not be committed.

Use the smaller `npm run demo` for the original V0 fixture. `npm run crawl` is currently a local fixture orchestrator, not a live crawler. Its explicit options and detail-file contract are in the [Greenhouse guide](docs/argentina/GREENHOUSE_CONTRACT.md#run).

## Changes and evidence

- Keep source identity stable and validate malformed, duplicate and unsafe records. Companies require no salary row.
- Preserve unknown values. Never infer USD, annual compensation, gross basis, employee status, seniority or Argentina eligibility from absence of evidence.
- Keep filters on one location option. Explicit exclusions, conflicts, bare remote, pay-only failures, incomplete inventories, replay and clock boundaries need regression coverage when affected.
- Use injectable time and bounded tests, not sleeps. Keep snapshots/evidence sanitized; do not persist full descriptions, recruiter contacts or arbitrary errors.
- Label invented fixtures as synthetic. Do not submit real employer data without reviewing ownership and permission. No real registry population is part of the current milestone.
- Changes to eligibility rules require a new rules version and explicit rebuild/reclassification policy. The current version is `ar-v0-2`; old snapshots fail closed.
- Record actual commands, results and scope in the relevant handoff. Separate existing failures from regressions. Do not weaken tests to manufacture a pass.

Review the full diff before committing. Preserve LICENSE, LICENSE-DATA and upstream attribution. Do not enable archived workflows, schedule crawls, deploy or publish registry entries as a side effect of a change. Pushing a branch is not authorization to merge or deploy it.

## Historical upstream regressions

The original Spain application is preserved separately. If a shared change affects it, run the applicable checks:

```sh
npm run test:legacy:python
npm run test:legacy:jobs
npm run test:legacy:mcp
```

The Python baseline was verified with Python 3.13.5 (upstream CI used 3.12). The inherited site generator can fetch map topology; these explicit historical commands do not have the Argentina offline guarantee. Do not run salary refresh, Levels.fyi collection or board discovery as part of an Argentina contribution.

The original salary contribution guide remains in [upstream at the reviewed revision](https://github.com/pugarte7/spanish-top-tech-companies/blob/2042874594e81fb3eba74f084f7ad0cd0fb05049/CONTRIBUTING.md). Those product rules do not govern this adaptation.

## Reports and privacy

For bugs, provide a minimal synthetic example, expected behavior, actual behavior and relevant versions. Never post CVs, application data, tokens, personal salary records or recruiter contact information in public issues. Use the synthetic bug or source-research template. Employer URLs are research leads, not manually published postings.

For security reports, read [SECURITY.md](SECURITY.md). The prototype has no hosted Argentina service or private-data collection.
