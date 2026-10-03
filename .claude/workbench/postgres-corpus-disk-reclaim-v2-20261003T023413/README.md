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

## R4 — primera cohorte: copia huérfana de `.claude/` (medido, sin borrar)

`.thyrox/runtime/continuation/worktrees/local-models-publication-20261002T114251/L0-1790945810848326`
no tiene `.git` ni figura en `git worktree list`: es lo que dejó la retirada
del árbol por `task_continuation` (`git worktree remove --force`,
`src/session/task_continuation.py:890`). Contiene sólo `.claude/`, 774 MB en
disco.

- `probes/orphan_copy_redundancy.py` (job `reclaim-v2-orphan-copy`, exit 0):
  37 068 archivos — 37 055 con el mismo blob en el árbol principal, 13 con
  su blob en el almacén de git, **0 únicos**, 0 bytes con inodo compartido
  (`outputs/R4-orphan-copy-redundancy.json`).
- `probes/orphan_copy_originals_pushed.py`: 37 054 con el mismo blob en
  `origin/feature/complete-orm-root`; los 14 restantes son 13 versiones
  anteriores alcanzables desde ese ref (`outputs/R4-older-blobs-reachability.txt`:
  `29a594c79`, `6bd918b6c`, `6a7201165`) y 1 camino no ASCII que sí está en
  el ref (`ls-tree -z`).
- Ningún proceso tiene el directorio como cwd.

Conclusión: todo su contenido está preservado en el remoto; su borrado
liberaría ~774 MB. **El borrado lo rehusó el clasificador de permisos del
cliente** (destrucción local irreversible): queda para decisión del
ejecutor. Libre antes: `outputs/R4-free-before.txt` (2 429 546 496).

### R4 — corrección: «ningún proceso lo tiene como cwd» medía una sola superficie

El ejecutor objetó, con razón, que thyrox maneja varios cwd: un directorio se
referencia por más vías que el cwd de un proceso. Medido de nuevo, superficie
por superficie (2026-10-03):

| Superficie | Medido | Resultado |
|---|---|---|
| procesos: `cwd`, `root`, `exe`, fds, `maps`, `mountinfo`, `environ` | 75 pids, un solo pid namespace (los contenedores rootful incluidos) | 0 referencias |
| contenedores Podman (corriendo y `created`) y volúmenes | `observe container <n> --raw`, `observe volumes` | 0 montajes |
| ledger de trabajos | `wait-jobs pending/status` | 0 pendientes; 30 trabajos ya recogidos que corrieron ahí (27 `cont-L0-*`/`cont-L1-*` y 3 `local-models-l*`) (sus manifiestos lo citan como historia) |
| estado del controlador | `local-models-publication-20261002T114251/outputs/continuation.jsonl` | L0 `accepted` por excepción de bootstrap (H-THYROX-407), L1 `hard_block` por el operador; ninguno se reanuda sobre ese árbol |
| registro de git | `git worktree list` | no registrado; `.git` ausente |
| hogares de thyrox y del cliente | `~/.local/state/thyrox`, `~/.config`, `~/.cache`, `~/.claude` | sólo texto (tareas #139/#141 de esta sesión, transcripción) |

**Por qué quedó:** L0 se aceptó fuera del flujo, así que nunca corrió su
`integrate_worktree`, que es el único paso que hace `git worktree remove
--force` (`task_continuation.py:890`). El árbol perdió después su registro de
git, pero no sus archivos.

**Lo que la primera medición no vio:** la raíz medida fue
`L0-1790945810848326/`; el directorio padre tiene tres archivos sueltos.
`L0-bootstrap-verify.log` está en el remoto (`e035c356a`); **`L0-tsc.txt`
(4 041 B) y `red.out` (179 B) no estaban en git**: evidencia única del RED/GREEN
del verificador y del typecheck del árbol. Copiados con su sha256 verificado a
`local-models-publication-20261002T114251/outputs/orphan-tree-evidence/`.

Conclusión revisada: ningún consumidor vivo ni registrado; contenido
preservado en el remoto una vez commiteada esa copia. El borrado sigue siendo
decisión del ejecutor.
