# Auditoría de contención — POSTGRES-CORPUS-DISK-RECLAIM (TASK-THYROX-0758)

Fuente: los comandos que esta sesión ejecutó, leídos de su propio transcript
(no hace falta el log `0110262035`). Ninguna tarea está `accepted`.

| task | payload | executionId | containerId | materializer | hostPayload | verdict |
|---|---|---|---|---|---|---|
| scaffold | `bin/manifest scaffold` | maintenance-muqcl… | sí (unidad) | PodmanExecutionPrimitive | false | válido, sin atestación del primitivo (no existía) |
| T001 | `corpus_state.ts`, `vector_available.ts`, `migrate_store.ts` (SQL) | probe-muqcnp5g, -muqcnrqy, -muqco5zw, -muqcojhm | en unidad | PodmanExecutionPrimitive | false | ejecución válida; sin atestación verificable por el gate → se repite |
| T001 | `podman inspect thyrox-postgres` (estado, etiquetas, montaje, env) | — | — | ninguno | true (observación) | observación del plano de control; se repite dentro de la medición atestada donde sea posible |
| T001 | `grep` del valor de la contraseña contra `podman inspect` | — | — | ninguno | **true** | **architecture_invalid** |
| T001 | `podman exec thyrox-postgres … pg_hba.conf` | — | — | ninguno | **true** | **architecture_invalid** |
| T001 | reparación de `THYROX_SEMANTIC_SEARCH_DATABASE_URL` en `.env` (python en host) | — | — | ninguno | **true** | **architecture_invalid** (mutación) |
| T001 | `bun test` / `bash tests/…` del aprovisionamiento | — | — | ninguno | **true** | **architecture_invalid** (tests) |
| T004 | `bun test` de `documentRecognition.test.ts`, typecheck | — | — | ninguno | **true** | **architecture_invalid** (tests) |
| — | `df -B1 /` (free_before_batch) | — | — | ninguno | **true** | **architecture_invalid** (medición de disco) |
| — | commits y pushes de git | — | — | ninguno | **true** | **architecture_invalid** (git gestionado) |
| T002, T003, T005, T006, T007 | no ejecutadas | — | — | — | — | pendientes |

Fuera del batch, pero en esta misma sesión y con la misma forma: los tests
de las piezas RL (T002–T004 del lote RL) y los de la primitiva se corrieron en
el anfitrión en varias pasadas; sólo los GREEN marcados «en una unidad»
pasaron por la primitiva.

Operaciones administrativas del anfitrión, cada una a justificar por
operación (no como excepción general): `podman rm -f thyrox-ollama` (prueba
de durabilidad de Ollama), `podman image rm` de dos capas colgantes,
`podman stop` + `bin/podman_lock_recovery --confirm` (pendientes, en
`recover_and_resume.sh`).

Lo que sigue: `ManagedExecutionContainmentGate` (atestación del primitivo +
identidad vista desde dentro), RED/GREEN y anulación, y repetir por la ruta
correcta sólo lo invalidado; lo durable (el aprovisionamiento ya commiteado)
se re-verifica sin asumir que la ejecución anterior valió.

## Gate implementado y repetición por la ruta gestionada (2026-10-02)

- `src/verify/managed_execution_containment.py` exige, por paso: fila del
  primitivo (`--attest`: materializer, executionId, containerId de 64 hex) y
  fila vista desde dentro (`src/session/unit_attest.sh`: `inUnit`, cgroup
  `libpod-<containerId>`) que coincidan. Paso sin filas = FAIL.
- RED/anulación: `tests/verify/test-managed-execution-containment-e2e.sh`
  corre el mismo payload por el primitivo y por un subproceso del anfitrión;
  salida funcional idéntica, gate PASS y FAIL (`hostPayload`) respectivamente.
- GREEN repetido en unidades, con el gate aplicado a cada paso
  (`outputs/executions.jsonl` + `outputs/units.jsonl`):

| step | payload | gate |
|---|---|---|
| gate-unit-test | `python3 tests/verify/test_managed_execution_containment.py` (11/11) | PASS |
| primitive-bun-test | `bun test` de `podman-execution` (206 pass, 0 fail) | PASS |

La e2e se lanza desde el anfitrión porque su sujeto ES el despacho al
primitivo (crea unidades con Podman); dentro de una unidad no hay Podman.
Es despacho y observación, no payload.

**git commit/push**: operación de reconciliación del plano de control
(publicar estado durable ya producido y verificado), no un payload de la
tarea. Se declara por operación en cada commit, no como excepción general.

## El gate en el controlador (`task_continuation`)

`run_in_unit` lanza toda unidad con `--attest` (vía `thyrox-bg start
--attest`) y con el payload envuelto por `unit_attest.sh`; antes de aceptar,
`contained()` aplica el gate a los pasos que sostienen la aceptación
(preverify, o despacho + verificación). FAIL → `hard_block` con
`architecture_invalid: contención`; el veredicto queda en
`outputs/containment.jsonl` del banco.

| step | payload | resultado | gate |
|---|---|---|---|
| controller-gate-green | `test_task_continuation.py` | 61/62 (la anulación esperaba `hostPayload`; dentro de una unidad el subproceso hereda el cgroup y la razón es «sin atestación del primitivo») | PASS |
| controller-gate-green-2 | ídem, aserción por cualquiera de las dos razones | 62/62 | PASS |
| controller-gate-green-3 | ídem tras corregir ruff/pyright del test | 62/62 | PASS |
| controller-gate-annulment | ídem con `passed = True` forzado | 60/62: caen exactamente las 2 del sustituto del anfitrión | PASS |
| bg-attest-forwarding | `test-bg-managed-execution.sh` | 14/14 | PASS |
