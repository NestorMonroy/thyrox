# Search Existing repo-wide — corrected matrix (2026-10-02)

Replaces, as proof of absence, `search-existing-matrix.md` (scope
`src/packages` only = SEARCH_INCOMPLETE, H-THYROX-419). No code was modified
during this measurement.

**Root:** `/home/user/thyrox`, `git grep -I` over the index, excluding
`_references`, `_archived` and `*.lock`; `.git`, `node_modules`, `dist` and
caches are not versioned. **Passes:** (1) behavior by concept and synonyms,
(2) authority (definition of the type/function), (3) consumers, tests, gates
and CLI, (4) durable evidence: `agent_store buscar-hallazgos`, `.claude/workbench`,
`.claude/jobs`, `.claude/rules`, `.claude/skills`.

*Metric:* files and lines that match each concept query, grouped per surface
with gawk. *Blind to:* a mechanism that implements the behavior under a name
none of the queries contains, and anything outside the git index
(`--untracked` was not used).

## Per-surface census (files per concept)

| Concept | Code surfaces with hits | Evidence |
|---|---|---|
| stdin source | src/packages 4, src/verify 3, src/session 2, src/task 1, tests 3 | jobs 136, workbench 43 |
| runtime config / grant env | src/packages 6 (5 are the unrelated `SandboxRuntimeConfig`) | workbench 11, jobs 6 |
| residency identity | src/packages 38 | workbench 73, jobs 4 |
| math | src/packages 2 (the suite I added), `.claude/skills` 1 (unrelated MECE) | workbench 35 (this bench), store 2 hits (unrelated: H-THYROX-67, -169) |

## Q1 — background-job stdin source (post-hoc `thyrox-bg --stdin`, 65a0e2b60)

| Field | Value |
|---|---|
| Requirement | a managed job (`thyrox-bg --task`) can receive its pool items by stdin |
| Behavior searched | stdin source, `--stdin`, `--items`, items file, `:::: -` |
| Candidates | (a) `src/session/bg.sh::start`, which owns the job's fds; (b) `headless-pool.sh:452` `mapfile -t ITEMS < <(gawk 'NF')`, which reads stdin only and has no `--items`; (c) `parallel_map.sh:13-24`, which requires a declared source, `:::: -` included; (d) `src/task/task_source.py::load_records` with `STDIN_SOURCE='-'` (task records, not pool items); (e) `pool_pipeline.py:514`, `member_port.py:298` `--items <file>` |
| Consumer | `src/verify/tsc_cycle.py:719-731` → `thyrox-bg start … -- bash -c "… headless-pool … < items"`; refused since 9429f0984 (`bash` is not a declared entry); `tests/verify/test_tsc_cycle.py:230-235` checks only the argv shape, so the breakage goes unseen |
| Pre-existing fact | before 65a0e2b60, `bg.sh:473` launched with no stdin redirect: every job inherited the host socket (the same failure mode as the `rg` that read a socket for 1 h 19 min). The `/dev/null` default corrects the owning authority |
| Rejected | (d): another domain (task records); (c): it is the item mapper, not the job launcher |
| Decision | **EXTEND (implemented), owner decision pending**: the precedent of a declared source (c) supports `bg.sh --stdin`; the convention `--items <file>` (e) supports `headless-pool --items`. Either way `tsc_cycle.py:719` remains broken and its test does not see it → TASK |

## Q2 — runtime environment derived from the grant (post-hoc `grantEnvironment`, e18759949)

