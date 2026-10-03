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

## A6 r5 — primer error y su clasificación

`podman-execution-execute: autorización rehusada (environment.THYROX_LOCAL_MODEL_CONTEXT_TOKENS): … nombra una credencial`.
Autoridad: `CREDENTIAL_NAME_PATTERN` (`podman-execution/workerResourceProfile.ts:64`), `TOKEN` casa `TOKENS`.
Decisión: **REUSE** de la guarda sin cambios (relajarla admitiría `*_TOKENS` de credencial) y renombrar la
variable a `THYROX_LOCAL_MODEL_CONTEXT_LENGTH`, el vocabulario del dominio (`contextLength`, `OLLAMA_CONTEXT_LENGTH`).
El caso 4b no podía verlo: su ejecutor es un doble que no autoriza. Prueba de contrato nueva en
`executionAuthorization.test.ts`: lee de `headless-pool.sh` los nombres que pasa con `--env` y los autoriza
de verdad. RED con el nombre anterior (rehúsa exactamente esa variable); GREEN tras el renombre (29/29).

## A6 r6 — el contexto declarado era el de otro tokenizador (H-THYROX-447)

`request (25468 tokens) exceeds the available context size (24832)`: 24663 era el prompt de `thyrox -p`
medido con otro modelo (`pool-r5`, n_ctx 4096). Se declara el contexto cualificado, 32768 (7246 MiB < 8192).

## A6 r7 — el corte implícito de 300 s del fetch de Bun

`TimeoutError` en el túnel (`POST - http://localhost/v1/messages failed`) y en `thyrox -p`. Mismo defecto
que H-THYROX-417 en otra ruta. Cuatro `fetch` en serie sin plazo declarado más el del cliente:

| salto | arreglo | prueba | anulación |
|---|---|---|---|
| túnel (`credentialProxy.ts`) | `timeout: false` | 4b (fetch interceptado) | cae exactamente 4b |
| proxy → relé (`openaiCompat/forwarder.ts`) | `timeout: false`, plazo por `signal` | forwarder (fetch inyectado) | cae exactamente esa |
| relé → unidad (`admittedUpstream.ts`) | `timeout: false` | relé (fetch interceptado) | cae exactamente esa |
| guarda de `localProxy.ts` | `timeout: false` | **sin prueba propia**: proceso aparte; su control es la A6 real | — |
| cliente `thyrox -p` (`anthropicHttp.ts`) | `timeout: false` + `AbortSignal.timeout(API_TIMEOUT_MS)` (REUSE de la autoridad de `anthropic/client.ts`, 600 s) | 2 pruebas | sin `timeout:false` cae 1; sin la señal cae esa y la del plazo cuelga |
| pool | `API_TIMEOUT_MS` = `--timeout` × 1000 si no se declaró; nombrada a la unidad | caso 4c | cae exactamente 4c |

Sonda `probes/bun_serve_idle_timeout.ts`: el `idleTimeout` de 10 s de `Bun.serve` corta un GET pendiente y
**no** un POST; todos los saltos son POST, así que no se toca. La prueba de 11 s que lo pretendía cubrir pasó
sin arreglo y se retiró por no discriminar.

## Unidad gestionada + worktree aislado (EXTEND de headless-pool, TASK-THYROX-0919)

`--execution unit` rehusaba `--isolation worktree` («todavía»). Ahora el runner monta la raíz principal y la
unidad recibe la raíz del worktree como `THYROX_POOL_ITEM_ROOT` (el payload la restituye como `THYROX_ROOT`) y el
envoltorio de git primero en el PATH; se monta el directorio git común. Caso 6: RED 6 fallas → GREEN 22/22.

Suite derivada (`evidence/a6-r4-oom/derived-suite-timeouts.txt`): los rojos preexistentes de siempre; uno nuevo
de `env_contract_keys` (variable sin declarar) y uno del control de `worktree` (mi comentario contenía la cadena
que el control cuenta), ambos corregidos; `bg-stdin` falló una vez con el anfitrión a ~1 GB libres y pasa al repetir.

## A6 r8 — el piso de instrucciones domina el prefill

`llama-server` en la unidad: prefill a 26→17 tokens/s, cayendo; a los 850 s, 14 336 de 25 468 tokens. Proyección
del primer turno ~2 250 s > `--timeout 1800`: se cancela con `process_ownership drain`. Medido con el ensamblador
real (`probes/system_budget_sizes.ts`): el prompt de sistema son **20 006** tokens, ~10 000 de ellos
`trabajo-en-segundo-plano.md` (orquestación). REUSE de `assembleSystemPrompt` y su `budgetTokens`
(nunca descarta la base); EXTEND: `thyrox -p` reenvía `--system-budget-tokens` (prueba en `print.test.ts`,
anulación exacta) y `headless-pool --system-budget-tokens N` lo pasa a cada ítem y valida el entero
(caso 4d, anulación exacta de sus dos aserciones). Con 8 200: 8 123 tokens, entra `search-existing-antes-de-construir`.
