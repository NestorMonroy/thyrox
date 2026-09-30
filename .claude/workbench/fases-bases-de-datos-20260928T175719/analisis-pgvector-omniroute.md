# pgvector y OmniRoute — capacidad vectorial para el contrato de base de thyrox

Fecha: 2026-09-28T18:07:46 (`date -u`)
Referencias, sólo lectura:
- `pgvector: /home/user/nestormonroy/pgvector` @ `7db2345ed99bc77bf33cbdc8b12bd1973210dc8`, 2026-09-22
- `omniroute: /home/user/nestormonroy/omniroute` @ `a58000c7685f4091c7a6fd8ddf3ebce7d2ec67c3`, 2026-09-27
- Extensión instalada en este contenedor: `vector--0.6.0.sql` (`/usr/share/postgresql/16/extension/`), `default_version` del repo pgvector = `0.8.6` (`vector.control:2`)

## A — pgvector: README (0.8.6) vs 0.6.0 instalada

### A.0 Método de comparación

El repo `pgvector` no versiona un `vector--0.6.0.sql` de snapshot (sólo diffs `vector--X--Y.sql` entre versiones consecutivas); el snapshot de 0.6.0 vive en el sistema, generado por el paquete instalado:
`/usr/share/postgresql/16/extension/vector--0.6.0.sql`. Se buscó ahí la presencia literal de cada símbolo que el README (HEAD del repo) documenta, y se localizó el archivo de upgrade del repo donde aparece por primera vez:

```
$ grep -c "halfvec\|sparsevec\|hamming_distance\|l1_distance\|l2_normalize\|binary_quantize\|subvector" \
    /usr/share/postgresql/16/extension/vector--0.6.0.sql
1   # el único hit es l1_distance (ver tabla)
$ grep -l "halfvec" pgvector/sql/vector--*.sql | sort -V | head -1
vector--0.6.2--0.7.0.sql
```

Confirma exactamente lo que el propio README declara en su columna **Added** (`README.md:966-1074`): la tabla de Reference ya lleva versión por símbolo, y la medición contra el `.sql` instalado la corrobora en vez de asumirla.

### A.1 Qué NO existe en 0.6.0 (y sí en el README/HEAD)

| Símbolo/tipo | README (Added) | Primer archivo `sql/` donde aparece | En 0.6.0 instalada |
|---|---|---|---|
| tipo `halfvec` | 0.7.0 | `sql/vector--0.6.2--0.7.0.sql` | **no** |
| tipo `sparsevec` | 0.7.0 | `sql/vector--0.6.2--0.7.0.sql` | **no** |
| operadores `<~>` (Hamming), `<%>` (Jaccard) sobre `bit` | 0.7.0 | `sql/vector--0.6.2--0.7.0.sql` | **no** |
| `hamming_distance`, `jaccard_distance` | 0.7.0 | `sql/vector--0.6.2--0.7.0.sql` | **no** |
| `binary_quantize(vector)→bit` | 0.7.0 | `sql/vector--0.6.2--0.7.0.sql` | **no** |
| `subvector()` | 0.7.0 | `sql/vector--0.6.2--0.7.0.sql` | **no** |
| `l2_normalize()`, `l2_norm()` | 0.7.0 | `sql/vector--0.6.2--0.7.0.sql` | **no** |
| operador `\|\|` (concat) sobre `vector`/`halfvec` | 0.7.0 | ya existía como operador desde 0.1.x para otro propósito, pero la concatenación de vectores es de 0.7.0 (README `README.md:966`) | **no** para vectores |
| operador `<+>` (L1/taxicab) | 0.7.0 | `sql/vector--0.6.2--0.7.0.sql` | **no** (el operador; la función sí) |
| iterative index scans (`hnsw.iterative_scan`, `hnsw.max_scan_tuples`, `ivfflat.iterative_scan`, `ivfflat.max_probes`) | **0.8.0** | son GUCs de C, no hay `.sql` — README `README.md:481` lo fecha en 0.8.0 | **no** |
| `hnsw.scan_mem_multiplier` | ≥0.8.0 | ídem, GUC de C | **no** |
| casts array→`sparsevec` | 0.8.0 | `sql/vector--0.7.4--0.8.0.sql` | **no** (sparsevec no existe) |

