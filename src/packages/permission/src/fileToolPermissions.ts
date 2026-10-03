/**
 * Las guardas de lectura y escritura de las herramientas de archivo: qué
 * decide `Read`/`Glob`/`LSP` antes de leer y `Edit`/`Write` antes de
 * escribir.
 *
 * Reimplementación del contrato de 2.1.275 (`chunk-9apg35nm.js`), no copia:
 *
 *   `checkReadPermissionForTool` ≙ `_w` (2.1.283: `IE`) · `checkWritePermissionForTool` ≙ `Wy` (2.1.283: `Lb`)
 *   · `checkNetworkPathRead` ≙ `k_n` (2.1.281: `ULn`; 2.1.283: `BGn`) · `denyOutsideWorkingDirectories` ≙ `Bs` (2.1.283: `kl`)
 *   · `generateSuggestions` ≙ `gyt` · `safetyCheckFields` ≙ `Au`
 *   · `getClaudeSkillScope` ≙ `ku` · `isClaudeTreeRule` ≙ `zu`
 *   · `ruleCrossesNestedClaudeDir` ≙ `Nu` · `claudeDirDepth` ≙ `Es`
 *   · `canSuggestAcceptEdits` ≙ `KFe` · `readRuleSuggestion` ≙ `CTe`
 *   · `directoryForSuggestion` ≙ `iU` · `readsBlockedBySettings` ≙ `d_n`.
 *
 * Lo que ya estaba portado y aquí se compone: `checkPathSafetyForAutoEdit`
 * (`Gge`), `checkEditableInternalPath` (`yyt`), `checkReadableInternalPath`
 * (`hee`), `matchingRuleForInput` (`_a`), `allPathsMatchAllowRule` (`myt`),
 * `isPathInWorkingDirectories` (`my`) y los conjuntos de directorios `_b` y
 * `NGt`, de `pathValidation.ts`.
 *
 * Las dos guardas consumen el objeto resuelto de `resolvePathForPermission`
 * (≙ `Ua`, 2.1.283) y encima llevan la capa de aterrizaje de enlaces de
 * 2.1.283: `displayPath` ≙ `ete` · `landingBeyondRequested` ≙ `ect` ·
 * `symlinkLanding` ≙ `n5e` · `landingSentence` ≙ `cln` ·
 * `denyUnresolvedTarget` ≙ `xl` · `outsideWorkingDirectoriesAsk` ≙ `Ml` ·
 * `writeSafetyLanding` ≙ `WGn` · `denySymlinkLeafWrite` ≙ `Zlt`.
 *
 * Divergencias declaradas:
 *
 * - `denySymlinkLeafWrite` lo aplican en 2.1.283 los `checkPermissions` de
 *   Write, Edit y NotebookEdit (`chunk-csayct82.js`) sobre la decisión de
 *   `Lb`; esas herramientas viven en `tool-registry` y aquí sólo se exporta.
 * - `displayPath` porta la sustitución de caracteres y el recorte de `ete`,
 *   no su pasada de normalización hasta punto fijo (`sf`).
 *
 * - Sin divergencia en la pausa de memoria: `/pause-memory` y su indicador
 *   están portados de 2.1.281, y la rama `EN(y) && Kh()` de `Wy` niega como
 *   `ib` (`xU(h)&&Yh()` → `Rr`).
 * - Sin divergencia en el experimento en sombra `tengu_playful_lobster`:
 *   está portado de 2.1.281 en `playfulLobster.ts` y registra por
 *   `logEvent`.
 * - `servedCall` no lo fija ningún productor en este árbol; la rama que
 *   convierte la negación en consulta se porta igual, leyendo las settings.
 */
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import {
  getPathsForPermissionCheck,
  resolvePathForPermission,
  type ResolvedPermissionPath,
} from '@thyrox/storage/fsOperations.js'
import { isMemoryPaused } from '@thyrox/memory/memoryPause'
import { expandPath } from '@thyrox/storage/path.js'
import {
  ADOPT_JSON_DENIED,
  HOST_CREDENTIALS_DENIED,
  PROFILE_STORE_DENIED,
  SEED_ADMIN_DENIED,
  SETTINGS_REVIEW_DENIED,
  checkEditableInternalPath,
  checkReadableInternalPath,
  isHostCredentialsFile,
  isJobAdoptFile,
  isProfileStorePath,
  isSeedAdminPath,
  isSettingsReviewStore,
  isUnderAutoMemoryDir,
  MEMORY_WRITE_PAUSED,
} from './internalPaths.js'
import {
  checkPathSafetyForAutoEdit,
  comparableSegment,
  automountRoot,
  isAutomountMapRoot,
  isInTrustedNetworkDirectory,
  isKernelResolvedPath,
  isLocalWslUncPath,
  isSuspiciousWindowsPath,
  isUncPath,
  workingDirectoryDepth,
  type PathSafetyResult,
} from './pathSafety.js'
import {
  allowsClaudeConfigForMode,
  internalAllowApplies,
  isPathInWorkingDirectories,
  readFenceDirectoriesOf,
  workingDirectoriesOf,
  type PathPermissionContext,
} from './pathValidation.js'
import { isHardLinkedFile, isShadowExperimentOn, recordShadowFired, shouldLogShadowPath } from './playfulLobster.js'
import { permissionRuleValueFromString } from './permissionRuleParser.js'
import type {
  PermissionDecision,
  PermissionDecisionReason,
  PermissionDenyDecision,
  PermissionUpdate,
} from './permissionTypes.js'
import { allPathsMatchAllowRule, escapeForIgnore, matchingRuleForInput } from './ruleMatching.js'
import { getConfigHomeDir } from '@thyrox/config/env/configHome.js'
import { PRODUCT_NAME } from '@thyrox/config/product'

