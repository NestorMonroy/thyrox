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

---

## Identity migration audit (THYROX → kaupamex-ai) — 2026-10-03

Directiva del ejecutor, añadida a la auditoría en curso. **Nada se renombró.**
Salidas: `identity-surface-inventory.tsv` (39 superficies, 11 columnas) y
`identity/` (extractos por superficie y conteos).

### Canonical proposed identity

```
ecosystem: kaupamex
component: ai
product: kaupamex-ai
CLI: kaupamex-ai        (no `kaupamex -p`: el ecosistema no tiene CLI raíz)
legacy alias: thyrox
```

### Surface inventory — apariciones versionadas por categoría

Métrica: `identity/classify_occurrences.sh`, primera regla que casa sobre cada
aparición de «thyrox» (insensible), sin `_references` ni `_archived`.
Ciega a: lo no versionado (`.thyrox/`, `.env`, volúmenes) y al significado de un
literal que ninguna regla separa (cae en PRODUCT_NAME).

| categoría | apariciones |
|---|---|
| HISTORICAL_REFERENCE (benches, jobs, cachés, agent-results) | 1 010 334 |
| STABLE_DOMAIN_ID (H-/TASK-THYROX-*) | 17 492 |
| PACKAGE_NAMESPACE (@thyrox/*) | 15 177 |
| TEST_FIXTURE | 9 795 |
| ENV_NAMESPACE (THYROX_*) | 7 124 |
| PRODUCT_NAME | 2 963 |
| DOCUMENTATION | 528 |
| FILESYSTEM_NAMESPACE (.thyrox/) | 308 |
| USER_FACING_COMMAND | 269 |
| COMPATIBILITY_ALIAS (`thyrox-rename: keep`) | 58 |
| RUNTIME_RESOURCE_NAME | 47 |
| OCI_LOGICAL_IDENTITY (labels) | 43 |
| OCI_DISTRIBUTION_NAME | 8 |

El 96 % es historia y procedencia: **no se toca**. El código vivo que importa
es del orden de 25 000 apariciones, casi todas de paquete y entorno.

### Must remain stable

- `H-THYROX-*` (hasta 460) y `TASK-THYROX-*`: ids estables; el componente se
  declara en metadata, el prefijo futuro es una decisión separada del ecosistema.
- Identidad de documento `domain + domainId`; `source_ref` es procedencia.
  Probado contra PostgreSQL real: `thyrox@0123456:…` y luego
  `kaupamex-ai@89abcde:…` con `H-THYROX-293` → **un** documento, versión 1,
  procedencia actualizada (`identity.postgres.test.ts` 4b, 10/10).
- Digests: `sha256:6775c008…` (manifiesto publicado), `7485fe6f…` (GGUF).
- Nombres contractuales de modelo `thyrox-<slug>:<quant>-<src>-<rev12>`: son
  clave de `qualifications.json`.
- Esquemas versionados persistidos: `thyrox.*-record.v1`, `thyrox.gguf.v1`,
  `thyrox-cred-v1.`.
- Commits de git.

### Can migrate by alias

- CLI `thyrox -p` → `kaupamex-ai -p`, mismo `bin/cli` → `cli.tsx` antes de
  parsear; el alias se mide para retirarlo.
- `THYROX_*` (555 nombres: 505 config, 30 credential, 13 sensitive-config, 7
  secret-reference) → `KAUPAMEX_AI_*`, con el contrato canónico/legacy/iguales/
  distintos=FAIL CLOSED. Precedente en el ecosistema: `KAUPAMEX_ROOT`,
  `KAUPAMEX_DOCS_ROOT`, `KAUPAMEX_RESULTS_DIR` (prefijo por componente).
- `~/.thyrox` → candidato `~/.kaupamex/ai`: `configHome.ts` **ya** implementa
  propio→heredado como respaldo de lectura (lo dejó el renombre CLAUDE→THYROX).
- Labels `thyrox.*` / `io.thyrox.*`: lectura dual durante la transición.
- `/thyrox:*` del plugin.

### Can migrate by recreation

`thyrox-redis`; contenedores `thyrox-worker-*`, `thyrox-model-*`,
`thyrox-task-*`; imágenes `localhost/thyrox-*` (reconstruibles por definición +
commit); `.thyrox/runtime`, `.thyrox/pool-worktrees`; el socket del coordinador;
el scope `@thyrox/*` (62 paquetes, **todos** `private`, sin `publishConfig` ni
`bin`: es protocolo interno del workspace, no un contrato externo).

### Requires durable migration

- `thyrox-postgres-data` (+ `thyrox-postgres-password`): no se renombra ni se
  recrea sin prueba de preservación; db/rol `thyrox` es namespace físico y
  puede quedarse.
- `thyrox-ollama-models`: materialización reconstruible desde el artefacto
  permanente, pero cara; clasificar su lifecycle antes.
- `.thyrox/models/` (catálogo, `qualifications.json`, caché de artefactos).
- Nombres contractuales de modelo (resolver ambos prefijos, no reescribir).

### Provenance only

`source_ref`/`source_revision` históricos, los 1 010 334 de benches/jobs/
cachés, mensajes de commit, el repositorio publicado `docker.io/th3rox/
thyrox-quantization-lab-artifacts`.

### Ecosystem collision risks

| sitio | riesgo |
|---|---|
| `src/session/write-env.sh:71` — `THYROX_CLONE_PREFIX:-kaupamex-` | un clon `kaupamex-ai` se leería como consumidor `kaupamex-*` |
| `src/paths/reach.py:615`, `src/packages/paths/reach.ts:496` | el roster deriva hermanos por prefijo |
| `src/verify/thyrox-audit.sh:259` — `ls -d "$PARENT"/kaupamex-*` | contaría a kaupamex-ai entre los consumidores |
| `src/task/task_ids.py:134`, `layer_signals.tsv:7` | el modelo «los kaupamex-* son consumidores, thyrox el proveedor» deja de valer |
| `workerContainerLifecycle.ts:219` — `name=^thyrox-worker-` | el barrido de huérfanos decide pertenencia por nombre; renombrar a `kaupamex-*` lo volvería ajeno-inclusivo |
| `shared-state/redis.ts:46`, `redisCoordination.ts:111` — `keyPrefix ''` | ningún namespace de componente: chocaría con otro componente en el mismo Redis |

Ninguna regla nueva puede ser `startswith("kaupamex-")`: pertenencia = identidad
de componente (label/metadata) o un roster declarado.

### Search Existing de lo que se reutiliza

- **Esquema de labels: no hay una autoridad única.** Cuatro módulos en dos
  paquetes y dos prefijos (`io.thyrox.*` en image-registry/infra, `thyrox.*` en
  podman-execution/model-scheduling). EXTEND: un esquema en `podman-execution`
  (autoridad de la primitiva) que añada `component`, `product`,
  `identity-version`, `legacy-name`; los nombres candidatos
  `io.kaupamex.*` se fijan ahí y no antes.
- **Rename toolkit existente:** `renameEnvPrefix.ts`, `renameEnvNames.ts`,
  `renameProductInText.ts` (AST, sólo literales visibles), `check_key_rename_
  symmetry.py`, marca `thyrox-rename: keep`. Es el instrumento del cutover; un
  `s///g` global ya costó H-THYROX-171.
- **Hogares:** `configHome.ts` + `resolveDataDir` es la autoridad de rutas.

### Proposed migration DAG (no ejecutado)

```
0 AUDIT CURRENT STATE (esto)  — la auditoría funcional sigue antes del cutover
1 DECISIÓN: identidad canónica + contrato de compatibilidad
  (prefijo de ids futuros, scope npm, raíz .kaupamex/ai) — del ecosistema
2 metadata de componente: esquema único de labels (EXTEND podman-execution)
  + component=kaupamex-ai en store/corpus; GC/huérfanos por label, no por nombre
3 pertenencia sin prefijo: roster/reach/thyrox-audit/write-env por identidad
  declarada; keyPrefix de Redis derivado del componente
4 alias: CLI kaupamex-ai (+ thyrox medido), KAUPAMEX_AI_* con FAIL CLOSED,
  configHome .kaupamex/ai con .thyrox heredado — EXTEND rename toolkit
5 nombres de publicación nuevos (imágenes/artefactos permanentes) — antes de
  publicar nada nuevo
6 recursos de runtime recreables (redis, workers, units, imágenes locales)
7 durables con prueba de preservación (postgres-data, ollama-models,
  .thyrox/models)
8 paquetes @thyrox/* y rutas
9 cutover de owner/scope semántico
10 medir uso legacy → retirar alias
```

---

## Transformers / ML runtime capability audit — 2026-10-03

Directiva del ejecutor, añadida a la auditoría en curso. **Nada se construyó,
descargó ni instaló.** Evidencia: `ml/` (Search Existing, conteos del corpus,
`observe images|volumes` por la entrada canónica `podman-execution-execute`).
Se midió con la cualificación de flujo corriendo en CPU: sólo lecturas cortas.

Estados: IMPLEMENTED (código + pruebas) · INTEGRATED (cableado en una
autoridad viva) · REAL_VERIFIED (corrió de verdad, con evidencia) · CONSUMABLE
(un consumidor de producto puede usarlo hoy) · ACTIVE_NOW (corriendo/residente).

### Capability matrix — ML

| Capability | State | Authority | Code | Consumer | Qualification | Real proof | Consumable today | Active now | Identity impact | Blocking gap |
|---|---|---|---|---|---|---|---|---|---|---|
| TransformersRuntimeAdapter | IMPLEMENTED + INTEGRATED | `hostCoordinatorComposition.ts` (adapters por runtime) | `local-models/transformersRuntimeAdapter.ts` (+ API cliente) | HostCoordinator | — | ninguna (sólo dobles HTTP en tests) | no | no | `thyrox-transformers-runtime` | imagen inexistente; ningún modelo safetensors en catálogo |
| Transformers runtime image | DEFINED, NEVER BUILT | `hostCoordinatorComposition.ts:50` `TRANSFORMERS_RUNTIME_IMAGE`; **fuera** del catálogo de `image-registry` | `transformers-runtime/Containerfile` + `transformers_runtime_server.py` | unidades transformers | — | único build (`.claude/jobs/build-transformers-runtime-20261002T030337`) **EXIT=1** al commitear capa; `observe images`: ausente | no | no | candidata a identidad lógica `role=transformers-runtime` | no está declarada en el catálogo de imágenes: nada la reconstruye |
| safetensors runtime resolution | IMPLEMENTED + INTEGRATED | `RUNTIME_BY_FORMAT` en `hostCoordinatorComposition.ts:80` (gguf/ollama-registry→ollama, safetensors→transformers), usado por `cpuPlacementOf` | ídem | coordinator placement | — | sólo GGUF real | sí (para GGUF) | GGUF sí | — | la autoridad existe: **no crear otro selector** |
| embedding orchestration / admittedEmbed | IMPLEMENTED + INTEGRATED (sólo Ollama) | ticket de admisión (ADR-007 M8) | `local-models/admittedEmbed.ts` → `/api/embed` de la unidad Ollama | **sólo** `qualifyModel.runEmbeddingQualification` | — | ninguna: el único rastro (`method-matrix-probe`) es una matriz de códigos HTTP, no un vector | no | no | — | ningún consumidor de producto; el runtime transformers no tiene endpoint de embeddings |
| embedding model availability | ABSENT | catálogo `.thyrox/models/catalog.json` | — | — | — | catálogo = 1 modelo (qwen3-4b GGUF, `completion`) | no | no | nombres contractuales `thyrox-…` | ningún modelo con capacidad `embeddings` declarado |
| embedding qualification | IMPLEMENTED, NEVER RUN | `modelQualification.ts` (`kind: embedding`, `qualifiedEmbeddingModels`) | `embeddingSuite.ts`, `embeddingSuiteFromCorpus.ts`, `qualify --embedding-suite` | recomendador de embeddings | **0** cualificaciones `embedding` en el store | — | no | no | — | sin suite versionada en `suites/`; sin modelo |
| embedding production | NOT VERIFIED / NOT WIRED | — | no hay código que lleve vectores de `admittedEmbed` a `putEmbedding` | — | — | — | no | no | — | **pieza ausente**: ningún paquete depende de `@thyrox/semantic-search` |
| embedding spaces | IMPLEMENTED (persistencia), EMPTY | `semantic-search/spaces.ts` (create/activate, índice único de `active`) | `store.ts`, `vectorSql.ts` | — | — | tests postgres (disposable) | no | **ninguno**: no hay corpus | — | `embedding_spaces` no guarda runtime/revisión/normalización (0904) |
| semantic_search_worker | DECLARATION/PROFILE ONLY | `daemon/podman/specializedWorkerProfile.ts` | mecanismo de build y límites | **ninguno** fuera de su test | — | — | no | no | nombre de perfil | su cabecera excluye modelo y dimensiones «hasta D5» |
| SentenceTransformer embeddings | ABSENT | — | 0 hits en `src`; sólo `_archived/requirements.txt` | — | — | — | no | no | — | — |
| CrossEncoder reranking | ABSENT | (frontera: el rerank por modelo es del worker) | 0 hits | — | — | — | no | no | — | — |
| database rerank (cosine exacto) | IMPLEMENTED | `semantic-search/rerank.ts` («el reranking por modelo no es del store») | `rerank.ts` + tests | `analysisRuns` | — | tests | sí, sin vectores no hay qué ordenar | no | — | frontera respetada |
| translation via Transformers | IMPLEMENTED (código), NOT REAL_VERIFIED | `admittedSeq2seq.ts` + `/v1/seq2seq` (`AutoModelForSeq2SeqLM`, MADLAD-400/T5) | servidor + adapter + tests | ninguno de producto | ninguna suite de traducción | ninguna (imagen nunca construida, sin modelo) | no | no | — | imagen, modelo MADLAD, suite, consumidor; la ruta viva de traducción es Qwen/Ollama (tarea) |
| Rust candle seq2seq | EXPERIMENTAL | bench `candle-seq2seq-runtime-20261002T070810` | `probes/candle-worker` | — | — | bench | no | no | — | no es producto |
| ExecutionOutcomeClassifier | INTERFACE ONLY | `task_continuation.learned_classifier_from_environment` | orden externa `THYROX_OUTCOME_CLASSIFIER_COMMAND` (vacía en `.env.example`); sólo casos ambiguos, nunca sobre una regla | `task_continuation` | — | — (sin modelo, sin implementación de inferencia) | no | no | variable `THYROX_*` | sin modelo/tokenizer/runtime: DESIGNED_ONLY detrás de una interfaz real |
| reward/value model | ABSENT | — | los 4 hits de «value model» son ajenos (schema, alias de proveedor, protocolo del coordinador) | — | — | — | no | no | — | — |
| ML runtime dependency stack | IMAGE-SCOPED | `transformers-runtime/Containerfile` y `model-artifacts/quantizer-image/Containerfile` | torch 2.11.0 CPU, transformers 4.57.6, tokenizers 0.22.2, safetensors 0.8.0, sentencepiece, numpy 2.2.6, huggingface_hub (HF_HUB_OFFLINE=1) | sólo dentro de esas imágenes | — | quantizer sí corrió; transformers-runtime no | — | — | imágenes `thyrox-*` | `pyproject.toml`/`uv.lock` no traen ninguna dependencia de ML: el anfitrión no las tiene, y está bien |

### Embedding decompuesto (la contradicción resuelta)

«SemanticSearchStore implementado / productor ausente» y «admittedEmbed es la
ruta local» son ciertas a la vez, porque miden piezas distintas:

| pieza | estado |
|---|---|
| Embedding API (persistencia: spaces, `putEmbedding`, activación) | IMPLEMENTED |
| Embedding orchestration (`admittedEmbed` con ticket) | IMPLEMENTED + INTEGRATED, sólo contra Ollama |
| Embedding runtime | Ollama `/api/embed`: disponible; Transformers: sin endpoint |
| Embedding model | ABSENT (catálogo sin modelo de embeddings; nomic-embed-text v1.5 sólo en tests/comentarios/benches) |
| Embedding qualification | IMPLEMENTED, nunca ejecutada (0 registros) |
| Embedding execution | NOT VERIFIED (ningún vector real en la evidencia) |
| Embedding persistence | IMPLEMENTED; corpus actual **vacío** |
| Embedding-space activation | IMPLEMENTED; ninguna activa |
| Embedding consumer (orquestación → store) | **ABSENT**: nada conecta `admittedEmbed` con `semantic-search` |

RAG sigue siendo otra capability: sin retrieval real no hay contexto que montar.

### Model inventory (estado ACTUAL)

| modelo | formato | runtime | instalado | cualificado | residente | consumidor |
|---|---|---|---|---|---|---|
| qwen3-4b `thyrox-qwen--qwen3-4b-gguf:q4_k_m-hf-bc640142c66e` (`7485fe6f…`) | GGUF | Ollama | sí | protocolo 6/6 y mecanica 4/4 a 8K con perfil; flujo suspendido | sí | pool / worker |
| nomic-embed-text v1.5 | — | — | **no** (no está en catálogo ni en el volumen de Ollama) | no | no | — |
| MADLAD-400 / T5 | — | — | no | no | no | — |

### TASK-THYROX-0904 (embeddings por proveedor cualificado) — sigue `pending`

| subcapacidad | decisión |
|---|---|
| `embedding@1` qualification | REUSE (suite, loader, `kind: embedding`, `qualifiedEmbeddingModels`); falta la suite versionada |
| perfil de embedding por `embedding_space` | EXTEND `embedding_spaces` (hoy: model, dimensions, representation, state) |
| routing local-only / api-only / local-preferred / api-preferred | MISSING (0 hits) — y debe REUSAR la política de ejecución, no crear selector |
| comparación ONNX / Ollama / API | MISSING (sin onnxruntime en ninguna imagen) |

### Corpus real (medido hoy, sólo lectura)

`thyrox` en `thyrox-postgres`: **ningún esquema con `documents`**; la única tabla
es `public.thyrox_p0_sentinel`; pgvector 0.8.0 instalado.
documents = versions = chunks = embedding_spaces = embeddings = analysis_runs = **0**.
Histórico: 1675 / 9981 / 0 espacios el 2026-10-02
(`postgres-corpus-disk-reclaim-20261002T023317/outputs/T003-snapshot-after.json`).

**Por qué desapareció (medido):** `stat` del clúster: `PG_VERSION` nacido
2026-10-03 10:04:32; `observe volumes`: `thyrox-postgres-data` creado
10:04:25; y `local-control-plane-ready-full-20261003T100423` registró
`thyrox-postgres action=created … volumes=thyrox-postgres-data:created`. El
volumen durable ya no existía y la reconciliación **creó uno vacío sin avisar**.
Mi convergencia de las 21:13 (0928) dice `preserved` de un volumen ya vacío:
«preserved» mide el enganche, no el contenido (H-THYROX-464).

### Caches y disco ML

`~/.cache/huggingface`, `~/.cache/torch`, `~/.cache/transformers`: ausentes. ONNX:
ninguno. Snapshots safetensors en la caché de artefactos: ninguno
(`.thyrox/models/artifacts` = 2.4 G, sólo el GGUF `7485fe6f…`, CACHE con copia
canónica en `docker.io/th3rox/…@sha256:6775c008…`). Imagen transformers: ausente,
0 bytes. Nada de esto es la única copia de un artefacto.

### Runtime image ≠ model artifact

Se respeta: la imagen corre `HF_HUB_OFFLINE=1`, no trae pesos y monta el
snapshot concedido de sólo lectura en `/model`; la identidad del modelo sale del
grant (artefacto), no de la imagen. Coincide con la frontera que ya midió
TASK-THYROX-0917 (`identity-migration-analysis-20261003T072106`): carril A
`image-registry`, carril B `artifact-registry`/`model-artifacts`.

### Prior work que esta auditoría de identidad no citó (corrección)

`identity-migration-analysis-20261003T072106` (TASK-THYROX-0917) ya hizo un
censo de identidad y un plan OCI de primera publicación, con `observe` canónico.
Mi inventario de esta tarde no lo encontró por buscar en `src/` y no en los
benches: es Search Existing incompleto sobre la propia auditoría. Ambos se
leen juntos; el plan de fases debe partir de los dos.

---

## F6 — repo-code-change@1 sobre qwen3-4b (resultado real, 2026-10-03)

| corrida | contexto · presupuesto · plazo | veredicto | causa |
|---|---|---|---|
| `workflow-qualify-8k` | 8192 · sin tope · 600 s | no registrada → corregido | primer turno de **26 085** tokens (`exceed_context_size_error`); la suspensión no se escribía (H-THYROX-460) |
| `workflow-qualify-8k-b2048` | 8192 · 2048 · 600 s (por defecto del pool) | suspendida 0/1, 0 tok/s | el pool mató el caso a los 600 s antes del primer evento → `timeoutSeconds` en la suite |
| `workflow-qualify-8k-b2048-t5400` | 8192 · 2048 · 5400 s | **suspendida 0/1** (`rechazado`), 1.0 tok/s de pared | **MODEL_CAPACITY** (abajo) |

La infraestructura funcionó de punta a punta en la tercera: ruta local
(`served-by … "local":true`), unidad gestionada, worktree aislado, verify,
cualificación `workflow` escrita con su perfil. 12 turnos, 803 s, 819 tokens
generados.

Lo que hizo el modelo (de `1.stream.jsonl`):

1. corrió la prueba (bien);
2. `Edit` reemplazó sólo la línea `raise …` por un `def title_slug` anidado con
   `import re` y su propia normalización — duplica `slugify`, que el verify
   prohíbe;
3. escribió la regex `[^\u0000-\u007f]` sin escapar para JSON: el decodificador
   la volvió un NUL literal y `slug.py` quedó binario (`source code string
   cannot contain null bytes`); `Edit` escribió fielmente lo recibido;
4. editó el archivo de pruebas (la plantilla lo prohíbe);
5. repitió un `Edit` sin cambio (old == new) tres veces y la misma prueba cinco:
   el bucle exacto que el vigilante detiene (aquí su proceso se había retirado
   a mano, H-THYROX-467);
6. su última llamada salió como TEXTO (protocolo de herramientas roto).

Conclusión: qwen3-4b a 8K pasa protocolo (6/6) y mecanica de un turno (4/4),
pero **no** cualifica para cambiar un repositorio. Según F8, el siguiente paso
es evaluar un coder mayor por el mismo pipeline; F14 lo condiciona a disco,
perfil, admisión y cualificación: los cuatro existen salvo la admisión por CPU
(TASK-THYROX-0932, #19), que un 7B en CPU necesita.

### F8 — coder mayor por el mismo pipeline (2026-10-03)

| modelo | resultado | causa |
|---|---|---|
| Qwen2.5-Coder-7B-Instruct Q4_K_M (`13fb94bf…`, sha `509287f7…`) | **protocolo suspendido 2/6** a 8K, 2.4 tok/s | escribe las llamadas como TEXTO (`<tools>`, JSON cercado, `<response>`), no por el formato de herramientas: no elegible |

Techo físico medido para un candidato local: disco 8.7 GB de asignación fija
(copias: caché + blob de la unidad), RAM efectiva ≈ 6 GB tras el piso (cgroup
ancestro 8.33 GB que cuenta la caché de páginas). Qwen3-8B Q4 a 8K
(≈5 GB + 1.2 GB de KV) no cabe en RAM. Siguiente candidato dentro del techo:
Qwen2.5-7B-Instruct Q4_K_M (`bb5d59e0…`, la revisión que ya nombran los fixtures
del árbol). Coder-7B retirado con prueba (`disk/proof-before-delete-coder7b.txt`):
su blob vivía en el volumen anónimo de su unidad y se fue con ella.

### F6/F8 — resultado: HARD_BLOCK de capacidad local dentro del techo físico (2026-10-03)

| modelo (Q4_K_M, 8K, presupuesto de sistema 2048) | tool-calling@1 | mecanica | repo-code-change@1 |
|---|---|---|---|
| qwen3-4b | 6/6 | 4/4 | 0/1 `rechazado`: def anidado que duplica `slugify`, NUL sin escapar, edita las pruebas, bucle |
| Qwen2.5-Coder-7B | **2/6** (llamadas como texto) | — | no elegible |
| Qwen2.5-7B-Instruct, muestra 1 | 6/6 | 4/4 | 0/1 `sin-cambios`: ruta mal leída, se rinde en 4 turnos |
| Qwen2.5-7B-Instruct, muestra 2 | — | — | 0/1 `rechazado`: `old_string` escapado como regex (no casa), deja un error de sintaxis, nunca corre las pruebas, última llamada como texto |

La infraestructura funcionó de punta a punta en todas: ruta local, unidad
gestionada, worktree aislado, verify, registro con perfil. Los fallos son del
modelo.

**Techo físico medido de este contenedor:** disco 8.7 GB de asignación fija
(el modelo ocupa dos copias), RAM efectiva ≈ 6 GB (cgroup ancestro 8.33 GB
menos piso 2 GiB), 4 CPU sin GPU. Cabe hasta ~7B Q4 a 8K; Qwen3-8B a 8K ya no
cabe en RAM.

**Conclusión:** ningún modelo que cabe en este contenedor completa un cambio de
repositorio con el prompt limpio que pide F8 (n=4 corridas reales). La
autoimplementación local real queda bloqueada por un límite físico, no por
código. Lo que desbloquea es una decisión del ejecutor:

1. **Andamiaje del prompt** (como la corrida 0919 de las 12:05, pasos guiados):
   contradice «prompt limpio» de F8; mediría capacidad guiada, no autónoma.
2. **Más hardware** (RAM ≥ 16 GB efectiva o GPU) para un modelo ≥ 14B: fuera
   de esta sesión.
3. **Proveedor por API** como respaldo declarado: la política lo admite sólo
   con clave; las claves PAYG/Token Plan existen sólo en una sesión nueva
   (TASK #13) y las cuatro rutas probadas daban 401.

Hasta esa decisión, `controller.implementation` sigue en `bootstrap-exception`
(F11 no se cumple: no hay worker local cualificado para `workflow`).
