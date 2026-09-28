# Análisis — capa de almacenamiento de MemoryCore (tencentdb-agent-memory)

Repositorio analizado: `/home/user/nestormonroy/tencentdb-agent-memory`
Commit: `29bb8dffa9b11617316d50f21d7a8af9f47240be` (medido con
`git -C /home/user/nestormonroy/tencentdb-agent-memory log -1 --format="%H %ci"`
→ `2026-09-28 19:27:14 +0800`).
Sólo lectura: no se escribió nada dentro de ese repo (verificado al cierre con
`git status --short`, sin salida).

Todas las citas son `ruta:línea` relativas a la raíz del repo analizado.
Ningún conteo se inventó: cada cifra viene de un comando ejecutado en este
turno, citado junto a ella.

---

## 1. Contrato(s) de store

MemoryCore tiene **dos** contratos de store paralelos, no uno solo — sirven a
dos capas de datos distintas y cada una tiene su propia fábrica y su propia
suite de contrato compartida:

### 1.1 `IMemoryStore` — datos de memoria (L0/L1/L2/L3, skills)

Declarado en `MemoryCore/src/core/store/types.ts:590` (`export interface
IMemoryStore extends MemoryPromptStore, MemoryGenerationRefStore`). La cabecera
del archivo (`types.ts:1-16`) declara explícitamente el principio: *"Design
principles: 1. Backend-agnostic … 2. Capability-based … 3. Fault-tolerant: All
methods return empty results or `false` on failure rather than throwing … 4.
Sync-first: Matches current SQLite DatabaseSync usage. TCVDB backend adapts
internally without changing these signatures."*

Los métodos que forman el contrato base son **obligatorios** (firma sin `?`):
lifecycle (`init`, `isDegraded`, `getCapabilities`, `close` —
`types.ts:601-606`), escritura/lectura L1 (`upsertL1`, `deleteL1*`, `countL1`,
`queryL1Records` — `types.ts:608-618`), búsqueda L1 (`searchL1Vector`,
`searchL1Fts` — `types.ts:620-622`), y el mismo triple para L0
(`types.ts:632-655`).

Un segundo grupo, grande, es **opcional** (`?` en la firma): `searchL1Hybrid?`
(`types.ts:623-629`), toda la superficie de perfiles L2/L3 (`pullProfiles?`,
`queryProfiles?`, `countProfiles?`, `syncProfiles?`, `deleteProfiles?` —
`types.ts:663-678`), paginación v2 (`queryL0Paginated?`, `queryL1Paginated?`
— `types.ts:697-708`), `clearMemoryContent?` (`types.ts:717-724`), y toda la
gestión de entidades (Team/User/Agent/Task/Knowledge/Audit —
`types.ts:727-770`). El patrón es: **el núcleo semántico de memoria es
obligatorio; todo lo que un backend concreto puede no soportar de forma nativa
se degrada a opcional**, y el caller comprueba presencia (`if (store.syncProfiles
&& …)`).

`StoreCapabilities` (`types.ts:250-265`) es el vector de banderas que
completa el "capability-based": `vectorSearch`, `ftsSearch`,
`nativeHybridSearch`, `sparseVectors`, `profileRows` — esta última
"Required to back a row-view filesystem (`rowfs`). SQLite reports `false`"
(`types.ts:262-264`).

**La suite de contrato compartida** vive en
`MemoryCore/src/core/store/__contract__/memory-store.contract.ts:1-27`: *"Shared
IMemoryStore contract suite. Backend-agnostic behavioral tests that EVERY
IMemoryStore implementation must satisfy (sqlite, tcvdb, mongodb). A concrete
spec file supplies a harness that knows how to create/dispose an isolated
store for one backend, then calls `runMemoryStoreContract(harness)`."* La
interfaz del harness (`__contract__/memory-store.contract.ts:25-32`) exige
`backend` (etiqueta), `createStore()`, `disposeStore()` y un flag opcional
`ftsEventuallyConsistent` — este último documentado porque *"FTS on mongot is
eventually consistent (change-stream → Lucene)"* (comentario de cabecera,
líneas 20-21), y el harness resuelve esa asimetría con `pollUntil` en vez de
forzar a los tres backends al mismo modelo de consistencia
(`__contract__/memory-store.contract.ts:78-96`).