const FILE_READ_TOOL_NAME = 'Read'
const FILE_EDIT_TOOL_NAME = 'Edit'
const GLOB_TOOL_NAME = 'Glob'
const PROJECT_CLAUDE_TREE = '/.claude/**'
const USER_CLAUDE_TREE = '~/.claude/**'
const SYNCED_SKILL_NAME = 'synced'
const RESTRICTED_REASON = 'Restricted mode confines the file tools to the working directory'
const OUTSIDE_READS_BLOCKED =
  'Reads outside the working directories are blocked (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.'
const OUTSIDE_WORKING_DIRECTORIES = 'Path is outside allowed working directories'
const OUTSIDE_ALLOWED_CLAUSE = ', which is outside the allowed working directories'
const UNDETERMINED_TARGET = 'a target that could not be determined'
const DISPLAY_PATH_MAX_CHARS = 160
const DISPLAY_UNSAFE_CHARS = /[\x00-\x1f\x7f-\x9f\u061c\u2028\u2029\u202a-\u202e\u2066-\u2069\p{Co}\p{Cn}]/gu
const REPLACEMENT_CHAR = '\uFFFD'
/** Pares (canónico, enlace) que macOS y merged-usr resuelven; cuenta el que `realpath(enlace)` confirme (≙ `Hf`). */
const TRUSTED_SYMLINK_EQUIVALENCES: ReadonlyArray<readonly [string, string]> = [
  ['/private/tmp', '/tmp'],
  ['/private/var', '/var'],
  ['/private/etc', '/etc'],
  ['/usr/bin', '/bin'],
  ['/usr/lib', '/lib'],
  ['/usr/sbin', '/sbin'],
]

/** La herramienta, tal como la ven estas guardas. */
export type FileTool = {
  name: string
  getPath?: (input: never) => string
}

type Input = { [key: string]: unknown }

/** Por qué una ruta fuera del trabajo queda negada (≙ `Gs` y `$u`). */
type OutsideReason = { why: string; reason: string }

const RESTRICTED_OUTSIDE: OutsideReason = {
  why: '--restricted confines the file tools to the working directory.',
  reason: RESTRICTED_REASON,
}
const BLOCKED_READS_OUTSIDE: OutsideReason = {
  why: 'the permissions.blockReadsOutsideWorkingDirectories setting blocks reads outside the working directories. Ask the user to add the directory with /add-dir, or to remove that setting.',
  reason: OUTSIDE_READS_BLOCKED,
}

function pathOf(tool: FileTool, input: Input): string | undefined {
  return typeof tool.getPath === 'function' ? (tool.getPath as (i: Input) => string)(input) : undefined
}

function ask(message: string, reason: string): PermissionDecision {
  return { behavior: 'ask', message, decisionReason: { type: 'other', reason } }
}

function originalCwd(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/app-host/bootstrap/state.js') as { getOriginalCwd: () => string }).getOriginalCwd()
  } catch {
    return process.cwd()
  }
}

function claudeConfigHome(): string {
  return getConfigHomeDir()
}

function userHome(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('node:os') as typeof import('node:os')).homedir()
}

function folded(path: string): string {
  return path.normalize('NFC').toLowerCase()
}

// ---- La capa de aterrizaje de enlaces (2.1.283: `ete`, `tl`, `ect`, `n5e`, `cln`, `Tl`, `dln`, `xl`, `Ml`, `WGn`, `Zlt`) ----

/**
 * Cómo se nombra una operación en los mensajes y cómo razona su consulta
 * cuando el enlace la saca del trabajo (el `e` de `Ml` y `xl`).
 */
export type FileOperation = {
  phrase: 'read from' | 'write to'
  verb: 'read' | 'write'
  carriedOutReason: (sentence: string) => PermissionDecisionReason
}

export const READ_OPERATION: FileOperation = {
  phrase: 'read from',
  verb: 'read',
  carriedOutReason: reason => ({ type: 'workingDir', reason }),
}

export const WRITE_OPERATION: FileOperation = {
  phrase: 'write to',
  verb: 'write',
  carriedOutReason: reason => ({ type: 'safetyCheck', reason, classifierApprovable: false }),
}

/** La ruta como se muestra: sin caracteres de control ni de formato, recortada (≙ `ete`). */
export function displayPath(path: string): string {
  const sanitized = path.replace(DISPLAY_UNSAFE_CHARS, REPLACEMENT_CHAR)
  if (sanitized.length <= DISPLAY_PATH_MAX_CHARS) return sanitized
  const shown = sanitized.slice(0, DISPLAY_PATH_MAX_CHARS)
  return `${shown}… [+${sanitized.length - shown.length} chars]`
}

function resolvesThroughSymlink(path: string, landing: string): string {
  return `${displayPath(path)} resolves through a symlink to ${displayPath(landing)}`
}

