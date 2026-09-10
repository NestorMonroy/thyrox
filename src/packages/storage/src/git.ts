/**
 * Lo que el árbol sabe del repositorio donde corre: su raíz canónica, su
 * estado, y las dos guardas que impiden que un repositorio ajeno herede
 * confianza que no le corresponde.
 *
 * Procedencia: `ccnmt: packages/storage/src/git.ts` (856 líneas, 28 exports).
 * Ese árbol declara `"license": "UNLICENSED"`, así que el cuerpo se
 * **reimplementa** —mismo nombre de módulo, mismo sitio, mismos nombres y
 * firmas— y no se copia.
 *
 * Sustituye al porte parcial anterior, que declaraba DOS símbolos
 * (`normalizeGitRemoteUrl` y su ayudante) y llamaba «divergencia de alcance»
 * a los otros veintiséis. Sus cinco razones estaban todas caducadas, medido
 * al retomarlo: `shell` existe (`execFileNoThrow`, `whichSync`),
 * `config/gitFilesystem` existe con los siete símbolos que hacen falta,
 * `app-host/bootstrap/cwd` existe, `local-observability` existe, y
 * `provider/fileConstants` existe.
 *
 * DIVERGENCIAS DECLARADAS
 *
 * 1. `memoize` y `memoizeWithLRU` — la fuente los toma de `lodash-es` y de
 *    `config/memoize.js`. Aquí vienen del seam del paquete
 *    (`./internal/pendingCrossPackageDeps.js`), que ya los reimplementa: no
 *    se añade una dependencia npm por dos funciones de diez líneas. El seam
 *    ganó su `.cache` en este mismo pase, porque `findCanonicalGitRoot` la
 *    publica.
 * 2. `logError` y `logForDiagnosticsNoPII` vienen de
 *    `@thyrox/local-observability/logging`, y `logForDebugging` de su
 *    `debug.js` — mismos símbolos, otro alcance de paquete.
 *
 * SEGURIDAD, y es la razón de que este archivo tenga más guardas que lógica:
 * `.git`, `commondir` y `gitdir` viajan DENTRO del repositorio clonado, o sea
 * que los controla quien lo publica. Sin validar su estructura, un repo
 * hostil apunta su `commondir` a una ruta que la víctima ya confió y ejecuta
 * sus hooks al arrancar.
 */
import { createHash } from 'crypto'
import { readFileSync, realpathSync } from 'fs'
import { open, readFile, realpath, stat } from 'fs/promises'
import { basename, dirname, join, resolve } from 'path'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import {
  getCachedBranch,
  getCachedDefaultBranch,
  getCachedHead,
  getCachedRemoteUrl,
  getWorktreeCountFromFs,
  isShallowClone as isShallowCloneFs,
  resolveGitDir,
} from '@thyrox/config/gitFilesystem.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import {
  logError,
  logForDiagnosticsNoPII,
} from '@thyrox/local-observability/logging'
import {
  hasBinaryExtension,
  isBinaryContent,
} from '@thyrox/provider/fileConstants.js'
import { execFileNoThrow } from '@thyrox/shell/execFileNoThrow.js'
import { whichSync } from '@thyrox/shell/which.js'
import { findGitRoot } from './findGitRoot.js'
import { getFsImplementation } from './fsOperations.js'
import { memoize, memoizeWithLRU } from './internal/pendingCrossPackageDeps.js'

// `findGitRoot` vive en su propio archivo para romper el ciclo
// gitFilesystem ↔ git. Se re-exporta aquí para que sus consumidores no
// tengan que enterarse.
export { findGitRoot } from './findGitRoot.js'

/**
 * Resuelve una raíz de git a la raíz canónica del repositorio principal.
 * En un repo normal es un no-op. En un worktree sigue la cadena
 * `.git` → `gitdir:` → `commondir` hasta el directorio de trabajo del repo
 * principal, para que todos los worktrees compartan identidad de proyecto.
 *
 * Un submódulo (`.git` es archivo pero no hay `commondir`) cae a la raíz de
 * entrada, y es lo correcto: un submódulo es otro repositorio.
 */
