/**
 * El directorio donde viven los sockets de las sesiones: se verifica cada
 * componente del camino antes de confiar en él y se crea privado. Porte de
 * `Re`, `M`, `dn`, `V`, `Te`, `un`, `cn`, `fn`, `se`, `Ee`, `X`, `ke`, `ve`,
 * `ln` y `De` de 2.1.283 (`chunk-yg53q7yp.js`).
 *
 * Un componente es aceptable si es nuestro, o de root, y además privado, o
 * escribible por otros sólo con el sticky bit. Un directorio compartido
 * permitiría a otro usuario sustituir el socket.
 */
import type { Stats } from 'node:fs'
import { chmod, lstat, mkdir, readlink, realpath } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join } from 'node:path'

import { getErrnoCode, isENOENT } from '../errorHelpers.ts'
import { sanitizeForDisplay, shellQuote } from './displayText.ts'
import { TRUSTED_SYSTEM_DIRS, probeUidNamespace, type UidNamespace } from './uidNamespace.ts'

export const SOCKETS_DIR_VET_KINDS = [
  'directory_rule', 'foreign_owner', 'leaf_shape', 'dangling_link', 'raced',
  'not_directory', 'symlink_loop', 'uid_collapse', 'internal',
] as const
export type SocketsDirVetKind = (typeof SOCKETS_DIR_VET_KINDS)[number]

export type RefusedComponent = { path: string; uid: number; gid: number; mode: number; ownerRefused?: boolean }

export class SocketsDirError extends Error {
  constructor(readonly kind: SocketsDirVetKind, message: string, readonly refusedComponent?: RefusedComponent) {
    super(message)
    this.name = 'SocketsDirError'
  }
}

export type SocketsDirDeps = {
  getuid: () => number | undefined
  getgid: () => number | undefined
  probeNamespace: () => Promise<UidNamespace | undefined>
  env: Record<string, string | undefined>
}

export const processSocketsDirDeps: SocketsDirDeps = {
  getuid: () => process.getuid?.(),
  getgid: () => process.getgid?.(),
  probeNamespace: () => probeUidNamespace(),
  env: process.env,
}

const PRIVATE_DIR_MODE = 0o700
const STICKY_BIT = 0o1000
const WORLD_WRITABLE = 0o002
const GROUP_WRITABLE = 0o020
const MAX_SYMLINK_DEPTH = 16

/** `V`: el componente rehusado, tal como se describe en el error. */
function componentOf(path: string, stats: Stats, ownerRefused?: boolean): RefusedComponent {
  return { path, uid: stats.uid, gid: stats.gid, mode: stats.mode & 0o7777, ...(ownerRefused !== undefined && { ownerRefused }) }
}

function danglingLink(): SocketsDirError {
  return new SocketsDirError('dangling_link', 'a component of the sockets path is a symlink whose target does not exist — create the target (0700) or repoint the link')
}

