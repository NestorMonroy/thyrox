/**
 * Puerto de `ccnmt: packages/config/plugin/_deps.ts` (1005 líneas fuente).
 * `@claude-code-how-works/config/plugin/_deps` — inyección de dependencias
 * por setter (V7 §3.2 ports-and-adapters) para el subsistema de plugins.
 * Más de 50 dependencias cruzadas hacia `bootstrap/state`, `services/mcp`,
 * `services/lsp`, `tools/*`, `commands.js`, `state/AppState` y varios
 * `utils/*` se canalizan por setters aquí. El lado `src` (en la fuente,
 * `runtime/installPluginBindings.ts`) conecta cada setter a la
 * implementación real al arrancar.
 *
 * Reimplementación fiel: mismos nombres exportados, misma firma, mismos
 * defaults conservadores (no-op o passthrough) donde la fuente ya los
 * declara así — este módulo es, por diseño de la propia fuente, la pieza
 * MÁS portable de los 15: casi todo son pares `let _x = default; export
 * function x() { return _x() }; export function setXFn(fn) { _x = fn }`,
 * sin ningún import cruzado real en el 90% de los slots.
 *
 * Imports estáticos de la fuente — "misma capa wave-1, sin riesgo de
 * ciclo" según su propio docstring. De los seis, DOS están en los 15
 * módulos de este pase y resuelven tal cual:
 * - `McpServerConfigSchema` — de `../mcpConfigSchema.ts` (portado).
 * - `expandEnvVarsInString` — de `../utils/envExpansion.ts` (portado).
 *
 * Los otros CUATRO son hermanos de `@thyrox/config` que NO están entre los
 * 15 módulos de este pase, así que no existen en este árbol todavía. Dos
 * son hojas triviales y se portan aparte (mismo criterio hoja-vs-red que
 * `internal/lazySchema.ts`):
 * - `expandTilde` — `../utils/expandTilde.ts` (portado, sin deps propias).
 * - `extractDescriptionFromMarkdown` — `../utils/markdownDescription.ts`
 *   (portado, sin deps propias).
 *
 * Los otros DOS (`parseFrontmatter` de `../frontmatterParser.ts`,
 * `substituteArguments` de `../utils/argumentSubstitution.ts`) tienen sus
 * propias redes de dependencias (`./yaml.ts`+`local-observability/debug`;
 * `@thyrox/shell/bash/shellQuote.js`) y NO se portan en este pase. Se
 * degradan al MISMO patrón de default conservador que la propia fuente ya
 * usa en decenas de otros slots de este archivo (p. ej. su propio
 * `_getParseYaml` por defecto es `() => null`) — no un `require()` que
 * lance, sino una reimplementación mínima explícitamente más simple que la
 * fuente, documentada como tal, exactamente el mismo trato que
 * `getExtractDescriptionFromMarkdown`/`getExpandTilde` reciben en la propia
 * fuente antes de que el host los conecte.
 *
 * Reexports de cola de la fuente:
 * - `BUILTIN_MARKETPLACE_NAME` — de `./builtin.ts` (portado en este pase).
 * - `EFFORT_LEVELS` — de `@thyrox/agent/effort.ts`. EXISTE con este valor
 *   exacto (verificado leyendo el archivo), pero `export {...} from` es un
 *   binding estático que fallaría igual que un `import` (sin symlink de
 *   workspace). Se intenta `require()` y, si falla, se cae al valor real
 *   copiado — no inventado — como fallback.
 * - `coerceDescriptionToString` — de `@thyrox/agent/frontmatterParser.ts`
 *   (existe). Es función, así que se envuelve como función (no como
 *   binding estático).
 * - `FRONTMATTER_REGEX` — de `../frontmatterParser.ts`, no portado en este
 *   pase. Se declara localmente con el valor exacto de la fuente
 *   (`/^---\s*\n([\s\S]*?)---\s*\n?/`, verificado leyendo el archivo) — es
 *   una constante de dato, no lógica, así que copiarla preserva fidelidad
 *   sin necesitar el módulo entero.
 * - `FILE_EDIT_TOOL_NAME`/`FILE_READ_TOOL_NAME`/`FILE_WRITE_TOOL_NAME` — de
 *   `@claude-code-how-works/tool-registry/tools/.../constants.js`. El
 *   paquete `tool-registry` NO EXISTE EN ABSOLUTO en este árbol (verificado
 *   con `ls src/packages/`) — no hay `@thyrox/tool-registry` que portar ni
 *   parcialmente. Las tres constantes NO se re-exportan; ver el reporte
 *   final para el veredicto.
 */

import { requireAgentFrontmatterParser } from '../internal/pendingCrossPackageDeps.js'
import { expandEnvVarsInString as _canonicalExpandEnvVarsInString } from '../utils/envExpansion.js'
import { expandTilde as _canonicalExpandTilde } from '../utils/expandTilde.js'
import { extractDescriptionFromMarkdown as _canonicalExtractDescriptionFromMarkdown } from '../utils/markdownDescription.js'
import { McpServerConfigSchema as _canonicalMcpServerConfigSchema } from '../mcpConfigSchema.js'

// ---------------------------------------------------------------------------
// Logging / diagnóstico (reinyectado — evita imports cíclicos)
// ---------------------------------------------------------------------------

let _logForDebugging: (message: string, ...args: unknown[]) => void = () => {}
let _logError: (error: unknown) => void = () => {}
let _logForDiagnosticsNoPII: (
  level: 'debug' | 'info' | 'warn' | 'error',
  event: string,
  data?: Record<string, unknown>,
) => void = () => {}

export function logForDebugging(message: string, ...args: unknown[]): void {
  _logForDebugging(message, ...args)
}
export function logError(error: unknown): void {
  _logError(error)
}
export function logForDiagnosticsNoPII(
  level: 'debug' | 'info' | 'warn' | 'error',
  event: string,
  data?: Record<string, unknown>,
): void {
  _logForDiagnosticsNoPII(level, event, data)
}
export function setLogForDebuggingFn(fn: typeof _logForDebugging): void {
  _logForDebugging = fn
}
export function setLogErrorFn(fn: typeof _logError): void {
  _logError = fn
}
export function setLogForDiagnosticsNoPIIFn(
  fn: typeof _logForDiagnosticsNoPII,
): void {
  _logForDiagnosticsNoPII = fn
}