| Símbolo/tipo | Añadido | ¿En 0.6.0? |
|---|---|---|
| `l1_distance(vector,vector)` (función, sin operador `<+>`) | 0.5.0 | **sí** — único hit del grep de arriba (`vector--0.6.0.sql:43`) |
| `vector`, operadores `<->`,`<#>`,`<=>`, `+`,`-`,`*` | base / 0.5.0 | **sí** |
| `avg(vector)`, `sum(vector)` | ≤0.5.0 | **sí** |
| HNSW e IVFFlat (los dos tipos de índice para `vector`) | HNSW desde 0.5.0, IVFFlat desde 0.1.0 | **sí** |
| `WITH (m=…, ef_construction=…)` para HNSW, `SET hnsw.ef_search` | ≤0.5.1 | **sí** |
| `WITH (lists=…)` para IVFFlat, `SET ivfflat.probes` | base | **sí** |

**Conclusión de A.0-A.1:** la instalación local sólo tiene `vector` (float32, hasta 16 000 dimensiones según Reference actual, límite de índice 2000), HNSW/IVFFlat sobre `vector`, y las funciones/operadores de distancia base. **No tiene** `halfvec`, `sparsevec`, `bit`-distances, `binary_quantize`, ni iterative index scans. Un `CREATE INDEX ... USING hnsw (embedding halfvec_l2_ops)` o un `SET hnsw.iterative_scan = ...` fallarían aquí.

### A.2 Tipos

- **`vector`** — float32, `4*dim+8` bytes; hasta 16 000 dimensiones en general, **2000 para indexar con HNSW/IVFFlat** (`README.md:246-249`). Disponible en 0.6.0.
- **`halfvec`** — float16, `2*dim+8` bytes, hasta 16 000 dims, **4000 para indexar**. `README.md:246-249`. Desde 0.7.0 → **no disponible en 0.6.0**.
- **`sparsevec`** — `8*nnz+16` bytes, hasta 16 000 elementos no-cero en general, **1000 no-cero para indexar**. `README.md:246-249`. Desde 0.7.0 → **no disponible**.
- **`bit`** — tipo nativo de Postgres, reusado por pgvector para Hamming/Jaccard; hasta 64 000 dims para indexar. `README.md:246-249`. El tipo `bit` en sí es de Postgres (siempre disponible); los **operadores de distancia** (`<~>`,`<%>`) y las funciones son las que llegan en 0.7.0.

### A.3 Operadores de distancia (`README.md:161-170`)

| Operador | Distancia | Tipos | Desde |
|---|---|---|---|
| `<->` | L2 (Euclidiana) | vector, halfvec, sparsevec | base |
| `<#>` | producto interno negativo | vector, halfvec, sparsevec | base |
| `<=>` | coseno | vector, halfvec, sparsevec | base |
| `<+>` | L1 (taxicab) | vector, halfvec, sparsevec | 0.7.0 |
| `<~>` | Hamming | bit | 0.7.0 |
| `<%>` | Jaccard | bit | 0.7.0 |

### A.4 Índices — HNSW e IVFFlat

**HNSW** (`README.md:206-333`): grafo multicapa, mejor recall/velocidad que IVFFlat en consulta, build más lento y más memoria; se puede crear sin datos en la tabla (no hay paso de entrenamiento). Parámetros de construcción (`WITH`, `README.md:257-269`):
- `m` — máx. conexiones por capa, default 16
- `ef_construction` — tamaño de la lista de candidatos en build, default 64 (más alto → mejor recall, build más lento)

Parámetro de consulta (`README.md:270-288`):
- `hnsw.ef_search` — tamaño de la lista de candidatos en búsqueda, default 40 (`SET hnsw.ef_search = 100`, o `SET LOCAL` dentro de una transacción)

**IVFFlat** (`README.md:334-423`): divide en listas y sólo busca en un subconjunto; build más rápido, menos memoria, peor recall/velocidad de consulta. Recomendaciones (`README.md:339-343`):
- crear el índice **después** de cargar datos
- `lists` ≈ `rows/1000` (hasta 1M filas) o `sqrt(rows)` (>1M filas)
- `probes` ≈ `sqrt(lists)` en consulta

Parámetros:
- `WITH (lists = N)` en `CREATE INDEX`
- `ivfflat.probes` — número de sondas por consulta, default 1 (`SET ivfflat.probes = 10`)
- `ivfflat.max_probes` — tope para el escaneo iterativo (0.8.0+)

Límites de dimensión por índice (`README.md:246-249`, tabla repetida para HNSW y para IVFFlat):

| Tipo | Límite para indexar |
|---|---|
| `vector` | 2000 dims |
| `halfvec` | 4000 dims |
| `bit` | 64 000 dims |
| `sparsevec` (sólo HNSW) | 1000 elementos no-cero |

