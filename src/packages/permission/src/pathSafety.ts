/**
 * La guarda de seguridad de una escritura automática: ¿es este archivo algo
 * que una edición sin preguntar no debe tocar? Settings de Claude, carpetas
 * de configuración de herramientas, archivos de arranque de shell y rutas
 * que en Windows o en red no significan lo que parecen.
 *
 * Reimplementación del contrato de 2.1.275, no copia:
 *
 *   `checkPathSafetyForAutoEdit` ≙ `Gge` · `isClaudeSettingsPath` ≙ `HTe` ·
 *   `isClaudeConfigDirectory` ≙ `xu` · `isClaudeCommandSource` ≙ `Cu` ·
 *   `isSensitivePath` ≙ `Lu` · `isSuspiciousWindowsPath` ≙ `b1` ·
 *   `pathContains` ≙ `Ld` · `isInTrustedNetworkDirectory` ≙ `Oe` ·
 *   `comparableSegment` ≙ `sc` · `comparablePath` ≙ `Ae` (todas en
 *   `chunk-9apg35nm.js`, salvo `sc` en `chunk-xbd48fav.js` y los predicados
 *   de red en `chunk-gfewy5rb.js`).
 *
 * Divergencias declaradas:
 *
 * - `Lu` empieza marcando sensible un archivo bajo un directorio productor
 *   de comandos de plugin (`eqr`: los `sourceProducerPath` y
 *   `previousProducerPaths` de `installed_plugins.json`) o bajo la raíz de
 *   un plugin en línea (`QGr`: `inlinePlugins`/`inlinePluginsNoMcp` del
 *   anfitrión). Esta rama NO está portada: este árbol no registra rutas
 *   productoras en su esquema de plugins ni tiene la API de plugins en
 *   línea del anfitrión. Lo que sigue cubierto: la caché de plugins vive
 *   bajo `~/.claude/`, y el segmento `.claude` ya es sensible por sí mismo.
 *   Sucesor: TASK-THYROX-0251.
 * - `Vv` (la superficie de automontaje `/Network` de macOS) es constante
 *   `false` en la build de Linux medida; se reproduce así.
 * - `So()` (la raíz de configuración de proyecto que el anfitrión declara en
 *   el lanzamiento) no existe en este árbol: la raíz es el cwd original.
 */
import * as nodeFs from 'node:fs'
import { homedir } from 'node:os'
import * as nodePath from 'node:path'
import { getPlatform } from '@thyrox/config/platform.js'
import { getPathsForPermissionCheck } from '@thyrox/storage/fsOperations.js'
import { foldPathCase } from './ruleMatching.js'

export type TrustedNetworkDirectories = Map<string, readonly string[]>

export type PathSafetyResult =
  | { safe: true }
  | {
      safe: false
      message: string
      classifierApprovable: boolean
      circuitBreaker?: 'suspiciousWindowsPath' | 'claudeSettingsFile'
      also?: ['claudeSettingsFile']
    }

const SEP = nodePath.sep

/** Directorios cuyo contenido configura herramientas que ejecutan código. */
export const SENSITIVE_DIRECTORIES = [
  '.git',
  '.vscode',
  '.idea',
  '.claude',
  '.husky',
  '.cargo',
  '.devcontainer',
  '.yarn',
  '.mvn',
] as const

/** Secuencias de segmentos sensibles aunque ninguno lo sea solo. */
export const SENSITIVE_SEGMENT_SEQUENCES = ['.config/git'] as const

