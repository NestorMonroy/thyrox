# Persistencia en MemoryProxy / MemoryKnowledge / MemoryPanel — qué sirve para el contrato async de thyrox

Repositorio: `/home/user/nestormonroy/tencentdb-agent-memory`, commit `29bb8dffa9b11617316d50f21d7a8af9f47240be` (medido con `git log -1 --format="%H %ci"`, fecha del commit `2026-09-28 19:27:14 +0800`). Sólo lectura — no se ha hecho `git add`/`commit` en ese repo.

Contexto del encargo: thyrox está migrando sus stores (hoy `bun:sqlite` síncrono, ~12 paquetes) a un contrato asíncrono sobre `Bun.SQL` para SQLite + PostgreSQL(+pgvector), MySQL después. Ya existe el precedente propio de una base de errores local (`errors` + `error_actions`, `error_type` clasificado, migraciones versionadas por dialecto). Este documento evalúa qué patrones de este repo son portables a ese contrato.

## 1. Por paquete: qué persiste y dónde

### MemoryProxy

| Qué | Dónde vive | Motor | Cita |
|---|---|---|---|
| Sesiones (session_id, agent/task/session detail JSON, state) | tabla `sessions` | SQLite (`better-sqlite3`) — sólo si `storage.backend=sqlite` | `MemoryProxy/src/db/schema.ts:20-39` |
| Caché de bloques de inyección por hook | tabla `hook_cache` (FK a `sessions`, `ON DELETE CASCADE`) | SQLite | `MemoryProxy/src/db/schema.ts:44-51` |
| KV genérico de la capa de inyección/skill (`inj:*`, `sk:*`, `vpin:*`) | tabla `proxy_kv` (k/v/bucket/updated_at) — **el mismo esquema se implementa también sobre COS, filesystem y memoria** | SQLite / COS / FS / memoria, elegible en runtime | `MemoryProxy/src/storage/sqlite-storage.ts:19-27`; el KV por defecto histórico es Redis, `MemoryProxy/config.example.yaml:111-126` |
| Uso/costo por turno (tokens, credit, modelo) | tabla `usage_logs` | ClickHouse (`MergeTree`, `ORDER BY (user_id, session_key, timestamp)`) | `MemoryProxy/src/clickhouse.ts:219-252` |
| Uso no reconocido / formato no-TokenHub (traza cruda) | tabla `usage_raw` | ClickHouse | `MemoryProxy/src/clickhouse.ts:264-286` |
| Telemetría interna — sesiones iniciadas | tabla `session_init_logs` | ClickHouse (TTL 90 días) | `MemoryProxy/src/clickhouse.ts:940-941,1283-1306` |
| Telemetría interna — llamadas a herramienta | tabla `tool_call_logs` | ClickHouse (TTL 90 días) | `MemoryProxy/src/clickhouse.ts:1307-1335` |

### MemoryKnowledge

| Qué | Dónde vive | Motor | Cita |
|---|---|---|---|
| Metadatos de grafo de código por equipo/repo (con soft-delete `deleted_at`, `version`) | tabla `knowledge_code_graph` | SQLite vía Drizzle | `MemoryKnowledge/src/db/client.ts:52-81` |
| Metadatos de wiki (con soft-delete, `version`) | tabla `knowledge_wiki` | SQLite vía Drizzle | `MemoryKnowledge/src/db/client.ts:83-111` |
| Auditoría de cambios de wiki / code-graph (append-only, `version DESC`) | `knowledge_wiki_audit`, `knowledge_code_graph_audit` | SQLite vía Drizzle | `MemoryKnowledge/src/db/client.ts:113-141` |
| Binding de LLM por servicio (proxy/base_url/api_key/model) | tabla `llm_binding` | SQLite vía Drizzle | `MemoryKnowledge/src/db/client.ts:143-152` |
| Índice de búsqueda **por wiki** (FTS5, metadatos de página, grafo de aristas, control de ingesta incremental por archivo) | un `index.db` **propio por wiki**, junto al `.md` en disco | SQLite crudo (`better-sqlite3`), fuera de Drizzle | `MemoryKnowledge/src/engines/wiki/index-db.ts:1-138` |
| Telemetría de llamadas puente (bridge tool calls) | tabla `tool_call_logs` propia (namespace distinto del de MemoryProxy) | ClickHouse, escrito por `fetch` crudo sin SDK | `MemoryKnowledge/src/clickhouse-telemetry.ts:127-159` |