### 1.2 `IMetadataStore` — entidades de control (usuarios/equipos/agentes/tareas/ACL)

Contrato separado, `MemoryCore/src/metadata/store/interface.ts:71`
(`export interface IMetadataStore`). Su cabecera (`interface.ts:1-12`) es
explícita sobre el alcance de backends: *"所有后端实现（SQLite / MongoDB / MySQL
预留）必须满足此契约，由 metadata-store.contract.ts 中的共用测试套件统一验证"* — SQLite y
MongoDB implementados, **MySQL reservado como tercer backend previsto pero no
implementado** (confirmado en la fábrica, ver §2). También trae su propia
suite compartida en `MemoryCore/src/metadata/store/metadata-store.contract.ts`
(no leída línea a línea en este pase, pero su existencia y patrón de nombre
son gemelos de `__contract__/memory-store.contract.ts`).

Ambos contratos comparten forma (interfaz + fábrica + contract-suite +
harness por backend), pero son dos jerarquías de tipos independientes —
`IMemoryStore` no extiende ni compone `IMetadataStore`.

---

## 2. Selección de motor

**No hay parseo de URL de conexión como discriminador de motor.** La
selección es por **valor de configuración discreto** (`storeBackend`), y cada
uno de los dos contratos resuelve el suyo por su propio canal:

- **`IMemoryStore`** — `storeBackend: StoreBackend` con `type StoreBackend =
  "sqlite" | "tcvdb" | "mongodb"` (`MemoryCore/src/config.ts:183`). Se lee de
  la config del plugin: `const storeBackendRaw = str(c, "storeBackend") ??
  "sqlite"` (`config.ts:498`), con normalización a los tres valores válidos y
  `"sqlite"` como default (`config.ts:499-501`). La fábrica
  `MemoryCore/src/core/store/factory.ts:57` (`createStoreBundle`) hace un
  `switch (config.storeBackend)` con tres ramas — `"tcvdb"`
  (`factory.ts:60-104`), `"mongodb"` (`factory.ts:106-133`) y `"sqlite"`/
  `default` (`factory.ts:135-166`) — y valida precondiciones **por rama**
  antes de instanciar: TCVDB exige `tcvdb.url`, `tcvdb.apiKey` y
  `tcvdb.database` o lanza (`factory.ts:63-69`); MongoDB exige
  `MONGODB_ENDPOINT`/`MONGODB_DATABASE` vía `readMongoEnvConfig()`
  (`factory.ts:108-110`).

- **`IMetadataStore`** — discriminador **distinto**: no es un campo de config
  sino la **presencia de una variable de entorno**.
  `MemoryCore/src/metadata/store/factory.ts:63-99` (`loadStoreConfig`)
  documenta la regla en su propio comentario: *"TDAI_METADATA_MONGO_URI 非空 →
  mongodb / 否则 → sqlite … 二者同时显式配置 → 启动报错"* — y lo aplica
  (`assertMetadataStoreConfigExclusive`, `factory.ts:46-56`) lanzando
  `MetadataStartupValidationError` si `TDAI_METADATA_MONGO_URI` y
  `TDAI_METADATA_SQLITE_BASE_DIR` están ambas presentes. `createMetadataStore`
  (`factory.ts:135-163`) tiene el `switch` con las tres etiquetas —
  `"sqlite"`, `"mongodb"` y **`"mysql"` que explícitamente `throw new
  Error("MySQL backend not yet implemented")`** (`factory.ts:159-160`) —
  confirmando que el tipo `MetadataBackend` ya reserva el nombre pero la
  implementación no existe en este commit.

**No hay auto-detección por URL** (tipo `postgres://` vs `sqlite://` vs
`mongodb://`) en ninguno de los dos factories: el motor se decide por un campo
de configuración explícito o por qué variable de entorno está poblada, nunca
por parsear el esquema de una cadena de conexión.

---

## 3. Esquema y migraciones

### 3.1 SQLite — sin control de versión de esquema por `PRAGMA user_version`

Medido con `grep -n "user_version\|schema_version" MemoryCore/src/core/store/sqlite/memory-store.ts
MemoryCore/src/metadata/store/sqlite-adapter.ts MemoryCore/scripts/db/sqlite-init.sql`
→ **0 ocurrencias** en los tres archivos. No hay tabla ni pragma de versión de
esquema. El patrón de migración es **aditivo e idempotente por captura de
excepción**:

