/**
 * Puerto de `ccnmt: packages/storage/src/fsOperations.ts` (23 801 bytes
 * fuente). Define la interfaz `FsOperations` (abstracción sobre `node:fs`
 * que permite sustituir el filesystem real por uno virtual/mock),
 * `safeResolvePath`/`resolveDeepestExistingAncestorSync`/
 * `getPathsForPermissionCheck` (resolución de symlinks para chequeo de
 * permisos) y el `NodeFsOperations` concreto que usa `node:fs` real.
 *
 * Divergencias declaradas — dos dependencias de paquete hermano ausente,
 * sustituidas localmente (mismo patrón de
 * `../internal/pendingCrossPackageDeps.ts`, DEC-04: ningún paquete
 * `@thyrox/*` se importa por nombre todavía):
 *
 * - `getErrnoCode` (de
 *   `@claude-code-how-works/local-observability/errorHelpers.js`) — se
 *   reimplementa aquí verbatim (misma forma que la fuente,
 *   `errorHelpers.ts:113-119`) y se exporta para que otros módulos de
 *   ESTE paquete (`fileEncoding.ts`, `filePersistence/filePersistence.ts`)
 *   la reusen sin duplicarla — ya hay precedente de que este archivo es
 *   el punto de dependencia de primitivas de bajo nivel del paquete:
 *   `secureStorage/plainTextStorage.ts` (existente, no mío) ya importa
 *   `getFsImplementation` de aquí.
 * - `slowLogging` (de
 *   `@claude-code-how-works/local-observability/slowLoggingTag.js`) — la
 *   PROPIA fuente de ese tag (`slowLoggingTag.ts:130-135`) resuelve a un
 *   no-op fuera de un build "ant" (`feature('SLOW_OPERATION_LOGGING')`,
 *   macro de `bun:bundle` ausente en este árbol — mismo precedente que
 *   `sessionStoragePredicates.ts`/`runtimeActivation.ts`: el gateo se
 *   omite, no se reemplaza). Sustituirlo por un no-op fiel no es una
 *   divergencia de comportamiento: es EL comportamiento real en todo
 *   build que no sea ant.
 */
import * as fs from 'fs'
import {
  mkdir as mkdirPromise,
  open,
  readdir as readdirPromise,
  readFile as readFilePromise,
  rename as renamePromise,
  rmdir as rmdirPromise,
  rm as rmPromise,
  stat as statPromise,
  unlink as unlinkPromise,
} from 'fs/promises'
import { homedir } from 'os'
import * as nodePath from 'path'
import { getOriginalCwd } from './sessionPaths.js'

/**
 * Sustituto local de
 * `@claude-code-how-works/local-observability/errorHelpers.js`'s
 * `getErrnoCode` — verbatim a `errorHelpers.ts:113-119`.
 */
export function getErrnoCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') {
    return e.code
  }
  return undefined
}

/**
 * Sustituto local de
 * `@claude-code-how-works/local-observability/slowLoggingTag.js`'s
 * `slowLogging` — no-op fiel (ver docstring del módulo). La fuente exige
 * un `TemplateStringsArray` como primer argumento del tag; aquí se ignora
 * por completo, igual que el `slowLoggingExternal` real cuando el
 * reporter nunca se instala.
 */
function slowLogging(
  _strings: TemplateStringsArray,
  ..._values: unknown[]
): Disposable {
  return { [Symbol.dispose]() {} }
}

/**
 * Simplified filesystem operations interface based on Node.js fs module.
 * Provides a subset of commonly used sync operations with type safety.
 * Allows abstraction for alternative implementations (e.g., mock, virtual).
 */
export type FsOperations = {
  // File access and information operations
  /** Gets the current working directory */
  cwd(): string
  /** Checks if a file or directory exists */
  existsSync(path: string): boolean
  /** Gets file stats asynchronously */
  stat(path: string): Promise<fs.Stats>
  /** Lists directory contents with file type information asynchronously */
  readdir(path: string): Promise<fs.Dirent[]>
  /** Deletes file asynchronously */
  unlink(path: string): Promise<void>
  /** Removes an empty directory asynchronously */
  rmdir(path: string): Promise<void>
  /** Removes files and directories asynchronously (with recursive option) */
  rm(
    path: string,
    options?: { recursive?: boolean; force?: boolean },
  ): Promise<void>
  /** Creates directory recursively asynchronously. */
  mkdir(path: string, options?: { mode?: number }): Promise<void>
  /** Reads file content as string asynchronously */
  readFile(path: string, options: { encoding: BufferEncoding }): Promise<string>
  /** Renames/moves file asynchronously */
  rename(oldPath: string, newPath: string): Promise<void>
  /** Gets file stats */
  statSync(path: string): fs.Stats
  /** Gets file stats without following symlinks */
  lstatSync(path: string): fs.Stats

  // File content operations
  /** Reads file content as string with specified encoding */
  readFileSync(
    path: string,
    options: {
      encoding: BufferEncoding
    },
  ): string
  /** Reads raw file bytes as Buffer */
  readFileBytesSync(path: string): Buffer
  /** Reads specified number of bytes from file start */
  readSync(
    path: string,
    options: {
      length: number
    },
  ): {
    buffer: Buffer
    bytesRead: number
  }
  /** Appends string to file */
  appendFileSync(path: string, data: string, options?: { mode?: number }): void
  /** Copies file from source to destination */
  copyFileSync(src: string, dest: string): void
  /** Deletes file */
  unlinkSync(path: string): void
  /** Renames/moves file */
  renameSync(oldPath: string, newPath: string): void
  /** Creates hard link */
  linkSync(target: string, path: string): void
  /** Creates symbolic link */
  symlinkSync(
    target: string,
    path: string,
    type?: 'dir' | 'file' | 'junction',
  ): void
  /** Reads symbolic link */
  readlinkSync(path: string): string
  /** Abre un directorio sin seguir un enlace en su último componente; lanza si no es un directorio real. */
  openDirNoFollowSync(path: string): void
  /** Resolves symbolic links and returns the canonical pathname */
  realpathSync(path: string): string

  // Directory operations
  /** Creates directory recursively. Mode defaults to 0o777 & ~umask if not specified. */
  mkdirSync(
    path: string,
    options?: {
      mode?: number
    },
  ): void
  /** Lists directory contents with file type information */
  readdirSync(path: string): fs.Dirent[]
  /** Lists directory contents as strings */
  readdirStringSync(path: string): string[]
  /** Checks if the directory is empty */
  isDirEmptySync(path: string): boolean
  /** Removes an empty directory */
  rmdirSync(path: string): void
  /** Removes files and directories (with recursive option) */
  rmSync(
    path: string,
    options?: {
      recursive?: boolean
      force?: boolean
    },
  ): void
  /** Create a writable stream for writing data to a file. */
  createWriteStream(path: string): fs.WriteStream
  /** Reads raw file bytes as Buffer asynchronously.
   *  When maxBytes is set, only reads up to that many bytes. */
  readFileBytes(path: string, maxBytes?: number): Promise<Buffer>
}

