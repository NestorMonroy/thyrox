/**
 * Porte completo de `ccnmt: packages/permission/src/pathValidation.ts`
 * (478 líneas, 11 exports, licencia UNLICENSED — reimplementación, no
 * copia). El objetivo de este pase es `expandTilde`, consumidor real
 * confirmado en
 * `@thyrox/app-host/src/runtime/installPluginBindings.ts:355`
 * (`const { expandTilde } = require('@thyrox/permission/pathValidation.js')`).
 *
 * PORTADAS (11 de 11):
 *
 *   `FileOperationType` · `PathCheckResult` · `ResolvedPathCheckResult`
 *   (los tres tipos, sin dependencias) · `formatDirectoryList` ·
 *   `getGlobBaseDirectory` · `expandTilde` (el objetivo del pase) ·
 *   `isDangerousRemovalPath` (contrato de `D4e` del binario 2.1.275) ·
 *   `isPathInSandboxWriteAllowlist` (contrato de 2.1.275; su bloqueo,
 *   `SandboxManager`, ya existe en `@thyrox/shell/sandbox.js`) ·
 *   `isPathAllowed` (`$k`), `validateGlobPattern` (`mTo`) y `validatePath`
 *   (`yS`), contrato de 2.1.275 (`chunk-q2gh92k2.js`), al final del archivo.
 *   Las seis funciones de `./filesystem.js` que las bloqueaban se portaron
 *   del mismo binario en `ruleMatching.ts`, `pathSafety.ts` e
 *   `internalPaths.ts`.
 *
 * Corregido al portar `isDangerousRemovalPath`: este encabezado la listaba
 * entre las que dependen de `./filesystem.js`, y el binario lo refuta. `D4e`
 * es autocontenida: sólo lee la plataforma, el home y la resolución de
 * enlaces del home. Ninguna de las seis funciones de `filesystem.js` aparece
 * en su cuerpo.
 *
 * Divergencia medida y documentada en `expandTilde`: la fuente lo importa
 * de `@claude-code-how-works/config/utils/expandTilde.js` y lo
 * re-exporta — ese archivo YA ESTÁ PORTADO en este árbol
 * (`@thyrox/config/utils/expandTilde.ts`, verificado leyendo su fuente:
 * misma firma, mismo cuerpo). No se importa desde ahí porque el
 * especificador `@thyrox/*` no resuelve todavía (falta `"workspaces"` en
 * la raíz) y este es un valor (no un tipo, no se borra en tiempo de
 * ejecución) — envolverlo en un `require()` diferido para una función de
 * 10 líneas sin dependencias añadiría una capa de indirección que no
 * compra nada. Se inlinea aquí, verbatim contra la fuente confirmada.
 */
import { homedir } from 'node:os'
import { dirname, isAbsolute, resolve } from 'node:path'
import { getPlatform } from '@thyrox/config/platform.js'
import {
  getFsImplementation,
  getPathsForPermissionCheck,
  safeResolvePath,
} from '@thyrox/storage/fsOperations.js'
import { SandboxManager } from '@thyrox/shell/sandbox.js'
import { pathInWorkingPath } from './filesystem.js'
import { checkEditableInternalPath, checkReadableInternalPath } from './internalPaths.js'
import { checkPathSafetyForAutoEdit, isWindowsNetworkPath, pathContains } from './pathSafety.js'
import type { ToolPermissionContext } from './permissions.js'
import type { PermissionRule } from './permissionTypes.js'
import { allPathsMatchAllowRule, matchingRuleForInput } from './ruleMatching.js'

const MAX_DIRS_TO_LIST = 5
const GLOB_PATTERN_REGEX = /[*?[\]{}]/

export type FileOperationType = 'read' | 'write' | 'create'

// `decisionReason` es `unknown` aquí, no el `PermissionDecisionReason` real
// de la fuente (`PermissionResult.ts`, discriminated union grande, no leído
// ni portado en este pase — nada del subconjunto portado construye este
// campo). Fabricar una forma sin haberla verificado sería peor que
// declararla desconocida.
export type PathCheckResult = {
  allowed: boolean
  decisionReason?: unknown
}

