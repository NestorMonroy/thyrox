/**
 * El compilador de reglas de archivo: convierte las reglas `Read(...)` y
 * `Edit(...)` de un contexto de permisos en matchers de estilo gitignore
 * agrupados por raíz, y responde qué regla gobierna una ruta.
 *
 * Reimplementación del contrato de 2.1.275 (`chunk-9apg35nm.js`), no copia:
 *
 *   `patternWithRoot` ≙ `jYe` + `E_n` · `sanitizeRulePattern` ≙ `to` ·
 *   `compileRuleMatchers` ≙ `Bn` · `matchingRuleForInput` ≙ `_a` ·
 *   `allPathsMatchAllowRule` ≙ `myt` · `getFileReadIgnorePatterns` ≙ `BYe` ·
 *   `normalizePatternsToPath` ≙ `pyt` (con `Ps`, `Ms`, `Fu`, `Fn`).
 *
 * Divergencias declaradas:
 *
 * - Las fuentes de reglas son las que `getAllowRules`/`getDenyRules`/
 *   `getAskRules` de `./permissions.ts` ya recorren: las de settings más
 *   `cliArg`, `command` y `session`. El binario suma `toolsNarrowing`,
 *   `mcpServerPolicy` y `hostCredential`, que este árbol no emite.
 * - En auto mode el binario retira del permiso las reglas peligrosas
 *   (`n0`: Bash, PowerShell, Agent, REPL y herramientas de MCP). Este
 *   compilador sólo lee reglas de `Read` y `Edit`, que ese filtro nunca
 *   retira, así que omitirlo no cambia ningún veredicto. La variante
 *   `CLAUDE_CODE_EVAL_CONFINED`, que sí cambia el resultado (el permiso se
 *   reduce a `cliArg`), está portada.
 * - La resolución del prefijo de un gemelo físico usa
 *   `resolveDeepestExistingAncestorSync` de `@thyrox/storage`; el `uI` del
 *   binario añade además defensas de UNC y automount que aquí no aplican
 *   porque el gemelo sólo se busca fuera de Windows y bajo raíz absoluta.
 * - El aviso de patrón inutilizable va al registro de depuración del
 *   anfitrión; el binario además emite `tengu_uncompilable_ignore_pattern`,
 *   que este árbol no tiene a quién enviar.
 */
import ignore from 'ignore'
import * as nodeFs from 'node:fs'
import { homedir } from 'node:os'
import * as nodePath from 'node:path'
import { getPlatform } from '@thyrox/config/platform.js'
import {
  resolveDeepestExistingAncestorSync,
  safeResolvePath,
} from '@thyrox/storage/fsOperations.js'
import { getPermissionHostBindings } from './host.js'
import { getAllowRules, getAskRules, getDenyRules } from './permissions.js'
import type { ToolPermissionContext } from './permissions.js'
import type {
  PermissionBehavior,
  PermissionRule,
  PermissionRuleSource,
} from './permissionTypes.js'

export type FileToolType = 'edit' | 'read'

type Matcher = {
  source: PermissionRuleSource | null
  patternMap: Map<string, PermissionRule>
  getIg: () => ReturnType<typeof ignore>
}

export type RuleBucket = {
  patternMap: Map<string, PermissionRule>
  matchers: Matcher[]
}

export type CompiledRuleMatchers = Map<string | null, RuleBucket>

const SEP = nodePath.sep
const FILE_EDIT_TOOL_NAME = 'Edit'
const FILE_READ_TOOL_NAME = 'Read'
// El matcher de `ignore` guarda un caché de rutas probadas que crece sin
// cota; el binario lo reconstruye cada 10 000 consultas.
const MATCHER_REBUILD_EVERY = 10_000
// Entradas por conjunto de reglas en el caché de compilación.
const COMPILED_CACHE_ENTRIES = 16
const UNUSABLE_PATTERN = /^\s*$|^#|(?:^|[^\\])\\$/
const GLOB_SEGMENT = /(?:^|[^\\])(?:\\\\)*[*?[]/

// ---- Estado de proceso (≙ la clase `ds` y el caché de avisos `ts`) ----

const compiledPatternsByRules = new WeakMap<object, Map<string, CompiledRuleMatchers>>()
const physicalTwinsByPattern = new Map<string, Set<string>>()
let trustedSymlinkEquivalences: Map<string, string> | undefined
const compileErrorMessages = new Map<string, string | null>()
const warnedPatterns = new Set<string>()

export function resetRuleMatchingCachesForTesting(): void {
  physicalTwinsByPattern.clear()
  trustedSymlinkEquivalences = undefined
  compileErrorMessages.clear()
  warnedPatterns.clear()
}

// ---- Entorno ----

function platform(): string {
  return getPlatform()
}

function getCwdDeferred(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/app-host/bootstrap/cwd.js') as { getCwd: () => string }).getCwd()
  } catch {
    return process.cwd()
  }
}

