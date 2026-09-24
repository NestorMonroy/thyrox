/**
 * Las rutas propias de la sesión: cuáles se escriben o se leen sin
 * preguntar (el plan, el scratchpad, la memoria, los resultados de
 * herramientas…) y cuáles son almacenes que nunca se escriben directamente
 * (credenciales del anfitrión, `seed-admin`, el almacén de perfiles de
 * Anthropic, la revisión de settings, `adopt.json`).
 *
 * Reimplementación del contrato de 2.1.275 (`chunk-9apg35nm.js`), no copia:
 *
 *   `checkEditableInternalPath` ≙ `yyt` · `checkReadableInternalPath` ≙ `hee`
 *   · `checkEachPath` ≙ `Hs` · `getProfileStoreDenyPaths` ≙ `p3t`/`Qe`
 *   (`chunk-8syy9k0k.js`) · `getBundledSkillsRoot` ≙ `w_n`.
 *
 * Divergencias declaradas:
 *
 * - Este árbol no tiene `/pause-memory` ni el indicador de sesión que lo
 *   guarda (`Kh`), así que la memoria nunca está en pausa: las dos ramas
 *   que la bloquean no pueden dispararse. No es abrir de más — la pausa no
 *   se puede activar.
 * - El documento de taller del plan (`<slug>.workshop.md`) exige que el
 *   taller esté disponible (`Ji.isAvailable()`); este árbol no lo tiene y
 *   la rama queda cerrada.
 * - Los archivos de guion de los workflows (`Tu`) y el `launch.json` de la
 *   vista previa se permiten igual que en el binario, aunque este árbol no
 *   produzca ninguno de los dos.
 * - La fuente de la memoria automática (`Crr`/`pGt`, para decidir si con
 *   lecturas fuera bloqueadas sigue legible) no existe aquí: se trata como
 *   declarada por el proyecto, que es la rama estricta — con lecturas fuera
 *   bloqueadas, la memoria automática no se abre sola.
 */
import { randomBytes } from 'node:crypto'
import * as nodeFs from 'node:fs'
import { homedir } from 'node:os'
import * as nodePath from 'node:path'
import { getPlatform } from '@thyrox/config/platform.js'
import { getPathsForPermissionCheck } from '@thyrox/storage/fsOperations.js'
import { getPermissionHostBindings } from './host.js'
import { SENSITIVE_FILES, automountRoot, comparableSegment, isUncPath } from './pathSafety.js'
import { foldPathCase, trustedSpellingOf } from './ruleMatching.js'

export type SafetyDecisionReason = {
  type: 'safetyCheck'
  reason: string
  classifierApprovable: boolean
  circuitBreaker?: 'claudeSettingsFile'
}

export type InternalPathDecision =
  | { behavior: 'allow'; updatedInput: unknown; decisionReason: { type: 'other'; reason: string } }
  | { behavior: 'deny'; message: string; decisionReason: SafetyDecisionReason }
  | { behavior: 'passthrough'; message: string }

const SEP = nodePath.sep
const PASSTHROUGH: InternalPathDecision = { behavior: 'passthrough', message: '' }
const MEMORY_PAUSED_REASON = 'memory access blocked by /pause-memory'
const AUTO_MEMORY_WRITE_REASON = 'auto memory files are allowed for writing'

/** Segmentos que una ruta de la sesión no puede cruzar (≙ `USt`). */
const SESSION_PATH_FORBIDDEN_SEGMENTS = new Set([
  '.git', 'hooks', '.husky', '.githooks', 'node_modules', '.vscode', '.idea', 'head', 'config',
  'objects', 'refs', '.claude', 'skills', 'commands', 'agents', '.cargo', '.devcontainer', '.yarn', '.mvn',
])
const SENSITIVE_FILE_NAMES = new Set(SENSITIVE_FILES.map(f => f.toLowerCase()))