// ---------------------------------------------------------------------------
// Helpers de FS + rutas
// ---------------------------------------------------------------------------

export type PluginFsImpl = {
  existsSync(path: string): boolean
  mkdirSync(path: string, options?: { recursive?: boolean }): void
  writeFileSync(path: string, data: string): void
  readFileSync(path: string, encoding: 'utf8'): string
  readdirSync(
    path: string,
  ): Array<{ name: string; isFile(): boolean; isDirectory(): boolean }>
  statSync(path: string): { mtime: Date; isDirectory(): boolean; size: number }
  rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void
  rmdirSync(path: string): void
  renameSync(oldPath: string, newPath: string): void
  appendFileSync(path: string, data: string): void
  cwd(): string
  realpathSync(path: string): string
  // Métodos async (usados por marketplaceManager, pluginLoader, etc.)
  readFile(
    path: string,
    options?: { encoding?: 'utf-8' | 'utf8' },
  ): Promise<string>
  readFileBytes(path: string): Promise<Uint8Array>
  writeFile(path: string, data: string | Uint8Array): Promise<void>
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>
  readdir(
    path: string,
  ): Promise<Array<{ name: string; isFile(): boolean; isDirectory(): boolean }>>
  stat(path: string): Promise<{ mtime: Date; isDirectory(): boolean; size: number }>
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>
  rename(oldPath: string, newPath: string): Promise<void>
}

let _fs: PluginFsImpl | null = null

function nodeFsFallback(): PluginFsImpl {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('node:fs') as typeof import('node:fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fsp = require('node:fs/promises') as typeof import('node:fs/promises')
  return {
    existsSync: p => fs.existsSync(p),
    mkdirSync: (p, o) => fs.mkdirSync(p, { recursive: true, ...(o ?? {}) }),
    writeFileSync: (p, d) => fs.writeFileSync(p, d),
    readFileSync: (p, e) => fs.readFileSync(p, e) as string,
    readdirSync: p =>
      fs.readdirSync(p, { withFileTypes: true }) as Array<{
        name: string
        isFile(): boolean
        isDirectory(): boolean
      }>,
    statSync: p =>
      fs.statSync(p) as {
        mtime: Date
        isDirectory(): boolean
        size: number
      },
    rmSync: (p, o) => fs.rmSync(p, o),
    rmdirSync: p => fs.rmdirSync(p),
    renameSync: (o, n) => fs.renameSync(o, n),
    appendFileSync: (p, d) => fs.appendFileSync(p, d),
    cwd: () => process.cwd(),
    realpathSync: p => fs.realpathSync(p),
    readFile: async (p, opts) =>
      (await fsp.readFile(p, opts?.encoding ?? 'utf-8')) as string,
    readFileBytes: async p => new Uint8Array(await fsp.readFile(p)),
    writeFile: async (p, d) => fsp.writeFile(p, d),
    mkdir: async (p, o) => {
      await fsp.mkdir(p, { recursive: true, ...(o ?? {}) })
    },
    readdir: async p =>
      (await fsp.readdir(p, { withFileTypes: true })) as Array<{
        name: string
        isFile(): boolean
        isDirectory(): boolean
      }>,
    stat: async p =>
      (await fsp.stat(p)) as {
        mtime: Date
        isDirectory(): boolean
        size: number
      },
    rm: async (p, o) => fsp.rm(p, o),
    rename: async (o, n) => fsp.rename(o, n),
  }
}

export function getFsImplementation(): PluginFsImpl {
  if (!_fs) _fs = nodeFsFallback()
  return _fs
}
export function setFsImplementationFn(fs: PluginFsImpl): void {
  _fs = fs
}

// pathExists (stat async)
let _pathExists: (path: string) => Promise<boolean> = async p => {
  try {
    getFsImplementation().statSync(p)
    return true
  } catch {
    return false
  }
}
export function pathExists(path: string): Promise<boolean> {
  return _pathExists(path)
}
export function setPathExistsFn(fn: typeof _pathExists): void {
  _pathExists = fn
}

// writeFileSyncAndFlush (con fsync)
let _writeFileSyncAndFlush: (path: string, data: string) => void = (p, d) =>
  getFsImplementation().writeFileSync(p, d)
export function writeFileSyncAndFlush(path: string, data: string): void {
  _writeFileSyncAndFlush(path, data)
}
export function setWriteFileSyncAndFlushFn(
  fn: typeof _writeFileSyncAndFlush,
): void {
  _writeFileSyncAndFlush = fn
}

// safeResolvePath (previene ataques de escape de ruta)
let _safeResolvePath: (base: string, rel: string) => string | null = () => null
export function safeResolvePath(base: string, rel: string): string | null {
  return _safeResolvePath(base, rel)
}
export function setSafeResolvePathFn(fn: typeof _safeResolvePath): void {
  _safeResolvePath = fn
}

// ---------------------------------------------------------------------------
// Estado de sesión + cwd
// ---------------------------------------------------------------------------

let _getSessionId: () => string = () => 'unknown-session'
let _getOriginalCwd: () => string = () => process.cwd()
let _getCwd: () => string = () => process.cwd()
let _getInlinePlugins: () => Record<string, unknown> | undefined = () =>
  undefined

export function getSessionId(): string {
  return _getSessionId()
}
export function getOriginalCwd(): string {
  return _getOriginalCwd()
}
export function getCwd(): string {
  return _getCwd()
}
export function getInlinePlugins(): Record<string, unknown> | undefined {
  return _getInlinePlugins()
}
export function setGetSessionIdFn(fn: typeof _getSessionId): void {
  _getSessionId = fn
}
export function setGetOriginalCwdFn(fn: typeof _getOriginalCwd): void {
  _getOriginalCwd = fn
}
export function setGetCwdFn(fn: typeof _getCwd): void {
  _getCwd = fn
}
export function setGetInlinePluginsFn(fn: typeof _getInlinePlugins): void {
  _getInlinePlugins = fn
}

// ---------------------------------------------------------------------------
// Accesores de settings (delegados a config/settings del lado host)
// ---------------------------------------------------------------------------

type SettingsJsonLike = Record<string, unknown> & {
  env?: Record<string, string>
}

let _getSettings: () => SettingsJsonLike | undefined = () => undefined
let _getSettingsForSource: (
  source: string,
) => SettingsJsonLike | undefined = () => undefined
let _isSettingSourceEnabled: (source: string) => boolean = () => true

export function getSettings(): SettingsJsonLike | undefined {
  return _getSettings()
}
export function getSettingsForSource(
  source: string,
): SettingsJsonLike | undefined {
  return _getSettingsForSource(source)
}
export function isSettingSourceEnabled(source: string): boolean {
  return _isSettingSourceEnabled(source)
}
export function setGetSettingsFn(fn: typeof _getSettings): void {
  _getSettings = fn
}
export function setGetSettingsForSourceFn(
  fn: typeof _getSettingsForSource,
): void {
  _getSettingsForSource = fn
}
export function setIsSettingSourceEnabledFn(
  fn: typeof _isSettingSourceEnabled,
): void {
  _isSettingSourceEnabled = fn
}

// ---------------------------------------------------------------------------
// Helpers de git
// ---------------------------------------------------------------------------

let _gitExe: () => Promise<string> = async () => 'git'
let _getHeadForDir: (dir: string) => Promise<string | null> = async () => null

export function gitExe(): Promise<string> {
  return _gitExe()
}
export function getHeadForDir(dir: string): Promise<string | null> {
  return _getHeadForDir(dir)
}
export function setGitExeFn(fn: typeof _gitExe): void {
  _gitExe = fn
}
export function setGetHeadForDirFn(fn: typeof _getHeadForDir): void {
  _getHeadForDir = fn
}

// ---------------------------------------------------------------------------
// Ejecución de subprocesos
// ---------------------------------------------------------------------------

export type ExecResult = {
  code: number
  stdout: string
  stderr: string
}

let _execFileNoThrow: (
  cmd: string,
  args: string[],
  options?: { timeout?: number; env?: NodeJS.ProcessEnv },
) => Promise<ExecResult> = async () => ({ code: -1, stdout: '', stderr: '' })

let _execFileNoThrowWithCwd: (
  cmd: string,
  args: string[],
  cwd: string,
  options?: { timeout?: number; env?: NodeJS.ProcessEnv },
) => Promise<ExecResult> = async () => ({ code: -1, stdout: '', stderr: '' })

export function execFileNoThrow(
  cmd: string,
  args: string[],
  options?: { timeout?: number; env?: NodeJS.ProcessEnv },
): Promise<ExecResult> {
  return _execFileNoThrow(cmd, args, options)
}
export function execFileNoThrowWithCwd(
  cmd: string,
  args: string[],
  cwd: string,
  options?: { timeout?: number; env?: NodeJS.ProcessEnv },
): Promise<ExecResult> {
  return _execFileNoThrowWithCwd(cmd, args, cwd, options)
}
export function setExecFileNoThrowFn(fn: typeof _execFileNoThrow): void {
  _execFileNoThrow = fn
}
export function setExecFileNoThrowWithCwdFn(
  fn: typeof _execFileNoThrowWithCwd,
): void {
  _execFileNoThrowWithCwd = fn
}

// ---------------------------------------------------------------------------
// `which`
// ---------------------------------------------------------------------------

let _which: (cmd: string) => Promise<string | null> = async () => null

export function which(cmd: string): Promise<string | null> {
  return _which(cmd)
}
export function setWhichFn(fn: typeof _which): void {
  _which = fn
}

// ---------------------------------------------------------------------------
// Helpers puros (inlineados desde varios src/utils)
// ---------------------------------------------------------------------------

/** de src/utils/envUtils */
export function isEnvTruthy(v: string | boolean | undefined): boolean {
  if (!v) return false
  if (typeof v === 'boolean') return v
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase().trim())
}

