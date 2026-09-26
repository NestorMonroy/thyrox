/**
 * Porte PARCIAL, declarado, de `ccnmt: packages/storage/src/claudemd.ts`
 * (48 248 bytes fuente).
 *
 * La fuente descubre y carga jerarquías completas de CLAUDE.md (Managed →
 * User → Project → Local, con directivas `@include`, frontmatter `paths:`
 * y truncado de `MEMORY.md`) y expone ~20 símbolos. Los tests de este pase
 * (`claudemd.behavior.test.ts`, `claudemdHelpers.test.ts`) ejercitan **7**:
 * los dos constantes (`MAX_MEMORY_CHARACTER_COUNT`,
 * `POLICY_HELPER_CLAUDE_MD_SENTINEL`), el tipo `MemoryFileInfo`/`MemoryType`,
 * y las cuatro funciones puras `stripHtmlComments`, `isMemoryFilePath`,
 * `getLargeMemoryFiles`, `filterInjectedMemoryFiles`. El descubrimiento de
 * archivos, `@include` y el frontmatter `paths:` se portan al final
 * (2026-09-24) desde 2.1.275: `getMemoryFiles`, `getClaudeMds`,
 * `clearMemoryFileCaches`, `resetGetMemoryFilesCache`; lo que de ellos queda
 * pendiente lo declara su bloque. El truncado de MEMORY.md sigue sin portar.
 *
 * Dos divergencias, ambas por ausencia de dependencia externa:
 *
 * - `stripHtmlComments` — la fuente usa el `Lexer` de `marked` (CommonMark)
 *   para distinguir comentarios a nivel de bloque de los que van dentro de
 *   un bloque de código cercado/indentado. `marked` no está instalado en
 *   este monorepo y la regla del proyecto prohíbe instalar dependencias
 *   externas sin decisión del ejecutor. Se reimplementa aquí con una
 *   máquina de estados propia línea a línea que reconoce cercas ``` / ~~~,
 *   código indentado (≥4 espacios o tab) y comentarios de bloque que
 *   empiezan tras ≤3 espacios de indentación — el mismo contrato que exige
 *   la CASO comparable de CommonMark para un HTML block tipo 2, y suficiente
 *   para las 12 formas que los tests ejercitan (bloque simple, multilínea,
 *   dos comentarios, residuo tras `-->`, comentario inline en párrafo,
 *   dentro de cerca, dentro de indentado, sin cerrar, vacío, sólo comentario,
 *   CRLF sin comentario). No cubre casos fuera de esas 12 formas (p. ej.
 *   comentarios que empiezan a media línea tras texto NO trivial antes del
 *   `<!--`, que la fuente tampoco trataría como bloque).
 * - `filterInjectedMemoryFiles` — la fuente lee la bandera
 *   `tengu_moth_copse` vía `getFeatureValue_CACHED_MAY_BE_STALE` de
 *   `@claude-code-how-works/config/feature-flags`, ausente aquí. Se sustituye
 *   por una función local que siempre devuelve el valor por defecto (`false`)
 *   — el mismo comportamiento que el test fija ("es un no-op cuando la
 *   bandera es false, el default").
 */