/**
 * Safely resolves a file path, handling symlinks and errors gracefully.
 *
 * Error handling strategy:
 * - If the file doesn't exist, returns the original path (allows for file creation)
 * - If symlink resolution fails (broken symlink, permission denied, circular links),
 *   returns the original path and marks it as not a symlink
 * - This ensures operations can continue with the original path rather than failing
 *
 * @param fs The filesystem implementation to use
 * @param filePath The path to resolve
 * @returns Object containing the resolved path and whether it was a symlink
 */
export function safeResolvePath(
  fs: FsOperations,
  filePath: string,
): { resolvedPath: string; isSymlink: boolean; isCanonical: boolean } {
  // Block UNC paths before any filesystem access to prevent network
  // requests (DNS/SMB) during validation on Windows
  if (filePath.startsWith('//') || filePath.startsWith('\\\\')) {
    return { resolvedPath: filePath, isSymlink: false, isCanonical: false }
  }

  try {
    // Check for special file types (FIFOs, sockets, devices) before calling realpathSync.
    // realpathSync can block on FIFOs waiting for a writer, causing hangs.
    // If the file doesn't exist, lstatSync throws ENOENT which the catch
    // below handles by returning the original path (allows file creation).
    const stats = fs.lstatSync(filePath)
    if (
      stats.isFIFO() ||
      stats.isSocket() ||
      stats.isCharacterDevice() ||
      stats.isBlockDevice()
    ) {
      return { resolvedPath: filePath, isSymlink: false, isCanonical: false }
    }

    const resolvedPath = fs.realpathSync(filePath)
    return {
      resolvedPath,
      isSymlink: resolvedPath !== filePath,
      // realpathSync returned: resolvedPath is canonical (all symlinks in
      // all path components resolved). Callers can skip further symlink
      // resolution on this path.
      isCanonical: true,
    }
  } catch (_error) {
    // If lstat/realpath fails for any reason (ENOENT, broken symlink,
    // EACCES, ELOOP, etc.), return the original path to allow operations
    // to proceed
    return { resolvedPath: filePath, isSymlink: false, isCanonical: false }
  }
}

/**
 * Resolve the deepest existing ancestor of a path via realpathSync, walking
 * up until it succeeds. Detects dangling symlinks (link entry exists,
 * target doesn't) via lstat and resolves them via readlink.
 *
 * Use when the input path may not exist (new file writes) and you need to
 * know where the write would ACTUALLY land after the OS follows symlinks.
 *
 * Returns the resolved absolute path with non-existent tail segments
 * rejoined, or undefined if no symlink was found in any existing ancestor
 * (the path's existing ancestors all resolve to themselves).
 *
 * Handles: live parent symlinks, dangling file symlinks, dangling parent
 * symlinks. Same core algorithm as teamMemPaths.ts:realpathDeepestExisting.
 */
export function resolveDeepestExistingAncestorSync(
  fs: FsOperations,
  absolutePath: string,
): string | undefined {
  let dir = absolutePath
  const segments: string[] = []
  // Walk up using lstat (cheap, O(1)) to find the first existing component.
  // lstat does not follow symlinks, so dangling symlinks are detected here.
  // Only call realpathSync (expensive, O(depth)) once at the end.
  while (dir !== nodePath.dirname(dir)) {
    let st: fs.Stats
    try {
      st = fs.lstatSync(dir)
    } catch {
      // lstat failed: truly non-existent. Walk up.
      segments.unshift(nodePath.basename(dir))
      dir = nodePath.dirname(dir)
      continue
    }
    if (st.isSymbolicLink()) {
      // Found a symlink (live or dangling). Try realpath first (resolves
      // chained symlinks); fall back to readlink for dangling symlinks.
      try {
        const resolved = fs.realpathSync(dir)
        return segments.length === 0
          ? resolved
          : nodePath.join(resolved, ...segments)
      } catch {
        // Dangling: realpath failed but lstat saw the link entry.
        const target = fs.readlinkSync(dir)
        const absTarget = nodePath.isAbsolute(target)
          ? target
          : nodePath.resolve(nodePath.dirname(dir), target)
        return segments.length === 0
          ? absTarget
          : nodePath.join(absTarget, ...segments)
      }
    }
    // Existing non-symlink component. One realpath call resolves any
    // symlinks in its ancestors. If none, return undefined (no symlink).
    try {
      const resolved = fs.realpathSync(dir)
      if (resolved !== dir) {
        return segments.length === 0
          ? resolved
          : nodePath.join(resolved, ...segments)
      }
    } catch {
      // realpath can still fail (e.g. EACCES in ancestors). Return
      // undefined — we can't resolve, and the logical path is already
      // in pathSet for the caller.
    }
    return undefined
  }
  return undefined
}

// ---- El resolvedor estructurado (≙ `Rt`, 2.1.283) ----

/**
 * Una ruta resuelta salto a salto para el chequeo de permisos
 * (≙ `Rt(e, 'permission')`, 2.1.283). `spellings` lleva la ruta pedida, el
 * destino de cada enlace de hoja y el aterrizaje, sin repetir; `landing` es
 * dónde cae en disco la operación una vez seguidos los enlaces.
 */
export type ResolvedPermissionPath =
  | {
      unresolved: false
      requested: string
      spellings: string[]
      landing: string
      leafIsSymlink: boolean
    }
  | {
      unresolved: true
      requested: string
      spellings: string[]
      /** La última ruta que el walker examinó antes de rendirse. */
      stoppedAt: string
      leafIsSymlink: boolean
    }