```
try { this.db.exec("ALTER TABLE l1_records ADD COLUMN team_id TEXT DEFAULT 'default'"); } catch { /* exists */ }
```
(`MemoryCore/src/core/store/sqlite/memory-store.ts:508-512`, repetido para
`l0_conversations` en `memory-store.ts:627-630`, y para `entity_knowledge`/
`entity_teams`/`entity_tasks` en `memory-store.ts:821-824`; el metadata-adapter
tiene el mismo patrón una vez, `MemoryCore/src/metadata/store/sqlite-adapter.ts:342`).
Es decir: el `init()` de cada store **siempre** intenta añadir las columnas
nuevas y descarta el error de "columna ya existe" — no hay ninguna
comprobación previa de versión que decida si migrar.

**Excepción declarada al patrón aditivo**: las tablas virtuales FTS5 **no**
soportan `ALTER TABLE ADD COLUMN`
(`MemoryCore/src/core/store/sqlite/memory-store.ts:938-939`, repetido en el
docstring de `memory-store.ts:3120-3121`), así que un cambio de esquema FTS
exige **drop + recreate + reindex**. El código lo resuelve con
`migrateFtsTablesIfNeeded()` (`memory-store.ts:940`) que detecta tablas v1 (sin
`content_original`) y devuelve `needsFtsRebuild`; tras crear las tablas v2 con
`CREATE VIRTUAL TABLE IF NOT EXISTS` (`memory-store.ts:946-982`), si hubo
migración se llama `rebuildFtsIndex()` (`memory-store.ts:1030` y alrededores).

**Excepción también para `vec0`** (tablas de vectores): no soporta `ALTER
TABLE` de dimensión — si la dimensión configurada cambia respecto a la
guardada, el código **dropea y recrea** las tablas vectoriales y marca
`needsReindex: true` para que el llamador re-embeba todo
(`memory-store.ts:363-370`, con el detalle de comparación de dimensiones en
`memory-store.ts:409-470`: guarda `savedMeta.dimensions` y compara contra
`this.dimensions`, línea `427`, y aparte compara contra la dimensión real de
la tabla `vec0` existente, línea `464`, porque las dos fuentes pueden
divergir).

### 3.2 Migración cruzada de formato de datos (v2 → v3), no de motor

`MemoryCore/scripts/migrate-v2-to-v3/` es un script **Python** externo
(`v2-to-v3-migrate.py`) que migra el **formato** de un `vectors.db` SQLite
existente (añade `team_id`, `task_id`, `user_id`, `agent_id`, `version` a
`l1_records`/`l0_conversations`, reconstruye FTS5, mueve archivos L2/L3 a rutas
con scope — `MemoryCore/scripts/migrate-v2-to-v3/README.md:9-11,40-46,50-52`).
No es una migración entre motores (SQLite→TCVDB, por ejemplo): opera **dentro**
de SQLite, con `--dry-run`, backup automático (`.bak`) y modo `--db-only`
(`README.md:22-33`). No se localizó en este pase ningún script equivalente que
migre datos ya escritos de un backend a otro (SQLite→TCVDB o
TCVDB→SQLite) — ver §6.

### 3.3 DDL de skills — tercer contrato de esquema, con su propio patrón de versionado por fila

`MemoryCore/src/core/skill/skill-store-ddl.ts` no versiona el esquema SQL: en
cambio versiona los **datos** — cada fila de `skills` es una tupla inmutable
`(skill_id, version)` con `UNIQUE(skill_id, version)`
(`skill-store-ddl.ts:23-46`) y un flag `is_head` que marca cuál versión es la
vigente (índice único parcial `WHERE is_head=1 AND status='active'`,
`skill-store-ddl.ts:48-49`). El comentario de cabecera (`skill-store-ddl.ts:1-16`)
declara qué se excluyó a propósito del DDL — bindings, drafts, floating/fixed
skills, `skill_resources` — y por qué: *"绑定/草稿/浮动概念已下沉到管控面"* /
*"manifest 收敛到 skills.manifest_json 列"*. Es documentación de una decisión de
diseño (qué NO modelar en esta capa), no del motor.

