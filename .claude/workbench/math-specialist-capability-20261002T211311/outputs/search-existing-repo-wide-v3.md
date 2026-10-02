# Search Existing repo-wide v3 — authority, rejection, durable ownership

Supersedes v2 (`ce1d05da0`). v2 found related candidates and picked where to
extend; v3 requires, for each decision, the canonical authority, why each
other candidate is not the authority, and the durable ownership or
dependency. **No product code was modified.**

Instruments: `probes/search_existing_repo_wide.sh` (`outputs/search-existing-v4/`),
`probes/profile_candidates.sh` (`outputs/profile-candidates/`: Q1, Q4, Q8),
read-only store queries (`agent-results/agent_store.sqlite3`, `mode=ro`), and
direct reads cited by `file:line`. Searched root: `/home/user/thyrox` (git
index). **Surface NOT searched:** `kaupamex-docs`, absent from this container;
every conclusion that rests on ADR-007 is marked PROVISIONAL or
SEARCH_INCOMPLETE.

*Metric:* declarations (types, functions, task rows, `plan.jsonl`) and
measured behavior. *Blind to:* the ADR-007 text, untracked files, and a
mechanism whose name and comments use none of the queried terms.

## Correction to v2 (a false premise)

v2 stated that before 65a0e2b60 «every job inherited the host socket».
**False**, measured with a discriminating control: with a pipe as the
parent's stdin (`pipe:[5327]`), a child launched with the old `bg.sh` form
(`nohup setsid bash -c … &`) got `/dev/null`. Non-interactive bash without
job control assigns `/dev/null` to asynchronous commands, and the comment at
`bg.sh:347-348` already said so. The first measurement did not discriminate:
the controller's stdin was already `/dev/null`.

## 1. TASK-THYROX-0911 vs TASK-THYROX-0900

| Field | TASK-THYROX-0900 | TASK-THYROX-0911 |
|---|---|---|
| store row | `#135`, `TASK-GEN-0813`, pending, session 333534ce | `#151`, `TASK-GEN-0829`, pending, session 333534ce |
| `blocks` / `blocked_by` | none / none | none / none |
| scope | contract (ADR-007 1.16.0): «Capability = artifact identity + qualification suite + qualification version»; key qualifications by suite version | math as a measured, qualified and selected capability; specific models; math suite; held-out problem |
| execution plan | `.claude/workbench/ollama-artifact-acceptance-20261002T081928/plan.jsonl`: P0 → A1…A7, all with `taskId: TASK-THYROX-0900`; **A7 `dependsOn: ["A4"]`**, A5 `dependsOn: ["A4","A7"]` | none |
| what A7 owns (`tasks/A7.md`) | the qualified capability axis separate from `taskClass`; `RouteRequirement` (capability + suite with version); `isArtifactEligibleForRoute(artifact, routeRequirement, qualifications)`; lookup by sha256 + capability + suite with version | — |
| decision recorded in Thyrox | `contract.md` §G7: «decidido (ejecutor, 2026-10-02; ADR-007 1.16.1)»; `ModelCapability` values include `reasoning`; §8: «A7 queda aceptado como está en ADR-007 1.16.1» | — |
| state | P0 `passed: false` (`outputs/P0-admission.json`, 2026-10-02T08:49:54Z) → A1…A7 blocked; `RouteRequirement` has 0 hits in code | — |

**Relationship:**
- **The capability axis: DUPLICATE of A7.** 0911 lists «Search Existing
  (capabilities, task classes, suites)», «measured capability» and «selection»;
  A7 already owns that axis, its eligibility and its key. 0911 must not create
  it.
- **The math part: CHILD WITH DISTINCT SCOPE.** That is the math suite, the
  candidate models and the held-out problem. It is one capability instance on
  the axis A7 defines, just as TASK-GEN-0818 is for implementation.

**Dependency:**
- **0911 → A7 is NOT DECLARED in the store.** It follows from A7's
  ownership, which *is* declared (`plan.jsonl` + `tasks/A7.md` + G7 recorded
  in `contract.md`). Status: **PROVISIONAL — authoritative ADR unavailable.**
  The execution contract in Thyrox records the executor's G7 decision, but not
  the ADR text.
- **Proposed reclassification (not applied):** rewrite 0911 as the math
  capability under A7's axis, and declare `blocked_by` A7 in the store. That
  is a write to the store, so it waits on your OK.

## 2. `grantEnvironment` (post-hoc, e18759949)

