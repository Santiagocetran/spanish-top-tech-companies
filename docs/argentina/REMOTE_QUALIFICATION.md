# Remote source qualification

Reviewed 2026-11-16 by Codex. Research only. **Not approved for activation.**
Base: `e3dac1a` (includes CodeRoad review and offline regression work).

## Findings

- [Employer openings](https://remote.com/openings) directly links vacancies to
  `apply.remote.com/jobs/<uuid>`. The retrieved links did not establish an outbound
  chain to the historical Greenhouse `remotecom` candidate. This is not proof the
  old board no longer exists, nor a verified migration date.
- A linked [Principal CRM Engineer posting](https://apply.remote.com/jobs/ef51d083-81fa-4e0d-ba06-278df11a7630)
  was retrieved with page title identifying Remote ATS. The current observed
  destination is outside the implemented Greenhouse contract. Do not alias its
  UUIDs to Greenhouse IDs or expand host allowlists to accommodate it.
- The openings page warns that advertised locations may be promotional and
  directs readers to each role's restrictions. The retrieved posting did not
  establish explicit Argentina eligibility or a complete country-option set.
  Broad company messaging does not confirm this role is available from Argentina;
  eligibility remains unknown in this research review.
- The posting gives an annual range using a dollar symbol and describes
  location-dependent pay. Currency code, Argentina-specific applicability and
  gross/net basis were not established. No compensation tuple was imported.
- [Terms of Use](https://remote.com/policy/terms-of-use), labelled August 3, 2026,
  cover the website/products and include restrictions on copying, scraping,
  automation and sharing. No exception authorizing this project's collection or
  republication was established. This fails the project's permission gate.
- [Terms of Service](https://remote.com/policy/terms-of-service) describe customer
  services and limit sharing of Remote Content. They are not an affirmative license
  for an independent job discovery service. No account or agreement was created.

Decision: retain as an unapproved research lead; do not implement Remote ATS,
activate Greenhouse `remotecom`, or make further automated inventory requests on
this evidence. Provider compatibility and permission are separate failed gates.
No employer contact was made.

## Evidence provenance

One public search and four bounded Firecrawl page reads requested `maxAge: 0`.
All returned HTTP 200 at the requested URL. No API collection, application action,
full inventory reconciliation, or raw page persistence occurred. Observations are
point-in-time and do not prove future availability or complete page coverage.

| Page | Firecrawl scrape ID |
| --- | --- |
| Openings | `01a1e5bf-ce3c-7279-9646-2a99b50bbda1` |
| Terms of Service | `01a1e5bf-ce69-73e6-860e-3a940fc8e5b0` |
| Terms of Use | `01a1e5c0-0530-7406-9185-9aed75b009f6` |
| Principal CRM Engineer | `01a1e5c0-03b4-75f0-bc93-cfa4cdd86739` |

Only public URLs, paraphrased findings and retrieval identifiers are retained.
Runtime registries and Chewie's historical records remain unchanged.

## Next step

Prefer a candidate with documented syndication/API reuse permission and a supported
provider before spending effort on adapter implementation. GitLab remains an
unqualified lead, not an approved replacement. Source qualification must be able
to reject a candidate without changing product policy or adding an adapter.

## Verification

Documentation-only change: relative links, whitespace and empty runtime registries
checked locally. No code changed and tests were not rerun; the preceding offline
increment passed 81 tests with network access blocked.

Independent review found no substantive evidence, privacy or consistency issues.
