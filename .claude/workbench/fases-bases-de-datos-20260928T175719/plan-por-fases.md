# Plan por fases: la capa de datos de thyrox sobre SQLite, PostgreSQL+pgvector y MySQL

Deriva de lo medido en este banco. Cada afirmación que sostiene una fase se
verificó por un instrumento distinto del análisis que la trajo
(`verificacion-independiente.txt`).

## Qué dicen las referencias, en una línea cada una

| Referencia | Lo que aporta | Análisis |
|---|---|---|
| Ejecutable 2.1.283 (`bin/binary`) | ninguna base: 0 de 2138 chunks nombran `bun:sqlite`, `postgres://`, `CREATE TABLE` | `binary-literal-*.txt` |
| TencentDB-Agent-Memory `29bb8df`, MemoryCore | contrato núcleo + periferia opcional, `StoreCapabilities`, `MaybePromise<T>` para migrar de síncrono a asíncrono, suite de contrato por backend, MySQL declarado y rehusado, dimensión de embedding diferida, normalización de puntuación por motor, RRF k=60 | `analisis-tencentdb-memorycore.md` |
| TencentDB, Proxy/Knowledge/Panel | migración declarativa por columna, telemetría a ClickHouse, redacción de secretos | `analisis-tencentdb-proxy-knowledge-panel.md` |
| OmniRoute `a58000c7` | migraciones versionadas en tabla, una transacción por archivo; contrato síncrono sólo SQLite; sqlite-vec + Qdrant | `analisis-pgvector-omniroute.md`, `../error-store-backends-*/analisis.md` |
| CLIProxyAPI | PostgreSQL elegido por DSN, esquema configurable, JSONB/TIMESTAMPTZ | `../error-store-backends-*/analisis.md` |
| pgvector `7db2345` | tipos, índices HNSW/IVFFlat, iterative scans; el apt da 0.6.0 (sin halfvec ni iterative scans) | `analisis-pgvector-omniroute.md` |

## Dos restricciones medidas que ordenan las fases

1. **`Bun.SQL` en `sqlite://` no carga extensiones** (H-THYROX-238):
   `loadExtension` es `undefined` en `SQL` y una función en `bun:sqlite`.
   La capacidad vectorial en SQLite no puede salir del contrato común.
2. **El store de agentes tiene tres escritores en dos lenguas**
   (`src/packages/store/db.ts`): hooks, `reconcile_store.py` y el harness
   comparten `agent_store.sqlite3`. Moverlo de motor arrastra a Python.

## Fases

| Fase | Qué | Depende de | Decisión del ejecutor |
|---|---|---|---|
| D0 | base de errores sobre `Bun.SQL` (SQLite y PostgreSQL) e instalador de pgvector | — | hecha (`00a8c2a5`) |
| D1 | capa común `@thyrox/store` sobre `Bun.SQL`: dialecto, URL → motor, migraciones versionadas por dialecto, suite de contrato por motor, arnés de PostgreSQL con esquema por prueba, `StoreCapabilities`, MySQL declarado y rehusado. La base de errores pasa a usarla | D0 | no |
| D2 | toolchain de PostgreSQL: clúster de pruebas opt-in (rol y base), y pgvector desde el fuente clonado para ≥0.7 (halfvec, iterative scans) como alternativa al apt | D1 | sí: ¿0.6.0 del apt o compilar 0.8.x? |
| D3 | llevar cada store TypeScript al contrato, uno por paquete y disjuntos por archivo: `provider` (1 tabla, cifrada), `mitm` (7), `observability`, `task`, `finding`, `tools/tasks` | D1 | no |
| D4 | stores Python (`agent_store`, `task_ids`, `hallazgo_ids`…) y el store compartido de agentes | D3 | sí: ¿se quedan en SQLite o pasan a PostgreSQL (psycopg)? |
| D5 | capacidad vectorial: columna `vector` + HNSW coseno en PostgreSQL; en SQLite, sqlite-vec vía `bun:sqlite` o sin capacidad; dimensión diferida y detección de desajuste; FTS (FTS5 / `tsvector`) con puntuación normalizada por motor y RRF k=60 | D1, D2 | sí: qué se vectoriza y con qué modelo de embeddings |
| D6 | primeros consumidores: errores parecidos en la base de errores, búsqueda semántica en `buscar-hallazgos` | D5 | no |
| D7 | MySQL/MariaDB sobre el adaptador que `Bun.SQL` ya trae (medido: `mysql` y `mariadb`) | D1 | sí: cuándo |

D3 es el tramo ancho: seis paquetes disjuntos por archivo. Es la forma de
`headless-pool --isolation worktree` + `pool_integrate` en cuanto `thyrox -p`
tenga credencial; sin ella, se hace paquete por paquete.
