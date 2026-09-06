// Adaptación de @claude-code-how-works/app-host: src/main/startup/settings.ts.
// Capa 1 (con cita a `../../cliArgs.js` y `../../startup/startupProfiler.js`,
// ambos del mismo paquete) — porte PARCIAL declarado.
//
// De las piezas que la fuente cita a paquetes hermanos, seis son
// trivialmente reimplementables con built-ins de Node y se inlinean
// verbatim (documentadas una a una abajo); el resto — `resetSettingsCache`,
// `setFlagSettingsPath`/`setAllowedSettingSources`, `getGlobalConfig`/
// `saveGlobalConfig` y las 9 migraciones — se reciben como colaboradores
// inyectables, con defaults no-op que reproducen el estado real de hoy.
//
// Reimplementadas localmente (built-ins únicamente, sin sibling package):
//
// - `safeParseJSON` (de `@claude-code-how-works/storage/json.js`) — se
//   simplifica a un `JSON.parse` con `try/catch`. La fuente puede validar
//   más (esquema, etc.); esta forma cubre el contrato que este módulo usa:
//   "parsear o fallar sin lanzar".
// - `generateTempFilePath` (de `@claude-code-how-works/storage/tempfile.js`)
//   — verbatim del ALGORITMO de `@thyrox/storage/src/tempfile.ts` (que ya
//   porta esto fiel, sólo built-ins): hash SHA-256 de 16 hex cuando hay
//   `contentHash`, si no un UUID. Se duplica en vez de importarse porque
//   un sibling package no resuelve hoy desde `app-host` (medido: `import
//   ('@thyrox/storage/tempfile.js')` da `Cannot find module`).
// - `errorMessage`/`isENOENT` (de
//   `@claude-code-how-works/local-observability/errorHelpers.js`) —
//   verbatim, dos líneas cada una.
// - `parseSettingSourcesFlag` (de
//   `@claude-code-how-works/config/settings/constants.ts:129-154`) —
//   verbatim, salvo que lanza `Error` en vez de la `ValidationError`
//   propia de ese paquete (no existe aquí; el mensaje se preserva).
// - `readFileSync`/`existsSync` — la fuente ya los toma de `'fs'` directo
//   (no son sibling package); se usan igual.
// - `isEnvTruthy` — verbatim de `ccnmt: packages/config/env/utils.ts:43-48`.
//
// `chalk` (dependencia npm, instalarla está prohibido por la tarea) se
// sustituye por un ANSI rojo mínimo local (`red()`), mismo efecto visual.
//
// `feature("TRANSCRIPT_CLASSIFIER")` es una macro de `bun:bundle`
// (confirmado ausente: ver `main/cli/runtimeActivation.ts`); se omite,
// mismo precedente que ese archivo y que
// `storage/src/sessionStoragePredicates.ts`.

import { existsSync, readFileSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eagerParseCliFlag } from '../../cliArgs.js'
import { profileCheckpoint } from '../../startup/startupProfiler.js'

function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalizedValue = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalizedValue)
}

function red(text: string): string {
  return `\x1b[31m${text}\x1b[0m`
}

function safeParseJSON(json: string): unknown {
  try {
    return JSON.parse(json)
  } catch {
    return undefined
  }
}

function generateTempFilePath(
  prefix = 'claude-prompt',
  extension = '.md',
  options?: { contentHash?: string },
): string {
  const id = options?.contentHash
    ? createHash('sha256').update(options.contentHash).digest('hex').slice(0, 16)
    : randomUUID()
  return join(tmpdir(), `${prefix}-${id}${extension}`)
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function isENOENT(e: unknown): boolean {
  return (
    !!e && typeof e === 'object' && 'code' in e && (e as { code?: unknown }).code === 'ENOENT'
  )
}

export type SettingSource = 'userSettings' | 'projectSettings' | 'localSettings'

function parseSettingSourcesFlag(flag: string): SettingSource[] {
  if (flag === '') return []
  const names = flag.split(',').map((s) => s.trim())
  const result: SettingSource[] = []
  for (const name of names) {
    switch (name) {
      case 'user':
        result.push('userSettings')
        break
      case 'project':
        result.push('projectSettings')
        break
      case 'local':
        result.push('localSettings')
        break
      default:
        throw new Error(`Invalid setting source: ${name}. Valid options are: user, project, local`)
    }
  }
  return result
}

export type SettingsFlagDeps = {
  resetSettingsCache?: () => void
  setFlagSettingsPath?: (path: string) => void
  setAllowedSettingSources?: (sources: SettingSource[]) => void
  errorSink?: (message: string) => void
  exitProcess?: (code: number) => void
  writeFile?: (path: string, content: string) => void
}

const noopSettingsFlagDeps: Required<SettingsFlagDeps> = {
  resetSettingsCache: () => {},
  setFlagSettingsPath: () => {},
  setAllowedSettingSources: () => {},
  errorSink: (message) => process.stderr.write(message),
  exitProcess: (code) => process.exit(code),
  writeFile: (path, content) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('node:fs').writeFileSync(path, content, 'utf8')
  },
}