/** Las grafías de una ruta cribada y si la resolución llegó al final (≙ `H6`). */
export type ScreenedPath = { paths: string[]; vetted: boolean }

/** Centinela del walker: la ascendencia de la ruta no se pudo verificar (≙ `Fh`). */
const UNVERIFIED_ANCESTRY = '\0unverified-ancestry'
const MAX_SYMLINK_HOPS = 64
const MAX_CLIMBING_LINK_TEXTS = 8
const PATH_SEPARATORS = /\/+/
const DOT_SEGMENT = /(^|[\\/])\.{1,2}[. ]*([\\/]|$)/
const STRICT_DOT_SEGMENT = /(^|\/)\.{1,2}(\/|$)/
const CLIMBING_SEGMENT = /(^|[\\/])\.\.([\\/]|$)/
const LEADING_CLIMBS = /^(?:\.\.(?:[\\/]+|$))+/
const TRAILING_DOT_OR_SPACE = /[. ]$/
const UNC_PREFIX = /^[\\/]{2}/
const DEVICE_NAMESPACE_PREFIX = /^[\\/]\?\?[\\/]/
const LOCAL_WSL_UNC = /^[\\/]{2}wsl(?:\$|\.localhost)[\\/]([^\\/]*)/i
const EMPTY_OR_DOTS = /^\.{0,2}[. ]*$/
const KERNEL_RESOLVED_ANYWHERE = /\/\.(?:vol|file|nofollow|resolve)(?:\/|$)/i
const KERNEL_RESOLVED_SEGMENT = /^\.(?:vol|file|nofollow|resolve)$/i
const ABSENCE_CODES = new Set(['ENOENT', 'ENOTDIR'])
const UNREADABLE_CODES = new Set(['EPERM', 'EACCES'])
const PERMISSION_FAILURE_CODES = new Set(['ENAMETOOLONG', 'EPERM', 'EACCES'])
const BACKGROUND_SESSION_KIND = 'bg'

// Predicados de forma de ruta. `@thyrox/permission` tiene los mismos en
// `pathSafety.ts`, pero la dependencia va de `permission` a `storage`
// (`pathSafety.ts` importa este módulo) y no puede invertirse: el resolvedor
// lleva su copia mínima, sin caché, con la misma forma que la fuente.

function normalizedSegments(path: string): string[] {
  const stack: string[] = []
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      stack.pop()
      continue
    }
    stack.push(segment)
  }
  return stack
}

function isLocalWslSpelling(path: string): boolean {
  const match = LOCAL_WSL_UNC.exec(path)
  return match !== null && !EMPTY_OR_DOTS.test(match[1] ?? '')
}

/** UNC o espacio de dispositivo, salvo la distro WSL local (≙ `Ln && !Il`). */
function isForeignUnc(path: string): boolean {
  return (UNC_PREFIX.test(path) || DEVICE_NAMESPACE_PREFIX.test(path)) && !isLocalWslSpelling(path)
}

/** La raíz `/net/<host>` o `/Network/Servers/<host>` que la ruta alcanza (≙ `G_e`). */
function automountRootOf(path: string): string | null {
  if (!path.startsWith('/')) return null
  const stack: string[] = []
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      stack.pop()
      continue
    }
    stack.push(segment)
    const underNet = stack.length === 2 && stack[0]!.toLowerCase() === 'net'
    const underNetworkServers =
      stack.length === 3 && stack[0]!.toLowerCase() === 'network' && stack[1]!.toLowerCase() === 'servers'
    if (underNet || underNetworkServers) return `/${stack.join('/')}`
  }
  return null
}

/** `/net` exacto, el mapa de automontaje (≙ `nS`). */
function isAutomountMap(path: string): boolean {
  if (!path.startsWith('/')) return false
  const segments = normalizedSegments(path)
  return segments.length === 1 && segments[0]!.toLowerCase() === 'net'
}

/** Bajo `/Network`, la superficie de exploración de macOS (≙ `yN`). */
function isNetworkBrowseRoot(path: string): boolean {
  if (!path.startsWith('/')) return false
  const first = normalizedSegments(path)[0]
  return first !== undefined && first.toLowerCase() === 'network'
}

/** `/.vol`, `/.file`, `/.nofollow` o `/.resolve` como primer segmento (≙ `N_`). */
function isKernelResolvedSpelling(path: string): boolean {
  if (!KERNEL_RESOLVED_ANYWHERE.test(path) || !path.startsWith('/')) return false
  const first = normalizedSegments(path)[0]
  return first !== undefined && KERNEL_RESOLVED_SEGMENT.test(first)
}

/** Una ruta de red se devuelve tal cual, sin tocar el disco (≙ `Ln&&!Il || Wi || NA`). */
function skipsDisk(path: string): boolean {
  return isForeignUnc(path) || automountRootOf(path) !== null
}

function hasDotSegment(path: string): boolean {
  return DOT_SEGMENT.test(path)
}

function hasStrictDotSegment(path: string): boolean {
  return STRICT_DOT_SEGMENT.test(path)
}

/** ¿Sube el texto de un enlace con un `..` interior? Los iniciales no cuentan (≙ `Ne`). */
function linkTextClimbs(text: string): boolean {
  const interior = nodePath.isAbsolute(text) ? text : text.replace(LEADING_CLIMBS, '')
  return CLIMBING_SEGMENT.test(interior)
}

function pathSegments(path: string): string[] {
  return path.split(PATH_SEPARATORS).filter(Boolean)
}

/** ¿Es `candidate` un ancestro estricto de `descendant`, con la misma raíz? (≙ `NYn`). */
function isStrictAncestor(candidate: string, descendant: string): boolean {
  const ancestor = nodePath.resolve(candidate)
  const child = nodePath.resolve(descendant)
  if (nodePath.parse(ancestor).root !== nodePath.parse(child).root) return false
  const ancestorSegments = pathSegments(ancestor)
  const childSegments = pathSegments(child)
  return (
    ancestorSegments.length < childSegments.length &&
    ancestorSegments.every((segment, index) => segment === childSegments[index])
  )
}

function expandTilde(path: string): string {
  if (path === '~') return homedir().normalize('NFC')
  if (path.startsWith('~/')) return nodePath.join(homedir().normalize('NFC'), path.slice(2))
  return path
}

