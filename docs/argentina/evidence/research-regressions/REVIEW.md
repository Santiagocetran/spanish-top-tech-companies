# Research-derived offline regressions

Environment: Node v22.23.4, npm 10.9.9. Synthetic data only.

- Initial targeted execution failed before tests because this checkout had no installed Zod dependency; this was an environment setup failure, not a test assertion failure.
- `npm ci --ignore-scripts`: passed, 17 packages installed; two inherited high-severity development dependency audit findings remain. No dependency files changed.
- `node --test tests/jobs-ar/collection.test.mjs`: 14 passed.
- `node --import ./tests/jobs-ar/deny-network.mjs --test tests/jobs-ar/*.test.mjs`: **81 passed, 0 failed**; [actual output](tests.log).
- `npm run validate:registry`: REGISTRY_OK; real registries remain empty.
- `git diff --check`: passed.

Six new tests cover expired-page redirects and HTML masquerading as successful
responses, repeated incomplete-run reconciliation and replay, country selectors,
candidate compensation expectations, and a positive employer-pay control.
Existing runtime behavior already fails closed; no production code or eligibility
rules changed. These tests do not claim real employer coverage or source approval.
Historical test results elsewhere remain dated records, not rerun claims.

Independent review: no substantive findings. Reviewer separately ran the 19
collection and research-boundary tests with the network-denial preload; all
passed. Review confirmed the positive pay control and lifecycle replay assertions.
