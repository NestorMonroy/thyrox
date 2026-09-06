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
import { thyroxRoot } from '../paths/reach.ts'

export const TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

/** `deleted` no es un estado que se guarde: es la orden de borrar la fila. */
export const UPDATE_STATUSES = [...TASK_STATUSES, 'deleted'] as const

export const TABLERO_DDL = `CREATE TABLE IF NOT EXISTS tasks (
  task_id         TEXT NOT NULL,
  subject         TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL,
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
 * La marca de agua contra reúso de id (DEC-TASK-02).
 *
 * `siguienteOrdinal` numera con `MAX(task_id)` sobre las filas presentes; si la
 * de id máximo se borrara, el siguiente `TaskCreate` reusaría ese id, con la
 * ambigüedad de referencia cruzada que el `.highwatermark` de la referencia
 * previene (`hccw: 11-task-system.md:154-186`). La tabla recuerda el máximo
 * histórico aunque se borre la fila. Es global —una sola clave— porque el
 * ordinal también lo es: dos sesiones no deben producir dos «#996».
 *
 * Sólo la declara esta lengua: el lado Python no la conoce, porque su
 * numeración no pasa por el ordinal de sesión.
 */
export const TASK_HIGHWATER_DDL = `CREATE TABLE IF NOT EXISTS task_highwater (
  clave  TEXT NOT NULL PRIMARY KEY DEFAULT '__global__',
  max_id INTEGER NOT NULL DEFAULT 0
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

/** Los tres grupos de columnas que el lado Python añade por `ALTER TABLE`. */
const ALTER_GROUPS = ['_TASK_LAYER_COLUMNS', '_TASK_CITATION_COLUMNS', '_TASK_OPENING_COLUMNS']

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
}

/**
 * El estado del invariante entre las dos declaraciones.
 *
 * Métrica: nombres de columna del `CREATE TABLE tasks` de cada lengua, más los
 * tres grupos de ALTER del lado Python.
 * Ciega a: el TIPO y las restricciones de cada columna más allá de `NOT NULL`,
 * y a cualquier declaración del esquema fuera de estos dos archivos.
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
  return {
    base,
    floor,
    onlyInBase,
    uncovered: onlyInBase.filter((c) => !alter.includes(c)),
    notNull,
    missingNotNull: notNull.filter((c) => !floor.includes(c)),
  }
}
