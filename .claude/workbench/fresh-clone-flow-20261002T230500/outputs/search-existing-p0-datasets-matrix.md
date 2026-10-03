# Search Existing — P0 → autoimplementación → datasets (TASK-THYROX-0912)

HEAD `73010247d`+, índice de git de `/home/user/thyrox`. Instrumento:
`probes/search_existing_repo_wide.sh` con `probes/concepts-p0-datasets.tsv`
(pasadas A–D, `search-existing-p0-datasets/`). `bin/search_existing_mechanisms`
**no existe** en esta rama (ni `src/verify/mechanisms.tsv`): la búsqueda
permanente es `SEARCH_INCOMPLETE` y ésta es su contraprueba determinista.
*consumers/tests* = archivos que nombran el nombre base fuera/dentro de pruebas.
Salud: `search-existing-p0-datasets/health/`.

| capability | authority / path / symbol | consumers | tests | health | decision | action |
|---|---|---|---|---|---|---|
| local-only model execution | `src/session/execution_policy.json` + `provider/src/cost/executionPolicy.ts` (`parseExecutionPolicy`, `allowsEntry`) + `session/execution_policy.py` | 3 / 7 | 1 / 17 | 21/21 TS, 65/65 py | **EXTEND** (datos) | añadida la identidad HF instalada a `allowed`; RED 2 → GREEN 26/26 → anulación 2 |
| provider/remote fallback enforcement | `fallback.enabled=false` leído por `recommendExecution` (`policy.ts:440`) y por `headless-pool` (`POLICY_FALLBACK`) | 218 / 25 | 73 / 34 | verde | REUSE | medido: sin modelo admitido → `blocked`, nunca `claude-cli`; Ollama caído → `headless-pool` exit 2 (`test-headless-pool-model-policy.sh` caso 3) |
| model recommendation/selection | `recommendExecution` (`provider/src/cost/policy.ts`), `bin/agent-recommend` (`agent/bin/recommend.ts`) | 218 / 66 | 73 / 14 | 21/21, 58/58 | REUSE | `providerSelection.ts` es un segundo selector **sin consumidores** (sólo su test): no es autoridad activa, no se toca |
| qualification | `local-models-qualify` (`qualifyCommand.ts`), `qualificationStore.ts`, `modelQualification.ts` (`QualificationKind`, `qualifiedModels`) | 1–6 | 1–6 | 32/32 | REUSE | aprobada `task:mecanica` a 8192 (4/4, 3.9 tok/s); en curso a 32768; falta `protocol` (tool-calling) |
| scheduler / coordinator | `bin/model_coordinator` (`model_coordinator.sh`, daemon) | — | `test-model-coordinator-entry.sh` 18/18 | sano, `tickets=0` | REUSE | arrancado con `start` |
| managed worker execution | `ExecutionAuthorization`/`ExecutionUnit` en `@thyrox/podman-execution`, `bg.sh --task`, `headless-pool --execution unit` | 25+ | 34+ | `test-headless-pool-execution-unit.sh` 14/14 | REUSE | A6 por esta ruta |
| worker worktree lifecycle | `bin/item_worktree`, `headless-pool --isolation worktree`, `pool_integrate`; `task_continuation.py` (H-THYROX-437: duplicó parte del ciclo) | 7 / 25 | 10 / 34 | verde (derivadas P0d) | REUSE | sin cambio |
| Search Existing itself | — (`.claude/rules/search-existing-antes-de-construir.md`; diseño TASK-THYROX-0769) | — | — | — | **SEARCH_INCOMPLETE** | no se implementa T001 a mano; candidato para un worker local |
| dataset source acquisition/cache | `local-models/huggingFaceSource.ts` (revisión fija, sha256/sha1) — sólo para artefactos de modelo | 3 | 0 | sin pruebas propias | **SEARCH_INCOMPLETE** | ninguna autoridad de datasets; `huggingFaceSource` es candidata a EXTEND tras inspeccionar su contrato |
| dataset transformation | ninguna de datasets; `thyrox-transformers-runtime` es **runtime de servicio de modelos** (`TransformersRuntimeAdapter`, safetensors) | 1 | 1 | — | MISSING-candidato | no confundir con transformación de texto |
| normalization | por dominio: `semantic-search/rstDocument.ts` (`parseRstDocument`) | 1 | 1 | 23/23 | REUSE patrón | una fuente nueva aporta su parser de dominio (EXTEND) |
| chunking | el corpus recibe `chunks: string[]` ya cortados (`corpus.ts`); los corta el dominio (`rstDocument.ts`) | 156 | 118 | verde | EXTEND por dominio | sin chunker genérico nuevo |
| semantic ingestion | `bin/semantic-search-ingest` (`ingestCommand.ts`) + `findingIngestion.ts` + `SemanticSearchStore.ingest` (`store.ts`) | 739 | 357 | unit 23/23; las `*.postgres.test.ts` no corridas | REUSE (+EXTEND dominio) | dominio nuevo, no ingestor nuevo |
| embedding generation | `local-models/admittedEmbed.ts` (admisión por coordinador); `store.ts`/`vectorSql.ts` (`embedding_spaces`, pgvector) | 1 / 739 | 0 / 357 | `admittedEmbed` sin prueba propia | REUSE | ruta local de embeddings |
| semantic_search_worker | `daemon/src/podman/specializedWorkerProfile.ts` (perfil declarado) | 0 | 1 | — | EXTEND (previo) | sin cambio ahora |
| SemanticSearchStore | `semantic-search/store.ts` | 739 | 357 | verde (unit) | REUSE | — |
| corpus identity/version/provenance | `semantic-search/corpus.ts` (`domain·scope·domainId`, versiones), `contentHash.ts` (`chunkHash`, `documentHash`) | 156 / 9 | 118 / 8 | 23/23 | REUSE | — |
| transformers runtime | `TRANSFORMERS_RUNTIME_IMAGE` en `hostCoordinatorComposition.ts` + `transformersRuntimeAdapter.ts` | 1 | 1 | imagen ausente localmente | REUSE (es runtime) | no es autoridad de datasets |

*Métrica:* nombre base y términos de `concepts-p0-datasets.tsv` sobre el índice.
*Ciega a:* un mecanismo con otros nombres; las suites `*.postgres.test.ts`
(no corridas aquí); `kaupamex-docs`, ausente.