function unresolvedTargetReason(path: string): string {
  return `Where ${displayPath(path)} leads on disk could not be determined (a link or directory on the way could not be examined, or the links do not resolve)`
}

/** Negación de una ruta cuyo destino en disco no se pudo determinar (≙ `xl`). */
export function denyUnresolvedTarget(operation: FileOperation, path: string): PermissionDenyDecision {
  return {
    behavior: 'deny',
    message: `Refusing to ${operation.verb} ${displayPath(path)}: where it leads on disk could not be determined (a link on the way could not be examined, or the links do not resolve).`,
    decisionReason: { type: 'other', reason: unresolvedTargetReason(path) },
  }
}

let confirmedEquivalences: ReadonlyArray<readonly [string, string]> | undefined

function confirmedSymlinkEquivalences(): ReadonlyArray<readonly [string, string]> {
  confirmedEquivalences ??= TRUSTED_SYMLINK_EQUIVALENCES.filter(([canonical, link]) => {
    try {
      return nodeFs.realpathSync(link) === canonical
    } catch {
      return false
    }
  })
  return confirmedEquivalences
}

/** La ruta absoluta con los alias confirmados plegados a su enlace (≙ `tl`). */
function aliasFoldedPath(path: string): string {
  const resolved = nodePath.resolve(path)
  for (const [canonical, link] of confirmedSymlinkEquivalences()) {
    if (resolved === canonical || resolved.startsWith(canonical + nodePath.sep)) return link + resolved.slice(canonical.length)
  }
  return resolved
}

/** El aterrizaje, si difiere de la ruta pedida una vez plegados los alias (≙ `ect`). */
export function landingBeyondRequested(resolved: ResolvedPermissionPath): string | null {
  if (resolved.unresolved) return null
  return aliasFoldedPath(resolved.landing) === aliasFoldedPath(resolved.requested) ? null : resolved.landing
}

/** Dónde aterriza un enlace respecto de los directorios de trabajo (≙ `n5e`). */
export type SymlinkLanding = {
  landing: string
  landingOutside: boolean
  spellingInside: boolean
  /** La grafía pedida está dentro y el aterrizaje fuera: el enlace saca la operación del trabajo. */
  carriedOut: boolean
}

export function symlinkLanding(
  resolved: ResolvedPermissionPath,
  context: PathPermissionContext,
  directories: Set<string> = workingDirectoriesOf(context),
): SymlinkLanding | null {
  const landing = landingBeyondRequested(resolved)
  if (landing === null) return null
  const inside = (path: string) => isPathInWorkingDirectories(path, context, [path], directories)
  const landingOutside = !inside(landing)
  const spellingInside = inside(resolved.requested)
  return { landing, landingOutside, spellingInside, carriedOut: spellingInside && landingOutside }
}

/** «X resolves through a symlink to Y», con la cláusula de fuera si aterriza fuera (≙ `cln`). */
export function landingSentence(path: string, landing: SymlinkLanding): string {
  return `${resolvesThroughSymlink(path, landing.landing)}${landing.landingOutside ? OUTSIDE_ALLOWED_CLAUSE : ''}`
}

type OutsideWorkingDirectoriesAsk = {
  message: string
  decisionReason: PermissionDecisionReason
  blockedPath?: string
}

/**
 * La consulta final de una ruta fuera del trabajo (≙ `Ml`): a secas si el
 * enlace no la saca; con la frase de aterrizaje, la ruta bloqueada y la
 * razón propia de la operación cuando sí.
 */
function outsideWorkingDirectoriesAsk(
  operation: FileOperation,
  path: string,
  resolved: ResolvedPermissionPath,
  context: PathPermissionContext,
): OutsideWorkingDirectoriesAsk {
  const message = `${PRODUCT_NAME} requested permissions to ${operation.phrase} ${path}, but you haven't granted it yet.`
  const landing = symlinkLanding(resolved, context)
  if (landing === null || !landing.carriedOut) {
    return { message, decisionReason: { type: 'workingDir', reason: OUTSIDE_WORKING_DIRECTORIES } }
  }
  const sentence = landingSentence(path, landing)
  return { message: `${message} ${sentence}.`, blockedPath: landing.landing, decisionReason: operation.carriedOutReason(sentence) }
}

type WriteSafetyLanding = { landing: string; sentence: string; personOnly: boolean }

/**
 * Lo que la guarda de seguridad de escritura añade cuando hay aterrizaje
 * (≙ `WGn`): sólo una persona decide si el peligro llega por el enlace —la
 * grafía pedida sola es segura— o si el enlace saca la escritura del trabajo.
 */
function writeSafetyLanding(
  path: string,
  resolved: ResolvedPermissionPath,
  context: PathPermissionContext,
): WriteSafetyLanding | null {
  const landing = symlinkLanding(resolved, context)
  if (landing === null) return null
  const requestedAloneSafe = checkPathSafetyForAutoEdit(
    resolved.requested,
    [resolved.requested],
    undefined,
    allowsClaudeConfigForMode(context),
    context.trustedNetworkDirectories,
  ).safe
  return { landing: landing.landing, sentence: landingSentence(path, landing), personOnly: requestedAloneSafe || landing.carriedOut }
}

/**
 * Una escritura cuya hoja es un enlace simbólico se niega y se remite al
 * destino (≙ `Zlt`). Lo aplican las herramientas de escritura sobre la
 * decisión de `checkWritePermissionForTool` cuando no fue negación.
 */