// ---- Decisiones fijas (≙ `Vr`, `Kr`, `Ur`, `Hr`, `Fs`, `$s`) ----

export const HOST_CREDENTIALS_DENIED: InternalPathDecision = {
  behavior: 'deny',
  message: 'The host credentials file is managed by the host process; it cannot be written directly',
  decisionReason: { type: 'safetyCheck', reason: 'host-creds file rewrite redirects the bearer token', classifierApprovable: false },
}
export const SEED_ADMIN_DENIED: InternalPathDecision = {
  behavior: 'deny',
  message:
    '~/.claude/seed-admin holds the private git directories of cloud-session uploads and is managed by Claude Code; it cannot be written directly',
  decisionReason: {
    type: 'safetyCheck',
    reason: 'seed-admin git configuration is a code-execution surface for the upload',
    classifierApprovable: false,
  },
}
export const PROFILE_STORE_DENIED: InternalPathDecision = {
  behavior: 'deny',
  message:
    'The Anthropic profile store holds the sign-in that decides which organization policy applies; it cannot be written directly',
  decisionReason: {
    type: 'safetyCheck',
    reason: 'profile store write substitutes the credential and organization behind managed settings',
    classifierApprovable: false,
  },
}
export const SETTINGS_REVIEW_DENIED: InternalPathDecision = {
  behavior: 'deny',
  message:
    'Staged Claude Code settings changes are the owner’s to review in /settings-review; the review store cannot be written directly',
  decisionReason: {
    type: 'safetyCheck',
    reason: 'settings review store write substitutes a proposal the owner is about to accept',
    classifierApprovable: false,
    circuitBreaker: 'claudeSettingsFile',
  },
}
export const ADOPT_JSON_DENIED: InternalPathDecision = {
  behavior: 'deny',
  message: 'adopt.json is the bg-fork handoff carrier and is managed by the harness; it cannot be written directly',
  decisionReason: { type: 'safetyCheck', reason: 'adopt.json is a code-execution surface for the fork', classifierApprovable: false },
}

function allowed(input: unknown, reason: string): InternalPathDecision {
  return { behavior: 'allow', updatedInput: input, decisionReason: { type: 'other', reason } }
}

// ---- Entorno (diferido: estos paquetes cargan el estado de la sesión) ----

function load<T>(specifier: string): T | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(specifier) as T
  } catch {
    return undefined
  }
}

type SessionState = {
  getOriginalCwd: () => string
  getSessionId: () => string
  getProjectRoot?: () => string
  getPlanSlugCache: () => Map<string, string>
}

function state(): SessionState | undefined {
  return load<SessionState>('@thyrox/app-host/bootstrap/state.js')
}

function originalCwd(): string {
  return state()?.getOriginalCwd() ?? process.cwd()
}

function currentCwd(): string {
  return load<{ getCwd: () => string }>('@thyrox/app-host/bootstrap/cwd.js')?.getCwd() ?? originalCwd()
}

function sessionId(): string {
  return state()?.getSessionId() ?? 'unknown'
}

function projectRoot(): string {
  try {
    return state()?.getProjectRoot?.() ?? originalCwd()
  } catch {
    return originalCwd()
  }
}

function claudeConfigHome(): string {
  return (
    load<{ getClaudeConfigHomeDir: () => string }>('@thyrox/config/env/utils.js')?.getClaudeConfigHomeDir() ??
    nodePath.join(homedir(), '.claude').normalize('NFC')
  )
}

/** La raíz de la memoria remota, o el directorio de configuración (≙ `r2`). */
function memoryRoot(): string {
  return process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR || claudeConfigHome()
}

function projectStorageDir(cwd: string): string {
  const portable = load<{ getProjectDir: (p: string) => string }>('@thyrox/storage/sessionStoragePortable.js')
  return portable?.getProjectDir(cwd) ?? nodePath.join(claudeConfigHome(), 'projects', cwd.replace(/[^a-zA-Z0-9]/g, '-'))
}

