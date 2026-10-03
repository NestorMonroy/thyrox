# Search Existing repo-wide v2 — four passes, with rejected candidates

Supersedes `search-existing-repo-wide.md` (a7b1f4486), which was still
SEARCH_INCOMPLETE: narrow behavior queries, mandatory candidates not listed by
name, no task-store pass, and EXTEND verdicts without proof that the
consumers expect the extension there. **No product code was modified.**

## Record

- **searched_root:** `/home/user/thyrox`, git index (`git grep -I`).
- **excluded:** `_references`, `_archived`, `*.lock`, `**/dist/**`,
  `.claude/cache`, `.claude/build-logs`, `.claude/baselines`; `.git`,
  `node_modules` and binaries are not versioned. `.claude/jobs`,
  `.claude/workbench` and `agent-results` are measured separately in pass D.
- **searched_surfaces:** `bin`, `scripts`, `src/**` (agents, board, commands,
  conformance, corpus, hooks, learning, lib, measurement, packages, session,
  testing, verify, workbench…), `tests`, `.githooks`, `.claude/rules`,
  `.claude/skills`, `README.md`, `package.json`, task store (2416 tasks, 8
  sessions), finding store, workbench names.
- **NOT searched (declared):** `kaupamex-docs` (ADR-007 lives there) is not
  cloned in this container (`ls /home/user/kaupamex-docs` → absent). Every row
  that depends on the ADR text stays SEARCH_INCOMPLETE on that surface.
- **Instrument:** `probes/search_existing_repo_wide.sh`; outputs in
  `outputs/search-existing-v4/` (A-hits, A-candidates scored by distinct
  terms, A-surfaces, B-definitions, C-consumers, named-candidates, D-stores,
  D-workbenches). `search-existing-v3/` is the first run and **is not cited**:
  its `named-candidates.txt` resolved every wrapper to `generate_bin.py` (the
  generator named in the header, not the source the `exec` runs), and caches
  crowded the scoring.

*Metric:* files per term and distinct terms per file; definitions in the
candidates; files that name each candidate; store rows per query. *Blind
to:* a mechanism whose name and comments contain none of the terms, the
contents of `kaupamex-docs`, and untracked files.

**behavior_queries** (pass A, one query per term):

- stdin: `stdin`, `standard input`, `input source`, `input file`,
  `items file`, `item source`, `payload source`, `feed`, `pipe`,
  `descriptor`, `fd`, `read items`, `mapfile`, `redirect`, `< /dev/null`,
  `background input`.
- math: `math`, `mathematical`, `reasoning`, `numeric`, `algebra`,
  `probabilit`, `statistic`, `STEM`, `benchmark`, `evaluation`, `qualif`,
  `capabilit`, `skill`, `task class`, `suite`, `score`, `eligib`,
  `model selection`, `held out`, `reward`, `verifier`.
- runtime: `contextLength`, `context length`, `num_ctx`,
  `OLLAMA_CONTEXT_LENGTH`, `kvCacheType`, `kv cache`, `runtime config`,
  `grant environment`, `execution environment`, `unit environment`,
  `fingerprint`, `residency`, `runtime identity`, `ExecutionAuthorization`,
  `RuntimeContainerProfile`.

## Q1 — stdin of a background job (post-hoc `thyrox-bg --stdin`, 65a0e2b60)

| Candidate (authority) | What it does with stdin | Verdict |
|---|---|---|
| `src/session/bg.sh::start` (`bin/thyrox-bg`) | before 65a0e2b60: **no redirect**, the job inherited the host socket | canonical owner of the job's fds → EXTEND |
| `src/session/background.py:187` (`bin/background`) | `stdin=subprocess.DEVNULL` | sibling launcher; confirms the convention «closed by default». Not a channel for items → rejected as a substitute |
| `src/session/run-task-pool.sh:100,425` | commands from a file or `-`; parallel with `< /dev/null` | the same convention: declared source, closed otherwise. It launches N commands, not one job with input → rejected |
| `src/session/parallel_map.sh:13-24,62` | refuses without a declared source (`::: / :::: file / :::: -`) | precedent for «the source is declared» → supports EXTEND; it is a mapper, not a launcher → rejected as a substitute |
| `src/session/task_continuation.py:933-962` | feeds `parallel_map` through a `PIPE` it owns | an in-process consumer, not a job launcher → rejected |
| `src/session/adopt_background.py:203` | reads the client's notice from stdin | adopts, does not launch → rejected |
| `src/roster/stdin_probe.py`, `bin/wait-jobs probe` | **observes** which stdin a live process reads | detects the failure, does not prevent it → rejected as a substitute |
| `src/hooks/detect_stdin_reading_interpreter.py` (bench `stdin-reading-interpreter-20260923T040706`), H-THYROX-190 | warns about a filter with no file that reads the socket | the same failure mode at the preflight level → rejected as a substitute; it confirms the risk |
| `src/task/task_source.py` (`STDIN_SOURCE='-'`) | a task-record reader | another domain → rejected |
| `src/packages/stdin-napi` | the TUI's native stdin | another domain → rejected |
| `src/verify/pool_pipeline.py:514`, `member_port.py:298` | `--items <file>` | a convention for passing items to a tool; it supports `headless-pool --items` as an alternative |
| `headless-pool.sh:452` | `mapfile` from stdin; no `--items` | the receiver; a candidate for the alternative |

