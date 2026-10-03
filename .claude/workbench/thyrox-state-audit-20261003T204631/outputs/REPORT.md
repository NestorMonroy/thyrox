# Fotografía verificable del estado de Thyrox — 2026-10-03T20:46Z

Auditoría sin implementación. Cada fila cita su evidencia en `outputs/NN-*.txt` de este
banco. Escala: ABSENT < DESIGNED_ONLY < PARTIAL < IMPLEMENTED < INTEGRATED < REAL_VERIFIED
< ACTIVE_NOW. Estado capturado sobre `ff1d8feaa` (local = remoto). **Desviaciones de la
regla «sólo observar»: `00-deviations.md`** — dos guiones sin `--help` ejecutaron sus
acciones; uno refrescó los locks de Podman.

**Contexto que condiciona todo lo «activo»:** la máquina arrancó a las 20:46:04Z (pid 1 =
`process_api`, Firecracker). No hay ningún proceso de runtime de Thyrox vivo: ni
coordinador de modelos, ni Ollama, ni PostgreSQL, ni Redis. Por eso casi nada está
`ACTIVE_NOW`, y eso es una observación, no un juicio sobre el código.

## A. Executive state

| Capability | State | Code | Integrated | Real proof | Active now | Blocking gap |
|---|---|---|---|---|---|---|
| Search Existing | **DESIGNED_ONLY** | ninguno: no existe `src/verify/search_existing_mechanisms.py`, ni `mechanisms.tsv`, ni `bin/search_existing_mechanisms` (10) | no; el worker la recibe SÓLO por prompt (`task-thyrox-0919…/prompt.md`, «Turn 1») | no | no | regla en prosa (`search-existing-antes-de-construir.md`: «El gate todavía no existe»), contrato RED `tests/verify/test_search_existing_mechanisms.py`, matrices manuales en bancos |
| mathematical-reasoning | **ABSENT** (plan: DESIGNED_ONLY) | `ModelCapability = completion\|tools\|embeddings` (`catalogEntry.ts:25`); `TASK_KINDS` sin matemáticas (`policy.ts:163`) | no | no | no | plan TASK-THYROX-0911 (`math-specialist-search-existing-20261003T020646`), eje de capacidad bloqueado por `RouteRequirement` (0 apariciones en código) |
| specialist routing | **ABSENT** | sólo `taskClass` → modelo más rápido (`recommendExecution`); `providerSelection.ts` genérico sin consumidor | no | no | no | TASK-THYROX-0750/0925 |
| Redis shared state | **IMPLEMENTED** (adapter REAL_VERIFIED contra `redis-server` del toolchain) | `@thyrox/shared-state` (port, memory, redis, factory, consistency) (12) | consumidores en código (proxy, scheduler, runLease), pero el backend por defecto es memoria: sin `THYROX_REDIS_URL` en el entorno del proceso; `.env` la declara y el proxy lee `process.env` | no contra `thyrox-redis` gestionado | no (`created`, pid 0) | production wiring sigue pendiente (C3, TASK-THYROX-0496); sólo `runLease` exige Redis |
| PodmanExecutionPrimitive | **INTEGRATED / REAL_VERIFIED** | `@thyrox/podman-execution`; gates 0 violaciones en 4192 archivos, 4+1 pendientes con tarea (13) | sí: infraestructura, unidades de modelo, ítems del pool | sí (contención, SIGTERM real `runner_sigterm.sh`, builds declarados) | observación sí (`observe`); no corre nada | observación sin logs/stats/health/exec; gate ciego a `"$podman" inspect` (`src/lib/podman_locks.sh:80`) |
| managed infrastructure | **REAL_VERIFIED, no activa** | `@thyrox/infrastructure`, `src/lib/infrastructure.sh`, `infrastructure_ensure` | sí | sí (creados por `infrastructure-bootstrap`, etiquetas de dueño) | no: 3 contenedores `created` tras el reciclado | arranque tras reciclado no automático |
| PostgreSQL | **REAL_VERIFIED, no activa** | declarado (pgvector 0.8.0-pg16, volumen `thyrox-postgres-data` 47 MB con datos) | sí | sí (volumen con datos) | no (`created`) | — |
| pgvector | **IMPLEMENTED/declared** | provisión `CREATE EXTENSION vector` (`infrastructure.sh:227`); toolchain local con versión fijada | sí en declaración | pruebas del store contra PG del toolchain | no observable (PG parado) | — |
| SemanticSearchStore | **IMPLEMENTED** (REAL_VERIFIED contra PG de prueba) | `semantic-search/store.ts` (migrate, ingest, spaces, `searchNearest`), 7 suites `*.postgres.test.ts` (16) | **no**: 0 consumidores fuera del paquete salvo `bin/semantic-search-ingest` | ingesta de hallazgos probada en PG de prueba | no | ningún productor de embeddings; ningún consumidor de búsqueda |
| RAG | **ABSENT** | no hay ruta worker → recuperación → ensamblado de contexto → modelo (16) | no | no | no | — |
| dataset ingestion | **PARTIAL** | `findingIngestion.ts` + `bin/semantic-search-ingest` (sólo hallazgos RST) | no | sólo PG de prueba | no | inventario R3 es una estimación de árboles en disco, no un corpus ingerido |
| ModelCatalog | **REAL_VERIFIED** | `modelCatalog.ts`, `withRederived` | sí (coordinador) | sí (A6, eviction real) | archivo presente; coordinador parado | la entrada declara capacidades `["completion"]`, sin `tools` (14) |
| ResourceAdmission RAM | **REAL_VERIFIED** | `resource_admission.py headroom-ram`, piso 2048 MB, `makeRoom` | sí | sí (eviction real, `residency-eviction-on-admission-…`) | medición sí (11 560 144 kB) | `makeRoom` admite si falta el medidor o `memoryBytes` (cerrado sólo por composición) (15) |
| ResourceAdmission disk | **REAL_VERIFIED** | `DEFAULT_DISK_FLOOR_MB = 2048`; `disk-headroom` | sí | sí (rechazo real de un build, `cc237e78f`) | medición sí: 4039 MiB libres | 213.7 GiB reservados inalcanzables (`resv_strict`) |
| VRAM admission | **IMPLEMENTED** (nivel 1, fake) | `gpu_monitor`, `resource_admission` | sí en pools | no (sin GPU; niveles 2 y 3 rehúsan) | no aplica: hardware-inventory `none` | — |
| CPU admission | **ABSENT** | ningún medidor ni reserva; `UNIT_LIMITS cpus: 2` fijo; sin hilos declarados (15) | — | — | — | — |
| Residency eviction | **REAL_VERIFIED** | `residencyController.makeRoom/evict` | sí | sí (run 3 dejó una sola `ctx32768`) | no (coordinador parado) | — |
| Ollama runtime | **REAL_VERIFIED, no activo** | unidades por coordinador, `LLAMA_ARG_CACHE_RAM=0` (`hostCoordinatorComposition.ts:63`) | sí | sí («prompt cache is disabled» en log real) | no | perfil de caché no viaja a la cualificación |
| model qualification | **PARTIAL** | registro con suite, contexto, tok/s, `reasoningEffort?` | sí (recomendador) | sí, pero perfil viejo | — | las 3 cualificaciones de qwen3-4b no llevan `reasoningEffort` → no elegible con el perfil del worker; no registran caché, CPU, tools, system budget |
| execution policy | **INTEGRATED** | `executionPolicy.ts`, `policy.ts`, preflight Python | sí (recommend, pool, preflight) | unidades/CLI con dobles | — | dos autoridades de selección (ésta y `providerSelection`, H-THYROX-453) |
| local fallback | **PARTIAL** (IMPLEMENTED con dobles) | selección: cadena derivada (0923); ejecución: relé avanza (0921) | sí de punta a punta | no (sólo dobles) | — | un solo modelo instalado: la cadena real está vacía |
| remote fallback | **IMPLEMENTED, cerrado por defecto** | `claude-cli` sólo si se declara en `chain` | sí | no | — | ruta `own` de `thyrox -p` va al proveedor por CREDENCIAL, no por localidad del modelo (ver §14) |
| self-implementation | **ABSENT como resultado** | ruta pool → unidad → `thyrox -p` → proxy → relé → modelo existe | sí (A6 r9) | A6 demostró ROUTING; ninguna tarea real pasó | no | ver §15/§16 |
| process/job monitoring | **PARTIAL** | `thyrox-bg`, `wait-jobs` (+probe), `stdin_probe`, `process_ownership`, `reconcile-orphans` (19) | sí | sí (reconcile real) | 2 trabajos sin recoger (A6 r3/r4, `__BG_EXIT__=1`) | sin estados `sleeping`; `zombie`/`stuck` apenas nombrados (2 y 1 archivos) |