export type ResolvedPathCheckResult = PathCheckResult & {
  resolvedPath: string
}

export function formatDirectoryList(directories: string[]): string {
  const dirCount = directories.length

  if (dirCount <= MAX_DIRS_TO_LIST) {
    return directories.map(dir => `'${dir}'`).join(', ')
  }

  const firstDirs = directories
    .slice(0, MAX_DIRS_TO_LIST)
    .map(dir => `'${dir}'`)
    .join(', ')

  return `${firstDirs}, and ${dirCount - MAX_DIRS_TO_LIST} more`
}

function getPlatformDeferred(): string {
  return process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux'
}

/**
 * Extrae el directorio base de un patrón glob. P. ej. "/ruta/a/*.txt"
 * devuelve "/ruta/a".
 */
export function getGlobBaseDirectory(path: string): string {
  const globMatch = path.match(GLOB_PATTERN_REGEX)
  if (!globMatch || globMatch.index === undefined) {
    return path
  }

  const beforeGlob = path.substring(0, globMatch.index)

  const lastSepIndex =
    getPlatformDeferred() === 'windows'
      ? Math.max(beforeGlob.lastIndexOf('/'), beforeGlob.lastIndexOf('\\'))
      : beforeGlob.lastIndexOf('/')
  if (lastSepIndex === -1) return '.'

  return beforeGlob.substring(0, lastSepIndex) || '/'
}

/**
 * Expande el `~` inicial de una ruta al directorio home del usuario.
 * `~usuario` NO se expande, por seguridad.
 */
export function expandTilde(path: string): string {
  if (
    path === '~' ||
    path.startsWith('~/') ||
    (process.platform === 'win32' && path.startsWith('~\\'))
  ) {
    return homedir() + path.slice(1)
  }
  return path
}

// Raíz de unidad de Windows (`C:`, `C:/`) y su hijo directo (`C:/Windows`).
const DRIVE_ROOT = /^[A-Za-z]:\/?$/
const DRIVE_CHILD = /^[A-Za-z]:\/[^/]+$/

// Plegado de mayúsculas del binario: además de `toLowerCase`, lleva la `ı`
// sin punto y la `ſ` larga a su forma ASCII, para que no sirvan de disfraz.
function foldCase(path: string): string {
  return path.toLowerCase().replace(/\u0131/g, 'i').replace(/\u017f/g, 's')
}

function toForwardSlashes(path: string): string {
  return path.replace(/[\\/]+/g, '/')
}

// El home canónico —tras resolver enlaces— por valor de home: el binario lo
// memoiza porque `realpath` toca el disco y la guarda corre por comando.
const canonicalHomeByHome = new Map<string, string>()
function canonicalHome(home: string): string {
  const cached = canonicalHomeByHome.get(home)
  if (cached !== undefined) return cached
  const resolved = toForwardSlashes(
    safeResolvePath(getFsImplementation(), home).resolvedPath,
  ).replace(/\/$/, '')
  canonicalHomeByHome.set(home, resolved)
  return resolved
}

/**
 * ¿Es peligroso borrar esta ruta? Comodines, la raíz y sus hijos directos,
 * raíces e hijos directos de unidad, y el home —literal o canónico—.
 * En macOS, `/private/{etc,var,tmp,home}` se lee como su alias sin `/private`.
 */