function toolResultsDir(): string {
  return nodePath.join(projectStorageDir(originalCwd()), sessionId(), 'tool-results')
}

function workflowScriptsDir(): string {
  return nodePath.join(projectStorageDir(currentCwd()), sessionId(), 'workflows', 'scripts') + SEP
}

type FilesystemHelpers = {
  isScratchpadEnabled: () => boolean
  getScratchpadDir: () => string
  getProjectTempDir: () => string
  getClaudeTempDir: () => string
}

function filesystem(): FilesystemHelpers | undefined {
  return load<FilesystemHelpers>('./filesystem.js')
}

function plansDirectory(): string | undefined {
  return load<{ getPlansDirectory: () => string }>('@thyrox/storage/plans.js')?.getPlansDirectory()
}

// ---- Caché de proceso ----

let profileStoreDenyPaths: { filled: true; value: ProfileStoreDenyPaths | null } | undefined
let bundledSkillsRoot: string | undefined
const workingDirSpellings = new Map<string, string[]>()

export function resetInternalPathCachesForTesting(): void {
  profileStoreDenyPaths = undefined
  bundledSkillsRoot = undefined
  workingDirSpellings.clear()
}

// ---- Primitivas ----

function normalized(path: string): string {
  return nodePath.normalize(path)
}

/** ¿Cruza el resto de `path` bajo `prefix` un segmento prohibido? (≙ `tq`). */
function crossesForbiddenSegment(path: string, prefix: string, lastSegmentNames?: Set<string>): boolean {
  const rest = path.slice(prefix.length).split(/[\\/]+/)
  const last = rest.length - 1
  for (let i = 0; i < rest.length; i++) {
    const segment = comparableSegment(rest[i]!)
    if (SESSION_PATH_FORBIDDEN_SEGMENTS.has(segment)) return true
    if (i === last && lastSegmentNames?.has(segment)) return true
  }
  return false
}

function isAtOrUnder(path: string, dirWithSep: string): boolean {
  return path === dirWithSep.slice(0, -1) || path.startsWith(dirWithSep)
}

/** Las grafías resueltas de un directorio de trabajo (≙ `qge`). */
function resolvedSpellings(dir: string): string[] {
  const hit = workingDirSpellings.get(dir)
  if (hit !== undefined) return hit
  const spellings = process.env.CLAUDE_CODE_EVAL_CONFINED && dir === originalCwd() ? [dir] : getPathsForPermissionCheck(dir)
  workingDirSpellings.set(dir, spellings)
  return spellings
}

/**
 * La ruta reescrita con la grafía de la raíz de la sesión que la contiene,
 * si la ruta llegó por el destino real de un enlace (≙ `A_n`).
 */
function sessionSpellingOf(path: string): string {
  for (const dir of [currentCwd(), originalCwd(), projectRoot(), claudeConfigHome(), memoryRoot(), homedir()]) {
    for (const spelled of resolvedSpellings(dir)) {
      if (spelled === dir) continue
      if (path === spelled || path.startsWith(spelled + SEP)) return dir + path.slice(spelled.length)
    }
  }
  return trustedSpellingOf(path)
}

/**
 * Aplica `check` a cada ruta: una denegación gana, todas tienen que estar
 * permitidas para permitir, y si alguna pasa de largo se prueba antes con la
 * grafía de la sesión (≙ `Hs`).
 */
function checkEachPath(
  paths: readonly string[],
  check: (path: string, input: unknown) => InternalPathDecision,
  input: unknown,
): InternalPathDecision {
  let first: InternalPathDecision | undefined
  for (const path of paths) {
    let decision = check(path, input)
    if (decision.behavior === 'passthrough') {
      const spelled = sessionSpellingOf(path)
      if (spelled !== path) decision = check(spelled, input)
    }
    if (decision.behavior === 'deny') return decision
    if (decision.behavior !== 'allow') return PASSTHROUGH
    first ??= decision
  }
  return first ?? PASSTHROUGH
}

