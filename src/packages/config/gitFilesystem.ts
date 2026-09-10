/**
 * Puerto de `ccnmt: packages/config/gitFilesystem.ts` (699 líneas fuente).
 * Lectura del estado de git desde el filesystem — evita generar
 * subprocesos `git`. Cubre: resolución del directorio `.git` (incluidos
 * worktrees/submódulos), parseo de HEAD, resolución de refs vía archivos
 * sueltos y `packed-refs`, y el `GitFileWatcher` que cachea rama/SHA con
 * `fs.watchFile`. Reimplementación fiel — la lógica de parseo de git es
 * verificada contra el propio fuente de git (comentarios preservados donde
 * citan `refs/files-backend.c`, `packed-backend.c`, `setup.c`,
 * `shallow.c`).
 *
 * `unwatchFile`/`watchFile` de `fs`, `readdir`/`readFile`/`stat` de
 * `fs/promises`, `join`/`resolve` de `path` son built-ins.
 * `parseGitConfigValue` es la hoja portada en `./git/gitConfigParser.ts`
 * (sin dependencias propias).
 *
 * Repuntados vía `require()` diferido
 * (`./internal/pendingCrossPackageDeps.ts`):
 * - `registerCleanup` — `@thyrox/app-host/bootstrap/cleanupRegistry.js`,
 *   existe.
 * - `getCwd` — `@thyrox/app-host/bootstrap/cwd.js`, existe.
 * - `findGitRoot` — `@thyrox/storage/findGitRoot.js`, existe.
 * - `waitForScrollIdle` — `@thyrox/app-host/bootstrap/state.js` EXISTE como
 *   archivo (portado parcialmente por otro agente) pero NO declara este
 *   símbolo (verificado con `grep -n "^export"` sobre el archivo completo).
 *   Se envuelve en `waitForScrollIdlePending()`, que detecta la ausencia en
 *   tiempo de ejecución y degrada a un no-op documentado en vez de lanzar
 *   — el único llamador (`onHeadChanged`) sólo lo usa para diferir I/O
 *   hasta que el scroll se asiente; sin el símbolo, el watcher sigue siendo
 *   correcto, sólo pierde ese debounce.
 */

import { unwatchFile, watchFile } from 'fs'
import { readdir, readFile, stat } from 'fs/promises'
import { join, resolve } from 'path'
import {
  requireAppHostBootstrapCleanupRegistry,
  requireAppHostBootstrapCwd,
  requireStorageFindGitRoot,
  waitForScrollIdlePending,
} from './internal/pendingCrossPackageDeps.js'
import { parseGitConfigValue } from './git/gitConfigParser.js'

// ---------------------------------------------------------------------------
// resolveGitDir — encuentra el directorio .git real
// ---------------------------------------------------------------------------

const resolveGitDirCache = new Map<string, string | null>()

/** Limpia las resoluciones cacheadas de git dir. Exportado sólo para tests. */
export function clearResolveGitDirCache(): void {
  resolveGitDirCache.clear()
}

/**
 * Resuelve el directorio `.git` real de un repo. Maneja worktrees/
 * submódulos donde `.git` es un archivo con `gitdir: <path>`. Memoizado por
 * `startPath`.
 */
export async function resolveGitDir(
  startPath?: string,
): Promise<string | null> {
  const cwd = resolve(startPath ?? requireAppHostBootstrapCwd().getCwd())
  const cached = resolveGitDirCache.get(cwd)
  if (cached !== undefined) {
    return cached
  }

  const root = requireStorageFindGitRoot().findGitRoot(cwd)
  if (!root) {
    resolveGitDirCache.set(cwd, null)
    return null
  }

  const gitPath = join(root, '.git')
  try {
    const st = await stat(gitPath)
    if (st.isFile()) {
      // Worktree o submódulo: .git es un archivo con `gitdir: <path>`.
      // Git recorta \n y \r finales (setup.c read_gitfile_gently).
      const content = (await readFile(gitPath, 'utf-8')).trim()
      if (content.startsWith('gitdir:')) {
        const rawDir = content.slice('gitdir:'.length).trim()
        const resolved = resolve(root, rawDir)
        resolveGitDirCache.set(cwd, resolved)
        return resolved
      }
    }
    // Repo normal: .git es un directorio.
    resolveGitDirCache.set(cwd, gitPath)
    return gitPath
  } catch {
    resolveGitDirCache.set(cwd, null)
    return null
  }
}

