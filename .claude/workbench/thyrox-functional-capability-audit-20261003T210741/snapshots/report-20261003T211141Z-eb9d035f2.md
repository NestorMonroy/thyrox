# Auditoría funcional de Thyrox — qué puede pedir hoy un consumidor

Fecha: 2026-10-03T21:07Z, sobre `a090c0b81`. Complementa (no repite) la fotografía de
`thyrox-state-audit-20261003T204631/outputs/REPORT.md`; las cifras de máquina, contenedores e
imágenes vienen de allí. Aquí la pregunta es de PRODUCTO: entrada soportada → resultado completo.

Escala: ABSENT · DESIGNED_ONLY · IMPLEMENTED · INTEGRATED · REAL_VERIFIED · **CONSUMABLE** (un
consumidor lo pide hoy por una entrada soportada y obtiene el resultado completo) · ACTIVE_NOW.
Contexto que decide CONSUMABLE hoy: la VM se recicló a las 20:46Z y **nada del runtime corre**
(coordinador, Ollama, PostgreSQL, Redis en `created`). Una capacidad cuya entrada exige el runtime
no es CONSUMABLE hasta que exista la convergencia tras reciclado (fase 2).

## Capability matrix

| Capability | State | Authority | Consumers | Real proof | Consumable today | Gap |
|---|---|---|---|---|---|---|
| ejecutar una tarea en unidad Podman | REAL_VERIFIED | `podman-execution-execute run` | headless-pool `--execution unit`, task_continuation | A6 r9, contención e2e | **sí** (no exige runtime de modelos) | — |
| ExecutionAuthorization | INTEGRATED | `podman-execution/executionAuthorization.ts` | primitiva | gate 0 violaciones | sí | — |
| worktrees aislados | REAL_VERIFIED | `headless-pool --isolation worktree` + `pool_integrate` | pool | 0919 r3–r5, write-route | sí | worktree retenido sin retirar (`.thyrox/pool-worktrees/276193a40e30/1`) |
| background jobs | REAL_VERIFIED | `thyrox-bg` + `wait-jobs` | sesión, pools | ledger real | sí | 2 trabajos A6 sin recoger |
| cancelación / timeout / cleanup | REAL_VERIFIED | `bin/execute.ts` SIGTERM → `retireOwnedContainers`; `timeout` del pool | pool | `runner_sigterm.sh` real | sí | — |
| orphan reconciliation | REAL_VERIFIED | `podman-execution-execute reconcile-orphans` | manual; no está en ninguna composición de arranque | real (62dfeec20) | sí, a mano | no entra en `local_control_plane_ready` |
| declarar / catálogo de modelos | INTEGRATED | `model-artifacts/modelCatalog.ts`, `bin/local-models-catalog` | coordinador, recomendador | A6 | sí | capacidades declaradas `[completion]` sin `tools` |
| importar artefacto | REAL_VERIFIED | `local-models-import` → `externalArtifact.ts` | manual | import real de qwen3-4b (`.thyrox/runtime/qwen3-4b-hf-import`) | **no bajo la política**: import/ensure no son entradas declaradas del plano de control (`control_plane_entries.tsv`) | ruta declarada (plan matemático, «BLOCKED_BY_BOOTSTRAP») |
| validar artefacto | REAL_VERIFIED | `importCommand.ts:74` en `DEFAULT_LAB_IMAGE` | import | real | igual que import | — |
| materializar / asegurar modelo | REAL_VERIFIED | `local-models-ensure` + Ollama gestionado | manual | real (manifiesto en el volumen) | no declarado bajo la política | igual |
| cualificar modelo | REAL_VERIFIED (perfil parcial) | `local-models-qualify` → `qualifyModel.ts` vía coordinador | recomendador | 3 registros reales | no (exige coordinador) | perfil incompleto; sin suite de repo |
| seleccionar modelo | INTEGRATED, **tres autoridades** | `recommendExecution` / `providerSelection` / `choose_candidate` (05) | pool y tsc_cycle / nadie / task_continuation | dobles | sí (CLI responde: hoy `blocked unqualified_profile`) | conflicto de autoridades |
| admitir recursos RAM / disco | REAL_VERIFIED | `resource_admission.py`, `disk-headroom` | coordinador, builds, pools | real | medición sí | `makeRoom` abierto por tipo (H-THYROX-456) |
| admitir CPU | ABSENT | — | — | — | no | `UNIT_LIMITS cpus 2` fijo |
| admitir VRAM | IMPLEMENTED (nivel 1) | `gpu_monitor`, `resource_admission` | pools | sin GPU | no aplica | — |
| residencia: crear / reutilizar / desalojar | REAL_VERIFIED | `ResidencyController` | coordinador | eviction real (run 3) | no (coordinador parado) | arranque |
| inferencia local | REAL_VERIFIED | coordinador → unidad Ollama → `admittedUpstream` | `thyrox -p` por proxy | A6 r9 | no (coordinador parado) | arranque |
| fallback de selección | IMPLEMENTED (dobles) | `policy.ts` cadena derivada | recommend, pool | dobles | sí | un solo modelo |
| fallback de ejecución local→local | IMPLEMENTED (dobles) | `admittedUpstream.ts` | `localProxy --fallback-model` | dobles | no (coordinador) | sin salto real |
| model routing por capacidad | ABSENT | — (`RouteRequirement` 0 apariciones) | — | — | no | — |
| PostgreSQL | REAL_VERIFIED | `infrastructure-bootstrap` / `infrastructure_ensure` | semantic-search | volumen con 47 MB | no (`created`) | arranque |
| pgvector | IMPLEMENTED (provisión declarada) | `infrastructure.sh:227` | semantic-search `migrate` | PG del toolchain | no | arranque |
| Redis | REAL_VERIFIED como infraestructura | `infrastructure_ensure` | `runLease` | contenedor creado | no (`created`) | arranque; sin persistencia por diseño |
| Ollama gestionado | REAL_VERIFIED | `infrastructure_ensure thyrox-ollama` | ensure, import | real | no (`created`) | arranque |
| bootstrap / reconcile tras reciclado | PARTIAL | `local_control_plane_ready` (lock recovery + ensure) | manual | real (esta tarde: 0/13 → 13/13) | sólo a medias | sin modo status/help read-only; sin reconcile-orphans, coordinador ni salud final |
| health de contenedores | PARTIAL | `infrastructure_ensure` (health por declaración) | ensure | real | no como observación | `observe` sin health |
| observación de contenedores | PARTIAL | `podman-execution-execute observe` (8 vistas) | auditorías | real | sí | sin logs/stats/health; 4 sitios observan fuera de la primitiva (03) |
| volúmenes / imágenes / disco | PARTIAL | `observe volumes/images`, `remove-image`, `build-image`, labels de ciclo de vida | builds | real | parcial | 14 imágenes sin dueño; GGUF ×4 (04) |
| shared state memoria | INTEGRATED, **ACTIVE por defecto** | `@thyrox/shared-state` | proxy, scheduler | — | sí | — |
| shared state Redis | REAL_VERIFIED (adapter, redis del toolchain) | `factory.ts` | sólo `runLease` en producción | no contra `thyrox-redis` | no | wiring de producción |
| leases / cooldowns / ventanas / coordinación | IMPLEMENTED | proxy resilience, coordinationFactory | proxy, scheduler | contra redis del toolchain | en memoria | wiring |
| ingest de documentos / identidad / versión / chunks | REAL_VERIFIED (PG de prueba) | `semantic-search/store.ts` | `bin/semantic-search-ingest` (sólo hallazgos RST) | 7 suites `*.postgres.test.ts` | no (PG parado) | — |
| espacios de embeddings / putEmbeddings | IMPLEMENTED | `spaces.ts` | **ninguno** fuera del paquete | PG de prueba | no | sin productor de embeddings |
| nearest search | IMPLEMENTED | `store.searchNearest` | **ninguno** | PG de prueba | no | — |
| worker retrieval / RAG | ABSENT | — | — | — | no | — |
| Read / Write / Edit / Bash en el worker | REAL_VERIFIED | `thyrox -p --tools`, pool `--tools` | pool | write-route (60 líneas) | no (coordinador) | arranque |
| tool calling | REAL_VERIFIED (formato) | Ollama `/v1` + traducción | worker | `tool-calling@1` 6/6 | — | sólo formato |
| navegación de repo / bucle de corrección | ABSENT como capacidad medida | — | — | 0919 sin PASS | no | suite de repo |
| verifier | REAL_VERIFIED | `headless-pool --verify` + `pool_integrate` | pool | veredictos reales (rechazado/sin-cambios) | sí | — |
| Search Existing | DESIGNED_ONLY | regla + contrato RED | prompt del worker | — | no | — |
| specialist routing / mathematical reasoning | ABSENT | — | — | — | no | `RouteRequirement` |
| jobs / process ownership | REAL_VERIFIED | `wait-jobs`, `process_ownership`, `stdin_probe` | sesión | real | sí | sin sleeping/stuck unificado |
| RAM / disco / VRAM / CPU observados | RAM, disco: CONSUMABLE; VRAM: N/A; CPU: ABSENT | `resource_admission`, `disk-headroom`, `hardware-inventory` | — | real | sí | CPU |
| container logs / stats | ABSENT por la primitiva | — | — | — | no | `observe` |