### A.5 Filtrado + ANN: iterative index scans

Con índice aproximado, el filtro (`WHERE`) se aplica **después** del escaneo del índice (`README.md:424-467`), así que con `hnsw.ef_search` default de 40 y un filtro que matchea el 10% de filas, sólo ~4 resultados salen en promedio. **Iterative index scans**, desde **0.8.0** (`README.md:478-482`), hacen que el escaneo siga ampliándose hasta cubrir `hnsw.max_scan_tuples` (20 000 por defecto, `README.md:522-533`) o `ivfflat.max_probes` (`README.md:540-549`).

Dos modos (`README.md:484-495`):
- **`strict_order`** — resultados en orden exacto por distancia
- **`relaxed_order`** — orden ligeramente relajado, mejor recall; con un CTE `MATERIALIZED` se recupera el orden estricto (`README.md:497-501`; en Postgres 17+ hace falta `+ 0` para forzar la materialización, `README.md:503`)

Recomendación de la propia fuente para filtrar por distancia: CTE `MATERIALIZED` con el filtro de distancia **fuera** de él (`README.md:505-514`), por el comportamiento actual del planner de Postgres citado en el propio README.

Ninguno de estos GUCs (`hnsw.iterative_scan`, `hnsw.max_scan_tuples`, `hnsw.scan_mem_multiplier`, `ivfflat.iterative_scan`, `ivfflat.max_probes`) existe en 0.6.0: son C-level, cableados en el binario de la extensión, y 0.6.0 no los registra.

### A.6 Búsqueda híbrida con FTS de Postgres

`README.md:633-643`: usar junto con full-text search nativo (`plainto_tsquery`, `ts_rank_cd`) y combinar resultados con Reciprocal Rank Fusion o un cross-encoder — la propia fuente remite a ejemplos externos en `pgvector-python`, no trae RRF empaquetado en SQL. Es decir: pgvector da el operador de distancia y dos consultas independientes (FTS + ANN); la fusión de rankings es responsabilidad del cliente.

### A.7 Consejos de carga

- `COPY items (embedding) FROM STDIN WITH (FORMAT BINARY)` — carga masiva en binario (`README.md:107-111`, repetido en `README.md:690-696`)
- Crear el índice **después** de cargar los datos iniciales (regla general para HNSW e IVFFlat, y explícita para IVFFlat en `README.md:339`)
- `CREATE INDEX CONCURRENTLY` en producción para no bloquear escrituras (`README.md:703-706`)
- Subir `maintenance_work_mem` para que el grafo HNSW quepa en memoria durante el build (`README.md:291-300`); subir `max_parallel_maintenance_workers` (default 2) y, si hacen falta más workers, `max_parallel_workers` (default 8) — `README.md:307-316`, `README.md:399-405`
- Usar `binary_quantize` para builds más rápidos a escala (`README.md:318-320`) — no disponible en 0.6.0

## B — OmniRoute: contrato de adaptador SQLite y migraciones

### B.1 El contrato (`src/lib/db/adapters/types.ts:1-36`)

`SqliteAdapter` es **síncrono**, no async — `prepare().run()/.get()/.all()` devuelven directamente, sin `Promise` (`types.ts:12-35`). Declara:
- `driver: "better-sqlite3" | "node:sqlite" | "bun:sqlite" | "sql.js"` (`types.ts:13`) — **sólo variantes de SQLite; no hay driver de Postgres**
- `transaction()` (DEFERRED) e `immediate()` (IMMEDIATE, adquiere el lock de escritura de inmediato) — `types.ts:23-27`
- `backup()`, `checkpoint()`, `close()`, y `raw` para escapar al objeto nativo del driver (`types.ts:29-35`)

### B.2 Cómo elige el controlador (`driverFactory.ts`)

`createSyncDriverFactory()` (`driverFactory.ts:206-282`) arma una **cascada síncrona try/catch**, en este orden (`driverFactory.ts:216-281`):
1. `bun:sqlite` si `process.versions.bun` está presente (`driverFactory.ts:217-233`)
2. `better-sqlite3` en Node, salvo build de Next.js y salvo que la sonda de Windows (`createBetterSqliteProbe`, `driverFactory.ts:44-77`) diga que puede colgarse (`driverFactory.ts:239-254`)
3. `node:sqlite`, nativo desde Node ≥22.5 (`driverFactory.ts:257-278`)
4. si los tres fallan, `openDatabaseAsync()` (`driverFactory.ts:365-378`) cae a `sql.js` (WASM), la única rama realmente asíncrona (`preInitSqlJs`, `driverFactory.ts:315-354`)