function getOriginalCwdDeferred(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/app-host/bootstrap/state.js') as { getOriginalCwd: () => string }).getOriginalCwd()
  } catch {
    return process.cwd()
  }
}

function getClaudeConfigHomeDirDeferred(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/config/env/utils.js') as { getClaudeConfigHomeDir: () => string }).getClaudeConfigHomeDir()
  } catch {
    return nodePath.join(homedir(), '.claude')
  }
}

function expandPathDeferred(path: string, baseDir?: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/storage/path.js') as { expandPath: (p: string, b?: string) => string }).expandPath(path, baseDir)
  } catch {
    return nodePath.resolve(baseDir ?? process.cwd(), path)
  }
}

function settingsRootForSource(source: PermissionRuleSource): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/config/settings') as { getSettingsRootPathForSource: (s: string) => string }).getSettingsRootPathForSource(source)
  } catch {
    return getOriginalCwdDeferred()
  }
}

function logWarning(message: string): void {
  try {
    getPermissionHostBindings().logDebug?.(message, { level: 'warn' })
  } catch {
    // sin anfitrión no hay a quién avisar
  }
}

// ---- Primitivas de ruta ----

/** Pliegue de mayúsculas para comparar rutas (≙ `_o`). */
export function foldPathCase(path: string): string {
  return path.toLowerCase().replace(/ı/g, 'i').replace(/ſ/g, 's')
}

function toPosixOnWindows(path: string): string {
  return path.replace(/\\/g, '/')
}

/** Ruta relativa, en forma posix en Windows (≙ `zge`). */
function relativeForMatching(from: string, to: string): string {
  if (platform() === 'windows') {
    return nodePath.relative(toPosixOnWindows(from), toPosixOnWindows(to))
  }
  return nodePath.relative(from, to)
}

/** En Windows normaliza y quita la barra final (≙ `jn`). */
function normalizeRootForPlatform(path: string): string {
  if (platform() !== 'windows') return path
  const normalized = nodePath.normalize(toPosixOnWindows(path))
  return normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}

// ---- Escape de patrones (≙ `Kle` y `oEt`, `chunk-cwfdaz1m.js`) ----