| Field | Value |
|---|---|
| Requirement | the runtime serves with the configuration the grant authorized |
| Authority | the grant: `memoryGrantIssuer.ts:55-66` fills `contextLength` and `kvCacheType` from the plan; `podmanModelUnitMaterializer.ts` is the only boundary that creates the container |
| Carried vs applied (gawk) | `contextLength`: carried in 7 packages; applied only in local-models (`num_ctx`, `qualifyModel.ts:193`; `OLLAMA_CONTEXT_LENGTH`, `hostCoordinatorComposition.ts:95`). `kvCacheType`: carried in 4 packages (53 lines), **applied in 0**; `OLLAMA_KV_CACHE_TYPE` appears only as a default in `declareInstalledModel.ts:32` |
| Sibling searched | `SandboxRuntimeConfig` (`shell/src/sandbox`): a shell sandbox, another domain → rejected |
| Decision | **EXTEND (implemented, incomplete)**: the boundary is correct (profile per runtime, derived from the grant), but the materialization only covers context. Missing: `kvCacheType` → `OLLAMA_KV_CACHE_TYPE` under the same mechanism. Code → local worker, or BLOCKED_BY_BOOTSTRAP |

## Q3 — residency configuration identity (post-hoc `residencyKeyOf(...contextLength)`)

| Field | Value |
|---|---|
| Authority | `hostCoordinator.ts:104 residencyKeyOf(artifact, placement, contextLength)`, the only definition; consumed as `residency.instance` by the grant and as the lease key by `coordination.ts:43,63,76` |
| Sibling | `runtimeMutation.ts:37 artifactIdentityMatches(expected, observed)`: compares modelId, artifactId, format and quantization, **not** runtime configuration |
| Insufficient because | two grants with the same context and different `kvCacheType` would share a residency even though memory differs. The identity should be a fingerprint of the runtime configuration the grant authorizes (`contextLength`, `kvCacheType`), not `ctx` only |
| Decision | **EXTEND (implemented, too narrow)**: correct owner; the key needs a configuration fingerprint. Code → local worker, or BLOCKED_BY_BOOTSTRAP |

## Q4 — TASK-THYROX-0911 mathematical reasoning

| Requirement | Candidate / authority | Why reusable or insufficient | Decision |
|---|---|---|---|
| Class or axis for math | `LOCAL_TASK_CLASSES` (`model-artifacts/modelQualification.ts:23`) = `TASK_KINDS` (`provider/src/cost/policy.ts:163`, duplicated) | they are **tiers** (`minAdvisorRank`, `effort`, `policy.ts:176-179`), not domains; `matematica` as a fifth class would need a rank and mixes axes | rejected |
| Declared capability | `ModelRecord.capabilities` (`agent/models.ts:54`, consumers `effort.ts:330`, `modelCapabilities.ts:77`) | remote catalog features, declared, not measured; selecting by them is selecting by name | rejected |
| Declared capability (local) | `ModelCapability` completion/tools/embeddings (GGUF metadata, `ollamaApi.ts:34`, `externalArtifact.ts:331`) | declared from metadata; math is not metadata | rejected |
| Measured qualification | `ModelQualification`, `scopeOf` (`modelQualification.ts:151`): `task:<class>` or the kind | the scope key is the extension point; it lacks an axis for a measured domain orthogonal to the tier | **EXTEND** (authority proven; lacks the axis) |
| Eligibility | `qualifiedModels(entries, qualifications, taskClass, minContextTokens)` (`:204`) | it filters only protocol + `task:<class>` + context; no requirement for a measured domain | **EXTEND** together with the above |
| Suite | `taskSuite.ts` (format, `taskClass` validated at `:62`) | reusable if the suite declares the domain; today it requires a `taskClass` | EXTEND |
| CLI / consumer | `local-models-qualify --suite`; `headless-pool --task-class` → `agent-recommend` | no consumer asks for a domain today: there is no proof that consumers **expect** it there | SEARCH_INCOMPLETE for the consumer |
| Artifact, OCI, admission, ensure | existing artifact → OCI → `local-models-ensure` flow | already measured and in use | REUSE |

**Owner decision pending:** the axis shape (a qualification kind
`capability:<name>` with its suite, or a requirement on the request that
`qualifiedModels` filters), and which consumer declares it. Until that is
decided, nothing in Q4 is implemented.
