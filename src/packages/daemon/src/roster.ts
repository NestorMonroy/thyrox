/**
 * Roster de workers de todo el daemon — `~/.claude/daemon/roster.json`.
 *
 * `ant 4139.js` (`_e`/`wm`/`MlH`/`d_3`/`RV8`) — un solo archivo JSON con un
 * snapshot de cada worker vivo, indexado por id corto. Sobrevive al
 * reinicio del daemon para que la nueva instancia pueda adoptar workers
 * huérfanos sin re-escanear el árbol jobs/ entero (y sin perder workers
 * cuyo meta.json está en un árbol-cwd distinto).
 *
 * Esquema (coincide con ant Ii7 — 4070.js:56-63):
 *   {
 *     proto: number          // PROTO_VERSION
 *     supervisorPid: number  // pid actual del daemon
 *     updatedAt: number      // epoch ms de la última escritura
 *     workers: { [short]: RosterEntry }
 *     parseFailed?: boolean  // se fija al leer si el parse de JSON falló
 *   }
 *
 * RosterEntry (zs5 — 4070.js:38-55) es un subconjunto recortado de
 * WorkerRecord: pid, procStart, sessionId, rendezvousSock, ptySock,
 * cliVersion, startedAt, attempt, cwd, worktreePath, dispatch,
 * pendingRespawn.
 *
 * Concurrencia: ant acota las escrituras con una promesa encadenada
 * (4139.js `MlH`) para que las actualizaciones concurrentes se serialicen.
 * ccb espeja con el mismo patrón `writeQueue.then(...)`. Gana la última
 * escritura; los campos supervisor pid + updatedAt marcan cada escritura.
 *
 * Manejo de corrupción: `ant 4139.js` `Ms7` renombra el archivo a
 * `roster.json.corrupt.<ts>` para que el siguiente supervisor igual reciba
 * un archivo fresco pero la copia mala se conserve para el postmortem.
 * ccb lo espeja.
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/roster.ts`.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { logEvent } from './internal/pendingCrossPackageDeps.js'

import type { WorkerRecord } from './bgWorkerRegistry.js'
import { getDaemonHomeDir } from './socketPaths.js'
import { PROTO_VERSION } from './socketProto.js'

/**
 * Entrada de roster para un worker. Subconjunto de campos de WorkerRecord
 * que sobreviven al reinicio del supervisor (pid + sockets + envoltorio
 * de dispatch).
 *
 * `ant 4070.js` zs5 llama al socket de rendezvous `rendezvousSock` y al
 * socket PTY `ptySock`. El WorkerRecord de ccb usa `ptySocket`. Se llevan
 * los dos nombres para que las lecturas cross-versión sigan siendo
 * tolerantes.
 */
export interface RosterEntry {
  pid: number
  procStart?: number
  sessionId?: string
  rendezvousSock?: string
  ptySock?: string
  cliVersion?: string
  startedAt: number
  attempt: number
  cwd: string
  worktreePath?: string
  dispatch?: Record<string, unknown>
  pendingRespawn?: 'upgrade'
  decModes?: number[]
}

export interface Roster {
  proto: number
  supervisorPid: number
  updatedAt: number
  workers: Record<string, RosterEntry>
  parseFailed?: boolean
}

/** Ruta a roster.json (un archivo global por uid, no por hash-de-repo). */
export function getRosterPath(): string {
  return join(getDaemonHomeDir(), 'roster.json')
}

/** Roster vacío — lo devuelve readRoster ante archivo ausente o tras poner en cuarentena algo corrupto. */
export function emptyRoster(): Roster {
  return {
    proto: PROTO_VERSION,
    supervisorPid: process.pid,
    updatedAt: Date.now(),
    workers: {},
  }
}

/**
 * Proyecta un WorkerRecord a un RosterEntry. Lo usa el daemon al
 * persistir el mapa de workers vivos de vuelta a disco tras un
 * spawn / cambio de estado.
 */
