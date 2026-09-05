/**
 * Apertura del store, centralizada (T-096… no: #26 y #28).
 *
 * Tres sitios abrían `agent_store.sqlite3` con `new Database(path)` a pelo, y
 * eso dejaba dos defectos:
 *
 * - **#28 — contención.** El store es un archivo compartido por tres
 *   escritores (los hooks, `reconciliar_store.py`, el harness). Un `INSERT`
 *   mientras otro tiene el lock lanza `SQLITE_BUSY` y se rendía. La respuesta
 *   idiomática de SQLite es `PRAGMA busy_timeout`: el driver **espera** el lock
 *   hasta N ms en vez de fallar al instante. Se fija aquí, una vez.
 * - **#26 — apertura tardía.** Un store que no abre sólo se descubría en la
 *   primera purga (`sin-store`). `probeStore` lo detecta al arranque, que es un
 *   momento conocido, para que el harness lo diga en vez de degradarse callado.
 */
import { Database } from 'bun:sqlite'

/**
 * Cuánto espera un escritor a que el lock se libere antes de rendirse.
 * `agent_store.sqlite3` recibe escrituras cortas de varios procesos; 3 s cubre
 * la ventana de contención sin colgar el turno.
 */
export const BUSY_TIMEOUT_MS = 3000

/**
 * Abre el store con `busy_timeout` fijado. Es el único sitio que construye una
 * `Database` sobre el store: así la política de contención vale para los tres
 * escritores sin repetirla.
 */
export function openStore(dbPath: string): Database {
  const db = new Database(dbPath)
  db.run(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`)
  return db
}

export type StoreProbe = { ok: true } | { ok: false; detail: string }

/**
 * ¿El store abre y responde? Se usa al arranque para no descubrir un store
 * muerto en la primera purga. Abre, hace una consulta trivial y cierra: si algo
 * falla, devuelve el motivo en vez de lanzarlo.
 */
export function probeStore(dbPath: string): StoreProbe {
  let db: Database | undefined
  try {
    db = openStore(dbPath)
    db.query('SELECT 1').get()
    return { ok: true }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) }
  } finally {
    db?.close()
  }
}
