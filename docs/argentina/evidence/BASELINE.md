# V0 baseline verification

Fetched `origin/main` before editing on 2026-11-16. Remote main and local main both pointed to `54f8f689bb1c84fa3271250bda3cef4ae6a62916`; no subsequent commits. Original working tree was clean. Implementation worktree: `/home/agent/argentina-v0`, branch `implement/argentina-v0`. No reset, push or external write.

Runtime: Node v22.23.4, npm 10.9.9, Python 3.13.5. Upstream CI requested Node 22 / Python 3.12; Python is a documented environment deviation.

Executed sequentially before implementation; each exited 0:

| Command | Log |
| --- | --- |
| `npm ci --omit=dev --ignore-scripts` | baseline-install.log |
| `python3 tests/test_pipeline.py` | baseline-python.log |
| `python3 scripts/site.py` | baseline-site.log |
| `node tests/mcp.test.mjs` | baseline-mcp.log |
| `node tests/jobs.test.mjs` | baseline-jobs.log |

No baseline failures. Simulated upstream HTTP failures in fixture logs are expected test cases. This is the historical Spain application baseline, not Argentina coverage. No private salary CSV refresh or live employer crawl was run. Baseline site generator was executed as inherited; the new Argentina path must have no network capability.

Applicable root `CLAUDE.md` and `CONTRIBUTING.md` were read. No AGENTS.md was found in this repository or parent directories. Their Spanish salary ingestion and publication product rules are historical upstream context, not requirements to translate salaries, fetch private data or publish this local milestone. License notices remain unchanged.
