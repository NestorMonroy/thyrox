# A6 — transporte del contexto declarado hasta la admisión (EXTEND admittedUpstream)

Cadena contractual:

    headless-pool --context-tokens N
    → THYROX_LOCAL_MODEL_CONTEXT_TOKENS (exportada; nombrada con --env a la unidad)
    → thyrox -p / printDelegation → localProxy --context-tokens N
    → startAdmittedUpstream({ contextLength: N }) → AdmissionRequest.contextLength = N
    → resolveModel (requested ?? maxContextLength) → ExecutionGrant.contextLength = N
    → OLLAMA_CONTEXT_LENGTH = N   (mitad del coordinador: ya cubierta por sus pruebas)

| eslabón | prueba nueva | RED | GREEN | anulación (retirar el transporte) |
|---|---|---|---|---|
| relé | admittedUpstream.test.ts «el contexto declarado… viaja en la admisión» | 1 fail | 10/10 | cae exactamente esa (9 pass, 1 fail) |
| proxy | localModelProxy.test.ts «--context-tokens N llega a la admisión» + rechazo de valor no entero | 2 fail | 11/11 | cae exactamente la de transporte (10/1) |
| printDelegation | «el contexto que declara el consumidor viaja al proxy» | export ausente | 19/19 | cae exactamente esa (18/1) |
| headless-pool | caso 4b (2 aserciones) | 14 ok · 2 fallas | 16/16 | caen exactamente las 2 |

Suite derivada (`evidence/a6-r4-oom/derived-suite.txt`): rojos en
test-headless-pool-worktree (1), test-headless-pool (1, admisión de VRAM),
test-gnu-time-launchers (sin GNU Time), test_parallel_map_history (5) y
test_tsc_cycle (agent-recommend analisis): **los cinco idénticos sobre HEAD**
con `git stash`, no atribuibles a este cambio. tsc de provider y cli: 0.

Sin cambios en UNIT_LIMITS, en el contexto pedido ni en `--model`.