/** Archivos que una herramienta lee al arrancar y pueden ejecutar código. */
export const SENSITIVE_FILES = [
  '.gitconfig',
  '.gitmodules',
  '.bashrc',
  '.bash_profile',
  '.zshrc',
  '.zprofile',
  '.profile',
  '.zshenv',
  '.zlogin',
  '.zlogout',
  '.bash_login',
  '.bash_aliases',
  '.bash_logout',
  '.envrc',
  '.ripgreprc',
  '.mcp.json',
  '.claude.json',
  '.npmrc',
  '.yarnrc',
  '.yarnrc.yml',
  '.pnp.cjs',
  '.pnp.loader.mjs',
  '.pnpmfile.cjs',
  'bunfig.toml',
  '.bunfig.toml',
  '.bazelrc',
  '.bazelversion',
  '.bazeliskrc',
  '.pre-commit-config.yaml',
  'lefthook.yml',
  '.lefthook.yml',
  'lefthook.yaml',
  '.lefthook.yaml',
  'gradle-wrapper.properties',
  'maven-wrapper.properties',
  '.devcontainer.json',
  'pyrightconfig.json',
] as const

const USER_SETTINGS_FILE_NAMES = ['settings.json', 'cowork_settings.json'] as const
const PROJECT_SETTINGS_FILE_NAMES = ['settings.json', 'settings.local.json'] as const
const SETTINGS_FILE_NAMES = [...new Set([...USER_SETTINGS_FILE_NAMES, ...PROJECT_SETTINGS_FILE_NAMES])]
const SETTINGS_SOURCES = ['userSettings', 'projectSettings', 'localSettings', 'flagSettings', 'policySettings'] as const

const INVISIBLE_FORMAT_CHARS = /[‌-‏‪-‮⁪-⁯﻿]/g
const COMPARABLE_CACHE_ENTRIES = 1024

// ---- Entorno ----

function platform(): string {
  return getPlatform()
}

function getOriginalCwdDeferred(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/app-host/bootstrap/state.js') as { getOriginalCwd: () => string }).getOriginalCwd()
  } catch {
    return process.cwd()
  }
}

function getCwdDeferred(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/app-host/bootstrap/cwd.js') as { getCwd: () => string }).getCwd()
  } catch {
    return getOriginalCwdDeferred()
  }
}

function getClaudeConfigHomeDirDeferred(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/config/env/utils.js') as { getClaudeConfigHomeDir: () => string }).getClaudeConfigHomeDir()
  } catch {
    return nodePath.join(homedir(), '.claude').normalize('NFC')
  }
}

function expandPathDeferred(path: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/storage/path.js') as { expandPath: (p: string) => string }).expandPath(path)
  } catch {
    return nodePath.resolve(getCwdDeferred(), path)
  }
}

function settingsFilePathForSource(source: string): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/config/settings') as { getSettingsFilePathForSource: (s: string) => string | undefined }).getSettingsFilePathForSource(source)
  } catch {
    return undefined
  }
}

function managedSettingsDropInDir(): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/config/settings/managedPath.js') as { getManagedSettingsDropInDir: () => string }).getManagedSettingsDropInDir()
  } catch {
    return undefined
  }
}

