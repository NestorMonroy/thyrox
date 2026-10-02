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
| 17 | Search Existing | no mechanism registry; finding store indexed with `buscar-hallazgos`; no semantic query entry point | sessions | — | lexical only | EXTEND: query entry point over `searchNearest` + registry | #132 | 5, 6 | after 5 and 6 |
| 18 | Internal corpus ingestion | `semantic-search-ingest` (`findingIngestion.ts`, finding and error domains) | — | 2 | corpus not measured (pg down) | EXTEND: domains for accepted trajectories and decisions | #46, #121 | 5 | after A1: measure the corpus |

## DAG (existing tasks only)

```
A1  lock recovery + ensure pg/redis/ollama        (#99, #102)       runnable
A3  chunked OCI upload → publish qwen3-4b          (0907, #139, #90) runnable
    → artifact-locations → local-models-ensure
A4  qualify qwen3-4b progressively                 (#69, #72)        after A1 + A3
A6  thyrox -p local-required end-to-end            (#68, #73)        after A4
A5  task_continuation asks recommendExecution      (#116, #75, #115) after A4
A2  nomic through the same chain → embeddings      (#136)            after A3
A8  semantic query entry point (searchNearest)     (#132)            after A1 + A2
A7  P2d → P2e → P3 (managed headless-pool)         (0743)            independent of A3–A6
A9  self-implementation workers                    —                 after A6 + A7 + A8
```

No new TASK: every node is owned by an existing task.