export function isEnvDefinedFalsy(v: string | boolean | undefined): boolean {
  if (v === undefined) return false
  if (typeof v === 'boolean') return !v
  if (!v) return false
  return ['0', 'false', 'no', 'off'].includes(v.toLowerCase().trim())
}

/** de src/utils/errors */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value
  if (typeof value === 'string') return new Error(value)
  try {
    return new Error(JSON.stringify(value))
  } catch {
    return new Error(String(value))
  }
}

export function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function getErrnoCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') {
    return e.code
  }
  return undefined
}

export function isENOENT(e: unknown): boolean {
  return getErrnoCode(e) === 'ENOENT'
}

/** de src/utils/slowOperations */
let _jsonStringify: (v: unknown) => string = v => JSON.stringify(v)
let _jsonParse: (t: string) => unknown = t => JSON.parse(t)
let _clone: <T>(v: T) => T = v => JSON.parse(JSON.stringify(v))
export function jsonStringify(v: unknown): string {
  return _jsonStringify(v)
}
export function jsonParse(t: string): unknown {
  return _jsonParse(t)
}
export function clone<T>(v: T): T {
  return _clone(v)
}
export function setJsonStringifyFn(fn: typeof _jsonStringify): void {
  _jsonStringify = fn
}
export function setJsonParseFn(fn: typeof _jsonParse): void {
  _jsonParse = fn
}
export function setCloneFn(fn: typeof _clone): void {
  _clone = fn
}

// ---------------------------------------------------------------------------
// Registro de limpieza
// ---------------------------------------------------------------------------

let _registerCleanup: (fn: () => void | Promise<void>) => void = () => {}
export function registerCleanup(fn: () => void | Promise<void>): void {
  _registerCleanup(fn)
}
export function setRegisterCleanupFn(fn: typeof _registerCleanup): void {
  _registerCleanup = fn
}

// ---------------------------------------------------------------------------
// Output styles, ripgrep, secure storage, telemetría, etc.
// ---------------------------------------------------------------------------

let _rgPath: () => string | null = () => null
let _secureStorageRead: (key: string) => Promise<string | null> = async () =>
  null
let _secureStorageWrite: (key: string, value: string) => Promise<void> =
  async () => {}