function realpathOrUndefined(path: string): string | undefined {
  try {
    return nodeFs.realpathSync(path)
  } catch {
    return undefined
  }
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

// ---- Forma comparable ----

/**
 * Un segmento de ruta tal como el sistema de archivos lo resolvería: sin
 * mayúsculas, sin caracteres de formato invisibles, sin flujo alterno de
 * NTFS (`:$DATA`) ni los puntos y espacios finales que Windows descarta.
 */
export function comparableSegment(segment: string): string {
  const folded = foldPathCase(segment)
  return folded.replace(INVISIBLE_FORMAT_CHARS, '').replace(/:.*$/, '').replace(/[. ]+$/, '') || folded
}

const comparableBySpelling = new Map<string, string>()

/** La ruta normalizada con cada segmento en forma comparable (≙ `Ae`). */
export function comparablePath(path: string): string {
  const hit = comparableBySpelling.get(path)
  if (hit !== undefined) return hit
  const value = nodePath.normalize(path).split(SEP).map(comparableSegment).join(SEP)
  if (comparableBySpelling.size >= COMPARABLE_CACHE_ENTRIES) comparableBySpelling.clear()
  comparableBySpelling.set(path, value)
  return value
}

// ---- Predicados de red (chunk-gfewy5rb.js) ----

const DEVICE_NAMESPACE_PREFIX = /^[\\/]\?\?[\\/]/

/** `\??\` al principio: el espacio de nombres de objetos de NT (≙ `H6`). */
export function isDeviceNamespacePath(path: string): boolean {
  return (
    DEVICE_NAMESPACE_PREFIX.test(path) ||
    (path.includes('??') && DEVICE_NAMESPACE_PREFIX.test(nodePath.win32.normalize(path)))
  )
}

/** Una ruta UNC: doble barra inicial o espacio de dispositivo (≙ `Pn`). */
export function isUncPath(path: string): boolean {
  return /^[\\/]{2}/.test(path) || isDeviceNamespacePath(path)
}

/** `\\wsl$\<distro>` o `\\wsl.localhost\<distro>`: local, no de red (≙ `la`). */
export function isLocalWslUncPath(path: string): boolean {
  const match = /^[\\/]{2}wsl(?:\$|\.localhost)[\\/]([^\\/]*)/i.exec(path)
  return match !== null && !/^\.{0,2}[. ]*$/.test(match[1] ?? '')
}

function mountSegment(segment: string): string {
  return segment.replace(INVISIBLE_FORMAT_CHARS, '').toUpperCase().toLowerCase()
}

const automountByPath = new Map<string, string | null>()

/** El punto de montaje de `/net/<host>` que una ruta alcanza, o null (≙ `fZe`). */
export function automountRoot(path: string): string | null {
  if (!path.startsWith('/')) return null
  const hit = automountByPath.get(path)
  if (hit !== undefined) return hit
  let value: string | null = null
  const stack: string[] = []
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      stack.pop()
      continue
    }
    stack.push(segment)
    if (
      (stack.length === 2 && mountSegment(stack[0]!) === 'net') ||
      (stack.length === 3 && mountSegment(stack[0]!) === 'network' && mountSegment(stack[1]!) === 'servers')
    ) {
      value = `/${stack.join('/')}`
      break
    }
  }
  if (automountByPath.size >= COMPARABLE_CACHE_ENTRIES) automountByPath.clear()
  automountByPath.set(path, value)
  return value
}

/** `/net` mismo, el mapa de automontaje (≙ `Xh`). */
export function isAutomountMapRoot(path: string): boolean {
  if (!path.startsWith('/')) return false
  const stack: string[] = []
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      stack.pop()
      continue
    }
    stack.push(segment)
  }
  return stack.length === 1 && stack[0]!.toLowerCase() === 'net'
}

/** Un segmento `..` (≙ `q9`). */
function hasParentSegment(path: string): boolean {
  return /(?:^|[\\/])\.\.(?:[\\/]|$)/.test(path)
}

/** Un segmento de puntos, que ya no se puede comparar sin resolver (≙ `Ya`). */
function hasDotSegment(path: string): boolean {
  return /(^|[\\/])\.{1,2}[. ]*([\\/]|$)/.test(path)
}

/**
 * ¿Está `path` dentro de `dir` o es `dir`? (≙ `Ld`). `/private/var` y
 * `/private/tmp` se leen como su alias corto salvo que se pida lo contrario.
 */