/** `Re`: verifica el camino del directorio de sockets y lo deja creado con modo 0700. */
export async function prepareSocketsDirectory(dir: string, deps: SocketsDirDeps = processSocketsDirDeps): Promise<void> {
  if (!isAbsolute(dir)) throw new SocketsDirError('internal', 'sockets directory must be absolute here')
  const uid = deps.getuid()
  const gid = deps.getgid()
  const namespace = await deps.probeNamespace()
  if (namespace?.uidCollapses) {
    throw new SocketsDirError('uid_collapse', 'this process reads as the kernel overflow uid (user namespace without a uid mapping) — ownership cannot be verified; refusing to use the sockets directory')
  }
  const ownedByUs = (owner: number) => owner === uid && !namespace?.uidCollapses
  const checkLeaf = (stats: Stats) => {
    if (stats.isSymbolicLink()) throw new SocketsDirError('leaf_shape', 'sockets directory is a symlink — refusing to use it', componentOf(dir, stats))
    if (!stats.isDirectory()) throw new SocketsDirError('leaf_shape', 'sockets directory exists but is not a directory', componentOf(dir, stats))
    if (uid !== undefined && !ownedByUs(stats.uid)) throw new SocketsDirError('foreign_owner', 'sockets directory is owned by another user — refusing to use it', componentOf(dir, stats))
  }
  /** El camino real de un componente, si sigue siendo el mismo inodo que se examinó. */
  const verifiedRealPath = async (path: string, stats: Stats): Promise<string | undefined> => {
    try {
      const real = stats.isSymbolicLink() ? join(await realpath(dirname(path)), basename(path)) : await realpath(path)
      const again = await lstat(real)
      return again.dev === stats.dev && again.ino === stats.ino ? real : undefined
    } catch {
      return undefined
    }
  }
  const ambiguousOwner = (owner: number) => namespace !== undefined
    && ((namespace.unmappedOwnerUid !== undefined && owner === namespace.unmappedOwnerUid) || (owner === 0 && namespace.rootUidAmbiguous))
  const isTrustedSystemDir = (real: string | undefined) => real !== undefined && TRUSTED_SYSTEM_DIRS.has(real)
  const ownerAcceptable = (owner: number, isLeafToCreate: boolean, real: string | undefined) =>
    uid === undefined || ownedByUs(owner) || (!isLeafToCreate && (ambiguousOwner(owner) ? isTrustedSystemDir(real) : owner === 0))
  const directoryAcceptable = (stats: Stats, isLeafToCreate: boolean, real: string | undefined) => {
    if (!ownerAcceptable(stats.uid, isLeafToCreate, real)) return false
    if ((stats.mode & STICKY_BIT) !== 0) return true
    if ((stats.mode & WORLD_WRITABLE) !== 0) return false
    if ((stats.mode & GROUP_WRITABLE) !== 0) return ownedByUs(stats.uid) && gid !== undefined && stats.gid === gid && gid === uid
    return true
  }
  const termuxRoot = deps.env.TERMUX_VERSION && deps.env.PREFIX ? dirname(dirname(deps.env.PREFIX)) : undefined
  const isWalkRoot = (path: string) => dirname(path) === path || path === termuxRoot

  type Walk = { startExists: boolean; deepestExisting: string | undefined; sawSymlink: boolean }
  const walkUp = async (start: string, isLeafToCreate: boolean, depth = 0): Promise<Walk> => {
    if (depth > MAX_SYMLINK_DEPTH) throw new SocketsDirError('symlink_loop', 'sockets-directory chain: too many levels of symlinks')
    let startExists = false
    let deepestExisting: string | undefined
    let sawSymlink = false
    for (let path = start, isStart = true; ; path = dirname(path), isStart = false) {
      let stats: Stats | undefined
      try {
        stats = await lstat(path)
      } catch (error) {
        if (!isENOENT(error)) throw error
      }
      if (stats !== undefined) {
        deepestExisting ??= path
        const leafToCreate = isStart && isLeafToCreate
        if (stats.isSymbolicLink()) {
          sawSymlink = true
          const real = ambiguousOwner(stats.uid) ? await verifiedRealPath(path, stats) : undefined
          if (!ownerAcceptable(stats.uid, false, real)) {
            throw new SocketsDirError('foreign_owner', 'a sockets-directory component is a symlink owned by another user — refusing to use it', componentOf(path, stats))
          }
          const raw = (await readlink(path)).replace(/\/{2,}/g, '/')
          const trimmed = raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw
          const target = isAbsolute(trimmed) ? trimmed : `${await realpath(dirname(path))}/${trimmed}`
          const inner = await walkUp(target, leafToCreate, depth + 1)
          if (isStart) startExists = inner.startExists
        } else {
          if (!stats.isDirectory()) {
            throw new SocketsDirError('not_directory', 'a sockets-directory component exists but is not a directory — refusing to use it', componentOf(path, stats))
          }
          const real = ambiguousOwner(stats.uid) ? await verifiedRealPath(path, stats) : undefined
          if (!directoryAcceptable(stats, leafToCreate, real)) {
            throw new SocketsDirError('directory_rule', 'a sockets-directory component is not a private-or-sticky directory owned by us or root — refusing to use it', componentOf(path, stats, !ownerAcceptable(stats.uid, leafToCreate, real)))
          }
          if (isStart) startExists = true
        }
      }
      if (isWalkRoot(path)) break
    }
    return { startExists, deepestExisting, sawSymlink }
  }

  const parent = dirname(dir)
  const walk = await walkUp(parent, false)
  const parentMissing = !walk.startExists
  let leaf: Stats | undefined
  try {
    leaf = await lstat(dir)
  } catch (error) {
    if (!isENOENT(error)) throw error
  }
  if (parentMissing && walk.deepestExisting === parent) throw danglingLink()
  if (parentMissing) {
    const toCreate: string[] = []
    for (let path = parent; path !== walk.deepestExisting && !isWalkRoot(path); path = dirname(path)) toCreate.unshift(path)
    for (const path of toCreate) {
      try {
        await mkdir(path, { mode: PRIVATE_DIR_MODE })
      } catch (error) {
        if (isENOENT(error) && walk.sawSymlink) throw danglingLink()
        if (getErrnoCode(error) !== 'EEXIST') throw error
        const raced = await lstat(path)
        if (!raced.isDirectory() || (uid !== undefined && !ownedByUs(raced.uid))) {
          throw new SocketsDirError('raced', 'a sockets-directory component appeared while being created and is not our directory — refusing to use it')
        }
      }
    }
    if (!(await walkUp(parent, true)).startExists) throw new SocketsDirError('raced', 'sockets base directory vanished while being set up')
  }
  if (leaf === undefined) {
    try {
      await mkdir(dir, { mode: PRIVATE_DIR_MODE })
    } catch (error) {
      if (getErrnoCode(error) !== 'EEXIST') throw error
    }
    leaf = await lstat(dir)
  }
  checkLeaf(leaf)
  if ((leaf.mode & 0o777) !== PRIVATE_DIR_MODE) await chmod(dir, PRIVATE_DIR_MODE)
}