## Authority map (una por dominio)

| Dominio | Autoridad | Conflicto |
|---|---|---|
| selección de modelo | **en conflicto**: `recommendExecution` (pool, tsc_cycle), `providerSelection` (nadie), `choose_candidate` (task_continuation) | 3 autoridades; tsc_cycle además exige `claude-` |
| cualificación | `ModelQualification` + `local-models-qualify` | — |
| política de ejecución | `executionPolicy.ts` (TS) + `execution_policy.py` (preflight) sobre el mismo JSON | dos lectores, un archivo: coherentes por prueba (caso 13) |
| scheduling | `ModelSchedulingCoordinator` / `hostCoordinator` | — |
| admisión de recursos | `resource_admission.py` (RAM, disco, VRAM) | CPU ausente |
| materialización de contenedores | `@thyrox/podman-execution` | 0 violaciones; 4 observadores fuera |
| ciclo de vida de infraestructura | `@thyrox/infrastructure` (`infrastructure-bootstrap`) vía `infrastructure_ensure` | — |
| identidad de artefactos | `model-artifacts` (nombre, catálogo) + `artifact-locations.json` (registry durable) | — |
| identidad de imágenes | `image-registry/declaredImages.ts` | 14 imágenes sin etiqueta de dueño |
| estado compartido | `@thyrox/shared-state` | — |
| corpus semántico | `semantic-search/store.ts` | — |
| estado de trabajos | `job_ledger` vía `thyrox-bg`/`wait-jobs` | — |
| credenciales | `provider/src/credentials.ts` (`resolveCredential`) | — |
| ruteo de proveedor | `decidePrintRoute` (por credencial) + routing del proxy (por modelo) | **la ruta se decide por credencial antes de mirar el modelo** (H-THYROX-455) |