export function pathContains(
  path: string,
  dir: string,
  { caseFold = true, skipPrivateAlias = false, uncShapeParity = false }: {
    caseFold?: boolean
    skipPrivateAlias?: boolean
    uncShapeParity?: boolean
  } = {},
): boolean {
  const expanded = expandPathDeferred(path)
  const expandedDir = expandPathDeferred(dir)
  if (uncShapeParity && (isUncPath(expanded) !== isUncPath(expandedDir) || isUncPath(path) !== isUncPath(dir))) {
    return false
  }
  const privateVar = caseFold ? /^\/private\/var\//i : /^\/private\/var\//
  const privateTmp = caseFold ? /^\/private\/tmp(\/|$)/i : /^\/private\/tmp(\/|$)/
  const unalias = (p: string) => (skipPrivateAlias ? p : p.replace(privateVar, '/var/').replace(privateTmp, '/tmp$1'))
  const target = unalias(expanded)
  const container = unalias(expandedDir)
  const relative =
    platform() === 'windows'
      ? nodePath.relative(
          (caseFold ? foldPathCase(container) : container).replace(/\\/g, '/'),
          (caseFold ? foldPathCase(target) : target).replace(/\\/g, '/'),
        )
      : nodePath.relative(caseFold ? foldPathCase(container) : container, caseFold ? foldPathCase(target) : target)
  if (relative === '') return true
  if (hasParentSegment(relative)) return false
  return !nodePath.isAbsolute(relative)
}

/** ¿Está en un directorio de red que el usuario declaró de confianza? (≙ `Oe`). */
export function isInTrustedNetworkDirectory(path: string, trusted?: TrustedNetworkDirectories): boolean {
  if (!trusted || trusted.size === 0) return false
  if (hasDotSegment(path)) return false
  for (const dirs of trusted.values()) {
    for (const dir of dirs) {
      if (isUncPath(path) !== isUncPath(dir)) continue
      if (pathContains(path, dir)) return true
    }
  }
  return false
}

/** Un UNC de red o un espacio de dispositivo no autorizado (≙ `Wge`). */
function isUntrustedNetworkShare(path: string, trusted?: TrustedNetworkDirectories): boolean {
  if (isDeviceNamespacePath(path)) return true
  return isUncPath(path) && !isLocalWslUncPath(path) && !isInTrustedNetworkDirectory(path, trusted)
}

/** Un automontaje de red no autorizado (≙ `UYe`; `Vv` es falso en Linux). */
function isUntrustedAutomount(path: string, trusted?: TrustedNetworkDirectories): boolean {
  return (automountRoot(path) !== null || isAutomountMapRoot(path)) && !isInTrustedNetworkDirectory(path, trusted)
}

// ---- Rutas de Windows ambiguas (≙ `b1`, `hw`) ----

const SHORT_NAME = /~\d/
const TRAILING_DOTS_OR_SPACES = /[.\s]+$/
const DEVICE_NAME_SUFFIX = /\.(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i
const FLAG_ASSIGNMENT = /^--?[A-Za-z0-9][\w-]*=/
const EMBEDDED_DEVICE_NAMESPACE = /(?:^|[^A-Za-z0-9_])[\\/]\?\?(?:[\\/]|$)/

/**
 * Una ruta o argumento que en Windows alcanzaría un recurso de red (≙ `hw`).
 * Fuera de Windows siempre es falso.
 */
export function isWindowsNetworkPath(value: string, asArgument = false): boolean {
  if (platform() !== 'windows') return false
  if (asArgument && isUncPath(value)) return true
  if (asArgument && /^-[A-Za-z0-9]/.test(value)) {
    const rest = value.replace(/^(?:-[A-Za-z0-9]+)+/, '')
    if (rest.length > 0 && isWindowsNetworkPath(rest, true)) return true
  }
  if (asArgument && FLAG_ASSIGNMENT.test(value)) {
    let rest = value
    while (FLAG_ASSIGNMENT.test(rest)) rest = rest.slice(rest.indexOf('=') + 1)
    if (rest.length > 0 && isWindowsNetworkPath(rest, true)) return true
  }
  if (/\\\\[^ \t\r\n\f\v\\/]+(?:@(?:\d+|ssl))?(?:[\\/]|$|\s)/i.test(value)) return true
  if (EMBEDDED_DEVICE_NAMESPACE.test(value)) return true
  if (/(?<!:)\/\/[^ \t\r\n\f\v\\/]+(?:@(?:\d+|ssl))?(?:[\\/]|$|\s)/i.test(value)) return true
  if ((asArgument ? /(?<![:\w])\/\\{1,}[^ \t\r\n\f\v\\/]+[\\/]/ : /\/\\{2,}[^ \t\r\n\f\v\\/]/).test(value)) return true
  if ((asArgument ? /(?<![:\w])\\{1,}\/[^ \t\r\n\f\v\\/]+[\\/]/ : /\\{2,}\/[^ \t\r\n\f\v\\/]/).test(value)) return true
  if (/@SSL@\d+/i.test(value) || /@\d+@SSL/i.test(value)) return true
  if (/DavWWWRoot/i.test(value)) return true
  if (/^\\\\(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})[\\/]/.test(value) || /^\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})[\\/]/.test(value)) {
    return true
  }
  if (/^\\\\(\[[\da-fA-F:]+\])[\\/]/.test(value) || /^\/\/(\[[\da-fA-F:]+\])[\\/]/.test(value)) return true
  return false
}

