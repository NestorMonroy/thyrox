/**
 * Escritura atómica con modo: el contenido va a un temporal hermano creado en
 * exclusiva con el modo pedido y se publica con `rename`. Si el `rename` falla
 * con un código de `XS` (el destino vive en otro sistema de archivos, o el
 * directorio no admite el reemplazo), se escribe sobre el mismo inodo: se
 * trunca, se escribe y, si falla tras truncar, se restaura la copia tomada
 * antes o se retira el parcial. El error anota qué quedó en el destino.
 *
 * Porte de `An`, `Jne`, `Kx`, `kA`, `j`, `W`, `XL`, `We`, `Ye`, `R` y `XS`
 * (`chunk-797phdpb.js`) de 2.1.283, sólo en la rama que `An` alcanza: sin
 * `exactMode`, sin `flush`, sin `stagingDir`, sin `beforePublish` y sin
 * `inPlaceOnTempCreateRefused`. `we` (colisión previa del nombre), `ce`
 * (reintento del `rename`) y `uhn` (rechazo de enlaces duros) valen `false`
 * en la compilación de Linux de la referencia, y aquí también.
 *
 * `tempName` e `inPlaceWriteHook` no existen en la referencia: son las
 * costuras que dejan a una prueba fijar el nombre temporal y fallar la
 * escritura in situ tras truncar.
 */
import { randomBytes } from 'node:crypto'
import { constants } from 'node:fs'
import { open, rename, unlink, writeFile } from 'node:fs/promises'

import { getErrnoCode } from '../errorHelpers.ts'

/** Los códigos de `rename` que desvían al brazo in situ (`XS`). */
export const IN_PLACE_FALLBACK_CODES: ReadonlySet<string> = new Set(['EXDEV', 'EPERM', 'EEXIST', 'EBUSY'])

/** Intentos con nombres temporales distintos antes de rendirse ante `EEXIST` (`L`). */
const TEMP_NAME_ATTEMPTS = 3
/** Mayor archivo del que se toma copia para restaurarlo (`ue`, 64 MiB). */
const SNAPSHOT_LIMIT_BYTES = 67108864

export type TargetOutcome = 'restored' | 'removed' | 'untouched' | 'partial'

export interface AtomicWriteOptions {
  mode?: number
  renameFn?: (from: string, to: string) => Promise<void>
  tempName?: (target: string) => string
  inPlaceWriteHook?: () => void
}

/** `Kx`: el temporal hermano del destino, `<destino>.tmp.<8 hex>`. */
export function tempNameFor(target: string): string {
  return `${target}.tmp.${randomBytes(4).toString('hex')}`
}

/** `kA`: si `name` es un temporal de `target`. */
export function isTempNameFor(name: string, target: string): boolean {
  const prefix = `${target}.tmp.`
  return name.startsWith(prefix) && /^[0-9a-f]{8}$/.test(name.slice(prefix.length))
}

const OUTCOME_TEXT: Record<TargetOutcome, string> = {
  restored: 'original target restored',
  removed: 'partial target removed',
  untouched: 'target untouched',
  partial: 'target left partial — treat contents as torn',
}

/** `R`: anota en el error dónde quedó el contenido nuevo y en qué estado quedó el destino. */
function annotateOutcome(error: unknown, preservedTmp: string | undefined, outcome: TargetOutcome): unknown {
  try {
    if (error instanceof Error) {
      const preserved = preservedTmp !== undefined ? `new contents preserved at ${preservedTmp}; ` : ''
      error.message = `${error.message}; ${preserved}${OUTCOME_TEXT[outcome]}`
      Object.assign(error, { ...(preservedTmp !== undefined && { preservedTmp }), targetOutcome: outcome })
    }
  } catch {
    // un error congelado se propaga tal cual
  }
  return error
}

type Snapshot = { kind: 'snapshot'; bytes: Uint8Array; mode: number } | { kind: 'absent' } | { kind: 'unavailable' }

/** `We`: copia del destino regular, sin seguir enlaces, antes de escribir encima. */
async function snapshotTarget(target: string): Promise<Snapshot> {
  let handle
  try {
    handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
  } catch (error) {
    return getErrnoCode(error) === 'ENOENT' ? { kind: 'absent' } : { kind: 'unavailable' }
  }
  try {
    const stats = await handle.stat()
    if (!stats.isFile() || stats.size > SNAPSHOT_LIMIT_BYTES) return { kind: 'unavailable' }
    return { kind: 'snapshot', bytes: new Uint8Array(await handle.readFile()), mode: stats.mode & 0o7777 }
  } catch {
    return { kind: 'unavailable' }
  } finally {
    await handle.close().catch(() => {})
  }
}