export function rgPath(): string | null {
  return _rgPath()
}
export function secureStorageRead(key: string): Promise<string | null> {
  return _secureStorageRead(key)
}
export function secureStorageWrite(key: string, value: string): Promise<void> {
  return _secureStorageWrite(key, value)
}
export function setRgPathFn(fn: typeof _rgPath): void {
  _rgPath = fn
}
export function setSecureStorageReadFn(fn: typeof _secureStorageRead): void {
  _secureStorageRead = fn
}
export function setSecureStorageWriteFn(fn: typeof _secureStorageWrite): void {
  _secureStorageWrite = fn
}

// ---------------------------------------------------------------------------
// Constructores de eventos de telemetría de plugin
// ---------------------------------------------------------------------------

let _buildPluginTelemetryFields: (
  ...args: unknown[]
) => Record<string, unknown> = () => ({})
let _classifyPluginCommandError: (error: unknown) => string = () => 'unknown'

export function buildPluginTelemetryFields(
  ...args: unknown[]
): Record<string, unknown> {
  return _buildPluginTelemetryFields(...args)
}
export function classifyPluginCommandError(error: unknown): string {
  return _classifyPluginCommandError(error)
}
export function setBuildPluginTelemetryFieldsFn(
  fn: typeof _buildPluginTelemetryFields,
): void {
  _buildPluginTelemetryFields = fn
}
export function setClassifyPluginCommandErrorFn(
  fn: typeof _classifyPluginCommandError,
): void {
  _classifyPluginCommandError = fn
}

// ---------------------------------------------------------------------------
// Helpers varios movidos a deps (dxt, effort, format, frontmatterParser,
// markdownConfigLoader, yaml, stringUtils, etc.)
// ---------------------------------------------------------------------------

let _sanitizePath: (path: string) => string = p => p
let _parseMarkdownFrontmatter: (text: string) => {
  frontmatter: Record<string, unknown>
  body: string
} = () => ({ frontmatter: {}, body: '' })
let _loadMarkdownConfig: (path: string) => unknown = () => null
let _walkMarkdownFiles: (dir: string) => Promise<string[]> = async () => []

export function sanitizePath(path: string): string {
  return _sanitizePath(path)
}
export function parseMarkdownFrontmatter(
  text: string,
): { frontmatter: Record<string, unknown>; body: string } {
  return _parseMarkdownFrontmatter(text)
}
export function loadMarkdownConfig(path: string): unknown {
  return _loadMarkdownConfig(path)
}
export function walkMarkdownFiles(dir: string): Promise<string[]> {
  return _walkMarkdownFiles(dir)
}
export function setSanitizePathFn(fn: typeof _sanitizePath): void {
  _sanitizePath = fn
}
export function setParseMarkdownFrontmatterFn(
  fn: typeof _parseMarkdownFrontmatter,
): void {
  _parseMarkdownFrontmatter = fn
}
export function setLoadMarkdownConfigFn(fn: typeof _loadMarkdownConfig): void {
  _loadMarkdownConfig = fn
}
export function setWalkMarkdownFilesFn(fn: typeof _walkMarkdownFiles): void {
  _walkMarkdownFiles = fn
}

// ---------------------------------------------------------------------------
// Superficie de setters adicional (lista de builtins, motor de hints,
// sustitución de argumentos de CLI)
// ---------------------------------------------------------------------------

type BuiltinPluginResult = { enabled: unknown[]; disabled: unknown[] }

let _getBuiltinPluginsFn: () => BuiltinPluginResult = () => ({
  enabled: [],
  disabled: [],
})
let _isBuiltinPluginIdFn: (id: string) => boolean = () => false
let _getBuiltinPluginDefinitionFn: (id: string) => unknown = () => undefined

export function getBuiltinPlugins(): BuiltinPluginResult {
  return _getBuiltinPluginsFn()
}

export function isBuiltinPluginId(id: string): boolean {
  return _isBuiltinPluginIdFn(id)
}

export function getBuiltinPluginDefinition(id: string): unknown {
  return _getBuiltinPluginDefinitionFn(id)
}

function getBuiltinPluginsMap(): Record<string, unknown> {
  const result = _getBuiltinPluginsFn()
  const all = [...result.enabled, ...result.disabled]
  const map: Record<string, unknown> = {}
  for (const plugin of all) {
    const pid =
      (plugin as { id?: string; name?: string })?.id ??
      (plugin as { name?: string })?.name
    if (pid) map[pid] = plugin
  }
  return map
}

export const BUILTIN_PLUGINS: Record<string, unknown> = new Proxy(
  {} as Record<string, unknown>,
  {
    ownKeys: () => Object.keys(getBuiltinPluginsMap()),
    getOwnPropertyDescriptor: (_t, key) =>
      Object.getOwnPropertyDescriptor(getBuiltinPluginsMap(), key),
    has: (_t, key) => key in getBuiltinPluginsMap(),
    get: (_t, key) => getBuiltinPluginsMap()[key as string],
  },
)

export function setGetBuiltinPluginsFn(fn: () => BuiltinPluginResult): void {
  _getBuiltinPluginsFn = fn
}
export function setIsBuiltinPluginIdFn(fn: (id: string) => boolean): void {
  _isBuiltinPluginIdFn = fn
}
export function setGetBuiltinPluginDefinitionFn(
  fn: (id: string) => unknown,
): void {
  _getBuiltinPluginDefinitionFn = fn
}

let _applyArgumentSubstitutionsFn: (s: string, ...args: unknown[]) => string =
  s => s
export function applyArgumentSubstitutions(
  s: string,
  ...args: unknown[]
): string {
  return _applyArgumentSubstitutionsFn(s, ...args)
}
export function setApplyArgumentSubstitutionsFn(
  fn: (s: string, ...args: unknown[]) => string,
): void {
  _applyArgumentSubstitutionsFn = fn
}

let _getHintsProviderFn: () => unknown = () => null
export function getHintsProvider(): unknown {
  return _getHintsProviderFn()
}
export function setGetHintsProviderFn(fn: () => unknown): void {
  _getHintsProviderFn = fn
}

// ---------------------------------------------------------------------------
// Constantes reexportadas desde su hogar canónico
// ---------------------------------------------------------------------------

