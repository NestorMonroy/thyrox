/**
 * El esquema de `tasks` y el vocabulario de sus estados — la mitad del
 * subsistema de tareas que NO es superficie de herramienta.
 *
 * Por qué vive aquí y no en `harness/src/tools/tasks.ts`, que es de donde
 * viene: la forma de la tabla la comparten dos lenguas y tres superficies —el
 * harness la crea, `agent_store.py` la migra y `task_ids.py` la acuña—, así
 * que declararla dentro de la herramienta la ataba al consumidor equivocado.
 * Es la misma partición que `src/paths/` y `src/store/`: una raíz por ROL, con
 * la lengua que la implemente dentro.
 *
 * ## Piso, no contrato
 *
 * Lo que este archivo declara es un **piso**, no el esquema completo. La base
 * de `src/agents/agent_store.py` declara 15 columnas; el piso declara 13, y
 * las tres restantes (`citation_id`, `opened_at`, `opened_at_source`) sólo
 * existen como `ALTER TABLE` de aquel lado. La asimetría es deliberada: el
 * harness crea una base usable sin conocer las columnas que el store de
 * documentación añade después, y las lee sondeando (`selectCitationId`).
 *
 * Lo que la asimetría NO puede volverse es divergencia. `CREATE TABLE IF NOT
 * EXISTS` no altera una tabla ya creada, así que una columna `NOT NULL` que
 * entrara a la base sin entrar al piso dejaría en silencio a toda base creada
 * por el harness sin ella. `schemaDrift` es la guarda de ese invariante.
 */
import { Database } from 'bun:sqlite'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { thyroxRoot } from '@thyrox/paths/reach.ts'

export const TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

/** `deleted` no es un estado que se guarde: es la orden de borrar la fila. */
export const UPDATE_STATUSES = [...TASK_STATUSES, 'deleted'] as const

/**
 * El predicado del `CHECK` de `status`, derivado de `TASK_STATUSES`.
 *
 * Se compone en vez de escribirse porque la lista y la restricción tienen que
 * decir lo mismo por construcción: escribir el predicado a mano sería la
 * segunda fuente de verdad que caduca en cuanto alguien añada un estado.
 *
 * `UPDATE_STATUSES` NO entra: `deleted` es la orden de borrar la fila, no un
 * estado que se guarde. Un `CHECK` que lo aceptara volvería persistible la
 * orden.
 */
export const TASK_STATUS_CHECK =
  `CHECK (status IN (${TASK_STATUSES.map((s) => `'${s}'`).join(', ')}))`

export const TABLERO_DDL = `CREATE TABLE IF NOT EXISTS tasks (
  task_id         TEXT NOT NULL,
  subject         TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL ${TASK_STATUS_CHECK},
  active_form     TEXT,
  owner           TEXT,
  blocks_json     TEXT,
  blocked_by_json TEXT,
  session_id      TEXT NOT NULL DEFAULT 'desconocida',
  source          TEXT,
  metadata_json   TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  PRIMARY KEY (session_id, task_id)
)`

/**
 * La marca de agua LEGADA, por clave — semántica global.
 *
 * `siguienteOrdinal` (la superficie de herramienta) numeraba con `MAX(task_id)`
 * más esta marca; contra reúso de id, no de sesión. Se CONSERVA INTACTA
 * (DEC-TASK 2026-09-29, opción a): el código nuevo no la crea, no la lee y no
 * la escribe. Si una base la trae, sobrevive al upgrade sin cambio de
 * contenido ni de significado — hoy ninguna base real la tiene.
 *
 * Medido: el store real repite 333 `task_id` entre sus seis sesiones, así que
 * el ordinal NUNCA fue global — el comentario que llevaba esta constante lo
 * afirmaba y atribuía la forma a la referencia, que no la tiene así (guarda
 * su `.highwatermark` por LISTA de tareas: `TASK_SESSION_HIGHWATER_DDL`, más
 * abajo). La identidad durable entre sesiones es `TASK-<LAYER>-NNNN`
 * (`task_ids`), no este ordinal.
 */