```text
REQUIREMENT:
  grant-specific runtime configuration must reach the model runtime
CANONICAL AUTHORITY (the field):
  ExecutionAuthorization.environment — podman-execution/executionAuthorization.ts:108,239
CANONICAL AUTHORITY (grant → authorization composition):
  modelUnitAuthorization(spec: ModelUnitContainerSpec): ExecutionAuthorization
  — model-scheduling/podmanModelUnitMaterializer.ts:203 (consumer: :340)
EXISTING EXTENSION POINTS:
  (a) RuntimeContainerProfile.artifactMount.hostDirectory(grant.artifact)
      — the precedent of «the profile translates the grant» (:226)
  (b) RuntimeAdapter.loadResidency(binding, grant)
      — ollamaRuntimeAdapter.ts:85, transformersRuntimeAdapter.ts:71;
        already receives the grant at load time and ignores contextLength
NEW API: RuntimeContainerProfile.grantEnvironment(grant)
DECISION: SEARCH_INCOMPLETE
```

- **Not a second authority for the field.** `grantEnvironment` only feeds
  `ExecutionAuthorization.environment` inside the existing composition.
- **It is a new extension API, and that is not proven necessary.** (b) already
  existed and receives the grant. Whether it suffices depends on a runtime
  fact **not measured**: does an Ollama residency loaded with
  `options.num_ctx` keep that context for the `/v1/chat/completions` requests
  the proxy sends, which carry no `num_ctx`? If yes, `contextLength` belongs in
  (b) and `grantEnvironment` should be retired. If not, a load-time setting
  must go at the unit level, and (a) is the precedent for doing it from the
  profile.
- `kvCacheType` would only fit at the unit level (Ollama reads it from the
  server environment). That is also unmeasured here.

**Measurement required to close:** an Ollama residency loaded through (b) at
a given context, followed by a `/v1` request, then reading `n_ctx` in the
log. Keep, do not revert (your directive).

## 3. Residency identity (post-hoc `residencyKeyOf(...contextLength)`)

| Candidate | Measured | Verdict |
|---|---|---|
| `residencyKeyOf` (`hostCoordinator.ts:104`) | the only definition; lease key (`coordination.ts:43,63,76`) and `grant.residency.instance` (`memoryGrantIssuer.ts:59`) | the canonical authority of the key |
| declared compatibility contract | in code, benches and store, only `hostCoordinator.ts:13` («deriva de la identidad entera en la misma colocación»); no list of the properties that make two residencies incompatible | **MISSING in Thyrox**; the ADR may hold it → SEARCH_INCOMPLETE |
| `configDigest(desired: DesiredResource)` (`resourceMaterialization.ts:242`) | sha256 of the desired state of a declarative resource (network, ports, mounts, environment, restart, command, labels) to decide drift and recreation; consumers `resourceMaterialization`, `ociArtifactRegistry` | **different invariants**: its input is the desired state of a container (labels and command included), while a residency key is computed before materializing, from the plan → reusing it literally is not correct |
| a shared hashing primitive | **none**: `createHash('sha256')` is repeated in 12 packages; `sha256Hex` (`memory/internalUtils.ts:164`), a private `sha256` (`resourceMaterialization.ts:233`) | there is no authority to reuse; extracting one is its own decision |
| `artifactIdentityMatches` (`runtimeMutation.ts:37`) | artifact only | insufficient |

**Measured facts that bound the contract:**
- `multipleResidencies: false` (`ollamaRuntimeAdapter.ts:33`): one unit, one
  residency, so the unit's configuration is the residency's configuration.
- The only inputs the plan has before materializing are the artifact,
  placement, runtime, `contextLength` and `kvCacheType`.

**Decision: SEARCH_INCOMPLETE.** The compatibility contract must first be
declared, as the set of plan properties that change the loaded runtime. Only
then can we decide whether the key is a domain digest over that set (with
the hashing extracted or local) or something else. No `/kv…` segments.

## 4. Mathematical capability — evaluation candidates