export { BUILTIN_MARKETPLACE_NAME } from './builtin.js'

/**
 * `FRONTMATTER_REGEX` — de `../frontmatterParser.ts`, no portado en este
 * pase (ver docstring del módulo). Valor exacto de la fuente.
 */
export const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)---\s*\n?/

/**
 * `EFFORT_LEVELS` — `@thyrox/agent/effort.ts` EXISTE con este valor exacto
 * (verificado leyendo el archivo), pero un `export {...} from` estático
 * fallaría igual que un `import` (sin symlink de workspace). Se intenta
 * `require()` y, si falla, se cae al valor real copiado.
 */
function loadEffortLevels(): readonly string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (
      require('@thyrox/agent/effort.js') as {
        EFFORT_LEVELS: readonly string[]
      }
    ).EFFORT_LEVELS
  } catch {
    return ['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const
  }
}
export const EFFORT_LEVELS = loadEffortLevels()

// Tipos (passthroughs estructurales)
export type ClaudeCodeHint = { id: string; message: string; cta?: string }
export class ConfigParseError extends Error {
  readonly path?: string
  constructor(message: string, path?: string) {
    super(message)
    this.name = 'ConfigParseError'
    this.path = path
  }
}
export type FrontmatterData = Record<string, unknown>
export type ScopedMcpServerConfig = unknown
// McpServerConfigSchema vive en @thyrox/config/mcpConfigSchema — ya portado
// en este pase, reexport directo.
export const McpServerConfigSchema = _canonicalMcpServerConfigSchema

function makeSetter<F>(
  defaultFn: F,
): [getter: () => F, setter: (fn: F) => void] {
  let current = defaultFn
  return [
    () => current,
    (fn: F) => {
      current = fn
    },
  ]
}

// -- limpiadores de caché
const [_getClearAgentDefinitionsCache, setClearAgentDefinitionsCacheFn_] =
  makeSetter(() => {})
const [_getClearAllOutputStylesCache, setClearAllOutputStylesCacheFn_] =
  makeSetter(() => {})
const [_getClearCommandsCache, setClearCommandsCacheFn_] = makeSetter(() => {})
const [_getClearPromptCache, setClearPromptCacheFn_] = makeSetter(() => {})
const [_getClearRegisteredPluginHooks, setClearRegisteredPluginHooksFn_] =
  makeSetter(() => {})
export function clearAgentDefinitionsCache(): void {
  _getClearAgentDefinitionsCache()()
}
export function clearAllOutputStylesCache(): void {
  _getClearAllOutputStylesCache()()
}
export function clearCommandsCache(): void {
  _getClearCommandsCache()()
}
export function clearPromptCache(): void {
  _getClearPromptCache()()
}
export function clearRegisteredPluginHooks(): void {
  _getClearRegisteredPluginHooks()()
}
export const setClearAgentDefinitionsCacheFn = setClearAgentDefinitionsCacheFn_
export const setClearAllOutputStylesCacheFn = setClearAllOutputStylesCacheFn_
export const setClearCommandsCacheFn = setClearCommandsCacheFn_
export const setClearPromptCacheFn = setClearPromptCacheFn_
export const setClearRegisteredPluginHooksFn =
  setClearRegisteredPluginHooksFn_

/**
 * `coerceDescriptionToString` — reexport de la impl real en
 * `@thyrox/agent/frontmatterParser.ts` (existe, verificado). Se envuelve
 * como función (no como binding estático de `export {...} from`, que
 * fallaría por falta de symlink de workspace).
 */
export function coerceDescriptionToString(...args: unknown[]): unknown {
  return requireAgentFrontmatterParser().coerceDescriptionToString(...args)
}

/**
 * `extractDescriptionFromMarkdown` lives in
 * `@thyrox/config/utils/markdownDescription.ts` — portado en este pase
 * (hoja sin deps propias).
 */
const [_getExtractDescriptionFromMarkdown, setExtractDescriptionFromMarkdownFn_] =
  makeSetter(_canonicalExtractDescriptionFromMarkdown)

/** `expandTilde` — `@thyrox/config/utils/expandTilde.ts`, portado en este pase. */
const [_getExpandTilde, setExpandTildeFn_] = makeSetter(_canonicalExpandTilde)

type ExpandEnvVarsResult = { expanded: string; missingVars: string[] }
/** `expandEnvVarsInString` — `@thyrox/config/utils/envExpansion.ts`, ya portado. */
const [_getExpandEnvVarsInString, setExpandEnvVarsInStringFn_] = makeSetter(
  _canonicalExpandEnvVarsInString,
)

const [_getExecuteShellCommandsInPrompt, setExecuteShellCommandsInPromptFn_] =
  makeSetter(
    async (prompt: string, ..._rest: unknown[]): Promise<string> => prompt,
  )
const [_getRipGrep, setRipGrepFn_] = makeSetter(
  async (..._args: unknown[]): Promise<string> => '',
)
const [_getUnzipFile, setUnzipFileFn_] = makeSetter(
  async (_zipPath: string, _destDir: string): Promise<void> => {},
)
export function extractDescriptionFromMarkdown(
  text: string,
  defaultDescription?: string,
): string {
  return _getExtractDescriptionFromMarkdown()(text, defaultDescription)
}
export function expandTilde(p: string): string {
  return _getExpandTilde()(p)
}
export function expandEnvVarsInString(s: string): ExpandEnvVarsResult {
  return _getExpandEnvVarsInString()(s)
}
export function executeShellCommandsInPrompt(
  prompt: string,
  ...rest: unknown[]
): Promise<string> {
  return _getExecuteShellCommandsInPrompt()(prompt, ...rest)
}
export function ripGrep(...args: unknown[]): Promise<string> {
  return _getRipGrep()(...args)
}
export function unzipFile(zipPath: string, destDir: string): Promise<void> {
  return _getUnzipFile()(zipPath, destDir)
}
export const setExtractDescriptionFromMarkdownFn =
  setExtractDescriptionFromMarkdownFn_
export const setExpandTildeFn = setExpandTildeFn_
export const setExpandEnvVarsInStringFn = setExpandEnvVarsInStringFn_
export const setExecuteShellCommandsInPromptFn =
  setExecuteShellCommandsInPromptFn_