import picomatch from 'picomatch'
import type { Dirent } from 'node:fs'
import { realpathSync } from 'node:fs'
import { lstat, readdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { cacheKeys, type FileStateCache } from '@thyrox/tool-registry/fileStateCache'
import { logEvent } from '@thyrox/local-observability'
import { getErrnoCode, getFsImplementation, safeResolvePath } from './fsOperations.js'
import { getInitialSettings } from '@thyrox/config/settings'
import { safePicomatch, safeIgnoreMatch } from './safePatternMatch.js'
import { pathInWorkingPath } from '@thyrox/permission/filesystem'
import { normalizePathForComparison } from './file.js'
import { getOriginalCwd } from './sessionPaths.js'
import type { InstructionsLoadReason, InstructionsMemoryType } from '@thyrox/agent/hooks.js'
import {
  parseFrontmatter,
  splitPathInFrontmatter,
} from '@thyrox/config/frontmatterParser.js'
import { Lexer } from 'marked'
import { expandPath } from './path.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'












/** Subconjunto de tipos de memoria que este porte necesita declarar. */
export type MemoryType = 'User' | 'Project' | 'Local' | 'Managed' | 'AutoMem' | 'TeamMem'

// Recommended max character count for a memory file
export const MAX_MEMORY_CHARACTER_COUNT = 40000

/**
 * Sentinel "path" usado para la entrada Managed sintética que viene del
 * campo `claudeMd` del envelope de policyHelper. Puerto fiel de
 * `ant H6H = "<policyHelper>"` (0687.js). Empieza con `<` para que el
 * código de manejo de rutas río abajo (que sólo se preocupa de rutas de
 * filesystem reales) la trate como un marcador no-archivo.
 */
export const POLICY_HELPER_CLAUDE_MD_SENTINEL = '<policyHelper>'

export type MemoryFileInfo = {
  path: string
  type: MemoryType
  content: string
  parent?: string
  globs?: string[]
  contentDiffersFromDisk?: boolean
  rawContent?: string
}

/**
 * Strip block-level HTML comments (<!-- ... -->) from markdown content.
 *
 * Reconoce comentarios a nivel de bloque (línea que empieza, tras ≤3
 * espacios, con `<!--`), que pueden extenderse por varias líneas hasta el
 * primer `-->`. Preserva: comentarios inline dentro de un párrafo (el `<!--`
 * no está al inicio de línea), comentarios dentro de bloques de código
 * cercados (``` / ~~~) o indentados (≥4 espacios / tab), y comentarios sin
 * cerrar (se dejan intactos, `stripped` queda `false` para ese tramo).
 */
export function stripHtmlComments(content: string): {
  content: string
  stripped: boolean
} {
  if (!content.includes('<!--')) {
    return { content, stripped: false }
  }

  const lines = content.split(/(?<=\n)/)
  const out: string[] = []
  let stripped = false
  let inFence = false
  let fenceChar = ''
  let fenceLen = 0

  const fenceOpenRe = /^ {0,3}(`{3,}|~{3,})/
  const indentedRe = /^(?: {4,}|\t)/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string

    if (inFence) {
      out.push(line)
      const closeMatch = line.match(fenceOpenRe)
      if (
        closeMatch &&
        closeMatch[1]?.[0] === fenceChar &&
        closeMatch[1].length >= fenceLen
      ) {
        inFence = false
      }
      continue
    }

    const fenceOpenMatch = line.match(fenceOpenRe)
    if (fenceOpenMatch?.[1]) {
      inFence = true
      fenceChar = fenceOpenMatch[1][0] as string
      fenceLen = fenceOpenMatch[1].length
      out.push(line)
      continue
    }

    if (indentedRe.test(line)) {
      out.push(line)
      continue
    }

    const trimmedStart = line.replace(/^ {0,3}/, '')
    if (trimmedStart.startsWith('<!--')) {
      let span = line
      let j = i
      let closeIdx = span.indexOf('-->', span.indexOf('<!--') + 4)
      while (closeIdx === -1 && j + 1 < lines.length) {
        j++
        const nextLine = lines[j] as string
        span += nextLine
        closeIdx = span.indexOf('-->', span.length - nextLine.length)
      }

      if (closeIdx === -1) {
        // Unclosed: a typo doesn't silently swallow the rest of the file —
        // leave everything from here to the end untouched.
        for (let k = i; k < lines.length; k++) out.push(lines[k] as string)
        break
      }

      const startIdx = span.indexOf('<!--')
      const endIdx = closeIdx + 3
      const residue = span.slice(endIdx)
      stripped = true
      if (residue.trim().length > 0) {
        out.push(residue)
      }
      void startIdx // el prefijo antes de "<!--" es sólo indentación (≤3 espacios); se descarta
      i = j
      continue
    }

    out.push(line)
  }

  return { content: out.join(''), stripped }
}

/**
 * Check if a file path is a memory file (CLAUDE.md, CLAUDE.local.md, or
 * .claude/rules/*.md).
 */
export function isMemoryFilePath(filePath: string): boolean {
  if (!filePath) return false
  const name = filePath.split(/[\\/]/).pop() ?? ''

  if (name === 'CLAUDE.md' || name === 'CLAUDE.local.md') {
    return true
  }

  if (
    name.endsWith('.md') &&
    (filePath.includes('/.claude/rules/') || filePath.includes('\\.claude\\rules\\'))
  ) {
    return true
  }

  return false
}

export function getLargeMemoryFiles(files: MemoryFileInfo[]): MemoryFileInfo[] {
  return files.filter(f => f.content.length > MAX_MEMORY_CHARACTER_COUNT)
}

/**
 * Sustituto local de `getFeatureValue_CACHED_MAY_BE_STALE` — este árbol no
 * tiene el sistema real de feature-flags de la fuente, así que siempre
 * devuelve el valor por defecto que pasa el llamador.
 */
function getFeatureValueDefaultOnly<T>(_key: string, fallback: T): T {
  return fallback
}

/**
 * When tengu_moth_copse is on, the findRelevantMemories prefetch surfaces
 * memory files via attachments, so the MEMORY.md index is no longer
 * injected into the system prompt. Callsites that care about "what's
 * actually in context" should filter through this.
 */
export function filterInjectedMemoryFiles(
  files: MemoryFileInfo[],
): MemoryFileInfo[] {
  const skipMemoryIndex = getFeatureValueDefaultOnly('tengu_moth_copse', false)
  if (!skipMemoryIndex) return files
  return files.filter(f => f.type !== 'AutoMem' && f.type !== 'TeamMem')
}

// ---------------------------------------------------------------------------
// Cargador de la jerarquía de CLAUDE.md — porte de 2.1.275 (2026-09-24):
// `ob`/`qwo` (orden de capas y memoización), `hF` (un archivo y sus
// `@include`), `AEe` (directorio de reglas), `x7e`/`Gtn` (lectura y
// análisis), `Iwo` (`paths:` del frontmatter), `Hwo` (rutas `@`) y `Qtn`
// (`claudeMdExcludes`), todos en `chunk-q2gh92k2.js`.
//
// pendiente, cada uno con su productor ausente en este árbol:
//  - el contenido del helper de política (`W3t`) y `policySettings.claudeMd`;
//  - omitir la raíz del repo principal desde un worktree (`k4e`/`A4e`);
//  - la memoria automática (AutoMem/AutoMemPinned) y su registro (`Utn`);
//  - el eco de hooks `InstructionsLoaded` tras la carga (`Kwo`);
//  - los rechazos de rutas de dispositivo y de red (`Pn`/`Jr`/`Vv`/`Xh`/`Gf`)
//    y el backend de almacenamiento V5.
// El lexer de markdown de la fuente (`marked`) no está instalado; las rutas
// `@` se buscan con el mismo recorte que ya usa `stripHtmlComments`: fuera
// de cercas, de código indentado, de código en línea y de comentarios.
// ---------------------------------------------------------------------------

// Profundidad máxima de `@include` y tamaño máximo de un archivo leído.
const MAX_INCLUDE_DEPTH = 5
const MAX_MEMORY_FILE_BYTES = 4 * 1024 * 1024

// Extensiones que un `@include` puede traer (`Pwo`).
const TEXT_EXTENSIONS = new Set(
  '.md .txt .text .json .yaml .yml .toml .xml .csv .html .htm .css .scss .sass .less .js .ts .tsx .jsx .mjs .cjs .mts .cts .py .pyi .pyw .rb .erb .rake .go .rs .java .kt .kts .scala .c .cpp .cc .cxx .h .hpp .hxx .cs .swift .sh .bash .zsh .fish .ps1 .bat .cmd .env .ini .cfg .conf .config .properties .sql .graphql .gql .proto .vue .svelte .astro .ejs .hbs .pug .jade .php .pl .pm .lua .r .R .dart .ex .exs .erl .hrl .clj .cljs .cljc .edn .hs .lhs .elm .ml .mli .f .f90 .f95 .for .cmake .make .makefile .gradle .sbt .rst .adoc .asciidoc .org .tex .latex .lock .log .diff .patch'.split(
    ' ',
  ),
)

type LoaderConfig = {
  configHome: string
  managedDir: string
  userEnabled: boolean
  projectEnabled: boolean
  localEnabled: boolean
  externalApproved: boolean
  excludes: string[]
  additionalDirs: string[]
  originalCwd: string
}

// Dependencias hacia config y app-host, cargadas tarde: config ya depende de
// este paquete. Si una falta, la capa correspondiente se omite.
function loaderConfig(): LoaderConfig {
  const req = (id: string): Record<string, (...a: unknown[]) => unknown> | null => {
    try {
      return require(id)
    } catch {
      return null
    }
  }
  const env = req('@thyrox/config/env/utils.js')
  const constants = req('@thyrox/config/constants')
  const settings = req('@thyrox/config/settings')
  const managed = req('@thyrox/config/managedPath')
  const global = req('@thyrox/config')
  const state = req('@thyrox/app-host/bootstrap/state.js')
  const enabled = (source: string) => {
    try {
      return (constants?.isSettingSourceEnabled?.(source) as boolean | undefined) ?? true
    } catch {
      return true
    }
  }
  const safe = <T>(fn: () => T, fallback: T): T => {
    try {
      return fn() ?? fallback
    } catch {
      return fallback
    }
  }
  return {
    configHome: safe(
      () => env?.getClaudeConfigHomeDir?.() as string,
      join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')),
    ),
    managedDir: safe(() => managed?.getManagedFilePath?.() as string, '/etc/claude-code'),
    userEnabled: enabled('userSettings'),
    projectEnabled: enabled('projectSettings'),
    localEnabled: enabled('localSettings'),
    externalApproved: safe(
      () => (global?.getCurrentProjectConfig?.() as { hasClaudeMdExternalIncludesApproved?: boolean })
        .hasClaudeMdExternalIncludesApproved === true,
      false,
    ),
    excludes: safe(
      () => ((settings?.getInitialSettings?.() as { claudeMdExcludes?: string[] }).claudeMdExcludes ?? []),
      [],
    ),
    // `ye()`: la raíz de la sesión, no el cwd del proceso; de ella parte la
    // subida y contra ella se mide qué es externo.
    originalCwd: safe(() => state?.getOriginalCwd?.() as string, process.cwd()),
    additionalDirs: isTruthyEnv(process.env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD)
      ? safe(() => state?.getAdditionalDirectoriesForClaudeMd?.() as string[], [])
      : [],
  }
}

function isTruthyEnv(value: string | undefined): boolean {
  return value !== undefined && ['1', 'true', 'yes', 'on'].includes(value.toLowerCase().trim())
}

/** `Ld`: ¿`child` es `parent` o está debajo? */
function isWithin(child: string, parent: string): boolean {
  const rel = relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/** `Po`: la ruta real y si llegar a ella cruzó un enlace. */
function resolveReal(path: string): { resolvedPath: string; isSymlink: boolean } {
  try {
    const real = realpathSync(path)
    return { resolvedPath: real, isSymlink: real !== resolve(path) }
  } catch {
    return { resolvedPath: resolve(path), isSymlink: false }
  }
}

/**
 * `Wwo`: a cada patrón absoluto se le añade su gemelo con el prefijo fijo
 * resuelto por enlaces, para que casen las dos formas de la misma ruta.
 */
function withRealPathTwins(patterns: string[]): string[] {
  const out = patterns.map(p => p.replaceAll('\\', '/'))
  for (const pattern of [...out]) {
    if (!pattern.startsWith('/')) continue
    const firstGlob = pattern.search(/[*?{[]/)
    const fixed = firstGlob === -1 ? pattern : pattern.slice(0, firstGlob)
    const dir = dirname(fixed)
    const real = resolveReal(dir).resolvedPath.replaceAll('\\', '/')
    if (real !== dir) out.push(real + pattern.slice(dir.length))
  }
  return out
}

/** `Qtn`: `claudeMdExcludes` deja fuera archivos de usuario, proyecto o locales. */
function isExcluded(path: string, type: MemoryType, excludes: string[]): boolean {
  if (type !== 'User' && type !== 'Project' && type !== 'Local') return false
  const patterns = withRealPathTwins(excludes).filter(p => p.length > 0)
  if (patterns.length === 0) return false
  return picomatch.isMatch(path.replaceAll('\\', '/'), patterns, { dot: true })
}

/** `Iwo`: separa el frontmatter y devuelve sus `paths:` como globs. */
function splitFrontmatterPaths(raw: string): { content: string; paths?: string[] } {
  const match = raw.match(/^---\s*\n([\s\S]*?)---\s*\n?/)
  if (!match) return { content: raw }
  const content = raw.slice(match[0].length)
  const line = /^paths:\s*(.*)$/m.exec(match[1] ?? '')
  if (!line) return { content }
  let value = (line[1] ?? '').trim()
  let items: string[]
  if (value === '') {
    // Lista YAML en las líneas siguientes.
    const after = (match[1] ?? '').slice((line.index ?? 0) + line[0].length)
    items = [...after.matchAll(/^\s*-\s*(.+)$/gm)].map(m => m[1]!.trim())
  } else {
    if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1)
    items = splitOutsideBraces(value)
  }
  const paths = items
    .map(p => p.replace(/^["']|["']$/g, ''))
    .flatMap(expandBraceGroups)
    .map(p => (p.endsWith('/**') ? p.slice(0, -3) : p))
    .filter(p => p.length > 0)
  if (paths.length === 0 || paths.every(p => p === '**')) return { content }
  return { content, paths }
}

function splitOutsideBraces(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of value) {
    if (ch === '{') depth++
    if (ch === '}') depth--
    if (ch === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim())
      current = ''
    } else current += ch
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

function expandBraceGroups(pattern: string): string[] {
  const m = pattern.match(/^([^{]*)\{([^}]+)\}(.*)$/)
  if (!m) return [pattern]
  return m[2]!.split(',').flatMap(alt => expandBraceGroups(`${m[1]}${alt.trim()}${m[3]}`))
}

/** El texto en el que se buscan rutas `@`: sin código ni comentarios. */
function includeSearchText(content: string): string[] {
  const out: string[] = []
  let fence: string | null = null
  let previousBlank = true
  for (const line of content.split(/\r?\n/)) {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line)
    if (fence) {
      if (fenceMatch && fenceMatch[1]![0] === fence[0] && fenceMatch[1]!.length >= fence.length) fence = null
      continue
    }
    if (fenceMatch) {
      fence = fenceMatch[1]!
      continue
    }
    if (previousBlank && /^( {4}|\t)/.test(line)) continue
    previousBlank = line.trim() === ''
    out.push(line.replace(/<!--[\s\S]*?-->/g, ' ').replace(/(`+)[\s\S]*?\1/g, ' '))
  }
  return out
}

