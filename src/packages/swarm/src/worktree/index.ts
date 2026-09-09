/**
 * Aislamiento de compañeros por `git worktree` — creación, resumen, limpieza.
 *
 * Procedencia: `ccnmt: packages/swarm/src/worktree/index.ts` (1516 líneas,
 * 15 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así
 * que el cuerpo se **reimplementa** y no se copia.
 *
 * EL PROBLEMA: cada compañero necesita su propio árbol de trabajo — dos
 * compañeros compartiendo el working tree del líder pisarían los cambios
 * sin commitear del otro. `git worktree` da un directorio + rama propios
 * sobre el MISMO repositorio (sin clonar objetos), y este módulo es el
 * ciclo de vida completo: crear/resumir (`getOrCreateWorktree`, camino
 * rápido de resumen leyendo `.git` directo sin subproceso), el setup
 * posterior a la creación (settings.local.json, git hooks, symlinks de
 * `node_modules` para no duplicar disco, `.worktreeinclude`), la limpieza
 * (`cleanupWorktree`/`removeAgentWorktree`), y el barrido periódico de
 * worktrees huérfanos de agentes/workflows muertos
 * (`cleanupStaleAgentWorktrees`, fail-closed: sólo borra si el patrón del
 * slug es efímero Y el árbol está limpio Y todo está en un remoto).
 *
 * Dos rutas de creación conviven: **basada en git** (el camino normal) y
 * **basada en hook** (`WorktreeCreate`/`WorktreeRemove` de settings.json,
 * para VCS distinto de git) — la fuente comprueba el hook primero en cada
 * punto de entrada, y este porte conserva ese orden.
 *
 * DIVERGENCIA DECLARADA (1): `feature('COMMIT_ATTRIBUTION')` — macro de
 * build time de `bun:bundle`, ausente en este árbol (mismo caso que
 * `runtime/spawnInProcess.ts`). Sustituto local no exportado (mismo patrón
 * que `voice/src/voiceModeEnabled.ts`): lee `CCB_FEATURE_COMMIT_ATTRIBUTION`
 * del entorno, con polaridad DEFAULT-OFF (`=== '1'`) — a diferencia de
 * `VOICE_MODE`, que en `ccnmt: scripts/default-features.ts` sí figura en
 * `STABLE_FEATURES` (default-on, `!== '0'`), `COMMIT_ATTRIBUTION` NO figura
 * ahí (medido: 37 entradas, ninguna con ese nombre) — el valor seguro es
 * `false`, y con eso el bloque que instala el hook de atribución de commits
 * simplemente no se ejecuta.
 *
 * DIVERGENCIA DECLARADA (2): no se creó un `internal/pendingCrossPackageDeps.ts`
 * exportado para el sustituto de `feature()` — se midió primero contra
 * `src/verify/staleSubstitutes.ts` (el censo de sustitutos rancios que este
 * mismo árbol ya corre): ese censo excluye del índice de "hogares" a
 * cualquier archivo `pendingCrossPackageDeps.ts`, pero `provider/src/internal/
 * legacyRuntimeSupport.ts` (que NO es un archivo así nombrado) ya exporta un
 * `feature()` real — así que un `feature` exportado en un
 * `pendingCrossPackageDeps.ts` de swarm habría sido flagged como sustituto
 * rancio desde el primer censo. La función local no exportada por archivo
 * (patrón `voiceModeEnabled.ts`) no entra en ese barrido.
 */

import chalk from 'chalk'
import { spawnSync } from 'node:child_process'
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  symlink,
  utimes,
} from 'node:fs/promises'
import ignore from 'ignore'
import { basename, dirname, join } from 'node:path'
import { unlinkWindowsReparsePoints } from './safeRemoval.js'
import { cleanupSparseWorktreeConfig } from './sparseConfigCleanup.js'
import { safelyIgnored } from './safeIgnore.js'
import {
  containsPathTraversal,
  errorMessage,
  execFileNoThrow,
  execFileNoThrowWithCwd,
  executeWorktreeCreateHook,
  executeWorktreeRemoveHook,
  findCanonicalGitRoot,
  findGitRoot,
  getBranch,
  getCommonDir,
  getCwd,
  getDefaultBranch,
  getErrnoCode,
  getInitialSettings,
  getPlatform,
  getRelativeSettingsFilePathForSource,
  gitExe,
  hasWorktreeCreateHook,
  logForDebugging,
  parseGitConfigValue,
  readWorktreeHeadSha,
  resolveGitDir,
  resolveRef,
  saveCurrentProjectConfig,
  sleep,
} from '../adapters/appRuntime.js'
import { isInITerm2 } from '../backends/detection.js'

/** Ver DIVERGENCIA DECLARADA (1) — sustituto local de `feature()` de `bun:bundle`. */
function feature(flag: 'COMMIT_ATTRIBUTION'): boolean {
  return process.env[`CCB_FEATURE_${flag}`] === '1'
}

const VALID_WORKTREE_SLUG_SEGMENT = /^[a-zA-Z0-9._-]+$/
const MAX_WORKTREE_SLUG_LENGTH = 64

/**
 * Valida un slug de worktree contra path traversal y escape de directorio.
 *
 * El slug se une en `.claude/worktrees/<slug>` vía `path.join`, que
 * normaliza segmentos `..` — así que `../../../target` escaparía el
 * directorio de worktrees. Igual, una ruta absoluta (`/` o `C:\` inicial)
 * descartaría el prefijo por completo.
 *
 * Se admiten forward slashes para anidar (p.ej. `asm/feature-foo`); cada
 * segmento se valida por separado contra la lista blanca, así que
 * segmentos `.` / `..` y caracteres de unidad siguen rechazados.
 *
 * Lanza síncronamente — los llamadores dependen de que esto corra antes de
 * cualquier efecto secundario (comandos git, ejecución de hooks, chdir).
 */
export function validateWorktreeSlug(slug: string): void {
  if (slug.length > MAX_WORKTREE_SLUG_LENGTH) {
    throw new Error(
      `Invalid worktree name: must be ${MAX_WORKTREE_SLUG_LENGTH} characters or fewer (got ${slug.length})`,
    )
  }
  // Un `/` inicial o final haría que path.join produjera una ruta absoluta
  // o un segmento colgante. Dividir y validar cada segmento rechaza ambos
  // (los segmentos vacíos fallan la regex) mientras permite `user/feature`.
  for (const segment of slug.split('/')) {
    if (segment === '.' || segment === '..') {
      throw new Error(
        `Invalid worktree name "${slug}": must not contain "." or ".." path segments`,
      )
    }
    if (!VALID_WORKTREE_SLUG_SEGMENT.test(segment)) {
      throw new Error(
        `Invalid worktree name "${slug}": each "/"-separated segment must be non-empty and contain only letters, digits, dots, underscores, and dashes`,
      )
    }
  }
}

/** Crea directorios recursivamente. */
async function mkdirRecursive(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true })
}

/**
 * Simlinkea directorios del repo principal para evitar duplicación. Previene
 * el hinchamiento de disco por duplicar `node_modules` y otros directorios
 * grandes.
 */