const resolveCanonicalRoot = memoizeWithLRU(
  (gitRoot: string): string => {
    try {
      // En un worktree `.git` es un archivo con `gitdir: <ruta>`. En un repo
      // normal es un directorio y `readFileSync` lanza EISDIR.
      const gitContent = readFileSync(join(gitRoot, '.git'), 'utf-8').trim()
      if (!gitContent.startsWith('gitdir:')) {
        return gitRoot
      }
      const worktreeGitDir = resolve(
        gitRoot,
        gitContent.slice('gitdir:'.length).trim(),
      )
      // `commondir` apunta al `.git` compartido. Un submódulo no lo tiene
      // (ENOENT) y cae al `catch`.
      const commonDir = resolve(
        worktreeGitDir,
        readFileSync(join(worktreeGitDir, 'commondir'), 'utf-8').trim(),
      )
      // SEGURIDAD: los dos archivos anteriores los controla quien publica el
      // repositorio. Se valida que la estructura sea la que `git worktree
      // add` crea, y hacen falta LAS DOS comprobaciones:
      //   1. `worktreeGitDir` cuelga directo de `<commonDir>/worktrees`, o
      //      sea que el `commondir` que se acaba de leer vive dentro del
      //      directorio común resuelto y no dentro del repo del atacante;
      //   2. `<worktreeGitDir>/gitdir` apunta de vuelta a `<gitRoot>/.git`,
      //      o sea que nadie puede tomar prestada la entrada de worktree de
      //      una víctima adivinando su ruta.
      // La (1) sola falla si la víctima ya tiene un worktree del repo
      // confiado; la (2) sola falla porque el atacante controla
      // `worktreeGitDir`.
      if (resolve(dirname(worktreeGitDir)) !== join(commonDir, 'worktrees')) {
        return gitRoot
      }
      // Git escribe `gitdir` con los symlinks ya resueltos; `gitRoot` viene
      // resuelto sólo léxicamente. Se aplica `realpath` al DIRECTORIO y se le
      // une `.git` — resolver el `.git` en sí seguiría un `.git` symlinkeado
      // y dejaría al atacante tomar prestado el enlace de vuelta ajeno.
      const backlink = realpathSync(
        readFileSync(join(worktreeGitDir, 'gitdir'), 'utf-8').trim(),
      )
      if (backlink !== join(realpathSync(gitRoot), '.git')) {
        return gitRoot
      }
      // Worktrees de un repo desnudo: el directorio común no está dentro de
      // un directorio de trabajo, así que él mismo es la identidad estable.
      if (basename(commonDir) !== '.git') {
        return commonDir.normalize('NFC')
      }
      return dirname(commonDir).normalize('NFC')
    } catch {
      return gitRoot
    }
  },
  root => root,
  50,
)

/**
 * La raíz canónica del repositorio, resolviendo a través de worktrees.
 *
 * A diferencia de `findGitRoot`, que devuelve el directorio del worktree,
 * ésta devuelve el directorio de trabajo del repositorio principal. Es la que
 * se usa para el estado con alcance de proyecto —memoria, configuración— para
 * que un worktree comparta estado con su repo y no estrene el suyo.
 */
export const findCanonicalGitRoot = createFindCanonicalGitRoot()

function createFindCanonicalGitRoot(): {
  (startPath: string): string | null
  cache: typeof resolveCanonicalRoot.cache
} {
  function wrapper(startPath: string): string | null {
    const root = findGitRoot(startPath)
    if (!root) {
      return null
    }
    return resolveCanonicalRoot(root)
  }
  wrapper.cache = resolveCanonicalRoot.cache
  return wrapper
}

/**
 * La ruta del binario. Se memoiza porque cada proceso que se lanza pagaría
 * la búsqueda en el PATH.
 */
export const gitExe = memoize((): string => {
  return whichSync('git') || 'git'
})

export const getIsGit = memoize(async (): Promise<boolean> => {
  const startTime = Date.now()
  logForDiagnosticsNoPII('info', 'is_git_check_started')

  const isGit = findGitRoot(getCwd()) !== null

  logForDiagnosticsNoPII('info', 'is_git_check_completed', {
    duration_ms: Date.now() - startTime,
    is_git: isGit,
  })
  return isGit
})