export const setRipGrepFn = setRipGrepFn_
export const setUnzipFileFn = setUnzipFileFn_

// -- parsers de frontmatter
type ParsedMarkdown = { frontmatter: FrontmatterData; content: string }

/**
 * Default de `parseFrontmatter` — la fuente lo importa estáticamente de
 * `../frontmatterParser.ts` (370 líneas, con dependencias propias hacia
 * `./yaml.ts` y `local-observability/debug`, ninguno de los 15 módulos de
 * este pase). Se degrada al MISMO patrón de default conservador que la
 * fuente ya aplica a decenas de otros slots de este archivo: extrae el
 * bloque `---...---` con `FRONTMATTER_REGEX` y parsea líneas `clave: valor`
 * simples (no YAML completo — anidamiento, listas o escalares complejos NO
 * se soportan). Documentado como más simple que la fuente a propósito.
 */
function parseFrontmatterDefault(
  markdown: string,
  _sourcePath?: string,
): ParsedMarkdown {
  const match = markdown.match(FRONTMATTER_REGEX)
  if (!match) {
    return { frontmatter: {}, content: markdown }
  }
  const frontmatterText = match[1] || ''
  const content = markdown.slice(match[0].length)
  const frontmatter: FrontmatterData = {}
  for (const line of frontmatterText.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) continue
    const key = trimmed.slice(0, colonIdx).trim()
    let value: unknown = trimmed.slice(colonIdx + 1).trim()
    if (typeof value === 'string') {
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      } else if (value === 'true') {
        value = true
      } else if (value === 'false') {
        value = false
      }
    }
    if (key) frontmatter[key] = value
  }
  return { frontmatter, content }
}

const [_getParseFrontmatter, setParseFrontmatterFn_] = makeSetter(
  parseFrontmatterDefault,
)
const [
  _getParseAgentToolsFromFrontmatter,
  setParseAgentToolsFromFrontmatterFn_,
] = makeSetter((_v: unknown): string[] => [])
const [
  _getParseSlashCommandToolsFromFrontmatter,
  setParseSlashCommandToolsFromFrontmatterFn_,
] = makeSetter((_v: unknown): string[] => [])
const [_getParseShellFrontmatter, setParseShellFrontmatterFn_] = makeSetter(
  (_v: unknown): unknown => null,
)
const [_getParseBooleanFrontmatter, setParseBooleanFrontmatterFn_] =
  makeSetter((_v: unknown): boolean | undefined => undefined)
const [
  _getParsePositiveIntFromFrontmatter,
  setParsePositiveIntFromFrontmatterFn_,
] = makeSetter((_v: unknown): number | undefined => undefined)
const [_getParseEffortValue, setParseEffortValueFn_] = makeSetter(
  (_v: unknown): 'low' | 'medium' | 'high' | undefined => undefined,
)
const [_getParseYaml, setParseYamlFn_] = makeSetter((_s: string): unknown => null)
const [_getParseArgumentNames, setParseArgumentNamesFn_] = makeSetter(
  (_s: string): string[] => [],
)
const [_getParseUserSpecifiedModel, setParseUserSpecifiedModelFn_] =
  makeSetter((_v: unknown): string | undefined => undefined)
const [_getParseZipModes, setParseZipModesFn_] = makeSetter(
  (_v: unknown): unknown => null,
)

type SubstituteArgumentsFn = (
  content: string,
  args: string | undefined,
  appendIfNoPlaceholder?: boolean,
  argumentNames?: string[],
) => string

/**
 * Default de `substituteArguments` — la fuente lo importa estáticamente de
 * `../utils/argumentSubstitution.ts` (149 líneas, depende de
 * `@thyrox/shell/bash/shellQuote.js`, no portado en este pase). Se degrada
 * al mismo patrón de default conservador: reemplaza el placeholder
 * `$ARGUMENTS` y, si no hay placeholder y `appendIfNoPlaceholder` es
 * `true`, apéndica los argumentos al final. No soporta sustitución
 * posicional por nombre (`argumentNames`) — documentado como más simple
 * que la fuente a propósito.
 */
function substituteArgumentsDefault(
  content: string,
  args: string | undefined,
  appendIfNoPlaceholder?: boolean,
  _argumentNames?: string[],
): string {
  const value = args ?? ''
  if (content.includes('$ARGUMENTS')) {
    return content.replaceAll('$ARGUMENTS', value)
  }
  if (appendIfNoPlaceholder && value) {
    return `${content}\n\n${value}`
  }
  return content
}

const [_getSubstituteArguments, setSubstituteArgumentsFn_] = makeSetter(
  substituteArgumentsDefault as SubstituteArgumentsFn,
)
const [
  _getParseAndValidateManifestFromBytes,
  setParseAndValidateManifestFromBytesFn_,
] = makeSetter(async (_bytes: Uint8Array): Promise<unknown> => null)
export function parseFrontmatter(t: string, src?: string): ParsedMarkdown {
  return _getParseFrontmatter()(t, src)
}
export function parseAgentToolsFromFrontmatter(v: unknown): string[] {
  return _getParseAgentToolsFromFrontmatter()(v)
}
export function parseSlashCommandToolsFromFrontmatter(v: unknown): string[] {
  return _getParseSlashCommandToolsFromFrontmatter()(v)
}
export function parseShellFrontmatter(v: unknown): unknown {
  return _getParseShellFrontmatter()(v)
}
export function parseBooleanFrontmatter(v: unknown): boolean | undefined {
  return _getParseBooleanFrontmatter()(v)
}
export function parsePositiveIntFromFrontmatter(
  v: unknown,
): number | undefined {
  return _getParsePositiveIntFromFrontmatter()(v)
}
export function parseEffortValue(
  v: unknown,
): 'low' | 'medium' | 'high' | undefined {
  return _getParseEffortValue()(v)
}
export function parseYaml(s: string): unknown {
  return _getParseYaml()(s)
}
export function parseArgumentNames(s: string): string[] {
  return _getParseArgumentNames()(s)
}
export function parseUserSpecifiedModel(v: unknown): string | undefined {
  return _getParseUserSpecifiedModel()(v)
}
export function parseZipModes(v: unknown): unknown {
  return _getParseZipModes()(v)
}
export function substituteArguments(
  content: string,
  args: string | undefined,
  appendIfNoPlaceholder?: boolean,
  argumentNames?: string[],
): string {
  return _getSubstituteArguments()(
    content,
    args,
    appendIfNoPlaceholder,
    argumentNames,
  )
}
export function parseAndValidateManifestFromBytes(
  bytes: Uint8Array,
): Promise<unknown> {
  return _getParseAndValidateManifestFromBytes()(bytes)
}
export const setParseFrontmatterFn = setParseFrontmatterFn_
export const setParseAgentToolsFromFrontmatterFn =
  setParseAgentToolsFromFrontmatterFn_