type HopRequest = { kind: 'lstat' | 'readlink' | 'opendirNofollow'; path: string }
type HopReply = fs.Stats | string | { errno: string | undefined }
type LinkHop = { composed: string; leaf: boolean; text: string }
type WalkOutcome = { kind: 'absent'; at: string; remaining: string[] } | { kind: 'resolved'; path: string }
type WalkObserver = {
  onHop: (hop: LinkHop) => void
  onOutcome: (outcome: WalkOutcome) => void
  onCollapsedLanding: (landing: string) => void
}
type WalkShape = { hopped: boolean; climbs: boolean; trailingDotOrSpace: boolean }

function isStats(reply: HopReply): reply is fs.Stats {
  return typeof reply === 'object' && 'isSymbolicLink' in reply
}

function errnoOf(reply: HopReply): string | undefined {
  return typeof reply === 'object' && 'errno' in reply ? reply.errno : undefined
}

/**
 * El veredicto ante un error de `lstat`/`readlink` (≙ `St` con
 * `unreadableAncestry: 'unverified'`): la ausencia no es veredicto —es un
 * outcome—, un nombre demasiado largo sin saltos ni `..` tampoco, y el
 * resto deja la ascendencia sin verificar.
 */
function unverifiedVerdict(errno: string | undefined, shape: WalkShape): string | undefined {
  if (errno !== undefined && ABSENCE_CODES.has(errno)) return undefined
  const plainTooLong = errno === 'ENAMETOOLONG' && !shape.hopped && !shape.climbs && !shape.trailingDotOrSpace
  return plainTooLong ? undefined : UNVERIFIED_ANCESTRY
}

/** La grafía canónica de una raíz de red (≙ `Un`). */
function networkRootSpelling(head: string): string {
  return automountRootOf(head.replace(/^\/+/, '/')) ?? nodePath.normalize(head)
}

/**
 * Colapsa el resto de la ruta sobre una raíz de red (≙ `ue`): si no queda
 * resto o alguien lleva `.`/`..`, se avisa del aterrizaje unido y se
 * devuelve la raíz; si no, la raíz con el resto.
 */
function collapseToNetworkRoot(head: string, rest: string[], onCollapsedLanding: (landing: string) => void): string {
  const headClimbs = hasDotSegment(head)
  const restClimbs = rest.some(segment => segment === '.' || segment === '..')
  if (rest.length === 0 || headClimbs || restClimbs) {
    if (rest.length > 0 || headClimbs) onCollapsedLanding(nodePath.join(head, ...rest))
    return headClimbs ? networkRootSpelling(head) : head
  }
  return nodePath.join(head, ...rest)
}

/**
 * El walker por saltos (≙ `de`, en las ramas que `Rt` alcanza): un `lstat`
 * por componente, `readlink` en cada enlace y `opendirNofollow` como segunda
 * oportunidad ante un error que no sea de ausencia. Devuelve una raíz de red
 * colapsada, el centinela `UNVERIFIED_ANCESTRY`, o `undefined` cuando el
 * resultado está en el outcome. Los ancestros no legibles del directorio
 * de lanzamiento se toleran: el proceso ya vive bajo ellos.
 */
function* walkPathHops(
  requested: string,
  launchAncestry: string | null,
  observer: WalkObserver,
): Generator<HopRequest, string | undefined, HopReply> {
  if (isNetworkBrowseRoot(requested)) return requested
  if (skipsDisk(requested)) return undefined
  const absolute = nodePath.resolve(requested)
  const root = nodePath.parse(absolute).root
  let current = root
  let pending = pathSegments(absolute.slice(root.length))
  let hops = 0
  let passedUnreadableLaunchAncestor = false
  let ancestryVerified = false
  const seen = new Set<string>()
  const shapeNow = (): WalkShape => ({
    hopped: hops > 0,
    climbs: pending.some(hasDotSegment),
    trailingDotOrSpace: TRAILING_DOT_OR_SPACE.test(pending[0] ?? ''),
  })
  const toleratesUnreadableLaunchAncestor = (errno: string | undefined, path: string): boolean =>
    launchAncestry !== null &&
    !ancestryVerified &&
    errno !== undefined &&
    UNREADABLE_CODES.has(errno) &&
    isStrictAncestor(path, launchAncestry)

  while (pending.length > 0 && hops < MAX_SYMLINK_HOPS) {
    const head = pending[0]!
    if (passedUnreadableLaunchAncestor && hasDotSegment(head)) return UNVERIFIED_ANCESTRY
    const next = nodePath.join(current, head)
    if (automountRootOf(next) !== null || isNetworkBrowseRoot(next)) {
      return collapseToNetworkRoot(next, pending.slice(1), observer.onCollapsedLanding)
    }
    if (isKernelResolvedSpelling(next)) return UNVERIFIED_ANCESTRY

    const stat = yield { kind: 'lstat', path: next }
    if (!isStats(stat)) {
      const errno = errnoOf(stat)
      const worthOpening = errno !== undefined && !ABSENCE_CODES.has(errno) && errno !== 'ENAMETOOLONG'
      if (worthOpening) {
        const opened = yield { kind: 'opendirNofollow', path: next }
        if (opened === 'ok') {
          ancestryVerified = true
          pending.shift()
          current = next
          continue
        }
      }
      if (toleratesUnreadableLaunchAncestor(errno, next)) {
        passedUnreadableLaunchAncestor = true
        pending.shift()
        current = next
        continue
      }
      if (errno !== undefined && ABSENCE_CODES.has(errno)) {
        observer.onOutcome({ kind: 'absent', at: current, remaining: [...pending] })
      }
      return unverifiedVerdict(errno, shapeNow())
    }

    ancestryVerified = true
    if (!stat.isSymbolicLink()) {
      pending.shift()
      current = next
      continue
    }
    hops++
    const cycleKey = `${next}\0${pending.join('\0')}`
    if (seen.has(cycleKey)) return undefined
    seen.add(cycleKey)

    const text = yield { kind: 'readlink', path: next }
    if (typeof text !== 'string') return unverifiedVerdict(errnoOf(text), shapeNow())
    pending.shift()
    if (!nodePath.isAbsolute(text)) {
      observer.onHop({ composed: nodePath.resolve(current, text, ...pending), leaf: pending.length === 0, text })
      pending = [...pathSegments(text), ...pending]
      continue
    }
    if (skipsDisk(text) || isNetworkBrowseRoot(text)) {
      return collapseToNetworkRoot(text, pending, observer.onCollapsedLanding)
    }
    observer.onHop({ composed: pending.length === 0 ? text : nodePath.resolve(text, ...pending), leaf: pending.length === 0, text })
    const targetRoot = nodePath.parse(text).root || nodePath.sep
    current = targetRoot
    ancestryVerified = false
    pending = [...pathSegments(text.slice(targetRoot.length)), ...pending]
  }

  if (pending.length > 0) return UNVERIFIED_ANCESTRY
  if (hops > 0 && isAutomountMap(current)) return current
  if (isNetworkBrowseRoot(current)) return current
  observer.onOutcome({ kind: 'resolved', path: current })
  return undefined
}

