/**
 * Las guardas de lectura y escritura de las herramientas de archivo: qué
 * decide `Read`/`Glob`/`LSP` antes de leer y `Edit`/`Write` antes de
 * escribir.
 *
 * Reimplementación del contrato de 2.1.275 (`chunk-9apg35nm.js`), no copia:
 *
 *   `checkReadPermissionForTool` ≙ `_w` · `checkWritePermissionForTool` ≙ `Wy`
 *   · `checkNetworkPathRead` ≙ `k_n` · `denyOutsideWorkingDirectories` ≙ `Bs`
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
 * Divergencias declaradas:
 *
 * - La memoria nunca está en pausa en este árbol (no hay `/pause-memory` ni
 *   `Kh`), así que la rama de `EN(y) && Kh()` de `Wy` no puede dispararse.
 * - El experimento en sombra `tengu_playful_lobster` (`Ju`/`Ys`/`td`/`xs`)
 *   sólo registra telemetría y no cambia la decisión: no se porta.
 * - `servedCall` no lo fija ningún productor en este árbol; la rama que
 *   convierte la negación en consulta se porta igual, leyendo las settings.
 */
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { getPathsForPermissionCheck } from '@thyrox/storage/fsOperations.js'
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
} from './internalPaths.js'
import {
  checkPathSafetyForAutoEdit,
  comparableSegment,
  isAutomountMapRoot,
  isInTrustedNetworkDirectory,
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
import { permissionRuleValueFromString } from './permissionRuleParser.js'
import type { PermissionDecision, PermissionUpdate } from './permissionTypes.js'
import { allPathsMatchAllowRule, escapeForIgnore, matchingRuleForInput } from './ruleMatching.js'

const FILE_READ_TOOL_NAME = 'Read'
const FILE_EDIT_TOOL_NAME = 'Edit'
const GLOB_TOOL_NAME = 'Glob'
const PROJECT_CLAUDE_TREE = '/.claude/**'
const USER_CLAUDE_TREE = '~/.claude/**'
const SYNCED_SKILL_NAME = 'synced'
const RESTRICTED_REASON = 'Restricted mode confines the file tools to the working directory'
const OUTSIDE_READS_BLOCKED =
  'Reads outside the working directories are blocked (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.'

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
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/config/env/utils.js') as { getClaudeConfigHomeDir: () => string }).getClaudeConfigHomeDir()
  } catch {
    return nodePath.join(require('node:os').homedir(), '.claude').normalize('NFC')
  }
}

function userHome(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('node:os') as typeof import('node:os')).homedir()
}

function folded(path: string): string {
  return path.normalize('NFC').toLowerCase()
}

/**
 * ¿Queda una ruta fuera de los directorios dados? Negación con la ruta
 * bloqueada; null si está dentro o si la ruta interna la permite (≙ `Bs`).
 */