const IGNORE_META_CHAR = /^[\\[\]!#()|+^$*?\s]$/

/** Escapa una ruta literal para que `ignore` la lea como tal. */
export function escapeForIgnore(path: string, options?: { escapeGlobs?: boolean }): string {
  let escaped = path.replaceAll('\\', '\\\\').replace(/[[\]()|+^$]/g, ch => `\\${ch}`)
  if (options?.escapeGlobs) escaped = escaped.replaceAll('*', '\\*')
  if (escaped.startsWith('!') || escaped.startsWith('#')) escaped = `\\${escaped}`
  return escaped.replace(/\s+$/, tail => Array.from(tail, ch => `\\${ch}`).join(''))
}

/** Quita el escape a los metacaracteres de `ignore`, y a nada más. */
export function unescapeIgnoreMeta(pattern: string): string {
  return pattern.replace(/\\([^])/g, (whole, ch: string) => (IGNORE_META_CHAR.test(ch) ? ch : whole))
}

// ---- Validez de un patrón (≙ `kr`, `Oc`, `Mr`) ----

function compileErrorMessage(pattern: string): string | null {
  const cached = compileErrorMessages.get(pattern)
  if (cached !== undefined) return cached
  let message: string | null
  try {
    ignore().add([pattern]).ignores('probe')
    message = null
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }
  compileErrorMessages.set(pattern, message)
  return message
}

/** Por qué `ignore` no puede usar el patrón, o null si puede. */
export function unusablePatternReason(pattern: string): string | null {
  return UNUSABLE_PATTERN.test(pattern)
    ? 'skipped by the ignore library (blank, comment, or trailing backslash)'
    : compileErrorMessage(pattern)
}

function warnUnusablePattern(pattern: string, reason: string, consequence: string): void {
  const key = `permission_rules\x00${pattern}`
  if (warnedPatterns.has(key)) return
  warnedPatterns.add(key)
  logWarning(`[permission_rules] gitignore-style pattern is unusable (${reason}); ${consequence}: ${pattern}`)
}

// ---- Forma del patrón ----

/** Colapsa barras repetidas y neutraliza un BOM inicial (≙ `St`). */
export function normalizeRuleBody(pattern: string): string {
  const collapsed = pattern.replace(/\/{2,}/g, '/')
  if (/^\s*(?:\/\*\*)?$/.test(collapsed)) return collapsed
  return collapsed
    .replace(/^﻿([!#]?)/, (_whole, lead: string) => (lead ? `\\${lead}` : ''))
    .replace(/^﻿/, '[﻿]')
}

/**
 * La forma que `ignore` recibe de un patrón terminado en `/**` (≙ `on`): el
 * directorio mismo, que en gitignore ya cubre todo lo que cuelga de él. Un
 * permiso de un solo segmento se ancla, para no abrir ese nombre en
 * cualquier profundidad.
 */
export function ignoreFormOfPattern(pattern: string, isAllow: boolean): string {
  if (!pattern.endsWith('/**')) return pattern
  const dir = pattern.slice(0, -3)
  if (!/[^/]/.test(dir)) return '/**'
  return dir.includes('/') || !isAllow || /^[!#]/.test(dir) ? dir : `/${dir}`
}

/**
 * Deja un patrón utilizable o lo descarta (≙ `to`). Un permiso inutilizable
 * se descarta: leerlo literal abriría algo que la regla no dice. Una
 * denegación inutilizable se lee literal, escapada: descartarla dejaría
 * abierto lo que la regla quiso cerrar. Una negación invierte el sentido.
 */
export function sanitizeRulePattern(pattern: string, isAllow: boolean): string | null {
  const form = ignoreFormOfPattern(pattern, isAllow)
  const reason =
    !isAllow && /^!\s*$/.test(form) ? 'a negation of every path' : unusablePatternReason(form)
  if (reason === null) return pattern
  const negation = pattern.startsWith('!') ? '!' : ''
  const drop = negation ? !isAllow : isAllow
  warnUnusablePattern(pattern, reason, drop ? 'dropping it' : 'matching the literal path it spells')
  if (drop) return null
  const tail = pattern.endsWith('/**') ? '/**' : ''
  const body = pattern.slice(negation.length, pattern.length - tail.length)
  return negation + escapeForIgnore(unescapeIgnoreMeta(body)) + tail
}

// ---- Raíz de un patrón (≙ `jYe` + `E_n`) ----

/** Directorio contra el que se lee un patrón `/…` de cada fuente. */
export function rootForRuleSource(source: PermissionRuleSource | string): string {
  switch (source) {
    case 'userSettings':
    case 'policySettings':
    case 'projectSettings':
    case 'localSettings':
    case 'flagSettings':
      return settingsRootForSource(source as PermissionRuleSource)
    default:
      return expandPathDeferred(getOriginalCwdDeferred())
  }
}

/**
 * Separa un patrón de regla en su raíz y el resto: `//x` es absoluto,
 * `~/x` cuelga del home, `/x` de la raíz de su fuente, y el resto no tiene
 * raíz (se lee contra el directorio de trabajo).
 */
export function patternWithRoot(
  pattern: string,
  source: PermissionRuleSource | string,
): { relativePattern: string; root: string | null } {
  let p = pattern
  const windows = platform() === 'windows'
  if (windows && (p.startsWith('~\\') || (p.startsWith('\\') && p[1] !== '!' && p[1] !== '#'))) {
    p = p.replaceAll('\\', '/')
  }
  if (p.startsWith(`${SEP}${SEP}`)) {
    const rest = p.slice(1)
    if (windows && /^\/[a-z]\//i.test(rest)) {
      const drive = rest[1]?.toUpperCase() ?? 'C'
      const tail = rest.slice(2)
      return { relativePattern: tail.startsWith('/') ? tail : `/${tail}`, root: `${drive}:\\` }
    }
    return { relativePattern: rest, root: SEP }
  }
  if (windows && /^[A-Za-z]:[/\\]/.test(p)) {
    const drive = p[0]!.toUpperCase()
    const tail = p.slice(2).replaceAll('\\', '/')
    return { relativePattern: tail.startsWith('/') ? tail : `/${tail}`, root: `${drive}:\\` }
  }
  if (p.startsWith(`~${SEP}`)) {
    return { relativePattern: p.slice(1), root: homedir().normalize('NFC') }
  }
  if (p.startsWith(SEP)) {
    return { relativePattern: p, root: rootForRuleSource(source) }
  }
  return { relativePattern: p.startsWith(`.${SEP}`) ? p.slice(2) : p, root: null }
}

// ---- Enlaces simbólicos de confianza (≙ `Uu`, `FGt`) ----

function getTrustedSymlinkEquivalences(): Map<string, string> {
  if (trustedSymlinkEquivalences !== undefined) return trustedSymlinkEquivalences
  const pairs: Array<[string, string]> = [
    ['/private/tmp', '/tmp'],
    ['/private/var', '/var'],
    ['/private/etc', '/etc'],
    ['/usr/bin', '/bin'],
    ['/usr/lib', '/lib'],
    ['/usr/sbin', '/sbin'],
  ]
  const found = new Map<string, string>()
  for (const [physical, spelled] of pairs) {
    try {
      if (nodeFs.realpathSync(spelled) === physical) found.set(physical, spelled)
    } catch {
      // el par no existe en esta máquina
    }
  }
  trustedSymlinkEquivalences = found
  return found
}

/** La ruta escrita con el nombre corto de un enlace de sistema de confianza. */
export function trustedSpellingOf(path: string): string {
  for (const [physical, spelled] of getTrustedSymlinkEquivalences()) {
    if (path === physical || path.startsWith(physical + SEP)) {
      return spelled + path.slice(physical.length)
    }
  }
  return path
}

// ---- Gemelo físico (≙ `Gu`) ----

/**
 * Si el prefijo literal de un patrón absoluto pasa por un enlace simbólico,
 * el mismo patrón escrito sobre el destino real. Sin él, `Read(//a/link/**)`
 * no alcanzaría `/a/real/x` aunque sean el mismo archivo.
 */
function physicalTwinOf(root: string, pattern: string): string | null {
  if (platform() === 'windows' || !pattern.startsWith('/')) return null
  const segments = pattern.slice(1).split('/')
  let literal = 0
  while (literal < segments.length && segments[literal] !== '' && !GLOB_SEGMENT.test(segments[literal]!)) {
    literal++
  }
  if (literal === 0) return null
  const prefix = nodePath.join(root, ...segments.slice(0, literal).map(unescapeIgnoreMeta))
  let resolved: string | undefined
  try {
    resolved = resolveDeepestExistingAncestorSync(nodeFs as never, prefix)
  } catch (error) {
    logWarning(`Could not resolve the physical twin of rule prefix ${prefix}: ${error}`)
    return null
  }
  if (resolved === undefined || resolved === prefix || resolved === SEP) return null
  const rest = segments.slice(literal)
  const twin = normalizeRuleBody(
    escapeForIgnore(resolved, { escapeGlobs: true }) + (rest.length > 0 ? `/${rest.join('/')}` : ''),
  )
  const form = ignoreFormOfPattern(twin, false)
  if (unusablePatternReason(form) !== null || (form !== twin && `${form}/**` !== twin)) return null
  return twin
}

// ---- Reglas por comportamiento (≙ `n0`, `ad`, `kh`, `rn`) ----

function rulesForBehavior(context: ToolPermissionContext, behavior: PermissionBehavior): PermissionRule[] {
  switch (behavior) {
    case 'allow':
      return process.env.CLAUDE_CODE_EVAL_CONFINED
        ? getAllowRules({ ...context, alwaysAllowRules: { cliArg: context.alwaysAllowRules.cliArg } })
        : getAllowRules(context)
    case 'deny':
      return getDenyRules(context)
    case 'ask':
      return getAskRules(context)
    default:
      return []
  }
}

function fileRulesForBehavior(
  context: ToolPermissionContext,
  toolName: string,
  behavior: PermissionBehavior,
): PermissionRule[] {
  return rulesForBehavior(context, behavior).filter(
    rule =>
      rule.ruleValue.toolName === toolName &&
      rule.ruleValue.ruleContent !== undefined &&
      rule.ruleBehavior === behavior,
  )
}

// ---- Compilación (≙ `Bn`) ----

/**
 * Las reglas de archivo de un comportamiento, agrupadas por raíz y con un
 * matcher por fuente. Las de denegación y consulta se guardan en caché por
 * conjunto de reglas y entorno; el permiso se deduplica por contenido.
 */
export function compileRuleMatchers(
  context: ToolPermissionContext,
  toolType: FileToolType,
  behavior: PermissionBehavior,
): CompiledRuleMatchers {
  const rulesObject =
    behavior === 'deny' ? context.alwaysDenyRules : behavior === 'ask' ? context.alwaysAskRules : null
  const cacheKey =
    rulesObject !== null
      ? [
          toolType,
          behavior,
          platform(),
          homedir(),
          getClaudeConfigHomeDirDeferred(),
          process.env.CLAUDE_CODE_EVAL_CONFINED ?? '',
          getOriginalCwdDeferred(),
        ].join('\x00')
      : null
  if (rulesObject !== null && cacheKey !== null) {
    const perRules = compiledPatternsByRules.get(rulesObject)
    const hit = perRules?.get(cacheKey)
    if (hit !== undefined && perRules !== undefined) {
      perRules.delete(cacheKey)
      perRules.set(cacheKey, hit)
      return hit
    }
  }

  const toolName = toolType === 'edit' ? FILE_EDIT_TOOL_NAME : FILE_READ_TOOL_NAME
  const isAllow = behavior === 'allow'
  const found = fileRulesForBehavior(context, toolName, behavior)
  const rules = isAllow
    ? Array.from(new Map(found.map(rule => [rule.ruleValue.ruleContent, rule])).values())
    : found

  const compiled: CompiledRuleMatchers = new Map()
  const slot = (root: string | null, source: PermissionRuleSource | null) => {
    let bucket = compiled.get(root)
    if (bucket === undefined) {
      bucket = { patternMap: new Map(), matchers: [] }
      compiled.set(root, bucket)
    }
    let matcher = bucket.matchers.find(m => m.source === source)
    if (matcher === undefined) {
      const patternMap = new Map<string, PermissionRule>()
      let ig: ReturnType<typeof ignore> | undefined
      let uses = 0
      matcher = {
        source,
        patternMap,
        getIg: () => {
          if (ig === undefined || ++uses > MATCHER_REBUILD_EVERY) {
            uses = 1
            ig = ignore().add(Array.from(patternMap.keys(), p => ignoreFormOfPattern(p, isAllow)))
          }
          return ig
        },
      }
      bucket.matchers.push(matcher)
    }
    return { bucket, matcher }
  }

  for (const rule of rules) {
    const content = rule.ruleValue.ruleContent
    if (content === undefined) continue
    const { relativePattern, root } = patternWithRoot(content, rule.source)
    const pattern = sanitizeRulePattern(normalizeRuleBody(relativePattern), isAllow)
    if (pattern === null) continue
    const source = isAllow ? null : rule.source
    const { bucket, matcher } = slot(root, source)
    // La última regla de una fuente gana: se reinserta para quedar al final.
    if (!isAllow) matcher.patternMap.delete(pattern)
    matcher.patternMap.set(pattern, rule)
    bucket.patternMap.set(pattern, rule)
    if (isAllow || root === null) continue

    const twinKey = `${root}\x00${pattern}`
    let twins = physicalTwinsByPattern.get(twinKey)
    if (twins === undefined) {
      twins = new Set()
      physicalTwinsByPattern.set(twinKey, twins)
    }
    const twin = physicalTwinOf(root, pattern)
    if (twin !== null) twins.add(twin)
    for (const known of twins) {
      const twinSlot = slot(SEP, source)
      if (!twinSlot.matcher.patternMap.has(known)) twinSlot.matcher.patternMap.set(known, rule)
      if (!twinSlot.bucket.patternMap.has(known)) twinSlot.bucket.patternMap.set(known, rule)
    }
  }

  if (rulesObject !== null && cacheKey !== null) {
    let perRules = compiledPatternsByRules.get(rulesObject)
    if (perRules === undefined) {
      perRules = new Map()
      compiledPatternsByRules.set(rulesObject, perRules)
    }
    if (perRules.size >= COMPILED_CACHE_ENTRIES) {
      const oldest = perRules.keys().next().value
      if (oldest !== undefined) perRules.delete(oldest)
    }
    perRules.set(cacheKey, compiled)
  }
  return compiled
}

// ---- Consultas ----

/**
 * La regla de `behavior` que gobierna `path` para `toolType`, o null (≙ `_a`).
 * Dentro de cada raíz, el matcher de la fuente de mayor precedencia se
 * consulta primero. La denegación y la consulta pliegan mayúsculas en
 * Windows o cuando el destino las ignora; el permiso nunca.
 */
export function matchingRuleForInput(
  path: string,
  context: ToolPermissionContext,
  toolType: FileToolType,
  behavior: PermissionBehavior,
  options: { caseInsensitiveTarget?: boolean } = {},
): PermissionRule | null {
  let expanded = expandPathDeferred(path)
  if (platform() === 'windows' && expanded.includes('\\')) expanded = toPosixOnWindows(expanded)
  const compiled = compileRuleMatchers(context, toolType, behavior)
  const fold = behavior !== 'allow' && (platform() === 'windows' || options.caseInsensitiveTarget === true)
  const target = expanded ?? getCwdDeferred()
  const foldedTarget = fold ? foldPathCase(target) : target

  for (const [root, { matchers }] of compiled.entries()) {
    const base = root ?? getCwdDeferred()
    const relative = relativeForMatching(fold ? foldPathCase(base) : base, foldedTarget)
    if (!relative || !ignore.isPathValid(relative)) continue
    for (let i = matchers.length - 1; i >= 0; i--) {
      const matcher = matchers[i]
      if (matcher === undefined) continue
      const { patternMap, getIg } = matcher
      const result = getIg().test(relative)
      if (!result.ignored || !result.rule) continue
      const matched = result.rule.pattern
      const asTree = `${matched}/**`
      if (patternMap.has(asTree) && (matched.includes('/') || behavior !== 'allow')) {
        return patternMap.get(asTree) ?? null
      }
      if (matched.startsWith('/')) {
        const unanchoredTree = `${matched.slice(1)}/**`
        if (patternMap.has(unanchoredTree)) return patternMap.get(unanchoredTree) ?? null
      }
      const rule = patternMap.get(matched)
      if (rule !== undefined || behavior === 'allow') return rule ?? null
    }
  }
  return null
}

/**
 * La regla de permiso que cubre TODAS las rutas, o null si alguna queda
 * fuera (≙ `myt`). Cada ruta se prueba también con la grafía corta de un
 * enlace de sistema de confianza (`/private/tmp` → `/tmp`).
 */
export function allPathsMatchAllowRule(
  paths: Iterable<string>,
  context: ToolPermissionContext,
  toolType: FileToolType,
): PermissionRule | null {
  let first: PermissionRule | null = null
  for (const path of paths) {
    let rule = matchingRuleForInput(path, context, toolType, 'allow')
    if (!rule) {
      const spelled = trustedSpellingOf(path)
      if (spelled !== path) rule = matchingRuleForInput(spelled, context, toolType, 'allow')
    }
    if (!rule) return null
    first ??= rule
  }
  return first
}

/** Los patrones de lectura denegada por raíz, sin las negaciones (≙ `BYe`). */
export function getFileReadIgnorePatterns(context: ToolPermissionContext): Map<string | null, string[]> {
  const result = new Map<string | null, string[]>()
  for (const [root, { patternMap }] of compileRuleMatchers(context, 'read', 'deny').entries()) {
    result.set(root, Array.from(patternMap.keys()).filter(p => !p.startsWith('!')))
  }
  return result
}

// ---- Normalización a una raíz de búsqueda (≙ `pyt`, `Ps`, `Ms`, `Fu`) ----

function anchorAtRoot(pattern: string): string {
  return nodePath.join(SEP, pattern)
}

/**
 * Las variantes de un patrón cuyo prefijo literal pasa por un enlace: la
 * escrita y la del destino real (≙ `Ps`).
 */
function withResolvedPrefix(
  root: string,
  pattern: string,
  resolvedByPrefix: Map<string, string>,
): Array<{ patternRoot: string; pattern: string }> {
  const written = { patternRoot: root, pattern }
  const trailing = pattern.endsWith(SEP) ? SEP : ''
  const segments = pattern.split(SEP).filter(s => s !== '' && s !== '.')
  const firstGlob = segments.findIndex(s => /[*?[{]/.test(s))
  const cut = firstGlob === -1 ? Math.max(0, segments.length - 1) : firstGlob
  const prefix = nodePath.join(root, ...segments.slice(0, cut))
  let resolved = resolvedByPrefix.get(prefix)
  if (resolved === undefined) {
    const spelled = platform() === 'windows' ? toPosixOnWindows(prefix) : prefix
    resolved = normalizeRootForPlatform(safeResolvePath(nodeFs as never, spelled).resolvedPath)
    resolvedByPrefix.set(prefix, resolved)
  }
  if (resolved === prefix) return [written]
  return [written, { patternRoot: resolved, pattern: segments.slice(cut).join(SEP) + trailing }]
}

/**
 * Las formas de `pattern` que quedan al bajar por `descent`, un segmento
 * por vez, sin salirse de lo que el patrón puede alcanzar (≙ `Fu`).
 */
function patternsBelow(pattern: string, descent: string[]): string[] {
  const segments = pattern.split(SEP).filter(s => s !== '' && s !== '.')
  const trailing = pattern.endsWith(SEP) ? SEP : ''
  const out = new Set<string>()
  const stack: Array<{ rest: string[]; at: number }> = [{ rest: segments, at: 0 }]
  const seen = new Set<string>()
  for (let item = stack.pop(); item !== undefined; item = stack.pop()) {
    const { rest, at } = item
    const key = `${at}:${rest.join(SEP)}`
    if (seen.has(key)) continue
    seen.add(key)
    if (at === descent.length) {
      out.add(rest.length === 0 ? '**' : rest.join(SEP) + trailing)
      continue
    }
    const head = rest[0]
    if (head === undefined) {
      out.add('**')
      continue
    }
    if (head === '**') {
      stack.push({ rest, at: at + 1 })
      stack.push({ rest: rest.slice(1), at })
      continue
    }
    const literal = (/^[!#]/.test(head) ? `\\${head}` : head).replace(/ +$/, t => t.replace(/ /g, '\\ '))
    if (ignore().add(literal).ignores(descent[at]!)) stack.push({ rest: rest.slice(1), at: at + 1 })
  }
  return Array.from(out)
}

/** Un patrón con raíz propia, reescrito respecto de `rootPath` (≙ `Ms`). */
function patternRelativeToRoot(patternRoot: string, pattern: string, rootPath: string): string[] {
  const full = nodePath.join(patternRoot, pattern)
  const foldedPatternRoot = foldPathCase(patternRoot)
  const foldedRoot = foldPathCase(rootPath)
  if (foldedPatternRoot === foldedRoot) return [anchorAtRoot(pattern)]
  if (foldPathCase(full).startsWith(`${foldedRoot}${SEP}`)) {
    return [anchorAtRoot(full.slice(rootPath.length))]
  }
  const up = nodePath.relative(foldedRoot, foldedPatternRoot)
  if (!up || up.startsWith(`..${SEP}`) || up === '..') {
    const down = nodePath.relative(foldedPatternRoot, foldedRoot)
    if (!down || down === '..' || down.startsWith(`..${SEP}`)) return []
    return patternsBelow(pattern, down.split(SEP)).map(anchorAtRoot)
  }
  return [anchorAtRoot(nodePath.join(up, pattern))]
}

/**
 * Los patrones por raíz, reescritos para buscar desde `root` (≙ `pyt`). Los
 * patrones sin raíz se conservan; los que llevan una barra se leen además
 * contra el directorio de trabajo.
 */
export function normalizePatternsToPath(
  patternsByRoot: Map<string | null, string[]>,
  root: string,
): string[] {
  const resolvedByPrefix = new Map<string, string>()
  const unrooted = patternsByRoot.get(null) ?? []
  const result = new Set(unrooted)
  const rootPath = normalizeRootForPlatform(root)
  const cwd = normalizeRootForPlatform(getCwdDeferred())
  for (const pattern of unrooted) {
    if (!pattern.replace(/\/+$/, '').includes(SEP)) continue
    for (const variant of withResolvedPrefix(cwd, pattern, resolvedByPrefix)) {
      for (const p of patternRelativeToRoot(variant.patternRoot, variant.pattern, rootPath)) result.add(p)
    }
  }
  for (const [patternRoot, patterns] of patternsByRoot.entries()) {
    if (patternRoot === null) continue
    const base = normalizeRootForPlatform(patternRoot)
    for (const pattern of patterns) {
      for (const variant of withResolvedPrefix(base, pattern, resolvedByPrefix)) {
        for (const p of patternRelativeToRoot(variant.patternRoot, variant.pattern, rootPath)) result.add(p)
      }
    }
  }
  return Array.from(result)
}