// ---- Predicados de rutas propias ----

/** El plan de esta sesión o de uno de sus agentes (≙ `Ds`). */
function isSessionPlanFile(path: string, options?: { includeWorkshopDoc?: boolean }): boolean {
  const slug = state()?.getPlanSlugCache().get(sessionId())
  if (!slug) return false
  const plans = plansDirectory()
  if (plans === undefined) return false
  const file = normalized(path)
  if (nodePath.dirname(file) !== normalized(plans)) return false
  const name = nodePath.basename(file)
  void options
  return name === `${slug}.md` || (name.startsWith(`${slug}-agent-`) && name.endsWith('.md'))
}

function isWorkflowScript(path: string): boolean {
  const file = normalized(path)
  return file.startsWith(workflowScriptsDir()) && file.endsWith('.js')
}

/** Dentro del scratchpad de la sesión, sin cruzar segmentos prohibidos (≙ `Rj`). */
function isSessionScratchpadPath(path: string): boolean {
  const fs = filesystem()
  if (!fs || !fs.isScratchpadEnabled()) return false
  let dir: string
  try {
    dir = foldPathCase(fs.getScratchpadDir())
  } catch {
    return false
  }
  const file = foldPathCase(normalized(path))
  return file === dir || (file.startsWith(dir + SEP) && !crossesForbiddenSegment(file, dir + SEP, SENSITIVE_FILE_NAMES))
}

/** Dentro del `tmp/` del trabajo en segundo plano actual (≙ `js`). */
function isBackgroundJobTmpPath(path: string): boolean {
  if (process.env.CLAUDE_CODE_SESSION_KIND !== 'bg') return false
  const jobDir = process.env.CLAUDE_JOB_DIR
  if (!jobDir) return false
  const jobsRoot = nodePath.join(claudeConfigHome(), 'jobs') + SEP
  const job = normalized(jobDir)
  if (!job.startsWith(jobsRoot)) return false
  const tmp = job + SEP + 'tmp' + SEP
  if (!foldPathCase(path).startsWith(foldPathCase(tmp))) return false
  return !crossesForbiddenSegment(path, tmp, SENSITIVE_FILE_NAMES)
}

/** La raíz de memoria de agente que contiene la ruta (≙ `dc`). */
function agentMemoryRoot(path: string): string | null {
  const shared = nodePath.join(memoryRoot(), 'agent-memory') + SEP
  if (path.startsWith(shared)) return shared
  const project = nodePath.join(currentCwd(), '.claude', 'agent-memory') + SEP
  if (path.startsWith(project)) return project
  if (process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR) {
    const remote = nodePath.join(process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR, 'projects') + SEP
    if (path.includes(SEP + 'agent-memory-local' + SEP) && path.startsWith(remote)) return remote
    return null
  }
  const local = nodePath.join(currentCwd(), '.claude', 'agent-memory-local') + SEP
  return path.startsWith(local) ? local : null
}

/** Un archivo de memoria de agente (≙ `PYe`). */
function isAgentMemoryFile(path: string): boolean {
  const file = normalized(path)
  const root = agentMemoryRoot(file)
  return root !== null && !crossesForbiddenSegment(file, root)
}

/** Una raíz que no puede ser directorio de memoria: relativa, corta, de red (≙ `kB`). */
function isUnusableMemoryRoot(root: string): boolean {
  return (
    !nodePath.isAbsolute(root) ||
    root.length < 3 ||
    /^[A-Za-z]:$/.test(root) ||
    isUncPath(root) ||
    automountRoot(root) !== null ||
    root.includes('\x00')
  )
}

function autoMemoryDir(): string | undefined {
  try {
    return load<{ getAutoMemPath: () => string }>('@thyrox/memory/paths')?.getAutoMemPath()
  } catch {
    return undefined
  }
}