export function denySymlinkLeafWrite(path: string, resolved: ResolvedPermissionPath): PermissionDenyDecision | null {
  if (!resolved.leafIsSymlink) return null
  const target = resolved.unresolved ? UNDETERMINED_TARGET : displayPath(resolved.landing)
  return {
    behavior: 'deny',
    message: `Refusing to write ${displayPath(path)}: it is a symbolic link. Write to the link's target path instead: ${target}.`,
    decisionReason: { type: 'other', reason: 'Write target is a symbolic link' },
    ...(!resolved.unresolved && { blockedPath: resolved.landing }),
  }
}

/**
 * ¿Queda una ruta fuera de los directorios dados? Negación con la ruta
 * bloqueada —el aterrizaje, si el enlace la saca—; irresoluble, negación
 * sin más; null si está dentro o si la ruta interna la permite (≙ `kl`).
 */
export function denyOutsideWorkingDirectories(
  path: string,
  resolved: ResolvedPermissionPath,
  context: PathPermissionContext,
  internalCheck: () => { behavior: string },
  reason: OutsideReason,
  directories: Set<string>,
): PermissionDenyDecision | null {
  if (resolved.unresolved) {
    return {
      behavior: 'deny',
      message: `${unresolvedTargetReason(path)}; ${reason.why}`,
      decisionReason: { type: 'other', reason: reason.reason },
    }
  }
  if (isPathInWorkingDirectories(path, context, resolved.spellings, directories) || internalCheck().behavior === 'allow') {
    return null
  }
  const listed = Array.from(directories).join(', ')
  const landing = symlinkLanding(resolved, context, directories)
  const carried = landing !== null && landing.carriedOut ? landing : null
  return {
    behavior: 'deny',
    message: carried
      ? `${resolvesThroughSymlink(path, carried.landing)}, which is outside ${listed}; ${reason.why}`
      : `${path} is outside ${listed}; ${reason.why}`,
    decisionReason: { type: 'other', reason: reason.reason },
    blockedPath: carried ? carried.landing : path,
  }
}

/** ¿Alguna capa de settings declara las lecturas fuera bloqueadas? (≙ `d_n`). */
function readsBlockedBySettings(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const settings = require('@thyrox/config/settings/settings.js') as {
      getSettingsForSource: (source: string) => { permissions?: { blockReadsOutsideWorkingDirectories?: boolean } } | null
    }
    return ['userSettings', 'projectSettings', 'localSettings', 'flagSettings', 'policySettings'].some(
      source => settings.getSettingsForSource(source)?.permissions?.blockReadsOutsideWorkingDirectories === true,
    )
  } catch {
    return false
  }
}

/** Los campos de seguridad de una consulta, endurecidos en modo restringido (≙ `Au`). */
export function safetyCheckFields(
  result: Extract<PathSafetyResult, { safe: false }>,
  restricted: boolean | undefined,
): { classifierApprovable: boolean; circuitBreaker?: string; also?: string[] } {
  if (!restricted) {
    return {
      classifierApprovable: result.classifierApprovable,
      ...(result.circuitBreaker && { circuitBreaker: result.circuitBreaker }),
      ...(result.also && { also: [...result.also] }),
    }
  }
  const also = [...(result.circuitBreaker ? [result.circuitBreaker] : []), ...(result.also ?? [])]
  return { classifierApprovable: false, circuitBreaker: 'restrictedMode', ...(also.length > 0 && { also }) }
}

/** ¿Es un modo que ya concede más que `acceptEdits`? (≙ `ks`). */
function isPermissiveMode(mode: string | undefined): boolean {
  return mode === 'auto' || mode === 'bypassPermissions' || mode === 'acceptEdits' || mode === 'dontAsk'
}

/** ¿Tiene sentido sugerir `acceptEdits` para esta sesión? (≙ `KFe`). */
export function canSuggestAcceptEdits(context: PathPermissionContext): boolean {
  if (isPermissiveMode(context.modeBeforeRewrite)) return false
  if (context.mode === 'default') return true
  return context.mode === 'plan' && !isPermissiveMode(context.prePlanMode)
}

/** El directorio que se sugiere añadir para una ruta (≙ `iU`). */
function directoryForSuggestion(path: string): string {
  const absolute = expandPath(path)
  try {
    if (nodeFs.statSync(absolute).isDirectory()) return absolute
  } catch {
    // Sin stat, el padre.
  }
  return nodePath.dirname(absolute)
}

/** La regla de lectura de sesión para un directorio (≙ `CTe`). */
function readRuleSuggestion(dir: string): PermissionUpdate | undefined {
  const spelled = process.platform === 'win32' ? dir.replace(/\\/g, '/') : dir
  if (spelled === '/') return undefined
  const escaped = escapeForIgnore(spelled, { escapeGlobs: true })
  const ruleContent = nodePath.isAbsolute(spelled)
    ? `/${escaped}/**`
    : escaped.startsWith('\\')
      ? `./${escaped}/**`
      : `${escaped}/**`
  return {
    type: 'addRules',
    rules: [{ toolName: FILE_READ_TOOL_NAME, ruleContent }],
    behavior: 'allow',
    destination: 'session',
  }
}