async function symlinkDirectories(
  repoRootPath: string,
  worktreePath: string,
  dirsToSymlink: string[],
): Promise<void> {
  for (const dir of dirsToSymlink) {
    // Valida que el directorio no escape los límites del repositorio.
    if (containsPathTraversal(dir)) {
      logForDebugging(`Skipping symlink for "${dir}": path traversal detected`, {
        level: 'warn',
      })
      continue
    }

    const sourcePath = join(repoRootPath, dir)
    const destPath = join(worktreePath, dir)

    try {
      await symlink(sourcePath, destPath, 'dir')
      logForDebugging(
        `Symlinked ${dir} from main repository to worktree to avoid disk bloat`,
      )
    } catch (error) {
      const code = getErrnoCode(error)
      // ENOENT: la fuente aún no existe (esperado — se salta en silencio).
      // EEXIST: el destino ya existe (esperado — se salta en silencio).
      if (code !== 'ENOENT' && code !== 'EEXIST') {
        // Error inesperado (permiso denegado, plataforma no soportada, …).
        logForDebugging(
          `Failed to symlink ${dir} (${code ?? 'unknown'}): ${errorMessage(error)}`,
          { level: 'warn' },
        )
      }
    }
  }
}

export type WorktreeSession = {
  originalCwd: string
  worktreePath: string
  worktreeName: string
  worktreeBranch?: string
  originalBranch?: string
  originalHeadCommit?: string
  sessionId: string
  tmuxSessionName?: string
  hookBased?: boolean
  /** Cuánto tardó crear el worktree (sin fijar al resumir uno existente). */
  creationDurationMs?: number
  /** true si se aplicó git sparse-checkout vía settings.worktree.sparsePaths. */
  usedSparsePaths?: boolean
}

let currentWorktreeSession: WorktreeSession | null = null

export function getCurrentWorktreeSession(): WorktreeSession | null {
  return currentWorktreeSession
}

/**
 * Restaura la sesión de worktree en `--resume`. El llamador ya debe haber
 * verificado que el directorio existe (vía process.chdir) y fijado el
 * estado de bootstrap (cwd, originalCwd).
 */
export function restoreWorktreeSession(session: WorktreeSession | null): void {
  currentWorktreeSession = session
}

export function generateTmuxSessionName(repoPath: string, branch: string): string {
  const repoName = basename(repoPath)
  const combined = `${repoName}_${branch}`
  return combined.replace(/[/.]/g, '_')
}

type WorktreeCreateResult =
  | {
      worktreePath: string
      worktreeBranch: string
      headCommit: string
      existed: true
    }
  | {
      worktreePath: string
      worktreeBranch: string
      headCommit: string
      baseBranch: string
      existed: false
    }

// Variables de entorno para evitar que git/SSH pidan credenciales (lo que
// cuelga el CLI). GIT_TERMINAL_PROMPT=0 evita que git abra /dev/tty para
// prompts de credenciales. GIT_ASKPASS='' deshabilita programas GUI de
// askpass.
const GIT_NO_PROMPT_ENV = {
  GIT_TERMINAL_PROMPT: '0',
  GIT_ASKPASS: '',
}

function worktreesDir(repoRoot: string): string {
  return join(repoRoot, '.claude', 'worktrees')
}

// Aplana slugs anidados (`user/feature` → `user+feature`) tanto para el
// nombre de rama como para la ruta de directorio. Anidar en cualquiera de
// los dos es inseguro:
//   - refs de git: `worktree-user` (archivo) vs `worktree-user/feature`
//     (necesita directorio) es un conflicto D/F que git rechaza.
//   - directorio: `.claude/worktrees/user/feature/` vive dentro del
//     worktree `user`; `git worktree remove` sobre el padre borra hijos
//     con trabajo sin commitear.
// `+` es válido en nombres de rama de git y en rutas de filesystem pero NO
// está en la lista blanca de segmentos de slug ([a-zA-Z0-9._-]), así que el
// mapeo es inyectivo.
function flattenSlug(slug: string): string {
  return slug.replaceAll('/', '+')
}

export function worktreeBranchName(slug: string): string {
  return `worktree-${flattenSlug(slug)}`
}

function worktreePathFor(repoRoot: string, slug: string): string {
  return join(worktreesDir(repoRoot), flattenSlug(slug))
}

/**
 * Crea un nuevo git worktree para el slug dado, o lo resume si ya existe.
 * Los worktrees nombrados reusan la misma ruta entre invocaciones, así que
 * el chequeo de existencia evita correr `git fetch` incondicionalmente (lo
 * que puede colgarse esperando credenciales) en cada resumen.
 */