export function getGitDir(cwd: string): Promise<string | null> {
  return resolveGitDir(cwd)
}

export async function isAtGitRoot(): Promise<boolean> {
  const cwd = getCwd()
  const gitRoot = findGitRoot(cwd)
  if (!gitRoot) {
    return false
  }
  // Se resuelven los symlinks para que la comparación sea de verdad.
  try {
    const [resolvedCwd, resolvedGitRoot] = await Promise.all([
      realpath(cwd),
      realpath(gitRoot),
    ])
    return resolvedCwd === resolvedGitRoot
  } catch {
    return cwd === gitRoot
  }
}

export const dirIsInGitRepo = async (cwd: string): Promise<boolean> => {
  return findGitRoot(cwd) !== null
}

export const getHead = async (): Promise<string> => {
  return getCachedHead()
}

export const getBranch = async (): Promise<string> => {
  return getCachedBranch()
}

export const getDefaultBranch = async (): Promise<string> => {
  return getCachedDefaultBranch()
}

export const getRemoteUrl = async (): Promise<string | null> => {
  return getCachedRemoteUrl()
}

/**
 * Normaliza una URL de remoto git a una forma canónica para hashear.
 * Convierte URLs SSH y HTTPS al mismo formato: host/owner/repo, en
 * minúsculas y sin `.git`.
 *
 * Es lo que hace que las cuatro formas de nombrar el mismo repositorio den
 * el mismo hash; si no, el estado por proyecto se fragmenta según cómo se
 * haya clonado.
 */