/** Lo que el intérprete anota de cada petición al disco (≙ `S`, `h`, `p`, `g` en `Rt`). */
type WalkTrace = {
  stoppedAt: string
  sawReadlink: boolean
  readlinkFailed: boolean
  lastErrno: string | undefined
}

/** Lo que una resolución acumula entre el walker principal y sus subwalks. */
type WalkState = {
  fsImpl: FsOperations
  launchAncestry: string | null
  requested: string
  spellings: Set<string>
  leafIsSymlink: boolean
  trace: WalkTrace
}

type WalkResult = { verdict: string | undefined; outcome: WalkOutcome | undefined; collapsedLanding: string | undefined }

/**
 * El ancestro común entre el directorio de lanzamiento y el cwd del fs
 * (≙ `hxe`); null en una sesión en segundo plano o sin ancestro común.
 */
function launchAncestryOf(fsImpl: FsOperations): string | null {
  if (process.env.THYROX_CODE_SESSION_KIND === BACKGROUND_SESSION_KIND) return null
  const launch = nodePath.resolve(getOriginalCwd())
  const current = nodePath.resolve(fsImpl.cwd())
  const root = nodePath.parse(launch).root
  if (root !== nodePath.parse(current).root) return null
  const launchSegments = pathSegments(launch.slice(root.length))
  const currentSegments = pathSegments(current.slice(root.length))
  let shared = 0
  while (shared < launchSegments.length && shared < currentSegments.length && launchSegments[shared] === currentSegments[shared]) {
    shared++
  }
  return shared > 0 ? nodePath.join(root, ...launchSegments.slice(0, shared)) : null
}

function newWalkState(requested: string): WalkState {
  const fsImpl = getFsImplementation()
  return {
    fsImpl,
    launchAncestry: launchAncestryOf(fsImpl),
    requested,
    spellings: new Set([requested]),
    leafIsSymlink: false,
    trace: { stoppedAt: requested, sawReadlink: false, readlinkFailed: false, lastErrno: undefined },
  }
}

/** Atiende una petición del walker sobre el fs y deja su rastro (≙ `C` en `Rt`). */
function serveHop(state: WalkState, request: HopRequest): HopReply {
  state.trace.stoppedAt = request.path
  if (request.kind === 'readlink') {
    state.trace.sawReadlink = true
    try {
      return state.fsImpl.readlinkSync(request.path)
    } catch (error) {
      state.trace.readlinkFailed = true
      return { errno: getErrnoCode(error) }
    }
  }
  state.trace.lastErrno = undefined
  try {
    if (request.kind === 'opendirNofollow') {
      state.fsImpl.openDirNoFollowSync(request.path)
      return 'ok'
    }
    return state.fsImpl.lstatSync(request.path)
  } catch (error) {
    state.trace.lastErrno = getErrnoCode(error)
    return { errno: state.trace.lastErrno }
  }
}

/** Corre el walker sobre el fs hasta su veredicto (≙ `Be(de(...), C)`). */
function performWalk(state: WalkState, path: string, onHop: (hop: LinkHop) => void): WalkResult {
  const result: WalkResult = { verdict: undefined, outcome: undefined, collapsedLanding: undefined }
  const walk = walkPathHops(path, state.launchAncestry, {
    onHop,
    onOutcome: outcome => {
      result.outcome = outcome
    },
    onCollapsedLanding: landing => {
      result.collapsedLanding = landing
    },
  })
  let reply: HopReply | undefined
  for (;;) {
    const step = walk.next(reply as HopReply)
    if (step.done) {
      result.verdict = step.value
      return result
    }
    reply = serveHop(state, step.value)
  }
}

function recordLeafHop(state: WalkState, hop: LinkHop): void {
  if (!hop.leaf) return
  state.spellings.add(hop.composed)
  state.leafIsSymlink = true
}

function moveToEnd(spellings: Set<string>, spelling: string): void {
  spellings.delete(spelling)
  spellings.add(spelling)
}

function resolvedAt(state: WalkState, landing: string): ResolvedPermissionPath {
  return {
    unresolved: false,
    requested: state.requested,
    spellings: Array.from(state.spellings),
    landing,
    leafIsSymlink: state.leafIsSymlink,
  }
}

function resolvedWithoutDisk(requested: string): ResolvedPermissionPath {
  return { unresolved: false, requested, spellings: [requested], landing: requested, leafIsSymlink: false }
}

function unresolvedAt(state: WalkState): ResolvedPermissionPath {
  return {
    unresolved: true,
    requested: state.requested,
    spellings: Array.from(state.spellings),
    stoppedAt: state.trace.stoppedAt,
    leafIsSymlink: state.leafIsSymlink,
  }
}

/** La ruta pedida como aterrizaje, sin hoja simbólica (≙ `L` en `Rt`). */
function resolvedAtRequested(state: WalkState): ResolvedPermissionPath {
  state.spellings.add(state.requested)
  return { ...resolvedAt(state, state.requested), leafIsSymlink: false }
}

/** Un fallo de permiso o de longitud sin haber leído ningún enlace (≙ `j`). */
function unreadableWithoutLinks(trace: WalkTrace): boolean {
  return !trace.sawReadlink && trace.lastErrno !== undefined && PERMISSION_FAILURE_CODES.has(trace.lastErrno)
}

