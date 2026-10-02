# A8a — ExperienceIngestor contract (draft from Search Existing, 2026-10-02)

Source: the census in `local-bootstrap-20261002T180454/outputs/auto-implementation-census.md`
(design section revised in f253ae881).

## Input

One knowledge-unit file per experience, written in its bench at the end of a
task: `<bench>/knowledge/experience-<TASK-LAYER-NNNN>[-<itemId>].json`, schema
`thyrox.experience.v1`:

| Field | Required | Goes to |
|---|---|---|
| `task` (`TASK-<LAYER>-NNNN`) | yes | `domainId` |
| `item` (plan itemId) | no | `domainId` suffix |
| `sections.intent`, `.mechanism`, `.decision`, `.evidence`, `.outcome` | yes, non-empty | one chunk: the five sections as one text, with headings |
| `metadata` (authority, decision REUSE/EXTEND/MISSING, taskOutcome, verificationVerdict, consumers, tests, findings, commit, model, context, capabilities, attempt, runId, executionId) | object | `metadata` JSONB, not embedded |

## Mapping onto `DocumentInput`

- `domain` = `experience`; `scope` = `DOMAIN_WIDE_SCOPE`
- `domainId` = `task` or `task/item`. Never a path, run id, attempt or execution id.
- `sourceRef` = `<label>:<relative path>`, the same convention as `findingIngestion.ts`
- `sourceRevision` = git `HEAD` of the root, or null

## Authority boundaries

- New `experienceIngestion.ts`, a sibling of `findingIngestion.ts`. The latter is not widened.
- The shared write step `ingestFindings` moves to a neutral name (`ingestRecognized`). The finding/error exports stay as aliases until their consumers move.
- `ingestCommand.ts` dispatches through a domain → recognizer table: `finding`, `error` and `experience`.
- No embeddings: the chunks must appear in `chunksWithoutEmbedding(space)`.

## RED cases (postgres suite, `support/` harness)

1. A valid file gives `created`, identity `experience / TASK-…/item`, metadata kept, and one chunk with the five headings.
2. Re-ingesting the same file gives `unchanged`; editing a section gives `new-version` under the same identity.
3. The same file moved to another bench path keeps the same identity (`new-version` or `unchanged`, never a second document).
4. A missing section or a malformed task is unrecognized and named, not ingested.
5. The chunk is visible in `chunksWithoutEmbedding` of an active space before any `putEmbeddings`.
6. The `finding` and `error` suites stay unchanged (regression).

## Annulment

- Derive `domainId` from the file path: case 3 must fall.
- Drop the section check: case 4 must fall.

## Not in A8a

Query and embedding (A8b), the experience writer of the controller (who
writes the file at the end of a task), and the outcome vocabulary (controller
EXTEND, separate TDD).