async function getOrCreateWorktree(
  repoRoot: string,
  slug: string,
  options?: { prNumber?: number },
): Promise<WorktreeCreateResult> {
  const worktreePath = worktreePathFor(repoRoot, slug)
  const worktreeBranch = worktreeBranchName(slug)

  // Camino rápido de resumen: si el worktree ya existe, se salta fetch y
  // creación. Lee el archivo puntero `.git` directo (sin subproceso, sin
  // caminar hacia arriba) — un subproceso `rev-parse HEAD` quema ~15ms de
  // overhead de spawn incluso para una tarea de 2ms, y el await yield deja
  // que se acumulen spawnSyncs de fondo (visto en 55ms).
  const existingHead = await readWorktreeHeadSha(worktreePath)
  if (existingHead) {
    return { worktreePath, worktreeBranch, headCommit: existingHead, existed: true }
  }

  // Worktree nuevo: fetch de la rama base, luego add.
  await mkdir(worktreesDir(repoRoot), { recursive: true })

  const fetchEnv = { ...process.env, ...GIT_NO_PROMPT_ENV }

  let baseBranch: string
  let baseSha: string | null = null
  if (options?.prNumber) {
    const { code: prFetchCode, stderr: prFetchStderr } = await execFileNoThrowWithCwd(
      gitExe(),
      ['fetch', 'origin', `pull/${options.prNumber}/head`],
      { cwd: repoRoot, stdin: 'ignore', env: fetchEnv },
    )
    if (prFetchCode !== 0) {
      throw new Error(
        `Failed to fetch PR #${options.prNumber}: ${prFetchStderr.trim() || 'PR may not exist or the repository may not have a remote named "origin"'}`,
      )
    }
    baseBranch = 'FETCH_HEAD'
  } else {
    // Si origin/<branch> ya existe localmente, se salta fetch. En repos
    // grandes (210k archivos, 16M objetos) fetch quema ~6-8s en un scan del
    // commit-graph local antes de tocar siquiera la red. Una base algo
    // desactualizada está bien — el usuario puede pull en el worktree si
    // quiere lo último. resolveRef lee el ref suelto/empacado directo;
    // cuando tiene éxito ya tenemos el SHA, así que el rev-parse posterior
    // se salta por completo.
    const [defaultBranch, gitDir] = await Promise.all([
      getDefaultBranch(),
      resolveGitDir(repoRoot),
    ])
    const originRef = `origin/${defaultBranch}`
    const originSha = gitDir
      ? await resolveRef(gitDir, `refs/remotes/origin/${defaultBranch}`)
      : null
    if (originSha) {
      baseBranch = originRef
      baseSha = originSha
    } else {
      const { code: fetchCode } = await execFileNoThrowWithCwd(
        gitExe(),
        ['fetch', 'origin', defaultBranch],
        { cwd: repoRoot, stdin: 'ignore', env: fetchEnv },
      )
      baseBranch = fetchCode === 0 ? originRef : 'HEAD'
    }
  }

  // Para los caminos de fetch/PR-fetch todavía hace falta el SHA — el
  // resolveRef de sólo-filesystem de arriba sólo cubre el caso "origin/<branch>
  // ya existe localmente".
  if (!baseSha) {
    const { stdout, code: shaCode } = await execFileNoThrowWithCwd(
      gitExe(),
      ['rev-parse', baseBranch],
      { cwd: repoRoot },
    )
    if (shaCode !== 0) {
      throw new Error(`Failed to resolve base branch "${baseBranch}": git rev-parse failed`)
    }
    baseSha = stdout.trim()
  }

  const sparsePaths = getInitialSettings().worktree?.sparsePaths
  const addArgs = ['worktree', 'add']
  if (sparsePaths?.length) {
    addArgs.push('--no-checkout')
  }
  // -B (no -b): resetea cualquier rama huérfana dejada por un worktree
  // removido. Ahorra un subproceso `git branch -D` (~15ms de overhead de
  // spawn) en cada creación.
  addArgs.push('-B', worktreeBranch, worktreePath, baseBranch)

  const { code: createCode, stderr: createStderr } = await execFileNoThrowWithCwd(
    gitExe(),
    addArgs,
    { cwd: repoRoot },
  )
  if (createCode !== 0) {
    throw new Error(`Failed to create worktree: ${createStderr}`)
  }

  if (sparsePaths?.length) {
    // Si sparse-checkout o checkout fallan después de --no-checkout, el
    // worktree queda registrado y HEAD fijado pero el working tree vacío.
    // El resumen rápido de la próxima corrida (rev-parse HEAD) tendría
    // éxito y presentaría un worktree roto como "resumido". Se desmonta
    // antes de propagar el error.
    const tearDown = async (msg: string): Promise<never> => {
      await execFileNoThrowWithCwd(gitExe(), ['worktree', 'remove', '--force', worktreePath], {
        cwd: repoRoot,
      })
      throw new Error(msg)
    }
    const { code: sparseCode, stderr: sparseErr } = await execFileNoThrowWithCwd(
      gitExe(),
      ['sparse-checkout', 'set', '--cone', '--', ...sparsePaths],
      { cwd: worktreePath },
    )
    if (sparseCode !== 0) {
      await tearDown(`Failed to configure sparse-checkout: ${sparseErr}`)
    }
    const { code: coCode, stderr: coErr } = await execFileNoThrowWithCwd(
      gitExe(),
      ['checkout', 'HEAD'],
      { cwd: worktreePath },
    )
    if (coCode !== 0) {
      await tearDown(`Failed to checkout sparse worktree: ${coErr}`)
    }
  }

  return { worktreePath, worktreeBranch, headCommit: baseSha, baseBranch, existed: false }
}

/**
 * Copia archivos gitignored especificados en `.worktreeinclude` del repo
 * base al worktree.
 *
 * Sólo copia archivos que están AMBOS:
 * 1. Emparejados por patrones en `.worktreeinclude` (sintaxis de .gitignore)
 * 2. Gitignored (no trackeados por git)
 *
 * Usa `git ls-files --others --ignored --exclude-standard --directory` para
 * listar entradas gitignored con directorios totalmente ignorados
 * colapsados a una sola entrada (así outputs de build grandes como
 * `node_modules/` no fuerzan un recorrido completo del árbol), luego
 * filtra contra patrones de `.worktreeinclude` en proceso usando la
 * librería `ignore`. Si un patrón de `.worktreeinclude` apunta
 * explícitamente a una ruta dentro de un directorio colapsado, ese
 * directorio se expande con una segunda llamada `ls-files` acotada.
 */