## Duplicate implementations

- Tres selectores (arriba). Mi TASK-THYROX-0920/0923 creció sobre `recommendExecution` (H-THYROX-453).
- Cualificación de modelos por API como sonda de banco (`cutover_bootstrap.sh`) frente a
  `local-models-qualify`: criterios útiles fuera de la autoridad.
- Vigilancia de inactividad en `delegate.sh` (banco) frente a `wait-jobs` heartbeat/probe.
- Respaldo de modelo del bucle portado (`withRetry`, `query.ts`, `--fallback-model`) frente al de la
  ruta local (`admittedUpstream`).

## Disconnected implementations

`providerSelection.ts`; `apiModelCatalog` (Model Studio); `semantic-search` espacios y búsqueda;
`withRetry.FallbackTriggeredError` en la ruta local; `cutover_bootstrap.sh`; `delegate.sh`
(watchdog); `reconcile-orphans` fuera de la composición de arranque.

## Bootstrap exceptions

`controller.implementation: bootstrap-exception` (el controlador implementa); entradas estrechas en
`control_plane_entries.tsv` (9 filas, incluida `image-registry-build-declared-image` como excepción
estrecha de 0912); `local-models-import/ensure` sin entrada declarada (se usan a mano);
pendientes de Podman con tarea (0746, 0759).

## Critical blockers (sólo los que impiden la autoimplementación local)

1. **Runtime no converge tras reciclado** con una entrada declarada; además status y help no son
   read-only (`local_control_plane_ready` actúa siempre; 02).
2. **Disco**: 4 GiB libres; GGUF ×4 (una descarga parcial huérfana de 2.5 GB en el volumen de
   Ollama), 14 imágenes sin dueño.
3. **Localidad**: `thyrox -p` toma la ruta `own` con cualquier credencial aunque el modelo sea
   `thyrox-*`; la ejecución host la hereda.
4. **Cualificación** sin perfil completo ni suite de trabajo en repo; qwen3-4b inelegible.
5. **Sin watchdog** de repetición/no progreso en la ruta del pool (sólo `timeout`).
6. **Search Existing** inexistente — es lo que construye 0919.

## Non-critical gaps

Redis en producción (proxy/scheduler en memoria) · RAG (sin productor de embeddings ni consumidor)
· especialista matemático (sin `RouteRequirement`) · admisión de CPU · logs/stats/health por la
primitiva · tres autoridades de selección (no bloquea mientras el pool use `recommendExecution`) ·
import/ensure sin entrada declarada (no bloquea: el modelo ya está instalado).

## Reusable mechanisms (no reimplementar)

`local_control_plane_ready` + `podman_lock_recovery --classify` + `infrastructure_ensure` +
`reconcile-orphans` + `model_coordinator start|status` (convergencia); `observe` (inventario);
`remove-image` (borrado gestionado); `artifact-locations.json` + `externalArtifact` (identidad y
recuperación del modelo); `ModelQualification` + `qualifyModel.ts` + `suites/` (cualificación);
criterios de `cutover_bootstrap.sh`; `wait-jobs` heartbeat + `stdin_probe` + watchdog de
`delegate.sh` (vigilancia); `decidePrintRoute` + `credential-source` (localidad);
`headless-pool --isolation worktree --verify` + `pool_integrate` (aceptación); `bin/binary`.

## Dependency graph (orden de ejecución)

```
F2 convergencia tras reciclado (EXTEND local_control_plane_ready: status/help read-only,
   reconcile-orphans, model_coordinator, salud)           ─┐
F3 disco (clasificar por digest; retirar ORPHAN y           ├→ F5 cualificación con perfil completo
   BUILD_INTERMEDIATE por la primitiva / borrado probado)  ─┤      + suite repo-code-change@1
F4 localidad (thyrox-* nunca `own`; unit obligatoria)      ─┘          │
                                                                       → F6 recualificar qwen3-4b
                                                                         (8K → 16K → … mínimo)
F7 watchdog mínimo (REUSE delegate.sh / wait-jobs) ────────────────────┤
                                                                       → F8 0919 (bootstrap de Search Existing)
                                                                       → F9 Search Existing durable
                                                                       → F10 fases del worker
                                                                       → F11 aceptación nueva → managed-only
```