/** Las sugerencias que acompañan a una consulta de lectura o escritura (≙ `gyt`). */
export function generateSuggestions(
  path: string,
  operation: 'read' | 'write' | 'create',
  context: PathPermissionContext,
  pathsToCheck?: readonly string[],
): PermissionUpdate[] {
  const outside = !isPathInWorkingDirectories(path, context, pathsToCheck, workingDirectoriesOf(context))
  if (operation === 'read' && outside) {
    return getPathsForPermissionCheck(directoryForSuggestion(path))
      .map(readRuleSuggestion)
      .filter((u): u is PermissionUpdate => u !== undefined)
  }
  const acceptEdits = canSuggestAcceptEdits(context)
  if (operation === 'write' || operation === 'create') {
    const updates: PermissionUpdate[] = acceptEdits
      ? [{ type: 'setMode', mode: 'acceptEdits', destination: 'session' }]
      : []
    if (outside) {
      updates.push({
        type: 'addDirectories',
        directories: getPathsForPermissionCheck(directoryForSuggestion(path)),
        destination: 'session',
      } as PermissionUpdate)
    }
    return updates
  }
  return acceptEdits ? [{ type: 'setMode', mode: 'acceptEdits', destination: 'session' }] : []
}

/** ¿Cubre la regla un árbol `.claude` entero, sin `..`? (≙ `zu`). */
export function isClaudeTreeRule(ruleContent: string | undefined): boolean {
  return (
    !!ruleContent &&
    (ruleContent.startsWith(PROJECT_CLAUDE_TREE.slice(0, -2)) || ruleContent.startsWith(USER_CLAUDE_TREE.slice(0, -2))) &&
    !ruleContent.includes('..') &&
    ruleContent.endsWith('/**')
  )
}

/**
 * ¿Cae la ruta bajo un `.claude` anidado DENTRO del árbol que la regla abre?
 * Una regla de sesión sobre `/.claude/**` no alcanza a otro `.claude` más
 * hondo (≙ `Nu`).
 */
export function ruleCrossesNestedClaudeDir(path: string, ruleContent: string): boolean {
  const base = ruleContent.startsWith('~/.claude/') ? userHome() : ruleContent.startsWith('/.claude/') ? originalCwd() : null
  if (base === null) return false
  const rootParts = expandPath(nodePath.join(base, '.claude')).split(nodePath.sep)
  if (rootParts.length > 1 && rootParts.at(-1) === '') rootParts.pop()
  const parts = expandPath(path).split(nodePath.sep)
  for (let i = 0; i < rootParts.length; i++) {
    const segment = parts[i] ?? ''
    const sameDrive = i === 0 && /^[a-z]:$/i.test(segment) && segment.toLowerCase() === rootParts[i]!.toLowerCase()
    if (segment !== rootParts[i] && !sameDrive) return false
  }
  for (let i = rootParts.length; i < parts.length; i++) {
    if (comparableSegment(parts[i]!) === '.claude') return true
  }
  return false
}

/** Cuántos `.claude` hay por debajo del directorio de trabajo (≙ `Es`). */
export function claudeDirDepth(path: string): number {
  const parts = expandPath(path).split(nodePath.sep)
  let count = 0
  for (let i = workingDirectoryDepth(parts); i < parts.length; i++) {
    if (comparableSegment(parts[i]!) === '.claude') count++
  }
  return count
}

/** Las grafías del directorio de skills del usuario, plegadas (≙ `nd`). */
function userSkillsBaseSpellings(): string[] {
  const spellings = new Set<string>()
  const add = (dir: string) => {
    spellings.add(folded(dir))
    try {
      spellings.add(folded(nodeFs.realpathSync(dir)))
    } catch {
      // Sin enlace que resolver.
    }
  }
  const home = expandPath(claudeConfigHome())
  add(nodePath.join(home, 'skills'))
  try {
    add(nodePath.join(nodeFs.realpathSync(home), 'skills'))
  } catch {
    // Idem.
  }
  return [...spellings]
}

/** ¿Es el nombre reservado de la carpeta sincronizada? (≙ `h1`). */
function isSyncedSkillName(name: string): boolean {
  return comparableSegment(name.replace(/[. ]+$/, '')) === SYNCED_SKILL_NAME
}

/**
 * Si la ruta cae dentro de una skill de `.claude/skills/`, su nombre y la
 * regla que abre esa skill entera (≙ `ku`).
 */
export function getClaudeSkillScope(path: string): { skillName: string; pattern: string } | null {
  const absolute = expandPath(path)
  const comparable = folded(absolute)
  const roots = [
    { dir: expandPath(nodePath.join(originalCwd(), '.claude', 'skills')), prefix: '/.claude/skills/' },
    { dir: expandPath(nodePath.join(userHome(), '.claude', 'skills')), prefix: '~/.claude/skills/' },
  ]
  for (const { dir, prefix } of roots) {
    const root = folded(dir)
    for (const sep of [nodePath.sep, '/']) {
      if (!comparable.startsWith(root + sep.toLowerCase())) continue
      const rest = absolute.slice(dir.length + sep.length)
      const slash = rest.indexOf('/')
      const backslash = nodePath.sep === '\\' ? rest.indexOf('\\') : -1
      const cut = slash === -1 ? backslash : backslash === -1 ? slash : Math.min(slash, backslash)
      if (cut <= 0) return null
      const skillName = rest.slice(0, cut)
      if (!skillName || skillName === '.' || skillName.includes('..')) return null
      if (/[*?[\]]/.test(skillName) || skillName.includes('\\')) return null
      if (
        (prefix === '~/.claude/skills/' || userSkillsBaseSpellings().includes(root)) &&
        (isSyncedSkillName(skillName) || comparableSegment(skillName).startsWith('.'))
      ) {
        return null
      }
      const below = rest.slice(cut + 1).split(/[/\\]/)
      if (comparableSegment(skillName) === '.claude' || below.some(s => comparableSegment(s) === '.claude')) return null
      return { skillName, pattern: `${prefix}${skillName}/**` }
    }
  }
  return null
}

