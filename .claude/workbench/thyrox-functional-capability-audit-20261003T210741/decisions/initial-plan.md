<!-- extraído textual de report-20261003T232604Z-pre-structured-audit.md (sha256 75a113337c2d367ba09bb18022ecb211cd7d616f25b22b12376a97bb7ac77d0a); no editar: la fuente es el snapshot -->

# Auditoría funcional de Thyrox — qué puede pedir hoy un consumidor

Fecha: 2026-10-03T21:07Z, sobre `a090c0b81`. Complementa (no repite) la fotografía de
`thyrox-state-audit-20261003T204631/outputs/REPORT.md`; las cifras de máquina, contenedores e
imágenes vienen de allí. Aquí la pregunta es de PRODUCTO: entrada soportada → resultado completo.

Escala: ABSENT · DESIGNED_ONLY · IMPLEMENTED · INTEGRATED · REAL_VERIFIED · **CONSUMABLE** (un
consumidor lo pide hoy por una entrada soportada y obtiene el resultado completo) · ACTIVE_NOW.
Contexto que decide CONSUMABLE hoy: la VM se recicló a las 20:46Z y **nada del runtime corre**
(coordinador, Ollama, PostgreSQL, Redis en `created`). Una capacidad cuya entrada exige el runtime
no es CONSUMABLE hasta que exista la convergencia tras reciclado (fase 2).

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