### 3.4 `sqlite-init.sql` — script de referencia, declarado como no-autoritativo

`MemoryCore/scripts/db/sqlite-init.sql:1-9` se declara a sí mismo secundario:
*"注意：此脚本须与 sqlite-adapter.ts createSchema() 保持同步"* — o sea, la fuente de
verdad del esquema de metadata es el código TypeScript
(`sqlite-adapter.ts::createSchema()`), y este `.sql` es una copia para
`sqlite3 … < sqlite-init.sql` manual que alguien tiene que mantener
sincronizada a mano (sin gate automático localizado en este pase).

---

## 4. Vectores y búsqueda híbrida

### 4.1 SQLite local — `sqlite-vec` (extensión nativa) + FTS5, fusión en el LLAMADOR

- **Extensión**: se carga con `require("sqlite-vec"); sqliteVec.load(this.db)`
  (`MemoryCore/src/core/store/sqlite/memory-store.ts:374-376`), sobre
  `node:sqlite` `DatabaseSync`, cargado vía `createRequire` porque es un módulo
  experimental (`memory-store.ts:156-160`, `memory-store.ts:310`).
- **Dimensión**: **no fija** — parámetro de constructor
  `constructor(dbPath: string, dimensions: number, logger?: Logger)`
  (`memory-store.ts:299`), propagado desde `config.embedding.dimensions`
  (`MemoryCore/src/core/store/factory.ts:145-148`). `dimensions === 0` es un
  modo soportado explícitamente: *"metadata/FTS-only mode"*
  (`memory-store.ts:369-371`) — cuando el proveedor de embeddings es
  `"none"`, las tablas `vec0` se difieren por completo (`config.ts:483-490`
  y `memory-store.ts:246,540,1052`).
- **Tabla**: `CREATE VIRTUAL TABLE IF NOT EXISTS l1_vec USING vec0(record_id
  TEXT PRIMARY KEY, embedding float[${this.dimensions}] distance_metric=cosine,
  updated_time TEXT DEFAULT '')` (`memory-store.ts:542-548`); gemela `l0_vec`
  en `memory-store.ts:664-670`. **Distancia: coseno**, fijada por
  `distance_metric=cosine` en la propia tabla virtual (no es un parámetro de
  la query).
- **Consulta KNN**: `SELECT record_id, distance FROM l1_vec WHERE embedding
  MATCH ? AND k = ? ORDER BY distance` (`memory-store.ts:590-596`, gemela L0
  en `memory-store.ts:700-706`) — sintaxis nativa de `sqlite-vec` (`MATCH` +
  `k = N` como pseudo-columna).
- **Score reportado**: la interfaz documenta *"Cosine similarity score (1.0 -
  cosine_distance)"* (`memory-store.ts:91,118`) — o sea, la distancia cruda de
  `vec0` se invierte a similitud antes de devolverse (0–1, mayor=mejor, igual
  que el resto de la interfaz).
- **FTS5**: dos tablas virtuales, `l1_fts`/`l0_fts`
  (`memory-store.ts:946-982`), esquema v2 con **columna `content` tokenizada
  con jieba** y `content_original UNINDEXED` para mostrar el texto crudo
  (comentario de diseño, `memory-store.ts:930-933`). Ranking:
  `bm25(l1_fts) AS rank … ORDER BY rank ASC` (`memory-store.ts:997-1005`,
  gemela L0 `memory-store.ts:1013-1021`).
- **Normalización del score BM25 a 0–1**: función dedicada
  `bm25RankToScore(rank)` en `MemoryCore/src/core/store/tokenize.ts:172-179`:
  `rank < 0` (caso normal de FTS5, "negative = more relevant") →
  `relevance = -rank; return relevance / (1 + relevance)`; si no, `1 /
  (1+rank)`. El comentario declara la procedencia: *"Mirrors the formula in
  openclaw core `hybrid.ts`"* (`tokenize.ts:169-170`). Hay una función gemela
  `mongoSearchScoreToScore` (`tokenize.ts:181-197`) que aplica la **misma
  transformación matemática** al `searchScore` de Mongo, explícitamente para
  que el umbral `scoreThreshold=0.3` corriente aguas abajo sea comparable
  entre backends — es la pieza que hace el score "portable" entre motores.