export function recordToRosterEntry(r: WorkerRecord): RosterEntry {
  return {
    pid: r.pid,
    procStart: r.procStart,
    // El socket rv (control de rendezvous) es un socket DISTINTO del
    // socket de datos PTY — tiene que sobrevivir a un reinicio del
    // supervisor para que adoptFromRoster pueda re-apuntar al cliente rv
    // a la dirección correcta (ver el docstring de
    // WorkerRecord.rendezvousSocket). Escribir aquí r.ptySocket (el valor
    // histórico, de cuando `rendezvousSock` era un alias inocuo) mandaba
    // el handshake {role:'supervisor'} del cliente rv al stream de DATOS
    // PTY de cualquier worker adoptado por roster, corrompiendo la salida
    // de attach Y reabriendo el hueco de "el worker sin attach no tiene
    // señal de vivacidad" que este canal entero existe para cerrar.
    // Undefined cuando el worker es anterior al canal rv — el cliente rv
    // es no-op ante un socket ausente (degrada a poll de pid).
    rendezvousSock: r.rendezvousSocket,
    ptySock: r.ptySocket,
    cliVersion: r.cliVersion,
    startedAt: r.startedAt,
    attempt: r.attempt ?? 0,
    cwd: r.cwd,
  }
}

/**
 * Valida un valor JSON parseado contra el esquema de Roster. Devuelve el
 * valor tipado, o null ante un desajuste de forma. Se evita traer zod
 * aquí para que la entrada del daemon quede con dependencias mínimas.
 */
function validateRoster(v: unknown): Roster | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (typeof o.proto !== 'number') return null
  if (typeof o.supervisorPid !== 'number') return null
  if (typeof o.updatedAt !== 'number') return null
  if (!o.workers || typeof o.workers !== 'object') return null
  const workers: Record<string, RosterEntry> = {}
  for (const [k, raw] of Object.entries(o.workers as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') return null
    const w = raw as Record<string, unknown>
    if (typeof w.pid !== 'number') return null
    if (typeof w.startedAt !== 'number') return null
    if (typeof w.cwd !== 'string') return null
    if (typeof w.attempt !== 'number') return null
    workers[k] = {
      pid: w.pid,
      procStart: typeof w.procStart === 'number' ? w.procStart : undefined,
      sessionId: typeof w.sessionId === 'string' ? w.sessionId : undefined,
      rendezvousSock:
        typeof w.rendezvousSock === 'string' ? w.rendezvousSock : undefined,
      ptySock: typeof w.ptySock === 'string' ? w.ptySock : undefined,
      cliVersion: typeof w.cliVersion === 'string' ? w.cliVersion : undefined,
      startedAt: w.startedAt,
      attempt: w.attempt,
      cwd: w.cwd,
      worktreePath:
        typeof w.worktreePath === 'string' ? w.worktreePath : undefined,
      dispatch:
        w.dispatch && typeof w.dispatch === 'object'
          ? (w.dispatch as Record<string, unknown>)
          : undefined,
      pendingRespawn: w.pendingRespawn === 'upgrade' ? 'upgrade' : undefined,
      decModes: Array.isArray(w.decModes)
        ? (w.decModes as number[]).filter(n => typeof n === 'number')
        : undefined,
    }
  }
  return {
    proto: o.proto,
    supervisorPid: o.supervisorPid,
    updatedAt: o.updatedAt,
    workers,
  }
}

/**
 * Pone en cuarentena un roster.json corrupto — renombra a .corrupt.<ts>.
 * `ant 4139.js` Ms7. Best effort; los fallos se registran pero no se
 * propagan.
 */
export async function quarantineCorruptRoster(): Promise<void> {
  const p = getRosterPath()
  try {
    await rename(p, `${p}.corrupt.${Date.now()}`)
  } catch (e) {
    logEvent('tengu_bg_roster_quarantine_failed', {
      errno: (e as NodeJS.ErrnoException).code ?? 'unknown',
    })
  }
}