export const TASK_HIGHWATER_DDL = `CREATE TABLE IF NOT EXISTS task_highwater (
  clave  TEXT NOT NULL PRIMARY KEY DEFAULT '__global__',
  max_id INTEGER NOT NULL DEFAULT 0
)`

/**
 * La marca de agua POR SESIÓN: `next_task_id` es el PRÓXIMO id a asignar en
 * esa sesión, no el mayor ya asignado.
 *
 * Medido: el store real repite 333 `task_id` entre sus seis sesiones — el
 * ordinal reinicia por sesión. La referencia (2.1.283, `chunk-zgfcmyzt.js`)
 * guarda su `.highwatermark` por LISTA de tareas, no globalmente. La
 * identidad durable entre sesiones es `TASK-<LAYER>-NNNN` (`task_ids`), no
 * este ordinal.
 */
export const TASK_SESSION_HIGHWATER_DDL = `CREATE TABLE IF NOT EXISTS task_session_highwater (
  session_id   TEXT NOT NULL PRIMARY KEY,
  next_task_id INTEGER NOT NULL CHECK (next_task_id >= 1)
)`

/**
 * `, citation_id` si la base la tiene, y cadena vacía si no.
 *
 * La columna la acuña `task_ids` sobre el store de docs; el piso no la
 * declara, así que una base creada por el harness no la tiene y seleccionarla
 * a ciegas la rompería con `no such column`.
 */
export function selectCitationId(db: Database): string {
  const columnas = (db.query('PRAGMA table_info(tasks)').all() as { name: string }[]).map((c) => c.name)
  return columnas.includes('citation_id') ? ', citation_id' : ''
}

/** El archivo del lado Python que declara la base y sus migraciones. */
const PYTHON_SCHEMA = join('src', 'agents', 'agent_store.py')

/** El cuerpo de un `CREATE TABLE IF NOT EXISTS <tabla> (…)`, sin el paréntesis final. */
function tableBody(source: string, table: string): string {
  const i = source.indexOf(`CREATE TABLE IF NOT EXISTS ${table} (`)
  if (i < 0) throw new Error(`no se encontró la declaración de ${table}`)
  const j = source.indexOf('\n)', i)
  if (j < 0) throw new Error(`declaración de ${table} sin cierre`)
  return source.slice(i, j)
}

/** Los nombres de columna de un cuerpo de tabla, ignorando comentarios y la PK. */
function columnNames(body: string): string[] {
  const salida: string[] = []
  for (const cruda of body.split('\n')) {
    const linea = cruda.trim()
    if (!linea || linea.startsWith('--') || linea.toUpperCase().startsWith('PRIMARY KEY')) continue
    const m = /^([a-z_]+)\s+(TEXT|INTEGER|REAL|BLOB)/.exec(linea)
    const nombre = m?.[1]
    if (nombre) salida.push(nombre)
  }
  return salida
}

function pythonSource(): string {
  return readFileSync(join(thyroxRoot(), PYTHON_SCHEMA), 'utf8')
}

/** Las columnas que este piso crea. */
export function floorColumns(): string[] {
  return columnNames(tableBody(TABLERO_DDL, 'tasks'))
}

/** Las columnas del `CREATE TABLE tasks` del lado Python. */
export function pythonBaseColumns(): string[] {
  return columnNames(tableBody(pythonSource(), 'tasks'))
}

/** Los grupos de columnas que el lado Python añade por `ALTER TABLE`. */
const ALTER_GROUPS = [
  '_TASK_LAYER_COLUMNS', '_TASK_CITATION_COLUMNS', '_TASK_BOARD_ORDINAL_COLUMNS', '_TASK_OPENING_COLUMNS',
]

export function alterColumns(): string[] {
  const py = pythonSource()
  const salida: string[] = []
  for (const grupo of ALTER_GROUPS) {
    const i = py.indexOf(`${grupo} = {`)
    if (i < 0) throw new Error(`no se encontró el grupo de ALTER ${grupo}`)
    const j = py.indexOf('}', i)
    for (const m of py.slice(i, j).matchAll(/"([a-z_]+)":/g)) {
      const nombre = m[1]
      if (nombre) salida.push(nombre)
    }
  }
  return salida
}