/**
 * Un archivo bajo el directorio de memoria automática, sin cruzar un
 * segmento prohibido; la raíz tiene que terminar en separador y ser una
 * ruta local utilizable (≙ `nq`).
 */
function isAutoMemoryFile(path: string, root: string | undefined = autoMemoryDir()): boolean {
  if (root === undefined || !root.endsWith(SEP) || isUnusableMemoryRoot(root.replace(/[/\\]+$/, ''))) return false
  const file = normalized(path)
  if (!file.startsWith(root)) return false
  return !crossesForbiddenSegment(file, root)
}

/** La memoria de Cowork redirigida por variable (≙ `sle`). */
function hasCoworkMemoryOverride(): boolean {
  return Boolean(process.env.CLAUDE_COWORK_MEMORY_PATH_OVERRIDE)
}

/** El directorio de almacenamiento de este proyecto (≙ `Ou`). */
function isProjectStoragePath(path: string, cwd: string = currentCwd()): boolean {
  const dir = projectStorageDir(cwd)
  const file = normalized(path)
  return file === dir || file.startsWith(dir + SEP)
}

/** La raíz aleatoria donde se extraen las skills empaquetadas (≙ `w_n`). */
export function getBundledSkillsRoot(): string {
  if (bundledSkillsRoot !== undefined) return bundledSkillsRoot
  const temp = filesystem()?.getClaudeTempDir() ?? nodePath.join('/tmp', 'claude')
  const version = process.env.THYROX_VERSION ?? '0.0.0'
  bundledSkillsRoot = nodePath.join(temp, 'bundled-skills', version, randomBytes(16).toString('hex'))
  return bundledSkillsRoot
}

// ---- Almacenes protegidos ----

/** El archivo de credenciales que el anfitrión declara (≙ `Gr`). */
export function isHostCredentialsFile(path: string): boolean {
  const declared = process.env.CLAUDE_CODE_HOST_CREDS_FILE
  if (!declared) return false
  const trimmed = declared.replace(getPlatform() === 'windows' ? /[\\/]+$/ : /\/+$/, '') || declared
  const target = foldPathCase(normalized(path))
  return getPathsForPermissionCheck(trimmed).some(p => foldPathCase(normalized(p)) === target)
}

function comparableSessionPath(path: string): string {
  return normalized(path).split(SEP).map(comparableSegment).join(SEP)
}

/** Las grafías de `<config>/seed-admin` (≙ `Du`). */
function seedAdminDirectories(configHome: string): string[] {
  const dirs = [comparableSessionPath(nodePath.join(configHome, 'seed-admin'))]
  try {
    dirs.push(comparableSessionPath(nodePath.join(nodeFs.realpathSync(configHome), 'seed-admin')))
  } catch {
    // el directorio de configuración aún no existe
  }
  return Array.from(new Set(dirs))
}

/** Bajo `seed-admin` (≙ `Wr`). */
export function isSeedAdminPath(path: string): boolean {
  const target = comparableSessionPath(path)
  return seedAdminDirectories(claudeConfigHome()).some(dir => target === dir || target.startsWith(dir + SEP))
}

/** El almacén de revisión de settings (≙ `zr`). */
export function isSettingsReviewStore(path: string): boolean {
  const target = comparableSessionPath(path)
  const stateDir = nodePath.join(homedir(), '.claude', 'state')
  return [stateDir, nodePath.join(stateDir, 'settings-review.json')].some(p =>
    getPathsForPermissionCheck(p).some(spelled => comparableSessionPath(spelled) === target),
  )
}

/** `<config>/jobs/<id>/adopt.json*` (≙ `Ls`). */
export function isJobAdoptFile(path: string): boolean {
  const target = foldPathCase(normalized(path))
  const jobs = foldPathCase(nodePath.join(claudeConfigHome(), 'jobs') + SEP)
  if (!target.startsWith(jobs)) return false
  const rest = target.slice(jobs.length).split(SEP)
  return rest.length === 2 && rest[1]!.startsWith('adopt.json')
}