// ---------------------------------------------------------------------------
// isSafeRefName — valida nombres de ref/rama leídos de .git/
// ---------------------------------------------------------------------------

/**
 * Valida que un nombre de ref/rama leído de `.git/` sea seguro para usar en
 * uniones de ruta, como argumentos posicionales de git, e interpolado en
 * comandos de shell (el skill commit-push-pr interpola la rama en shell).
 * Un atacante que controle `.git/HEAD` o un archivo de ref suelto podría,
 * de otro modo, incrustar path traversal (`..`), inyección de argumento
 * (guion inicial), o metacaracteres de shell — `.git/HEAD` es un archivo de
 * texto plano que se puede escribir sin la validación
 * `check-ref-format` propia de git.
 *
 * Lista blanca: solo alfanuméricos ASCII, `/`, `.`, `_`, `+`, `-`, `@`.
 * Cubre todos los nombres de rama legítimos de git (p. ej. `feature/foo`,
 * `release-1.2.3+build`, `dependabot/npm_and_yarn/@types/node-18.0.0`)
 * mientras rechaza todo lo que podría ser peligroso en contexto de shell
 * (saltos de línea, backticks, `$`, `;`, `|`, `&`, `(`, `)`, `<`, `>`,
 * espacios, tabs, comillas, backslash) y path traversal (`..`).
 */
export function isSafeRefName(name: string): boolean {
  if (!name || name.startsWith('-') || name.startsWith('/')) {
    return false
  }
  if (name.includes('..')) {
    return false
  }
  // Rechaza componentes de ruta vacíos o de un solo punto (`.`,
  // `foo/./bar`, `foo//bar`, `foo/`). git-check-ref-format los rechaza, y
  // `.` se normaliza en las uniones de ruta, así que un HEAD alterado a
  // `refs/heads/.` nos haría observar el directorio `refs/heads` mismo en
  // vez de un archivo de rama.
  if (name.split('/').some(c => c === '.' || c === '')) {
    return false
  }
  // Sólo lista blanca: alfanuméricos, /, ., _, +, -, @. Rechaza todos los
  // metacaracteres de shell, espacios, NUL, y no-ASCII. La secuencia
  // prohibida `@{` de git queda bloqueada porque `{` no está en la lista
  // blanca.
  if (!/^[a-zA-Z0-9/._+@-]+$/.test(name)) {
    return false
  }
  return true
}

/**
 * Valida que una cadena sea un SHA de git: 40 caracteres hex (SHA-1) o 64
 * (SHA-256). Git nunca escribe SHAs abreviados en HEAD o archivos de ref,
 * así que sólo se aceptan hashes de largo completo.
 *
 * Un atacante que controle `.git/HEAD` en detached, o un archivo de ref
 * suelto, podría de otro modo devolver contenido arbitrario que fluye a
 * contextos de shell.
 */
export function isValidGitSha(s: string): boolean {
  return /^[0-9a-f]{40}$/.test(s) || /^[0-9a-f]{64}$/.test(s)
}

// ---------------------------------------------------------------------------
// readGitHead — parsea .git/HEAD
// ---------------------------------------------------------------------------

/**
 * Parsea `.git/HEAD` para determinar la rama actual o el SHA en detached.
 *
 * Formato de HEAD (según el fuente de git, `refs/files-backend.c`):
 *   - `ref: refs/heads/<branch>\n`  — en una rama
 *   - `ref: <other-ref>\n`          — symref inusual (p. ej. durante un bisect)
 *   - `<hex-sha>\n`                 — HEAD detached (p. ej. durante un rebase)
 *
 * Git recorta espacio en blanco final vía `strbuf_rtrim`; `.trim()` es
 * equivalente. Git admite cualquier espacio en blanco entre "ref:" y la
 * ruta; se maneja recortando tras cortar "ref:".
 */
export async function readGitHead(
  gitDir: string,
): Promise<
  { type: 'branch'; name: string } | { type: 'detached'; sha: string } | null