Detalle notable citado en el propio código: el loader se pasa como parámetro (`load: DriverLoader`) en vez de importarse directo, porque webpack necesita ver el `require("<literal>")` en el sitio de la llamada para no reemplazarlo por un stub de "módulo no encontrado" (`driverFactory.ts:81-105`) — es un problema de *bundling*, no de runtime.

**No hay ninguna rama de Postgres.** El grep de tipos, adaptadores y migraciones no encuentra ningún driver ni URL `postgres://`/`postgresql://` en `src/lib/db/adapters/` ni en `migrationRunner.ts`: el contrato entero es mono-motor (SQLite, en sus cuatro variantes de driver).

### B.3 Cómo versiona migraciones (`migrationRunner.ts`)

- Convención de nombre: `NNN_description.sql` (`migrationRunner.ts:7`)
- Tabla de seguimiento `_omniroute_migrations(version TEXT PRIMARY KEY, name TEXT, applied_at TEXT)` (`migrationRunner.ts:170-179`)
- `getMigrationFiles()` lee el directorio, filtra `.sql`, ordena por nombre de archivo y extrae versión con `^(\d+)_(.+)\.sql$` (`migrationRunner.ts:216-234`)
- **Detecta colisiones de versión** entre dos archivos con el mismo prefijo numérico — si no se detectara, sólo el primero se aplicaría y el resto se saltaría en silencio (`migrationRunner.ts:236-260`)
- Cada archivo corre dentro de **su propia transacción** ("all-or-nothing per file", `migrationRunner.ts:9`); `runMigrations()` (`migrationRunner.ts:787+`) calcula primero qué migraciones están pendientes de forma **read-only** para no tomar el lock de escritura si no hay nada que hacer (`migrationRunner.ts:821-830`), y sólo entra a una transacción `IMMEDIATE` cuando sí hay trabajo (`migrationRunner.ts:864-903`)
- Toma un **backup previo** (`createPreMigrationBackup`) antes de aplicar migraciones sobre una base existente, salvo bases nuevas (`migrationRunner.ts:838-861`, `896-903`)
- Detecta "mass-migration" (demasiadas migraciones pendientes de golpe en una base existente) como señal de que la tabla de tracking se perdió — umbral configurable por `OMNIROUTE_MAX_PENDING_MIGRATIONS` (`migrationRunner.ts:112-119` y su uso posterior)
- Migraciones opcionales condicionadas a capacidad del motor: `OPTIONAL_FTS5_MIGRATION_VERSIONS` se difieren si `supportsFts5(db)` prueba con una tabla virtual `fts5` temporal y falla (`migrationRunner.ts:181-206`) — mismo patrón de "capacidad opcional, detectada en runtime" que haría falta para pgvector.

### B.4 Embeddings/vectores en OmniRoute — SÍ existen, con dos mecanismos

```
$ git grep -li "sqlite-vec\|qdrant\|pinecone\|pgvector\|weaviate\|milvus\|faiss" -- '*.ts' | grep -v tests/ | wc -l
17
```

- **Motor local por defecto: `sqlite-vec`** (extensión de SQLite, no pgvector). `src/lib/db/migrations/083_memory_vec.sql:2-4` lo declara explícito: *"the actual virtual table `vec_memories(memory_id INTEGER, embedding float[N])` is created in runtime by `src/lib/memory/vectorStore.ts` because N depends on the active embedding model"*. La tabla `memory_vec_meta` (`083_memory_vec.sql:6-13`) sólo guarda metadatos (`active_dim`, `embedding_signature`, `vec_loaded`) — la tabla vectorial en sí **no se crea por migración versionada**, se crea perezosamente cuando se conoce la dimensión (`vectorStore.ts:151-199`).
- `vectorStore.ts:1-8` documenta explícitamente por qué esto rompe su propia regla de "SQL crudo sólo en `src/lib/db/`": el DDL de la tabla `vec0` es dinámico (la dimensión varía con el modelo de embedding activo), así que vive fuera del módulo de dominio DB.
- Particularidad citada del driver `vec0` v0.1.9: rechaza rowids no-`BigInt` para PKs nombradas (`vectorStore.ts:5-8`, `217-218`), y **no soporta `INSERT OR REPLACE`** — el upsert se hace con `DELETE` + `INSERT` (`vectorStore.ts:218`).
- Búsqueda híbrida propia: `vectorStore.ts:305` cita como referencia el mismo patrón que pgvector documenta (FTS + ANN), con una nota de `sanitizeFts5Query` y RRF (`vectorStore.ts` importa `sanitizeFts5Query` de `./retrieval/scoring`, `vectorStore.ts:15`).
- **Motor remoto opcional: Qdrant.** `src/lib/memory/qdrant.ts`, `src/app/api/settings/qdrant/{route,health,search,cleanup}.ts` — un servicio vectorial externo, alternativo/complementario al `sqlite-vec` local.