export type ProfileStoreDenyPaths = { dirs: string[]; files: string[] }

/** La raíz del almacén de perfiles de Anthropic (≙ `ue`). */
function profileStoreRoot(): string | null {
  const configured = process.env.ANTHROPIC_CONFIG_DIR?.trim()
  if (configured) return configured
  const xdg = process.env.XDG_CONFIG_HOME?.trim()
  if (xdg) return nodePath.join(xdg, 'anthropic')
  const home = process.env.HOME?.trim()
  return home ? nodePath.join(home, '.config', 'anthropic') : null
}

/** El real del ancestro existente más profundo, en minúsculas (≙ `ne`). */
function realDeepestAncestorFolded(path: string): string {
  let dir = nodePath.resolve(path)
  let tail = ''
  for (;;) {
    try {
      dir = nodePath.join(nodeFs.realpathSync.native(dir), tail)
      break
    } catch {
      const parent = nodePath.dirname(dir)
      if (parent === dir) {
        dir = nodePath.join(dir, tail)
        break
      }
      tail = tail ? nodePath.join(nodePath.basename(dir), tail) : nodePath.basename(dir)
      dir = parent
    }
  }
  return dir.toLowerCase()
}

/**
 * ¿Es la raíz tan amplia que denegarla entera bloquearía el trabajo? La
 * raíz del sistema, o una que contiene el directorio actual (≙ `oe`).
 */
function isOverlyBroadRoot(path: string): boolean {
  const real = realDeepestAncestorFolded(path)
  if (real === nodePath.parse(real).root) return true
  const relative = nodePath.relative(real, realDeepestAncestorFolded(process.cwd()))
  const head = relative.split(SEP)[0]
  return relative === '' || (head !== '..' && !nodePath.isAbsolute(relative))
}

