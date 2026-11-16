# CodeRoad source qualification

Reviewed 2026-11-16 by Codex. Research only; source activation is **not approved**.
Base: `cafe1d8873230fba20e5ecd7c0c3a8fc5c47348d`.

## Evidence and decision

| Gate | Finding | Disposition |
| --- | --- | --- |
| Employer-to-board link | [CodeRoad careers](https://coderoad.com/careers) directly links its openings buttons to `https://job-boards.greenhouse.io/coderoad`. | Ownership-link evidence established for this review date. |
| Provider identity | Linked board uses the global Greenhouse hosted domain and token `coderoad`. | Matches the existing adapter identity shape; API transport and region behavior were not tested. |
| Historical lead | [Saved posting 4458046009](https://job-boards.greenhouse.io/coderoad/jobs/4458046009) resolved to `/coderoad?error=true`, with HTTP 200 and “The job you are looking for is no longer open.” | Historical lead is unavailable at review time. HTTP success alone is not a valid job. No runtime lifecycle state was changed. |
| Argentina evidence | [Senior Data Engineer 4164240009](https://job-boards.greenhouse.io/coderoad/jobs/4164240009) names Argentina in its location header and Argentina, Colombia and Brazil in the body. | Direct country evidence exists for this specific posting; not a board-wide eligibility claim. |
| Workplace and relationship | The same posting describes remote contractor work; its US contractor wording needs careful separation from residence and personal authorization. | Research evidence only. No canonical location options or employment relationship imported. |
| Compensation | Posting mentions USD, but no amount, pay period or gross/net basis was established. | No filterable pay tuple. An applicant salary-expectations question is not an employer offer. |
| Reuse | [CodeRoad terms](https://coderoad.com/terms-and-conditions) reserve copyright and restrict reproduction, distribution and republication beyond resource use. | No affirmative collection/republication permission established. The scope of corporate terms over third-party Greenhouse content remains unresolved. Do not mark permission approved. |

The careers page’s general remote benefits and compensation statements do not
establish any individual job’s country eligibility or pay. Application-form country
selectors are not geographic eligibility evidence. No personal work authorization
or suitability for any candidate was evaluated.

## Retrieval provenance

One public search and four bounded page reads through Firecrawl, requesting
`maxAge: 0`. All four returned HTTP 200; redirect/final URL was inspected.
These are retrieval-time observations, not guarantees of future availability.
No employer API, inventory collector, application submission or employer contact
was used. The expired posting returned a board page incidentally; its displayed
job count was not treated as a complete inventory or ingested.

| Requested page | Firecrawl scrape ID |
| --- | --- |
| CodeRoad careers | `01a1e5b6-835b-733f-b27d-78339e300b5f` |
| Historical posting 4458046009 | `01a1e5b6-8360-7218-9a3f-b588e196062b` |
| CodeRoad terms | `01a1e5b6-acae-7109-a3d7-15ba42f2d895` |
| Posting 4164240009 | `01a1e5b6-acef-749b-8ad0-b0db549e03d2` |

Only short findings and public URLs are retained, not page bodies, form fields,
contacts or personal preferences. Chewie’s historical artifacts remain unchanged;
this dated review supplements them rather than rewriting their provenance.

## Next bounded work

Resolve the collection/republication scope for this employer and provider before
activation. Any employer contact requires a separate instruction. If permission
cannot be established, retain CodeRoad as an unapproved research candidate and
qualify another source. Public API documentation or accessibility alone does not
satisfy the project permission gate.

Independently, the offline roadmap can test synthetic expired-job redirects and
application-form contamination without copying real descriptions or making live
requests. This review does not implement an HTML adapter or expand the parser.

## Validation

Documentation-only increment. Relative links, diff whitespace and empty runtime
registries are checked locally. No runtime behavior changed; the preceding merge
passed all 75 tests. This research does not claim a live adapter test.

Independent review found no blocking evidence or privacy issues. Two stale
documentation statements about deferred research and the pending Chewie handoff
were corrected.