export const setParseSlashCommandToolsFromFrontmatterFn =
  setParseSlashCommandToolsFromFrontmatterFn_
export const setParseShellFrontmatterFn = setParseShellFrontmatterFn_
export const setParseBooleanFrontmatterFn = setParseBooleanFrontmatterFn_
export const setParsePositiveIntFromFrontmatterFn =
  setParsePositiveIntFromFrontmatterFn_
export const setParseEffortValueFn = setParseEffortValueFn_
export const setParseYamlFn = setParseYamlFn_
export const setParseArgumentNamesFn = setParseArgumentNamesFn_
export const setParseUserSpecifiedModelFn = setParseUserSpecifiedModelFn_
export const setParseZipModesFn = setParseZipModesFn_
export const setSubstituteArgumentsFn = setSubstituteArgumentsFn_
export const setParseAndValidateManifestFromBytesFn =
  setParseAndValidateManifestFromBytesFn_

// -- hooks registrados, cachés de agente/comando
const [_getRegisteredHooks_, setGetRegisteredHooksFn_] = makeSetter(
  (): unknown[] => [],
)
const [_getRegisterHookCallbacks, setRegisterHookCallbacksFn_] = makeSetter(
  (_hooks: unknown[]): void => {},
)
const [
  _getGetAgentDefinitionsWithOverrides,
  setGetAgentDefinitionsWithOverridesFn_,
] = makeSetter(async (..._args: unknown[]): Promise<unknown[]> => [])
export function getRegisteredHooks(): unknown[] {
  return _getRegisteredHooks_()()
}
export function registerHookCallbacks(hooks: unknown[]): void {
  _getRegisterHookCallbacks()(hooks)
}
export function getAgentDefinitionsWithOverrides(
  ...args: unknown[]
): Promise<unknown[]> {
  return _getGetAgentDefinitionsWithOverrides()(...args)
}
export const setGetRegisteredHooksFn = setGetRegisteredHooksFn_
export const setRegisterHookCallbacksFn = setRegisterHookCallbacksFn_
export const setGetAgentDefinitionsWithOverridesFn =
  setGetAgentDefinitionsWithOverridesFn_

// -- utils varios
export function getErrnoPath(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'path' in e)
    return (e as { path?: string }).path
  return undefined
}

/**
 * Devuelve `true` si `filePath` (tras resolver symlinks) ya está en
 * `loadedPaths`. Si no, añade la ruta resuelta a `loadedPaths` y devuelve
 * `false`.
 *
 * Usa `node:fs.realpathSync` directamente en vez de `PluginFsImpl`
 * conectado: `realpathSync` es una operación de puro syscall sin
 * consideración de sandbox/fs-virtual (no es una operación de escritura, es
 * resolución de nombre). Ir directo evita que el estado conectado a nivel
 * de módulo sea un riesgo de aislamiento entre tests.
 */
export function isDuplicatePath(
  filePath: string,
  loadedPaths: Set<string>,
): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeFs = require('node:fs') as typeof import('node:fs')
  let resolved: string
  try {
    resolved = nodeFs.realpathSync(filePath)
  } catch {
    // realpath falla en symlinks colgantes / rutas inexistentes; cae a la
    // ruta literal para que quien llama pueda seguir deduplicando entradas
    // idénticas.
    resolved = filePath
  }
  if (loadedPaths.has(resolved)) return true
  loadedPaths.add(resolved)
  return false
}
const [_getIsFsInaccessible, setIsFsInaccessibleFn_] = makeSetter(
  (_err: unknown): boolean => false,
)
export function isFsInaccessible(err: unknown): boolean {
  return _getIsFsInaccessible()(err)
}
export const setIsFsInaccessibleFn = setIsFsInaccessibleFn_

const [_getPlural, setPluralFn_] = makeSetter(
  (n: number, singular: string, plural?: string): string => {
    if (n === 1) return `${n} ${singular}`
    return `${n} ${plural ?? singular + 's'}`
  },
)
export function plural(n: number, singular: string, plural?: string): string {
  return _getPlural()(n, singular, plural)
}
export const setPluralFn = setPluralFn_

// -- hint + estado de hint
const [_getHasShownHintThisSession, setHasShownHintThisSessionFn_] =
  makeSetter((_id: string): boolean => false)
const [_getSetPendingHint, setSetPendingHintFn_] = makeSetter(
  (_hint: ClaudeCodeHint | null): void => {},
)
export function hasShownHintThisSession(id: string): boolean {
  return _getHasShownHintThisSession()(id)
}
export function setPendingHint(hint: ClaudeCodeHint | null): void {
  _getSetPendingHint()(hint)
}
export const setHasShownHintThisSessionFn = setHasShownHintThisSessionFn_
export const setSetPendingHintFn = setSetPendingHintFn_