/**
 * Una ruta cuyo significado en Windows no es el que se lee: flujo alterno,
 * nombre corto 8.3, prefijo de dispositivo, segmento con punto o espacio
 * final, nombre reservado, tres puntos o un recurso de red (≙ `b1`).
 * El nombre corto y los nombres reservados cuentan en cualquier sistema.
 */
export function isSuspiciousWindowsPath(path: string, trusted?: TrustedNetworkDirectories): boolean {
  if (isDeviceNamespacePath(path)) return true
  if ((platform() === 'windows' || platform() === 'wsl') && path.indexOf(':', 2) !== -1) return true
  if (SHORT_NAME.test(path)) return true
  if (path.startsWith('\\\\?\\') || path.startsWith('\\\\.\\') || path.startsWith('//?/') || path.startsWith('//./')) {
    return true
  }
  for (const segment of path.split(/[/\\]/)) {
    if (segment === '' || segment === '.' || segment === '..') continue
    if (TRAILING_DOTS_OR_SPACES.test(segment)) return true
  }
  if (DEVICE_NAME_SUFFIX.test(path)) return true
  if (/(^|\/|\\)\.{3,}(\/|\\|$)/.test(path)) return true
  if (isWindowsNetworkPath(path, true) && !isLocalWslUncPath(path) && !isInTrustedNetworkDirectory(path, trusted)) {
    return true
  }
  return false
}

// ---- Archivos de configuración de Claude ----

/** `~/.claude` y el directorio de configuración, sin repetir (≙ `eo`). */
function claudeHomeDirectories(): string[] {
  return unique([getClaudeConfigHomeDirDeferred(), nodePath.join(homedir(), '.claude')])
}

/** Las raíces de proyecto donde vive un `.claude` (≙ `Qr`). */
function projectConfigRoots(): string[] {
  return [getOriginalCwdDeferred()]
}

/** Los directorios de settings administrados (≙ `Ts`). */
function managedSettingsDirectories(): string[] {
  const dir = managedSettingsDropInDir()
  return dir === undefined ? [] : [dir]
}

/** Toda ruta de archivo de settings conocida (≙ `Mu`). */
function knownSettingsFiles(): string[] {
  const files = SETTINGS_SOURCES.map(settingsFilePathForSource).filter((p): p is string => p !== undefined)
  for (const dir of claudeHomeDirectories()) {
    for (const name of USER_SETTINGS_FILE_NAMES) files.push(nodePath.join(dir, name))
  }
  return files
}