## C — Implicaciones para un contrato común SQLite/PostgreSQL con capacidad vectorial opcional

### C.0 Dónde vive hoy el contrato asíncrono de thyrox

`src/packages/local-observability/src/errorStore/` es el precedente real y ya construido en este árbol:
- `dialect.ts:1-37` aísla las tres diferencias de tipo entre motores bajo `Bun.SQL` (id numérico vs `BIGINT`-como-texto, timestamp texto vs `Date`, JSON-texto vs `JSONB` objeto)
- `errorStore.ts:9-49` define una interfaz async (`record/list/purgeOlderThan/migrate`, todas `Promise<...>`) implementada **una sola vez** sobre el objeto `SQL` de `bun`, parametrizada por `dialect`
- `migrations.ts:1-9` documenta explícitamente el mismo mecanismo de OmniRoute (migraciones versionadas, una transacción por versión, tabla de seguimiento) con DDL **por motor** cuando no es portable

Ese es el patrón sobre el que hay que decidir cómo cuelga pgvector.

### C.1 Opciones

**Opción 1 — capacidad detectada en runtime, igual que `supportsFts5` de OmniRoute.**
Antes de crear la columna/índice vectorial, `SELECT 1 FROM pg_extension WHERE extname='vector'` (o `CREATE EXTENSION IF NOT EXISTS vector` con try/catch) en el dialecto Postgres; en SQLite, la migración se marca `deferredUnsupported` sin más — igual que `OPTIONAL_FTS5_MIGRATION_VERSIONS` (`migrationRunner.ts:181-206`).
- *Ventaja:* mismo mecanismo que ya existe en OmniRoute y que thyrox ya documenta que imita (`migrations.ts:3`); no exige tocar el contrato `ErrorStore`-like, sólo añadir una migración condicional.
- *Trade-off:* el código que consulta necesita dos caminos (con índice ANN en Postgres, sin índice — o con `sqlite-vec` — en SQLite), así que la interfaz de la tabla que use vectores no puede prometer las mismas garantías de rendimiento en los dos motores. Es exactamente la asimetría que OmniRoute acepta para FTS5.

**Opción 2 — replicar el patrón de OmniRoute: motor vectorial *local* propio para SQLite, pgvector para Postgres, dos implementaciones detrás de una interfaz común.**
Para SQLite, cargar `sqlite-vec` (extensión C cargable vía `sqlite3_load_extension`, disponible para `bun:sqlite`/`better-sqlite3`/`node:sqlite`) igual que hace `vectorStore.ts`; para Postgres, `pgvector`. La interfaz común (`upsertVector`, `search`, `deleteVector`, ...) es la misma forma que `VectorStore` de OmniRoute (`vectorStore.ts` — no leído completo en este pase, pero su forma pública es visible por los métodos citados: `ensureReady`, `upsertVector`, `deleteVector`, búsqueda con distancia + score).
- *Ventaja:* recall/velocidad comparables en los dos motores, sin degradar SQLite a "búsqueda vectorial sin índice".
- *Trade-off:* dos extensiones nativas que mantener y cargar (Bun.SQL para SQLite no expone `loadExtension` de forma directa — **DESCONOCIDO**, ver D); duplica lógica de indexación (HNSW por un lado, el índice de `sqlite-vec`, que es fuerza bruta/IVF según versión, por otro) con parámetros distintos por motor.

**Opción 3 — sin capacidad vectorial nativa en SQLite; fuerza bruta en aplicación.**
En SQLite se guarda el vector serializado (BLOB o JSON) y la distancia se calcula en JS/TS sobre las filas ya filtradas por SQL; en Postgres, pgvector con índice. El contrato expone `search()` igual en ambos, pero el SQLite lento por diseño para tablas grandes.
- *Ventaja:* cero dependencias nativas nuevas para SQLite; el código de aplicación es trivial de auditar.
- *Trade-off:* no escala — es aceptable sólo si el caso de uso en SQLite es de pocos miles de filas (memoria de sesión local, por ejemplo), no un índice de documentación de 55+ documentos vectorizados.

