/**
 * Fallback de despacho por spool de archivos — `ant 5165.js` XF3/EFK/fF3.
 *
 * Observa `~/.claude/daemon/dispatch/` por archivos de envoltorio de
 * despacho entrantes. Cada archivo es un request de despacho que la CLI
 * no pudo entregar por socket (p. ej. el daemon a mitad de un reinicio).
 * El daemon lo recoge vía fs.watch al arrancar + un re-escaneo cada 5s,
 * valida esquema/tamaño/edad, lo aplica como si fuera un despacho de
 * socket, borra al tener éxito o mueve a `rejected/` ante fallo.
 *
 * Sobrevive a un reinicio del daemon entre la escritura de la CLI y la
 * lectura del daemon — el archivo simplemente queda ahí hasta que el
 * siguiente daemon arranca. El despacho sólo-por-socket pierde cualquier
 * request en vuelo cuando el daemon muere a mitad del manejo.
 *
 * ccb usa `fs.watch` de Node en vez de chokidar (una dependencia menos).
 * En macOS fs.watch dispara eventos 'rename' tanto en crear COMO en
 * borrar — se filtra por lstat para distinguir, más un poll cada 5s como
 * respaldo ya que fs.watch puede perderse eventos bajo carga.
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/dispatchSpool.ts`.
 */

import {
  type FSWatcher,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  watch,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { logEvent } from './internal/pendingCrossPackageDeps.js'

/** `ant 5165.js` DF3 — edad máxima antes de que un archivo de spool se considere rancio (24h). */
const MAX_AGE_MS = 86_400_000
/** `ant 5165.js` MF3 — tamaño máximo de cuerpo para un solo envoltorio de despacho (256 KiB). */
const MAX_BODY_BYTES = 262_144

export interface DispatchEnvelope {
  /** epoch en ms de cuándo la CLI escribió este envoltorio. El daemon rechaza si es muy viejo. */
  createdAt: number
  /** Op del daemon a invocar una vez ingerido el envoltorio. Igual que el op de socket. */
  op: string
  /** Payload del op (pasado al manejador como msg.d). */
  d: Record<string, unknown>
  /** Nonce opcional para el emparejamiento await-ack. */
  nonce?: string
}

function getSpoolDir(): string {
  return join(homedir(), '.claude', 'daemon', 'dispatch')
}

function getRejectedDir(): string {
  return join(getSpoolDir(), 'rejected')
}

function isTempFile(name: string): boolean {
  return name.endsWith('.tmp') || name.includes('.tmp.')
}

/**
 * `ant 5165.js` NrH — mueve un envoltorio malo al subdirectorio rejected/.
 */
function rejectFile(path: string, reason: string): void {
  try {
    mkdirSync(getRejectedDir(), { recursive: true, mode: 0o700 })
    const dest = join(getRejectedDir(), basename(path))
    try { renameSync(path, dest) } catch { unlinkSync(path) }
  } catch {
    // best-effort — si no se puede rechazar, sólo se hace unlink
    try { unlinkSync(path) } catch { /**/ }
  }
  logEvent('tengu_bg_dispatch_rejected', { reason: reason.slice(0, 100) })
}

/**
 * `ant 5165.js` EFK — procesa un archivo de envoltorio. Devuelve `null`
 * ante éxito (archivo consumido) o un string con la razón de rechazo.
 * Síncrono porque la ruta de despacho del daemon es síncrona; la
 * invocación real del manejador es async vía el callback deliver, que el
 * llamador espera.
 */
export async function ingestEnvelope(
  path: string,
  deliver: (env: DispatchEnvelope) => Promise<void> | void,
): Promise<string | null> {
  let stat
  try {
    stat = lstatSync(path)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    rejectFile(path, (e as Error).message)
    return 'read-failed'
  }
  if (stat.isSymbolicLink()) {
    rejectFile(path, 'symlink')
    return 'symlink'
  }
  if (stat.size > MAX_BODY_BYTES) {
    rejectFile(path, `oversized (${stat.size} bytes)`)
    return 'oversized'
  }
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    rejectFile(path, (e as Error).message)
    return 'read-failed'
  }
  let env: DispatchEnvelope
  try {
    env = JSON.parse(raw) as DispatchEnvelope
  } catch {
    rejectFile(path, 'bad-json')
    return 'bad-json'
  }
  if (!env || typeof env !== 'object' || typeof env.op !== 'string' || typeof env.createdAt !== 'number' || !env.d || typeof env.d !== 'object') {
    rejectFile(path, 'schema')
    return 'schema'
  }
  if (Date.now() - env.createdAt > MAX_AGE_MS) {
    rejectFile(path, 'stale')
    return 'stale'
  }
  try {
    await deliver(env)
  } catch (e) {
    rejectFile(path, `deliver-failed: ${(e as Error).message.slice(0, 60)}`)
    return 'deliver-failed'
  }
  try { unlinkSync(path) } catch { /**/ }
  return null
}