/**
 * Los estados que el `CHECK` de `status` admite en un DDL dado.
 *
 * Devuelve `[]` cuando la columna no lleva `CHECK` — y ese caso vacío es el
 * defecto que el eje `statusCheck` de la deriva existe para ver, no un
 * resultado neutro.
 */
export function statusCheckStatuses(ddl: string): string[] {
  const m = /status\s+TEXT\s+NOT NULL\s+CHECK\s*\(\s*status\s+IN\s*\(([^)]*)\)/i.exec(ddl)
  if (!m?.[1]) return []
  return [...m[1].matchAll(/'([^']*)'/g)]
    .map((g) => g[1])
    .filter((s): s is string => s !== undefined)
}

/**
 * El vocabulario que el lado Python declara, leído de su tupla `TASK_STATUSES`.
 *
 * NO se lee de su DDL, y la razón es medible: aquel lado **interpola** su
 * predicado (`status TEXT NOT NULL {_TASK_STATUS_CHECK}`), así que el fuente
 * lleva el marcador y no el valor. Un extractor que leyera el DDL como texto
 * devolvería `[]` y publicaría «las dos lenguas no coinciden» sobre una base
 * que sí lleva el `CHECK` — el sub-patrón D con esta guarda como sujeto.
 *
 * La tupla ES la fuente única de aquel lado, igual que `TASK_STATUSES` lo es
 * de éste. Comparar tupla contra tupla compara las dos fuentes; comparar DDL
 * contra DDL compararía dos derivados, uno de ellos sin resolver.
 */
export function pythonTaskStatuses(): string[] {
  const m = /^TASK_STATUSES = \(([^)]*)\)/m.exec(pythonSource())
  if (!m?.[1]) return []
  return [...m[1].matchAll(/"([^"]*)"/g)]
    .map((g) => g[1])
    .filter((s): s is string => s !== undefined)
}

/**
 * `true` si la columna `status` del DDL de la base lleva su `CHECK` — sea
 * literal o interpolado desde `_TASK_STATUS_CHECK`.
 *
 * Es el eje que `pythonTaskStatuses` no cubre: una tupla correcta con un DDL
 * que nunca la consume dejaría la tabla sin restricción, y las dos tuplas
 * seguirían coincidiendo.
 */