export async function copyWorktreeIncludeFiles(
  repoRoot: string,
  worktreePath: string,
): Promise<string[]> {
  let includeContent: string
  try {
    includeContent = await readFile(join(repoRoot, '.worktreeinclude'), 'utf-8')
  } catch {
    return []
  }

  const patterns = includeContent
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'))
  if (patterns.length === 0) {
    return []
  }

  // Colapsa directorios totalmente ignorados para que repos grandes sigan
  // siendo baratos de escanear.
  const gitignored = await execFileNoThrowWithCwd(
    gitExe(),
    ['ls-files', '--others', '--ignored', '--exclude-standard', '--directory'],
    { cwd: repoRoot },
  )
  if (gitignored.code !== 0 || !gitignored.stdout.trim()) {
    return []
  }

  const entries = gitignored.stdout.trim().split('\n').filter(Boolean)
  const matcher = ignore()
  try {
    matcher.add(includeContent)
  } catch {
    return []
  }

  const collapsedDirs = entries.filter(e => e.endsWith('/'))
  const files = entries.filter(e => !e.endsWith('/') && safelyIgnored(matcher, e))

  // Expande directorios colapsados sólo cuando un patrón puede apuntar a su
  // contenido. Expandir para `**/` o patrones sin anclar — esos emparejan
  // archivos en directorios trackeados (ya listados individualmente) y
  // expandir cada directorio colapsado para ellos anularía la ganancia de
  // rendimiento.
  const dirsToExpand = collapsedDirs.filter(dir => {
    if (
      patterns.some(p => {
        const normalized = p.startsWith('/') ? p.slice(1) : p
        // Emparejamiento de prefijo literal: el patrón empieza con la ruta
        // del directorio colapsado.
        if (normalized.startsWith(dir)) return true
        // Glob anclado: el directorio cae bajo el prefijo literal
        // (no-glob) del patrón — p.ej. `config/**/*.key` tiene prefijo
        // literal `config/` → expande `config/secrets/`.
        const globIdx = normalized.search(/[*?[]/)
        if (globIdx > 0) {
          const literalPrefix = normalized.slice(0, globIdx)
          if (dir.startsWith(literalPrefix)) return true
        }
        return false
      })
    )
      return true
    if (safelyIgnored(matcher, dir.slice(0, -1))) return true
    return false
  })
  if (dirsToExpand.length > 0) {
    const expanded = await execFileNoThrowWithCwd(
      gitExe(),
      ['ls-files', '--others', '--ignored', '--exclude-standard', '--', ...dirsToExpand],
      { cwd: repoRoot },
    )
    if (expanded.code === 0 && expanded.stdout.trim()) {
      for (const f of expanded.stdout.trim().split('\n').filter(Boolean)) {
        if (safelyIgnored(matcher, f)) {
          files.push(f)
        }
      }
    }
  }
  const copied: string[] = []

  for (const relativePath of files) {
    const srcPath = join(repoRoot, relativePath)
    const destPath = join(worktreePath, relativePath)
    try {
      await mkdir(dirname(destPath), { recursive: true })
      await copyFile(srcPath, destPath)
      copied.push(relativePath)
    } catch (e: unknown) {
      logForDebugging(`Failed to copy ${relativePath} to worktree: ${(e as Error).message}`, {
        level: 'warn',
      })
    }
  }

  if (copied.length > 0) {
    logForDebugging(`Copied ${copied.length} files from .worktreeinclude: ${copied.join(', ')}`)
  }

  return copied
}

/**
 * Setup posterior a la creación de un worktree nuevo. Propaga
 * settings.local.json, configura git hooks, y simlinkea directorios.
 */
async function performPostCreationSetup(repoRoot: string, worktreePath: string): Promise<void> {
  // Copia settings.local.json al directorio .claude del worktree. Esto
  // propaga settings locales (que pueden contener secretos) al worktree.
  const localSettingsRelativePath = getRelativeSettingsFilePathForSource('localSettings')
  const sourceSettingsLocal = join(repoRoot, localSettingsRelativePath)
  try {
    const destSettingsLocal = join(worktreePath, localSettingsRelativePath)
    await mkdirRecursive(dirname(destSettingsLocal))
    await copyFile(sourceSettingsLocal, destSettingsLocal)
    logForDebugging(`Copied settings.local.json to worktree: ${destSettingsLocal}`)
  } catch (e: unknown) {
    const code = getErrnoCode(e)
    if (code !== 'ENOENT') {
      logForDebugging(`Failed to copy settings.local.json: ${(e as Error).message}`, {
        level: 'warn',
      })
    }
  }

  // Configura el worktree para usar hooks del repo principal. Esto resuelve
  // problemas con .husky y otros git hooks que usan rutas relativas.
  const huskyPath = join(repoRoot, '.husky')
  const gitHooksPath = join(repoRoot, '.git', 'hooks')
  let hooksPath: string | null = null
  for (const candidatePath of [huskyPath, gitHooksPath]) {
    try {
      const s = await stat(candidatePath)
      if (s.isDirectory()) {
        hooksPath = candidatePath
        break
      }
    } catch {
      // La ruta no existe o no es accesible.
    }
  }
  if (hooksPath) {
    // `git config` (sin --worktree) escribe al .git/config del repo
    // principal, compartido por todos los worktrees. Una vez fijado, cada
    // creación de worktree subsecuente es no-op — se salta el subproceso
    // (~14ms de spawn) cuando el valor ya coincide.
    const gitDir = await resolveGitDir(repoRoot)
    const configDir = gitDir ? ((await getCommonDir(gitDir)) ?? gitDir) : null
    const existing = configDir
      ? await parseGitConfigValue(configDir, 'core', null, 'hooksPath')
      : null
    if (existing !== hooksPath) {
      const { code: configCode, stderr: configError } = await execFileNoThrowWithCwd(
        gitExe(),
        ['config', 'core.hooksPath', hooksPath],
        { cwd: worktreePath },
      )
      if (configCode === 0) {
        logForDebugging(`Configured worktree to use hooks from main repository: ${hooksPath}`)
      } else {
        logForDebugging(`Failed to configure hooks path: ${configError}`, { level: 'error' })
      }
    }
  }

  // Simlinkea directorios para evitar hinchamiento de disco (opt-in vía
  // settings).
  const settings = getInitialSettings()
  const dirsToSymlink = settings.worktree?.symlinkDirectories ?? []
  if (dirsToSymlink.length > 0) {
    await symlinkDirectories(repoRoot, worktreePath, dirsToSymlink)
  }

  // Copia archivos gitignored especificados en .worktreeinclude
  // (best-effort).
  await copyWorktreeIncludeFiles(repoRoot, worktreePath)

  // El core.hooksPath fijado arriba es frágil: el script prepare de husky
  // (`git config core.hooksPath .husky`) corre en cada `bun install` y
  // resetea el valor COMPARTIDO de .git/config de vuelta a relativo,
  // haciendo que cada worktree resuelva de nuevo a su PROPIO .husky/. El
  // archivo del hook de atribución no está trackeado (vive en
  // .git/info/exclude), así que worktrees frescos no lo tienen. Se instala
  // directo en el .husky/ del worktree — husky no lo va a borrar (husky
  // install es sólo-aditivo), y para repos sin husky esto resuelve al
  // .git/hooks/ compartido (idempotente).
  //
  // Se pasa el .husky local del worktree explícitamente: getHooksDir
  // devolvería el core.hooksPath absoluto que se acaba de fijar arriba
  // (el .husky del repo principal), no el del worktree — `git rev-parse
  // --git-path hooks` repite el valor de config verbatim cuando es
  // absoluto.
  if (feature('COMMIT_ATTRIBUTION')) {
    const worktreeHooksDir = hooksPath === huskyPath ? join(worktreePath, '.husky') : undefined
    void import('./postCommitAttribution.js')
      .then(m =>
        m.installPrepareCommitMsgHook(worktreePath, worktreeHooksDir).catch(error => {
          logForDebugging(`Failed to install attribution hook in worktree: ${error}`)
        }),
      )
      .catch(error => {
        // El propio dynamic import() fue rechazado (falla al cargar el
        // módulo). El .catch interno de arriba sólo maneja el rechazo de
        // installPrepareCommitMsgHook — sin este handler externo, una
        // falla del import surgiría como un rechazo de promesa sin
        // manejar.
        logForDebugging(`Failed to load postCommitAttribution module: ${error}`)
      })
  }
}

/**
 * Parsea una referencia de PR desde un string. Acepta URLs de PR estilo
 * GitHub (p.ej. https://github.com/owner/repo/pull/123, o equivalentes GHE
 * como https://ghe.example.com/owner/repo/pull/123) o formato `#N` (p.ej.
 * #123). Devuelve el número de PR o null si el string no es una referencia
 * de PR reconocida.
 */
export function parsePRReference(input: string): number | null {
  // URL de PR estilo GitHub: https://<host>/owner/repo/pull/123 (con slash
  // final, query, hash opcionales). La forma de ruta /pull/N es específica
  // de GitHub — GitLab usa /-/merge_requests/N, Bitbucket usa
  // /pull-requests/N — así que emparejar cualquier host aquí es seguro.
  const urlMatch = input.match(/^https?:\/\/[^/]+\/[^/]+\/[^/]+\/pull\/(\d+)\/?(?:[?#].*)?$/i)
  if (urlMatch?.[1]) {
    return parseInt(urlMatch[1], 10)
  }

  // Formato #N.
  const hashMatch = input.match(/^#(\d+)$/)
  if (hashMatch?.[1]) {
    return parseInt(hashMatch[1], 10)
  }

  return null
}

export async function isTmuxAvailable(): Promise<boolean> {
  const { code } = await execFileNoThrow('tmux', ['-V'])
  return code === 0
}

export function getTmuxInstallInstructions(): string {
  const platform = getPlatform()
  switch (platform) {
    case 'macos':
      return 'Install tmux with: brew install tmux'
    case 'linux':
    case 'wsl':
      return 'Install tmux with: sudo apt install tmux (Debian/Ubuntu) or sudo dnf install tmux (Fedora/RHEL)'
    case 'windows':
      return 'tmux is not natively available on Windows. Consider using WSL or Cygwin.'
    default:
      return 'Install tmux using your system package manager.'
  }
}

export async function createTmuxSessionForWorktree(
  sessionName: string,
  worktreePath: string,
): Promise<{ created: boolean; error?: string }> {
  const { code, stderr } = await execFileNoThrow('tmux', [
    'new-session',
    '-d',
    '-s',
    sessionName,
    '-c',
    worktreePath,
  ])

  if (code !== 0) {
    return { created: false, error: stderr }
  }

  return { created: true }
}

export async function killTmuxSession(sessionName: string): Promise<boolean> {
  const { code } = await execFileNoThrow('tmux', ['kill-session', '-t', sessionName])
  return code === 0
}

export async function createWorktreeForSession(
  sessionId: string,
  slug: string,
  tmuxSessionName?: string,
  options?: { prNumber?: number },
): Promise<WorktreeSession> {
  // Debe correr antes de la rama basada en hook de abajo — los hooks
  // reciben el slug crudo como argumento, y la rama de git construye una
  // ruta desde él vía path.join.
  validateWorktreeSlug(slug)

  const originalCwd = getCwd()

  // Prueba primero la creación de worktree basada en hook (permite VCS
  // configurado por el usuario).
  if (hasWorktreeCreateHook()) {
    const hookResult = await executeWorktreeCreateHook(slug)
    logForDebugging(`Created hook-based worktree at: ${hookResult.worktreePath}`)

    currentWorktreeSession = {
      originalCwd,
      worktreePath: hookResult.worktreePath,
      worktreeName: slug,
      sessionId,
      tmuxSessionName,
      hookBased: true,
    }
  } else {
    // Cae al git worktree.
    const gitRoot = findGitRoot(getCwd())
    if (!gitRoot) {
      throw new Error(
        'Cannot create a worktree: not in a git repository and no WorktreeCreate hooks are configured. ' +
          'Configure WorktreeCreate/WorktreeRemove hooks in settings.json to use worktree isolation with other VCS systems.',
      )
    }

    const originalBranch = await getBranch()

    const createStart = Date.now()
    const { worktreePath, worktreeBranch, headCommit, existed } = await getOrCreateWorktree(
      gitRoot,
      slug,
      options,
    )

    let creationDurationMs: number | undefined
    if (existed) {
      logForDebugging(`Resuming existing worktree at: ${worktreePath}`)
    } else {
      logForDebugging(`Created worktree at: ${worktreePath} on branch: ${worktreeBranch}`)
      await performPostCreationSetup(gitRoot, worktreePath)
      creationDurationMs = Date.now() - createStart
    }

    currentWorktreeSession = {
      originalCwd,
      worktreePath,
      worktreeName: slug,
      worktreeBranch,
      originalBranch,
      originalHeadCommit: headCommit,
      sessionId,
      tmuxSessionName,
      creationDurationMs,
      usedSparsePaths: (getInitialSettings().worktree?.sparsePaths?.length ?? 0) > 0,
    }
  }

  // Guarda en config del proyecto para persistencia.
  saveCurrentProjectConfig(current => ({
    ...current,
    activeWorktreeSession: currentWorktreeSession ?? undefined,
  }))

  return currentWorktreeSession
}

export async function keepWorktree(): Promise<void> {
  if (!currentWorktreeSession) {
    return
  }

  try {
    const { worktreePath, originalCwd, worktreeBranch } = currentWorktreeSession

    // Vuelve al directorio original primero.
    process.chdir(originalCwd)

    // Limpia la sesión pero deja el worktree intacto.
    currentWorktreeSession = null

    // Actualiza config.
    saveCurrentProjectConfig(current => ({
      ...current,
      activeWorktreeSession: undefined,
    }))

    logForDebugging(
      `Linked worktree preserved at: ${worktreePath}${worktreeBranch ? ` on branch: ${worktreeBranch}` : ''}`,
    )
    logForDebugging(`You can continue working there by running: cd ${worktreePath}`)
  } catch (error) {
    logForDebugging(`Error keeping worktree: ${error}`, { level: 'error' })
  }
}

export async function cleanupWorktree(): Promise<void> {
  if (!currentWorktreeSession) {
    return
  }

  try {
    const { worktreePath, originalCwd, worktreeBranch, hookBased, usedSparsePaths } =
      currentWorktreeSession

    // Vuelve al directorio original primero.
    process.chdir(originalCwd)

    if (hookBased) {
      // Worktree basado en hook: delega la limpieza al hook WorktreeRemove.
      const hookRan = await executeWorktreeRemoveHook(worktreePath)
      if (hookRan) {
        logForDebugging(`Removed hook-based worktree at: ${worktreePath}`)
      } else {
        logForDebugging(
          `No WorktreeRemove hook configured, hook-based worktree left at: ${worktreePath}`,
          { level: 'warn' },
        )
      }
    } else {
      await unlinkWindowsReparsePoints(worktreePath)
      // Usa un cwd original explícito porque process.chdir no actualiza
      // getCwd().
      const { code: removeCode, stderr: removeError } = await execFileNoThrowWithCwd(
        gitExe(),
        ['worktree', 'remove', '--force', worktreePath],
        { cwd: originalCwd },
      )

      if (removeCode !== 0) {
        logForDebugging(`Failed to remove linked worktree: ${removeError}`, { level: 'error' })
      } else {
        logForDebugging(`Removed linked worktree at: ${worktreePath}`)
        if (usedSparsePaths) await cleanupSparseWorktreeConfig(originalCwd)
      }
    }

    currentWorktreeSession = null

    saveCurrentProjectConfig(current => ({
      ...current,
      activeWorktreeSession: undefined,
    }))

    // Borra la rama temporal del worktree (sólo basado en git).
    if (!hookBased && worktreeBranch) {
      // Espera un poco para asegurar que git liberó todos los locks.
      await sleep(100)

      const { code: deleteBranchCode, stderr: deleteBranchError } = await execFileNoThrowWithCwd(
        gitExe(),
        ['branch', '-D', worktreeBranch],
        { cwd: originalCwd },
      )

      if (deleteBranchCode !== 0) {
        logForDebugging(`Could not delete worktree branch: ${deleteBranchError}`, {
          level: 'error',
        })
      } else {
        logForDebugging(`Deleted worktree branch: ${worktreeBranch}`)
      }
    }

    logForDebugging('Linked worktree cleaned up completely')
  } catch (error) {
    logForDebugging(`Error cleaning up worktree: ${error}`, { level: 'error' })
  }
}

/**
 * Crea un worktree ligero para un subagente. Reusa
 * getOrCreateWorktree/performPostCreationSetup pero NO toca el estado
 * global de sesión (currentWorktreeSession, process.chdir, config del
 * proyecto). Cae a la creación basada en hook si no está en un repo git.
 */
export async function createAgentWorktree(slug: string): Promise<{
  worktreePath: string
  worktreeBranch?: string
  headCommit?: string
  gitRoot?: string
  hookBased?: boolean
}> {
  validateWorktreeSlug(slug)

  // Prueba primero la creación de worktree basada en hook (permite VCS
  // configurado por el usuario).
  if (hasWorktreeCreateHook()) {
    const hookResult = await executeWorktreeCreateHook(slug)
    logForDebugging(`Created hook-based agent worktree at: ${hookResult.worktreePath}`)

    return { worktreePath: hookResult.worktreePath, hookBased: true }
  }

  // Cae al git worktree. findCanonicalGitRoot (no findGitRoot) para que
  // los worktrees de agente siempre caigan en el .claude/worktrees/ del
  // repo principal aún cuando se generen desde dentro de un worktree de
  // sesión — de lo contrario anidan en <worktree>/.claude/worktrees/ y la
  // limpieza periódica (que escanea la raíz canónica) nunca los encuentra.
  const gitRoot = findCanonicalGitRoot(getCwd())
  if (!gitRoot) {
    throw new Error(
      'Cannot create agent worktree: not in a git repository and no WorktreeCreate hooks are configured. ' +
        'Configure WorktreeCreate/WorktreeRemove hooks in settings.json to use worktree isolation with other VCS systems.',
    )
  }

  const { worktreePath, worktreeBranch, headCommit, existed } = await getOrCreateWorktree(
    gitRoot,
    slug,
  )

  if (!existed) {
    logForDebugging(`Created agent worktree at: ${worktreePath} on branch: ${worktreeBranch}`)
    await performPostCreationSetup(gitRoot, worktreePath)
  } else {
    // Actualiza el mtime para que la limpieza periódica de worktrees
    // stale no lo considere stale — el camino de resumen rápido es de
    // sólo lectura y deja intacto el mtime de creación original, que
    // puede estar más allá del corte de 30 días.
    const now = new Date()
    await utimes(worktreePath, now, now)
    logForDebugging(`Resuming existing agent worktree at: ${worktreePath}`)
  }

  return { worktreePath, worktreeBranch, headCommit, gitRoot }
}

/**
 * Remueve un worktree creado por createAgentWorktree. Para worktrees
 * basados en git, remueve el directorio del worktree y borra la rama
 * temporal. Para worktrees basados en hook, delega al hook
 * WorktreeRemove. Debe llamarse con la raíz git del repo principal (para
 * worktrees de git), no la ruta del worktree, ya que el directorio del
 * worktree se borra durante esta operación.
 */
export async function removeAgentWorktree(
  worktreePath: string,
  worktreeBranch?: string,
  gitRoot?: string,
  hookBased?: boolean,
): Promise<boolean> {
  if (hookBased) {
    const hookRan = await executeWorktreeRemoveHook(worktreePath)
    if (hookRan) {
      logForDebugging(`Removed hook-based agent worktree at: ${worktreePath}`)
    } else {
      logForDebugging(
        `No WorktreeRemove hook configured, hook-based agent worktree left at: ${worktreePath}`,
        { level: 'warn' },
      )
    }
    return hookRan
  }

  if (!gitRoot) {
    logForDebugging('Cannot remove agent worktree: no git root provided', { level: 'error' })
    return false
  }

  // Corre desde la raíz principal porque el worktree está a punto de
  // desaparecer.
  await unlinkWindowsReparsePoints(worktreePath)
  const { code: removeCode, stderr: removeError } = await execFileNoThrowWithCwd(
    gitExe(),
    ['worktree', 'remove', '--force', worktreePath],
    { cwd: gitRoot },
  )

  if (removeCode !== 0) {
    logForDebugging(`Failed to remove agent worktree: ${removeError}`, { level: 'error' })
    return false
  }
  logForDebugging(`Removed agent worktree at: ${worktreePath}`)
  if (getInitialSettings().worktree?.sparsePaths?.length) {
    await cleanupSparseWorktreeConfig(gitRoot)
  }

  if (!worktreeBranch) {
    return true
  }

  // Borra la rama temporal del worktree del repo principal.
  const { code: deleteBranchCode, stderr: deleteBranchError } = await execFileNoThrowWithCwd(
    gitExe(),
    ['branch', '-D', worktreeBranch],
    { cwd: gitRoot },
  )

  if (deleteBranchCode !== 0) {
    logForDebugging(`Could not delete agent worktree branch: ${deleteBranchError}`, {
      level: 'error',
    })
  }
  return true
}

/**
 * Patrones de slug para worktrees desechables creados por AgentTool
 * (`agent-a<7hex>`, de earlyAgentId.slice(0,8)), WorkflowTool
 * (`wf_<runId>-<idx>` donde runId es randomUUID().slice(0,12) = 8 hex +
 * `-` + 3 hex), y bridgeMain (`bridge-<safeFilenameId>`). Estos se filtran
 * cuando el proceso padre se mata (Ctrl+C, ESC, crash) antes de que su
 * limpieza en proceso corra. Los patrones de forma exacta evitan barrer
 * slugs nombrados por el usuario vía EnterWorktree como `wf-myfeature`.
 */
const EPHEMERAL_WORKTREE_PATTERNS = [
  /^agent-a[0-9a-f]{7}$/,
  /^wf_[0-9a-f]{8}-[0-9a-f]{3}-\d+$/,
  // Slugs wf-<idx> heredados de antes de la desambiguación por
  // workflowRunId — se conservan para que el barrido de 30 días siga
  // limpiando worktrees filtrados por builds más viejos.
  /^wf-\d+$/,
  // Los slugs reales de bridge son `bridge-${safeFilenameId(sessionId)}`.
  /^bridge-[A-Za-z0-9_]+(-[A-Za-z0-9_]+)*$/,
  // Worktrees de job de template: job-<templateName>-<8hex>. El prefijo
  // los distingue de slugs nombrados por el usuario vía EnterWorktree que
  // por casualidad terminan en 8 hex.
  /^job-[a-zA-Z0-9._-]{1,55}-[0-9a-f]{8}$/,
]

/**
 * Remueve worktrees de agente/workflow stale más viejos que cutoffDate.
 *
 * Seguridad:
 * - Sólo toca slugs que emparejan patrones efímeros (nunca worktrees
 *   nombrados por el usuario).
 * - Salta el worktree de la sesión actual.
 * - Fail-closed: se salta si `git status` falla o muestra cambios
 *   trackeados (-uno: archivos sin trackear en un worktree de agente
 *   crasheado de hace 30 días son artefactos de build; saltar el scan
 *   sin trackear es 5-10× más rápido en repos grandes).
 * - Fail-closed: se salta si algún commit no es alcanzable desde un
 *   remoto.
 *
 * `git worktree remove --force` maneja tanto el directorio como el
 * tracking interno de worktree de git. Si git no reconoce la ruta como
 * un worktree (directorio huérfano), se deja en su lugar — que un
 * readdir posterior lo encuentre stale otra vez es inofensivo.
 */
export async function cleanupStaleAgentWorktrees(cutoffDate: Date): Promise<number> {
  const gitRoot = findCanonicalGitRoot(getCwd())
  if (!gitRoot) {
    return 0
  }

  const dir = worktreesDir(gitRoot)
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return 0
  }

  const cutoffMs = cutoffDate.getTime()
  const currentPath = currentWorktreeSession?.worktreePath
  let removed = 0

  for (const slug of entries) {
    if (!EPHEMERAL_WORKTREE_PATTERNS.some(p => p.test(slug))) {
      continue
    }

    const worktreePath = join(dir, slug)
    if (currentPath === worktreePath) {
      continue
    }

    let mtimeMs: number
    try {
      mtimeMs = (await stat(worktreePath)).mtimeMs
    } catch {
      continue
    }
    if (mtimeMs >= cutoffMs) {
      continue
    }

    // Ambos chequeos deben tener éxito con salida vacía. Un exit distinto
    // de cero (worktree corrupto, git no lo reconoce, etc.) significa
    // saltar — no sabemos qué hay ahí dentro.
    const [status, unpushed] = await Promise.all([
      execFileNoThrowWithCwd(
        gitExe(),
        ['--no-optional-locks', 'status', '--porcelain', '-uno'],
        { cwd: worktreePath },
      ),
      execFileNoThrowWithCwd(
        gitExe(),
        ['rev-list', '--max-count=1', 'HEAD', '--not', '--remotes'],
        { cwd: worktreePath },
      ),
    ])
    if (status.code !== 0 || status.stdout.trim().length > 0) {
      continue
    }
    if (unpushed.code !== 0 || unpushed.stdout.trim().length > 0) {
      continue
    }

    if (await removeAgentWorktree(worktreePath, worktreeBranchName(slug), gitRoot)) {
      removed++
    }
  }

  if (removed > 0) {
    await execFileNoThrowWithCwd(gitExe(), ['worktree', 'prune'], { cwd: gitRoot })
    logForDebugging(`cleanupStaleAgentWorktrees: removed ${removed} stale worktree(s)`)
  }
  return removed
}

/**
 * Chequea si un worktree tiene cambios sin commitear o commits nuevos
 * desde su creación. Devuelve true si hay cambios sin commitear (working
 * tree sucio), si se hicieron commits en la rama del worktree desde
 * `headCommit`, o si los comandos git fallan — los llamadores usan esto
 * para decidir si remover un worktree, así que fail-closed.
 */
export async function hasWorktreeChanges(
  worktreePath: string,
  headCommit: string,
): Promise<boolean> {
  const { code: statusCode, stdout: statusOutput } = await execFileNoThrowWithCwd(
    gitExe(),
    ['status', '--porcelain'],
    { cwd: worktreePath },
  )
  if (statusCode !== 0) {
    return true
  }
  if (statusOutput.trim().length > 0) {
    return true
  }

  const { code: revListCode, stdout: revListOutput } = await execFileNoThrowWithCwd(
    gitExe(),
    ['rev-list', '--count', `${headCommit}..HEAD`],
    { cwd: worktreePath },
  )
  if (revListCode !== 0) {
    return true
  }
  if (parseInt(revListOutput.trim(), 10) > 0) {
    return true
  }

  return false
}

/**
 * Manejador de camino rápido para `--worktree --tmux`. Crea el worktree y
 * hace exec en tmux corriendo Claude adentro. Se llama temprano en
 * cli.tsx antes de cargar el CLI completo.
 */
export async function execIntoTmuxWorktree(args: string[]): Promise<{
  handled: boolean
  error?: string
}> {
  // Chequea la plataforma — tmux no funciona en Windows.
  if (process.platform === 'win32') {
    return { handled: false, error: 'Error: --tmux is not supported on Windows' }
  }

  // Chequea si tmux está disponible.
  const tmuxCheck = spawnSync('tmux', ['-V'], { encoding: 'utf-8' })
  if (tmuxCheck.status !== 0) {
    const installHint =
      process.platform === 'darwin'
        ? 'Install tmux with: brew install tmux'
        : 'Install tmux with: sudo apt install tmux'
    return { handled: false, error: `Error: tmux is not installed. ${installHint}` }
  }

  // Parsea el nombre de worktree y el modo tmux de los args.
  let worktreeName: string | undefined
  let forceClassicTmux = false
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (!arg) continue
    if (arg === '-w' || arg === '--worktree') {
      // Chequea si el siguiente arg existe y no es otra flag.
      const next = args[i + 1]
      if (next && !next.startsWith('-')) {
        worktreeName = next
      }
    } else if (arg.startsWith('--worktree=')) {
      worktreeName = arg.slice('--worktree='.length)
    } else if (arg === '--tmux=classic') {
      forceClassicTmux = true
    }
  }

  // Chequea si el nombre de worktree es una referencia de PR.
  let prNumber: number | null = null
  if (worktreeName) {
    prNumber = parsePRReference(worktreeName)
    if (prNumber !== null) {
      worktreeName = `pr-${prNumber}`
    }
  }

  // Genera un slug si no se dio nombre.
  if (!worktreeName) {
    const adjectives = ['swift', 'bright', 'calm', 'keen', 'bold']
    const nouns = ['fox', 'owl', 'elm', 'oak', 'ray']
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const suffix = Math.random().toString(36).slice(2, 6)
    worktreeName = `${adj}-${noun}-${suffix}`
  }

  // worktreeName se une en worktreeDir vía path.join más abajo; aplica la
  // misma lista blanca usada por la herramienta de worktree en sesión así
  // que la restricción se mantiene uniforme sin importar el punto de
  // entrada.
  try {
    validateWorktreeSlug(worktreeName)
  } catch (e) {
    return { handled: false, error: `Error: ${(e as Error).message}` }
  }

  // Refleja createWorktreeForSession(): el hook tiene precedencia sobre
  // git así que el hook WorktreeCreate sustituye el backend de VCS
  // también para este camino rápido. La rama de git de abajo sólo corre
  // sin hook.
  let worktreeDir: string
  let repoName: string
  if (hasWorktreeCreateHook()) {
    try {
      const hookResult = await executeWorktreeCreateHook(worktreeName)
      worktreeDir = hookResult.worktreePath
    } catch (error) {
      return { handled: false, error: `Error: ${errorMessage(error)}` }
    }
    repoName = basename(findCanonicalGitRoot(getCwd()) ?? getCwd())
    console.log(`Using worktree via hook: ${worktreeDir}`)
  } else {
    // Obtiene la raíz del repo git principal (resuelve a través de
    // worktrees).
    const repoRoot = findCanonicalGitRoot(getCwd())
    if (!repoRoot) {
      return { handled: false, error: 'Error: --worktree requires a git repository' }
    }

    repoName = basename(repoRoot)
    worktreeDir = worktreePathFor(repoRoot, worktreeName)

    // Crea o resume el worktree.
    try {
      const result = await getOrCreateWorktree(
        repoRoot,
        worktreeName,
        prNumber !== null ? { prNumber } : undefined,
      )
      if (!result.existed) {
        console.log(`Created worktree: ${worktreeDir} (based on ${result.baseBranch})`)
        await performPostCreationSetup(repoRoot, worktreeDir)
      }
    } catch (error) {
      return { handled: false, error: `Error: ${errorMessage(error)}` }
    }
  }

  // Saniza para el nombre de sesión tmux (reemplaza / y . con _).
  const tmuxSessionName = `${repoName}_${worktreeBranchName(worktreeName)}`.replace(
    /[/.]/g,
    '_',
  )

  // Construye nuevos args sin --tmux y --worktree (ya estamos en el
  // worktree).
  const newArgs: string[] = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (!arg) continue
    if (arg === '--tmux' || arg === '--tmux=classic') continue
    if (arg === '-w' || arg === '--worktree') {
      // Salta la flag y su valor si está presente.
      const next = args[i + 1]
      if (next && !next.startsWith('-')) {
        i++ // Salta el valor también.
      }
      continue
    }
    if (arg.startsWith('--worktree=')) continue
    newArgs.push(arg)
  }

  // Obtiene el prefijo tmux para guía del usuario.
  let tmuxPrefix = 'C-b' // por defecto.
  const prefixResult = spawnSync('tmux', ['show-options', '-g', 'prefix'], {
    encoding: 'utf-8',
  })
  if (prefixResult.status === 0 && prefixResult.stdout) {
    const match = prefixResult.stdout.match(/prefix\s+(\S+)/)
    if (match?.[1]) {
      tmuxPrefix = match[1]
    }
  }

  // Chequea si el prefijo tmux entra en conflicto con los keybindings de
  // Claude. Claude enlaza: ctrl+b (task:background), ctrl+c, ctrl+d,
  // ctrl+t, ctrl+o, ctrl+r, ctrl+s, ctrl+g, ctrl+e.
  const claudeBindings = ['C-b', 'C-c', 'C-d', 'C-t', 'C-o', 'C-r', 'C-s', 'C-g', 'C-e']
  const prefixConflicts = claudeBindings.includes(tmuxPrefix)

  // Fija variables de entorno para que el Claude interno muestre info de
  // tmux en el mensaje de bienvenida.
  const tmuxEnv = {
    ...process.env,
    CLAUDE_CODE_TMUX_SESSION: tmuxSessionName,
    CLAUDE_CODE_TMUX_PREFIX: tmuxPrefix,
    CLAUDE_CODE_TMUX_PREFIX_CONFLICTS: prefixConflicts ? '1' : '',
  }

  // Chequea si la sesión ya existe.
  const hasSessionResult = spawnSync('tmux', ['has-session', '-t', tmuxSessionName], {
    encoding: 'utf-8',
  })
  const sessionExists = hasSessionResult.status === 0

  // Chequea si ya estamos dentro de una sesión tmux.
  const isAlreadyInTmux = Boolean(process.env.TMUX)

  // Usa el modo de control de tmux (-CC) para integración nativa de
  // tabs/panes de iTerm2. Esto deja a los usuarios usar la UI de iTerm2 en
  // vez de aprender keybindings de tmux. Usar --tmux=classic para forzar
  // tmux tradicional incluso en iTerm2. El modo de control no tiene
  // sentido cuando ya se está en tmux (necesitaría switch-client).
  const useControlMode = isInITerm2() && !forceClassicTmux && !isAlreadyInTmux
  const tmuxGlobalArgs = useControlMode ? ['-CC'] : []

  // Imprime un hint sobre las preferencias de iTerm2 cuando se usa el
  // modo de control.
  if (useControlMode && !sessionExists) {
    const y = chalk.yellow
    console.log(
      `\n${y('╭─ iTerm2 Tip ────────────────────────────────────────────────────────╮')}\n` +
        `${y('│')} To open as a tab instead of a new window:                           ${y('│')}\n` +
        `${y('│')} iTerm2 > Settings > General > tmux > "Tabs in attaching window"     ${y('│')}\n` +
        `${y('╰─────────────────────────────────────────────────────────────────────╯')}\n`,
    )
  }

  // Para ants en claude-cli-internal, monta panes de desarrollo (watch +
  // start).
  const isAnt = process.env.USER_TYPE === 'ant'
  const isClaudeCliInternal = repoName === 'claude-cli-internal'
  const shouldSetupDevPanes = isAnt && isClaudeCliInternal && !sessionExists

  if (shouldSetupDevPanes) {
    // Crea sesión desacoplada con Claude en el primer pane.
    spawnSync(
      'tmux',
      [
        'new-session',
        '-d', // desacoplado.
        '-s',
        tmuxSessionName,
        '-c',
        worktreeDir,
        '--',
        process.execPath,
        ...newArgs,
      ],
      { cwd: worktreeDir, env: tmuxEnv },
    )

    // Divide horizontalmente y corre watch.
    spawnSync('tmux', ['split-window', '-h', '-t', tmuxSessionName, '-c', worktreeDir], {
      cwd: worktreeDir,
    })
    spawnSync('tmux', ['send-keys', '-t', tmuxSessionName, 'bun run watch', 'Enter'], {
      cwd: worktreeDir,
    })

    // Divide verticalmente y corre start.
    spawnSync('tmux', ['split-window', '-v', '-t', tmuxSessionName, '-c', worktreeDir], {
      cwd: worktreeDir,
    })
    spawnSync('tmux', ['send-keys', '-t', tmuxSessionName, 'bun run start'], {
      cwd: worktreeDir,
    })

    // Selecciona el primer pane (Claude).
    spawnSync('tmux', ['select-pane', '-t', `${tmuxSessionName}:0.0`], { cwd: worktreeDir })

    // Adjunta o cambia a la sesión.
    if (isAlreadyInTmux) {
      // Cambia a la sesión hermana (evita anidar).
      spawnSync('tmux', ['switch-client', '-t', tmuxSessionName], { stdio: 'inherit' })
    } else {
      // Se adjunta a la sesión.
      spawnSync('tmux', [...tmuxGlobalArgs, 'attach-session', '-t', tmuxSessionName], {
        stdio: 'inherit',
        cwd: worktreeDir,
      })
    }
  } else {
    // Comportamiento estándar: crear o adjuntar.
    if (isAlreadyInTmux) {
      // Ya en tmux — crea sesión desacoplada, luego cambia a ella
      // (hermana). Chequea primero si la sesión ya existe.
      if (sessionExists) {
        // Sólo cambia a la sesión existente.
        spawnSync('tmux', ['switch-client', '-t', tmuxSessionName], { stdio: 'inherit' })
      } else {
        // Crea sesión desacoplada nueva.
        spawnSync(
          'tmux',
          [
            'new-session',
            '-d', // desacoplado.
            '-s',
            tmuxSessionName,
            '-c',
            worktreeDir,
            '--',
            process.execPath,
            ...newArgs,
          ],
          { cwd: worktreeDir, env: tmuxEnv },
        )

        // Cambia a la sesión nueva.
        spawnSync('tmux', ['switch-client', '-t', tmuxSessionName], { stdio: 'inherit' })
      }
    } else {
      // No en tmux — crea y adjunta (comportamiento original).
      const tmuxArgs = [
        ...tmuxGlobalArgs,
        'new-session',
        '-A', // Adjunta si existe, crea si no.
        '-s',
        tmuxSessionName,
        '-c',
        worktreeDir,
        '--', // Separador antes del comando.
        process.execPath,
        ...newArgs,
      ]

      spawnSync('tmux', tmuxArgs, { stdio: 'inherit', cwd: worktreeDir, env: tmuxEnv })
    }
  }

  return { handled: true }
}