## B. Runtime inventory (observado)

- **Máquina** (03): Firecracker, kernel 6.18.44-fc-v64, 4 vCPU Xeon 2.1 GHz, 16 480 972 kB RAM,
  sin swap, `MemAvailable` 15 840 544 kB; holgura de admisión 11 560 144 kB con piso 2048 MB;
  cgroup v1 (memory `/process_api/…/claude-code-bash`), sin `cpu.max`/`memory.max`; disco 252 GiB
  con 4039 MiB disponibles y 213.66 GiB reservados `resv_strict`; GPU `none` (8 señales ausentes).
- **Podman** (02): 4.9.3, sqlite, graphroot `/var/lib/containers/storage`. Antes del refresco:
  locks 0/13 `KNOWN_POST_REBOOT_RECOVERABLE`, 4 contenedores `running` con pids inexistentes.
  Después: `HEALTHY` 13/13, los 4 `created`.
- **Contenedores** (02-containers.tsv): `thyrox-ollama` (ollama 0.35.0, dueño infrastructure-bootstrap,
  volumen `thyrox-ollama-models` 2.4 G), `thyrox-postgres` (pgvector 0.8.0-pg16, `thyrox-postgres-data`
  47 M), `thyrox-redis` (redis 7.4, `--save '' --appendonly no`, volumen ANÓNIMO), y un sobrante
  `thyrox-worker-unit-8d5fdd55…` (dueño `model-coordinator`, 19:12Z). Ninguno corre.
