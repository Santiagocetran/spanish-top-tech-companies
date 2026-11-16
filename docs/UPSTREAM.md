# Upstream provenance and local divergence

Based on `pugarte7/spanish-top-tech-companies` at reviewed revision `2042874594e81fb3eba74f084f7ad0cd0fb05049`. Original code/data licenses and attribution remain in LICENSE and LICENSE-DATA. Historical Spain datasets and tools remain historical; they are not Argentina data.

The Argentina path is isolated under `lib/jobs/`, `data/registry/`, `tests/jobs-ar/`, synthetic fixtures and explicit local commands. Existing ATS, salary, site and MCP behavior is retained for historical regression checks. The default commands do not load it. No automatic upstream merges are configured.

All inherited workflow YAML is archived in `.github/workflows-disabled/`, outside GitHub's discovery directory. Active Vercel configuration has no redirects, external rewrites or telemetry, disables Git deployment, and requires an explicit validated local snapshot. `.vercelignore` excludes the entire legacy `api/` function directory. Generated `_site-ar/` contains only the documented static file allowlist; it is a local demonstration, not a deployed service. No hosting deployment or remote settings have been tested or changed.

Node is pinned by `.nvmrc`; existing dependency versions and lockfile resolutions are preserved. Baseline and milestone evidence lives in `docs/argentina/evidence/`. Upstream historical scripts may access external services when explicitly invoked; default Argentina tests/demo/build use only local synthetic inputs.

The root Spanish and English READMEs, contributor/security guidance and active issue/PR templates describe the Argentina prototype. Spain-specific methodology, `CLAUDE.md` content below its adaptation banner, `docs/CONTEXT.md` and the shared ATS README are explicitly historical. Original README/contribution text remains available in Git history and [upstream at the reviewed revision](https://github.com/pugarte7/spanish-top-tech-companies/tree/2042874594e81fb3eba74f084f7ad0cd0fb05049). The upstream maintainer's contact is not this fork's reporting contact.