**Consumer that expects the extension:** `src/verify/tsc_cycle.py:719-731`
redirects the items into the pool's stdin, inside the job. Since 9429f0984 that
form is refused (`bash` is not a declared entry), and
`tests/verify/test_tsc_cycle.py:230-235` checks only the argv.

**Decision: EXTEND `bg.sh` proven** — canonical authority = `bg.sh::start`;
it lacked a closed stdin by default and a declared source; no sibling launches
a job with a declared input; the consumer (`tsc_cycle`) expects to deliver
items through the job's stdin. **Open, not decided here:** whether the pool
should also accept `--items` (convention e). **Debt:** `tsc_cycle.py:719` and
its blind test → TASK. **Process:** the implementation came before the
proof, and the controller wrote it (H-THYROX-419).

## Q2 — environment derived from the grant (post-hoc `grantEnvironment`, e18759949)

| Candidate (authority) | Verdict |
|---|---|
| `ExecutionAuthorization.environment` (`podman-execution/executionAuthorization.ts:108,239`) | **the canonical authority of the unit's environment**. `podmanModelUnitMaterializer.ts:340-343` builds `modelUnitAuthorization(...)` and materializes with it; the line `:213` (`profile.environment` + `grantEnvironment(grant)`) feeds that authorization. The extension lives on the model side, not in the primitive → it does not duplicate the authority |
| `WorkerResourceProfile.environment` (`workerResourceProfile.ts:42,140`) | the worker profile, with validation of public names; it is not derived from a grant → rejected |
| `DesiredResource.environment` + `configDigest` (`resourceMaterialization.ts:55,218,242`) | declarative resources (infra, OCI), with a check against secret values; it does not apply to model units → rejected |
| `executionCommand.ts:113-197` (`proxyEgress`, `forwardedEnvironment`) | the task-worker environment → rejected |
| `qualifyModel.ts:193` (`num_ctx` per request via `/api/chat`) | applies context per request, not per unit; the proxy uses `/v1/chat/completions`, which ignores `num_ctx` → insufficient |
| `SandboxRuntimeConfig` (`shell/src/sandbox`) | another domain → rejected |

**Measurement (gawk, grant fields carried vs applied):** `contextLength` is
carried in 7 packages and applied only in `local-models`; `kvCacheType` is
carried in 4 packages (`model-artifacts`, `model-scheduling`, `local-models`,
`provider`) and **applied in none**.

**Decision: EXTEND proven, incomplete** — authority:
`RuntimeContainerProfile` → `ExecutionAuthorization.environment`. What it
lacks: `kvCacheType` → `OLLAMA_KV_CACHE_TYPE`. Pending check: whether
`grantEnvironment` values go through the same secret-value check that
`resourceMaterialization.ts:219` applies (they are not secrets, but the gate
must see them).

## Q3 — residency identity (post-hoc `residencyKeyOf(...contextLength)`)

| Candidate (authority) | Verdict |
|---|---|
| `residencyKeyOf` (`model-scheduling/hostCoordinator.ts:104`) | the only definition; lease key (`coordination.ts:43,63,76`) and `grant.residency.instance` (`memoryGrantIssuer.ts:59`) → canonical authority |
| `configDigest(desired)` (`podman-execution/resourceMaterialization.ts:242`, label `thyrox.resource-config-digest`) | **an existing configuration fingerprint**: sha256 of normalized environment, network, mounts, command and labels. Consumers: `resourceMaterialization`, `ociArtifactRegistry`. It applies to declarative resources, not to model residencies, but it is the precedent for the form «a configuration digest», not «a segment per field» |
| `artifactIdentityMatches` (`local-models/runtimeMutation.ts:37`) | compares only the artifact (modelId, artifactId, format, quantization) → insufficient for configuration |

