# Search Existing — managed qualification and durable local-required enforcement (2026-10-02)

Deterministic only: `rg`/`sed` over the tree, the agent store, and bench
records. No subagent. Every row cites the file that is its source of truth.

## Q1. Run `local-models-qualify` as a managed payload, not as a control-plane entry

| Piece | Authority (file:line) | Verdict |
|---|---|---|
| Managed payload launch | `src/session/bg.sh:356-375`: `thyrox-bg start <n> --task TASK-… --kind <k> [--network host] [--mount SRC[:DST][:ro]] [--env NAME] -- <argv>` → runner `podman-execution/bin/execute.ts` → `ExecutionUnit` | **REUSE** |
| Execution kind | `podman-execution/executionAuthorization.ts:33-43`: `probe` is declared (also `test`, `workbench`) | **REUSE** (`probe`) |
| Repo and store inside the unit | `podman-execution/executionCommand.ts:189-190`: repo root mounted `rw`, workdir = repo root, so `.thyrox/models/qualifications.json` is reachable | **REUSE** |
| Coordinator socket inside the unit | `src/session/headless-pool.sh:837-839`: mounts the socket directory and passes `THYROX_MODEL_COORDINATOR_SOCKET` | **REUSE** (same `--mount` + `--env`) |
| Network to the model unit | `executionCommand.ts:180-181`: `--network host` (adds proxy CA) | **REUSE** |
| Durable task citation | agent store `tasks`: "Declare installed Ollama models… qualify them by suite" = `TASK-THYROX-0707` | **REUSE** |
| **Host coordinator lifecycle** | `daemonCli.ts:247-253` declares `start/stop/status`, but `launchAgent.ts:160-162` refuses on non-darwin; transient spawn (`cli/src/bg/daemonAdapter.ts:168-180`) idle-exits with a live residency (`bgDaemonTimers.ts:75-81`, H-THYROX-412); the daemon is absent from `control_plane_entries.tsv` | **MISSING** on Linux: no declared host entry starts the coordinator. ADR-007 1.14.0 requires one coordinator per host. |

Conclusion: `local-models-qualify` is payload (`--kind probe`), not a control-plane entry.
What is missing is the host coordinator's declared lifecycle, not the qualifier.

## Q2. Which authority can deny Agent/Explore/Claude and unmanaged payloads under local-required

| Piece | Authority (file:line) | Verdict |
|---|---|---|
| PreToolUse decision channel | `src/hooks/tool_use_preflight.py:155-208`: a detector may return `{"notice", "decision": "deny"}`; strongest wins (precedent `detect_irreversible_operation`) | **REUSE** |
| Agent dispatch detector | `src/hooks/detect_agent_dispatch.py`: sees `Agent`, but only advises (deterministic vs judgment) | **EXTEND**: deny `Agent` when the declared policy forbids provider fallback |
| Client-background detector | `detect_client_background` (fires on `run_in_background`): advises `thyrox-bg` | **EXTEND**: deny an unmanaged payload under the same policy |
| Policy vocabulary | `provider/src/cost/executionPolicy.ts:1-60`: `{allowed: [local selectors], fallback: {enabled}}`; `fallback.enabled=false` → `runtime: blocked` (`policy.ts`) | **REUSE**, no second policy engine |
| Durable declaration of the policy | only per call: `agent/bin/recommend.ts:21` `--policy <file>`, `headless-pool.sh:304` `MODEL_POLICY` | **MISSING**: no versioned, repo-level policy file that the hook, the recommender and the pool all read |

Conclusion: one versioned policy file (`ExecutionPolicy` schema, `fallback.enabled=false`)
named by one declared key, read by the preflight detectors, `agent-recommend` and
`headless-pool`. That is what makes the rule survive compaction, restart, a new
controller and a new worktree. A conversation instruction does not.

## P2e's real dependency (DAG correction, measured)

`managed-podman-execution-boundary-20261001T164746/bootstrap.md` authorizes P2d/P2e/P3 under
M0 (`task_continuation` → `thyrox-bg --task` → `ExecutionUnit`, candidates `qwen3.8-flash`,
`deepseek-v4.1-flash`). It does not make P2e wait on A6.

But `outputs/continuation.jsonl` records P2d's five M0 attempts:
- attempts 1, 2, 3 and 5: `provider_transient` (`502 upstream`);
- attempt 4: `stalled` (exit 124 after 2738 s).

No worker completed; P2d was accepted by isolated verification of the change left by a paused
attempt. The remote non-streaming route is cut at ~30 s (H-THYROX-409).

So P2e depends on **a working executor**, which is one of:
- (a) M0 with a route that does not 502;
- (b) the local route (A4 managed → A6).

It does not depend on A6 as such. "P2e after A6" was stated without citing this evidence.

## Deviations after the compaction (recorded as findings)

1. Search Existing for A8a went to a Claude `Explore` subagent. Its conclusions (outcome taxonomy, ingestion dispatch, identity) are **hypotheses** until re-measured here. Q1/Q2 above were measured without it.
2. A4 was launched as a client background task after `thyrox-bg` refused and named the managed route. It wrote one row to the real store: `qwen3-4b`, protocol `tool-calling@1` 6/6, ctx 8192, `isolated`, `measuredAt 2026-10-02T19:16:31.421Z`. That row is **diagnostic**, neither deleted nor accepted. The 16K run was stopped (TERM to its `local-models-qualify`), and the coordinator and probe exited. One orphan unit `thyrox-worker-unit-bd89f467…` remains for the next coordinator start to retire.
3. The DAG gained "P2e after A6" without evidence. Corrected above.