**Opción 4 — capacidad vectorial vive fuera del contrato de base común, como servicio aparte (tipo Qdrant en OmniRoute).**
El contrato `Bun.SQL` sqlite/postgres se queda exactamente como está (sin tocar `dialect.ts`/`ErrorStore`), y la búsqueda semántica es un servicio HTTP separado (Qdrant embebido o remoto) que ambos motores consultan igual.
- *Ventaja:* no ensucia el contrato relacional; el precedente de OmniRoute (motor local + Qdrant opcional) ya valida esta partición en producción.
- *Trade-off:* introduce un proceso/dependencia adicional que gestionar (arranque, persistencia, backup) fuera del ciclo de vida de la base SQLite/Postgres que este árbol ya administra.

### C.2 Recomendación preliminar

**(preliminar — no verificada contra el uso real que thyrox planea darle a la capacidad vectorial, que este análisis no conoce)**

La combinación de **Opción 1 + Opción 2 acotada** parece la que menos rompe el contrato existente y más se ajusta a lo que las dos referencias ya prueban en producción:

1. Mantener `dialect.ts`/`migrations.ts` como están; añadir una tercera pieza de capacidad (`vectorCapability.ts`, paralelo a `dialect.ts`) que:
   - en Postgres, intente `CREATE EXTENSION IF NOT EXISTS vector` y registre la versión instalada (medida, no asumida — como este mismo informe tuvo que medir 0.6.0 contra el README);
   - en SQLite, intente cargar `sqlite-vec` si está disponible.
2. Si ninguna de las dos está disponible, la migración de la tabla vectorial se difiere (`deferredUnsupported`, igual que FTS5 en OmniRoute) y el contrato lo declara explícitamente en su tipo de retorno (`ready: boolean; reason: string}`, que es exactamente lo que `VectorStore.ensureReady` de OmniRoute ya devuelve).
3. **No** replicar el catálogo completo de pgvector (halfvec/sparsevec/bit/iterative scans) desde el primer corte: la versión instalada localmente (0.6.0) ni siquiera los tiene, y el consumidor real tendría que declarar primero si necesita esos tipos antes de portarlos — sería un porte parcial no declarado si se documentan como soportados sin estarlo (regla del consumidor `porte-completo-no-parcial.md`, que no rige aquí pero cuya lógica aplica igual).
4. Empezar por el subconjunto que **ambos** motores cubren con garantías comparables: `vector`/float32, distancia coseno/L2, HNSW en Postgres y el índice nativo de `sqlite-vec` en SQLite — que es justo el subconjunto en el que la Opción 2 no exige mantener dos catálogos de tipos divergentes.

## D — DESCONOCIDOS

- **¿`Bun.SQL` expone carga de extensiones nativas (`sqlite3_load_extension`) para el dialecto SQLite?** No se verificó en este pase — necesario para saber si `sqlite-vec` es siquiera cargable bajo el mismo objeto `SQL` que usa `errorStore.ts`, o si haría falta una conexión `bun:sqlite` aparte sólo para esa tabla (como hace OmniRoute, que usa su propio `SqliteAdapter` síncrono, no `Bun.SQL`).
- **¿`pgvector` 0.8.6 (el HEAD del repo, o cualquier versión ≥0.7.0) es instalable en este contenedor sin privilegios de root sobre el paquete del sistema?** Sólo se confirmó que 0.6.0 está instalado vía el paquete de Debian/Ubuntu (`/usr/share/postgresql/16/extension/`); no se intentó compilar ni instalar una versión más nueva.
- **El resto de `vectorStore.ts` de OmniRoute** (líneas fuera de las citadas: `search()`, el cálculo de RRF completo, `ensureReady()` entero) no se leyó línea por línea — sólo se citan los fragmentos relevantes a tipo/DDL/upsert/hallazgo de hallazgo mencionados arriba.
- **Si `CREATE EXTENSION vector` realmente corre sin error en este contenedor** (el enunciado de la tarea lo da como hecho) — no se ejecutó en este pase para no dejar estado en una base compartida sin saber si eso afecta otra sesión; se tomó como dado según la instrucción del llamador.
- **Rendimiento comparado real** entre `sqlite-vec` y pgvector/HNSW sobre el mismo corpus — ninguna de las dos referencias trae una medición cruzada; la Opción 2 asume recall/velocidad "comparables" sin haberlo medido.
