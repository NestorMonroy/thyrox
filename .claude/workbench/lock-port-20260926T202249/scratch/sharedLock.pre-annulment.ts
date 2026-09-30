/**
 * La cara .ts del lock de estado compartido.
 *
 * El protocolo es uno y lo hablan tres lenguas: `src/session/shared_lock.py`
 * (.py), `bin/shared_lock` (.sh) y este módulo. El mecanismo aquí NO se
 * reimplementa: es `proper-lockfile`, el mismo que empaqueta el ejecutable
 * 2.1.282 (`chunk-bzev8hcq.js`; extracción y mapa de funciones en
 * `.claude/workbench/lock-port-20260926T202249/README.md`) y el que este
 * paquete ya usa en `global/config.ts`.
 *
 * Lo que esta cara añade es el dueño —pid, host, run, paso y el inodo del
 * directorio del lock— en `<archivo>.lock.owner.json`, AL LADO: dentro, el
 * `rmdir` con que `proper-lockfile` suelta y roba fallaría.
 *
 * Ciega a: la guarda de «dueño vivo sin latido» del lado .py, que aquí no
 * existe — `proper-lockfile` recupera por latido, como el ejecutable.
 */
import { readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { hostname } from 'node:os'
import { basename, dirname, join } from 'node:path'
import lockfile from 'proper-lockfile'

/** Los valores con que el ejecutable llama a su lock (`callers-ci.txt`). */
export const DEFAULT_STALE_MS = 60_000
export const DEFAULT_UPDATE_MS = 5_000
export const OWNER_SUFFIX = '.owner.json'

export type SharedLockOwner = { runId?: string; stepId?: string }
export type SharedLockOptions = { staleMs?: number; updateMs?: number; retries?: number }

/** `<archivo>.lock` sobre la ruta real, como `os.path.realpath` del lado .py:
 *  el archivo protegido puede no existir todavía. */
export function lockPath(target: string): string {
  let real: string
  try {
    real = realpathSync(target)
  } catch {
    real = join(realpathSync(dirname(target)), basename(target))
  }
  return `${real}.lock`
}

export function ownerPath(target: string): string {
  return `${lockPath(target)}${OWNER_SUFFIX}`
}

/** El dueño del lock ACTUAL; uno escrito para otro directorio se ignora. */
export function readOwner(target: string): Record<string, unknown> | undefined {
  try {
    const owner = JSON.parse(readFileSync(ownerPath(target), 'utf8'))
    return owner.lock_ino === statSync(lockPath(target)).ino ? owner : undefined
  } catch {
    return undefined
  }
}

function writeOwner(target: string, owner: SharedLockOwner): void {
  const path = ownerPath(target)
  const tmp = `${path}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify({
    pid: process.pid, host: hostname(), run_id: owner.runId ?? '', step_id: owner.stepId ?? '',
    acquired_at: new Date().toISOString(), lock_ino: statSync(lockPath(target)).ino,
  }))
  renameSync(tmp, path)
}

/** La sección crítica: toma el lock, declara su dueño, corre `fn` y suelta. */
export async function withSharedLock<T>(target: string, owner: SharedLockOwner, fn: () => Promise<T>,
                                        options: SharedLockOptions = {}): Promise<T> {
  let compromised: Error | undefined
  const release = await lockfile.lock(target, {
    lockfilePath: lockPath(target), realpath: false,
    stale: options.staleMs ?? DEFAULT_STALE_MS, update: options.updateMs ?? DEFAULT_UPDATE_MS,
    retries: options.retries ?? 0,
    onCompromised: (error) => { compromised = error },
  })
  try {
    writeOwner(target, owner)
    return await fn()
  } finally {
    try { unlinkSync(ownerPath(target)) } catch { /* ya no estaba */ }
    await release().catch((error: { code?: string }) => {
      console.warn(`shared_lock: ${target}: lock was no longer held at release (${error.code}); ` +
                   'the locked section may have run without exclusivity')
    })
    if (compromised) console.warn(`shared_lock: ${target}: lock comprometido (${compromised.message})`)
  }
}