/** `se`: la clase de rechazo de un error, si la tiene. */
export function vetKindOf(error: unknown): SocketsDirVetKind | undefined {
  return error instanceof SocketsDirError ? error.kind : undefined
}

const FALLBACK_ERRNOS = new Set(['EACCES', 'EPERM', 'EROFS', 'ENOSPC', 'EDQUOT', 'ENOTDIR'])

/** `fn`: si tras este rechazo vale la pena el respaldo por uid en `/tmp`. */
export function canFallBackToPerUid(error: unknown): boolean {
  switch (vetKindOf(error)) {
    case 'directory_rule': case 'foreign_owner': case 'leaf_shape': case 'not_directory':
      return true
    case 'dangling_link': case 'symlink_loop': case 'raced': case 'uid_collapse': case 'internal':
      return false
    case undefined:
      break
  }
  const code = getErrnoCode(error)
  return code !== undefined && FALLBACK_ERRNOS.has(code)
}

const PRIVATE_DIR_ADVICE = 'Point XDG_RUNTIME_DIR or THYROX_CODE_TMPDIR at a private (0700) directory you own to use a different location.'
const NOT_DIRECTORY_HINT = `A component of the sockets path is not a directory (a regular file is in the way). ${PRIVATE_DIR_ADVICE}`
const SYMLINK_LOOP_HINT = `The sockets path runs through a symlink loop. ${PRIVATE_DIR_ADVICE}`
const UID_COLLAPSE_HINT = 'This process runs in a user namespace without a uid mapping (its own uid reads as the kernel overflow uid), so file ownership cannot be verified. Start it with a uid map (e.g. `unshare -Ur` / `--map-current-user`), or pass --messaging-socket-path.'

