<!-- extraído textual de report-20261003T232604Z-pre-structured-audit.md (sha256 75a113337c2d367ba09bb18022ecb211cd7d616f25b22b12376a97bb7ac77d0a); no editar: la fuente es el snapshot -->

## Capability matrix — estado al cierre de la fotografía (2026-10-03)

Sustituye a la matriz inicial (arriba), que describía el estado antes de los
cambios de esta tarde. Evidencia nueva en `dims/`, `ml/`, `resources/`, `identity/`.

| Capability | State | Authority | Consumer | Real proof | Consumable today | Active now | Gap / dependencia |
|---|---|---|---|---|---|---|---|
| ejecución en unidad gestionada | REAL_VERIFIED | `podman-execution-execute run` | pool `--execution unit` | 4 corridas de flujo hoy | sí | no (bajo demanda) | imagen por defecto `:dev` ausente; sólo funciona con `THYROX_EXEC_IMAGE` al digest publicado |
| worktree aislado + verify + integración | REAL_VERIFIED | `headless-pool --isolation worktree --verify` + `pool_integrate` | pool, cualificación de flujo | veredictos reales hoy | sí | no | huérfanos: los retira `item_worktree sweep-orphans` con rescate (usado hoy) |
| vigilante del ítem | REAL_VERIFIED (host y unidad en pruebas) | `item_watchdog.py` | pool | pruebas + anulación; no disparó en real (su proceso se retiró a mano en una corrida) | sí | por ítem | — |
| convergencia tras reciclado | REAL_VERIFIED | `local_control_plane_ready` (status/converge) | sesión | 0/13 → 13/13 | sí | — | — |
| volumen durable perdido | IMPLEMENTED + INTEGRATED | `resourceMaterialization.ensureVolumes` + libro de volúmenes durables | infraestructura | pruebas + anulación; no ejercido en real | sí (al próximo ensure) | — | el corpus ya se perdió (H-THYROX-464) |
| catálogo / import / validación | REAL_VERIFIED | `local-models-catalog`, `local-models-import` (entrada declarada) | manual | 2 imports reales hoy | sí | — | valores por defecto inservibles aquí: lab `:dev`, 8 GiB (H-THYROX-469) |
| materialización en la unidad | REAL_VERIFIED | `OllamaRuntimeAdapter.prepareRuntimeArtifact` (`pushBlob`) | coordinador | real | sí | 1 residencia | dos copias por modelo (H-THYROX-471) |
| cualificación con perfil | REAL_VERIFIED | `ModelQualification.runtimeProfile` + `local-models-qualify` | recomendador | 10+ registros hoy | sí | — | — |
| cualificación de flujo (`repo-code-change@1`) | REAL_VERIFIED | `--workflow-suite` + `workflowPool` | — | 4 corridas reales; discrimina | sí | — | ninguna identidad aprobada (H-THYROX-470) |
| selección de modelo | INTEGRATED, **dos autoridades activas + una desconectada** | `recommendExecution` (pool, tsc_cycle) · `choose_candidate` (task_continuation) · `providerSelection.ts` (0 consumidores) | pool, task_continuation | real (pool eligió el modelo medido) | sí | — | unificar (0750/0925) |
| admisión RAM | REAL_VERIFIED, **mide el cgroup equivocado** | `resource_admission.py` | coordinador, import | rechazos reales hoy | sí | — | cgroup de sesión + caché de páginas; unidades en `libpod_parent` (H-THYROX-471) |
| admisión CPU | IMPLEMENTED + INTEGRATED | `ResidencyController.makeRoom` + `unitCpuCapacity` | coordinador | pruebas + anulaciones | sí | — | no cuenta las unidades que no son de modelo |
| admisión disco | REAL_VERIFIED | `resource_admission disk-admit` + `disk-headroom` | import | rechazo real hoy (145 MB) | sí | — | — |
| fallback de selección / local→local | IMPLEMENTED (dobles) | `policy.ts`, `admittedUpstream.ts` | pool, proxy | dobles | sí | — | ningún salto real ejercido |
| localidad (thyrox-* nunca `own`) | REAL_VERIFIED | `decidePrintRoute` + `served-by` + `--local-only` | pool | `served-by … local:true` en las 4 corridas | sí | — | — |
| Redis en producción | INTEGRATED parcial | `@thyrox/shared-state` (proxy, si `THYROX_REDIS_URL`) · `runLease` (import/quantize) | proxy del anfitrión, import | lease real en los imports de hoy | sí | sólo leases de import | claves sin prefijo de componente (H-THYROX-463); las unidades no reciben la URL (memoria); coordinación de modelos `local` |
| PostgreSQL + pgvector | REAL_VERIFIED como servicio | `infrastructure-bootstrap` | semantic-search, observabilidad | sano, pgvector 0.8.0 | **no**: ninguna `THYROX_*_DATABASE_URL` declarada en `.env` | contenedor sí | corpus perdido; sin URL de consumidor |
| SemanticSearch (store) | IMPLEMENTED | `semantic-search/store.ts` | 0 paquetes de producto | suites postgres (esquema desechable), caso 4b hoy | no | no | sin productor de vectores (H-THYROX-466) |
| RAG | ABSENT | — | — | — | no | no | depende de embeddings + retrieval |
| Transformers runtime | IMPLEMENTED + INTEGRATED, nunca construido | `hostCoordinatorComposition` | — | — | no | no | H-THYROX-465 |
| embeddings | orquestación IMPLEMENTED; modelo, cualificación, producción ABSENT | `admittedEmbed` | sólo cualificación | ninguna | no | no | 0904 |
| semantic_search_worker | PROFILE ONLY | `specializedWorkerProfile.ts` | ninguno | — | no | no | D5 |
| SentenceTransformer / CrossEncoder / reward-value | ABSENT | — | — | — | no | no | — |
| traducción por Transformers | IMPLEMENTED, no verificada | `admittedSeq2seq` + `/v1/seq2seq` | ninguno | — | no | no | imagen, modelo, suite |
| clasificador de resultados | INTERFACE ONLY | `THYROX_OUTCOME_CLASSIFIER_COMMAND` | task_continuation | — | no | no | sin modelo |
| autoridades de Podman | INTEGRATED | `@thyrox/podman-execution` (0 violaciones) | todos | gates 0 | sí | — | 5 excepciones pendientes con tarea (0746 capacidades, 0759 observación ×3) |
| ciclo de vida de imágenes | PARTIAL | `image-registry/declaredImages.ts` | builds | candidate del quantizer | parcial | — | catálogo declara **1** imagen; runner, transformers y otras sin declarar (nada las reconstruye); por defecto `:dev` en dos sitios |
| ciclo de vida de artefactos | REAL_VERIFIED | `artifact-locations.json`, `externalArtifact`, caché por digest | coordinador | real | sí | — | publicación durable sólo de qwen3-4b; los 7B importados sin publicar (decisión de identidad) |
| propiedad de runtime/caché | PARTIAL | `configHome`/`resolveDataDir`, `.thyrox/` | todos | — | sí | — | pertenencia por prefijo `thyrox-`/`kaupamex-` (H-THYROX-461/462) |
| monitoreo de procesos/trabajos | REAL_VERIFIED | `thyrox-bg`, `wait-jobs` (heartbeat + `stdin_probe`), `item_watchdog` | sesión, pool | real | sí | — | 2 trabajos A6 `SIN-RECOGER` desde las 11:16 |
| logs/stats/health por la primitiva | ABSENT | — | — | — | no | — | #20 |
| Search Existing | DESIGNED_ONLY | regla `search-existing-antes-de-construir.md` | — | 0 archivos (`search_existing_mechanisms.py`, `mechanisms.tsv`, bins): sólo el parche rescatado de 0919 | no | no | depende de un worker aceptado o de implementación del controlador |
| specialist routing | ABSENT | — (`RouteRequirement`: 0) | — | — | no | no | — |
| identidad kaupamex-ai | AUDITADO, nada migrado | inventario + DAG de fases | — | — | — | — | #24, #25 |
