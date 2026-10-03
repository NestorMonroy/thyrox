# Auto-Implementation Architecture Census — 2026-10-02

Measured with Search Existing in two phases: deterministic (`rg`/`git grep`, imports, tests
per package) and the indexed finding store (`bin/agent_store buscar-hallazgos`). The
semantic phase over pgvector does not exist yet: there is no query entry point (row 17).

Health was measured at 18:37Z, right after the host restarted at 18:34:22Z. Podman locks
were out of step (0/21) and no container was alive: the third occurrence today
(H-THYROX-308, #92, #99).

| # | Capability | Authority (path) | Consumers | Tests (package) | Health | Verdict | Existing task | Depends on | Next runnable action |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Managed execution | `ExecutionAuthorization` → `PodmanExecutionPrimitive` → `ExecutionUnit` (`podman-execution/`) | task_continuation, publisher, fetcher, coordinator | 16 | engine up; locks reset by the restart | REUSE | #105, #107, 0743 P2d/P2e/P3 | — | lock recovery (A1) |
| 2 | Infrastructure bootstrap | `infrastructure_ensure` → `InfrastructureBootstrap` (`infrastructure/infrastructureBootstrap.ts`) | headless-pool, local-models-ensure, P0 | 2 | refuses until the locks are recovered | REUSE; lock recovery after each restart is manual | #102, #99 | 1 | run ensure for pg, redis, ollama (A1) |
| 3 | PostgreSQL | `openByUrl` (`store/sql.ts`) | SemanticSearchStore | 5 | down since the restart | REUSE | #103 | 2 | ensure (A1) |
| 4 | pgvector | extension in `thyrox-postgres` | SemanticSearchStore | in semantic-search | down | REUSE | #37 | 3 | ensure (A1) |
| 5 | SemanticSearchStore | `semantic-search/store.ts`: ingest, embedding spaces, `searchBinaryCandidates`, `searchNearest` | ingester | 14 | down with pg | REUSE | #37, #44, #121 | 3, 4 | after A1: measure the corpus |
| 6 | semantic_search_worker | only a build profile (`daemon/src/podman/specializedWorkerProfile.ts`); `rerank.ts` | none in production | — | no running service | EXTEND (worker absent; embeddings via `admittedEmbed` of local-models) | #136, reclaim bench P2 | 9, 10, 11 | after the local route: nomic through the same chain as qwen3-4b |
| 7 | Redis / SharedStateStore | `shared-state/contract.ts`, adapter `factory.ts` | 16 files outside the package | 6 | `thyrox-redis` created, not running | REUSE | #85 | 2 | ensure (A1) |
| 8 | SQLite / @thyrox/store | `openLocal` (`store/db.ts`) | agent_store, tasks, findings | 5 | up (local file) | REUSE | — | — | — |
| 9 | Artifacts / catalog / cache | `modelCatalog.ts`, `modelArtifactCache.ts`, `artifact-locations.json`, `local-models-ensure`, `publishArtifact`, `ociArtifactRegistry` | ensure, coordinator | 13 + 30 + 10 | download is chunked; **upload is a single PUT and the proxy cuts it at 2.5 GB** (ECONNRESET, 45 s) | EXTEND: chunked upload in `ociDistribution.ts` | 0907 (L1), #139, #90 | 1 | TDD of chunked upload, then publish qwen3-4b |
| 10 | Qualification | `local-models-qualify`, `modelQualification.ts` | recommendExecution | in local-models | needs the coordinator; only 0.5B passes protocol at 8192 | REUSE | #69, #77, #72 | 9, 12 | qualify qwen3-4b once materialized |
| 11 | Model scheduling / admission | `ResidencyController`, `hostCoordinatorService` (daemon) | proxy, pool, qualify | 15 | transient coordinator: starts per probe and exits | REUSE | #61, #95, #96 | 1, 13 | — |
| 12 | Residency | `residencyController.ts` (`prepare` pushes the blob from the cache) | coordinator | 15 | prepare ENOENT without a cached artifact | REUSE | #93, #94 | 9 | resolved by 9 |
| 13 | Ollama runtime | `thyrox-ollama` (ensure) and units per grant | coordinator, pool | — | down since the restart | REUSE | #55, #120, #63 | 2 | ensure (A1) |
| 14 | `thyrox -p` routing | `printDelegation.ts` → local proxy `--local-model` → `admittedUpstream` | headless-pool | 44 (cli) | proxy fixed in `0bb48be81`; no end-to-end proof yet | REUSE | #68, #73 | 9–13 | end-to-end with local-required |
| 15 | headless-pool | `src/session/headless-pool.sh` (local-first via `agent-recommend`) | — | tests/session | `--execution unit` not compatible with `--isolation worktree` | EXTEND | 0743 P3 | P2d, P2e | P2d → P2e → P3 |
| 16 | Lifecycle / snapshot / recovery | `pool_lifecycle.py`, `snapshot_store.py`, `process_ownership.py`, `pool_integrate.sh` | headless-pool | in tests/session | not exercised today | REUSE | #8, #10, #11 | 15 | through P3 |
| 17 | Search Existing | no mechanism registry; finding store indexed with `buscar-hallazgos`; no semantic query entry point | sessions | — | lexical only | EXTEND: A8b query entry point over `searchNearest` + registry | #132 | 5, 6, A8a | after A2 + A8a |
| 18 | Internal corpus ingestion | `semantic-search-ingest` (`findingIngestion.ts`: finding and error by `.rst` name; no ingestor registry) | — | 2 | corpus not measured | EXTEND dispatch + MISSING `ExperienceIngestor` (A8a; see design) | #46, #121 | 5 | A8a-spec done; A8a-impl after A6 |


## DAG (existing tasks only; second revision 2026-10-02 after executor review)

Measured in `search-existing-enforcement.md` (deterministic, no subagent).

```
E0  durable local-required policy: one versioned       (H-THYROX-413)      MISSING declaration; REUSE preflight deny
    ExecutionPolicy file read by preflight (deny Agent,                     + ExecutionPolicy; EXTEND
    deny unmanaged payload), agent-recommend, pool                          detect_agent_dispatch/client_background
C0  host coordinator lifecycle: declared Linux entry   (H-THYROX-414,      MISSING; blocks every managed
    that keeps it alive while residencies live           H-THYROX-412)      qualification
A3  qwen3-4b publish → locate → ensure                 (0907)              done 13eeedc05
A2  nomic publish → locate → ensure                    (#136)              artifact done 4cd49e2f7; embedding proof after C0
A4  qualify qwen3-4b, managed                           (TASK-THYROX-0707)  after C0; the 19:16:31Z row is diagnostic
                                                                            (unmanaged run), not a closure
A6  thyrox -p local-required end-to-end                (#68, #73)          after A4-managed + E0
A5  task_continuation asks recommendExecution          (#116, #75, #115)   after A4-managed; serialized with P2e
                                                                            (both own task_continuation.py)
A7  P2d → P2e → P3                                     (0743)              P2d accepted 6bd918b6c; P2e needs a working
                                                                            executor: M0 gave 4×502 + 1 stall on P2d
                                                                            (continuation.jsonl), so local (A6) or a
                                                                            non-502 M0 route
A8a-spec  experience ingestor contract                 (#46)               done 9ba67b4d7 (specification only)
A8a-impl  ExperienceIngestor                           (#46, #121)         after A6 (local worker policy)
A8b semantic retrieval                                 (#132)              after A2 proof + A8a-impl
A9  self-implementation workers                        —                   after A6 + A7 + A8b
```

```
E0 ─────────────────────────────┐
C0 ─→ A4-managed ─→ A6 ─────────┼─→ A8a-impl ─→ A8b ─→ A9
 │                   │          │                       ▲
 └─→ A2 proof ───────┼──────────┴───────────────────────┤
                     └─→ A7 P2e → P3 ───────────────────┘
```

No new TASK: E0 and C0 are recorded findings awaiting their task citation.

## A8 design — revised (executor review, 2026-10-02)

The Search Existing rows below about outcome taxonomy, ingestion dispatch and identity came from a Claude `Explore` subagent (H-THYROX-413). They are hypotheses to re-measure deterministically before A8a-impl, not accepted evidence.

The design is the executor's direction. Every name and location below comes
from Search Existing over the current tree, not from the first draft.

### Raw execution split by kind

| Kind | Destination |
|---|---|
| runtime noise (pids, monitor ids, duplicated logs, a contaminated measurement with no reusable conclusion) | discard or short retention |
| exact state (status, DAG dependencies, commits, versions) | relational task authority; never embedded |
| ephemeral coordination (leases, cooldowns, in-flight locks) | Redis through `SharedStateStore` |
| reusable knowledge, successes **and** reusable failure lessons | `SemanticSearchStore` → PostgreSQL + pgvector |

### A8a precedes embeddings

`SemanticSearchStore` already separates documents from embeddings
(`semantic-search/store.ts:91` `ingestDocument`, `:99` `chunksWithoutEmbedding`,
`:100` `putEmbeddings`). A finished execution becomes durable chunks now;
A2 later drains `chunksWithoutEmbedding` → embed → `putEmbeddings` → activate
the space. A8b (query → embedding → `searchBinaryCandidates`/`searchNearest`
→ metadata ranking → REUSE/EXTEND/MISSING) is the only part that needs A2.

### Domain authority: a sibling ingestor, not a wider `findingIngestion.ts`

Measured: there is no ingestor registry. `findingIngestion.ts` registers its
domains as a regex table over `.rst` file names (`DOCUMENT_FILES`, :38-41),
`ingestCommand.ts` dispatches on `recognizedDomains()` (:45, :71-73), and the
shared write step is `ingestFindings(store, recognized)` (:71) — generic in
body, finding-named.

Verdict: **EXTEND** the dispatch, **MISSING** the experience domain.
- `findingIngestion.ts` keeps finding and error (file-recognized `.rst`).
- `experience` is a separate `ExperienceIngestor`: its source is an execution
  record plus its bench, not a file name pattern.
- The CLI dispatch becomes a small domain → ingestor table. The shared write
  step moves out under a neutral name. Both ingestors call `ingestDocument`.
- No JSON inserted directly into PostgreSQL: the first three units go through
  this pipeline once its contract and verifier exist.

### Identity

Measured durable identities: only `TASK-<LAYER>-NNNN` (`task/task_ids.py`), and
the execution-record `reference` built from it (`execution-records/
executionRecordStore.ts:26`), survive bench path, retry, container and worktree
changes. `runId`, `executionId`, `grantId`, `generation` and `attempt` all
change per retry or recreation.

- `domain` = `experience`
- `domainId` = `TASK-<LAYER>-NNNN` + plan `itemId` (logical, stable)
- `sourceRef` = `<clone label>:<bench path>`, the convention `findingIngestion.ts:77-90` already uses. It is provenance only.
- `sourceRevision` = commit
- attempt, runId, executionId, grantId, model, context → `metadata`

### Metadata vs chunks (approved)

- **Metadata** (JSONB, filterable, not embedded): task/run identity,
  authority, REUSE/EXTEND/MISSING, task outcome, verification verdict,
  consumers, tests, findings, commit, model, context, capabilities, timestamps.
- **Chunks** (embedded): one knowledge unit keeps its context. Intent →
  Mechanism → Decision → Evidence → Outcome as sections of one text, not one
  chunk per field.

Default ranking favours accepted, current, verified, authority-present and
tests-present units, without dropping failure lessons.

### Outcome taxonomy: Search Existing before any new class

Measured classifications:

| Authority | Values | Separates task from verification? |
|---|---|---|
| `task_continuation.py:90-106` `OUTCOMES` | success, provider_transient, provider_permanent, task_failure, infrastructure_failure, stalled, non_blocking_finding, hard_block, secret_exposure_detected (+ `NOT_COUNTED`) | partly; `verify_exit is None` falls to `task_failure` "ambiguous-default" (:275) |
| `item_worktree.sh:15-18` | verificado, rechazado, sin-verificar, sin-cambios, fallido, con-stash | no; `fallido` mixes provider, infra and task |
| `wait-jobs.sh` | OK, BAIL, ESPERANDO, BLOQUEADO, CANCELADO, SIN-RECOGER | settlement, not outcome |
| `task/premises.ts:75` `Verdict` | actionable, blocked, overclaimed, verified, **unmeasurable**, stale; `held: boolean \| null` | yes; `unmeasurable` must not fold into `blocked` (:63-74) |
| `artifactVerifier.ts:35`, `publishArtifact.ts:41` | verified / unverified / unmeasured | yes, for artifacts |
| `executionRecordStore.ts:24-53` | `verdict?: string`, `terminationReason?: string` (free) | fields exist, no vocabulary |

Requirement (firm): task_failure ≠ provider_transient ≠ infrastructure_failure
≠ measurement-did-not-establish-correctness.

Classification: **EXTEND**, not a new task state.
- The value already exists as a concept: `premises.ts` `unmeasurable`, with
  `held: null`.
- The defect is local: `task_continuation.py:275` turns a measurement that did
  not happen into `task_failure`.
- Candidate shape (to fix with TDD in the controller's own flow):
  - keep the task outcome and the verification observation as two fields of
    the attempt record;
  - the observation reuses the `premises.ts` vocabulary (`verified` /
    `unmeasurable`);
  - the outcome becomes `NOT_COUNTED` when the observation is `unmeasurable`.
- The task state machine itself is not touched. The exact name is decided in
  that TDD, not here.

### First knowledge units (candidates, not ingested yet)

1. qwen3-4b OCI publication: REUSE ArtifactPublisher, EXTEND OciDistributionClient (chunked upload, a39e8ec3e), H-THYROX-303/411; commit 13eeedc05.
2. P2d isolated verification (6bd918b6c): a shared-tree measurement is contaminated; an isolated worktree attributes.
3. L0/L1 remote 502 (H-THYROX-409/410): the non-streaming remote path gives a repeatable 502, and retries do not resolve it. A failure lesson.