/** El aterrizaje por `realpath` del tramo existente, si difiere (≙ `Gn`). */
function realpathVariant(fsImpl: FsOperations, existing: string, rest: string): string | undefined {
  let real: string
  try {
    real = fsImpl.realpathSync(existing)
  } catch {
    return undefined
  }
  if (real === existing) return undefined
  return rest === '' ? real : nodePath.join(real, rest)
}

/** El aterrizaje a partir del outcome del walker, con su variante por `realpath`. */
function landingFromOutcome(state: WalkState, outcome: WalkOutcome): string {
  const existing = outcome.kind === 'absent' ? outcome.at : outcome.path
  const rest = outcome.kind === 'absent' ? outcome.remaining.join(nodePath.sep) : ''
  const landing = rest === '' ? existing : nodePath.join(existing, rest)
  const existingIsRoot = existing === nodePath.parse(existing).root
  if (state.trace.sawReadlink || !existingIsRoot) state.spellings.add(landing)
  const variant = realpathVariant(state.fsImpl, existing, rest)
  if (variant !== undefined && variant !== landing) moveToEnd(state.spellings, variant)
  return landing
}

/** El aterrizaje cuando el walker colapsó sobre una raíz de red. */
function landingFromCollapse(state: WalkState, walk: WalkResult, collapsed: string): string {
  if (walk.collapsedLanding !== undefined) state.spellings.add(walk.collapsedLanding)
  moveToEnd(state.spellings, collapsed)
  return collapsed
}

/** Un resto ausente con `.`/`..` tras leer un enlace no se sabe por dónde sube. */
function absentRemainderClimbs(outcome: WalkOutcome, sawReadlink: boolean): boolean {
  return outcome.kind === 'absent' && sawReadlink && outcome.remaining.some(hasStrictDotSegment)
}

/**
 * Resuelve una ruta para el chequeo de permisos (≙ `Ua`, 2.1.283): la ruta
 * pedida con `~` expandida, sus grafías, dónde aterriza y si la hoja es un
 * enlace. Una ruta de red no toca el disco. Cuando la ascendencia no se
 * pudo verificar, el resultado es `unresolved` y nombra dónde se detuvo;
 * salvo que ningún enlace se haya leído y el fallo sea de permiso o de
 * longitud, en cuyo caso aterriza en la ruta pedida.
 */
export function resolvePathForPermission(inputPath: string): ResolvedPermissionPath {
  const requested = expandTilde(inputPath)
  if (skipsDisk(requested)) return resolvedWithoutDisk(requested)
  const state = newWalkState(requested)
  const walk = performWalk(state, requested, hop => recordLeafHop(state, hop))
  const unresolved = (): ResolvedPermissionPath =>
    unreadableWithoutLinks(state.trace) ? resolvedAtRequested(state) : unresolvedAt(state)

  if (walk.verdict === UNVERIFIED_ANCESTRY) return unresolved()
  if (walk.verdict !== undefined) return resolvedAt(state, landingFromCollapse(state, walk, walk.verdict))
  if (walk.outcome === undefined) return unresolved()
  if (absentRemainderClimbs(walk.outcome, state.trace.sawReadlink)) return unresolved()
  return resolvedAt(state, landingFromOutcome(state, walk.outcome))
}

/** Los destinos compuestos de los textos de enlace que suben, sin repetir (≙ `m`/`A`/`w` en `Rt`). */
class ClimbingTargets {
  readonly targets: string[] = []
  private readonly seen = new Set<string>()

  record(hop: LinkHop): void {
    if (!linkTextClimbs(hop.text)) return
    const key = nodePath.resolve(hop.composed)
    if (this.seen.has(key)) return
    this.seen.add(key)
    this.targets.push(hop.composed)
  }
}

/**
 * Resuelve aparte cada destino compuesto de un texto de enlace que sube
 * (≙ `H` en `Rt`): una raíz de red se anota tal cual, un colapso se anota
 * como grafía, y una ascendencia sin verificar, un `readlink` fallido o más
 * de ocho destinos dejan la criba sin vetar.
 */
function resolveClimbingTargets(state: WalkState, climbing: ClimbingTargets): boolean {
  for (let index = 0; index < climbing.targets.length; index++) {
    if (index >= MAX_CLIMBING_LINK_TEXTS) return false
    const target = climbing.targets[index]!
    if (skipsDisk(target)) {
      state.spellings.add(target)
      continue
    }
    const walk = performWalk(state, target, hop => climbing.record(hop))
    if (walk.verdict === UNVERIFIED_ANCESTRY || state.trace.readlinkFailed) return false
    if (walk.verdict !== undefined) state.spellings.add(walk.verdict)
  }
  return true
}

/**
 * Criba una ruta (≙ `H6 = Rt(e, 'screen')`, 2.1.283): las mismas grafías
 * que el chequeo de permisos más los destinos de los textos de enlace que
 * suben, y `vetted` sólo si todo se resolvió. A diferencia del modo de
 * permisos, un fallo de permiso sin enlaces no se toma como resuelto.
 */
export function resolvePathForScreen(inputPath: string): ScreenedPath {
  const requested = expandTilde(inputPath)
  if (skipsDisk(requested)) return { paths: [requested], vetted: true }
  const state = newWalkState(requested)
  const climbing = new ClimbingTargets()
  const walk = performWalk(state, requested, hop => {
    recordLeafHop(state, hop)
    climbing.record(hop)
  })
  const screened = (vetted: boolean): ScreenedPath => ({ paths: Array.from(state.spellings), vetted })

  if (walk.verdict === UNVERIFIED_ANCESTRY) return screened(false)
  if (walk.verdict !== undefined) {
    if (!resolveClimbingTargets(state, climbing)) return screened(false)
    landingFromCollapse(state, walk, walk.verdict)
    return screened(true)
  }
  if (walk.outcome === undefined) {
    const vetted = !state.trace.readlinkFailed && resolveClimbingTargets(state, climbing)
    return screened(vetted)
  }
  if (walk.outcome.kind === 'absent' && walk.outcome.remaining.some(hasDotSegment)) return screened(false)
  landingFromOutcome(state, walk.outcome)
  return screened(resolveClimbingTargets(state, climbing))
}