export function normalizeGitRemoteUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  // Formato SSH: git@host:owner/repo.git
  const sshMatch = trimmed.match(/^git@([^:]+):(.+?)(?:\.git)?$/)
  if (sshMatch && sshMatch[1] && sshMatch[2]) {
    return `${sshMatch[1]}/${sshMatch[2]}`.toLowerCase()
  }

  // Se quitan query y fragmento antes de parsear: `?ref=main`, `#rama` y una
  // barra final son sufijos que no cambian la identidad del repositorio.
  const sanitised = trimmed.replace(/[?#].*$/, '').replace(/\/+$/, '')

  const urlMatch = sanitised.match(
    /^(?:https?|ssh):\/\/(?:[^@]+@)?([^/]+)\/(.+?)(?:\.git)?$/,
  )
  if (urlMatch && urlMatch[1] && urlMatch[2]) {
    const host = urlMatch[1]
    const path = urlMatch[2]

    // Las URLs del proxy git usan dos formas:
    //   legada:  http://…@127.0.0.1:PUERTO/git/owner/repo      (se asume github.com)
    //   con host: http://…@127.0.0.1:PUERTO/git/host/owner/repo (el host va en el path)
    // Se quita el prefijo `git/`. Si el primer segmento tiene un punto es un
    // hostname —un nombre de organización no puede tenerlo—; si no, github.com.
    if (isLocalHost(host) && path.startsWith('git/')) {
      const proxyPath = path.slice(4)
      const segments = proxyPath.split('/')
      if (segments.length >= 3 && segments[0]!.includes('.')) {
        return proxyPath.toLowerCase()
      }
      return `github.com/${proxyPath}`.toLowerCase()
    }

    // Se recorta el puerto en hosts que no son locales para que todas las
    // formas de la misma URL hasheen igual. En IPv6 el puerto va DESPUÉS del
    // `]`, así que el patrón conserva intacta la dirección entre corchetes.
    const h = isLocalHost(host) ? host : host.replace(/(\]|^[^[]*?):\d+$/, '$1')
    return `${h}/${path}`.toLowerCase()
  }

  return null
}

export async function getRepoRemoteHash(): Promise<string | null> {
  const remoteUrl = await getRemoteUrl()
  if (!remoteUrl) return null

  const normalized = normalizeGitRemoteUrl(remoteUrl)
  if (!normalized) return null

  const hash = createHash('sha256').update(normalized).digest('hex')
  return hash.substring(0, 16)
}

export const getIsHeadOnRemote = async (): Promise<boolean> => {
  const { code } = await execFileNoThrow(gitExe(), ['rev-parse', '@{u}'], {
    preserveOutputOnError: false,
  })
  return code === 0
}

export const hasUnpushedCommits = async (): Promise<boolean> => {
  const { stdout, code } = await execFileNoThrow(
    gitExe(),
    ['rev-list', '--count', '@{u}..HEAD'],
    { preserveOutputOnError: false },
  )
  return code === 0 && parseInt(stdout.trim(), 10) > 0
}

export const getIsClean = async (options?: {
  ignoreUntracked?: boolean
}): Promise<boolean> => {
  const args = ['--no-optional-locks', 'status', '--porcelain']
  if (options?.ignoreUntracked) {
    args.push('-uno')
  }
  const { stdout } = await execFileNoThrow(gitExe(), args, {
    preserveOutputOnError: false,
  })
  return stdout.trim().length === 0
}

export const getChangedFiles = async (): Promise<string[]> => {
  const { stdout } = await execFileNoThrow(
    gitExe(),
    ['--no-optional-locks', 'status', '--porcelain'],
    { preserveOutputOnError: false },
  )
  return stdout
    .trim()
    .split('\n')
    .map(line => line.trim().split(' ', 2)[1]?.trim())
    .filter((line): line is string => typeof line === 'string')
}

export type GitFileStatus = {
  tracked: string[]
  untracked: string[]
}

export const getFileStatus = async (): Promise<GitFileStatus> => {
  const { stdout } = await execFileNoThrow(
    gitExe(),
    ['--no-optional-locks', 'status', '--porcelain'],
    { preserveOutputOnError: false },
  )

  const tracked: string[] = []
  const untracked: string[] = []

  stdout
    .trim()
    .split('\n')
    .filter(line => line.length > 0)
    .forEach(line => {
      const status = line.substring(0, 2)
      const filename = line.substring(2).trim()

      if (status === '??') {
        untracked.push(filename)
      } else if (filename) {
        tracked.push(filename)
      }
    })

  return { tracked, untracked }
}

export const getWorktreeCount = async (): Promise<number> => {
  return getWorktreeCountFromFs()
}

/**
 * Guarda todos los cambios —incluidos los archivos SIN SEGUIR— para dejar el
 * árbol limpio.
 *
 * El `git add` previo no es adorno: `git stash` sin él deja los archivos sin
 * seguir en el árbol, y se pierden al cambiar de rama.
 */
export const stashToCleanState = async (message?: string): Promise<boolean> => {
  try {
    const stashMessage =
      message || `Claude Code auto-stash - ${new Date().toISOString()}`

    const { untracked } = await getFileStatus()

    if (untracked.length > 0) {
      const { code: addCode } = await execFileNoThrow(
        gitExe(),
        ['add', ...untracked],
        { preserveOutputOnError: false },
      )

      if (addCode !== 0) {
        return false
      }
    }

    const { code } = await execFileNoThrow(
      gitExe(),
      ['stash', 'push', '--message', stashMessage],
      { preserveOutputOnError: false },
    )
    return code === 0
  } catch (_) {
    return false
  }
}

export type GitRepoState = {
  commitHash: string
  branchName: string
  remoteUrl: string | null
  isHeadOnRemote: boolean
  isClean: boolean
  worktreeCount: number
}

export async function getGitState(): Promise<GitRepoState | null> {
  try {
    const [
      commitHash,
      branchName,
      remoteUrl,
      isHeadOnRemote,
      isClean,
      worktreeCount,
    ] = await Promise.all([
      getHead(),
      getBranch(),
      getRemoteUrl(),
      getIsHeadOnRemote(),
      getIsClean(),
      getWorktreeCount(),
    ])

    return {
      commitHash,
      branchName,
      remoteUrl,
      isHeadOnRemote,
      isClean,
      worktreeCount,
    }
  } catch (_) {
    // En silencio: el estado de git es mejor-esfuerzo.
    return null
  }
}

export async function getGithubRepo(): Promise<string | null> {
  const { parseGitRemote } = await import('./parseGitRemote.js')
  const remoteUrl = await getRemoteUrl()
  if (!remoteUrl) {
    logForDebugging('Local GitHub repo: unknown')
    return null
  }
  // Sólo se responde por github.com: quien llama —el envío de incidencias—
  // asume que el resultado es un repositorio de ahí.
  const parsed = parseGitRemote(remoteUrl)
  if (parsed && parsed.host === 'github.com') {
    const result = `${parsed.owner}/${parsed.name}`
    logForDebugging(`Local GitHub repo: ${result}`)
    return result
  }
  logForDebugging('Local GitHub repo: unknown')
  return null
}

/**
 * Estado de git preservado para el envío de una incidencia.
 *
 * Se ancla en la base REMOTA —`origin/main`, por ejemplo— que rara vez se
 * reescribe, y no en commits locales, que pueden desaparecer tras un push
 * forzado.
 */
export type PreservedGitState = {
  /** El SHA de la base de fusión con la rama remota. */
  remote_base_sha: string | null
  /** La rama remota usada, p. ej. `origin/main`. */
  remote_base: string | null
  /** Parche desde la base de fusión al estado actual, con lo no commiteado. */
  patch: string
  /** Archivos sin seguir, con su contenido. */
  untracked_files: Array<{ path: string; content: string }>
  /**
   * Salida de `format-patch` para lo commiteado entre la base y HEAD. Sirve
   * para reconstruir la cadena real de commits —autor, fecha, mensaje— en un
   * contenedor de reproducción. `null` cuando no hay commits en ese rango.
   */
  format_patch: string | null
  /** El SHA de HEAD, la punta de la rama. */
  head_sha: string | null
  /** El nombre de la rama actual. */
  branch_name: string | null
}

// Topes de captura de archivos sin seguir.
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024
const MAX_TOTAL_SIZE_BYTES = 5 * 1024 * 1024 * 1024
const MAX_FILE_COUNT = 20000

// Búfer inicial para detectar binarios y reusar el contenido. 64 KB cubren la
// mayoría de los fuentes en una sola lectura; `isBinaryContent` sólo examina
// los primeros 8 KB, así que el resto está para no tener que leer dos veces
// cuando el archivo resulta ser texto.
const SNIFF_BUFFER_SIZE = 64 * 1024

/**
 * La mejor rama remota para usar como base.
 * Prioridad: rama de seguimiento > origin/main > origin/staging > origin/master
 */
export async function findRemoteBase(): Promise<string | null> {
  const { stdout: trackingBranch, code: trackingCode } = await execFileNoThrow(
    gitExe(),
    ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'],
    { preserveOutputOnError: false },
  )

  if (trackingCode === 0 && trackingBranch.trim()) {
    return trackingBranch.trim()
  }

  const { stdout: remoteRefs, code: remoteCode } = await execFileNoThrow(
    gitExe(),
    ['remote', 'show', 'origin', '--', 'HEAD'],
    { preserveOutputOnError: false },
  )

  if (remoteCode === 0) {
    const match = remoteRefs.match(/HEAD branch: (\S+)/)
    if (match && match[1]) {
      return `origin/${match[1]}`
    }
  }

  const candidates = ['origin/main', 'origin/staging', 'origin/master']
  for (const candidate of candidates) {
    const { code } = await execFileNoThrow(
      gitExe(),
      ['rev-parse', '--verify', candidate],
      { preserveOutputOnError: false },
    )
    if (code === 0) {
      return candidate
    }
  }

  return null
}

/** ¿Es un clon superficial? Lo delata `<gitDir>/shallow`. */
function isShallowClone(): Promise<boolean> {
  return isShallowCloneFs()
}

/**
 * Captura los archivos sin seguir: `git diff` no los incluye. Respeta los
 * topes de tamaño y salta los binarios.
 */
async function captureUntrackedFiles(): Promise<
  Array<{ path: string; content: string }>
> {
  const { stdout, code } = await execFileNoThrow(
    gitExe(),
    ['ls-files', '--others', '--exclude-standard'],
    { preserveOutputOnError: false },
  )

  const trimmed = stdout.trim()
  if (code !== 0 || !trimmed) {
    return []
  }

  const files = trimmed.split('\n').filter(Boolean)
  const result: Array<{ path: string; content: string }> = []
  let totalSize = 0

  for (const filePath of files) {
    if (result.length >= MAX_FILE_COUNT) {
      logForDebugging(
        `Untracked file capture: reached max file count (${MAX_FILE_COUNT})`,
      )
      break
    }

    // Por extensión: cero I/O.
    if (hasBinaryExtension(filePath)) {
      continue
    }

    try {
      const stats = await stat(filePath)
      const fileSize = stats.size

      if (fileSize > MAX_FILE_SIZE_BYTES) {
        logForDebugging(
          `Untracked file capture: skipping ${filePath} (exceeds ${MAX_FILE_SIZE_BYTES} bytes)`,
        )
        continue
      }

      if (totalSize + fileSize > MAX_TOTAL_SIZE_BYTES) {
        logForDebugging(
          `Untracked file capture: reached total size limit (${MAX_TOTAL_SIZE_BYTES} bytes)`,
        )
        break
      }

      if (fileSize === 0) {
        result.push({ path: filePath, content: '' })
        continue
      }

      // El sondeo acota la lectura de un binario a `SNIFF_BUFFER_SIZE` aunque
      // el tope por archivo permita 500 MB. Si el archivo cabe en el búfer se
      // reusa como contenido; si es mayor y es texto, `readFile` con
      // codificación decodifica directo a cadena sin materializar un Buffer
      // del tamaño completo al lado de la cadena.
      const sniffSize = Math.min(SNIFF_BUFFER_SIZE, fileSize)
      const fd = await open(filePath, 'r')
      try {
        const sniffBuf = Buffer.alloc(sniffSize)
        const { bytesRead } = await fd.read(sniffBuf, 0, sniffSize, 0)
        const sniff = sniffBuf.subarray(0, bytesRead)

        if (isBinaryContent(sniff)) {
          continue
        }

        let content: string
        if (fileSize <= sniffSize) {
          content = sniff.toString('utf-8')
        } else {
          content = await readFile(filePath, 'utf-8')
        }

        result.push({ path: filePath, content })
        totalSize += fileSize
      } finally {
        await fd.close()
      }
    } catch (err) {
      // Un archivo que no se puede leer se salta.
      logForDebugging(`Failed to read untracked file ${filePath}: ${err}`)
    }
  }

  return result
}

/** El modo degradado: sin base remota, se ancla en HEAD y ya. */
async function headOnlyState(): Promise<PreservedGitState> {
  const [{ stdout: patch }, untrackedFiles] = await Promise.all([
    execFileNoThrow(gitExe(), ['diff', 'HEAD']),
    captureUntrackedFiles(),
  ])
  return {
    remote_base_sha: null,
    remote_base: null,
    patch: patch || '',
    untracked_files: untrackedFiles,
    format_patch: null,
    head_sha: null,
    branch_name: null,
  }
}

/**
 * Preserva el estado de git para el envío de una incidencia, anclado en la
 * base remota para que sea reproducible.
 *
 * Casos límite cubiertos: HEAD desprendido, sin remoto, y clon superficial —
 * los tres caen al modo de sólo-HEAD.
 */
export async function preserveGitStateForIssue(): Promise<PreservedGitState | null> {
  try {
    const isGit = await getIsGit()
    if (!isGit) {
      return null
    }

    if (await isShallowClone()) {
      logForDebugging('Shallow clone detected, using HEAD-only mode for issue')
      return headOnlyState()
    }

    const remoteBase = await findRemoteBase()

    if (!remoteBase) {
      logForDebugging('No remote found, using HEAD-only mode for issue')
      return headOnlyState()
    }

    const { stdout: mergeBase, code: mergeBaseCode } = await execFileNoThrow(
      gitExe(),
      ['merge-base', 'HEAD', remoteBase],
      { preserveOutputOnError: false },
    )

    if (mergeBaseCode !== 0 || !mergeBase.trim()) {
      logForDebugging('Merge-base failed, using HEAD-only mode for issue')
      return headOnlyState()
    }

    const remoteBaseSha = mergeBase.trim()

    // Los cinco comandos siguientes dependen sólo de `remoteBaseSha`, así que
    // van en paralelo: cinco veces ~90 ms en serie contra ~90 ms juntos.
    const [
      { stdout: patch },
      untrackedFiles,
      { stdout: formatPatchOut, code: formatPatchCode },
      { stdout: headSha },
      { stdout: branchName },
    ] = await Promise.all([
      execFileNoThrow(gitExe(), ['diff', remoteBaseSha]),
      captureUntrackedFiles(),
      // `format-patch` conserva la cadena real de commits —autor, fecha,
      // mensaje— para que la reproducción reconstruya la rama con commits de
      // verdad en vez de un diff aplastado.
      execFileNoThrow(gitExe(), [
        'format-patch',
        `${remoteBaseSha}..HEAD`,
        '--stdout',
      ]),
      execFileNoThrow(gitExe(), ['rev-parse', 'HEAD']),
      execFileNoThrow(gitExe(), ['rev-parse', '--abbrev-ref', 'HEAD']),
    ])

    let formatPatch: string | null = null
    if (formatPatchCode === 0 && formatPatchOut && formatPatchOut.trim()) {
      formatPatch = formatPatchOut
    }

    const trimmedBranch = branchName?.trim()
    return {
      remote_base_sha: remoteBaseSha,
      remote_base: remoteBase,
      patch: patch || '',
      untracked_files: untrackedFiles,
      format_patch: formatPatch,
      head_sha: headSha?.trim() || null,
      branch_name:
        trimmedBranch && trimmedBranch !== 'HEAD' ? trimmedBranch : null,
    }
  } catch (err) {
    logError(err)
    return null
  }
}

function isLocalHost(host: string): boolean {
  const hostWithoutPort = host.split(':')[0] ?? ''
  return (
    hostWithoutPort === 'localhost' ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostWithoutPort)
  )
}