/**
 * Lecturas por rutas de red: UNC, el mapa de automontaje y los patrones
 * sospechosos de Windows piden aprobación aunque una regla los permita
 * (≙ `k_n`). null si no hay nada que objetar.
 */
export function checkNetworkPathRead(
  tool: FileTool,
  input: Input,
  context: PathPermissionContext,
  pathsToCheck?: readonly string[],
): PermissionDecision | null {
  const path = pathOf(tool, input)
  if (path === undefined) return null
  const trusted = context.trustedNetworkDirectories
  const automount = (p: string) =>
    (automountRoot(p) !== null || isAutomountMapRoot(p)) && !isInTrustedNetworkDirectory(p, trusted)
  const automountMessage = (p: string) =>
    `${PRODUCT_NAME} requested permissions to read from ${p}, which is under the /net automount map and could trigger a DNS lookup and NFS mount to a remote host.`
  const AUTOMOUNT_REASON = 'Automount -hosts path detected (defense-in-depth check)'
  const kernelResolved = (p: string) => isKernelResolvedPath(p) && !isInTrustedNetworkDirectory(p, trusted)
  const kernelResolvedTail =
    'which is under /.vol, /.file, /.nofollow or /.resolve (paths the macOS kernel redirects) and could reach a network mount, triggering a DNS lookup and mount to a remote host.'
  const KERNEL_RESOLVED_REASON = 'Kernel-resolved path prefix (/.vol etc.) detected (defense-in-depth check)'
  const kernelResolvedMessage = `${PRODUCT_NAME} requested permissions to read from ${path}, ${kernelResolvedTail}`
  // La superficie `/Network` (`XT`) es constante `false` en la build de Linux.
  if (automount(path)) return ask(automountMessage(path), AUTOMOUNT_REASON)
  if (kernelResolved(path)) return ask(kernelResolvedMessage, KERNEL_RESOLVED_REASON)
  const paths = pathsToCheck ?? getPathsForPermissionCheck(path)
  for (const p of paths) {
    if (isUncPath(p) && !isLocalWslUncPath(p) && !isInTrustedNetworkDirectory(p, trusted)) {
      return ask(
        `${PRODUCT_NAME} requested permissions to read from ${path}, which appears to be a UNC path that could access network resources.`,
        'UNC path detected (defense-in-depth check)',
      )
    }
    if (automount(p)) return ask(automountMessage(path), AUTOMOUNT_REASON)
    if (kernelResolved(p)) return ask(kernelResolvedMessage, KERNEL_RESOLVED_REASON)
  }
  if (tool.name === GLOB_TOOL_NAME) {
    const pattern = input.pattern
    if (typeof pattern === 'string' && isUncPath(pattern) && !isLocalWslUncPath(pattern) && !isInTrustedNetworkDirectory(pattern, trusted)) {
      return ask(
        `${PRODUCT_NAME} requested permissions to glob ${pattern}, which appears to be a UNC pattern that could access network resources.`,
        'UNC glob pattern detected (defense-in-depth check)',
      )
    }
    if (typeof pattern === 'string' && automount(pattern)) {
      return ask(
        `${PRODUCT_NAME} requested permissions to glob ${pattern}, which is under the /net automount map and could trigger a DNS lookup and NFS mount to a remote host.`,
        'Automount -hosts glob pattern detected (defense-in-depth check)',
      )
    }
    if (typeof pattern === 'string' && kernelResolved(pattern)) {
      return ask(
        `${PRODUCT_NAME} requested permissions to glob ${pattern}, ${kernelResolvedTail}`,
        'Kernel-resolved path prefix (/.vol etc.) glob pattern detected (defense-in-depth check)',
      )
    }
  }
  for (const p of paths) {
    if (isSuspiciousWindowsPath(p, trusted)) {
      return ask(
        `${PRODUCT_NAME} requested permissions to read from ${path}, which contains a suspicious Windows path pattern that requires manual approval.`,
        'Path contains suspicious Windows-specific patterns (alternate data streams, short names, long path prefixes, or three or more consecutive dots) that require manual verification',
      )
    }
  }
  return null
}