export function pythonDdlCarriesCheck(): boolean {
  const cuerpo = tableBody(pythonSource(), 'tasks')
  return /status\s+TEXT\s+NOT NULL\s+(\{_TASK_STATUS_CHECK\}|CHECK\s*\()/i.test(cuerpo)
}

export type SchemaDrift = {
  /** Las columnas de la base del Python. */
  base: string[]
  /** Las columnas que este piso crea. */
  floor: string[]
  /** Las de la base que el piso no crea. */
  onlyInBase: string[]
  /** Las de la base que el piso no crea Y ningún ALTER añade — el defecto. */
  uncovered: string[]
  /** Las columnas `NOT NULL` de la base. */
  notNull: string[]
  /** Las `NOT NULL` que el piso no crea — el defecto duro: rompe la inserción. */
  missingNotNull: string[]
  /** Los estados que el `CHECK` del piso admite. */
  floorStatuses: string[]
  /** Los estados que el `CHECK` de la base admite. */
  baseStatuses: string[]
  /** `true` si las dos lenguas admiten exactamente los mismos estados Y las
   *  dos DDL consumen su vocabulario. */
  statusCheckAgrees: boolean
}

/**
 * El estado del invariante entre las dos declaraciones.
 *
 * Métrica: nombres de columna del `CREATE TABLE tasks` de cada lengua, más los
 * grupos de ALTER del lado Python.
 * Ciega a: el TIPO de cada columna, y toda restricción que no sea `NOT NULL`
 * ni el `CHECK` de `status` — un `CHECK` sobre otra columna, un `UNIQUE` o un
 * `DEFAULT` divergente pasan sin verse. Y a cualquier declaración del esquema
 * fuera de estos dos archivos.
 *
 * El eje `statusCheck` se añadió al cerrar TASK-THYROX-0113: hasta entonces
 * esta misma línea declaraba ciega a TODA restricción salvo `NOT NULL`, y esa
 * ceguera es la que dejaba que una lengua ganara el `CHECK` y la otra no.
 */
export function schemaDrift(): SchemaDrift {
  const base = pythonBaseColumns()
  const floor = floorColumns()
  const alter = alterColumns()
  const cuerpo = tableBody(pythonSource(), 'tasks')
  const notNull = [...cuerpo.matchAll(/^\s*([a-z_]+)\s+(?:TEXT|INTEGER|REAL|BLOB)\s+NOT NULL/gm)]
    .map((m) => m[1])
    .filter((c): c is string => c !== undefined)
  const onlyInBase = base.filter((c) => !floor.includes(c))
  const floorStatuses = statusCheckStatuses(TABLERO_DDL)
  const baseStatuses = pythonTaskStatuses()
  return {
    base,
    floor,
    onlyInBase,
    uncovered: onlyInBase.filter((c) => !alter.includes(c)),
    notNull,
    missingNotNull: notNull.filter((c) => !floor.includes(c)),
    floorStatuses,
    baseStatuses,
    statusCheckAgrees:
      floorStatuses.length > 0 &&
      pythonDdlCarriesCheck() &&
      floorStatuses.join('\u0000') === baseStatuses.join('\u0000'),
  }
}

/**
 * Las migraciones (`version`, `name`) que el lado Python declara en
 * `CORE_MIGRATIONS` — leídas de su fuente, no copiadas: DEC-TASK 2026-09-29
 * (opción 1) hace a Python el dueño del schema, así que este archivo no
 * puede tener su propia lista sin volverse la segunda fuente de verdad que
 * diverge en cuanto Python añada una versión. `statements` no se extrae —
 * Bun nunca las ejecuta, sólo valida el ledger (`tasks.ts::conBase`).
 */
export function pythonMigrations(): { version: number; name: string }[] {
  const py = pythonSource()
  const i = py.indexOf('CORE_MIGRATIONS')
  if (i < 0) throw new Error('no se encontró CORE_MIGRATIONS en el lado Python')
  const j = py.indexOf('\n)\n', i)
  if (j < 0) throw new Error('declaración de CORE_MIGRATIONS sin cierre')
  const cuerpo = py.slice(i, j)
  const salida: { version: number; name: string }[] = []
  for (const m of cuerpo.matchAll(/Migration\(\s*(\d+),\s*"([a-z_]+)"/g)) {
    const version = m[1]
    const name = m[2]
    if (version && name) salida.push({ version: Number(version), name })
  }
  if (salida.length === 0) throw new Error('CORE_MIGRATIONS no declaró ninguna migración')
  return salida
}

/**
 * Materializa una base de tareas COMPLETA (todas las tablas y el ledger de
 * `CORE_MIGRATIONS`) en `dbPath`, invocando al dueño del schema — nunca DDL
 * de este lado. Es el equivalente de prueba de lo que un hook de Python
 * (`register_agent_session.py`) ya hace en producción antes de que
 * `taskTools` opere: `conBase` sólo VALIDA, así que un fixture de prueba
 * tiene que migrar la base de la misma forma que la migraría un despliegue
 * real, no fabricar un ledger a mano.
 *
 * `migrate-file` (y no `init`) porque `init` fija `DB_FILENAME`
 * (`agent_store.sqlite3`); las pruebas de este árbol eligen su propio
 * nombre de archivo (p. ej. `tablero.sqlite3`).
 *
 * `THYROX_ROOT` se fija EXPLÍCITAMENTE al valor resuelto por `thyroxRoot()`
 * y no se hereda del entorno del proceso: `bin/agent_store` prioriza la
 * variable heredada sobre su propio cálculo, y un entorno con varios
 * worktrees puede traer la de OTRO árbol — apuntaría el subproceso al
 * `agent_store.py` equivocado.
 */
export function createMigratedTaskDb(dbPath: string): void {
  const root = thyroxRoot()
  const bin = join(root, 'bin', 'agent_store')
  const proc = Bun.spawnSync([bin, 'migrate-file', dbPath], {
    env: { ...process.env, THYROX_ROOT: root },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (proc.exitCode !== 0) {
    throw new Error(`no se pudo migrar la base de prueba en ${dbPath}: ${proc.stderr.toString()}`)
  }
}