### MemoryPanel

| Qué | Dónde vive | Motor | Cita |
|---|---|---|---|
| Auditoría de cada llamada API del panel (instance/user/endpoint/status/duración) | tabla configurable (`PANEL_CLICKHOUSE_TABLE`, default `panel_api_call_logs`) | ClickHouse, `fetch` crudo | `MemoryPanel/src/panel/infra/api-call-telemetry.ts:222-232` |
| Metadatos de versión del backfill (`telemetry_meta`) | tabla `telemetry_meta` (ReplacingMergeTree por `key`) | ClickHouse | `MemoryPanel/src/panel/infra/api-call-telemetry.ts:288-293` |
| Registro de instancias/API keys del gateway | archivo JSON local (`config/metadata-instances.json`), **no** en base de datos | filesystem | `MemoryPanel/.env.example:16-21` |

### MemoryCore (no pedido en el encargo, pero es donde vive el contrato multi-dialecto real — se incluyó porque responde directamente al eje "abstracción + selección de backend")

| Qué | Dónde vive | Motor | Cita |
|---|---|---|---|
| Entidades de negocio (users, teams, agents, tasks, assets, ACL, config params) | tablas `meta_*` detrás de `IMetadataStore` | SQLite (`node:sqlite`, `DatabaseSync`) **o** MongoDB, elegible por config; MySQL reservado sin implementar | `MemoryCore/src/metadata/store/interface.ts:1-12,229`; `MemoryCore/src/metadata/store/factory.ts:140-169` |
| Skills versionados | detrás de `ISkillStore` | SQLite (standalone) o TCVDB (servicio) | `MemoryCore/src/core/skill/skill-store.interface.ts:1-10` |

## 2. Abstracción de storage y selección de backend

Hay **dos familias de abstracción**, con criterios de selección distintos, y las dos son relevantes para el contrato de thyrox:

### 2.a `ProxyStorage` (MemoryProxy) — KV puro, cadena de degradación

Interfaz `putJSON/putText/putJSONIfAbsent/putTextIfAbsent/getJSON/getText/exists/del/delPrefix/listNames`, todos `Promise<...>` (`MemoryProxy/src/storage/proxy-storage.ts:19-37`), con cuatro implementaciones: `CosStorage`, `SqliteStorage`, `FsStorage`, `MemoryStorage`.

Selección de backend (`MemoryProxy/src/storage/factory.ts:119-191`):
- viene de config (`storage.backend: cos|sqlite|fs|memory`), no de una URL de conexión;
- **`cos` es el único backend "correcto" en multi-nodo y se le prohíbe degradar**: si falla su ensamblaje, se propaga el error y el proceso no arranca (`factory.ts:131-150`, con el comentario explícito de por qué: evitar que dos nodos escriban en storages locales distintos y se lean vacíos entre sí);
- para el resto (`sqlite`, `fs`, `memory`) hay **cadena de degradación explícita** `cos → sqlite → fs → memory` (`factory.ts:153-181,232-237`), cada salto se loguea en `console.error` con la marca `!!! DEGRADED !!!` y, si el backend efectivo es local, además `!!! MULTI-NODE HAZARD !!!`;
- el estado efectivo vs solicitado se expone para observabilidad (`getEffectiveBackend()`, `factory.ts:193-195`), consumido por `/health`.

**Relevancia para thyrox:** el patrón "config declara backend preferido, hay cadena de fallback con log de severidad creciente y el estado efectivo se puede leer en runtime" es aplicable si thyrox algún día quiere un fallback SQLite→archivo para desarrollo. No es aplicable tal cual al eje SQLite/Postgres/MySQL de thyrox porque ahí los tres son *elegidos*, no una cadena de degradación — más cercano al patrón de la sección 2.b.

### 2.b `IMetadataStore` (MemoryCore) — contrato relacional multi-dialecto, con test de contrato compartido