export function isDangerousRemovalPath(path: string): boolean {
  const slashed = toForwardSlashes(path)
  if (slashed === '*' || slashed.endsWith('/*')) return true

  const isMac = getPlatform() === 'macos'
  const unprivate = (p: string): string =>
    isMac ? p.replace(/^\/private\/(etc|var|tmp|home)(\/|$)/i, '/$1$2') : p
  const normalized = unprivate(slashed)
  const trimmed = normalized === '/' ? normalized : normalized.replace(/\/$/, '')

  if (trimmed === '/') return true
  if (DRIVE_ROOT.test(trimmed)) return true

  const home = unprivate(toForwardSlashes(homedir())).replace(/\/$/, '')
  if (foldCase(trimmed) === foldCase(home)) return true
  const canonical = canonicalHome(homedir())
  if (canonical !== home && foldCase(trimmed) === foldCase(canonical)) return true

  if (dirname(trimmed) === '/') return true
  if (DRIVE_CHILD.test(trimmed)) return true
  return false
}


/** Las rutas de configuración del sandbox ya resueltas, como la caché de sesión
 *  del binario (`resolvedSandboxConfigPaths`). */
const resolvedSandboxConfigPaths = new Map<string, string[]>()

function resolveSandboxConfigPath(configPath: string): string[] {
  const cached = resolvedSandboxConfigPaths.get(configPath)
  if (cached !== undefined) return cached
  const resolved = getPathsForPermissionCheck(configPath)
  resolvedSandboxConfigPaths.set(configPath, resolved)
  return resolved
}

/**
 * Porte del contrato de 2.1.275: con el sandbox apagado, `false`. Encendido,
 * la ruta pasa sólo si TODAS sus variantes (la ruta y sus destinos de enlace
 * simbólico) evitan toda entrada de `denyWithinAllow` y caen dentro de alguna
 * de `allowOnly`. Las entradas de configuración se resuelven igual, con caché.
 *
 * Divergencia declarada: el binario compara `deny` con caja y sólo pliega la
 * caja en `allow`; `pathInWorkingPath` pliega en las dos donde la plataforma no
 * distingue caja, lo que ensancha `deny` — el sentido conservador.
 */
export function isPathInSandboxWriteAllowlist(
  path: string,
  resolvedPaths?: string[],
): boolean {
  if (!SandboxManager.isSandboxingEnabled()) return false
  const { allowOnly, denyWithinAllow } = SandboxManager.getFsWriteConfig()
  const variants = resolvedPaths ?? getPathsForPermissionCheck(path)
  const allowed = allowOnly.flatMap(resolveSandboxConfigPath)
  const denied = denyWithinAllow.flatMap(resolveSandboxConfigPath)
  return variants.every(variant => {
    for (const deny of denied) {
      if (pathInWorkingPath(variant, deny)) return false
    }
    return allowed.some(allow => pathInWorkingPath(variant, allow))
  })
}

// ---------------------------------------------------------------------------
// La cadena de validación de 2.1.275 (`chunk-q2gh92k2.js`): `isPathAllowed`
// ≙ `$k`, `validateGlobPattern` ≙ `mTo`, `validatePath` ≙ `yS`, con los
// predicados de `chunk-9apg35nm.js` que consultan (`my`, `NGt`, `OTe`,
// `VFe`, `T_n`, `hyt`). Reimplementación del contrato, no copia.
// ---------------------------------------------------------------------------

type AdditionalWorkingDirectory = { path: string; source?: string }
type TrustedNetworkDirectories = Map<string, readonly string[]>

/** La forma del contexto de permisos que esta cadena lee. */
export type PathPermissionContext = ToolPermissionContext & {
  mode?: string
  prePlanMode?: string
  modeBeforeRewrite?: string
  strippedDangerousRules?: unknown
  isRemoteMode?: boolean
  restricted?: boolean
  servedCall?: boolean
  blockReadsOutsideWorkingDirectories?: boolean
  additionalWorkingDirectories?: Map<string, AdditionalWorkingDirectory>
  trustedNetworkDirectories?: TrustedNetworkDirectories
}

export type PathDecisionReason =
  | { type: 'rule'; rule: PermissionRule }
  | { type: 'other'; reason: string }
  | {
      type: 'safetyCheck'
      reason: string
      classifierApprovable: boolean
      circuitBreaker?: string
    }