- **Skills — tokenizador distinto**: `skill_fts` usa `tokenize = 'unicode61
  remove_diacritics 1'` (`MemoryCore/src/core/skill/skill-store-ddl.ts:79`),
  **no** jieba — divergencia no explicada en el propio archivo (posible
  DESCONOCIDO, ver §6).
- **Fusión híbrida — NO ocurre dentro del store SQLite.** El propio
  `VectorStore` **no** implementa `searchL1Hybrid`/`searchL0Hybrid` como
  método propio de fusión server-side (medido: `git grep -n
  "searchL1Hybrid\|searchL0Hybrid" MemoryCore/src/core/store/sqlite/memory-store.ts`
  → 0 hits de definición de esos métodos en ese archivo). La fusión ocurre
  **en la capa de herramientas**, por encima del store: `rrfMergeL0` en
  `MemoryCore/src/core/tools/conversation-search.ts:61,259` y
  `rrfMergeL1Hits` en `MemoryCore/src/core/tools/l1-candidate-recall.ts:107,147`
  — cada una llama por separado a `searchL1Fts`/`searchL1Vector` (o L0
  equivalentes) y funde con **Reciprocal Rank Fusion (RRF)**.
- **RRF compartido**: `MemoryCore/src/core/store/search-utils.ts:38-62`
  (`rrfMerge<T>`) es la implementación genérica —*"eliminates the 3x
  duplication in auto-recall, memory-search, conversation-search"*
  (`search-utils.ts:5-7`)—: `RRF_K = 60` (`search-utils.ts:18`, "Standard RRF
  constant from the original RRF paper"), score por ítem = `1 / (k + rank +
  1)` sumado sobre todas las listas donde aparece (`search-utils.ts:44-53`),
  orden final descendente por `rrfScore` (`search-utils.ts:59-61`).

### 4.2 TCVDB (Tencent Cloud VectorDB) — fusión NATIVA en el servidor

- **Dimensión fija**: `dimension: 1024, metricType: "COSINE"` hardcodeado en
  la definición de índice de colección
  (`MemoryCore/src/core/store/tcvdb/memory-store.ts:317,322`, repetido en
  varias colecciones auxiliares, líneas 360, 460, 486, 510, 534). No es
  configurable por el usuario — el modelo de embedding server-side por
  defecto es `bge-large-zh` (`MemoryCore/src/config.ts:628`:
  `embeddingModel: str(tcvdbGroup, "embeddingModel") ?? "bge-large-zh"`),
  cuya dimensión nativa es 1024, consistente con el valor fijo del índice.
- **Búsqueda híbrida nativa**: `hybridSearch()` del cliente TCVDB con
  `rerank = { method: "rrf", k: 60 }`
  (`MemoryCore/src/core/store/tcvdb/memory-store.ts:1028-1029,1049`, gemela L0
  en líneas 1411,1430) — **el mismo `k=60`** que el RRF client-side de
  SQLite/Mongo, así que el parámetro de fusión es consistente entre las tres
  rutas aunque una corre en el servidor y las otras en el proceso Node. Combina
  **dense (embedding) + sparse (BM25 vía `bm25Encoder`, client-side)** — la
  cabecera del archivo lo resume: *"Native hybridSearch (dense + sparse +
  RRFRerank) when dense embedding is enabled"* (`tcvdb/memory-store.ts:7`) y
  *"Client-side sparse vectors (BM25 local encoder; can run BM25-only without
  dense embedding)"* (`tcvdb/memory-store.ts:6`).

### 4.3 MongoDB — tercer motor, mencionado por contraste

No estaba en el alcance explícito de la tarea, pero aparece como tercer
backend en los mismos contratos (`types.ts`, `factory.ts`,
`__contract__/memory-store.contract.ts`). Se cita sólo por lo que ya delató
la lectura de `tokenize.ts`: usa `$search`/`$meta:"searchScore"` de Atlas
Search, eventualmente consistente (`__contract__/memory-store.contract.ts:20-21`),
normalizado al mismo 0–1 vía `mongoSearchScoreToScore`
(`tokenize.ts:181-197`). No se leyó `mongodb/memory-store.ts` en detalle en
este pase — declarar DESCONOCIDO su mecanismo interno completo (ver §6).

---

## 5. Qué se adopta para thyrox y qué no

thyrox quiere un contrato común sobre **Bun.SQL** para SQLite y
PostgreSQL+pgvector (MySQL después). Primer hecho medido, y gobierna toda la
tabla: **MemoryCore no usa Bun en ningún punto de la capa de store** —
`git grep -n "Bun\.\|bun:sqlite" MemoryCore/src` → 0 hits. Usa `node:sqlite`
(`DatabaseSync`, síncrono) para SQLite. Ninguna pieza de este repo es
Bun.SQL-específica ni portable 1:1 al SQL de Bun; lo que se adopta es **la
forma del contrato y sus decisiones de diseño**, no código.

| Decisión | Adoptar / No adoptar | Fuente `ruta:línea` |
|---|---|---|
| Interfaz única (`IMemoryStore`-equivalente) con métodos-núcleo obligatorios y periféricos opcionales (`?`) para que un backend degrade sin romper el tipo | **Adoptar** — encaja directo con "un contrato común sobre Bun.SQL para SQLite y Postgres+pgvector (MySQL después)": el núcleo (CRUD + vector + FTS) es obligatorio; lo que sólo Postgres/pgvector tenga nativo (p. ej. hybrid search server-side) es opcional | `MemoryCore/src/core/store/types.ts:590-606,620-629` |
| `StoreCapabilities` como vector de banderas booleanas que el caller consulta antes de usar una función avanzada | **Adoptar** — mismo patrón resuelve "SQLite no tiene X que sí tiene pgvector" sin `if (engine === …)` desperdigado | `MemoryCore/src/core/store/types.ts:250-265` |
| Selección de motor por **valor de config explícito**, no por parseo de URL | **Adoptar en parte, declarando la divergencia**: thyrox probablemente SÍ quiere resolver por URL de conexión (es el patrón de Bun.SQL: `new SQL("postgres://…")` vs `new SQL("sqlite://…")` infiere el dialecto de la cadena) — MemoryCore evita esto a propósito porque TCVDB/Mongo no son "una URL SQL". thyrox, con dos-tres motores SQL homogéneos, puede permitirse detectar por prefijo de URL y mantener el campo explícito sólo como override | `MemoryCore/src/core/store/factory.ts:57-166`; `MemoryCore/src/config.ts:498-501` |
| Suite de contrato compartida (`runMemoryStoreContract(harness)`) que cada backend concreto alimenta con un harness de `createStore`/`disposeStore` | **Adoptar** — es exactamente la forma correcta de probar "un contrato común" contra N motores sin duplicar aserciones | `MemoryCore/src/core/store/__contract__/memory-store.contract.ts:1-27,111-121` |
| Manejo explícito de backends **eventualmente consistentes** (Mongo Atlas Search) vía polling en el harness, no en el store | **Adoptar el principio** — si Postgres+pgvector con `CREATE INDEX CONCURRENTLY` o alguna réplica introduce lag, el contrato de test ya tiene el lugar donde declararlo (`ftsEventuallyConsistent`-equivalente), sin ensuciar el store con reintentos | `MemoryCore/src/core/store/__contract__/memory-store.contract.ts:20-21,78-96` |
| Migración de esquema SQLite por `try { ALTER TABLE … } catch { /* exists */ }`, sin `PRAGMA user_version` ni tabla de versión | **No adoptar tal cual** — funciona para SQLite mono-archivo con `IF NOT EXISTS`, pero no escala a Postgres con migraciones reales (transaccionales, con rollback) ni es auditable (no hay registro de qué migración corrió cuándo). thyrox debería versionar el esquema explícitamente (tabla `_migrations` o similar) para los tres motores | `MemoryCore/src/core/store/sqlite/memory-store.ts:508-512,627-630,821-824` |
| Distancia de vector fijada **en el DDL** de la tabla (`distance_metric=cosine`) en vez de en cada query | **Adoptar el principio, no la sintaxis** — pgvector fija el operador de distancia en el operador del índice (`<=>` coseno, `<->` L2, `<#>` producto interno) más que en la tabla; thyrox debe decidir un único criterio (coseno, por defecto, igual que aquí) y documentar por qué, no dejarlo implícito por motor | `MemoryCore/src/core/store/sqlite/memory-store.ts:544,666` |
| Dimensión de embedding como **parámetro variable del store**, con modo `dimensions=0` que difiere la creación de tablas vectoriales hasta que haya proveedor real | **Adoptar** — evita el problema de "creé la tabla vec0/pgvector con una dimensión placeholder y ahora no coincide"; el mismo defecto existe en pgvector (`vector(N)` es parte del tipo de columna) | `MemoryCore/src/core/store/sqlite/memory-store.ts:299,369-371`; `MemoryCore/src/config.ts:483-490` |
| Detección de **mismatch de dimensión** contra dos fuentes (metadata guardada Y la tabla vectorial real) antes de decidir si hace falta reindexar | **Adoptar** — es la defensa contra que las dos fuentes diverjan (exactamente el patrón que `metrica-decide-la-conclusion.md` de thyrox exige: no confiar en una sola fuente de "cuál es la verdad") | `MemoryCore/src/core/store/sqlite/memory-store.ts:409-470` |
| Normalización de score a escala común 0–1 con una función **por motor**, pensada para que el mismo umbral (`scoreThreshold`) sea comparable entre backends | **Adoptar directamente** — es el problema central de un contrato común: BM25 de FTS5 y `ts_rank`/`ts_rank_cd` de Postgres full-text NO están en la misma escala nativa; thyrox necesita su propio `<motor>RankToScore` por cada FTS que soporte | `MemoryCore/src/core/store/tokenize.ts:172-197` |
| RRF (Reciprocal Rank Fusion) client-side con `k=60` como estrategia por defecto cuando el motor no tiene hybrid search nativo | **Adoptar** — pgvector + `tsvector` de Postgres tampoco tienen un "hybrid search" de una sola query nativa (a diferencia de TCVDB); el patrón de "consulta FTS y vector por separado, fusiona con RRF en el llamador" es exactamente lo que Postgres+pgvector va a necesitar | `MemoryCore/src/core/store/search-utils.ts:15-18,38-62` |
| Mismo `k=60` reusado en la rama de fusión **nativa** (TCVDB) para que el resultado no sea sorpresivamente distinto según el motor | **Adoptar el criterio** (mismo hiperparámetro documentado en un solo sitio, reusado donde sea posible), aunque el mecanismo (nativo vs client-side) difiera | `MemoryCore/src/core/store/tcvdb/memory-store.ts:1028-1029,1049,1411,1430` |
| Aislamiento multi-tenant (`IsolationFilter`/`IsolationContext`) como tipo compartido entre todos los backends, con "campo ausente = no filtra esa dimensión" | **Adoptar si thyrox tiene un eje de tenancy** — es SQL estándar (`WHERE x = ? OR ? IS NULL`-equivalente) y ya está desacoplado del motor | `MemoryCore/src/core/store/isolation.ts:1-45` |
| Uso de `node:sqlite` `DatabaseSync` (síncrono) como base de la implementación SQLite | **No adoptar** — es justo lo que thyrox reemplaza con Bun.SQL; se cita para declarar la diferencia de punto de partida, no como referencia de implementación | `MemoryCore/src/core/store/sqlite/memory-store.ts:14,27,156-160,310` |
| Tercer backend "reservado en el tipo, no implementado" (`MetadataBackend` con `"mysql"` que sólo lanza) como forma de declarar un roadmap sin fingir soporte | **Adoptar la forma** para el "MySQL después" que thyrox ya declara: el tipo lo nombra desde ya, la fábrica lo rechaza con un error explícito y localizable, en vez de que MySQL aparezca implícito o ausente | `MemoryCore/src/metadata/store/interface.ts:1-12` (comentario); `MemoryCore/src/metadata/store/factory.ts:159-160` |
| Migración de **formato de datos** (v2→v3) como script Python externo y separado del código del store, con `--dry-run` y backup automático | **Adoptar el principio** (migración de datos separada del código de runtime, con modo seco y respaldo) — el lenguaje concreto (Python vs el propio stack de thyrox) no es parte de la decisión | `MemoryCore/scripts/migrate-v2-to-v3/README.md:9-33` |
| Documentar en el propio DDL qué se excluyó del esquema y por qué (`skill-store-ddl.ts`) | **Adoptar** — reduce la ambigüedad de "¿por qué no existe esta tabla?" a texto citable en vez de arqueología de commits | `MemoryCore/src/core/skill/skill-store-ddl.ts:1-16` |
| Script `.sql` de referencia declarado **no autoritativo**, dependiente de mantenerse sincronizado a mano con el código | **No adoptar tal cual** — es una fuente de verdad duplicada sin gate que la valide (el propio archivo admite el riesgo). Si thyrox emite un `.sql` de referencia, debe generarse desde el código o verificarse con un test de igualdad, no mantenerse a mano | `MemoryCore/scripts/db/sqlite-init.sql:8` |

