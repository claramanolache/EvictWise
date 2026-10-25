# RAG audit — October 24, 2026

Audited local branch `RAG` at `bf3a7e5`. The original workspace was on `main`, which does not contain RAG. The audited changes were developed in the isolated `fix/rag-audit` worktree, then applied as uncommitted changes to the main checkout after the original RAG branch was merged.

## Verified defects patched

- Overloaded default generation model had no fallback. Switched the default to a model verified with the configured key; added one bounded fallback on transient errors and no retries on invalid credentials/schema.
- Real Gemini answers used grouped citations (`[S2, S4]`) that failed validation. Normalize them while rejecting unknown IDs, mismatched source lists, refusals, and truncated responses.
- An embedding failure lost all completed batches. Save an embedding cache and resume subsequent runs; bounded quota retries apply to offline indexing only.
- A successful text refresh plus failed vector rebuild could retrieve removed or changed sources from stale vectors. Compare source fingerprints before vector retrieval.
- The vector embedding input repeated long provenance headers, biasing retrieval toward common titles. Embed only passage bodies and version the embedding format.
- Embedding outages other than HTTP 429 bypassed text fallback. Cover transient service/network failures too.
- Raw profile truncation could cut JSON mid-field and omit lease/deadline data. Use bounded valid JSON and explicit truncation metadata.
- Large Unicode requests exceeded the server byte limit despite satisfying character limits. Align the byte limit with the accepted context size.
- Oversized composer input was cleared before rejection. Validate before submission; bound older messages individually.
- Parsed JSON could be null or contain malformed source entries. Validate it before use in the UI.
- Development startup accepted an older API without chat routes, producing HTML 404 responses. Require the RAG capability marker.
- One blank PDF page aborted the entire import. Warn and skip empty pages, but reject PDFs with no extractable text.
- Source sidecar symlinks/oversized metadata and catalog path escapes were unchecked. Reject them.
- A URL switching HTML/PDF left both old and new files indexed. Remove the obsolete representation after a successful import.
- Fetch failures returned successful process exit status. Return nonzero and retain the detailed report.

## Verification

- 67 app tests, 16 RAG tests, 10 local HTTP/authentication tests, and 5 Python importer tests passed (98 total).
- `npx tsc --noEmit` and `git diff --check` passed.
- Built an isolated text index from all 3,908 real passages. The original private index was not changed.
- Live Gemini test for “Can I prove unlawful eviction?” returned a cited answer and follow-up questions. No personal profile data was sent.
- Successful availability checks for `gemini-3.5-flash` and `gemini-3.1-flash-lite`. Availability can still change; the test is not an uptime guarantee.

## Limits / remaining work

- The full Gemini vector rebuild is not part of this audit validation. The supplied corpus currently relies on text retrieval until embedding completes. Rebuild with the new resumable command when quota permits.
- Full-text search is English-oriented and not a replacement for evaluated multilingual semantic retrieval. Jurisdiction/date applicability still needs curated source metadata and legal review.
- Citation-ID checks do not verify that each claim is entailed by its source. No comprehensive legal-quality evaluation or browser visual test was performed.
- The source downloader is a local administrator CLI, not a public URL-fetching endpoint. Do not expose it to arbitrary users without stronger network isolation and a host allowlist.
- Other existing document/report AI flows still use the frontend OpenAI configuration; they are outside this RAG migration.

## Use the patched checkout

The changes are now in the main project checkout. Configure its private `server/.env` with `GEMINI_API_KEY`. Point `RAG_KNOWLEDGE_PATH` at the existing knowledge directory, and optionally set `RAG_DATABASE_PATH` to a private deployment database. Set `RAG_CHAT_MODEL=gemini-3.5-flash` if an older `.env` overrides the default. Never put credentials in `.env.example`.

Run `npm run rag:index:text` for immediate text search, `npm run rag:index` for resumable vectors, then start the API from the patched checkout. The changes have not been committed. Restart the running API to load them.