- **Volúmenes**: 2 con nombre y etiquetas de dueño; 7 anónimos sin etiquetas (4 KB cada uno).
- **Imágenes** (02-images.tsv): `thyrox-model-quantizer:candidate-2027edfaf1a2` (1220 MiB, permanent,
  0912), ollama 0.35.0 (5258), pgvector (426), redis (110), ubuntu (76), una `permanent` de 0724 sin tag
  (368), y **14 sin tag ni etiquetas** (6×1220, 2×2820, varias 126–160 MiB): intermedios de build.
- **Modelos** (14): un declarado = instalado = cualificado-con-perfil-viejo = **cero residentes**:
  `thyrox-qwen--qwen3-4b-gguf:q4_k_m-hf-bc640142c66e` (Qwen/Qwen3-4B-GGUF @bc640142…, sha256 7485fe6f…,
  gguf q4_k_m, 2 497 280 256 B, qwen3, contexto máx. 40 960, KV f16, attention 36/8/**128**,
  capacidades `completion`). Cualificaciones: `tool-calling@1` 6/6 @32768 4.43 tok/s; `mecanica` 4/4
  @8192 3.87 y @32768 3.05 tok/s; todas `contended`, sin `reasoningEffort`.
- **Memoria estimada hoy** (14-memory-by-context.tsv): 8k 3790 MiB · 16k 4942 · 24k 6094 · 32k 7246 ·
  40k 8398 (> límite de unidad 8192 MiB). Coherente con la medición real del banco de eviction (la
  holgura cayó ~6.2 GB al admitir 24k).
- **Disco** (20): overlay de Podman 13 G; el mismo GGUF tres veces (~7.5 G): artefacto
  `.thyrox/models/artifacts`, copia `.thyrox/runtime` (2 enlaces), volumen de Ollama. `.claude/workbench`
  989 M, `.git` 706 M, `_references` 970 M.
- **Trabajos**: A6 r3/r4 sin recoger (salieron 1). Worktree retenido de un ítem del pool
  (`.thyrox/pool-worktrees/276193a40e30/1`) con un `search_existing_mechanisms.py` sin versionar
  escrito por el worker local.
- **Credenciales en esta sesión** (17): ninguna de las cuatro de Anthropic; `ANTHROPIC_BASE_URL`
  presente; claves de Qwen Cloud nuevas AUSENTES (la sesión fijó su entorno antes).

## C. Lo genuinamente terminado (con prueba real)

PodmanExecutionPrimitive como frontera de materialización; infraestructura gestionada (creación,
etiquetas de dueño, volúmenes con nombre para Ollama y PostgreSQL); ResourceAdmission de RAM y de
disco; eviction de residencias ociosas; ModelCatalog con atención corregida (`headDimension 128`);
`LLAMA_ARG_CACHE_RAM=0` en toda unidad de Ollama; la ruta de A6 (pool → unidad → `thyrox -p` →
proxy → relé admitido → unidad de modelo) como ROUTING; transporte de contenido largo por `Write`
(write-route, 60 líneas íntegras); manejo de SIGTERM del runner; `bin/binary` como instrumento.

## D. Parcialmente implementado

| Mecanismo | Existe | Falta | Autoridad candidata | Pruebas faltantes |
|---|---|---|---|---|
| Redis compartido | adapters, consumidores, pruebas con redis real | backend redis en producción; volumen con nombre si se quiere persistir | `@thyrox/shared-state/factory.ts` | proxy y scheduler contra `thyrox-redis` gestionado |
| Cualificación | registro, runner, 2 suites | perfil completo (caché, CPU, tools, system budget), recualificar con `reasoningEffort none`, suite de cambio de código en repo | `modelQualification.ts`, `local-models/suites/` | — |
| Fallback local | cadena derivada + relé | segundo modelo cualificado; prueba real | `policy.ts`, `admittedUpstream.ts` | salto real contra el coordinador |
| Selección | `recommendExecution` (vía usada) y `providerSelection` (sin consumidor) | una sola autoridad | TASK-THYROX-0750/0925 | — |
| Semantic search | store y búsqueda | embeddings, consumidor en el worker | `semantic-search/store.ts` | ruta worker → recuperación |
| Observación de Podman | 8 observaciones | logs, stats, health, exec gestionados | `podman-execution` `observe` | — |
| Monitoreo de procesos | ledger, probe, reconcile | clasificación sleeping/stuck/zombie unificada | `wait-jobs`, `process_ownership` | — |

## E. Lo que no existe

- **Search Existing** como capacidad: ni script, ni registro, ni gate, ni fase durable del worker,
  ni almacenamiento del resultado. Lo que existe es una regla, un contrato RED y práctica manual.
  El worker local sólo recibe la instrucción por prompt.
- **mathematical-reasoning**: ni capacidad, ni suite, ni modelo declarado, ni routing.
- **Specialist/capability routing**, **RAG**, **CPU admission**, **RouteRequirement**,
  **embeddings producidos**, **autoimplementación demostrada**.

## F. Bloqueos actuales (por dependencia)

1. **Runtime parado tras el reciclado** — sin coordinador ni Ollama no corre ningún modelo local.
2. **qwen3-4b no elegible**: sus cualificaciones no llevan `reasoningEffort none` (bloqueo de
   18f2fa10e); el recomendador bloquea `unqualified_profile`.
3. **Disco**: 4 GiB libres; el GGUF triplicado y 14 imágenes sin tag ocupan la mayor parte de lo
   recuperable. Una segunda imagen o modelo no cabe.
4. **Search Existing no existe** como mecanismo, y es justo lo que TASK-0919 pide construir; el
   worker no tiene ninguna otra fuente de «buscar primero» que su prompt.
5. **Cualificación sin perfil completo** ni suite que mida modificar el repo: `mecanica` sustituye
   implícitamente a navegación, búsqueda, bucle de herramientas y corrección, que no prueba.
6. **TASK-0919 nunca se ejecutó tras las correcciones** (cache, razonamiento, transporte `Write`):
   la capacidad del modelo sobre la tarea real está sin medir.
7. **Dos autoridades de selección** (H-THYROX-453).

## G. Mecanismos existentes a reutilizar

`providerSelection.ts` + `apiModelCatalog` (selección genérica, catálogo de Model Studio);
`ModelQualification` + `bin/local-models-qualify` + `qualifyModel.ts`; `externalArtifact.ts` (import de
GGUF publicados, sin cuantizar); `cutover_bootstrap.sh` (criterios de cualificación de un modelo por
API: secreto, autenticación, contexto, tool call, lectura, modificación controlada, parseable,
cero Claude); `@thyrox/shared-state`; `semantic-search/store.ts`; `bin/binary`; `wait-jobs probe`;
`reconcile-orphans`; `infrastructure_ensure`; `disk-headroom`/`resource_admission`;
`delegate.sh` (vigilancia de inactividad, libro de corte por ejecución).

## H. Implementaciones de referencia disponibles

`_references/claude-code-bin/` 9 builds (2.1.266–2.1.286, 929 M) analizables con `bin/binary`
(info, extract, graph, freshness, reflow, symbol, references, declarations, literal; 10 suites);
`podman-docs` (3.6 M), `litellm`, `cliproxyapi`, `claude-code`, `restored-src`, `harness-*`,
`how-claude-code-works`, `ccb`, más 55 documentos propios. **Sin referencias de Redis.** El uso de
`bin/binary` es manual (citas en comentarios de 8+ archivos); no hay flujo sistemático
duda → referencia → análisis → REUSE/PORT/EXTEND. **Ningún repositorio `kaupamex-*` en este
disco**: Search Existing entre consumidores es imposible aquí.

## §14. Execution policy y fallback (detalle)

- `fallback.enabled: true`, sin `chain` (f87e631de): cadena DERIVADA de locales permitidos y medidos;
  proveedor sólo declarado. `allowed`: dos selectores de qwen3-4b (ollama y hf).
- Motivos tipados en selección (`FallbackTrigger`, 0920); eventos `model_fallback` en ejecución (0921).
- **selection-time**: implementado (0920/0923), probado con dobles. **runtime** (relé, antes de
  entregar el cuerpo): implementado (0921), probado con dobles, sin salto real. **Después de
  empezar a entregar** el cuerpo: no hay salto. **Compatibilidad Claude Code** (`withRetry`,
  `query.ts`, `--fallback-model`): portado, no conectado a la ruta local.
- TASK-THYROX-0920 CLOSED/PASS · 0921 CLOSED/PASS (dobles) · 0923 CLOSED/PASS · 0925 OPEN ·
  0926 BLOCKED (claves inválidas en esta sesión) · 0927 CLOSED/PASS.
- **Ruta hacia un proveedor remoto en una tarea «local»**: `decidePrintRoute` elige `own` cuando el
  entorno trae credencial, sin mirar si el modelo es local (`printDelegation.ts:71`). Con
  `--execution host` y la fuente por defecto `inherit`, el ítem hereda el entorno: con una
  credencial (o `ANTHROPIC_BASE_URL` apuntando a un remoto) la petición sale del anfitrión. Con
  `--execution unit` no llega ninguna credencial. Para autoimplementación local, sólo la unidad es
  segura hoy, y nada obliga a usarla.

## §15. bootstrap-exception → managed-only

`controller.implementation: "bootstrap-exception"`, `subagents: false`, `unmanagedPayloads: false`.
De los 11 requisitos de la autoimplementación demostrada, la evidencia cubre 1–4 (A6 r9: modelo
local elegido, coordinador/grant, unidad gestionada, worktree en 0919) y ninguno de 5–11: no existe
una ejecución con búsqueda ejecutada como mecanismo, código modificado que pase el verifier,
integración y cero intervención remota. **No ha ocurrido.**

## §16. TASK-THYROX-0919 (r1–r6)

| run | duración | resultado | causa principal | clase |
|---|---|---|---|---|
| r1 | — | create falló (imagen por defecto) | Bun carga `.env` del cwd | infraestructura |
| r2 | 5441 s, exit 124 | timeout | razonamiento por defecto, <1 tok/s | runtime/perfil |
| r3 | 2088 s, 18 turnos | rechazado | heredoc encadenado sin cuerpo (forma del prompt) + OOM por caché | transporte/prompt + caché |
| r4 | 4229 s, 9 turnos | sin cambios | repitió la búsqueda 6 veces, `\|` inválido, no imprimió el bloque | **modelo** (con prompt v2) |
| r5 | 1962 s, 15 turnos | rechazado | heredoc largo sin cuerpo en contexto real | transporte (corregido después con `Write`) |
| r6 | — | cancelado | concurrencia con la sonda write-route | operación |

Atribuible al modelo tras las correcciones: **nada medido todavía** — no hubo ejecución con `Write`,
prompt limpio y perfil recualificado. Lo único atribuible con la infraestructura de entonces es r4
(bucle y regex inválida) y la parte de r5 en que repitió la búsqueda.

## I. Grafo de dependencias recomendado (derivado de lo medido)

```
arranque del runtime tras reciclado (infra + coordinador)  ─┐
recuperar disco (GGUF triplicado, imágenes sin tag)        ─┤
                                                            ├→ recualificar qwen3-4b con perfil worker (reasoning none, caché off)
cualificación con perfil completo + suite repo-code-change ─┘        │
                                                                     ├→ TASK-0919 re-ejecutada (Write, prompt limpio, --execution unit)
forzar ruta local para trabajo de autoimplementación ──────────────┘        │
(la credencial no puede desviar un modelo local)                             ├→ Search Existing como mecanismo (registro + gate + fase)
                                                                             │     (resultado de 0919 o implementación propia)
una sola autoridad de selección (0750/0925) ─────────────────────────────────┤
capacidad/RouteRequirement → mathematical-reasoning → especialistas ─────────┤
embeddings + consumidor del store → RAG en el worker ────────────────────────┤
                                                                             └→ aceptación real local (11 requisitos) → managed-only
```

El orden del ejemplo del encargo se corrige en un punto: Search Existing no puede ir primero
como «autoridad» porque su primera implementación ES la tarea de aceptación (0919); lo que la
precede es el runtime utilizable y la cualificación con el perfil real.

*Métrica:* estado por capacidad con evidencia citada. *Ciega a:* todo lo que exige el runtime
arrancado (no se arrancó: regla de no recrear infraestructura) y a proveedores remotos (claves
inválidas o ausentes en esta sesión).

## J. Tasks y findings (creados después del informe; NINGUNO ejecutado)

Findings: H-THYROX-454 (Podman fantasma tras reciclado; `--help` que ejecuta), 455 (ruta por
credencial), 456 (`makeRoom` abierto por tipo), 457 (GGUF triplicado, 14 imágenes sin tag), 458
(cualificación sin perfil; `mecanica` como sustituto), 459 (gate ciego a `"$podman"`).

| Tarea | Bloquea autoimplementación | Depende de | Reutiliza | Aceptación |
|---|---|---|---|---|
| TASK-THYROX-0928 arrancar el runtime tras reciclado | **sí** | — | infrastructure_ensure, local_control_plane_ready, model_coordinator, reconcile-orphans | una orden declarada converge y reporta salud; `--help` no actúa |
| TASK-THYROX-0929 recuperar disco | **sí** | — | disk-headroom, labels de ciclo de vida, remove-image | una copia por digest; imágenes sin tag clasificadas y retiradas por la primitiva |
| TASK-THYROX-0930 ruta local sin desvío por credencial | **sí** (evidencia) | — | decidePrintRoute, contrato de credential-source, `--execution unit` | un `thyrox-*` nunca toma `own` |
| TASK-THYROX-0931 cualificación con perfil completo y suite de repo | **sí** | 0928, 0929 | ModelQualification, local-models-qualify, criterios de cutover_bootstrap.sh | registro con razonamiento, caché, CPU, tools, budget; suite multi-turno que lee, edita y prueba |
| (existente #5) recualificar qwen3-4b | **sí** | 0931 | — | cualificación con `reasoningEffort none` registrada |
| (existente TASK-THYROX-0919) re-ejecutar con `Write`, prompt limpio, unidad | **sí** | #5, 0930 | pool worktree + verify | verifier PASS e integración |
| (existente #6) fases durables, watchdog, telemetría | **sí** para managed-only | 0928 | wait-jobs probe, delegate.sh (inactividad), GNU time | SEARCH_EXISTING→…→COMPLETE durable; corte por repetición/sin progreso |
| TASK-THYROX-0925 una sola autoridad de selección | no (primera aceptación) | — | providerSelection, apiModelCatalog | recommend.ts y pool pasan por `select-provider` |
| TASK-THYROX-0926 claves de Qwen Cloud | no | relevo de sesión | route_probe.ts | 4 endpoints 200 |
| TASK-THYROX-0932 admisión por CPU; `makeRoom` cerrado por tipo | no | — | resource_admission | reserva de núcleos; rehúso sin medidor |
| TASK-THYROX-0933 observe logs/stats/health; gate | no | — | podman-execution observe, 0759 | observación gestionada; gate ve verbos por variable |
| TASK-THYROX-0934 Redis en producción | no | 0928 | shared-state factory, coordinationFactory | proxy y scheduler medidos sobre thyrox-redis |
| TASK-THYROX-0935 recuperación semántica en el worker | no | 0928, 0929 | semantic-search store, embeddings | consulta real del worker recupera contexto |
| (existente #11) auditoría de `src/packages/ink` | no | — | — | — |

Orden mínimo hacia managed-only: 0928 ∥ 0929 ∥ 0930 → 0931 → #5 → 0919 (re-ejecución; su
resultado es la primera implementación de Search Existing) → #6 → aceptación con los 11
requisitos de §15 → retirar `bootstrap-exception`. 0925, 0932–0935 y mathematical-reasoning
no están en la ruta crítica de la primera aceptación.