| Candidate (entry point) | Responsibility | Inputs → outputs / persistence | Consumers · tests | Why it does or does not qualify a capability |
|---|---|---|---|---|
| `local-models/taskSuite.ts` (`loadTaskSuite`, `scoreTaskReply`) | task suite format + deterministic scorer | suite JSON → `TaskScore` | 3 · 3 | **the suite authority → REUSE the format.** Its checks are `includes`, `excludes` and `excludes-pattern` (`:24-27`): `includes "12"` passes on «120», so it does not score a numeric answer → a check for an exact answer is missing (EXTEND candidate, owned by A7/0911, not decided) |
| `local-models/qualifyModel.ts` (`runTaskQualification`, `runEmbeddingQualification`) | runs cases against the runtime and records | request → `QualificationRun` → QualificationStore | 1 · 1 | the **runner** → REUSE |
| `local-models/qualifyCommand.ts` (`local-models-qualify --suite`) | CLI | argv → qualification | 1 · 2 | the entry point → REUSE |
| `local-models/embeddingSuite.ts`, `embeddingSuiteFromCorpus.ts` | embeddings suite | vectors → score | 3 · 4; 0 · 1 | another kind → rejected |
| `src/learning/reward.py` (`reward_for`, `ranking_key`) | reward contract of an attempt | gates + verifier → reward | 8 · 3 | **excluded by contract**: «PASS/FAIL es un hecho medido, no una recompensa … `src/learning/reward.py` … quedan fuera de A7» (`contract.md` §G7) → rejected |
| `src/learning/experience.py` | record (S, A, R, S') of an attempt | attempt → versioned record | 11 · 1 | RL experience, same exclusion → rejected |
| `src/learning/token_usage.py` | token usage of an attempt | stream → `AttemptUsage` | 4 · 1 | cost, not capability → rejected |
| `src/measurement/{distribution,deviation,series,trend,change_point,residual_structure,perplexity,normalizer_magnitude}.py` | statistics primitives | numbers → readings | 1–18 · 1–11 | they measure series and distributions, they do not qualify a model → rejected as the owner (a possible helper for an interval on the pass rate, not decided) |
| `src/measurement/rejection_sampling.py` (`bin/rejection_sampling`) | exact sampling of `q` with a draft `p` | distributions → probabilities | 2 · 3 | speculative decoding → rejected |
| `src/verify/batch_verification.py` | judges N `TS2305` fixes with one `tsc` | diagnostics → JSONL of verdicts | 7 · 4 | TypeScript domain → rejected |
| `src/verify/annulment_control.py` (`bin/annulment_control`) | runs an annulment control and leaves evidence | subject + suite → bench output | 1 · 2 | validates tests, not models; **applies as a criterion**: the math suite must fail on a deliberately wrong answer → rejected as the owner |
| `src/verify/check_suite_discrimina.py` | «¿La suite DISCRIMINA…?» by AST mutation on Python suites | AST → candidates | (gate) | does not read JSON model suites → rejected as the mechanism; same criterion as above |
| `src/verify/step_report.py`, `src/verify/runner.py` | loop step report; gate runner | bench → JSON report; registry → verdicts | —; 76 · 71 | report and gates, not qualification → rejected |
| `src/corpus/bie_series.py`, `src/agents/measure_delta.py` | BIE series notes; disk symbol delta | — | 1 · 1; 2 · 1 | other domains → rejected |
| `src/workbench/{manifest,paths}.py`, `src/testing/clone_tree.py` | bench manifest and homes; synthetic clone tree | — | 118 · 53; 670 · 411; 0 · 7 | infrastructure → rejected |
| versioned suites | `suites/tool-calling-1.json`, `suites/batch-worker-mecanica-1.json` | — | — | no math suite exists |

**Decision for Q4:**
- **Format and runner: REUSE** (`taskSuite.ts`, `qualifyModel.ts`, `local-models-qualify`).
- **The suite's content: MISSING**, with every candidate rejected above.
- **The numeric scorer: EXTEND `TaskCheck`.** It is a candidate, measured by
  the `includes` false positive, not decided.
- **Keying and eligibility: owned by A7.** Until A7 lands, a math
  qualification can only be recorded as `task:<class>`, which mixes axes. So
  **creating the suite before A7 would be premature.**

## 5. `thyrox-bg --stdin` (post-hoc, 65a0e2b60)

**Lifecycle authority:**
- `bin/thyrox-bg` runs `exec "$THYROX_ROOT/src/session/bg.sh"`.
- `bg.sh` holds `start`, `wait`, `status`, `register` and `marker-pattern`
  for the jobs it launches. It is the only place the job's descriptors are
  attached (`> "$LOG" 2>&1 &`).
- It is called from 14 files (`outputs/profile-candidates/Q1-stdin-candidates.txt`).

| Candidate | Input attachment | Reusable abstraction? |
|---|---|---|
| `background.py:187` | `stdin=DEVNULL` | no (closes stdin, does not declare a source) |
| `adopt_background.py:203` | reads the client's notice from stdin | no (adopts, does not launch) |
| `run-task-pool.sh:100,329,425` | commands from a file or `-` (`mapfile`); parallel `< /dev/null` | an inline convention «file or `-`», not a reusable function |
| `run-task-pool-job.sh`, `runner.py` | nothing | no |
| `command-runtime/bin/command.ts:17,39,126,137` | `--file` or `Bun.stdin.text()` | an inline convention, TypeScript, not reusable from bash |
| `source_copy_step.py:48` | `stdin=DEVNULL` | no |
| `stdin-napi` | TTY reader for the TUI (raw mode, NAPI) | another domain |
| `parallel_map.sh:13-24,62` | refuses without a declared source | an inline convention |

**Decision: EXTEND `bg.sh` holds.** `bg.sh` is the lifecycle authority, and
no candidate has a reusable input-source abstraction. The repeated
convention is «a declared file, or `-`». `--stdin` takes a file only and
does not accept `-`, which deviates from that convention (an open note, not
debt).

**Corrected value of the change:** it added no fix, since stdin was already
`/dev/null`; it added the ability to declare a source.

**Separate regression, not mixed in:** `src/verify/tsc_cycle.py:719-731`
launches `thyrox-bg start … -- bash -c "… < items"`, which has been refused
since 9429f0984. `tests/verify/test_tsc_cycle.py:230-235` only checks the
argv, so it does not see the refusal.

## 6. Required for A6?

| Change | Required for the first local worker? | Evidence | Decision |
|---|---|---|---|
| `kvCacheType` → runtime | **no** | 5/5 catalog entries declare `defaultKvCacheType: f16` (= `OLLAMA_DEFAULT_KV_CACHE_TYPE`, `declareInstalledModel.ts:33`); the resolver uses `request.kvCacheType ?? entry.defaultKvCacheType` (`modelResolver.ts:78`); the proxy admits with `{ model }` alone → plan and runtime agree | defer until `managed-only` |
| residency fingerprint | **no** | the current key already separates contexts, which is what A6 r5 needed | defer |
| `tsc_cycle.py:719` | **no** | A6 does not go through `tsc_cycle` | defer |

## 7. Search Existing gate

- **Owner: TASK-THYROX-0901** (`#132`, in_progress). Its declared scope:
  - a mechanism registry (id, concept, authority, symbol, entry point, tests,
    consumers, keywords);
  - `bin/search_existing_mechanisms` answering FOUND/RELATED/NONE;
  - a drift checker registered in `src/verify/registry.py`;
  - an «Existing mechanisms search» section in the bench template.
- **State:** `bin/search_existing_mechanisms` does not exist; T001 is at
  attempt 7 (`.claude/workbench/mechanism-registry-20261002T061646/outputs/`).
- **Existing gates reviewed** (`outputs/profile-candidates/Q8-gate-candidates.txt`):

  | Gate | What it checks | Verdict |
  |---|---|---|
  | `check_premise_drift` | a premise chain | not a mechanism |
  | `check_consumer_anchor` | paths leaving Thyrox | not a mechanism |
  | `check_durable_path_ownership` | ephemeral roots in benches | not a mechanism |
  | `check_role_abstraction` | Python in spec sections | not a mechanism |
  | `check_rule_divergence` | rules with the same name | not a mechanism |
  | `check_absence_claim` | **a comment that claims an absence, checked against the tree** | the closest: the form «MISSING without proof». Possible EXTEND by 0901 |
  | `check_stand_ins` | substitutes that outlive their originals | duplicate *symbols*, not decisions |
  | `check_unreachable_rules` | `allow` rules that never fire | not a mechanism |
  | `implementation_order` | Tarjan/Kahn/KNN order | not a mechanism |

- **Decision:** do not create `check_search_existing`. The contract you
  requested is to be appended to TASK-THYROX-0901 (MISSING requires searched
  root, surfaces, queries, candidates, rejected candidates with their reason;
  otherwise SEARCH_INCOMPLETE). Whether 0901's verifier extends
  `check_absence_claim` is 0901's decision.
- **Citation collision found:** the bench README names the task
  `TASK-THYROX-0769`, but in the store `TASK-THYROX-0769` is «Enable
  qwen2.5:7b-instruct as an eligible Thyrox execution model» (session
  81a17524). Its identity is TASK-THYROX-0901.

## Summary

| Decision | v2 | v3 |
|---|---|---|
| 0911 vs 0900 | «depends on 0900 and A7» | the axis is a **duplicate** of A7; the math part is a **child**; dependency PROVISIONAL (ADR unavailable, `blocked_by` not declared) |
| `grantEnvironment` | EXTEND proven | **SEARCH_INCOMPLETE**: `loadResidency(binding, grant)` already existed; one runtime measurement decides |
| residency key | configuration digest | **SEARCH_INCOMPLETE**: declare the compatibility contract first; `configDigest` has different invariants; no shared hashing primitive |
| math suite | SEARCH_INCOMPLETE | format/runner REUSE; content MISSING (every candidate rejected); scorer EXTEND candidate; **waits on A7** |
| `--stdin` | EXTEND, with a false premise | **EXTEND holds**; premise corrected; `tsc_cycle` is a separate regression |
| Search Existing gate | — | **owned by TASK-THYROX-0901**; no new gate |
| A6 prerequisites | — | none of the three changes |