/**
 * Las grafías que se chequean contra las reglas (≙ `To`, 2.1.283): las del
 * resolvedor y, si no pudo resolver, el `realpath` de `safeResolvePath`
 * cuando es canónico o un enlace y aún no estaba. Es el adaptador para los
 * consumidores que sólo necesitan grafías; quien necesita el aterrizaje usa
 * `resolvePathForPermission`.
 */
export function getPathsForPermissionCheck(inputPath: string): string[] {
  const resolved = resolvePathForPermission(inputPath)
  if (!resolved.unresolved) return resolved.spellings
  const { resolvedPath, isCanonical, isSymlink } = safeResolvePath(getFsImplementation(), resolved.requested)
  const worthAdding = (isCanonical || isSymlink) && !resolved.spellings.includes(resolvedPath)
  return worthAdding ? [...resolved.spellings, resolvedPath] : resolved.spellings
}

export const NodeFsOperations: FsOperations = {
  cwd() {
    return process.cwd()
  },

  existsSync(fsPath) {
    using _ = slowLogging`fs.existsSync(${fsPath})`
    return fs.existsSync(fsPath)
  },

  async stat(fsPath) {
    return statPromise(fsPath)
  },

  async readdir(fsPath) {
    return readdirPromise(fsPath, { withFileTypes: true })
  },

  async unlink(fsPath) {
    return unlinkPromise(fsPath)
  },

  async rmdir(fsPath) {
    return rmdirPromise(fsPath)
  },

  async rm(fsPath, options) {
    return rmPromise(fsPath, options)
  },

  async mkdir(dirPath, options) {
    try {
      await mkdirPromise(dirPath, { recursive: true, ...options })
    } catch (e) {
      // Bun/Windows: recursive:true throws EEXIST on directories with the
      // FILE_ATTRIBUTE_READONLY bit set (Group Policy, OneDrive, desktop.ini).
      // Bun's directoryExistsAt misclassifies DIRECTORY+READONLY as not-a-dir
      // (bun-internal src/sys.zig existsAtType). The dir exists; ignore.
      // https://github.com/anthropics/claude-code/issues/30924
      if (getErrnoCode(e) !== 'EEXIST') throw e
    }
  },

  async readFile(fsPath, options) {
    return readFilePromise(fsPath, { encoding: options.encoding })
  },

  async rename(oldPath, newPath) {
    return renamePromise(oldPath, newPath)
  },

  statSync(fsPath) {
    using _ = slowLogging`fs.statSync(${fsPath})`
    return fs.statSync(fsPath)
  },

  lstatSync(fsPath) {
    using _ = slowLogging`fs.lstatSync(${fsPath})`
    return fs.lstatSync(fsPath)
  },

  readFileSync(fsPath, options) {
    using _ = slowLogging`fs.readFileSync(${fsPath})`
    return fs.readFileSync(fsPath, { encoding: options.encoding })
  },

  readFileBytesSync(fsPath) {
    using _ = slowLogging`fs.readFileBytesSync(${fsPath})`
    return fs.readFileSync(fsPath)
  },

  readSync(fsPath, options) {
    using _ = slowLogging`fs.readSync(${fsPath}, ${options.length} bytes)`
    let fd: number | undefined
    try {
      fd = fs.openSync(fsPath, 'r')
      const buffer = Buffer.alloc(options.length)
      const bytesRead = fs.readSync(fd, buffer, 0, options.length, 0)
      return { buffer, bytesRead }
    } finally {
      if (fd) fs.closeSync(fd)
    }
  },

  appendFileSync(path, data, options) {
    using _ = slowLogging`fs.appendFileSync(${path}, ${data.length} chars)`
    // For new files with explicit mode, use 'ax' (atomic create-with-mode) to avoid
    // TOCTOU race between existence check and open. Fall back to normal append if exists.
    if (options?.mode !== undefined) {
      try {
        const fd = fs.openSync(path, 'ax', options.mode)
        try {
          fs.appendFileSync(fd, data)
        } finally {
          fs.closeSync(fd)
        }
        return
      } catch (e) {
        if (getErrnoCode(e) !== 'EEXIST') throw e
        // File exists — fall through to normal append
      }
    }
    fs.appendFileSync(path, data)
  },

  copyFileSync(src, dest) {
    using _ = slowLogging`fs.copyFileSync(${src} → ${dest})`
    fs.copyFileSync(src, dest)
  },

  unlinkSync(path: string) {
    using _ = slowLogging`fs.unlinkSync(${path})`
    fs.unlinkSync(path)
  },

  renameSync(oldPath: string, newPath: string) {
    using _ = slowLogging`fs.renameSync(${oldPath} → ${newPath})`
    fs.renameSync(oldPath, newPath)
  },

  linkSync(target: string, path: string) {
    using _ = slowLogging`fs.linkSync(${target} → ${path})`
    fs.linkSync(target, path)
  },

  symlinkSync(
    target: string,
    path: string,
    type?: 'dir' | 'file' | 'junction',
  ) {
    using _ = slowLogging`fs.symlinkSync(${target} → ${path})`
    fs.symlinkSync(target, path, type)
  },

  readlinkSync(path: string) {
    using _ = slowLogging`fs.readlinkSync(${path})`
    return fs.readlinkSync(path)
  },

  openDirNoFollowSync(path: string) {
    using _ = slowLogging`fs.openDirNoFollowSync(${path})`
    const fd = fs.openSync(path, fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW)
    fs.closeSync(fd)
  },

  realpathSync(path: string) {
    using _ = slowLogging`fs.realpathSync(${path})`
    return fs.realpathSync(path).normalize('NFC')
  },

  mkdirSync(dirPath, options) {
    using _ = slowLogging`fs.mkdirSync(${dirPath})`
    const mkdirOptions: { recursive: boolean; mode?: number } = {
      recursive: true,
    }
    if (options?.mode !== undefined) {
      mkdirOptions.mode = options.mode
    }
    try {
      fs.mkdirSync(dirPath, mkdirOptions)
    } catch (e) {
      // Bun/Windows: recursive:true throws EEXIST on directories with the
      // FILE_ATTRIBUTE_READONLY bit set (Group Policy, OneDrive, desktop.ini).
      // Bun's directoryExistsAt misclassifies DIRECTORY+READONLY as not-a-dir
      // (bun-internal src/sys.zig existsAtType). The dir exists; ignore.
      // https://github.com/anthropics/claude-code/issues/30924
      if (getErrnoCode(e) !== 'EEXIST') throw e
    }
  },

  readdirSync(dirPath) {
    using _ = slowLogging`fs.readdirSync(${dirPath})`
    return fs.readdirSync(dirPath, { withFileTypes: true })
  },

  readdirStringSync(dirPath) {
    using _ = slowLogging`fs.readdirStringSync(${dirPath})`
    return fs.readdirSync(dirPath)
  },

  isDirEmptySync(dirPath) {
    using _ = slowLogging`fs.isDirEmptySync(${dirPath})`
    const files = this.readdirSync(dirPath)
    return files.length === 0
  },

  rmdirSync(dirPath) {
    using _ = slowLogging`fs.rmdirSync(${dirPath})`
    fs.rmdirSync(dirPath)
  },

  rmSync(path, options) {
    using _ = slowLogging`fs.rmSync(${path})`
    fs.rmSync(path, options)
  },

  createWriteStream(path: string) {
    return fs.createWriteStream(path)
  },

  async readFileBytes(fsPath: string, maxBytes?: number) {
    if (maxBytes === undefined) {
      return readFilePromise(fsPath)
    }
    const handle = await open(fsPath, 'r')
    try {
      const { size } = await handle.stat()
      const readSize = Math.min(size, maxBytes)
      const buffer = Buffer.allocUnsafe(readSize)
      let offset = 0
      while (offset < readSize) {
        const { bytesRead } = await handle.read(
          buffer,
          offset,
          readSize - offset,
          offset,
        )
        if (bytesRead === 0) break
        offset += bytesRead
      }
      return offset < readSize ? buffer.subarray(0, offset) : buffer
    } finally {
      await handle.close()
    }
  },
}