/** ¿Puede la herramienta leer la ruta que su entrada nombra? (≙ `_w`). */
export function checkReadPermissionForTool(
  tool: FileTool,
  input: Input,
  context: PathPermissionContext,
  precomputed?: ResolvedPermissionPath,
): PermissionDecision {
  const path = pathOf(tool, input)
  if (path === undefined) {
    return { behavior: 'ask', message: `${PRODUCT_NAME} requested permissions to use ${tool.name}, but you haven't granted it yet.` }
  }
  const resolved = precomputed ?? resolvePathForPermission(path)
  const paths = resolved.spellings
  let expanded: string | undefined
  const absolute = () => (expanded ??= expandPath(path))

  for (const p of paths) {
    const rule = matchingRuleForInput(p, context, 'read', 'deny')
    if (rule) return { behavior: 'deny', message: `Permission to read ${path} has been denied.`, decisionReason: { type: 'rule', rule } }
  }

  if (context.restricted || context.blockReadsOutsideWorkingDirectories) {
    const denied = denyOutsideWorkingDirectories(
      path,
      resolved,
      context,
      () =>
        checkReadableInternalPath(absolute(), input, paths, {
          restricted: context.restricted,
          blockOutsideReads: context.blockReadsOutsideWorkingDirectories,
          readBlockFence: context.blockReadsOutsideWorkingDirectories,
        }),
      context.restricted ? RESTRICTED_OUTSIDE : BLOCKED_READS_OUTSIDE,
      context.blockReadsOutsideWorkingDirectories ? readFenceDirectoriesOf(context) : workingDirectoriesOf(context),
    )
    if (denied) {
      if (context.servedCall === true && !context.restricted && denied.behavior === 'deny' && !readsBlockedBySettings()) {
        return {
          behavior: 'ask',
          message: denied.message,
          decisionReason: {
            type: 'safetyCheck',
            reason: OUTSIDE_READS_BLOCKED,
            classifierApprovable: false,
            circuitBreaker: 'outsideReadsBlocked',
          } as PermissionDecision['decisionReason'] & object,
        }
      }
      return denied
    }
  } else if (resolved.unresolved) {
    return denyUnresolvedTarget(READ_OPERATION, path)
  }

  const network = checkNetworkPathRead(tool, input, context, paths)
  if (network) return network

  for (const p of paths) {
    const rule = matchingRuleForInput(p, context, 'read', 'ask')
    if (rule) {
      return {
        behavior: 'ask',
        message: `${PRODUCT_NAME} requested permissions to read from ${path}, but you haven't granted it yet.`,
        decisionReason: { type: 'rule', rule },
      }
    }
  }

  // Experimento en sombra de 2.1.281 (`A` en `Jv`): se evalúa como mucho una
  // vez por llamada y sólo si la lectura llega a permitirse por modo o por
  // directorio de trabajo. Un fallo al medir no toca la decisión.
  let shadow: boolean | undefined
  const shadowFires = (): boolean => {
    if (shadow === undefined) {
      try {
        const absolute = expandPath(path)
        shadow = isShadowExperimentOn() && shouldLogShadowPath(`${context.mode}:${absolute}`) && isHardLinkedFile(absolute)
      } catch {
        shadow = false
      }
    }
    return shadow
  }

  // Poder editar implica poder leer; en plan mode se mide como en default.
  const writeContext = context.mode === 'plan' ? { ...context, mode: 'default' } : context
  const write = checkWritePermissionForTool(tool, input, writeContext as PathPermissionContext, resolved)
  if (write.behavior === 'allow') {
    if (write.decisionReason?.type === 'mode' && shadowFires()) recordShadowFired(expandPath(path), 'editImpliesRead', context.mode)
    return write
  }

  if (isPathInWorkingDirectories(path, context, paths, workingDirectoriesOf(context))) {
    if (shadowFires()) recordShadowFired(expandPath(path), 'workingDir', context.mode)
    return { behavior: 'allow', updatedInput: input, decisionReason: { type: 'mode', mode: 'default' } }
  }

  const internal = checkReadableInternalPath(absolute(), input, paths, {
    restricted: context.restricted,
    blockOutsideReads: context.blockReadsOutsideWorkingDirectories,
  })
  if (internal.behavior !== 'passthrough' && internalAllowApplies(internal, context)) {
    return internal as PermissionDecision
  }

  const rule = allPathsMatchAllowRule(paths, context, 'read')
  if (rule) return { behavior: 'allow', updatedInput: input, decisionReason: { type: 'rule', rule } }

  return {
    behavior: 'ask',
    suggestions: generateSuggestions(path, 'read', context, paths),
    ...outsideWorkingDirectoriesAsk(READ_OPERATION, path, resolved, context),
  }
}