---

## 6. Qué NO pude determinar (DESCONOCIDO)

1. **Por qué `skill_fts` usa `unicode61 remove_diacritics 1` y `l1_fts`/`l0_fts`
   usan jieba en vez de compartir tokenizador.** No se encontró comentario que
   lo explique en `skill-store-ddl.ts` ni en `memory-store.ts`. Cómo medirlo:
   `git log -p --follow -- MemoryCore/src/core/skill/skill-store-ddl.ts`
   (rango acotado, no `--all`, según la propia convención de thyrox) para ver
   si hay una discusión de diseño en el mensaje de commit; o revisar
   `docs/design/2026-06-17-skill-redesign-v2.md`, citado en la cabecera del
   propio DDL (`skill-store-ddl.ts:3`), que no se leyó en este pase.

2. **Mecanismo interno completo del backend MongoDB** (`mongodb/memory-store.ts`,
   `mongodb/search-index.ts`) — sólo se tocó de forma tangencial vía
   `mongoSearchScoreToScore` y la mención de `ftsEventuallyConsistent`. No se
   determinó cómo construye su índice `$search`, si usa un modelo de
   embedding fijo o configurable, ni su equivalente de `nativeHybridSearch`.
   Cómo medirlo: `cat MemoryCore/src/core/store/mongodb/memory-store.ts
   MemoryCore/src/core/store/mongodb/search-index.ts`.