/** ¿Es un archivo de settings de Claude, de cualquier fuente? (≙ `HTe`). */
export function isClaudeSettingsPath(path: string): boolean {
  const target = comparablePath(expandPathDeferred(path))
  if (target.endsWith(`${SEP}.claude${SEP}settings.json`) || target.endsWith(`${SEP}.claude${SEP}settings.local.json`)) {
    return true
  }
  if (knownSettingsFiles().some(file => comparablePath(file) === target)) return true
  if (target.endsWith('.json') && managedSettingsDirectories().some(dir => comparablePath(dir) === nodePath.dirname(target))) {
    return true
  }
  const name = nodePath.basename(target)
  if (!SETTINGS_FILE_NAMES.map(comparableSegment).includes(name)) return false
  const userNames = USER_SETTINGS_FILE_NAMES.map(comparableSegment)
  const candidates: Array<[string, readonly string[]]> = [
    ...claudeHomeDirectories().map((dir): [string, readonly string[]] => [dir, userNames]),
    ...projectConfigRoots().map((root): [string, readonly string[]] => [nodePath.join(root, '.claude'), PROJECT_SETTINGS_FILE_NAMES]),
  ]
  return candidates.some(([dir, names]) => {
    if (!names.includes(name)) return false
    const real = realpathOrUndefined(dir)
    return real !== undefined && nodePath.join(comparablePath(real), name) === target
  })
}

/** ¿Es un directorio de configuración de Claude mismo? (≙ `xu`). */
export function isClaudeConfigDirectory(path: string): boolean {
  const target = comparablePath(expandPathDeferred(path)).replace(/[\\/]+$/, '')
  if (nodePath.basename(target) === comparableSegment('.claude')) return true
  const policyFile = settingsFilePathForSource('policySettings')
  const dirs = unique([
    ...claudeHomeDirectories(),
    ...projectConfigRoots().map(root => nodePath.join(root, '.claude')),
    ...(policyFile !== undefined ? [nodePath.dirname(policyFile)] : []),
    ...managedSettingsDirectories(),
  ])
  return dirs.some(dir => {
    if (comparablePath(dir) === target) return true
    const real = realpathOrUndefined(dir)
    return real !== undefined && comparablePath(real) === target
  })
}

/** Settings, o un comando, agente o skill del proyecto (≙ `Cu`). */
export function isClaudeCommandSource(path: string): boolean {
  if (isClaudeSettingsPath(path)) return true
  return projectConfigRoots().some(
    root =>
      pathContains(path, nodePath.join(root, '.claude', 'commands')) ||
      pathContains(path, nodePath.join(root, '.claude', 'agents')) ||
      pathContains(path, nodePath.join(root, '.claude', 'skills')),
  )
}

// ---- Rutas sensibles (≙ `Lu`) ----

/**
 * Cuántos segmentos iniciales de `segments` son el directorio de trabajo, o
 * hasta el primer `.claude` que no sea de un worktree (≙ `Ws`). Un `.claude`
 * que ya forma parte del cwd no cuenta como configuración que se escribe.
 */
function workingDirectoryDepth(segments: string[]): number {
  let depth = 0
  const originalCwd = getOriginalCwdDeferred()
  const roots =
    process.env.CLAUDE_CODE_EVAL_CONFINED ? [originalCwd] : getPathsForPermissionCheck(originalCwd)
  for (const root of roots) {
    const parts = expandPathDeferred(root).split(SEP)
    if (parts.length > 1 && parts.at(-1) === '') parts.pop()
    let shared = 0
    while (
      shared < parts.length &&
      shared < segments.length &&
      (segments[shared] === parts[shared] ||
        (shared === 0 && /^[a-z]:$/i.test(segments[shared]!) && segments[shared]!.toLowerCase() === parts[shared]!.toLowerCase()))
    ) {
      shared++
    }
    if (shared !== parts.length) continue
    let limit = shared
    for (let i = 0; i < shared; i++) {
      if (comparableSegment(parts[i]!) === '.claude' && comparableSegment(parts[i + 1] ?? '') !== 'worktrees') {
        limit = i
        break
      }
    }
    if (limit > depth) depth = limit
  }
  return depth
}

/**
 * ¿Es una ruta que una edición automática no debe tocar? `allowClaudeConfig`
 * abre `skills`, `agents` y `commands` de un `.claude` dentro del trabajo, y
 * nada más.
 */