> {
  try {
    const content = (await readFile(join(gitDir, 'HEAD'), 'utf-8')).trim()
    if (content.startsWith('ref:')) {
      const ref = content.slice('ref:'.length).trim()
      if (ref.startsWith('refs/heads/')) {
        const name = ref.slice('refs/heads/'.length)
        // Rechaza path traversal e inyección de argumento de un HEAD alterado.
        if (!isSafeRefName(name)) {
          return null
        }
        return { type: 'branch', name }
      }
      // Symref inusual (no una rama local) — resuelve a SHA.
      if (!isSafeRefName(ref)) {
        return null
      }
      const sha = await resolveRef(gitDir, ref)
      return sha ? { type: 'detached', sha } : { type: 'detached', sha: '' }
    }
    // SHA crudo (HEAD detached). Se valida: un HEAD controlado por un
    // atacante podría contener metacaracteres de shell que fluyan a
    // contextos de shell posteriores.
    if (!isValidGitSha(content)) {
      return null
    }
    return { type: 'detached', sha: content }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// resolveRef — resuelve refs sueltos/empacados a SHAs
// ---------------------------------------------------------------------------

/**
 * Resuelve un ref de git (p. ej. `refs/heads/main`) a un SHA de commit.
 * Comprueba primero archivos de ref sueltos, y cae a `packed-refs`. Sigue
 * symrefs (p. ej. `ref: refs/remotes/origin/main`).
 *
 * Para worktrees, los refs viven en el gitdir común (apuntado por el
 * archivo `commondir`), no en el gitdir específico del worktree. Se
 * comprueba primero el gitdir del worktree, y se cae al directorio común.
 *
 * Formato de packed-refs (según `packed-backend.c`):
 *   - Cabecera: `# pack-refs with: <traits>\n`
 *   - Entradas: `<40-hex-sha> <refname>\n`
 *   - Peeled:  `^<40-hex-sha>\n` (tras entradas de tag anotado)
 */
export async function resolveRef(
  gitDir: string,
  ref: string,
): Promise<string | null> {
  const result = await resolveRefInDir(gitDir, ref)
  if (result) {
    return result
  }

  // Para worktrees: intenta el gitdir común donde viven los refs compartidos.
  const commonDir = await getCommonDir(gitDir)
  if (commonDir && commonDir !== gitDir) {
    return resolveRefInDir(commonDir, ref)
  }

  return null
}

async function resolveRefInDir(
  dir: string,
  ref: string,
): Promise<string | null> {
  // Intenta el archivo de ref suelto.
  try {
    const content = (await readFile(join(dir, ref), 'utf-8')).trim()
    if (content.startsWith('ref:')) {
      const target = content.slice('ref:'.length).trim()
      // Rechaza path traversal en una cadena de symref alterada.
      if (!isSafeRefName(target)) {
        return null
      }
      return resolveRef(dir, target)
    }
    // El contenido de un ref suelto debería ser un SHA crudo. Se valida: un
    // archivo de ref controlado por un atacante podría contener
    // metacaracteres de shell.
    if (!isValidGitSha(content)) {
      return null
    }
    return content
  } catch {
    // El ref suelto no existe, intenta packed-refs.
  }

  try {
    const packed = await readFile(join(dir, 'packed-refs'), 'utf-8')
    for (const line of packed.split('\n')) {
      if (line.startsWith('#') || line.startsWith('^')) {
        continue
      }
      const spaceIdx = line.indexOf(' ')
      if (spaceIdx === -1) {
        continue
      }
      if (line.slice(spaceIdx + 1) === ref) {
        const sha = line.slice(0, spaceIdx)
        return isValidGitSha(sha) ? sha : null
      }
    }
  } catch {
    // Sin packed-refs.
  }

  return null
}

/**
 * Lee el archivo `commondir` para encontrar el directorio git compartido.
 * En un worktree, apunta al `.git` del repo principal. Devuelve `null` si
 * no existe archivo `commondir` (repo normal).
 */
export async function getCommonDir(gitDir: string): Promise<string | null> {
  try {
    const content = (await readFile(join(gitDir, 'commondir'), 'utf-8')).trim()
    return resolve(gitDir, content)
  } catch {
    return null
  }
}

/**
 * Lee un archivo symref crudo y extrae el nombre de rama tras un prefijo
 * conocido. Devuelve `null` si el ref no existe, no es un symref, o no
 * coincide con el prefijo. Sólo comprueba el archivo suelto — `packed-refs`
 * no guarda symrefs.
 */
export async function readRawSymref(
  gitDir: string,
  refPath: string,
  branchPrefix: string,
): Promise<string | null> {
  try {
    const content = (await readFile(join(gitDir, refPath), 'utf-8')).trim()
    if (content.startsWith('ref:')) {
      const target = content.slice('ref:'.length).trim()
      if (target.startsWith(branchPrefix)) {
        const name = target.slice(branchPrefix.length)
        // Rechaza path traversal e inyección de argumento de un symref
        // alterado.
        if (!isSafeRefName(name)) {
          return null
        }
        return name
      }
    }
  } catch {
    // No es un ref suelto.
  }
  return null
}

// ---------------------------------------------------------------------------
// GitFileWatcher — observa archivos de git y cachea valores derivados.
// Se inicializa perezosamente en el primer acceso a la caché. Invalida
// todos los valores cacheados cuando cambia cualquier archivo observado.
//
// Observa:
//   .git/HEAD                  — cambios de rama, HEAD detached
//   .git/config                — cambios de URL remota
//   .git/refs/heads/<branch>   — nuevos commits en la rama actual
//
// Cuando HEAD cambia (cambio de rama), el observador del ref de rama se
// actualiza para seguir el archivo de ref de la nueva rama.
// ---------------------------------------------------------------------------

type CacheEntry<T> = {
  value: T
  dirty: boolean
  compute: () => Promise<T>
}

const WATCH_INTERVAL_MS = process.env.NODE_ENV === 'test' ? 10 : 1000

class GitFileWatcher {
  private gitDir: string | null = null
  private commonDir: string | null = null
  private initialized = false
  private initPromise: Promise<void> | null = null
  private watchedPaths: string[] = []
  private branchRefPath: string | null = null
  private cache = new Map<string, CacheEntry<unknown>>()

  async ensureStarted(): Promise<void> {
    if (this.initialized) {
      return
    }
    if (this.initPromise) {
      return this.initPromise
    }
    this.initPromise = this.start()
    return this.initPromise
  }

  private async start(): Promise<void> {
    this.gitDir = await resolveGitDir()
    this.initialized = true
    if (!this.gitDir) {
      return
    }

    // En un worktree, los refs de rama y el config principal se comparten y
    // viven en commonDir, no en el gitDir por-worktree. Se resuelve una
    // sola vez para no releer el archivo commondir en cada cambio de rama.
    this.commonDir = await getCommonDir(this.gitDir)

    // Observa .git/HEAD y .git/config.
    this.watchPath(join(this.gitDir, 'HEAD'), () => {
      void this.onHeadChanged()
    })
    // El config (URLs remotas) vive en commonDir para worktrees.
    this.watchPath(join(this.commonDir ?? this.gitDir, 'config'), () => {
      this.invalidate()
    })

    // Observa el archivo de ref de la rama actual para cambios de commit.
    await this.watchCurrentBranchRef()

    requireAppHostBootstrapCleanupRegistry().registerCleanup(async () => {
      this.stopWatching()
    })
  }

  private watchPath(path: string, callback: () => void): void {
    this.watchedPaths.push(path)
    watchFile(path, { interval: WATCH_INTERVAL_MS }, callback)
  }

  /**
   * Observa el archivo de ref suelto de la rama actual. Se llama al
   * arranque y cada vez que HEAD cambia (cambio de rama).
   */
  private async watchCurrentBranchRef(): Promise<void> {
    if (!this.gitDir) {
      return
    }

    const head = await readGitHead(this.gitDir)
    // Los refs de rama viven en commonDir para worktrees (gitDir para
    // repos normales).
    const refsDir = this.commonDir ?? this.gitDir
    const refPath =
      head?.type === 'branch' ? join(refsDir, 'refs', 'heads', head.name) : null

    // Ya se observa este ref (o ya no se observa nada).
    if (refPath === this.branchRefPath) {
      return
    }

    // Deja de observar el ref de rama viejo. Corre para rama→rama Y
    // rama→detached (checkout --detach, rebase, bisect).
    if (this.branchRefPath) {
      unwatchFile(this.branchRefPath)
      this.watchedPaths = this.watchedPaths.filter(
        p => p !== this.branchRefPath,
      )
    }

    this.branchRefPath = refPath

    if (!refPath) {
      return
    }

    // El archivo de ref puede no existir aún (rama nueva antes del primer
    // commit). watchFile funciona sobre archivos inexistentes — dispara
    // cuando el archivo aparece.
    this.watchPath(refPath, () => {
      this.invalidate()
    })
  }

  private async onHeadChanged(): Promise<void> {
    // HEAD cambió — puede ser un cambio de rama o un detach. Se difiere la
    // I/O de archivo (readGitHead, configuración de watchFile) hasta que el
    // scroll se asiente, para que los callbacks de watchFile que caigan a
    // mitad de scroll no compitan por el event loop. invalidate() es barato
    // (sólo marca dirty) así que se hace primero — la caché sirve
    // correctamente los valores marcados stale hasta que el watcher se
    // actualiza.
    this.invalidate()
    await waitForScrollIdlePending()
    await this.watchCurrentBranchRef()
  }

  private invalidate(): void {
    for (const entry of this.cache.values()) {
      entry.dirty = true
    }
  }

  private stopWatching(): void {
    for (const path of this.watchedPaths) {
      unwatchFile(path)
    }
    this.watchedPaths = []
    this.branchRefPath = null
  }

  /**
   * Obtiene un valor cacheado por clave. En la primera llamada para una
   * clave, lo calcula y lo cachea. Llamadas subsecuentes devuelven el valor
   * cacheado hasta que un archivo observado cambia, lo que marca la entrada
   * dirty. El siguiente get() lo recalcula desde disco.
   *
   * Manejo de condición de carrera: dirty se limpia ANTES de que empiece el
   * cálculo async. Si un cambio de archivo llega durante el cálculo, vuelve
   * a marcar dirty, así que el siguiente get() volverá a leer en vez de
   * servir un valor stale.
   */
  async get<T>(key: string, compute: () => Promise<T>): Promise<T> {
    await this.ensureStarted()
    const existing = this.cache.get(key)
    if (existing && !existing.dirty) {
      return existing.value as T
    }
    // Limpia dirty antes de calcular — si el archivo cambia otra vez
    // durante la lectura async, invalidate() volverá a marcar dirty y se
    // releerá en la siguiente llamada a get().
    if (existing) {
      existing.dirty = false
    }
    const value = await compute()
    // Sólo actualiza el valor cacheado si no llegó una nueva invalidación
    // durante el cálculo.
    const entry = this.cache.get(key)
    if (entry && !entry.dirty) {
      entry.value = value
    }
    if (!entry) {
      this.cache.set(key, { value, dirty: false, compute })
    }
    return value
  }

  /** Resetea todo el estado. Detiene los observadores de archivo. Sólo para tests. */
  reset(): void {
    this.stopWatching()
    this.cache.clear()
    this.initialized = false
    this.initPromise = null
    this.gitDir = null
    this.commonDir = null
  }
}

const gitWatcher = new GitFileWatcher()

async function computeBranch(): Promise<string> {
  const gitDir = await resolveGitDir()
  if (!gitDir) {
    return 'HEAD'
  }
  const head = await readGitHead(gitDir)
  if (!head) {
    return 'HEAD'
  }
  return head.type === 'branch' ? head.name : 'HEAD'
}

async function computeHead(): Promise<string> {
  const gitDir = await resolveGitDir()
  if (!gitDir) {
    return ''
  }
  const head = await readGitHead(gitDir)
  if (!head) {
    return ''
  }
  if (head.type === 'branch') {
    return (await resolveRef(gitDir, `refs/heads/${head.name}`)) ?? ''
  }
  return head.sha
}

async function computeRemoteUrl(): Promise<string | null> {
  const gitDir = await resolveGitDir()
  if (!gitDir) {
    return null
  }
  const url = await parseGitConfigValue(gitDir, 'remote', 'origin', 'url')
  if (url) {
    return url
  }
  // En worktrees, el config con URLs remotas está en el directorio común.
  const commonDir = await getCommonDir(gitDir)
  if (commonDir && commonDir !== gitDir) {
    return parseGitConfigValue(commonDir, 'remote', 'origin', 'url')
  }
  return null
}

async function computeDefaultBranch(): Promise<string> {
  const gitDir = await resolveGitDir()
  if (!gitDir) {
    return 'main'
  }
  // refs/remotes/ vive en commonDir, no en el gitDir por-worktree.
  const commonDir = (await getCommonDir(gitDir)) ?? gitDir
  const branchFromSymref = await readRawSymref(
    commonDir,
    'refs/remotes/origin/HEAD',
    'refs/remotes/origin/',
  )
  if (branchFromSymref) {
    return branchFromSymref
  }
  for (const candidate of ['main', 'master']) {
    const sha = await resolveRef(commonDir, `refs/remotes/origin/${candidate}`)
    if (sha) {
      return candidate
    }
  }
  return 'main'
}

export function getCachedBranch(): Promise<string> {
  return gitWatcher.get('branch', computeBranch)
}

export function getCachedHead(): Promise<string> {
  return gitWatcher.get('head', computeHead)
}

export function getCachedRemoteUrl(): Promise<string | null> {
  return gitWatcher.get('remoteUrl', computeRemoteUrl)
}

export function getCachedDefaultBranch(): Promise<string> {
  return gitWatcher.get('defaultBranch', computeDefaultBranch)
}

/** Resetea el estado del observador de archivos de git. Sólo para tests. */
export function resetGitFileWatcher(): void {
  gitWatcher.reset()
}

/**
 * Lee el SHA de HEAD para un directorio arbitrario (sin usar el
 * watcher). Lo usan plugins que necesitan el HEAD de un repo específico, no
 * el repo del CWD.
 */
export async function getHeadForDir(cwd: string): Promise<string | null> {
  const gitDir = await resolveGitDir(cwd)
  if (!gitDir) {
    return null
  }
  const head = await readGitHead(gitDir)
  if (!head) {
    return null
  }
  if (head.type === 'branch') {
    return resolveRef(gitDir, `refs/heads/${head.name}`)
  }
  return head.sha
}

/**
 * Lee el SHA de HEAD de un directorio de worktree de git (no el repo
 * principal).
 *
 * A diferencia de `getHeadForDir`, esto lee `<worktreePath>/.git`
 * directamente como un archivo puntero `gitdir:`, sin recorrido hacia
 * arriba. `getHeadForDir` recorre hacia arriba vía `findGitRoot` y
 * encontraría el `.git` del repo padre cuando la ruta del worktree no
 * existe — reportando erróneamente el HEAD del padre como el del worktree.
 *
 * Devuelve `null` si el worktree no existe (puntero `.git` con ENOENT) o
 * está malformado. Quien llama puede tratar `null` como "no es un worktree
 * válido".
 */
export async function readWorktreeHeadSha(
  worktreePath: string,
): Promise<string | null> {
  let gitDir: string
  try {
    const ptr = (await readFile(join(worktreePath, '.git'), 'utf-8')).trim()
    if (!ptr.startsWith('gitdir:')) {
      return null
    }
    gitDir = resolve(worktreePath, ptr.slice('gitdir:'.length).trim())
  } catch {
    return null
  }
  const head = await readGitHead(gitDir)
  if (!head) {
    return null
  }
  if (head.type === 'branch') {
    return resolveRef(gitDir, `refs/heads/${head.name}`)
  }
  return head.sha
}

/** Lee la URL del remote origin de un directorio arbitrario vía `.git/config`. */
export async function getRemoteUrlForDir(cwd: string): Promise<string | null> {
  const gitDir = await resolveGitDir(cwd)
  if (!gitDir) {
    return null
  }
  const url = await parseGitConfigValue(gitDir, 'remote', 'origin', 'url')
  if (url) {
    return url
  }
  // En worktrees, el config con URLs remotas está en el directorio común.
  const commonDir = await getCommonDir(gitDir)
  if (commonDir && commonDir !== gitDir) {
    return parseGitConfigValue(commonDir, 'remote', 'origin', 'url')
  }
  return null
}

/**
 * Comprueba si estamos en un clon shallow buscando `<commonDir>/shallow`.
 * Según `shallow.c` de git, la mera existencia del archivo significa
 * shallow. El archivo shallow vive en commonDir, no en el gitDir
 * por-worktree.
 */
export async function isShallowClone(): Promise<boolean> {
  const gitDir = await resolveGitDir()
  if (!gitDir) {
    return false
  }
  const commonDir = (await getCommonDir(gitDir)) ?? gitDir
  try {
    await stat(join(commonDir, 'shallow'))
    return true
  } catch {
    return false
  }
}

/**
 * Cuenta worktrees leyendo el directorio `<commonDir>/worktrees/`. El
 * directorio `worktrees/` vive en commonDir, no en el gitDir por-worktree.
 * El worktree principal no se lista ahí, así que se suma 1.
 */
export async function getWorktreeCountFromFs(): Promise<number> {
  try {
    const gitDir = await resolveGitDir()
    if (!gitDir) {
      return 0
    }
    const commonDir = (await getCommonDir(gitDir)) ?? gitDir
    const entries = await readdir(join(commonDir, 'worktrees'))
    return entries.length + 1
  } catch {
    // Sin directorio worktrees significa sólo el worktree principal.
    return 1
  }
}
