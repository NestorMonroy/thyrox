<!-- extraído textual de report-20261003T232604Z-pre-structured-audit.md (sha256 75a113337c2d367ba09bb18022ecb211cd7d616f25b22b12376a97bb7ac77d0a); no editar: la fuente es el snapshot -->

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