Este es el patrón que más se parece al problema declarado por thyrox (SQLite + Postgres, MySQL después, contrato único):

- **Un solo tipo `MaybePromise<T> = T | Promise<T>`** (`MemoryCore/src/metadata/store/interface.ts:57`) declarado en la interfaz de cada método. Permite que la implementación SQLite (síncrona por dentro, con `node:sqlite` `DatabaseSync`) exponga la misma firma que la implementación Mongo (asíncrona), y el llamador **siempre** hace `await`. Es exactamente el mecanismo de transición que thyrox necesita: no hay que reescribir cada consumidor el mismo día que se introduce el driver asíncrono — el consumidor ya asume `await` desde el principio, y el adaptador decide si retorna valor o promesa.
- **Selección de backend por variable de entorno, con exclusividad validada al arrancar** (`factory.ts:39-101`): `TDAI_METADATA_MONGO_URI` presente → mongodb; si no, sqlite; las dos a la vez → `MetadataStartupValidationError` en el arranque (fail-fast, no en el primer request). Portable directo: thyrox podría usar `DATABASE_URL` con el prefijo del dialecto (`postgres://`, `mysql://`, ausente → sqlite) y rechazar al arrancar si hay señales contradictorias (p. ej. `DATABASE_URL` de Postgres + una ruta de archivo SQLite explícita).
- **Deploy mode que endurece la validación**: en modo `service` se exige Mongo explícitamente (`validateMetadataStartupConfig`, `factory.ts:111-131`) — separa "qué backends admite el código" de "qué backend exige este modo de despliegue".
- **`case "mysql": throw new Error("MySQL backend not yet implemented")`** (`factory.ts:164-165`) — el tercer dialecto está en el *type* (`MetadataBackend = "sqlite" | "mongodb" | "mysql"`, `interface.ts:229`) antes de tener implementación. Es el patrón exacto para "MySQL después": el contrato ya lo nombra, el switch ya lo enumera, y la ausencia de implementación es un error explícito y localizado, no un caso que el switch calla.
- **Suite de contrato única, parametrizada por backend** (`MemoryCore/src/metadata/store/metadata-store.contract.ts`, 1015 líneas): `runMetadataStoreContract(name, makeStore, teardown)` corre el mismo conjunto de `it(...)` contra cualquier implementación que satisfaga `IMetadataStore`. Cada adaptador (`sqlite-adapter.ts`, `mongodb-adapter.ts`) tiene su propio `*.test.ts` que sólo aporta el `makeStore`/`teardown`. Hay tres instancias de este patrón en el repo (`metadata-store.contract.ts`, `core/storage/__contract__/storage-backend.contract.ts`, `core/store/__contract__/memory-store.contract.ts`, `core/skill/__contract__/skill-store.contract.ts`), o sea que no es un experimento aislado sino la convención del repo para todo backend intercambiable.
- **Pool de stores por instancia con LRU** (`MetadataStorePool`, `factory.ts:181-293`): un store (conexión/archivo) por `instanceId`, caché LRU con `storeCacheMaxInstances`, cierre ordenado al desalojar o en `closeAll()`. Relevante si thyrox tiene múltiples bases lógicas (una por proyecto/sesión) sobre el mismo proceso.
- **Migraciones dentro del propio adaptador, no como paso separado**: el adaptador SQLite corre `createSchema()` (DDL con `CREATE TABLE IF NOT EXISTS`) y dos migraciones de columna ad-hoc (`migrateUserTypeColumn`, `migrateLegacyUserKeys`) en cada `init()`, detectando con `pragma_table_info('tabla')` si la columna ya existe antes de `ALTER TABLE ... ADD COLUMN` (`sqlite-adapter.ts:113-133,336-350`). **Esto es SQLite-específico** (`ALTER TABLE ADD COLUMN IF NOT EXISTS` no es sintaxis de SQLite) — el equivalente en Postgres/MySQL sería consultar `information_schema.columns` o usar la sintaxis nativa `ADD COLUMN IF NOT EXISTS` que sí soportan.

### 2.c Otro caso de "columna que se agrega en caliente", ahora contra ClickHouse (mismo problema, otra sintaxis por motor)