/**
 * ¿El directorio actual parece un repositorio git DESNUDO, o ha sido
 * manipulado para parecerlo?
 *
 * SEGURIDAD: git considera desnudo a un directorio que tenga `HEAD`,
 * `objects/` y `refs/` en la raíz, y entonces ejecuta `hooks/pre-commit` y
 * los demás desde ahí. El ataque es en tres pasos: se plantan esos tres más
 * un hook, se corrompe `.git/HEAD` para invalidar el directorio de git real,
 * y al primer `git status` el hook corre.
 */
export function isCurrentDirectoryBareGitRepo(): boolean {
  const fs = getFsImplementation()
  const cwd = getCwd()

  const gitPath = join(cwd, '.git')
  try {
    const stats = fs.statSync(gitPath)
    if (stats.isFile()) {
      // Worktree o submódulo: git sigue la referencia y no descubre desde cwd.
      return false
    }
    if (stats.isDirectory()) {
      const gitHeadPath = join(gitPath, 'HEAD')
      try {
        // SEGURIDAD: se comprueba `isFile()`. Un `.git/HEAD` creado como
        // DIRECTORIO pasaría un `statSync` a secas, pero git lo rechaza como
        // HEAD inválido y vuelve a descubrir desde el cwd — que es justo el
        // camino que esta guarda vigila.
        if (fs.statSync(gitHeadPath).isFile()) {
          return false
        }
        // `.git/HEAD` existe y no es archivo regular: se sigue.
      } catch {
        // `.git` existe pero no hay HEAD: se sigue.
      }
    }
  } catch {
    // No hay `.git`: se sigue.
  }

  // Sin un `.git/HEAD` válido, se marca si aparece CUALQUIERA de los tres
  // indicadores. Cada uno con su try/catch, para que un error en uno no tape
  // a los otros.
  try {
    if (fs.statSync(join(cwd, 'HEAD')).isFile()) return true
  } catch {
    // sin HEAD
  }
  try {
    if (fs.statSync(join(cwd, 'objects')).isDirectory()) return true
  } catch {
    // sin objects/
  }
  try {
    if (fs.statSync(join(cwd, 'refs')).isDirectory()) return true
  } catch {
    // sin refs/
  }
  return false
}
