# Security reporting

This fork currently provides an offline Argentina prototype with synthetic data. It does not operate the upstream Spain website/MCP, a hosted Argentina service, or candidate-data storage. See the [current scope](docs/argentina/README.md).

Report issues to the maintainers of **Santiagocetran/spanish-top-tech-companies**, not the upstream project's operator. Private reporting availability has not been verified: if this repository's GitHub Security tab offers **Report a vulnerability**, use it. Otherwise use a contact method publicly supplied by the [repository owner](https://github.com/Santiagocetran). If none is available, request a private reporting channel without disclosing vulnerability details. No response-time commitment is established yet.

Do not include credentials, personal information or an exploitable report in a public issue. A useful private report includes the affected commit, a minimal synthetic reproduction, expected behavior and observed impact. Do not test against real employer boards, applicants or upstream production to demonstrate a local issue.

Relevant boundaries include malformed input, unsafe identity/URLs, accidental network access, stale/incorrect eligibility or pay exposure, and leakage of unapproved source content. Default Argentina execution must remain offline; `npm run test:security` checks selected local boundaries. It is not a comprehensive security assessment.

The inherited Playwright development dependencies have two high-severity audit entries recorded in [the V0 evidence](docs/argentina/evidence/dependency-audit.json). They are unchanged and unused by the current Argentina runtime; browser tooling must be reviewed before future use. Upstream-specific code is preserved for historical regressions and excluded from the active Argentina build.
