/**
 * Puerto de `ccnmt: packages/memory/src/paths.ts`, con dos ajustes
 * declarados:
 *
 * 1. `getFeatureValue_CACHED_MAY_BE_STALE` / `getInitialSettings` /
 *    `getSettingsForSource` vienen del sustituto local
 *    `./internal/pendingCrossPackageDeps.js` (ver su docstring de
 *    procedencia) — el paquete `config` de origen no existe todavía en
 *    `@thyrox`.
 * 2. `readEnv` se guarda en una constante local antes de usarse dos veces
 *    en `getMemoryBaseDir` y en `getLocalAgentMemoryDir` (ver
 *    `agentMemory.ts`) — la fuente llama `readEnv(...)` dos veces con el
 *    mismo argumento dentro de un `if`, lo que bajo TypeScript estricto no
 *    reduce el tipo `string | undefined` en la segunda llamada. Mismo
 *    comportamiento, forma más segura.
 */
import { homedir } from 'node:os'
import { isAbsolute, join, normalize, sep } from 'node:path'
import { readEnv } from '@thyrox/config/env/utils'
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getInitialSettings,
  getSettingsForSource,
} from './internal/pendingCrossPackageDeps.js'
import { isEnvDefinedFalsy, isEnvTruthy, sanitizePath } from './internalUtils.js'
import { getMemoryHostBindings } from './host.js'

export function isAutoMemoryEnabled(): boolean {
  const envVal = readEnv('CLAUDE_CODE_DISABLE_AUTO_MEMORY')
  if (isEnvTruthy(envVal)) return false
  if (isEnvDefinedFalsy(envVal)) return true
  if (isEnvTruthy(readEnv('CLAUDE_CODE_SIMPLE'))) return false
  if (
    isEnvTruthy(readEnv('CLAUDE_CODE_REMOTE')) &&
    !readEnv('CLAUDE_CODE_REMOTE_MEMORY_DIR')
  ) {
    return false
  }
  const settings = getInitialSettings()
  if (settings.autoMemoryEnabled !== undefined) {
    return settings.autoMemoryEnabled
  }
  return true
}

export function isExtractModeActive(): boolean {
  if (!getFeatureValue_CACHED_MAY_BE_STALE('tengu_passport_quail', false)) {
    return false
  }
  const bindings = getMemoryHostBindings()
  return (
    !(bindings.getIsNonInteractiveSession?.() ?? false) ||
    getFeatureValue_CACHED_MAY_BE_STALE('tengu_slate_thimble', false)
  )
}

export function getMemoryBaseDir(): string {
  const remoteMemoryDir = readEnv('CLAUDE_CODE_REMOTE_MEMORY_DIR')
  if (remoteMemoryDir) {
    return remoteMemoryDir
  }
  const bindings = getMemoryHostBindings()
  return (
    bindings.getConfigHomeDir?.() ??
    (readEnv('CLAUDE_CONFIG_DIR') ?? join(homedir(), '.claude')).normalize(
      'NFC',
    )
  )
}

const AUTO_MEM_DIRNAME = 'memory'
const AUTO_MEM_ENTRYPOINT_NAME = 'MEMORY.md'

function validateMemoryPath(
  raw: string | undefined,
  expandTilde: boolean,
): string | undefined {
  if (!raw) return undefined
  let candidate = raw
  if (
    expandTilde &&
    (candidate.startsWith('~/') || candidate.startsWith('~\\'))
  ) {
    const rest = candidate.slice(2)
    const restNorm = normalize(rest || '.')
    if (restNorm === '.' || restNorm === '..') {
      return undefined
    }
    candidate = join(homedir(), rest)
  }
  const normalized = normalize(candidate).replace(/[/\\]+$/, '')
  if (
    !isAbsolute(normalized) ||
    normalized.length < 3 ||
    /^[A-Za-z]:$/.test(normalized) ||
    normalized.startsWith('\\\\') ||
    normalized.startsWith('//') ||
    normalized.includes('\0')
  ) {
    return undefined
  }
  return (normalized + sep).normalize('NFC')
}

function getAutoMemPathOverride(): string | undefined {
  return validateMemoryPath(
    readEnv('CLAUDE_COWORK_MEMORY_PATH_OVERRIDE'),
    false,
  )
}

function getAutoMemPathSetting(): string | undefined {
  const dir =
    getSettingsForSource('policySettings')?.autoMemoryDirectory ??
    getSettingsForSource('flagSettings')?.autoMemoryDirectory ??
    getSettingsForSource('localSettings')?.autoMemoryDirectory ??
    getSettingsForSource('userSettings')?.autoMemoryDirectory
  return validateMemoryPath(dir, true)
}

export function hasAutoMemPathOverride(): boolean {
  return getAutoMemPathOverride() !== undefined
}

function getAutoMemBase(): string {
  const bindings = getMemoryHostBindings()
  const projectRoot = bindings.getProjectRoot?.() ?? process.cwd()
  return bindings.findCanonicalGitRoot?.(projectRoot) ?? projectRoot
}

// Caché por clave (Map, sin límite de tamaño) — misma forma que
// `lodash-es/memoize` con resolver custom, que la fuente usa aquí
// (`memoize(fn, () => getMemoryHostBindings().getProjectRoot?.())`). Un
// caché de un solo slot habría cambiado el comportamiento observable ante
// una raíz de proyecto que alterna entre dos valores — lodash conserva
// AMBOS resultados; un slot único recomputaría al volver a la primera.
const _autoMemPathCache = new Map<string | undefined, string>()

export function getAutoMemPath(): string {
  const key = getMemoryHostBindings().getProjectRoot?.()
  const cached = _autoMemPathCache.get(key)
  if (cached !== undefined) return cached
  const override = getAutoMemPathOverride() ?? getAutoMemPathSetting()
  const value = override
    ? override
    : (
        join(getMemoryBaseDir(), 'projects', sanitizePath(getAutoMemBase()), AUTO_MEM_DIRNAME) +
        sep
      ).normalize('NFC')
  _autoMemPathCache.set(key, value)
  return value
}

/** Solo para tests: limpia el caché memoizado de `getAutoMemPath`. */
export function clearAutoMemPathCacheForTesting(): void {
  _autoMemPathCache.clear()
}

export function getAutoMemDailyLogPath(date: Date = new Date()): string {
  const yyyy = date.getFullYear().toString()
  const mm = (date.getMonth() + 1).toString().padStart(2, '0')
  const dd = date.getDate().toString().padStart(2, '0')
  return join(getAutoMemPath(), 'logs', yyyy, mm, `${yyyy}-${mm}-${dd}.md`)
}

export function getAutoMemEntrypoint(): string {
  return join(getAutoMemPath(), AUTO_MEM_ENTRYPOINT_NAME)
}

export function isAutoMemPath(absolutePath: string): boolean {
  const normalizedPath = normalize(absolutePath)
  return normalizedPath.startsWith(getAutoMemPath())
}
