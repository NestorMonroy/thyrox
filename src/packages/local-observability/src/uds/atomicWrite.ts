/**
 * Escritura atómica con modo: el contenido va a un temporal hermano creado en
 * exclusiva y se publica con `rename`. Si el `rename` falla con un código de
 * `XS` (el destino vive en otro sistema de archivos, o el directorio no admite
 * el reemplazo), se escribe sobre el mismo inodo: se trunca, se escribe y, si
 * falla tras truncar, se restaura la copia tomada antes o se retira el
 * parcial. El error anota qué quedó en el destino.
 *
 * Porte de `An`, `Jne`, `Kx`, `kA`, `j`, `W`, `we`, `XL`, `De`, `Me`, `Ue`,
 * `We`, `Ye`, `Ie`, `R`, `oxe`, `ts`, `Ez`, `Le`, `ae`, `fhn` y `XS`
 * (`chunk-797phdpb.js`) de 2.1.283, con todas sus opciones.
 *
 * Lo que la compilación de Linux pliega a constantes aquí es parámetro:
 * `platform` gobierna `we` y `Ie` (sólo `win32` mira el destino antes de
 * abrir), `shouldRetryRename` es `ce` (en Linux nunca reintenta) y
 * `refuseHardLinks` es `uhn` (en Linux, apagado).
 *
 * `tempName` e `inPlaceWriteHook` no existen en la referencia: son las
 * costuras que dejan a una prueba fijar el nombre temporal y fallar la
 * escritura in situ tras truncar.
 */
import { randomBytes } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, open, rename, stat, unlink, writeFile, type FileHandle } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { getErrnoCode } from '../errorHelpers.ts'

/** Los códigos de `rename` que desvían al brazo in situ (`XS`). */
export const IN_PLACE_FALLBACK_CODES: ReadonlySet<string> = new Set(['EXDEV', 'EPERM', 'EEXIST', 'EBUSY'])

/** Intentos con nombres temporales distintos antes de rendirse ante `EEXIST` (`L`). */
const TEMP_NAME_ATTEMPTS = 3
/** Mayor archivo del que se toma copia para restaurarlo (`ue`, 64 MiB). */
const SNAPSHOT_LIMIT_BYTES = 67108864
/** Pausa entre reintentos del `rename` (`se`). */
const RENAME_RETRY_DELAY_MS = 50
/** Bit de escritura del dueño (`le`): sin él, el destino es de sólo lectura. */
const OWNER_WRITE_BIT = 0o200
/** Códigos con que un sistema de archivos dice que no admite `chmod` o `fsync` (`oxe`). */
const UNSUPPORTED_CODES: ReadonlySet<string> = new Set(['EINVAL', 'ENOTSUP', 'EPERM', 'ENOSYS'])

export type TargetOutcome = 'restored' | 'removed' | 'untouched' | 'partial'

export interface AtomicWriteOptions {
  /** Modo del archivo creado, que además se impone al reescribir in situ un destino existente. */
  mode?: number
  /** Modo sólo para crear; si `mode` falta, es el que se usa. */
  createMode?: number
  /** Modo exacto: se aplica con `chmod` tras escribir, sin el recorte del `umask`. */
  exactMode?: number
  /** Sincroniza el contenido al disco antes de publicarlo. */
  flush?: boolean
  /** El brazo in situ sigue un enlace simbólico en el destino. */
  followSymlinks?: boolean
  /** Un `EACCES` al crear el temporal se resuelve escribiendo in situ, si el destino existe. */
  inPlaceOnTempCreateRefused?: boolean
  /** Directorio donde crear el temporal, si es un directorio usable. */
  stagingDir?: string
  renameFn?: (from: string, to: string) => Promise<void>
  /** Se consulta antes de publicar; `false` aborta sin publicar nada. */
  beforePublish?: () => boolean
  platform?: string
  /** `ce`: si un fallo de `rename` merece otro intento. */
  shouldRetryRename?: (error: unknown, attempt: number) => boolean
  /** `uhn`: el brazo in situ rehúsa un destino con más de un nombre. */
  refuseHardLinks?: boolean
  tempName?: (target: string) => string
  inPlaceWriteHook?: () => void
}