/** ¿Puede la herramienta escribir la ruta que su entrada nombra? (≙ `Wy`). */
export function checkWritePermissionForTool(
  tool: FileTool,
  input: Input,
  context: PathPermissionContext,
  precomputed?: ResolvedPermissionPath,
): PermissionDecision {
  const path = pathOf(tool, input)
  if (path === undefined) {
    return { behavior: 'ask', message: `${PRODUCT_NAME} requested permissions to use ${tool.name}, but you haven't granted it yet.` }
  }
  const resolved = precomputed ?? resolvePathForPermission(path)
  const paths = resolved.spellings

  for (const p of paths) {
    const rule = matchingRuleForInput(p, context, 'edit', 'deny')
    if (rule) return { behavior: 'deny', message: `Permission to edit ${path} has been denied.`, decisionReason: { type: 'rule', rule } }
  }

  const absolute = expandPath(path)
  if (context.restricted) {
    const denied = denyOutsideWorkingDirectories(
      path,
      resolved,
      context,
      () => checkEditableInternalPath(absolute, input, paths, { permissionMode: context.mode, restricted: true }),
      RESTRICTED_OUTSIDE,
      workingDirectoriesOf(context),
    )
    if (denied) return denied
  }

  // 2.1.281 (`ib`): con la memoria en pausa, nada bajo su directorio se escribe.
  if (isUnderAutoMemoryDir(absolute) && isMemoryPaused()) return MEMORY_WRITE_PAUSED as PermissionDecision

  // Los almacenes que el arnés gestiona no se escriben nunca, con ninguna regla.
  if (paths.some(isJobAdoptFile)) return ADOPT_JSON_DENIED as PermissionDecision
  if (paths.some(isSeedAdminPath)) return SEED_ADMIN_DENIED as PermissionDecision
  if (paths.some(isHostCredentialsFile)) return HOST_CREDENTIALS_DENIED as PermissionDecision
  if (paths.some(isProfileStorePath)) return PROFILE_STORE_DENIED as PermissionDecision
  if (paths.some(isSettingsReviewStore)) return SETTINGS_REVIEW_DENIED as PermissionDecision

  if (resolved.unresolved) return denyUnresolvedTarget(WRITE_OPERATION, path)

  // Una regla de sesión sobre un árbol `.claude` entero se honra antes de la
  // guarda de seguridad, salvo en plan mode o si la ruta cruza otro `.claude`.
  const sessionClaudeRules = (context.alwaysAllowRules.session ?? []).filter(rule => {
    const content = permissionRuleValueFromString(rule).ruleContent
    return isClaudeTreeRule(content) && !paths.some(p => ruleCrossesNestedClaudeDir(p, content ?? ''))
  })
  const sessionRule =
    sessionClaudeRules.length > 0
      ? allPathsMatchAllowRule(paths, { ...context, alwaysAllowRules: { session: sessionClaudeRules } } as PathPermissionContext, 'edit')
      : null
  if (
    sessionRule &&
    context.mode !== 'plan' &&
    !paths.some(p => isSuspiciousWindowsPath(p, context.trustedNetworkDirectories)) &&
    !paths.some(p => claudeDirDepth(p) > 1)
  ) {
    return { behavior: 'allow', updatedInput: input, decisionReason: { type: 'rule', rule: sessionRule } }
  }

  for (const p of paths) {
    const rule = matchingRuleForInput(p, context, 'edit', 'ask')
    if (rule) {
      return {
        behavior: 'ask',
        message: `${PRODUCT_NAME} requested permissions to write to ${path}, but you haven't granted it yet.`,
        decisionReason: { type: 'rule', rule },
      }
    }
  }

  const internal = checkEditableInternalPath(absolute, input, paths, {
    permissionMode: context.mode,
    restricted: context.restricted,
  })
  if (internal.behavior !== 'passthrough' && internalAllowApplies(internal, context)) {
    return internal as PermissionDecision
  }

  const safety = checkPathSafetyForAutoEdit(
    path,
    paths,
    undefined,
    allowsClaudeConfigForMode(context),
    context.trustedNetworkDirectories,
  )
  if (!safety.safe) {
    const scope =
      context.restricted ||
      paths.some(p => claudeDirDepth(p) > 1 || isSuspiciousWindowsPath(p, context.trustedNetworkDirectories))
        ? null
        : getClaudeSkillScope(path)
    const suggestions: PermissionUpdate[] = scope
      ? [
          {
            type: 'addRules',
            rules: [{ toolName: FILE_EDIT_TOOL_NAME, ruleContent: scope.pattern }],
            behavior: 'allow',
            destination: 'session',
          },
        ]
      : generateSuggestions(path, 'write', context, paths)
    const landing = writeSafetyLanding(path, resolved, context)
    const message = landing === null ? safety.message : `${safety.message} ${landing.sentence}.`
    return {
      behavior: 'ask',
      message,
      suggestions,
      ...(landing !== null && { blockedPath: landing.landing }),
      decisionReason: {
        type: 'safetyCheck',
        reason: message,
        ...safetyCheckFields(safety, context.restricted),
        ...(landing?.personOnly && { classifierApprovable: false }),
      } as PermissionDecision['decisionReason'] & object,
    }
  }

  if (context.mode === 'plan') {
    return {
      behavior: 'ask',
      message: `Cannot write to ${path} while in plan mode.`,
      decisionReason: { type: 'mode', mode: 'plan' },
    }
  }

  const inWorkingDir = isPathInWorkingDirectories(path, context, paths, workingDirectoriesOf(context))
  if (context.mode === 'acceptEdits' && inWorkingDir) {
    return { behavior: 'allow', updatedInput: input, decisionReason: { type: 'mode', mode: context.mode } }
  }

  const rule = allPathsMatchAllowRule(paths, context, 'edit')
  if (rule) return { behavior: 'allow', updatedInput: input, decisionReason: { type: 'rule', rule } }

  if (inWorkingDir) {
    return {
      behavior: 'ask',
      message: `${PRODUCT_NAME} requested permissions to write to ${path}, but you haven't granted it yet.`,
      suggestions: generateSuggestions(path, 'write', context, paths),
    }
  }
  return {
    behavior: 'ask',
    suggestions: generateSuggestions(path, 'write', context, paths),
    ...outsideWorkingDirectoriesAsk(WRITE_OPERATION, path, resolved, context),
  }
}