`MemoryPanel/src/panel/infra/api-call-telemetry.ts:44-108` implementa **auto-sanación de esquema** declarativa: un arreglo `EXPECTED_COLUMNS: Array<{name, ddl}>` se compara contra `system.columns` (vía `DESCRIBE`/`SELECT name FROM system.columns WHERE database=... AND table=...`) y cada columna faltante se agrega con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS <name> <ddl>`. Documentado explícitamente como "para agregar un campo nuevo sólo hay que añadir una fila al arreglo, el reinicio la aplica sola" (comentario `api-call-telemetry.ts:8-13`). Es el mismo patrón que `migrateSchema()` de `MemoryProxy/src/clickhouse.ts:341-430` (un arreglo `{table, column, type}` recorrido con `ALTER TABLE ADD COLUMN IF NOT EXISTS`), pero en Panel el arreglo compara primero contra el estado real (`ensureSchema`) en vez de intentar el `ALTER` a ciegas y tragarse el error si la columna ya existía — dos variantes del mismo problema, la segunda evita un `ALTER` innecesario en el caso común.

**Relevancia directa para thyrox**: el patrón "migración declarativa por columna, idempotente, recorrida en cada arranque, con motor-específico en el propio `type`" es trasladable **tal cual** al esquema de migraciones versionadas por dialecto que thyrox ya tiene para `errors`/`error_actions` — la única pieza que cambia por dialecto es cómo se detecta "la columna ya existe" (`PRAGMA table_info` en SQLite, `information_schema.columns` en Postgres/MySQL, `system.columns` en ClickHouse) y la sintaxis del tipo.

## 3. Telemetría y errores — comparación con `errors`/`error_actions` de thyrox

Este repo **no tiene una tabla de errores clasificados equivalente** a `errors`/`error_actions` con `error_type`. Lo más cercano son tres formas distintas, ninguna igual:

1. **Tipos de error como enum + clase, sin persistencia** (`SkillErrorCode`, `SkillStoreError`, `MemoryCore/src/core/skill/skill-store.interface.ts:22-32`): el "tipo de error" vive en el *type system*, se lanza como excepción, y el llamador lo captura — no hay fila en base de datos por error. Es el opuesto exacto al patrón thyrox (registro persistente + acciones de remediación).
2. **`reason` como columna de clasificación dentro de la tabla de uso, no de una tabla de error dedicada**: `usage_raw.reason` toma valores `non_tokenhub | unknown_model | invalid_format | invalid_credit | report_failed` (`MemoryProxy/src/clickhouse.ts:118`) — es lo más parecido a un `error_type`, pero vive como columna de una tabla de *tráfico no reconocido*, no de una tabla de errores del sistema. No hay tabla `_actions` equivalente: no hay remediación estructurada, sólo el registro crudo para inspección manual.
3. **Buffer + reintento + límite de desborde, en vez de tabla de error**: tanto `MemoryProxy/src/clickhouse.ts:826-844` (`requeue`/`requeueRaw`) como el genérico `MemoryKnowledge`/`MemoryPanel` (`enqueueRow`/`flushBuffer`/`requeueWithOverflowGuard`, `MemoryProxy/src/clickhouse.ts:1118-1201`) tratan el fallo de escritura como algo que se **reintenta en memoria** con tope (10 000 filas, recorte a 5 000, log `warn` con `dropped`), nunca como una fila persistida de error. La filosofía declarada es explícita: *"Error-silent: nunca bloquea ni degrada el negocio"* (`clickhouse.ts:11`) y *"mejor esfuerzo, no garantía absoluta"* (`clickhouse.ts:13-14`). thyrox, con una tabla `errors` dedicada y `error_actions`, apunta a lo contrario: un registro persistente y accionable, no un buffer volátil que se descarta bajo presión.

**Lo que sí es portable de este eje:**
- el propio patrón buffer/flush/requeue-con-tope como *mecanismo de entrega* hacia el sink de telemetría (no de errores del sistema) — útil si thyrox algún día separa "registro de error" (persistente, siempre) de "telemetría de uso" (best-effort, se puede perder bajo presión);
- la redacción de secretos antes de persistir cualquier body/payload — ver `redact()` con `SENSITIVE_KEY_PATTERN` (`MemoryKnowledge/src/clickhouse-telemetry.ts:10,62-69`) y `API_TRACE_SENSITIVE_KEYS`/`sanitizeApiPayload` (`MemoryCore/src/api-trace/api-sanitize.ts:6-45`) — si `error_actions` o `errors` de thyrox llegan a guardar un payload o stacktrace con datos de entrada, este es el patrón a adoptar: lista cerrada de claves sensibles + recursión sobre el objeto + truncado por bytes UTF-8 seguro (`truncateUtf8`, corta en frontera de carácter, `clickhouse-telemetry.ts:71-75`).

## 4. Tabla «se adopta / no se adopta»

| Patrón | Fuente (ruta:línea) | Veredicto | Por qué |
|---|---|---|---|
| `MaybePromise<T> = T \| Promise<T>` en la interfaz del store | `MemoryCore/src/metadata/store/interface.ts:57` | **Se adopta** | Resuelve exactamente el problema declarado: pasar de `bun:sqlite` síncrono a `Bun.SQL` asíncrono sin tocar cada consumidor el mismo día — el consumidor ya hace `await` desde el primer commit. |
| Backend seleccionado por variable de entorno con exclusividad validada al arrancar (`assertMetadataStoreConfigExclusive`) | `MemoryCore/src/metadata/store/factory.ts:39-57,71-101` | **Se adopta** | Falla en el arranque, no en el primer request; evita el estado ambiguo "dos config de conexión activas a la vez". |
| El tercer dialecto (`mysql`) declarado en el `type` y en el `switch`, con `throw` explícito antes de tener implementación | `MemoryCore/src/metadata/store/factory.ts:164-165`, `interface.ts:229` | **Se adopta** | Es la forma correcta de "MySQL después": el contrato ya lo nombra, TypeScript exige tratarlo en cada `switch`, y su ausencia es un error localizado y no un caso silenciosamente ignorado. |
| Suite de contrato única (`runMetadataStoreContract`) corrida contra cada adaptador | `MemoryCore/src/metadata/store/metadata-store.contract.ts:1-50`; repetido en `core/storage/__contract__`, `core/store/__contract__`, `core/skill/__contract__` | **Se adopta** | Es el instrumento que prueba "los tres dialectos se comportan igual", que es justo la garantía que un contrato multi-dialecto necesita para no divergir en silencio. |
| Migración declarativa por columna, idempotente, con detección de "ya existe" antes de `ALTER` | `MemoryPanel/src/panel/infra/api-call-telemetry.ts:44-108` (contra ClickHouse); `MemoryCore/src/metadata/store/sqlite-adapter.ts:336-350` (contra SQLite, `pragma_table_info`) | **Se adopta, con adaptación** | El *patrón* (arreglo declarativo `{tabla, columna, tipo}`, recorrido en cada arranque) es motor-agnóstico; lo que cambia por dialecto es el comando de introspección (`PRAGMA table_info` / `information_schema.columns` / `system.columns`) — esa pieza sí hay que escribirla nueva por dialecto en el sistema de migraciones versionadas de thyrox. |
| Pool de stores por instancia con LRU y cierre ordenado (`MetadataStorePool`) | `MemoryCore/src/metadata/store/factory.ts:181-293` | **Se adopta si thyrox tiene bases lógicas múltiples por proceso** | Útil sólo si el nuevo contrato de thyrox abre más de una conexión lógica por proceso (p. ej. una base por proyecto); si es una sola conexión persistente, este patrón no aporta. |
| Cadena de degradación `cos → sqlite → fs → memory` con log de severidad creciente | `MemoryProxy/src/storage/factory.ts:119-191` | **No se adopta tal cual** | Resuelve un problema distinto (KV con fallback multi-nodo/local), no la elección entre tres dialectos SQL igualmente válidos. Podría inspirar un fallback de desarrollo (sin `DATABASE_URL` → SQLite local), pero no es el eje pedido. |
| `errors`/`reason` como columna dentro de tablas de uso, sin tabla de error dedicada ni `_actions` | `MemoryProxy/src/clickhouse.ts:118` (`usage_raw.reason`) | **No se adopta** | thyrox ya tiene un modelo más fuerte (`errors` + `error_actions` con `error_type` clasificado); este repo no ofrece nada equivalente o superior en ese eje — es objetivamente más débil (buffer volátil, "error-silent" declarado). |
| Buffer en memoria + reintento + recorte a la mitad al desbordar (`requeue`, `requeueWithOverflowGuard`) | `MemoryProxy/src/clickhouse.ts:826-844,1179-1201` | **Se adopta sólo para telemetría best-effort, no para `errors`** | Es un mecanismo de entrega tolerante a pérdida; correcto para uso/telemetría, incompatible con la semántica de "registro accionable" que `errors`/`error_actions` necesita conservar. |
| Redacción de secretos por lista cerrada de claves + recursión + truncado UTF-8 seguro | `MemoryKnowledge/src/clickhouse-telemetry.ts:10,62-75`; `MemoryCore/src/api-trace/api-sanitize.ts:6-45` | **Se adopta si `error_actions`/`errors` llegan a guardar payloads** | Portable sin fricción: es lógica pura sobre objetos JS, no depende del motor de base de datos. |
| Índice de búsqueda FTS5 + conexión LRU por entidad (un `index.db` por wiki) | `MemoryKnowledge/src/engines/wiki/index-db.ts:1-138` | **No se adopta** | Resuelve un problema de escala de búsqueda por documento (evitar 20 GB de MiniSearch en memoria); no tiene relación con el contrato de `errors`/migraciones que motiva este análisis. Se documenta por completitud del paquete, no como candidato. |
| `node:sqlite` (`DatabaseSync`) en vez de `bun:sqlite`/`better-sqlite3` | `MemoryCore/src/metadata/store/sqlite-adapter.ts:10-12,66-71` | **No se adopta** | thyrox corre en Bun y ya declaró `Bun.SQL` como destino; este repo usa Node puro en esa capa — es una elección de runtime distinta, no un patrón de esquema o de contrato. |

## 5. DESCONOCIDOS

- **¿Existe en algún lugar del repo una implementación MySQL real, aunque sea parcial?** Medido: `git grep -n "case \"mysql\"" -- '*.ts'` sólo da el `throw` de `factory.ts:164-165`; no se buscó exhaustivamente fuera de `metadata/store`. Cómo medirlo: `git -C /home/user/nestormonroy/tencentdb-agent-memory grep -rn "mysql2\|mysql-adapter\|MysqlMetadataStore"` sobre todo el árbol (no sólo `*.ts`), y revisar `package.json` de cada paquete por la dependencia `mysql2`.
- **¿El pool `MetadataStorePool` maneja reconexión tras caída de la conexión Mongo/SQLite, o sólo LRU de apertura?** No se leyó el manejo de errores de conexión dentro de `getStore()` más allá de la ruta feliz. Cómo medirlo: `git -C ... grep -n "reconnect\|ECONNREFUSED\|onerror" MemoryCore/src/metadata/store/*.ts`.
- **¿Hay pruebas de contrato específicas que ejerciten la migración de columna en caliente (`ensureSchema` de Panel, `migrateSchema` de clickhouse.ts) contra un ClickHouse real, o sólo mocks de `fetch`?** No se abrió el `*.test.ts` correspondiente. Cómo medirlo: `git -C ... grep -rln "ensureSchema\|migrateSchema" -- '*.test.ts'` y leer si el test usa un servidor real o un `fetchImpl` inyectado (el propio código ya expone `fetchImpl` como parámetro inyectable, lo que sugiere mock).
- **¿`Bun.SQL` (el destino de thyrox) es usado en algún punto de este repo?** Medido: `git grep -n "Bun\.SQL\|bun:sql"` dio cero resultados — el repo no usa Bun.SQL en ningún paquete leído. No se buscó fuera de los ocho archivos + los adicionales inspeccionados (`MemoryCore/src/metadata/store/**`). Cómo medirlo: `git -C ... grep -rn "Bun\.SQL\|bun:sql\|\"bun\"" -- package.json '*.ts'` sobre el árbol completo.