/** `fhn`: el error con que `beforePublish` rehúsa la escritura. */
export class PublishRefusedError extends Error {
  readonly target: string
  constructor(target: string) {
    super('beforePublish refused the write; nothing was published')
    this.target = target
    this.name = 'PublishRefusedError'
  }
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

/** `oxe`: el sistema de archivos no admite la operación. */
function isUnsupported(error: unknown): boolean {
  const code = getErrnoCode(error)
  return code !== undefined && UNSUPPORTED_CODES.has(code)
}

/** `Ie`/`fe`: en `win32`, sólo se escribe sobre un archivo regular o ausente. */
async function targetIsWritable(path: string, platform: string): Promise<boolean> {
  if (platform !== 'win32') return true
  try {
    return (await lstat(path)).isFile()
  } catch (error) {
    return getErrnoCode(error) === 'ENOENT'
  }
}

type Snapshot = { kind: 'snapshot'; bytes: Uint8Array; mode: number } | { kind: 'absent' } | { kind: 'unavailable' }

/** `We`: copia del destino regular antes de escribir encima. */
async function snapshotTarget(target: string, followSymlinks: boolean, platform: string): Promise<Snapshot> {
  if (!followSymlinks && !(await targetIsWritable(target, platform))) return { kind: 'unavailable' }
  let handle: FileHandle
  try {
    handle = await open(target, constants.O_RDONLY | (followSymlinks ? 0 : constants.O_NOFOLLOW) | constants.O_NONBLOCK)
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
async function restoreSnapshot(target: string, snapshot: Extract<Snapshot, { kind: 'snapshot' }>, followSymlinks: boolean, platform: string): Promise<boolean> {
  if (!followSymlinks && !(await targetIsWritable(target, platform))) return false
  let handle: FileHandle
  try {
    handle = await open(
      target,
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | (followSymlinks ? 0 : constants.O_NOFOLLOW) | constants.O_NONBLOCK,
      snapshot.mode,
    )
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
function nameTakenError(path: string, cause?: unknown): Error {
  return Object.assign(new Error('EEXIST: name already taken (exclusive create)', cause === undefined ? undefined : { cause }), {
    code: 'EEXIST',
    syscall: 'lstat',
    path,
  })
}

/** `we`: en `win32`, si el nombre ya existe antes de abrirlo; `false` si está libre. */
async function tempNameTaken(path: string, platform: string): Promise<boolean | { cause: unknown }> {
  if (platform !== 'win32') return false
  try {
    await lstat(path)
    return true
  } catch (error) {
    return getErrnoCode(error) === 'ENOENT' ? false : { cause: error }
  }
}

/** `j`: prueba nombres temporales hasta que `create` lo consigue o se agotan los intentos. */
async function withFreshTempName<T>(target: string, platform: string, nameFor: (target: string) => string, create: (tmp: string) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const tmp = nameFor(target)
    const taken = await tempNameTaken(tmp, platform)
    if (taken !== false) {
      if (attempt < TEMP_NAME_ATTEMPTS) continue
      throw nameTakenError(tmp, taken === true ? undefined : taken.cause)
    }
    try {
      return await create(tmp)
    } catch (error) {
      if (getErrnoCode(error) === 'EEXIST' && attempt < TEMP_NAME_ATTEMPTS) continue
      throw error
    }
  }
}

/** `XL`: el temporal escrito de una vez, en exclusiva y con `mode`. */
function writeExclusiveTemp(base: string, content: string, mode: number | undefined, platform: string, nameFor: (target: string) => string): Promise<string> {
  return withFreshTempName(base, platform, nameFor, async tmp => {
    try {
      await writeFile(tmp, content, { encoding: 'utf8', mode, flag: 'wx' })
      return tmp
    } catch (error) {
      if (getErrnoCode(error) !== 'EEXIST') await unlink(tmp).catch(() => {})
      throw error
    }
  })
}

/** `De`: el temporal abierto en exclusiva, para escribirlo, fijar su modo y sincronizarlo. */
function openExclusiveTemp(base: string, mode: number | undefined, platform: string, nameFor: (target: string) => string): Promise<{ handle: FileHandle; tmp: string }> {
  const flags = platform === 'win32' ? 'wx' : constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL
  return withFreshTempName(base, platform, nameFor, async tmp => ({ handle: await open(tmp, flags, mode), tmp }))
}

/** `Ue`: si el directorio pertenece a otro usuario (entonces no es nuestro para usarlo). */
async function ownedByAnotherUser(dir: string): Promise<boolean> {
  const uid = process.getuid?.()
  if (uid === undefined) return false
  try {
    return (await lstat(dir)).uid !== uid
  } catch {
    return false
  }
}

/** `Me`: dónde nace el temporal: en `stagingDir` si es un directorio usable, si no junto al destino. */
async function stagingBase(target: string, stagingDir: string | undefined): Promise<string> {
  if (stagingDir === undefined) return target
  try {
    await (await open(stagingDir, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)).close()
  } catch (error) {
    switch (getErrnoCode(error)) {
      case 'ENOENT':
      case 'ELOOP':
      case 'ENOTDIR':
        return target
      case 'EACCES':
      case 'EPERM':
        if (await ownedByAnotherUser(stagingDir)) return target
        throw error
      default:
        throw error
    }
  }
  return join(stagingDir, basename(target))
}

/** `Le`: el destino no tiene el bit de escritura del dueño. */
async function isReadOnlyTarget(path: string): Promise<boolean> {
  try {
    return ((await lstat(path)).mode & OWNER_WRITE_BIT) === 0
  } catch {
    return false
  }
}

/** `ts`/`Ez`: el `rename`, reintentado mientras `shouldRetry` lo pida, salvo sobre un destino de sólo lectura. */
async function renameWithRetry(from: string, to: string, run: () => Promise<void>, shouldRetry: (error: unknown, attempt: number) => boolean): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await run()
      return
    } catch (error) {
      if (!shouldRetry(error, attempt)) throw error
      if (attempt === 0 && (await isReadOnlyTarget(to))) throw error
      await Bun.sleep(RENAME_RETRY_DELAY_MS)
    }
  }
}

/** `ae`: el rechazo de reescribir in situ un archivo con otros nombres. */
function hardLinkRefusal(path: string, links: number): Error {
  return Object.assign(
    new Error(
      `Could not rewrite ${path} in place: this file has other names on disk (it is hard-linked, ${links} names in all), and writing it in place would change the file under every one of those names. Remove the extra links, then try again.`,
    ),
    { code: 'EMLINK', path },
  )
}

/** `An`/`Jne`: publica `content` en `target`, de forma atómica cuando el sistema de archivos lo permite. */
export async function writeFileAtomicWithMode(target: string, content: string, options: AtomicWriteOptions = {}): Promise<void> {
  const {
    mode,
    createMode,
    exactMode,
    flush,
    followSymlinks = false,
    inPlaceOnTempCreateRefused,
    stagingDir,
    renameFn = rename,
    beforePublish,
    platform = process.platform,
    shouldRetryRename = () => false,
    refuseHardLinks = false,
    tempName = tempNameFor,
    inPlaceWriteHook,
  } = options
  const effectiveMode = mode ?? createMode
  const checkPublish = () => {
    if (beforePublish !== undefined && !beforePublish()) throw new PublishRefusedError(target)
  }
  const base = await stagingBase(target, stagingDir)
  let tmp: string | undefined
  let keepTmp = false
  let staged = false

  /** `K`: escribe sobre el inodo del destino; `preservedTmp` ya lleva el contenido nuevo. */
  const writeInPlace = async (preservedTmp: string | undefined): Promise<void> => {
    const snapshot = await snapshotTarget(target, followSymlinks, platform)
    checkPublish()
    const handle = await open(
      target,
      constants.O_WRONLY | constants.O_CREAT | (followSymlinks ? 0 : constants.O_NOFOLLOW) | constants.O_NONBLOCK,
      exactMode ?? effectiveMode,
    )
    let stats
    try {
      stats = await handle.stat()
    } catch (error) {
      await handle.close().catch(() => {})
      keepTmp = preservedTmp !== undefined
      throw annotateOutcome(error, preservedTmp, 'untouched')
    }
    const isDevice = stats.isCharacterDevice()
    if (!stats.isFile() && !isDevice) {
      await handle.close().catch(() => {})
      throw Object.assign(new Error('refusing the in-place arm on a non-regular target'), { code: 'ENXIO', path: target })
    }
    if (!isDevice && stats.nlink > 1 && refuseHardLinks) {
      await handle.close().catch(() => {})
      throw hardLinkRefusal(target, stats.nlink)
    }
    if (beforePublish !== undefined && !beforePublish()) {
      await handle.close().catch(() => {})
      if (snapshot.kind === 'absent' && stats.size === 0 && !isDevice) await unlink(target).catch(() => {})
      throw new PublishRefusedError(target)
    }
    let truncated = false
    try {
      if (!isDevice) {
        await handle.truncate(0)
        truncated = true
      }
      inPlaceWriteHook?.()
      await handle.writeFile(content, { encoding: 'utf8' })
      const finalMode = isDevice ? undefined : (exactMode ?? (snapshot.kind !== 'absent' ? mode : undefined))
      if (finalMode !== undefined) await handle.chmod(finalMode).catch(() => {})
      if (flush === true) {
        try {
          await handle.sync()
        } catch (error) {
          if (!isUnsupported(error)) throw error
        }
      }
      await handle.close()
    } catch (error) {
      await handle.close().catch(() => {})
      keepTmp = preservedTmp !== undefined
      if (!truncated) throw annotateOutcome(error, preservedTmp, 'untouched')
      const outcome: TargetOutcome =
        snapshot.kind === 'snapshot' && (await restoreSnapshot(target, snapshot, followSymlinks, platform))
          ? 'restored'
          : (await unlink(target).then(() => true, e => getErrnoCode(e) === 'ENOENT'))
            ? 'removed'
            : 'partial'
      throw annotateOutcome(error, preservedTmp, outcome)
    }
    const leftover = preservedTmp ?? tmp
    if (leftover !== undefined) await unlink(leftover).catch(() => {})
  }

  try {
    try {
      if (exactMode !== undefined || flush === true) {
        const opened = await openExclusiveTemp(base, exactMode ?? effectiveMode, platform, tempName)
        tmp = opened.tmp
        let failure: { error: unknown } | undefined
        try {
          await opened.handle.writeFile(content, { encoding: 'utf8' })
          if (exactMode !== undefined) {
            try {
              await opened.handle.chmod(exactMode)
            } catch (error) {
              if (!isUnsupported(error)) throw error
            }
          }
          if (flush === true) {
            try {
              await opened.handle.sync()
            } catch (error) {
              if (!isUnsupported(error)) throw error
            }
          }
        } catch (error) {
          failure = { error }
        }
        if (failure === undefined) staged = true
        try {
          await opened.handle.close()
        } catch (error) {
          if (failure === undefined) {
            keepTmp = true
            throw annotateOutcome(error, tmp, 'untouched')
          }
        }
        if (failure !== undefined) throw failure.error
      } else {
        tmp = await writeExclusiveTemp(base, content, effectiveMode, platform, tempName)
        staged = true
      }
    } catch (error) {
      if (inPlaceOnTempCreateRefused !== true || staged || getErrnoCode(error) !== 'EACCES') throw error
      if (!(await stat(target).then(() => true, () => false))) throw error
      await writeInPlace(undefined)
      return
    }
    const staging = tmp
    try {
      await renameWithRetry(staging, target, () => (checkPublish(), renameFn(staging, target)), shouldRetryRename)
    } catch (error) {
      const code = getErrnoCode(error)
      if (code === undefined || !IN_PLACE_FALLBACK_CODES.has(code)) throw error
      await writeInPlace(staging)
    }
  } catch (error) {
    if (tmp !== undefined && !keepTmp) await unlink(tmp).catch(() => {})
    throw error
  }
}