export type PathAllowedResult = {
  allowed: boolean
  decisionReason?: PathDecisionReason
  isInWorkingDir?: boolean
}

export type ValidatedPathResult = PathAllowedResult & { resolvedPath: string }

const OUTSIDE_READS_BLOCKED =
  'Reads outside the working directories are blocked (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.'
const FILE_READ_TOOL_NAME = 'Read'
const BRACE = /[{}]/

function originalCwdForValidation(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/app-host/bootstrap/state.js') as { getOriginalCwd: () => string }).getOriginalCwd()
  } catch {
    return process.cwd()
  }
}

/** Las grafías resueltas de un directorio de trabajo (≙ `qge`). */
function workingDirSpellings(dir: string): string[] {
  return process.env.CLAUDE_CODE_EVAL_CONFINED && dir === originalCwdForValidation()
    ? [dir]
    : getPathsForPermissionCheck(dir)
}

/** El cwd original y los directorios añadidos (≙ `_b`). */
function workingDirectoriesOf(context: PathPermissionContext): Set<string> {
  return new Set([originalCwdForValidation(), ...(context.additionalWorkingDirectories?.keys() ?? [])])
}

/**
 * Los directorios que cuentan con lecturas fuera bloqueadas: los añadidos
 * por settings de proyecto no, porque el repositorio no se concede a sí
 * mismo el alcance (≙ `NGt`).
 */
function readFenceDirectoriesOf(context: PathPermissionContext): Set<string> {
  return new Set([
    originalCwdForValidation(),
    ...Array.from(context.additionalWorkingDirectories?.values() ?? [])
      .filter(dir => dir.source !== 'projectSettings')
      .map(dir => dir.path),
  ])
}

/**
 * ¿Están la ruta y todas sus variantes dentro de un directorio de trabajo?
 * Sin plegar mayúsculas y con la misma forma UNC (≙ `my`).
 */
export function isPathInWorkingDirectories(
  path: string,
  context: PathPermissionContext,
  pathsToCheck?: readonly string[],
  directories: Set<string> = workingDirectoriesOf(context),
): boolean {
  const variants = pathsToCheck ?? getPathsForPermissionCheck(path)
  const dirs = Array.from(directories).flatMap(workingDirSpellings)
  return variants.every(variant =>
    dirs.some(dir => pathContains(variant, dir, { caseFold: false, uncShapeParity: true })),
  )
}

/** Con lecturas fuera bloqueadas, ¿queda esta lectura fuera? (≙ `OTe`). */
function isReadOutsideFence(path: string, context: PathPermissionContext, pathsToCheck: readonly string[]): boolean {
  if (context.blockReadsOutsideWorkingDirectories !== true) return false
  return (
    !isPathInWorkingDirectories(path, context, pathsToCheck, readFenceDirectoriesOf(context)) &&
    checkReadableInternalPath(path, {}, pathsToCheck, {
      restricted: context.restricted,
      blockOutsideReads: true,
      readBlockFence: true,
    }).behavior !== 'allow'
  )
}

/**
 * ¿Abre el modo de la sesión los comandos, agentes y skills del proyecto?
 * Sólo en una sesión remota que no esté ni venga de auto mode (≙ `VFe`).
 */
function allowsClaudeConfigForMode(context: PathPermissionContext): boolean {
  const planFromAuto = context.mode === 'plan' && (context.prePlanMode === 'auto' || !!context.strippedDangerousRules)
  return (
    context.isRemoteMode === true &&
    !context.restricted &&
    context.mode !== 'auto' &&
    !planFromAuto &&
    context.modeBeforeRewrite !== 'auto'
  )
}

/** Un corte de seguridad de una ruta interna se reporta como «otro» (≙ `T_n`). */
function asPathReason(reason: unknown): PathDecisionReason {
  const r = reason as PathDecisionReason
  if (r?.type !== 'safetyCheck') return r
  return { type: 'other', reason: r.reason }
}