/**
 * Lee roster.json de disco. `ant 4139.js` `wm`. Devuelve:
 *   - roster vacío ante archivo ausente (ENOENT)
 *   - vacío + parseFailed:true ante error de parseo JSON (con cuarentena)
 *   - vacío + parseFailed:true ante desajuste de esquema (con cuarentena)
 *
 * `silent` se salta la cuarentena + telemetría — lo usan herramientas que
 * sólo quieren espiar el roster sin mutarlo (`ccb doctor`).
 */
export async function readRoster(opts?: { silent?: boolean }): Promise<Roster> {
  const p = getRosterPath()
  let raw: string
  try {
    raw = await readFile(p, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return emptyRoster()
    if (!opts?.silent) {
      logEvent('tengu_bg_roster_parse_failed', {
        orphaned: '-1',
        quarantined: '1',
        errCode: (e as NodeJS.ErrnoException).code ?? 'unknown',
      })
      await quarantineCorruptRoster()
    }
    return { ...emptyRoster(), parseFailed: true }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    if (!opts?.silent) {
      const orphaned = countWorkersInRawJson(raw)
      logEvent('tengu_bg_roster_parse_failed', {
        orphaned: String(orphaned),
        quarantined: '1',
        errCode: (e as Error).name,
      })
      await quarantineCorruptRoster()
    }
    return { ...emptyRoster(), parseFailed: true }
  }
  const validated = validateRoster(parsed)
  if (validated) return validated
  if (!opts?.silent) {
    const orphaned = countWorkersInRawJson(raw)
    logEvent('tengu_bg_roster_parse_failed', {
      orphaned: String(orphaned),
      quarantined: '1',
      errCode: 'schema-mismatch',
    })
    await quarantineCorruptRoster()
  }
  return { ...emptyRoster(), parseFailed: true }
}

/**
 * Conteo best-effort de las claves `workers` en un blob JSON posiblemente
 * malformado. `ant` Q_3 — se usa para estimar cuántos workers se están
 * dando por huérfanos al poner en cuarentena el archivo. Devuelve 0 ante
 * cualquier incertidumbre.
 */
function countWorkersInRawJson(raw: string): number {
  try {
    const parsed = JSON.parse(raw) as { workers?: unknown }
    const w = parsed?.workers
    if (w && typeof w === 'object' && !Array.isArray(w)) {
      return Object.keys(w).length
    }
  } catch {
    /* sigue adelante */
  }
  return 0
}

/**
 * Escribe roster.json atómicamente. `ant 4139.js` d_3. Crea el directorio
 * del daemon con modo 0700 si falta; escribe el archivo con modo 0600.
 */
export async function writeRoster(roster: Roster): Promise<void> {
  const p = getRosterPath()
  await mkdir(dirname(p), { recursive: true, mode: 0o700 })
  const tmp = `${p}.tmp.${process.pid}`
  await writeFile(tmp, JSON.stringify(roster, null, 2), { mode: 0o600 })
  await rename(tmp, p)
}

/**
 * Actualiza el roster atómicamente vía un callback. `ant` MlH — encadena
 * las escrituras pendientes por una sola promesa para que las
 * actualizaciones concurrentes se serialicen con gana-la-última. Devuelve
 * el roster post-mutación.
 *
 * El mutador puede devolver un Roster nuevo o mutar-in-place y devolver
 * undefined (coincide con la API de ant: `K(q) ?? q`).
 */
let writeQueue: Promise<unknown> = Promise.resolve()
export function updateRoster(
  mutator: (current: Roster) => Roster | undefined | void,
): Promise<Roster> {
  const p: Promise<Roster> = writeQueue.then(async () => {
    const current = await readRoster()
    const mutated = mutator(current) as Roster | undefined
    const next: Roster = mutated ?? current
    next.supervisorPid = process.pid
    next.updatedAt = Date.now()
    await writeRoster(next)
    return next
  })
  writeQueue = p.catch(() => {})
  return p
}