3. **Si existe algún mecanismo de migración de datos ENTRE backends**
   (SQLite→TCVDB, TCVDB→Mongo, etc.), más allá del `v2-to-v3-migrate.py` que
   opera dentro de SQLite. No se localizó ninguno con
   `git grep -rn "tcvdb.*sqlite\|migrate.*backend" MemoryCore/scripts
   MemoryCore/src` en este pase (comando no ejecutado exhaustivamente — sólo
   se leyó el README de `migrate-v2-to-v3/`). Cómo medirlo: correr ese
   `git grep` y, si hay hits, leer los archivos correspondientes.

4. **Si `profile-row-store.ts` (`MemoryCore/src/core/store/profile-row-store.ts`)
   define un tercer contrato/interfaz** (`IProfileRowStore`, mencionado en
   `types.ts:262-264` y usado como `isProfileRowStore(store)` en el contrato
   compartido) con su propia forma independiente de `IMemoryStore`. Se vio
   citado pero no se leyó el archivo. Cómo medirlo:
   `cat MemoryCore/src/core/store/profile-row-store.ts`.

5. **Detalle exacto de la fórmula de score en TCVDB** (si el `hybridSearch`
   nativo devuelve un score ya normalizado a 0–1, o si hay una conversión
   adicional en `tcvdb/memory-store.ts` no cubierta por
   `bm25RankToScore`/`mongoSearchScoreToScore`). Se confirmó que usa
   `rerank: {method: "rrf", k: 60}` pero no se leyó cómo se transforma el
   score de retorno del cliente TCVDB antes de llenar `L1SearchResult.score`.
   Cómo medirlo: `sed -n '990,1070p' MemoryCore/src/core/store/tcvdb/memory-store.ts`
   y seguir el flujo de `resp` hasta el mapeo final.

6. **Si hay algún gate/test que compare `sqlite-init.sql` contra
   `sqlite-adapter.ts::createSchema()` para detectar drift** entre el script
   de referencia y el código autoritativo. No se buscó explícitamente. Cómo
   medirlo: `git grep -rn "sqlite-init" MemoryCore/scripts MemoryCore/src
   MemoryCore/tests` (si existe directorio de tests).
