# p6-data-semantic-search

## [201] TASK-THYROX-0453 — Datos D3 — opción A: runner síncrono en @thyrox/store y los stores de nivel B sobre él (decisión del ejecutor 2026-09-29)

Status on board: pending

Decisión del ejecutor: opción A. @thyrox/store comparte contratos y garantías, no un único driver. Dos runners con las MISMAS garantías: runMigrationsSync (bun:sqlite) y runMigrations (Bun.SQL). mitm, task, provider y observability quedan en SQLite nivel B con sus API síncronas; PostgreSQL y pgvector sólo en stores con requisito medido de nivel C/vectorial. Se ejecuta en fases: D3-A0 (runner síncrono y suite de contrato común) primero; después, en paralelo, D3-A1..A5.

## [296] TASK-THYROX-0539 — Datos — política de thyrox para un hueco sospechoso de migraciones pendientes en una base existente

Status on board: pending

Adoptar la garantía conceptual de OmniRoute (una base existente con demasiadas migraciones pendientes probablemente es vieja, restaurada o reiniciada) sin copiar su umbral. Definir qué es un hueco inesperado en thyrox (sobre todo al introducir el ledger por primera vez) y su desenlace: rechazar o exigir adopción explícita. Es política de despliegue por store, no parte del runner común.

## [295] TASK-THYROX-0538 — Datos — medir si agent_store.sqlite3 guarda estado no comprometido que Git no cubre (política de snapshot pre-migración)

Status on board: pending

Condición del ejecutor: no asumir que Git sustituye a un snapshot. Git protege el estado comprometido, no los cambios locales ni los datos generados desde el último commit ni el estado runtime. Medir en este árbol cuánto difiere el archivo vivo de su último commit a lo largo de una sesión (filas nuevas por escritores de hooks, pools y CLI) y con qué frecuencia se commitea. Si hay estado operativo no comprometido, #289 exige snapshot pre-migración para ese store. Revisar aparte las implicaciones de versionar una SQLite activa en Git (WAL, merges binarios: merge_sqlite_union.py).

## [203] TASK-THYROX-0455 — Datos D5 — capacidad vectorial y FTS (decisión: qué vectorizar y modelo de embeddings)

Status on board: pending

Decisión del ejecutor. Debe producir: entidades a vectorizar, volumen inicial y crecimiento (N), modelo de embeddings, dimensionalidad (D), denso vs disperso, necesidad de halfvec/precisión, patrón y frecuencia de escritura, tasa de consultas, top_k, objetivo de recall y latencia, presupuesto de memoria y almacenamiento. Desbloquea D2b (#200).

## [319] TASK-THYROX-0562 — SemanticSearchStore sobre PostgreSQL + pgvector (ADR-THYROX-008)

Status on board: pending

Implementar el store de dominio vectorial que ADR-008 fija: superficie (upsertEmbedding, searchNearest, searchBinaryCandidates, getEmbedding, migrateVectorSchema) sobre la infraestructura PostgreSQL de @thyrox/store; rehúsa sin PostgreSQL + pgvector; reranking matemático en el store. Depende de D5 (modelo/dimensiones) y D2b (versión pgvector).

## [204] TASK-THYROX-0456 — Datos D6/D7 — consumidores vectoriales (errores parecidos, buscar-hallazgos) y MySQL/MariaDB

Status on board: pending

Bun.SQL trae adaptadores mysql y mariadb (medido).

## [350] TASK-THYROX-0627 — Datos D4-B — topología de la autoridad durable compartida (discovery)

Status on board: pending

Decide where a PostgreSQL common to all sessions would live, who operates it, how sessions discover it, offline and network-failure semantics, who owns the store contract and migrations, and whether Python opens it directly or goes through a port or service. InfrastructureBootstrap's PostgreSQL is per-session and does not qualify. No engine migration for agent_sessions/tasks until this has an answer. Bench: .claude/workbench/datos-d4-inventario-20260929T221846/README.md §7.