export function isSensitivePath(
  path: string,
  allowClaudeConfig: boolean,
  trusted?: TrustedNetworkDirectories,
): boolean {
  const expanded = expandPathDeferred(path)
  const segments = expanded.split(SEP)
  const last = segments.at(-1)
  if (isUntrustedNetworkShare(path, trusted)) return true
  if (isUntrustedAutomount(path, trusted)) return true

  let openedInsideWork = false
  const workDepth = workingDirectoryDepth(segments)
  for (let i = 0; i < segments.length; i++) {
    const segment = comparableSegment(segments[i]!)
    for (const dir of SENSITIVE_DIRECTORIES) {
      if (segment !== foldPathCase(dir)) continue
      if (dir === '.claude') {
        const insideWork = i >= workDepth
        if (openedInsideWork) return true
        const next = segments[i + 1]
        const nextSegment = next ? comparableSegment(next) : undefined
        if (allowClaudeConfig && nextSegment) {
          if (nextSegment === 'skills' || nextSegment === 'agents' || nextSegment === 'commands') {
            if (insideWork) openedInsideWork = true
            break
          }
          if (nextSegment === 'scheduled_tasks.json' && i + 1 === segments.length - 1) break
        }
        if (nextSegment === 'worktrees') {
          if (insideWork) openedInsideWork = true
          break
        }
      }
      return true
    }
  }
  for (const sequence of SENSITIVE_SEGMENT_SEQUENCES) {
    const parts = sequence.split('/')
    for (let start = 0; start + parts.length <= segments.length; start++) {
      if (parts.every((part, k) => comparableSegment(segments[start + k]!) === foldPathCase(part))) return true
    }
  }
  if (last) {
    const name = comparableSegment(last)
    if (SENSITIVE_FILES.some(file => foldPathCase(file) === name)) return true
  }
  return false
}

// ---- La guarda (≙ `Gge`) ----

/**
 * ¿Puede una edición automática escribir `path`? Se prueban la ruta y todas
 * las que la resolución de enlaces alcanza. `allowClaudeConfig` abre los
 * comandos, agentes y skills del proyecto; `allowClaudeConfigForMode` hace
 * lo mismo por el modo de la sesión, y basta con uno.
 */
export function checkPathSafetyForAutoEdit(
  path: string,
  pathsToCheck?: readonly string[],
  allowClaudeConfig?: boolean,
  allowClaudeConfigForMode?: boolean,
  trusted?: TrustedNetworkDirectories,
): PathSafetyResult {
  const allow = Boolean(allowClaudeConfig || allowClaudeConfigForMode)
  const paths = pathsToCheck ?? getPathsForPermissionCheck(path)
  const touchesSettings = paths.some(p => isClaudeSettingsPath(p) || isClaudeConfigDirectory(p))
  for (const p of paths) {
    if (isSuspiciousWindowsPath(p, trusted)) {
      return {
        safe: false,
        message: `Claude requested permissions to write to ${path}, which contains a suspicious Windows path pattern that requires manual approval.`,
        classifierApprovable: false,
        circuitBreaker: 'suspiciousWindowsPath',
        ...(touchesSettings && { also: ['claudeSettingsFile'] as ['claudeSettingsFile'] }),
      }
    }
  }
  if (touchesSettings) {
    return {
      safe: false,
      message: `Claude requested permissions to write to ${path}, but you haven't granted it yet.`,
      classifierApprovable: true,
      circuitBreaker: 'claudeSettingsFile',
    }
  }
  for (const p of paths) {
    if (!allow && isClaudeCommandSource(p)) {
      return {
        safe: false,
        message: `Claude requested permissions to write to ${path}, but you haven't granted it yet.`,
        classifierApprovable: true,
      }
    }
  }
  for (const p of paths) {
    if (isSensitivePath(p, allow, trusted)) {
      return {
        safe: false,
        message: `Claude requested permissions to edit ${path} which is a sensitive file.`,
        classifierApprovable: true,
      }
    }
  }
  return { safe: true }
}
