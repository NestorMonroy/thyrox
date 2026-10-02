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

## T001–T003 por la ruta gestionada (estado al detenerse)

| task | verdict | evidencia |
|---|---|---|
| T001 | accepted, gate PASS en sus 5 pasos | `outputs/T001-*`, `T001-containment.jsonl` |
| T002 | accepted (criterio de cierre: recuperable desde PostgreSQL + reingesta idempotente), gate PASS en sus 10 pasos; **hueco declarado**: no hay productor de embeddings ni modelo decidido (ADR-008 D5) | `outputs/T002-*`, `T002-containment.jsonl` |
| T003 | **detenida**: la recreación declarada de `thyrox-postgres` (`THYROX_INFRA_POSTGRES_PORT=55433 bin/infrastructure_ensure`, y vuelta) fue denegada por el control de permisos de la sesión; espera la decisión del ejecutor | `outputs/T003-snapshot-before.json`, `T003-identity-before.jsonl` |

Corrección del instrumento descubierta en T003: `src/session/unit_attest.sh`
usa `gawk` y `jq`, que una imagen ajena (pgvector) no trae; ahí el payload no
llega a correr. La anulación «PostgreSQL sin volumen» salió FAIL por esa causa
y **se descartó**: un FAIL por la causa equivocada no discrimina.

| — | `podman run --rm --entrypoint sh pgvector … command -v …` (sondeo de herramientas de la imagen) | — | — | ninguno | **true** | **architecture_invalid** (Regla 4: contenedor creado fuera de la primitiva); salida vacía, no se usa como evidencia; repetido por la primitiva |

## Reanudación y propiedad de rutas (después de la compactación)

- La reanudación se expresa con lo que ya existía: `plan.jsonl` +
  `outputs/continuation.jsonl` (`task_continuation next` deriva la frontera),
  el `verify` de cada ítem re-comprueba su evidencia y el ledger de
  `wait-jobs` es la autoridad de los trabajos (sin pids).
- Nuevo, porque no existía: `check_durable_path_ownership` (PathOwnershipGate).
- Promovidos al banco: las entradas del verificador de T001
  (`outputs/T001-observed-*.json`); al banco de Ollama, su log de recuperación.
  `secret-digest` NO se promueve: es el sha256 de la contraseña y se vuelve a
  leer de la etiqueta del secreto de Podman al verificar.
- `unit_attest.sh` pasa a POSIX sh con sólo órdenes internas y `/proc`:
  probado con una imagen sin gawk ni jq (e2e 8/8).
- T002 queda **blocked** (criterio obligatorio de embedding sin cumplir);
  T003 sigue por decisión del ejecutor, declarada en `plan.jsonl`.

## T004 y T005

- T004: 54 errors ingeridos, reingesta 0 creados / 0 versiones, verificación
  desde PostgreSQL PASS. **blocked** por el mismo criterio obligatorio de
  embedding que T002.
- T005: metadatos de Podman observados por el plano de control; todos los
  bytes medidos en unidades con montajes de sólo lectura. La caché de bun se
  midió por número de enlaces: 729 MB están enlazados a `node_modules` y
  borrarlos no libera nada.
- Deriva de declaración corregida: el `.env` declaraba
  `THYROX_INFRA_OLLAMA_VOLUME=thyrox-ollama-probe-models` (vacío), y el
  contenedor vivo montaba `thyrox-ollama-bench-models` sólo por el override
  del guion de recuperación. Ahora declara `thyrox-ollama-bench-models`;
  `infrastructure_ensure thyrox-ollama` → `kept`
  (`outputs/T005-ollama-ensure-declared.txt`). El `.env` no se versiona.

## Propiedad de Podman (P1–P4)

- Toda observación de Podman de este lote pasa por el dueño:
  `bin/podman-execution-execute observe container|volume|secret-labels|containers|volumes|images|storage|snapshot`
  (`src/packages/podman-execution/podmanObservation.ts`), sólo verbos de
  lectura. El borrado de una imagen, por `remove-image --task`, que rehúsa si
  algún contenedor la usa.
- Ninguna unidad monta el socket ni el almacén de Podman.
- `check_podman_access_ownership` (PodmanAccessOwnershipGate), en el
  pre-commit: RED con el `podman volume inspect` directo de T005
  (`outputs/T005-ownership-red.txt`), GREEN tras migrar
  (`T005-ownership-green.txt`), anulación por subproceso → sólo cae el gate de
  propiedad, datos idénticos (`T005-ownership-annulment.json`). Lista cerrada
  `src/verify/podman_access_pending.txt`: 6 entradas vigentes, migración en
  TASK-THYROX-0759.
- Regresión conservada: el `podman run --rm` directo del anfitrión de este
  lote es un caso de la suite del gate.
- T001 y T003 re-verificados y T005 reclasificado sobre la observación del
  dueño; misma conclusión, contención PASS en los 14 pasos canónicos.
- Pruebas en unidad: podman-execution 200 pass / 16 skip / 0 fail; gate de
  propiedad 10/10. Typecheck acotado al paquete: 3 errores, todos en tests no
  tocados y anteriores a este lote (`containerRun.test.ts:26`,
  `workerContainerLifecycle.test.ts:46`, `executionCommand.test.ts:138`,
  introducido en `07593694f`). El typecheck del repo entero muere por memoria
  dentro de la unidad.