/** Una llamada servida no hereda permisos de ruta interna (≙ `hyt`). */
function internalAllowApplies(decision: { behavior: string }, context: PathPermissionContext): boolean {
  return !(context.servedCall === true && decision.behavior === 'allow')
}

function hasAnyDenyRule(context: PathPermissionContext): boolean {
  return Object.values(context.alwaysDenyRules).some(rules => (rules?.length ?? 0) > 0)
}

function hasReadDenyRule(context: PathPermissionContext): boolean {
  return Object.values(context.alwaysDenyRules).some(rules =>
    rules?.some(rule => rule === FILE_READ_TOOL_NAME || rule.startsWith(`${FILE_READ_TOOL_NAME}(`)),
  )
}

/**
 * ¿Se puede operar sobre una ruta ya resuelta? En orden: denegaciones, la
 * cerca de lectura, las rutas internas y la seguridad de escritura, el
 * directorio de trabajo, la lista del sandbox y, por último, los permisos
 * por regla (≙ `$k`).
 */
export function isPathAllowed(
  resolvedPath: string,
  context: PathPermissionContext,
  operationType: FileOperationType,
  precomputedPathsToCheck?: readonly string[],
  extraDenyPaths?: readonly string[],
): PathAllowedResult {
  const toolType = operationType === 'read' ? 'read' : 'edit'
  const paths = precomputedPathsToCheck ?? getPathsForPermissionCheck(resolvedPath)
  const denyPaths = extraDenyPaths ? new Set([...paths, ...extraDenyPaths]) : paths

  for (const path of denyPaths) {
    const rule = matchingRuleForInput(path, context, toolType, 'deny')
    if (rule !== null) return { allowed: false, decisionReason: { type: 'rule', rule } }
  }

  if (operationType === 'read' && isReadOutsideFence(resolvedPath, context, paths)) {
    return {
      allowed: false,
      decisionReason: {
        type: 'safetyCheck',
        reason: OUTSIDE_READS_BLOCKED,
        classifierApprovable: false,
        circuitBreaker: 'outsideReadsBlocked',
      },
    }
  }

  if (operationType !== 'read') {
    const internal = checkEditableInternalPath(resolvedPath, {}, paths, {
      permissionMode: context.mode,
      restricted: context.restricted,
    })
    if (internal.behavior === 'deny') return { allowed: false, decisionReason: asPathReason(internal.decisionReason) }
    if (internal.behavior === 'allow' && internalAllowApplies(internal, context)) {
      return { allowed: true, decisionReason: internal.decisionReason }
    }

    const safety = checkPathSafetyForAutoEdit(
      resolvedPath,
      paths,
      undefined,
      allowsClaudeConfigForMode(context),
      context.trustedNetworkDirectories,
    )
    if (!safety.safe) {
      return {
        allowed: false,
        decisionReason: {
          type: 'safetyCheck',
          reason: safety.message,
          ...(context.restricted
            ? { classifierApprovable: false, circuitBreaker: 'restrictedMode' }
            : { classifierApprovable: safety.classifierApprovable, circuitBreaker: safety.circuitBreaker }),
        },
      }
    }
  }

  const inWorkingDir = isPathInWorkingDirectories(resolvedPath, context, paths)
  if (inWorkingDir && (operationType === 'read' || context.mode === 'acceptEdits')) return { allowed: true }

  if (operationType === 'read') {
    const internal = checkReadableInternalPath(resolvedPath, {}, paths, { restricted: context.restricted })
    if (internal.behavior === 'deny') return { allowed: false, decisionReason: asPathReason(internal.decisionReason) }
    if (internal.behavior === 'allow' && internalAllowApplies(internal, context)) {
      return { allowed: true, decisionReason: internal.decisionReason }
    }
  }

  if (operationType !== 'read' && !inWorkingDir && isPathInSandboxWriteAllowlist(resolvedPath, [...paths])) {
    return { allowed: true, decisionReason: { type: 'other', reason: 'Path is in sandbox write allowlist' } }
  }

  const rule = allPathsMatchAllowRule(paths, context, toolType)
  if (rule !== null) return { allowed: true, decisionReason: { type: 'rule', rule } }
  return { allowed: false, isInWorkingDir: inWorkingDir }
}