export function loadSettingsFromFlag(settingsFile: string, deps: SettingsFlagDeps = {}): void {
  const d = { ...noopSettingsFlagDeps, ...deps }
  try {
    const trimmedSettings = settingsFile.trim()
    const looksLikeJson = trimmedSettings.startsWith('{') && trimmedSettings.endsWith('}')

    let settingsPath: string
    if (looksLikeJson) {
      const parsedJson = safeParseJSON(trimmedSettings)
      if (!parsedJson) {
        d.errorSink(red('Error: Invalid JSON provided to --settings\n'))
        d.exitProcess(1)
        return
      }
      settingsPath = generateTempFilePath('claude-settings', '.json', { contentHash: trimmedSettings })
      d.writeFile(settingsPath, trimmedSettings)
    } else {
      const resolvedSettingsPath = join(process.cwd(), settingsFile)
      try {
        if (!existsSync(resolvedSettingsPath)) {
          throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
        }
        readFileSync(resolvedSettingsPath, 'utf8')
      } catch (e) {
        if (isENOENT(e)) {
          d.errorSink(red(`Error: Settings file not found: ${resolvedSettingsPath}\n`))
          d.exitProcess(1)
          return
        }
        throw e
      }
      settingsPath = resolvedSettingsPath
    }

    d.setFlagSettingsPath(settingsPath)
    d.resetSettingsCache()
  } catch (error) {
    d.errorSink(red(`Error processing settings: ${errorMessage(error)}\n`))
    d.exitProcess(1)
  }
}

export function loadSettingSourcesFromFlag(settingSourcesArg: string, deps: SettingsFlagDeps = {}): void {
  const d = { ...noopSettingsFlagDeps, ...deps }
  try {
    const sources = parseSettingSourcesFlag(settingSourcesArg)
    d.setAllowedSettingSources(sources)
    d.resetSettingsCache()
  } catch (error) {
    d.errorSink(red(`Error processing --setting-sources: ${errorMessage(error)}\n`))
    d.exitProcess(1)
  }
}

export function eagerLoadSettings(deps: SettingsFlagDeps = {}): void {
  profileCheckpoint('eagerLoadSettings_start')
  const settingsFile = eagerParseCliFlag('--settings')
  if (settingsFile) {
    loadSettingsFromFlag(settingsFile, deps)
  }
  const settingSourcesArg = eagerParseCliFlag('--setting-sources')
  if (settingSourcesArg !== undefined) {
    loadSettingSourcesFromFlag(settingSourcesArg, deps)
  }
  profileCheckpoint('eagerLoadSettings_end')
}

const CURRENT_MIGRATION_VERSION = 11

export type MigrationsDeps = {
  getMigrationVersion?: () => number
  saveMigrationVersion?: (version: number) => void
  /**
   * Las 8 migraciones ordenadas de la fuente (`migrateBypassPermissionsAcceptedToSettings`
   * … `migrateReplBridgeEnabledToRemoteControlAtStartup`), aplanadas a una
   * lista — ninguna existe en este árbol. El ORDEN se preserva; los
   * nombres individuales no, porque no hay nada detrás de ellos todavía.
   */
  migrations?: Array<() => void>
  /** `migrateFennecToOpus`, sólo para `USER_TYPE === 'ant'`. */
  antOnlyMigration?: () => void
}

/**
 * Corre las migraciones de config pendientes si la versión guardada no
 * coincide con la actual, y actualiza la versión guardada al terminar.
 */
export function runMigrations(deps: MigrationsDeps = {}): void {
  const getMigrationVersion = deps.getMigrationVersion ?? (() => CURRENT_MIGRATION_VERSION)
  const saveMigrationVersion = deps.saveMigrationVersion ?? (() => {})

  if (getMigrationVersion() !== CURRENT_MIGRATION_VERSION) {
    for (const migrate of deps.migrations ?? []) {
      migrate()
    }
    if (process.env.USER_TYPE === 'ant') {
      ;(deps.antOnlyMigration ?? (() => {}))()
    }
    saveMigrationVersion(CURRENT_MIGRATION_VERSION)
  }
}

/**
 * Decide el entrypoint de esta invocación (`mcp`, la GitHub Action, `sdk-cli`
 * o `cli`) y lo fija en `CLAUDE_CODE_ENTRYPOINT` — pero sólo si esa
 * variable no viene ya seteada desde afuera. Verbatim, sin divergencias:
 * no cita ningún paquete hermano.
 */
export function initializeEntrypoint(isNonInteractive: boolean): void {
  if (process.env.CLAUDE_CODE_ENTRYPOINT) {
    return
  }
  const cliArgs = process.argv.slice(2)
  const mcpIndex = cliArgs.indexOf('mcp')
  if (mcpIndex !== -1 && cliArgs[mcpIndex + 1] === 'serve') {
    process.env.CLAUDE_CODE_ENTRYPOINT = 'mcp'
    return
  }
  if (isEnvTruthy(process.env.CLAUDE_CODE_ACTION)) {
    process.env.CLAUDE_CODE_ENTRYPOINT = 'claude-code-how-works-how-works-github-action'
    return
  }
  process.env.CLAUDE_CODE_ENTRYPOINT = isNonInteractive ? 'sdk-cli' : 'cli'
}