/** `De`: qué puede hacer quien lee el rechazo. */
export function socketsDirHint(error: unknown): string {
  switch (vetKindOf(error)) {
    case 'directory_rule':
      return `A directory on the sockets path is shared (world- or group-writable without the sticky bit, e.g. a container volume mounted at /tmp) or not owned by you or root. ${PRIVATE_DIR_ADVICE}`
    case 'foreign_owner': case 'leaf_shape':
      return PRIVATE_DIR_ADVICE
    case 'not_directory':
      return NOT_DIRECTORY_HINT
    case 'symlink_loop':
      return SYMLINK_LOOP_HINT
    case 'uid_collapse':
      return UID_COLLAPSE_HINT
    case 'dangling_link': case 'raced': case 'internal':
      return ''
    case undefined:
      break
  }
  switch (getErrnoCode(error)) {
    case 'ENOTDIR': return NOT_DIRECTORY_HINT
    case 'ELOOP': return SYMLINK_LOOP_HINT
    case 'EACCES': case 'EPERM':
      return `This user lacks permission on part of the sockets path (an ancestor is not searchable, or the parent is not writable). ${PRIVATE_DIR_ADVICE}`
    case 'ENOENT': return `An ancestor of the sockets path does not exist. ${PRIVATE_DIR_ADVICE}`
    default: return ''
  }
}

/** `un`: los caracteres que se pueden mostrar citados sin ambigüedad. */
const DISPLAY_SAFE_CHAR = /^[A-Za-z0-9._\/ ~+=:@,#%-]$/

/** `Te`: el componente rehusado, con su dueño y modo, y la orden que lo arregla. */
export function refusedComponentDetail(error: unknown): string | undefined {
  if (vetKindOf(error) === 'uid_collapse') {
    return 'this process runs in a user namespace without a uid mapping, so file ownership cannot be verified — start it with a uid map (e.g. unshare -Ur), or pass --messaging-socket-path'
  }
  const component = error instanceof SocketsDirError ? error.refusedComponent : undefined
  if (component === undefined) return undefined
  const mode = component.mode.toString(8).padStart(4, '0')
  const owner = `(owner ${component.uid}:${component.gid}, mode ${mode})`
  const orPass = 'or pass --messaging-socket-path'
  const displayed = sanitizeForDisplay(component.path)
  let quotable = displayed === component.path
  const shown = `'${Array.from(displayed, char => {
    if (DISPLAY_SAFE_CHAR.test(char)) return char
    quotable = false
    return '?'
  }).join('')}'`
  const fix = (bits: 'o-w' | 'g-w', suffix: string) =>
    quotable ? `chmod ${bits} ${shellQuote([component.path])}${suffix}` : `clear its ${bits === 'o-w' ? 'other' : 'group'}-write bit${suffix}`
  const privateDir = `use a private directory (XDG_RUNTIME_DIR / THYROX_CODE_TMPDIR), ${orPass}`
  switch (vetKindOf(error)) {
    case 'directory_rule': {
      if (component.ownerRefused === true) return `${shown} is not owned by you or root ${owner} — ${privateDir}`
      const sticky = (component.mode & STICKY_BIT) !== 0
      if (!sticky && (component.mode & WORLD_WRITABLE) !== 0) return `${shown} is world-writable without the sticky bit ${owner} — ${fix('o-w', ' (or chmod +t)')}, ${orPass}`
      if (!sticky && (component.mode & GROUP_WRITABLE) !== 0) return `${shown} is group-writable without the sticky bit ${owner} — ${fix('g-w', '')}, ${orPass}`
      return `${shown} is not owned by you or root ${owner} — ${privateDir}`
    }
    case 'foreign_owner':
      return `${shown} is owned by another user ${owner} — ${privateDir}`
    case 'not_directory': case 'leaf_shape':
      return `${shown} is not a directory ${owner} — remove it or ${privateDir}`
    default:
      return undefined
  }
}