/** El índice del primer comodín de glob, o -1 (≙ `RR`). */
function globIndex(path: string): number {
  for (let i = 0; i < path.length; i++) {
    const ch = path[i]
    if (ch === '*' || ch === '?') return i
    if (ch === '[' && path.indexOf(']', i + 1) !== -1) return i
  }
  return -1
}

/** El directorio del que cuelga un glob (≙ `pTo`). */
function globBaseDirectory(path: string): string {
  const index = globIndex(path)
  if (index === -1) return path
  const before = path.substring(0, index)
  const lastSep =
    getPlatform() === 'windows' ? Math.max(before.lastIndexOf('/'), before.lastIndexOf('\\')) : before.lastIndexOf('/')
  if (lastSep === -1) return '.'
  return before.substring(0, lastSep) || '/'
}

/**
 * Valida un glob por su directorio base: sube hasta el primer ancestro que
 * resuelve de forma canónica (o hasta la base) y lo valida ahí (≙ `mTo`).
 */
export function validateGlobPattern(
  pattern: string,
  cwd: string,
  context: PathPermissionContext,
  operationType: FileOperationType,
): ValidatedPathResult {
  const fs = getFsImplementation()
  const baseDir = globBaseDirectory(pattern)
  const stop = isAbsolute(baseDir) ? baseDir : resolve(cwd, baseDir)
  let current = isAbsolute(pattern) ? pattern : resolve(cwd, pattern)
  for (;;) {
    const { resolvedPath, isSymlink, isCanonical } = safeResolvePath(fs, current)
    const parent = dirname(current)
    if (isCanonical || current === stop || parent === current) {
      return {
        ...isPathAllowed(
          resolvedPath,
          context,
          operationType,
          isCanonical ? [resolvedPath] : undefined,
          isCanonical && isSymlink && hasAnyDenyRule(context) ? getPathsForPermissionCheck(current) : undefined,
        ),
        resolvedPath,
      }
    }
    current = parent
  }
}

/** ¿Hay un `..` después de un segmento con nombre? (≙ `PEe`). */
function hasTraversalAfterSegment(path: string): boolean {
  let named = false
  for (const segment of path.split(getPlatform() === 'windows' ? /[\\/]/ : '/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (named) return true
    } else {
      named = true
    }
  }
  return false
}

/** ¿Hay un glob antes de un `..`, que el shell expandiría primero? (≙ `kre`). */
function hasGlobBeforeTraversal(path: string): boolean {
  const segments = path.split(/[\\/]+/)
  return segments.some((segment, i) => {
    if (segment !== '..') return false
    const before = segments.slice(0, i).join('/')
    return globIndex(before) !== -1 || (before.includes('[') && segments.slice(i + 1).join('/').includes(']'))
  })
}

/**
 * Resuelve los `..` como lo haría el sistema de archivos —siguiendo cada
 * enlace antes de subir— y valida el destino. Devuelve undefined cuando el
 * destino está permitido o no se puede resolver con certeza (≙ `STo`).
 */
function validatePhysicalTraversal(
  path: string,
  cwd: string,
  context: PathPermissionContext,
  operationType: FileOperationType,
): ValidatedPathResult | undefined {
  const fs = getFsImplementation()
  const full = isAbsolute(path) ? path : `${cwd}/${path}`
  let dir = '/'
  let pending: string[] = []
  for (const segment of full.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment !== '..') {
      pending.push(segment)
      continue
    }
    if (pending.length > 0) {
      const step = safeResolvePath(fs, resolve(dir, ...pending))
      if (!step.isCanonical) return undefined
      dir = step.resolvedPath
      pending = []
    }
    dir = dirname(dir)
  }
  const { resolvedPath, isCanonical } = safeResolvePath(fs, resolve(dir, ...pending))
  const result = isPathAllowed(resolvedPath, context, operationType, isCanonical ? [resolvedPath] : undefined)
  if (result.allowed || (result.isInWorkingDir === true && result.decisionReason === undefined)) return undefined
  return { ...result, resolvedPath }
}