function readFileOrNull(path: string): string | null {
  try {
    return nodeFs.readFileSync(path, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

function isDirectory(path: string): boolean {
  try {
    return nodeFs.statSync(path).isDirectory()
  } catch {
    return false
  }
}

/** El perfil activo: la variable, `active_config`, o `default` (≙ `Bor`). */
function activeProfile(root: string): string {
  return process.env.ANTHROPIC_PROFILE?.trim() || readFileOrNull(nodePath.join(root, 'active_config'))?.trim() || 'default'
}

/** La ruta de credenciales de un perfil (≙ `B`). */
function credentialsPathFor(root: string, profile: string): string {
  let config: { authentication?: { credentials_path?: string } } | undefined
  const raw = readFileOrNull(nodePath.join(root, 'configs', `${profile}.json`))
  if (raw !== null) {
    try {
      config = JSON.parse(raw)
    } catch {
      // un JSON roto no declara ruta
    }
  }
  return config?.authentication?.credentials_path ?? nodePath.join(root, 'credentials', `${profile}.json`)
}

function resolveProfileStoreDenyPaths(): { value: ProfileStoreDenyPaths | null; complete: boolean } {
  const root = profileStoreRoot()
  if (root === null) return { value: null, complete: true }
  let base: ProfileStoreDenyPaths = { dirs: [root], files: [] }
  try {
    const resolved = nodePath.resolve(root)
    base = isOverlyBroadRoot(resolved)
      ? {
          dirs: [nodePath.join(resolved, 'configs'), nodePath.join(resolved, 'credentials')],
          files: [nodePath.join(resolved, 'active_config')],
        }
      : { dirs: [resolved], files: [] }
    const credentials = credentialsPathFor(root, activeProfile(root))
    if (typeof credentials !== 'string' || !credentials.trim()) return { value: base, complete: true }
    const candidates = Array.from(
      new Set(
        nodePath.isAbsolute(credentials)
          ? [nodePath.resolve(credentials)]
          : [nodePath.resolve(resolved, credentials), nodePath.resolve(credentials)],
      ),
    ).filter(
      p =>
        !base.dirs.some(dir => p === dir || p.startsWith(dir + SEP)) && !base.files.includes(p) && !isOverlyBroadRoot(p),
    )
    return { value: { dirs: base.dirs, files: [...base.files, ...candidates.filter(p => !isDirectory(p))] }, complete: true }
  } catch (error) {
    try {
      getPermissionHostBindings().logDebug?.(
        `WIF profile store: could not resolve the active profile's credentials path (${String(error)}); denying the store root only`,
        { level: 'warn' },
      )
    } catch {
      // sin anfitrión no hay a quién avisar
    }
    return { value: base, complete: false }
  }
}

/** Qué del almacén de perfiles no se escribe nunca; se cachea si se resolvió entero (≙ `p3t`). */
export function getProfileStoreDenyPaths(): ProfileStoreDenyPaths | null {
  if (profileStoreDenyPaths !== undefined) return profileStoreDenyPaths.value
  const { value, complete } = resolveProfileStoreDenyPaths()
  if (complete) profileStoreDenyPaths = { filled: true, value }
  return value
}

/** Dentro del almacén de perfiles (≙ `Br`). */
export function isProfileStorePath(path: string): boolean {
  const deny = getProfileStoreDenyPaths()
  if (deny === null) return false
  const target = foldPathCase(normalized(path))
  if (
    deny.dirs.some(dir => {
      const folded = foldPathCase(normalized(dir))
      return target === folded || target.startsWith(folded + SEP)
    })
  ) {
    return true
  }
  return deny.files.some(file => getPathsForPermissionCheck(file).some(p => foldPathCase(normalized(p)) === target))
}

// ---- Las dos guardas ----

export type EditableInternalPathOptions = { permissionMode?: string; restricted?: boolean }

/**
 * ¿Es una ruta propia de la sesión que se puede escribir sin preguntar, o
 * un almacén que no se escribe nunca? `passthrough` deja la decisión al
 * resto de la cadena (≙ `yyt`).
 */
export function checkEditableInternalPath(
  path: string,
  input: unknown,
  pathsToCheck?: readonly string[],
  options?: EditableInternalPathOptions,
): InternalPathDecision {
  if (pathsToCheck && pathsToCheck.length > 0) {
    if (pathsToCheck.some(isHostCredentialsFile)) return HOST_CREDENTIALS_DENIED
    if (pathsToCheck.some(isSeedAdminPath)) return SEED_ADMIN_DENIED
    if (pathsToCheck.some(isProfileStorePath)) return PROFILE_STORE_DENIED
    if (pathsToCheck.some(isSettingsReviewStore)) return SETTINGS_REVIEW_DENIED
    return checkEachPath(pathsToCheck, (p, i) => checkEditableInternalPath(p, i, undefined, options), input)
  }
  const file = normalized(path)
  if (isSessionPlanFile(file, { includeWorkshopDoc: options?.permissionMode === 'plan' })) {
    return allowed(input, 'Plan files for current session are allowed for writing')
  }
  if (!options?.restricted && isWorkflowScript(file)) {
    return allowed(input, 'Workflow script files for current session are allowed for writing')
  }
  if (isSessionScratchpadPath(file)) return allowed(input, 'Scratchpad files for current session are allowed for writing')
  if (isBackgroundJobTmpPath(file)) return allowed(input, 'Job tmp/ subtree for current bg session is allowed for writing')
  if (!options?.restricted && file.endsWith('.md') && isAgentMemoryFile(file)) {
    return allowed(input, 'Agent memory files are allowed for writing')
  }
  if (!options?.restricted && !hasCoworkMemoryOverride() && file.endsWith('.md') && isAutoMemoryFile(file)) {
    return allowed(input, AUTO_MEMORY_WRITE_REASON)
  }
  if (!options?.restricted && file === nodePath.join(originalCwd(), '.claude', 'launch.json')) {
    return allowed(input, 'Preview launch config is allowed for writing')
  }
  if (isJobAdoptFile(file)) return ADOPT_JSON_DENIED
  if (isSeedAdminPath(file)) return SEED_ADMIN_DENIED
  if (isHostCredentialsFile(file)) return HOST_CREDENTIALS_DENIED
  if (isProfileStorePath(file)) return PROFILE_STORE_DENIED
  if (isSettingsReviewStore(file)) return SETTINGS_REVIEW_DENIED
  return PASSTHROUGH
}

export type ReadableInternalPathOptions = {
  restricted?: boolean
  blockOutsideReads?: boolean
  readBlockFence?: boolean
  remoteSurface?: boolean
}

/** ¿Es una ruta propia de la sesión que se puede leer sin preguntar? (≙ `hee`). */
export function checkReadableInternalPath(
  path: string,
  input: unknown,
  pathsToCheck?: readonly string[],
  options?: ReadableInternalPathOptions,
): InternalPathDecision {
  if (pathsToCheck && pathsToCheck.length > 0) {
    return checkEachPath(pathsToCheck, (p, i) => checkReadableInternalPath(p, i, undefined, options), input)
  }
  const file = normalized(path)
  if (!options?.restricted && isProjectStoragePath(file, options?.blockOutsideReads ? originalCwd() : undefined)) {
    return allowed(input, 'Project directory files are allowed for reading')
  }
  if (isSessionPlanFile(file, { includeWorkshopDoc: true })) {
    return allowed(input, 'Plan files for current session are allowed for reading')
  }
  const results = toolResultsDir()
  const resultsWithSep = results.endsWith(SEP) ? results : results + SEP
  if (file === results || file.startsWith(resultsWithSep)) return allowed(input, 'Tool result files are allowed for reading')
  if (isSessionScratchpadPath(file)) return allowed(input, 'Scratchpad files for current session are allowed for reading')
  if (isBackgroundJobTmpPath(file)) return allowed(input, 'Job tmp/ subtree for current bg session is allowed for reading')
  const projectTemp = filesystem()?.getProjectTempDir()
  if (projectTemp !== undefined && file.startsWith(projectTemp)) {
    return allowed(input, 'Project temp directory files are allowed for reading')
  }
  const remoteOrRestricted = options?.remoteSurface || options?.restricted
  const fenced = remoteOrRestricted || options?.blockOutsideReads
  if (!fenced && isAgentMemoryFile(file)) return allowed(input, 'Agent memory files are allowed for reading')
  if (!remoteOrRestricted && isAutoMemoryFile(file) && !options?.blockOutsideReads) {
    return allowed(input, 'auto memory files are allowed for reading')
  }
  const tasks = nodePath.join(claudeConfigHome(), 'tasks') + SEP
  if (!fenced && isAtOrUnder(file, tasks)) return allowed(input, 'Task files are allowed for reading')
  const teams = nodePath.join(claudeConfigHome(), 'teams') + SEP
  if (!fenced && isAtOrUnder(file, teams)) return allowed(input, 'Team files are allowed for reading')
  if (options?.readBlockFence && !options.restricted) {
    if (file === nodePath.join(claudeConfigHome(), 'CLAUDE.md')) return allowed(input, 'The user memory file is allowed for reading')
    for (const kind of ['skills', 'plugins', 'rules', 'agents', 'commands']) {
      if (isAtOrUnder(file, nodePath.join(claudeConfigHome(), kind) + SEP)) {
        return allowed(input, `User ${kind} files are allowed for reading`)
      }
    }
  }
  if (!options?.remoteSurface && file.startsWith(getBundledSkillsRoot() + SEP)) {
    return allowed(input, 'Bundled skill reference files are allowed for reading')
  }
  return PASSTHROUGH
}

export { MEMORY_PAUSED_REASON }