/** `Ye`: devuelve al destino la copia tomada; `false` si no pudo. */
async function restoreSnapshot(target: string, snapshot: Extract<Snapshot, { kind: 'snapshot' }>): Promise<boolean> {
  let handle
  try {
    handle = await open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW | constants.O_NONBLOCK, snapshot.mode)
  } catch {
    return false
  }
  try {
    if (!(await handle.stat()).isFile()) {
      await handle.close().catch(() => {})
      return false
    }
    await handle.writeFile(snapshot.bytes)
    await handle.chmod(snapshot.mode).catch(() => {})
    await handle.close()
    return true
  } catch {
    await handle.close().catch(() => {})
    return false
  }
}

/** `W`: el `EEXIST` que se lanza cuando se agotan los nombres temporales. */
function nameTakenError(path: string): Error {
  return Object.assign(new Error('EEXIST: name already taken (exclusive create)'), { code: 'EEXIST', syscall: 'lstat', path })
}

/** `j` + `XL`: crea el temporal en exclusiva con el modo pedido, probando otro nombre ante `EEXIST`. */
async function writeExclusiveTemp(target: string, content: string, mode: number | undefined, nameFor: (target: string) => string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const tmp = nameFor(target)
    try {
      await writeFile(tmp, content, { encoding: 'utf8', mode, flag: 'wx' })
      return tmp
    } catch (error) {
      if (getErrnoCode(error) === 'EEXIST') {
        if (attempt < TEMP_NAME_ATTEMPTS) continue
        throw error instanceof Error ? error : nameTakenError(tmp)
      }
      await unlink(tmp).catch(() => {})
      throw error
    }
  }
}

/**
 * `K`: escribe sobre el inodo del destino. `preservedTmp` es el temporal que
 * ya lleva el contenido nuevo: si la escritura falla, se conserva y el error lo
 * nombra; si termina, se retira.
 */
async function writeInPlace(target: string, content: string, mode: number | undefined, preservedTmp: string, hook: (() => void) | undefined): Promise<void> {
  const snapshot = await snapshotTarget(target)
  const handle = await open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW | constants.O_NONBLOCK, mode)
  let stats
  try {
    stats = await handle.stat()
  } catch (error) {
    await handle.close().catch(() => {})
    throw annotateOutcome(error, preservedTmp, 'untouched')
  }
  const isDevice = stats.isCharacterDevice()
  if (!stats.isFile() && !isDevice) {
    await handle.close().catch(() => {})
    throw Object.assign(new Error('refusing the in-place arm on a non-regular target'), { code: 'ENXIO', path: target })
  }
  let truncated = false
  try {
    if (!isDevice) {
      await handle.truncate(0)
      truncated = true
    }
    hook?.()
    await handle.writeFile(content, { encoding: 'utf8' })
    const finalMode = isDevice ? undefined : snapshot.kind !== 'absent' ? mode : undefined
    if (finalMode !== undefined) await handle.chmod(finalMode).catch(() => {})
    await handle.close()
  } catch (error) {
    await handle.close().catch(() => {})
    if (!truncated) throw annotateOutcome(error, preservedTmp, 'untouched')
    const outcome: TargetOutcome =
      snapshot.kind === 'snapshot' && (await restoreSnapshot(target, snapshot))
        ? 'restored'
        : (await unlink(target).then(() => true, e => getErrnoCode(e) === 'ENOENT'))
          ? 'removed'
          : 'partial'
    throw annotateOutcome(error, preservedTmp, outcome)
  }
  await unlink(preservedTmp).catch(() => {})
}

/** `An`/`Jne`: publica `content` en `target` con `mode`, de forma atómica cuando el sistema de archivos lo permite. */
export async function writeFileAtomicWithMode(target: string, content: string, options: AtomicWriteOptions = {}): Promise<void> {
  const { mode, renameFn = rename, tempName = tempNameFor, inPlaceWriteHook } = options
  let tmp: string | undefined
  let keepTmp = false
  try {
    tmp = await writeExclusiveTemp(target, content, mode, tempName)
    try {
      await renameFn(tmp, target)
    } catch (error) {
      const code = getErrnoCode(error)
      if (code === undefined || !IN_PLACE_FALLBACK_CODES.has(code)) throw error
      try {
        await writeInPlace(target, content, mode, tmp, inPlaceWriteHook)
      } catch (inPlaceError) {
        keepTmp = (inPlaceError as { preservedTmp?: string } | null)?.preservedTmp !== undefined
        throw inPlaceError
      }
    }
  } catch (error) {
    if (tmp !== undefined && !keepTmp) await unlink(tmp).catch(() => {})
    throw error
  }
}