/** La denegación específica de un `..`, si la hay (≙ `bTo`). */
function validateTraversal(
  path: string,
  cwd: string,
  context: PathPermissionContext,
  operationType: FileOperationType,
): ValidatedPathResult | undefined {
  if (getPlatform() === 'windows') return undefined
  const result = validatePhysicalTraversal(path, cwd, context, operationType)
  if (
    operationType === 'read' &&
    result?.decisionReason?.type !== 'rule' &&
    hasGlobBeforeTraversal(path) &&
    (context.blockReadsOutsideWorkingDirectories === true || hasReadDenyRule(context))
  ) {
    return {
      allowed: false,
      resolvedPath: path,
      decisionReason: {
        type: 'safetyCheck',
        reason: `A glob before the '..' in '${path}' is expanded by the shell before the path is opened, so the target cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories) or the Read deny rules. Spell the path without the glob.`,
        classifierApprovable: false,
        circuitBreaker: 'outsideReadsBlocked',
      },
    }
  }
  return result
}

/** `~` y `~/…` se expanden; `~usuario`, `~+` y `~-` no (≙ `Hp`). */
function expandHomeTilde(path: string): string {
  if (path === '~' || path.startsWith('~/')) return homedir() + path.slice(1)
  return path
}

/**
 * Valida una ruta tal como la escribió un comando: rechaza lo que el shell
 * reinterpretaría (UNC, variantes de tilde, expansiones, llaves y globs de
 * escritura, `..` tras un directorio) y valida el resto ya resuelto
 * (≙ `yS`).
 */
export function validatePath(
  path: string,
  cwd: string,
  context: PathPermissionContext,
  operationType: FileOperationType,
): ValidatedPathResult {
  const expanded = expandHomeTilde(path)
  const deny = (reason: string): ValidatedPathResult => ({
    allowed: false,
    resolvedPath: expanded,
    decisionReason: { type: 'other', reason },
  })
  if (isWindowsNetworkPath(expanded, true)) return deny('UNC network paths require manual approval')
  if (expanded.startsWith('~')) return deny('Tilde expansion variants (~user, ~+, ~-) in paths require manual approval')
  if (
    expanded.includes('$') ||
    (getPlatform() === 'windows' && expanded.includes('%')) ||
    expanded.includes('`') ||
    expanded.startsWith('=')
  ) {
    return deny('Shell expansion syntax in paths requires manual approval')
  }
  if (hasTraversalAfterSegment(expanded)) {
    return (
      validateTraversal(expanded, cwd, context, operationType) ??
      deny("Path contains '..' traversal after a directory segment, which may follow a symlink outside the working directory")
    )
  }
  if ((operationType === 'write' || operationType === 'create') && BRACE.test(expanded)) {
    return deny(
      'Brace characters in write target require manual approval — bash may brace-expand to paths outside the working directory',
    )
  }
  if (globIndex(expanded) !== -1) {
    if (operationType === 'write' || operationType === 'create') {
      return deny('Glob patterns are not allowed in write operations. Please specify an exact file path.')
    }
    return validateGlobPattern(expanded, cwd, context, operationType)
  }
  const absolute = isAbsolute(expanded) ? expanded : resolve(cwd, expanded)
  const { resolvedPath, isSymlink, isCanonical } = safeResolvePath(getFsImplementation(), absolute)
  return {
    ...isPathAllowed(
      resolvedPath,
      context,
      operationType,
      isCanonical ? [resolvedPath] : undefined,
      isCanonical && isSymlink && hasAnyDenyRule(context) ? getPathsForPermissionCheck(absolute) : undefined,
    ),
    resolvedPath,
  }
}