// -- directorios de sistema + git + varios
const [_getGetSystemDirectories, setGetSystemDirectoriesFn_] = makeSetter(
  (): string[] => [],
)
const [_getFindCanonicalGitRoot, setFindCanonicalGitRootFn_] = makeSetter(
  (_cwd: string): string | null => null,
)
const [
  _getGetAdditionalDirectoriesForClaudeMd,
  setGetAdditionalDirectoriesForClaudeMdFn_,
] = makeSetter((): string[] => [])
const [_getGetUseCoworkPlugins, setGetUseCoworkPluginsFn_] = makeSetter(
  (): boolean => false,
)
const [_getResetSentSkillNames, setResetSentSkillNamesFn_] = makeSetter(
  (): void => {},
)
const [
  _getReinitializeLspServerManager,
  setReinitializeLspServerManagerFn_,
] = makeSetter((): Promise<void> => Promise.resolve())
const [_getWaitForScrollIdle, setWaitForScrollIdleFn_] = makeSetter(
  (): Promise<void> => Promise.resolve(),
)
const [_getWithDiagnosticsTiming, setWithDiagnosticsTimingFn_] = makeSetter(
  async <T>(_event: string, fn: () => Promise<T>): Promise<T> => fn(),
)
const [_getGetSecureStorage, setGetSecureStorageFn_] = makeSetter(
  (): unknown => null,
)
const [_getUninstallPluginOp, setUninstallPluginOpFn_] = makeSetter(
  async (..._args: unknown[]): Promise<unknown> => null,
)
const [_getUpdatePluginOp, setUpdatePluginOpFn_] = makeSetter(
  async (..._args: unknown[]): Promise<unknown> => null,
)
const [_getWriteFileSync, setWriteFileSyncFn_] = makeSetter(
  (p: string, d: string): void => getFsImplementation().writeFileSync(p, d),
)
export function getSystemDirectories(): string[] {
  return _getGetSystemDirectories()()
}
export function findCanonicalGitRoot(cwd: string): string | null {
  return _getFindCanonicalGitRoot()(cwd)
}
export function getAdditionalDirectoriesForClaudeMd(): string[] {
  return _getGetAdditionalDirectoriesForClaudeMd()()
}
export function getUseCoworkPlugins(): boolean {
  return _getGetUseCoworkPlugins()()
}
export function resetSentSkillNames(): void {
  _getResetSentSkillNames()()
}
export function reinitializeLspServerManager(): Promise<void> {
  return _getReinitializeLspServerManager()()
}
export function waitForScrollIdle(): Promise<void> {
  return _getWaitForScrollIdle()()
}
export function withDiagnosticsTiming<T>(
  event: string,
  fn: () => Promise<T>,
): Promise<T> {
  return _getWithDiagnosticsTiming()(event, fn)
}
export function getSecureStorage(): unknown {
  return _getGetSecureStorage()()
}
export function uninstallPluginOp(...args: unknown[]): Promise<unknown> {
  return _getUninstallPluginOp()(...args)
}
export function updatePluginOp(...args: unknown[]): Promise<unknown> {
  return _getUpdatePluginOp()(...args)
}
export function writeFileSync(p: string, d: string): void {
  _getWriteFileSync()(p, d)
}
export const setGetSystemDirectoriesFn = setGetSystemDirectoriesFn_
export const setFindCanonicalGitRootFn = setFindCanonicalGitRootFn_
export const setGetAdditionalDirectoriesForClaudeMdFn =
  setGetAdditionalDirectoriesForClaudeMdFn_
export const setGetUseCoworkPluginsFn = setGetUseCoworkPluginsFn_
export const setResetSentSkillNamesFn = setResetSentSkillNamesFn_
export const setReinitializeLspServerManagerFn =
  setReinitializeLspServerManagerFn_
export const setWaitForScrollIdleFn = setWaitForScrollIdleFn_
export const setWithDiagnosticsTimingFn = setWithDiagnosticsTimingFn_
export const setGetSecureStorageFn = setGetSecureStorageFn_
export const setUninstallPluginOpFn = setUninstallPluginOpFn_
export const setUpdatePluginOpFn = setUpdatePluginOpFn_
export const setWriteFileSyncFn = setWriteFileSyncFn_

// ---------------------------------------------------------------------------
// Helpers de proceso
// ---------------------------------------------------------------------------

let _writeToStdout: (text: string) => void = text => process.stdout.write(text)
export function writeToStdout(text: string): void {
  _writeToStdout(text)
}
export function setWriteToStdoutFn(fn: typeof _writeToStdout): void {
  _writeToStdout = fn
}

let _gracefulShutdown: (code: number) => Promise<never> = async code => {
  process.exit(code)
}
export function gracefulShutdown(code: number): Promise<never> {
  return _gracefulShutdown(code)
}
export function setGracefulShutdownFn(fn: typeof _gracefulShutdown): void {
  _gracefulShutdown = fn
}

// ---------------------------------------------------------------------------
// Slots de tipo forward-compat — las definiciones precisas viven en
// subsistemas de capa superior (tool-registry para Command, skills para
// BundledSkillDefinition). Usar tipos estructurales equivalentes a
// `unknown` mantiene la capa del paquete plugin limpia.
// ---------------------------------------------------------------------------

export type Command = {
  type: string
  name: string
  description?: string
  hasUserSpecifiedDescription?: boolean
  allowedTools?: string[]
  argumentHint?: string
  whenToUse?: string
  model?: string
  disableModelInvocation?: boolean
  userInvocable?: boolean
  contentLength?: number
  source?: string
  loadedFrom?: string
  hooks?: unknown
  context?: unknown
  agent?: unknown
  isEnabled?: () => boolean
  isHidden?: boolean
  progressMessage?: string
  getPromptForCommand?: unknown
  [key: string]: unknown
}

export type BundledSkillDefinition = {
  name: string
  description?: string
  allowedTools?: string[]
  argumentHint?: string
  whenToUse?: string
  model?: string
  disableModelInvocation?: boolean
  userInvocable?: boolean
  hooks?: unknown
  context?: unknown
  agent?: unknown
  isEnabled?: () => boolean
  getPromptForCommand?: unknown
  [key: string]: unknown
}

/**
 * `FILE_EDIT_TOOL_NAME`/`FILE_READ_TOOL_NAME`/`FILE_WRITE_TOOL_NAME` — de
 * `@claude-code-how-works/tool-registry/tools/.../constants.js`. El paquete
 * `@thyrox/tool-registry` NO EXISTE EN ABSOLUTO en este árbol (verificado
 * con `ls src/packages/`). No se re-exportan aquí — inventar tres
 * constantes de nombre de herramienta sería fabricar un contrato que
 * ningún `tool-registry` real respalda todavía
 * (`porte-completo-no-parcial.md`: «un módulo fabricado es peor que uno
 * ausente»).
 */
