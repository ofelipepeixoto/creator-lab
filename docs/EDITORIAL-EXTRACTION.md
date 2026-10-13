# Offline editorial extraction — draft contract

This fork retains the MIT license and copyright of Artem Novitckii. The source
baseline is upstream commit `14f83569977fac0821ddaa98706e3c8b6253b1d8`.
The adapter and synthetic regression cases added here are changes in the fork;
they do not establish authorship of the upstream application.

## Scope

`lib/editorial.mjs` exposes a pure `prepareEditorialReview` function. It validates
classification through the existing schema and builds a versioned review packet.
It performs no network, provider, scraping, storage, approval or publication action.
It is intended for an existing review workflow, not a second editorial application.
No private downstream source or client data is included. A separate input archive
was not verified; this work makes no claim that it equals the public baseline.

Inputs are a transcript, a provider-shaped classification result, and source
provenance. `source.kind` must be `synthetic` or `authorized`. Its SHA-256 must
match the exact UTF-8 transcript text. Authorized sources require a rights-reference
identifier. These declarations are not proof of consent or authorization: a real
caller must check resource access and media rights before processing/exporting data.

The output includes source provenance, schema/model, labels, segment evidence,
a deterministic content hash, `review.status = pending`, `review.approved = false`
and `publication.allowed = false`. It excludes raw provider payloads, arbitrary
probabilities, API keys and source download URLs. Segment text remains content:
protect the packet as private data when real authorized sources are introduced.

An importing service must enforce its own organization/resource authorization and
bind human approval to the reviewed content hash. This packet does not grant
permission or perform that integration. Source text and classification changes
invalidate the hash. No downstream repo, database, automation or workflow changed.

## Hardening included

- Transcription cache identity includes provider/model, language and media URLs.
  Old cache entries are left intact but not reused. Signed URL rotation may cause
  extra cache misses; unchanged URLs with changed bytes still require content hashes.
- Imported text and segment content have separate bounds before request assembly.
  This is not a tokenizer or a global spending cap.
- A classification response must identify the requested model. Real provider alias
  compatibility remains to be verified before live use; do not silently accept aliases.
- Invalid/negative input usage becomes unknown instead of a negative cost.

## Validation and limits

Run `npm run check` and `node --test tests/*.test.mjs` in a disposable environment
without credentials and with network blocked. No npm dependencies are required;
Node >=22.9 and FFmpeg/ffprobe must already exist. Review scripts before running.
The pre-existing suite uses mocked provider responses and synthetic WAV/MP4 files.
The additional fixtures are synthetic and have no downloaded/social media content.

On Node 24.19.0 / FFmpeg 7.1.5: the original 21 tests passed; five added regression
cases failed on the baseline and passed after the fixes. The four adapter tests
exercise deterministic hashing, payload minimization, source bounds, required
rights declarations and pending review. No live provider, AI-quality evaluation,
browser E2E, tenant isolation, load test, spend ledger or production deployment
is claimed. The local audit denied network syscalls with seccomp and cleared the
environment; filesystem namespace isolation was unavailable.

Keep paid services disabled during review. The existing application remains local
and single-user. The Apify cap is not a cap for transcription or classification.
Media rights, retention/deletion, parser isolation and budget enforcement remain
prerequisites for processing real client data.