/**
 * `ant 5165.js` fF3 — drena cualquier archivo pre-existente en el
 * directorio de spool al arrancar. Lo llama el arranque del daemon antes
 * de armar fs.watch, para que cualquier archivo escrito entre el apagado
 * del daemon anterior y este arranque se procese.
 */
export async function drainSpool(
  deliver: (env: DispatchEnvelope) => Promise<void> | void,
): Promise<void> {
  const dir = getSpoolDir()
  if (!existsSync(dir)) return
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return
    throw e
  }
  for (const name of entries) {
    if (name.startsWith('.') || isTempFile(name) || name === 'rejected') continue
    await ingestEnvelope(join(dir, name), deliver)
  }
}

export interface SpoolWatcher {
  close(): void
}

/**
 * `ant 5165.js` XF3 — arranca el file-watcher sobre el directorio de
 * spool. El llamador provee `deliver`, que enruta el envoltorio por la
 * misma tabla de despacho de ops que usa el servidor de socket.
 *
 * fs.watch es best-effort — un timer de polling cada 5s cubre los casos
 * en que el watcher se pierde el evento (carga alta del sistema,
 * coalescencia de eventos de FS).
 */
export function startSpoolWatcher(
  deliver: (env: DispatchEnvelope) => Promise<void> | void,
): SpoolWatcher {
  const dir = getSpoolDir()
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 })
  } catch (e) {
    logEvent('tengu_bg_dispatch_watcher_failed', {
      errno: (e as NodeJS.ErrnoException).code ?? 'unknown',
      reason: 'mkdir',
    })
  }
  let watcher: FSWatcher | undefined
  try {
    watcher = watch(dir, { persistent: false }, (_event, filename) => {
      if (!filename) return
      const fname = String(filename)
      if (isTempFile(fname) || fname === 'rejected' || fname.startsWith('.')) return
      const path = join(dir, fname)
      // Sólo ingiere ante existencia (o sea, add o rename-into); ENOENT significa rename-out.
      if (!existsSync(path)) return
      void ingestEnvelope(path, deliver).catch(() => {})
    })
    watcher.on('error', e => {
      logEvent('tengu_bg_dispatch_watcher_failed', {
        errno: (e as NodeJS.ErrnoException).code ?? 'unknown',
      })
    })
  } catch (e) {
    logEvent('tengu_bg_dispatch_watcher_failed', {
      errno: (e as NodeJS.ErrnoException).code ?? 'unknown',
      reason: 'watch-setup',
    })
  }
  // Respaldo de poll cada 5s (ant no tiene esto — chokidar hace poll internamente en macOS).
  const pollTimer = setInterval(() => {
    void drainSpool(deliver).catch(() => {})
  }, 5000)
  pollTimer.unref()
  return {
    close(): void {
      if (watcher) try { watcher.close() } catch { /**/ }
      clearInterval(pollTimer)
    },
  }
}

/**
 * Escribe un envoltorio de despacho al directorio de spool. Helper del
 * lado del llamador, usado por la CLI cuando el socket del daemon no es
 * alcanzable.
 *
 * Escritura atómica vía tmp + rename (así el watcher nunca ve un archivo
 * parcial). Devuelve la ruta al envoltorio en el spool.
 */
export function writeSpoolEnvelope(env: DispatchEnvelope): string {
  const dir = getSpoolDir()
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  const id = `${env.createdAt}-${Math.random().toString(36).slice(2, 10)}`
  const tmp = join(dir, `${id}.tmp`)
  const dest = join(dir, `${id}.json`)
  writeFileSync(tmp, JSON.stringify(env), { mode: 0o600 })
  renameSync(tmp, dest)
  return dest
}
