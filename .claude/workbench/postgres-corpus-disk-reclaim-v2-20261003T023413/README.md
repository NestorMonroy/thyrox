# POSTGRES-CORPUS-DISK-RECLAIM v2 — continuación versionada

Continúa `postgres-corpus-disk-reclaim-20261002T023317` (T001/T003/T005
aceptadas; T002/T004 bloqueadas por el productor de embeddings).
Reutiliza la evidencia de durabilidad de T003. Tarea: TASK-THYROX-0758.

## R0 — estado del corpus (medido)

`outputs/R0-corpus-state.json`, `outputs/R0-vector.json`:
PostgreSQL 16.10, pgvector 0.8.0 instalada, esquema `semantic_search`,
1675 documentos, 9981 chunks, **0 embedding spaces**, 21 254 627 bytes.

## R3 — inventario T005b sobre los cinco árboles

Instrumento: `probes/t005b_inventory.py` del banco original
(`t005b_rules.py`), job `reclaim-v2-r3-inventory`, exit 0, 438.83 s,
pico 52 MB. Salida: `outputs/R3-corpus-inventory.json` (87 990 filas),
`outputs/R3-cohort-candidates.txt` (agrupación). Libre antes:
`outputs/R3-free-before.txt` = 2 513 477 632 bytes.

| Clase | Bytes |
|---|---|
| total escaneado | 8 281 449 525 |
| binary_non_indexable | 4 216 794 876 |
| duplicate | 3 155 305 741 |
| durable_evidence | 826 226 860 |
| semantic_content | 48 896 907 |
| excluded_secret | 24 071 727 |
| reconstructible_cache | 7 546 107 |

Ninguna fila `duplicate` ni `binary_non_indexable` tiene
`safe_to_delete=true`; las 317 `reconstructible_cache` son versionadas
(las conserva git) y exigen `separate_authorization`.

## Lo que la medición corrigió (H-THYROX-433)

`duplicate_bytes` suma bytes **aparentes**. 2 497 280 480 de ellos son
`.thyrox/runtime/local-bootstrap/qwen3-4b-publish/model-Q4_K_M.gguf`,
inodo 2687150 con `st_nlink=2`: el otro enlace es el blob del volumen
protegido (H-THYROX-432). Borrar esa ruta libera **0** bytes. El reclamo
de una cohorte se mide por `free_after − free_before` y por inodos con
`nlink=1`, nunca por la suma del inventario.

Lo restante (~0.6 GB) vive casi entero en
`.thyrox/runtime/continuation/worktrees` (774 MB, 6 directorios, ninguno
registrado en `git worktree list`), propiedad de `task_continuation`.

## Decisión de cohorte

Sin cohorte borrable todavía: ningún candidato cumple las ocho
condiciones de borrado (hash, identidad, texto en PG, embedding local,
recuperación vectorial PASS, reingesta idempotente, sin evidencia
exclusiva, `safe_to_delete`). Siguiente nodo ejecutable:

1. **R1** — productor de embeddings local (EXTEND `semantic-search-ingest`,
   TASK-THYROX-0904; nomic-embed-text-v1.5, sólo local) por un worker.
2. Cohorte de worktrees de continuación: requiere la prueba de que sus
   commits están en git remoto y su autoridad (`task_continuation`) los
   declara terminados — Search Existing pendiente sobre su retiro.