export function denyOutsideWorkingDirectories(
  path: string,
  pathsToCheck: readonly string[],
  context: PathPermissionContext,
  internalCheck: () => { behavior: string },
  reason: OutsideReason,
  directories: Set<string>,
): PermissionDecision & { blockedPath?: string } | null {
  if (isPathInWorkingDirectories(path, context, pathsToCheck, directories) || internalCheck().behavior === 'allow') {
    return null
  }
  return {
    behavior: 'deny',
    message: `${path} is outside ${Array.from(directories).join(', ')}; ${reason.why}`,
    decisionReason: { type: 'other', reason: reason.reason },
    blockedPath: path,
  } as PermissionDecision & { blockedPath: string }
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
  const automount = (p: string) => isAutomountMapRoot(p) && !isInTrustedNetworkDirectory(p, trusted)
  const automountMessage = (p: string) =>
    `Claude requested permissions to read from ${p}, which is under the /net automount map and could trigger a DNS lookup and NFS mount to a remote host.`
  const AUTOMOUNT_REASON = 'Automount -hosts path detected (defense-in-depth check)'
  if (automount(path)) return ask(automountMessage(path), AUTOMOUNT_REASON)
  const paths = pathsToCheck ?? getPathsForPermissionCheck(path)
  for (const p of paths) {
    if (isUncPath(p) && !isLocalWslUncPath(p) && !isInTrustedNetworkDirectory(p, trusted)) {
      return ask(
        `Claude requested permissions to read from ${path}, which appears to be a UNC path that could access network resources.`,
        'UNC path detected (defense-in-depth check)',
      )
    }
    if (automount(p)) return ask(automountMessage(path), AUTOMOUNT_REASON)
  }
  if (tool.name === GLOB_TOOL_NAME) {
    const pattern = input.pattern
    if (typeof pattern === 'string' && isUncPath(pattern) && !isLocalWslUncPath(pattern) && !isInTrustedNetworkDirectory(pattern, trusted)) {
      return ask(
        `Claude requested permissions to glob ${pattern}, which appears to be a UNC pattern that could access network resources.`,
        'UNC glob pattern detected (defense-in-depth check)',
      )
    }
    if (typeof pattern === 'string' && automount(pattern)) {
      return ask(
        `Claude requested permissions to glob ${pattern}, which is under the /net automount map and could trigger a DNS lookup and NFS mount to a remote host.`,
        'Automount -hosts glob pattern detected (defense-in-depth check)',
      )
    }
  }
  for (const p of paths) {
    if (isSuspiciousWindowsPath(p, trusted)) {
      return ask(
        `Claude requested permissions to read from ${path}, which contains a suspicious Windows path pattern that requires manual approval.`,
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
  precomputedPathsToCheck?: readonly string[],
): PermissionDecision {
  const path = pathOf(tool, input)
  if (path === undefined) {
    return { behavior: 'ask', message: `Claude requested permissions to use ${tool.name}, but you haven't granted it yet.` }
  }
  const paths = precomputedPathsToCheck ?? getPathsForPermissionCheck(path)
  let expanded: string | undefined
  const absolute = () => (expanded ??= expandPath(path))

  for (const p of paths) {
    const rule = matchingRuleForInput(p, context, 'read', 'deny')
    if (rule) return { behavior: 'deny', message: `Permission to read ${path} has been denied.`, decisionReason: { type: 'rule', rule } }
  }

  if (context.restricted || context.blockReadsOutsideWorkingDirectories) {
    const denied = denyOutsideWorkingDirectories(
      path,
      paths,
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
  }

  const network = checkNetworkPathRead(tool, input, context, paths)
  if (network) return network

  for (const p of paths) {
    const rule = matchingRuleForInput(p, context, 'read', 'ask')
    if (rule) {
      return {
        behavior: 'ask',
        message: `Claude requested permissions to read from ${path}, but you haven't granted it yet.`,
        decisionReason: { type: 'rule', rule },
      }
    }
  }

  // Poder editar implica poder leer; en plan mode se mide como en default.
  const writeContext = context.mode === 'plan' ? { ...context, mode: 'default' } : context
  const write = checkWritePermissionForTool(tool, input, writeContext as PathPermissionContext, paths)
  if (write.behavior === 'allow') return write

  if (isPathInWorkingDirectories(path, context, paths, workingDirectoriesOf(context))) {
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
    message: `Claude requested permissions to read from ${path}, but you haven't granted it yet.`,
    suggestions: generateSuggestions(path, 'read', context, paths),
    decisionReason: { type: 'workingDir', reason: 'Path is outside allowed working directories' },
  }
}

/** ¿Puede la herramienta escribir la ruta que su entrada nombra? (≙ `Wy`). */
export function checkWritePermissionForTool(
  tool: FileTool,
  input: Input,
  context: PathPermissionContext,
  precomputedPathsToCheck?: readonly string[],
): PermissionDecision {
  const path = pathOf(tool, input)
  if (path === undefined) {
    return { behavior: 'ask', message: `Claude requested permissions to use ${tool.name}, but you haven't granted it yet.` }
  }
  const paths = precomputedPathsToCheck ?? getPathsForPermissionCheck(path)

  for (const p of paths) {
    const rule = matchingRuleForInput(p, context, 'edit', 'deny')
    if (rule) return { behavior: 'deny', message: `Permission to edit ${path} has been denied.`, decisionReason: { type: 'rule', rule } }
  }

  const absolute = expandPath(path)
  if (context.restricted) {
    const denied = denyOutsideWorkingDirectories(
      path,
      paths,
      context,
      () => checkEditableInternalPath(absolute, input, paths, { permissionMode: context.mode, restricted: true }),
      RESTRICTED_OUTSIDE,
      workingDirectoriesOf(context),
    )
    if (denied) return denied
  }

  // Los almacenes que el arnés gestiona no se escriben nunca, con ninguna regla.
  if (paths.some(isJobAdoptFile)) return ADOPT_JSON_DENIED as PermissionDecision
  if (paths.some(isSeedAdminPath)) return SEED_ADMIN_DENIED as PermissionDecision
  if (paths.some(isHostCredentialsFile)) return HOST_CREDENTIALS_DENIED as PermissionDecision
  if (paths.some(isProfileStorePath)) return PROFILE_STORE_DENIED as PermissionDecision
  if (paths.some(isSettingsReviewStore)) return SETTINGS_REVIEW_DENIED as PermissionDecision

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
        message: `Claude requested permissions to write to ${path}, but you haven't granted it yet.`,
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
    return {
      behavior: 'ask',
      message: safety.message,
      suggestions,
      decisionReason: {
        type: 'safetyCheck',
        reason: safety.message,
        ...safetyCheckFields(safety, context.restricted),
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

  return {
    behavior: 'ask',
    message: `Claude requested permissions to write to ${path}, but you haven't granted it yet.`,
    suggestions: generateSuggestions(path, 'write', context, paths),
    decisionReason: inWorkingDir ? undefined : { type: 'workingDir', reason: 'Path is outside allowed working directories' },
  }
}