// The currently active filesystem implementation
let activeFs: FsOperations = NodeFsOperations

/**
 * Overrides the filesystem implementation. Note: This function does not
 * automatically update cwd.
 * @param implementation The filesystem implementation to use
 */
export function setFsImplementation(implementation: FsOperations): void {
  activeFs = implementation
}

/**
 * Gets the currently active filesystem implementation
 * @returns The currently active filesystem implementation
 */
export function getFsImplementation(): FsOperations {
  return activeFs
}

/**
 * Resets the filesystem implementation to the default Node.js implementation.
 * Note: This function does not automatically update cwd.
 */
export function setOriginalFsImplementation(): void {
  activeFs = NodeFsOperations
}

export type ReadFileRangeResult = {
  content: string
  bytesRead: number
  bytesTotal: number
}

/**
 * Read up to `maxBytes` from a file starting at `offset`.
 * Returns a flat string from Buffer — no sliced string references to a
 * larger parent. Returns null if the file is smaller than the offset.
 */
export async function readFileRange(
  path: string,
  offset: number,
  maxBytes: number,
): Promise<ReadFileRangeResult | null> {
  await using fh = await open(path, 'r')
  const size = (await fh.stat()).size
  if (size <= offset) {
    return null
  }
  const bytesToRead = Math.min(size - offset, maxBytes)
  const buffer = Buffer.allocUnsafe(bytesToRead)

  let totalRead = 0
  while (totalRead < bytesToRead) {
    const { bytesRead } = await fh.read(
      buffer,
      totalRead,
      bytesToRead - totalRead,
      offset + totalRead,
    )
    if (bytesRead === 0) {
      break
    }
    totalRead += bytesRead
  }

  return {
    content: buffer.toString('utf8', 0, totalRead),
    bytesRead: totalRead,
    bytesTotal: size,
  }
}

/**
 * Read the last `maxBytes` of a file.
 * Returns the whole file if it's smaller than maxBytes.
 */
export async function tailFile(
  path: string,
  maxBytes: number,
): Promise<ReadFileRangeResult> {
  await using fh = await open(path, 'r')
  const size = (await fh.stat()).size
  if (size === 0) {
    return { content: '', bytesRead: 0, bytesTotal: 0 }
  }
  const offset = Math.max(0, size - maxBytes)
  const bytesToRead = size - offset
  const buffer = Buffer.allocUnsafe(bytesToRead)

  let totalRead = 0
  while (totalRead < bytesToRead) {
    const { bytesRead } = await fh.read(
      buffer,
      totalRead,
      bytesToRead - totalRead,
      offset + totalRead,
    )
    if (bytesRead === 0) {
      break
    }
    totalRead += bytesRead
  }

  return {
    content: buffer.toString('utf8', 0, totalRead),
    bytesRead: totalRead,
    bytesTotal: size,
  }
}

/**
 * Async generator that yields lines from a file in reverse order.
 * Reads the file backwards in chunks to avoid loading the entire file into memory.
 * @param path - The path to the file to read
 * @returns An async generator that yields lines in reverse order
 */
export async function* readLinesReverse(
  path: string,
): AsyncGenerator<string, void, undefined> {
  const CHUNK_SIZE = 1024 * 4
  const fileHandle = await open(path, 'r')
  try {
    const stats = await fileHandle.stat()
    let position = stats.size
    // Carry raw bytes (not a decoded string) across chunk boundaries so that
    // multi-byte UTF-8 sequences split by the 4KB boundary are not corrupted.
    // Decoding per-chunk would turn a split sequence into U+FFFD on both sides,
    // which for history.jsonl means JSON.parse throws and the entry is dropped.
    let remainder = Buffer.alloc(0)
    const buffer = Buffer.alloc(CHUNK_SIZE)

    while (position > 0) {
      const currentChunkSize = Math.min(CHUNK_SIZE, position)
      position -= currentChunkSize

      await fileHandle.read(buffer, 0, currentChunkSize, position)
      const combined = Buffer.concat([
        buffer.subarray(0, currentChunkSize),
        remainder,
      ])

      const firstNewline = combined.indexOf(0x0a)
      if (firstNewline === -1) {
        remainder = combined
        continue
      }

      remainder = Buffer.from(combined.subarray(0, firstNewline))
      const lines = combined.toString('utf8', firstNewline + 1).split('\n')

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i]!
        if (line) {
          yield line
        }
      }
    }

    if (remainder.length > 0) {
      yield remainder.toString('utf8')
    }
  } finally {
    await fileHandle.close()
  }
}