/** `Hwo`: las rutas `@` del contenido, resueltas contra el directorio del archivo. */
function extractIncludePaths(content: string, fromPath: string): string[] {
  const found = new Set<string>()
  for (const text of includeSearchText(content)) {
    for (const m of text.matchAll(/(?:^|\s)@((?:[^\s\\]|\\ )+)/g)) {
      let target = m[1] ?? ''
      const hash = target.indexOf('#')
      if (hash !== -1) target = target.substring(0, hash)
      target = target.replaceAll('\\ ', ' ')
      if (!target) continue
      const acceptable =
        target.startsWith('./') ||
        target.startsWith('~/') ||
        (target.startsWith('/') && target !== '/') ||
        (!target.startsWith('@') && !/^[#%^&*()]+/.test(target) && /^[a-zA-Z0-9._-]/.test(target))
      if (!acceptable) continue
      const expanded = target.startsWith('~/') ? join(homedir(), target.slice(2)) : target
      found.add(resolve(dirname(fromPath), expanded))
    }
  }
  return [...found]
}

/** `x7e` + `Gtn`: lee un archivo y lo convierte en entrada de memoria. */
async function readMemoryFile(
  path: string,
  type: MemoryType,
  resolvedPath: string,
): Promise<{ info: MemoryFileInfo | null; includePaths: string[] }> {
  const none = { info: null, includePaths: [] }
  const ext = extname(path).toLowerCase()
  if (ext && !TEXT_EXTENSIONS.has(ext)) return none
  let raw: string
  try {
    const st = await stat(path)
    if (!st.isFile() || st.size > MAX_MEMORY_FILE_BYTES) return none
    raw = await readFile(path, 'utf8')
  } catch {
    return none
  }
  const { content: body, paths } = splitFrontmatterPaths(raw)
  const content = body.includes('<!--') ? stripHtmlComments(body).content : body
  const includePaths = body.includes('@') ? extractIncludePaths(body, resolvedPath) : []
  const differs = content !== raw
  return {
    info: {
      path,
      type,
      content,
      globs: paths,
      contentDiffersFromDisk: differs,
      rawContent: differs ? raw : undefined,
    },
    includePaths,
  }
}

type WalkContext = { processed: Set<string>; cwd: string; config: LoaderConfig }

/** `hF`: un archivo de memoria y, en profundidad, lo que incluye. */
async function loadMemoryFile(
  path: string,
  type: MemoryType,
  ctx: WalkContext,
  includeExternal: boolean,
  depth = 0,
  parent?: string,
): Promise<MemoryFileInfo[]> {
  const key = resolve(path)
  if (ctx.processed.has(key) || depth >= MAX_INCLUDE_DEPTH) return []
  if (isExcluded(path, type, ctx.config.excludes)) return []
  const { resolvedPath, isSymlink } = resolveReal(path)
  if (depth > 0 && !includeExternal && !isWithin(resolvedPath, ctx.cwd)) return []
  if (type === 'User' && !includeExternal) {
    try {
      const st = await lstat(path)
      if ((depth === 0 && st.isSymbolicLink()) || ((st.nlink ?? 1) > 1 && st.isFile())) return []
    } catch {}
  }
  if (isSymlink) {
    if (ctx.processed.has(resolvedPath)) return []
    ctx.processed.add(resolvedPath)
  }
  ctx.processed.add(key)
  const { info, includePaths } = await readMemoryFile(path, type, resolvedPath)
  if (!info || !info.content.trim()) return []
  if (parent) info.parent = parent
  const files: MemoryFileInfo[] = [info]
  for (const include of includePaths) {
    if (!isWithin(include, ctx.cwd) && !includeExternal) continue
    files.push(...(await loadMemoryFile(include, type, ctx, includeExternal, depth + 1, path)))
  }
  return files
}

/**
 * `AEe`: los `.md` de un directorio de reglas, en profundidad. Con
 * `conditionalRule` devuelve sólo las que llevan `paths:`; sin él, sólo las
 * incondicionales.
 */
async function loadRulesDir(
  rulesDir: string,
  type: MemoryType,
  ctx: WalkContext,
  includeExternal: boolean,
  conditionalRule: boolean,
  visited: Set<string> = new Set(),
): Promise<MemoryFileInfo[]> {
  if (visited.has(rulesDir)) return []
  const { resolvedPath, isSymlink } = resolveReal(rulesDir)
  visited.add(rulesDir)
  if (isSymlink) {
    if (visited.has(resolvedPath)) return []
    visited.add(resolvedPath)
  }
  let entries: Dirent[]
  try {
    entries = await readdir(resolvedPath, { withFileTypes: true })
  } catch {
    return []
  }
  const files: MemoryFileInfo[] = []
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const entryPath = join(rulesDir, entry.name)
    if (isExcluded(entryPath, type, ctx.config.excludes)) continue
    const real = resolveReal(entryPath)
    let isDir = entry.isDirectory()
    let isFile = entry.isFile()
    if (entry.isSymbolicLink()) {
      try {
        const st = await stat(real.resolvedPath)
        isDir = st.isDirectory()
        isFile = st.isFile()
      } catch {
        continue
      }
      // Un enlace que sale del árbol exige la inclusión externa.
      if (!includeExternal && !isWithin(real.resolvedPath, ctx.cwd)) continue
    }
    if (isDir) {
      files.push(...(await loadRulesDir(real.resolvedPath, type, ctx, includeExternal, conditionalRule, visited)))
    } else if (isFile && entry.name.endsWith('.md')) {
      const loaded = await loadMemoryFile(real.resolvedPath, type, ctx, includeExternal)
      files.push(...loaded.filter(f => (conditionalRule ? f.globs : !f.globs)))
    }
  }
  return files
}

/** `qwo`: todas las capas, en orden de menor a mayor precedencia. */
async function collectMemoryFiles(forceIncludeExternal: boolean): Promise<MemoryFileInfo[]> {
  const config = loaderConfig()
  const cwd = config.originalCwd
  const ctx: WalkContext = { processed: new Set(), cwd, config }
  const external = forceIncludeExternal || config.externalApproved
  const files: MemoryFileInfo[] = []

  files.push(...(await loadMemoryFile(join(config.managedDir, 'CLAUDE.md'), 'Managed', ctx, external)))
  files.push(...(await loadRulesDir(join(config.managedDir, '.claude', 'rules'), 'Managed', ctx, external, false)))

  if (config.userEnabled) {
    files.push(...(await loadMemoryFile(join(config.configHome, 'CLAUDE.md'), 'User', ctx, true)))
    files.push(...(await loadRulesDir(join(config.configHome, 'rules'), 'User', ctx, true, false)))
  }

  const chain: string[] = []
  for (let dir = cwd; ; dir = dirname(dir)) {
    chain.push(dir)
    if (dirname(dir) === dir) break
  }
  const projectDirs = (dirs: string[]) => dirs
  for (const dir of projectDirs(chain.reverse())) {
    if (config.projectEnabled) {
      files.push(...(await loadMemoryFile(join(dir, 'CLAUDE.md'), 'Project', ctx, external)))
      files.push(...(await loadMemoryFile(join(dir, '.claude', 'CLAUDE.md'), 'Project', ctx, external)))
      files.push(...(await loadRulesDir(join(dir, '.claude', 'rules'), 'Project', ctx, external, false)))
    }
    if (config.localEnabled)
      files.push(...(await loadMemoryFile(join(dir, 'CLAUDE.local.md'), 'Local', ctx, external)))
  }

  for (const dir of config.additionalDirs) {
    files.push(...(await loadMemoryFile(join(dir, 'CLAUDE.md'), 'Project', ctx, external)))
    files.push(...(await loadMemoryFile(join(dir, '.claude', 'CLAUDE.md'), 'Project', ctx, external)))
    files.push(...(await loadRulesDir(join(dir, '.claude', 'rules'), 'Project', ctx, external, false)))
    if (config.localEnabled)
      files.push(...(await loadMemoryFile(join(dir, 'CLAUDE.local.md'), 'Local', ctx, external)))
  }
  return files
}

// `ob`: una promesa por modo de inclusión externa hasta que alguien resetea.
const memoryFilesCache = new Map<string, Promise<MemoryFileInfo[]>>()
let lastResetReason: string | undefined

/** La jerarquía de CLAUDE.md que aplica a la raíz de la sesión. */
export function getMemoryFiles(forceIncludeExternal = false): Promise<MemoryFileInfo[]> {
  const key = String(forceIncludeExternal)
  let cached = memoryFilesCache.get(key)
  if (!cached) {
    cached = collectMemoryFiles(forceIncludeExternal)
    memoryFilesCache.set(key, cached)
  }
  return cached
}

/** Olvida las cargas memoizadas; la siguiente relee el disco. */
export function clearMemoryFileCaches(): void {
  memoryFilesCache.clear()
}

/** Como `clearMemoryFileCaches`, con la razón (compactación, cambio de cwd…). */
export function resetGetMemoryFilesCache(reason = 'unknown'): void {
  lastResetReason = reason
  clearMemoryFileCaches()
}

/** La última razón de reset, para diagnóstico. */
export function getLastMemoryFilesResetReason(): string | undefined {
  return lastResetReason
}

// Etiqueta propia de cada capa para el texto que lee el modelo.
const LAYER_LABELS: Record<string, string> = {
  Managed: 'managed instructions, set by the administrator',
  User: "the user's own instructions, for every project",
  Project: 'project instructions, checked into the codebase',
  Local: "the user's private instructions for this project",
  AutoMem: "the user's auto-memory",
  TeamMem: 'shared team memory',
}

/**
 * Los archivos de memoria como un solo bloque de texto para el prompt. El
 * texto es propio; lo que se conserva de la fuente es la forma: una cabecera
 * y, por archivo, su ruta, su capa y su contenido.
 */
export function getClaudeMds(files: MemoryFileInfo[]): string {
  const parts = files
    .filter(f => f.content.trim())
    .map(f => `Contents of ${f.path} (${LAYER_LABELS[f.type] ?? f.type}):\n\n${f.content.trim()}`)
  if (parts.length === 0) return ''
  return `Instructions from the codebase and the user follow. They take precedence over default behavior and must be followed as written.\n\n${parts.join('\n\n')}`
}

// ---------------------------------------------------------------------------
// Inclusiones externas — contrato de 2.1.275 (`Eut`, `yqn`, `KOr`), no copia.
// ---------------------------------------------------------------------------

/** Un CLAUDE.md incluido con `@include` desde fuera de la raíz de la sesión. */
export type ExternalClaudeMdInclude = { path: string; parent: string }

/**
 * Los archivos que entraron por `@include` y viven fuera de la raíz de la
 * sesión (≙ `Eut`). La memoria de usuario no cuenta: vive fuera por diseño.
 */
export function getExternalClaudeMdIncludes(files: MemoryFileInfo[]): ExternalClaudeMdInclude[] {
  const root = loaderConfig().originalCwd
  const includes: ExternalClaudeMdInclude[] = []
  for (const file of files) {
    if (file.type !== 'User' && file.parent && !isWithin(file.path, root)) {
      includes.push({ path: file.path, parent: file.parent })
    }
  }
  return includes
}

/** ¿Hay alguna inclusión externa? (≙ `yqn`). */
export function hasExternalClaudeMdIncludes(files: MemoryFileInfo[]): boolean {
  return getExternalClaudeMdIncludes(files).length > 0
}

/**
 * ¿Hay que mostrar el aviso de inclusiones externas? No, si el proyecto ya
 * las aprobó o ya vio el aviso; si no, sí cuando la carga CON externas
 * encuentra alguna (≙ `KOr`).
 */
export async function shouldShowClaudeMdExternalIncludesWarning(): Promise<boolean> {
  let project: { hasClaudeMdExternalIncludesApproved?: boolean; hasClaudeMdExternalIncludesWarningShown?: boolean } = {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    project = (require('@thyrox/config') as { getCurrentProjectConfig: () => typeof project }).getCurrentProjectConfig()
  } catch {
    // Sin registro de proyecto no hay aprobación que consultar.
  }
  if (project.hasClaudeMdExternalIncludesApproved || project.hasClaudeMdExternalIncludesWarningShown) return false
  return hasExternalClaudeMdIncludes(await getMemoryFiles(true))
}

/**
 * Get all memory file paths from both standard discovery and readFileState.
 * Combines:
 * - getMemoryFiles() paths (CWD upward to root)
 * - readFileState paths matching memory patterns (includes child directories)
 */
export function getAllMemoryFilePaths(
  files: MemoryFileInfo[],
  readFileState: FileStateCache,
): string[] {
  const paths = new Set<string>()
  for (const file of files) {
    if (file.content.trim().length > 0) {
      paths.add(file.path)
    }
  }

  // Add memory files from readFileState (includes child directories)
  for (const filePath of cacheKeys(readFileState)) {
    if (isMemoryFilePath(filePath)) {
      paths.add(filePath)
    }
  }

  return Array.from(paths)
}
/**
 * Obtiene las reglas condicionales de un directorio a nivel de CWD (desde la raíz hasta el CWD).
 * Sólo procesa reglas condicionales, ya que las incondicionales ya se cargan de forma anticipada.
 *
 * @param dir El directorio a procesar
 * @param targetPath La ruta del archivo objetivo (para el matching de reglas condicionales)
 * @param processedPaths Conjunto de rutas ya procesadas (se muta)
 * @returns Array de objetos MemoryFileInfo
 */
export async function getConditionalRulesForCwdLevelDirectory(
  dir: string,
  targetPath: string,
  processedPaths: Set<string>,
): Promise<MemoryFileInfo[]> {
  const rulesDir = join(dir, '.claude', 'rules')
  return processConditionedMdRules(
    targetPath,
    rulesDir,
    'Project',
    processedPaths,
    false,
  )
}
/**
 * Reglas condicionales Managed y User que matchean `targetPath`.
 * Primera fase de la carga de memoria anidada.
 */
export async function getManagedAndUserConditionalRules(
  targetPath: string,
  processedPaths: Set<string>,
): Promise<MemoryFileInfo[]> {
  const config = loaderConfig()
  const result: MemoryFileInfo[] = []

  result.push(
    ...(await processConditionedMdRules(
      targetPath,
      join(config.managedDir, '.claude', 'rules'),
      'Managed',
      processedPaths,
      false,
    )),
  )

  if (config.userEnabled) {
    result.push(
      ...(await processConditionedMdRules(
        targetPath,
        join(config.configHome, 'rules'),
        'User',
        processedPaths,
        true,
      )),
    )
  }

  return result
}
function handleMemoryFileReadError(error: unknown, filePath: string): void {
  const code = getErrnoCode(error)
  // ENOENT = el archivo no existe, EISDIR = es un directorio — ambos esperados
  if (code === 'ENOENT' || code === 'EISDIR') {
    return
  }
  // Los errores de permisos (EACCES) son accionables, se registran
  if (code === 'EACCES') {
    let homeDir = ''
    try {
      // @thyrox/config depende de este paquete (ver loaderConfig arriba):
      // se resuelve tarde con require, nunca por import estático.
      const env = require('@thyrox/config/env/utils.js') as {
        getClaudeConfigHomeDir?: () => string
      }
      homeDir = env.getClaudeConfigHomeDir?.() ?? ''
    } catch {
      homeDir = ''
    }
    // No se registra la ruta completa por PII/seguridad
    logEvent('tengu_claude_md_permission_error', {
      is_access_error: 1,
      has_home_dir: filePath.includes(homeDir) ? 1 : 0,
    })
  }
}

/**
 * La usa processMemoryFile → getMemoryFiles para que el event loop siga
 * respondiendo durante el recorrido del directorio (muchos intentos de
 * readFile, casi todos ENOENT). Cuando se da includeBasePath, las rutas
 * @include se resuelven en el mismo paso léxico y se devuelven junto al
 * archivo parseado.
 */
async function safelyReadMemoryFileAsync(
  filePath: string,
  type: MemoryType,
  includeBasePath?: string,
): Promise<{ info: MemoryFileInfo | null; includePaths: string[] }> {
  try {
    const fs = getFsImplementation()
    const rawContent = await fs.readFile(filePath, { encoding: 'utf-8' })
    return parseMemoryFileContent(rawContent, filePath, type, includeBasePath)
  } catch (error) {
    handleMemoryFileReadError(error, filePath)
    return { info: null, includePaths: [] }
  }
}
/**
 * Comprueba si una ruta de CLAUDE.md queda excluida por `claudeMdExcludes`.
 * Sólo aplica a los tipos User, Project y Local; Managed, AutoMem y TeamMem
 * nunca se excluyen.
 *
 * Cotejar tanto la ruta original como la resuelta por realpath cubre
 * symlinks (p. ej. /tmp -> /private/tmp en macOS).
 */
function isClaudeMdExcluded(filePath: string, type: MemoryType): boolean {
  if (type !== 'User' && type !== 'Project' && type !== 'Local') {
    return false
  }

  const patterns = getInitialSettings().claudeMdExcludes
  if (!patterns || patterns.length === 0) {
    return false
  }

  const matchOpts = { dot: true }
  const normalizedPath = filePath.replaceAll('\\', '/')

  const expandedPatterns = resolveExcludePatterns(patterns).filter(
    p => p.length > 0,
  )
  if (expandedPatterns.length === 0) {
    return false
  }

  return safePicomatch(normalizedPath, expandedPatterns, matchOpts)
}

// pendiente: parseMemoryFileContent — depende de `Lexer` de `marked` (npm, no
// instalado; misma ausencia que `stripHtmlComments` ya declara arriba) para
// compartir tokens entre el strip de comentarios y la extracción de
// `@include`, y de `truncateEntrypointContent`
// (`@claude-code-how-works/memory/memdir`, portado en `@thyrox/memory/memdir.js`
// pero no declarado como dependencia de `@thyrox/storage`) para el truncado de
// MEMORY.md. Nada en este árbol referencia hoy esta función; `readMemoryFile`
// ya cubre el mismo propósito con las variantes divergentes basadas en
// contenido (`stripHtmlComments`, `extractIncludePaths`) de este archivo.
/** `pathInOriginalCwd`: si la ruta cae dentro del cwd original de la sesión. */
function pathInOriginalCwd(path: string): boolean {
  return pathInWorkingPath(path, loaderConfig().originalCwd)
}

/**
 * Procesa recursivamente un archivo de memoria y sus referencias `@include`.
 * Devuelve un array de `MemoryFileInfo` con los includes primero y el
 * archivo principal al final.
 */
export async function processMemoryFile(
  filePath: string,
  type: MemoryType,
  processedPaths: Set<string>,
  includeExternal: boolean,
  depth: number = 0,
  parent?: string,
): Promise<MemoryFileInfo[]> {
  // Se omite si ya fue procesado o si se excedió la profundidad máxima.
  // Las rutas se normalizan para la comparación por las diferencias de
  // mayúsculas en la letra de unidad de Windows (p. ej. C:\Users vs c:\Users).
  const normalizedPath = normalizePathForComparison(filePath)
  if (processedPaths.has(normalizedPath) || depth >= MAX_INCLUDE_DEPTH) {
    return []
  }

  // Se omite si la ruta está excluida por el ajuste claudeMdExcludes
  if (isClaudeMdExcluded(filePath, type)) {
    return []
  }

  // Resuelve el symlink temprano para la resolución de @import
  const { resolvedPath, isSymlink } = safeResolvePath(getFsImplementation(), filePath)

  processedPaths.add(normalizedPath)
  if (isSymlink) {
    processedPaths.add(normalizePathForComparison(resolvedPath))
  }

  const { info: memoryFile, includePaths: resolvedIncludePaths } =
    await safelyReadMemoryFileAsync(filePath, type, resolvedPath)
  if (!memoryFile || !memoryFile.content.trim()) {
    return []
  }

  // Añade la información del padre
  if (parent) {
    memoryFile.parent = parent
  }

  const result: MemoryFileInfo[] = []

  // Añade el archivo principal primero (el padre antes que los hijos)
  result.push(memoryFile)

  for (const resolvedIncludePath of resolvedIncludePaths) {
    const isExternal = !pathInOriginalCwd(resolvedIncludePath)
    if (isExternal && !includeExternal) {
      continue
    }

    // Procesa recursivamente los archivos incluidos con este archivo como padre
    const includedFiles = await processMemoryFile(
      resolvedIncludePath,
      type,
      processedPaths,
      includeExternal,
      depth + 1,
      filePath, // Pasa el archivo actual como padre
    )
    result.push(...includedFiles)
  }

  return result
}
/**
 * Processes all .md files in the .claude/rules/ directory and its subdirectories,
 * filtering to only include files with frontmatter paths that match the target path
 * @param targetPath The file path to match against frontmatter glob patterns
 * @param rulesDir The path to the rules directory
 * @param type Type of memory file (User, Project, Local)
 * @param processedPaths Set of already processed file paths
 * @param includeExternal Whether to include external files
 * @returns Array of MemoryFileInfo objects that match the target path
 */
export async function processConditionedMdRules(
  targetPath: string,
  rulesDir: string,
  type: MemoryType,
  processedPaths: Set<string>,
  includeExternal: boolean,
): Promise<MemoryFileInfo[]> {
  const conditionedRuleMdFiles = await processMdRules({
    rulesDir,
    type,
    processedPaths,
    includeExternal,
    conditionalRule: true,
  })

  // Filter to only include files whose globs patterns match the targetPath
  return conditionedRuleMdFiles.filter(file => {
    if (!file.globs || file.globs.length === 0) {
      return false
    }

    // For Project rules: glob patterns are relative to the directory containing .claude
    // For Managed/User rules: glob patterns are relative to the original CWD
    const baseDir =
      type === 'Project'
        ? dirname(dirname(rulesDir)) // Parent of .claude
        : getOriginalCwd() // Project root for managed/user rules

    const relativePath = isAbsolute(targetPath)
      ? relative(baseDir, targetPath)
      : targetPath
    // ignore() throws on empty strings, paths escaping the base (../),
    // and absolute paths (Windows cross-drive relative() returns absolute).
    // Files outside baseDir can't match baseDir-relative globs anyway.
    if (
      !relativePath ||
      relativePath.startsWith('..') ||
      isAbsolute(relativePath)
    ) {
      return false
    }
    return safeIgnoreMatch(file.globs, relativePath)
  })
}
/**
 * Recorre `.claude/rules/` y sus subdirectorios cargando cada `.md` como
 * entrada de memoria, separando las que llevan frontmatter `paths:`
 * (`conditionalRule`) de las que no.
 */
export async function processMdRules({
  rulesDir,
  type,
  processedPaths,
  includeExternal,
  conditionalRule,
  visitedDirs = new Set(),
}: {
  rulesDir: string
  type: MemoryType
  processedPaths: Set<string>
  includeExternal: boolean
  conditionalRule: boolean
  visitedDirs?: Set<string>
}): Promise<MemoryFileInfo[]> {
  if (visitedDirs.has(rulesDir)) {
    return []
  }

  try {
    const fs = getFsImplementation()

    const { resolvedPath: resolvedRulesDir, isSymlink } = safeResolvePath(fs, rulesDir)

    visitedDirs.add(rulesDir)
    if (isSymlink) {
      visitedDirs.add(resolvedRulesDir)
    }

    const result: MemoryFileInfo[] = []
    let entries: Dirent[]
    try {
      entries = await fs.readdir(resolvedRulesDir)
    } catch (e: unknown) {
      const code = getErrnoCode(e)
      if (code === 'ENOENT' || code === 'EACCES' || code === 'ENOTDIR') {
        return []
      }
      throw e
    }

    for (const entry of entries) {
      const entryPath = join(rulesDir, entry.name)
      const { resolvedPath: resolvedEntryPath, isSymlink } = safeResolvePath(fs, entryPath)

      // Usa los métodos de Dirent para los no-symlink y evita un stat extra;
      // para un symlink hace falta stat para saber qué es el destino.
      const stats = isSymlink ? await fs.stat(resolvedEntryPath) : null
      const isDirectory = stats ? stats.isDirectory() : entry.isDirectory()
      const isFile = stats ? stats.isFile() : entry.isFile()

      if (isDirectory) {
        result.push(
          ...(await processMdRules({
            rulesDir: resolvedEntryPath,
            type,
            processedPaths,
            includeExternal,
            conditionalRule,
            visitedDirs,
          })),
        )
      } else if (isFile && entry.name.endsWith('.md')) {
        const files = await processMemoryFile(resolvedEntryPath, type, processedPaths, includeExternal)
        result.push(...files.filter(f => (conditionalRule ? f.globs : !f.globs)))
      }
    }

    return result
  } catch (error) {
    if (error instanceof Error && error.message.includes('EACCES')) {
      logEvent('tengu_claude_rules_md_permission_error', {
        is_access_error: 1,
        has_home_dir: rulesDir.includes(loaderConfig().configHome) ? 1 : 0,
      })
    }
    return []
  }
}
/**
 * Expande los patrones de exclusión resolviendo enlaces simbólicos en los
 * prefijos de ruta absolutos. Para cada patrón absoluto (que empieza por /),
 * intenta resolver el prefijo de directorio existente más largo vía
 * `realpathSync` y añade la versión resuelta. Los patrones glob (con `*`)
 * resuelven su prefijo estático.
 */
function resolveExcludePatterns(patterns: string[]): string[] {
  const expanded: string[] = patterns.map(p => p.replaceAll('\\', '/'))

  for (const normalized of expanded) {
    // Sólo se resuelven los patrones absolutos — los patrones puramente glob
    // como "**/*.md" no tienen un prefijo de sistema de archivos que resolver
    if (!normalized.startsWith('/')) {
      continue
    }

    // Encuentra el prefijo estático antes de cualquier carácter de glob
    const globStart = normalized.search(/[*?{[]/)
    const staticPrefix =
      globStart === -1 ? normalized : normalized.slice(0, globStart)
    const dirToResolve = dirname(staticPrefix)

    try {
      // IO síncrona: se llama desde contexto síncrono (isClaudeMdExcluded -> processMemoryFile -> getMemoryFiles)
      const resolvedDir = realpathSync(dirToResolve).replaceAll('\\', '/')
      if (resolvedDir !== dirToResolve) {
        const resolvedPattern =
          resolvedDir + normalized.slice(dirToResolve.length)
        expanded.push(resolvedPattern)
      }
    } catch {
      // El directorio no existe; se omite la resolución para este patrón
    }
  }

  return expanded
}

// --- porte por miembros: un ancla por ítem ---
export function consumeNextEagerLoadReason(): InstructionsLoadReason | undefined {
  if (!shouldFireHook) return undefined
  shouldFireHook = false
  const reason = nextEagerLoadReason
  nextEagerLoadReason = 'session_start'
  return reason
}
// Extrae referencias de inclusión @path de tokens ya lexeados y las
// resuelve a rutas absolutas. Salta los tokens html para que los @paths
// dentro de comentarios de bloque se ignoren — quien llama puede pasar
// tokens previos al strip.
// El parámetro se tipa como `MarkdownToken[]` (no `ReturnType<Lexer['lex']>`
// de la fuente): `marked` no es dependencia de `@thyrox/storage`, y el
// cuerpo ya trataba `tokens` como `MarkdownToken[]` al final.
function extractIncludePathsFromTokens(
  tokens: MarkdownToken[],
  basePath: string,
): string[] {
  const absolutePaths = new Set<string>()

  // Extrae @paths de un texto y agrega las rutas resueltas a absolutePaths.
  function extractPathsFromText(textContent: string) {
    const includeRegex = /(?:^|\s)@((?:[^\s\\]|\\ )+)/g
    let match
    while ((match = includeRegex.exec(textContent)) !== null) {
      let path = match[1]
      if (!path) continue

      // Quita identificadores de fragmento (#heading, #section-name, etc.)
      const hashIndex = path.indexOf('#')
      if (hashIndex !== -1) {
        path = path.substring(0, hashIndex)
      }
      if (!path) continue

      // Desescapa los espacios en la ruta
      path = path.replace(/\\ /g, ' ')

      // Acepta @path, @./path, @~/path, o @/path
      if (path) {
        const isValidPath =
          path.startsWith('./') ||
          path.startsWith('~/') ||
          (path.startsWith('/') && path !== '/') ||
          (!path.startsWith('@') &&
            !path.match(/^[#%^&*()]+/) &&
            path.match(/^[a-zA-Z0-9._-]/))

        if (isValidPath) {
          const resolvedPath = expandPath(path, dirname(basePath))
          absolutePaths.add(resolvedPath)
        }
      }
    }
  }

  // Procesa elementos recursivamente para encontrar nodos de texto
  function processElements(elements: MarkdownToken[]) {
    for (const element of elements) {
      if (element.type === 'code' || element.type === 'codespan') {
        continue
      }

      // Para tokens html que contienen comentarios, quita los tramos de
      // comentario y revisa el residuo por @paths (p. ej.
      // `<!-- note --> @./file.md`). Otros tokens html (etiquetas que no son
      // comentario) se saltan por completo.
      if (element.type === 'html') {
        const raw = element.raw || ''
        const trimmed = raw.trimStart()
        if (trimmed.startsWith('<!--') && trimmed.includes('-->')) {
          const commentSpan = /<!--[\s\S]*?-->/g
          const residue = raw.replace(commentSpan, '')
          if (residue.trim().length > 0) {
            extractPathsFromText(residue)
          }
        }
        continue
      }

      // Procesa nodos de texto
      if (element.type === 'text') {
        extractPathsFromText(element.text || '')
      }

      // Recurre en los tokens hijos
      if (element.tokens) {
        processElements(element.tokens)
      }

      // Manejo especial para estructuras de lista
      if (element.items) {
        processElements(element.items)
      }
    }
  }

  processElements(tokens)
  return [...absolutePaths]
}
/**
 * Obtiene los archivos de memoria de un único directorio anidado (entre el
 * CWD y el destino). Carga CLAUDE.md, reglas incondicionales y reglas
 * condicionales de ese directorio.
 *
 * @param dir El directorio a procesar
 * @param targetPath La ruta del archivo objetivo (para el matching de reglas condicionales)
 * @param processedPaths Conjunto de rutas ya procesadas (se muta)
 * @returns Array de objetos MemoryFileInfo
 */
export async function getMemoryFilesForNestedDirectory(
  dir: string,
  targetPath: string,
  processedPaths: Set<string>,
): Promise<MemoryFileInfo[]> {
  const config = loaderConfig()
  const result: MemoryFileInfo[] = []

  // Procesa los archivos de memoria del proyecto (CLAUDE.md y .claude/CLAUDE.md)
  if (config.projectEnabled) {
    const projectPath = join(dir, 'CLAUDE.md')
    result.push(
      ...(await processMemoryFile(
        projectPath,
        'Project',
        processedPaths,
        false,
      )),
    )
    const dotClaudePath = join(dir, '.claude', 'CLAUDE.md')
    result.push(
      ...(await processMemoryFile(
        dotClaudePath,
        'Project',
        processedPaths,
        false,
      )),
    )
  }

  // Procesa el archivo de memoria local (CLAUDE.local.md)
  if (config.localEnabled) {
    const localPath = join(dir, 'CLAUDE.local.md')
    result.push(
      ...(await processMemoryFile(localPath, 'Local', processedPaths, false)),
    )
  }

  const rulesDir = join(dir, '.claude', 'rules')

  // Procesa las reglas incondicionales del proyecto en .claude/rules/*.md, que no se cargaron de forma anticipada.
  // Usa un set de processedPaths separado para no marcar los archivos de reglas condicionales como procesados
  const unconditionalProcessedPaths = new Set(processedPaths)
  result.push(
    ...(await processMdRules({
      rulesDir,
      type: 'Project',
      processedPaths: unconditionalProcessedPaths,
      includeExternal: false,
      conditionalRule: false,
    })),
  )

  // Procesa las reglas condicionales del proyecto en .claude/rules/*.md
  result.push(
    ...(await processConditionedMdRules(
      targetPath,
      rulesDir,
      'Project',
      processedPaths,
      false,
    )),
  )

  // processedPaths se siembra con las rutas incondicionales para los directorios subsiguientes
  for (const path of unconditionalProcessedPaths) {
    processedPaths.add(path)
  }

  return result
}
export function isInstructionsMemoryType(
  type: MemoryType,
): type is InstructionsMemoryType {
  return (
    type === 'User' ||
    type === 'Project' ||
    type === 'Local' ||
    type === 'Managed'
  )
}
/**
 * Parsea el contenido crudo para extraer tanto el contenido como los
 * patrones de glob del frontmatter.
 * @param rawContent Contenido crudo del archivo con frontmatter
 * @returns Objeto con content y globs (undefined si no hay paths o el patrón es match-all)
 */
function parseFrontmatterPaths(rawContent: string): {
  content: string
  paths?: string[]
} {
  const { frontmatter, content } = parseFrontmatter(rawContent)

  if (!frontmatter.paths) {
    return { content }
  }

  const patterns = splitPathInFrontmatter(frontmatter.paths)
    .map(pattern => {
      // Quita el sufijo /** - la librería de ignore trata 'path' como coincidente
      // tanto con el propio path como con todo lo que contiene
      return pattern.endsWith('/**') ? pattern.slice(0, -3) : pattern
    })
    .filter((p: string) => p.length > 0)

  // Si todos los patrones son ** (match-all), se trata como sin globs (undefined)
  // Esto significa que el archivo aplica a todos los paths
  if (patterns.length === 0 || patterns.every((p: string) => p === '**')) {
    return { content }
  }

  return { content, paths: patterns }
}
/**
 * Analiza el contenido crudo de un archivo de memoria en un `MemoryFileInfo`.
 * Función pura — sin I/O.
 *
 * Cuando se da `includeBasePath`, las rutas `@include` se resuelven en el
 * mismo paso de lexer y se devuelven junto al archivo parseado, para que
 * `processMemoryFile` no tenga que analizar el mismo contenido dos veces.
 *
 * pendiente: el truncado de `MEMORY.md` para `AutoMem`/`TeamMem`
 * (`truncateEntrypointContent`, `@claude-code-how-works/memory/memdir`) no se
 * aplica — ese símbolo vive en `@thyrox/memory/memdir.ts` pero el paquete no
 * expone `./memdir` en su `exports` map ni es dependencia declarada de
 * `@thyrox/storage` (`node_modules/@thyrox/memory` no está enlazado desde
 * este paquete); la misma ausencia que ya declara la cabecera de este
 * archivo para `stripHtmlComments` y `filterInjectedMemoryFiles`.
 */
function parseMemoryFileContent(
  rawContent: string,
  filePath: string,
  type: MemoryType,
  includeBasePath?: string,
): { info: MemoryFileInfo | null; includePaths: string[] } {
  // Salta archivos no-texto para no cargar datos binarios (imágenes, PDFs…) en memoria.
  const ext = extname(filePath).toLowerCase()
  if (ext && !TEXT_FILE_EXTENSIONS.has(ext)) {
    logForDebugging(`Skipping non-text file in @include: ${filePath}`)
    return { info: null, includePaths: [] }
  }

  const { content: withoutFrontmatter, paths } =
    parseFrontmatterPaths(rawContent)

  // Un solo lex para que strip y la extracción de @include compartan tokens.
  // gfm:false lo exige la extracción (para que ~/ruta no tokenice como
  // tachado) y no afecta al strip (los bloques HTML son regla CommonMark).
  const hasComment = withoutFrontmatter.includes('<!--')
  const tokens =
    hasComment || includeBasePath !== undefined
      ? new Lexer({ gfm: false }).lex(withoutFrontmatter)
      : undefined

  // Sólo se reconstruye vía tokens cuando de verdad hay un comentario que
  // quitar — marked normaliza \r\n al lexear, así que ir y volver por
  // token.raw invertiría un archivo CRLF sin comentarios en
  // contentDiffersFromDisk de forma espuria.
  const strippedContent =
    hasComment && tokens
      ? stripHtmlCommentsFromTokens(tokens).content
      : withoutFrontmatter

  const includePaths =
    tokens && includeBasePath !== undefined
      ? extractIncludePathsFromTokens(tokens, includeBasePath)
      : []

  const finalContent = strippedContent

  // Cubre el strip de frontmatter y el strip de comentarios HTML.
  const contentDiffersFromDisk = finalContent !== rawContent
  return {
    info: {
      path: filePath,
      type,
      content: finalContent,
      globs: paths,
      contentDiffersFromDisk,
      rawContent: contentDiffersFromDisk ? rawContent : undefined,
    },
    includePaths,
  }
}
/**
 * Quita los comentarios HTML de los tokens de `marked`, conservando el resto
 * de la línea que CommonMark incluye en el bloque. Porte de
 * `ccnmt: packages/storage/src/claudemd.ts:312-343`; lo llama
 * `parseMemoryFileContent`. Se trae ahora que `marked` es dependencia
 * declarada de `@thyrox/storage`.
 */
function stripHtmlCommentsFromTokens(tokens: ReturnType<Lexer['lex']>): {
  content: string
  stripped: boolean
} {
  let result = ''
  let stripped = false

  // Un comentario HTML bien formado. No codicioso para que varios comentarios
  // en la misma línea se emparejen por separado; [\s\S] para cruzar saltos.
  const commentSpan = /<!--[\s\S]*?-->/g

  for (const token of tokens) {
    if (token.type === 'html') {
      const trimmed = token.raw.trimStart()
      if (trimmed.startsWith('<!--') && trimmed.includes('-->')) {
        // En CommonMark un bloque HTML de tipo 2 termina en la LÍNEA que
        // contiene `-->`: lo que siga en esa línea pertenece al token. Se
        // quitan sólo los comentarios y se conserva el residuo.
        const residue = token.raw.replace(commentSpan, '')
        stripped = true
        if (residue.trim().length > 0) {
          result += residue
        }
        continue
      }
    }
    result += token.raw
  }

  return { content: result, stripped }
}


// File extensions that are allowed for @include directives
// This prevents binary files (images, PDFs, etc.) from being loaded into memory
const TEXT_FILE_EXTENSIONS = new Set([
  // Markdown and text
  '.md',
  '.txt',
  '.text',
  // Data formats
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.xml',
  '.csv',
  // Web
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.sass',
  '.less',
  // JavaScript/TypeScript
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  // Python
  '.py',
  '.pyi',
  '.pyw',
  // Ruby
  '.rb',
  '.erb',
  '.rake',
  // Go
  '.go',
  // Rust
  '.rs',
  // Java/Kotlin/Scala
  '.java',
  '.kt',
  '.kts',
  '.scala',
  // C/C++
  '.c',
  '.cpp',
  '.cc',
  '.cxx',
  '.h',
  '.hpp',
  '.hxx',
  // C#
  '.cs',
  // Swift
  '.swift',
  // Shell
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.ps1',
  '.bat',
  '.cmd',
  // Config
  '.env',
  '.ini',
  '.cfg',
  '.conf',
  '.config',
  '.properties',
  // Database
  '.sql',
  '.graphql',
  '.gql',
  // Protocol
  '.proto',
  // Frontend frameworks
  '.vue',
  '.svelte',
  '.astro',
  // Templating
  '.ejs',
  '.hbs',
  '.pug',
  '.jade',
  // Other languages
  '.php',
  '.pl',
  '.pm',
  '.lua',
  '.r',
  '.R',
  '.dart',
  '.ex',
  '.exs',
  '.erl',
  '.hrl',
  '.clj',
  '.cljs',
  '.cljc',
  '.edn',
  '.hs',
  '.lhs',
  '.elm',
  '.ml',
  '.mli',
  '.f',
  '.f90',
  '.f95',
  '.for',
  // Build files
  '.cmake',
  '.make',
  '.makefile',
  '.gradle',
  '.sbt',
  // Documentation
  '.rst',
  '.adoc',
  '.asciidoc',
  '.org',
  '.tex',
  '.latex',
  // Lock files (often text-based)
  '.lock',
  // Misc
  '.log',
  '.diff',
  '.patch',
])

type MarkdownToken = {
  type: string
  text?: string
  href?: string
  tokens?: MarkdownToken[]
  raw?: string
  items?: MarkdownToken[]
}

// Load reason to report for top-level (non-included) files on the next eager
// getMemoryFiles() pass. Set to 'compact' by resetGetMemoryFilesCache when
// compaction clears the cache, so the InstructionsLoaded hook reports the
// reload correctly instead of misreporting it as 'session_start'. One-shot:
// reset to 'session_start' after being read.
let nextEagerLoadReason: InstructionsLoadReason = 'session_start'

// Whether the InstructionsLoaded hook should fire on the next cache miss.
// true initially (for session_start), consumed after firing, re-enabled only
// by resetGetMemoryFilesCache(). Callers that only need cache invalidation
// for correctness (e.g. worktree enter/exit, settings sync, /memory dialog)
// should use clearMemoryFileCaches() instead to avoid spurious hook fires.
let shouldFireHook = true