**Decision: EXTEND proven, wrong form** — correct owner; the identity
should be a fingerprint of the runtime configuration the grant authorizes
(`contextLength`, `kvCacheType`, …), following the precedent of
`configDigest`, instead of `/ctx${contextLength}`. Implementing it is code →
BLOCKED_BY_BOOTSTRAP (local worker).

## Q4 — TASK-THYROX-0911 mathematical reasoning

**Durable evidence (pass D) that the previous matrix did not see:**

| Task | Declares |
|---|---|
| **TASK-THYROX-0900** (pending) | «Declarative contract (ADR-007 1.16.0): … artifact acceptance != task qualification; artifact identity = exact digest; **capability = artifact + qualification suite + version** … key qualifications by suite version» |
| **TASK-GEN-0818** (pending) | «name that capability **by responsibility (not taskClass)**, and build its versioned suite with TDD … Runs after A7 lands **RouteRequirement**» |
| TASK-THYROX-0780 (pending) | task suite format and `local-models-qualify --task-class/--suite`, already delivered in part by `taskSuite.ts` |
| TASK-GEN-0794 (pending) | Thompson-sampling bandit: state = task class, action = candidate, reward = verified outcome (`src/session/task_continuation.py`, `src/verify/tsc_*`) |
| TASK-THYROX-0708 (in_progress) | RLVR with the qualification suite as the reward |
| H-THYROX-404 | measured history is ignored by the model decision |

| Requirement | Candidate (authority) | Why reusable or insufficient | Decision |
|---|---|---|---|
| Axis for math | `LOCAL_TASK_CLASSES` (`model-artifacts/modelQualification.ts:23`) = `TASK_KINDS` (`provider/src/cost/policy.ts:163`, a duplicate) | tiers (`minAdvisorRank`, `effort`); TASK-GEN-0818 forbids naming the capability by taskClass | rejected |
| Axis for math | new `QualificationKind 'mathematical-reasoning'` | ADR-007 1.16.0 (per TASK-THYROX-0900) defines capability = **suite + version**, not a new kind per domain | **rejected** (it contradicts the declared contract) |
| Axis for math | `ModelRecord.capabilities` (`agent/models.ts:54`), `ModelCapability` (GGUF) | declared, not measured | rejected |
| Capability qualification | `ModelQualification` keyed by suite version (`modelQualification.ts:151 scopeOf`), the subject of TASK-THYROX-0900 | the planned authority; today the key is `task:<class>`, not suite@version | **REUSE the plan of TASK-THYROX-0900**: math is a suite (`mathematical-reasoning@1`) under that contract, not a new kind |
| Request requirement | `RouteRequirement` (A7) | **0 hits in code**: not implemented | depends on A7; not created here |
| Selection | `qualifiedModels(...)` (`:204`) + TASK-GEN-0794 (bandit) | filters by taskClass; the requirement axis arrives with RouteRequirement | EXTEND after A7 + 0900 |
| Suite / scorer | `taskSuite.ts`; `src/learning/reward.py`; `src/measurement/*` (statistics, `rejection_sampling`) | the suite format exists; `reward.py` is RLVR's reward (TASK-THYROX-0708) — a scorer candidate, read its contract before writing another one | SEARCH_INCOMPLETE (read `reward.py`) |
| Artifact, OCI, admission, ensure | the existing flow | measured and in use | REUSE |

**Decision for Q4:** do not create a `QualificationKind`. The route the store
already declares is TASK-THYROX-0900 (capability = suite + version) →
TASK-GEN-0818 (capability by responsibility, after RouteRequirement/A7) → math
as one suite under that contract. TASK-THYROX-0911 depends on 0900 and A7.
The ADR-007 1.16.0 text could not be read here (kaupamex-docs absent).

## Summary

| Change | v1 (a7b1f4486) | v2 |
|---|---|---|
| `thyrox-bg --stdin` | EXTEND, owner pending | **EXTEND proven**; `tsc_cycle` debt; `--items` optional |
| `grantEnvironment` | EXTEND incomplete | **EXTEND proven** (feeds `ExecutionAuthorization.environment`); missing `kvCacheType` |
| `residencyKeyOf(ctx)` | EXTEND too narrow | **EXTEND, wrong form**: configuration digest (`configDigest` precedent) |
| math `QualificationKind` | EXTEND | **rejected** by the ADR-007 1.16.0 contract via TASK-THYROX-0900 |
| math suite | — | REUSE the 0900 plan; scorer SEARCH_INCOMPLETE (`reward.py`) |
| math selection | EXTEND | after A7 (RouteRequirement, 0 hits) |
