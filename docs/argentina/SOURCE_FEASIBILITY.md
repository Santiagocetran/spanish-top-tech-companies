# Preliminary source feasibility — research leads only

Checked 2026-11-16 using public search results and employer/documentation pages retrieved through Firecrawl. Some page responses were cached earlier the same day. No employer job API, applications endpoint or automated inventory crawl was called. No postings were ingested or added to the real registry, and no employer was contacted.

This is a small discovery checkpoint, not source approval. Chewie's prior search evidence can replace or enrich these leads. Candidate URLs must be independently checked before activation; no source has confirmed retrieval/republication permission in this report.

| Candidate | Employer-owned evidence read | Board/transport indication | Argentina relevance and remaining gaps |
| --- | --- | --- | --- |
| GitLab | [Careers](https://about.gitlab.com/jobs/) identifies all-remote culture and links to its own all-jobs page. | Search results identify a GitLab Greenhouse board (`gitlab`); the direct employer-to-ATS link was not established from the page read. | Remote culture is background only. Argentina posting eligibility, exact board ownership chain and permission remain unverified. |
| Remote | [Careers](https://remote.com/careers) links to its own openings page and describes a distributed team. | Search results identify [Greenhouse `remotecom`](https://job-boards.greenhouse.io/remotecom); the careers page read links to `remote.com/openings`, not directly to the ATS. | Potential global-remote lead, not proof any role accepts Argentina. Board ownership chain and reuse permission remain unverified. |
| dLocal | [About page](https://www.dlocal.com/company/about-us/) links to careers and lists a Buenos Aires office. | Search results identify [Lever `dlocal`](https://jobs.lever.co/dlocal), not Greenhouse. | Local presence is background, not job eligibility. Current hiring scope and permission are unknown. Lever is not implemented in the new runtime, so this is a transport gap rather than an approved source. |

Employer terms/republication scope have not been established. Do not interpret a public page, search snippet, company office or remote culture as permission or eligibility. No current vacancy counts are asserted. Real `data/registry/` files remain empty.

## Documentation findings used by offline engineering

The [official Greenhouse Job Board API documentation](https://docs.greenhouse.io/job-board.html) describes the list endpoint as all published posts, illustrates `meta.total`, and documents `content=true`. The provider posting `id` is distinct from `internal_job_id`. Pay transparency is documented for the individual-job endpoint. Board introductions and conclusions can be concatenated with the posting description, so background language must not establish job-specific eligibility.

The offline collector requires a matching nonnegative `meta.total` before claiming complete inventory. This is our conservative gate, not a claim that the API guarantees transactional consistency. Missing totals or pagination/truncation hints yield partial results. The reviewed documentation establishes the global API host; EU collection remains unsupported. Pay detail examples include `blurb`; the current narrow compensation parser may conservatively reject unfamiliar range fields rather than infer their meaning.

## Next evidence needed

- Employer-owned careers page linking to the exact ATS board and hosting region.
- Recorded source terms/reuse review and a named reviewer; unknown permission keeps the source disabled.
- Representative, permission-reviewed payload shapes, especially multi-location descriptions and pay scope.
- Posting-specific Argentina evidence with observation dates, including exclusions and ambiguous examples.
- An explicitly authorized bounded live smoke, after a reviewed real-source record exists. None is authorized or executed by this research note.

Do not lower completeness or eligibility rules to meet a board count. Existing Chewie search history should first land as documented research evidence on a separate branch, never as automatic activation of a source or import of application data.
