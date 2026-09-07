/**
 * Sustitutos locales de símbolos que, en `ccnmt` (el árbol de referencia,
 * `packages/memory/src/{paths,memdir,teamMemPaths,memoryEntrypoint,
 * extractMemories,agentMemory,sessionMemoryUtils,sessionMemoryPrompts,
 * memdir/memoryScan}.ts`), vienen de OTROS paquetes del monorepo —
 * `@claude-code-how-works/config` (los subpaths `/feature-flags`,
 * `/settings`, `/env/utils`'s `getClaudeConfigHomeDir`),
 * `@claude-code-how-works/permission/filesystem`,
 * `@claude-code-how-works/agent/frontmatterParser.js` y
 * `@claude-code-how-works/repl/readFileInRange.js`. Ninguno de esos cinco
 * subpaths existe todavía en `@thyrox/{config,permission,agent}`, y
 * `@thyrox/repl` no existe como paquete. Mismo patrón que
 * `@thyrox/storage: src/internal/pendingCrossPackageDeps.ts` y
 * `@thyrox/local-observability: src/internal/pendingCrossPackageDeps.ts`.
 *
 * Nota sobre `readEnv`/`isEnvTruthy`/`logEvent`/`logError`/`logForDebugging`:
 * ESOS símbolos SÍ están portados y se importan directo de
 * `@thyrox/config/env/utils` y `@thyrox/local-observability` — no viven
 * aquí. Este archivo es sólo para lo genuinamente ausente.
 *
 * Sustituciones, cada una con su alcance declarado:
 *
 * - `getFeatureValue_CACHED_MAY_BE_STALE` — de
 *   `@claude-code-how-works/config/feature-flags.ts` (269 líneas: GrowthBook
 *   stub, overrides por env, `LOCAL_GATE_DEFAULTS` con ~40 flags). Portar el
 *   módulo entero es tarea de quien porte `config`, no de `memory`. Este
 *   sustituto es FIEL para el subconjunto de flags que `memory` realmente
 *   lee (`tengu_moth_copse`, `tengu_bramble_lintel`, `tengu_passport_quail`,
 *   `tengu_herring_clock`, `tengu_coral_fern`, `tengu_slate_thimble`):
 *   mismo mecanismo de override (`CLAUDE_CODE_FEATURE_OVERRIDES`, JSON) y la
 *   misma tabla `LOCAL_GATE_DEFAULTS` recortada a esas seis claves —
 *   verbatim contra `config/feature-flags.ts:88,97` (`tengu_passport_quail:
 *   true`, `tengu_coral_fern: true`; las otras cuatro NO están en la tabla
 *   real, así que caen al default del llamador, igual que en la fuente).
 * - `getInitialSettings` / `getSettingsForSource` — de
 *   `@claude-code-how-works/config/settings/settings.ts` (el cargador de
 *   settings multi-fuente con caché de sesión, ~900 líneas). Sustituto
 *   mínimo: devuelve `{}` / `undefined` salvo que un test inyecte un valor
 *   vía el setter DI (mismo patrón que `setGetCwdFn` de `@thyrox/storage`).
 * - `getSessionMemoryPath` — de
 *   `@claude-code-how-works/permission/filesystem.ts:276`, que compone
 *   `getProjectDir(getCwd())` + `getSessionId()` desde el host-bindings
 *   PROPIO de `permission` (`getPermissionHostBindings`, no portado).
 *   `@thyrox/storage/sessionPaths.ts` ya tiene `getProjectDir`/`getSessionId`
 *   con la MISMA forma, pero su `package.json` no exporta ese subpath
 *   todavía — tocar el `package.json` de un paquete hermano está fuera del
 *   alcance de esta tarea (aislamiento de clase 2). Sustituto: la misma
 *   forma de ruta (`{proyecto}/{sesión}/session-memory/summary.md`) con
 *   estado propio (cwd/sessionId) y sus propios setters DI.
 * - `parseFrontmatter` (+ `FRONTMATTER_REGEX`, `quoteProblematicValues`) —
 *   de `@claude-code-how-works/config/frontmatterParser.ts` (370 líneas).
 *   `memory` sólo necesita `frontmatter.description` y `frontmatter.type`
 *   (ver `memdir/memoryScan.ts`), así que se porta FIEL el núcleo que los
 *   produce (match del delimitador `---`, parseo YAML con reintento
 *   cuando falla, log de advertencia) y se omiten las funciones que sólo
 *   consumen `agent`/`skills` (`splitPathInFrontmatter`,
 *   `parsePositiveIntFromFrontmatter`, `coerceDescriptionToString`,
 *   `parseBooleanFrontmatter`, `parseShellFrontmatter`) — no son parte del
 *   contrato que `memory` usa. `parseYaml` es un puerto trivial y COMPLETO
 *   de `config/yaml.ts` (15 líneas): `Bun.YAML.parse` bajo Bun, que es
 *   siempre el caso aquí (`bun test`).
 * - `readFileInRange` — de
 *   `@claude-code-how-works/repl/src/readFileInRange.ts`. A diferencia de
 *   los anteriores, éste es un puerto FIEL y COMPLETO (no un recorte): el
 *   módulo es autocontenido y su única dependencia externa
 *   (`formatFileSize`) YA vive dentro del propio paquete `memory`
 *   (`internalUtils.ts` — la misma fuente la inlinea ahí a propósito para
 *   no depender del paquete `output`; ver el docstring de ese archivo). Se
 *   reusa esa función local en vez de declarar una dependencia cruzada a
 *   `@thyrox/output`, que hoy no está registrado como miembro del workspace
 *   `src/packages` (tocar ese registro es responsabilidad del
 *   orquestador, no de este porte — ver la nota de aislamiento en el
 *   `package.json` de este paquete). `readFileInRange` vive aquí (no en un
 *   paquete `@thyrox/repl` propio) porque ese paquete no existe todavía;
 *   cuando exista, este bloque se retira y `memdir/memoryScan.ts` importa
 *   el real.
 */

import { createReadStream, fstat } from 'node:fs'
import { stat as fsStat, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { formatFileSize } from '../internalUtils.js'

// ── getFeatureValue_CACHED_MAY_BE_STALE ─────────────────────────────────────

type FeatureValue = unknown

/**
 * Recorte de `LOCAL_GATE_DEFAULTS` (`config/feature-flags.ts:14-88`) a las
 * seis claves que `memory` lee. Verbatim donde la fuente las declara;
 * ausentes (comentadas) donde la fuente tampoco las declara — el llamador
 * recibe su propio `defaultValue`, igual que en la fuente.
 */
const LOCAL_GATE_DEFAULTS: Record<string, FeatureValue> = {
  // tengu_bramble_lintel: NO está en LOCAL_GATE_DEFAULTS real — cae al
  // default del llamador (memoria: `?? 1`).
  // tengu_herring_clock: NO está en LOCAL_GATE_DEFAULTS real — cae al
  // default del llamador (memoria: `false`).
  tengu_passport_quail: true, // config/feature-flags.ts:88
  tengu_moth_copse: false, // config/feature-flags.ts:97
  tengu_coral_fern: true, // config/feature-flags.ts:98
  // tengu_slate_thimble: NO está en LOCAL_GATE_DEFAULTS real — cae al
  // default del llamador (memoria: `false`).
}

let envOverridesParsed = false
let envOverrides: Record<string, FeatureValue> = {}
const configOverrides = new Map<string, FeatureValue>()

function parseEnvOverrides(): Record<string, FeatureValue> {
  if (envOverridesParsed) return envOverrides
  envOverridesParsed = true
  const raw = process.env.CLAUDE_CODE_FEATURE_OVERRIDES
  if (!raw) {
    envOverrides = {}
    return envOverrides
  }
  try {
    const parsed = JSON.parse(raw)
    envOverrides =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, FeatureValue>)
        : {}
  } catch {
    envOverrides = {}
  }
  return envOverrides
}

function getOverride(name: string): FeatureValue | undefined {
  const envValue = parseEnvOverrides()[name]
  if (envValue !== undefined) return envValue
  return configOverrides.get(name)
}

export function getFeatureValue_CACHED_MAY_BE_STALE<T>(
  feature: string,
  defaultValue?: T,
): T {
  const override = getOverride(feature)
  if (override !== undefined) return override as T
  if (feature in LOCAL_GATE_DEFAULTS) return LOCAL_GATE_DEFAULTS[feature] as T
  return defaultValue as T
}

/** Sólo para tests: fija/limpia un override, igual que `config/feature-flags.ts`. */
export function setFeatureOverrideForTesting(
  name: string,
  value: FeatureValue,
): void {
  configOverrides.set(name, value)
}

export function clearFeatureOverridesForTesting(): void {
  configOverrides.clear()
  envOverrides = {}
  envOverridesParsed = false
}

// ── getInitialSettings / getSettingsForSource ───────────────────────────────

/** Recorte de `SettingsJson` a los campos que `memory` lee. */
export type MemSettingsShape = {
  autoDreamEnabled?: boolean
  autoMemoryEnabled?: boolean
  autoMemoryDirectory?: string
}

let _initialSettings: MemSettingsShape = {}

/**
 * Sustituto de `config/settings/settings.ts`'s `getInitialSettings()`.
 * Sin carga de disco ni merge de fuentes — devuelve `{}` salvo que un test
 * inyecte un valor con `setInitialSettingsForTesting`.
 */
export function getInitialSettings(): MemSettingsShape {
  return _initialSettings
}

export function setInitialSettingsForTesting(
  settings: MemSettingsShape,
): void {
  _initialSettings = settings
}

/**
 * Las cuatro fuentes que `paths.ts` consulta en orden
 * (`policySettings` → `flagSettings` → `localSettings` → `userSettings`).
 * Sustituto: siempre `undefined` salvo inyección de test.
 */
export type SettingsSourceKey =
  | 'policySettings'
  | 'flagSettings'
  | 'localSettings'
  | 'userSettings'

let _settingsForSource: Partial<Record<SettingsSourceKey, MemSettingsShape>> =
  {}

export function getSettingsForSource(
  source: SettingsSourceKey,
): MemSettingsShape | undefined {
  return _settingsForSource[source]
}

export function setSettingsForSourceForTesting(
  source: SettingsSourceKey,
  settings: MemSettingsShape | undefined,
): void {
  _settingsForSource[source] = settings
}

export function clearSettingsForTesting(): void {
  _initialSettings = {}
  _settingsForSource = {}
}

// ── getClaudeConfigHomeDir ───────────────────────────────────────────────────

/**
 * Puerto fiel de `config/env/utils.ts:20` (`getClaudeConfigHomeDir`) —
 * `@thyrox/config/env/utils.ts` sólo porta `isEnvTruthy`/`readEnv`/
 * `getAllEnv`; esta función quedó fuera de ese porte. Memoizado por
 * `CLAUDE_CONFIG_DIR` con la misma llave que la fuente (sin `lodash-es`:
 * un caché de un solo valor con invalidación manual basta).
 */
let _configHomeDirCache: { key: string | undefined; value: string } | null =
  null

export function getClaudeConfigHomeDir(): string {
  const key = process.env.CLAUDE_CONFIG_DIR
  if (_configHomeDirCache && _configHomeDirCache.key === key) {
    return _configHomeDirCache.value
  }
  const value = (key ?? join(homedir(), '.claude')).normalize('NFC')
  _configHomeDirCache = { key, value }
  return value
}

// ── getSessionMemoryPath ─────────────────────────────────────────────────────

/**
 * Sustituto de `permission/filesystem.ts:268-278`
 * (`getSessionMemoryDir`/`getSessionMemoryPath`). La fuente compone
 * `getProjectDir(getCwd())` + `getSessionId()` desde el host-bindings PROPIO
 * de `permission`; aquí, estado local con la MISMA forma de ruta
 * (`{proyecto}/{sesión}/session-memory/summary.md`) y sus propios setters
 * DI — mismo patrón que `@thyrox/storage/sessionPaths.ts`, que resuelve
 * exactamente esto pero no lo exporta todavía como subpath cruzable.
 */
let _sessionId: string | undefined
let _projectDir: string | undefined

export function getMemSessionId(): string {
  if (_sessionId === undefined) _sessionId = crypto.randomUUID()
  return _sessionId
}

export function setMemSessionIdForTesting(id: string | undefined): void {
  _sessionId = id
}

export function getMemProjectDir(): string {
  return _projectDir ?? process.cwd()
}

export function setMemProjectDirForTesting(dir: string | undefined): void {
  _projectDir = dir
}

export function getSessionMemoryDir(): string {
  return join(getMemProjectDir(), getMemSessionId(), 'session-memory') + '/'
}

export function getSessionMemoryPath(): string {
  return join(getSessionMemoryDir(), 'summary.md')
}

// ── parseFrontmatter (recorte) ───────────────────────────────────────────────

export type FrontmatterData = {
  description?: string | null
  type?: string | null
  [key: string]: unknown
}

export type ParsedMarkdown = {
  frontmatter: FrontmatterData
  content: string
}

/** Puerto completo de `config/yaml.ts` (15 líneas) — `Bun.YAML.parse` bajo Bun. */
function parseYaml(input: string): unknown {
  if (typeof Bun !== 'undefined') {
    return Bun.YAML.parse(input)
  }
  throw new Error(
    'parseYaml: se requiere el runtime de Bun (Bun.YAML) — sin fallback ' +
      "a la dependencia npm 'yaml' que usa la fuente para el caso no-Bun.",
  )
}

// Caracteres que exigen comillas en un valor YAML sin ellas — verbatim
// contra `config/frontmatterParser.ts` (mismo regex, misma razón).
const YAML_SPECIAL_CHARS = /[{}[\]*&#!|>%@`]|: /

function quoteProblematicValues(frontmatterText: string): string {
  const lines = frontmatterText.split('\n')
  const result: string[] = []
  for (const line of lines) {
    const match = line.match(/^([a-zA-Z_-]+):\s+(.+)$/)
    if (match) {
      const [, key, value] = match
      if (!key || !value) {
        result.push(line)
        continue
      }
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        result.push(line)
        continue
      }
      if (YAML_SPECIAL_CHARS.test(value)) {
        const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        result.push(`${key}: "${escaped}"`)
        continue
      }
    }
    result.push(line)
  }
  return result.join('\n')
}

export const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)---\s*\n?/

/**
 * Recorte fiel de `parseFrontmatter` (`config/frontmatterParser.ts:130`).
 * Mismo comportamiento observable para `description`/`type`: match del
 * delimitador, parseo YAML con reintento (comillando valores problemáticos)
 * y log de advertencia si ambos intentos fallan.
 */
export function parseFrontmatter(
  markdown: string,
  sourcePath?: string,
): ParsedMarkdown {
  const match = markdown.match(FRONTMATTER_REGEX)
  if (!match) {
    return { frontmatter: {}, content: markdown }
  }
  const frontmatterText = match[1] || ''
  const content = markdown.slice(match[0].length)
  let frontmatter: FrontmatterData = {}
  try {
    const parsed = parseYaml(frontmatterText) as FrontmatterData | null
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      frontmatter = parsed
    }
  } catch {
    try {
      const quotedText = quoteProblematicValues(frontmatterText)
      const parsed = parseYaml(quotedText) as FrontmatterData | null
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        frontmatter = parsed
      }
    } catch (retryError) {
      const location = sourcePath ? ` in ${sourcePath}` : ''
      console.warn(
        `Failed to parse YAML frontmatter${location}: ${retryError instanceof Error ? retryError.message : retryError}`,
      )
    }
  }
  return { frontmatter, content }
}

// ── readFileInRange (puerto completo) ────────────────────────────────────────

const FAST_PATH_MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export type ReadFileRangeResult = {
  content: string
  lineCount: number
  totalLines: number
  totalBytes: number
  readBytes: number
  mtimeMs: number
  /** true cuando la salida se recortó a `maxBytes` en modo truncado. */
  truncatedByBytes?: boolean
}

export class FileTooLargeError extends Error {
  constructor(
    public sizeInBytes: number,
    public maxSizeBytes: number,
  ) {
    super(
      `File content (${formatFileSize(sizeInBytes)}) exceeds maximum allowed size (${formatFileSize(maxSizeBytes)}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.`,
    )
    this.name = 'FileTooLargeError'
  }
}

export async function readFileInRange(
  filePath: string,
  offset = 0,
  maxLines?: number,
  maxBytes?: number,
  signal?: AbortSignal,
  options?: { truncateOnByteLimit?: boolean },
): Promise<ReadFileRangeResult> {
  signal?.throwIfAborted()
  const truncateOnByteLimit = options?.truncateOnByteLimit ?? false

  const stats = await fsStat(filePath)

  if (stats.isDirectory()) {
    throw new Error(
      `EISDIR: illegal operation on a directory, read '${filePath}'`,
    )
  }

  if (stats.isFile() && stats.size < FAST_PATH_MAX_SIZE) {
    if (
      !truncateOnByteLimit &&
      maxBytes !== undefined &&
      stats.size > maxBytes
    ) {
      throw new FileTooLargeError(stats.size, maxBytes)
    }
    const text = await readFile(filePath, { encoding: 'utf8', signal })
    return readFileInRangeFast(
      text,
      stats.mtimeMs,
      offset,
      maxLines,
      truncateOnByteLimit ? maxBytes : undefined,
    )
  }

  return readFileInRangeStreaming(
    filePath,
    offset,
    maxLines,
    maxBytes,
    truncateOnByteLimit,
    signal,
  )
}

function readFileInRangeFast(
  raw: string,
  mtimeMs: number,
  offset: number,
  maxLines: number | undefined,
  truncateAtBytes: number | undefined,
): ReadFileRangeResult {
  const endLine = maxLines !== undefined ? offset + maxLines : Infinity
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw

  const selectedLines: string[] = []
  let lineIndex = 0
  let startPos = 0
  let newlinePos: number
  let selectedBytes = 0
  let truncatedByBytes = false

  function tryPush(line: string): boolean {
    if (truncateAtBytes !== undefined) {
      const sep = selectedLines.length > 0 ? 1 : 0
      const nextBytes = selectedBytes + sep + Buffer.byteLength(line)
      if (nextBytes > truncateAtBytes) {
        truncatedByBytes = true
        return false
      }
      selectedBytes = nextBytes
    }
    selectedLines.push(line)
    return true
  }

  while ((newlinePos = text.indexOf('\n', startPos)) !== -1) {
    if (lineIndex >= offset && lineIndex < endLine && !truncatedByBytes) {
      let line = text.slice(startPos, newlinePos)
      if (line.endsWith('\r')) line = line.slice(0, -1)
      tryPush(line)
    }
    lineIndex++
    startPos = newlinePos + 1
  }

  if (lineIndex >= offset && lineIndex < endLine && !truncatedByBytes) {
    let line = text.slice(startPos)
    if (line.endsWith('\r')) line = line.slice(0, -1)
    tryPush(line)
  }
  lineIndex++

  const content = selectedLines.join('\n')
  return {
    content,
    lineCount: selectedLines.length,
    totalLines: lineIndex,
    totalBytes: Buffer.byteLength(text, 'utf8'),
    readBytes: Buffer.byteLength(content, 'utf8'),
    mtimeMs,
    ...(truncatedByBytes ? { truncatedByBytes: true } : {}),
  }
}

type StreamState = {
  stream: ReturnType<typeof createReadStream>
  offset: number
  endLine: number
  maxBytes: number | undefined
  truncateOnByteLimit: boolean
  resolve: (value: ReadFileRangeResult) => void
  totalBytesRead: number
  selectedBytes: number
  truncatedByBytes: boolean
  currentLineIndex: number
  selectedLines: string[]
  partial: string
  isFirstChunk: boolean
  resolveMtime: (ms: number) => void
  mtimeReady: Promise<number>
}

function streamOnOpen(this: StreamState, fd: number): void {
  fstat(fd, (err, stats) => {
    this.resolveMtime(err ? 0 : stats.mtimeMs)
  })
}

function streamOnData(this: StreamState, chunk: string): void {
  if (this.isFirstChunk) {
    this.isFirstChunk = false
    if (chunk.charCodeAt(0) === 0xfeff) {
      chunk = chunk.slice(1)
    }
  }

  this.totalBytesRead += Buffer.byteLength(chunk)
  if (
    !this.truncateOnByteLimit &&
    this.maxBytes !== undefined &&
    this.totalBytesRead > this.maxBytes
  ) {
    this.stream.destroy(
      new FileTooLargeError(this.totalBytesRead, this.maxBytes),
    )
    return
  }

  const data = this.partial.length > 0 ? this.partial + chunk : chunk
  this.partial = ''

  let startPos = 0
  let newlinePos: number
  while ((newlinePos = data.indexOf('\n', startPos)) !== -1) {
    if (
      this.currentLineIndex >= this.offset &&
      this.currentLineIndex < this.endLine
    ) {
      let line = data.slice(startPos, newlinePos)
      if (line.endsWith('\r')) line = line.slice(0, -1)
      if (this.truncateOnByteLimit && this.maxBytes !== undefined) {
        const sep = this.selectedLines.length > 0 ? 1 : 0
        const nextBytes = this.selectedBytes + sep + Buffer.byteLength(line)
        if (nextBytes > this.maxBytes) {
          this.truncatedByBytes = true
          this.endLine = this.currentLineIndex
        } else {
          this.selectedBytes = nextBytes
          this.selectedLines.push(line)
        }
      } else {
        this.selectedLines.push(line)
      }
    }
    this.currentLineIndex++
    startPos = newlinePos + 1
  }

  if (startPos < data.length) {
    if (
      this.currentLineIndex >= this.offset &&
      this.currentLineIndex < this.endLine
    ) {
      const fragment = data.slice(startPos)
      if (this.truncateOnByteLimit && this.maxBytes !== undefined) {
        const sep = this.selectedLines.length > 0 ? 1 : 0
        const fragBytes = this.selectedBytes + sep + Buffer.byteLength(fragment)
        if (fragBytes > this.maxBytes) {
          this.truncatedByBytes = true
          this.endLine = this.currentLineIndex
          return
        }
      }
      this.partial = fragment
    }
  }
}

function streamOnEnd(this: StreamState): void {
  let line = this.partial
  if (line.endsWith('\r')) line = line.slice(0, -1)
  if (
    this.currentLineIndex >= this.offset &&
    this.currentLineIndex < this.endLine
  ) {
    if (this.truncateOnByteLimit && this.maxBytes !== undefined) {
      const sep = this.selectedLines.length > 0 ? 1 : 0
      const nextBytes = this.selectedBytes + sep + Buffer.byteLength(line)
      if (nextBytes > this.maxBytes) {
        this.truncatedByBytes = true
      } else {
        this.selectedLines.push(line)
      }
    } else {
      this.selectedLines.push(line)
    }
  }
  this.currentLineIndex++

  const content = this.selectedLines.join('\n')
  const truncated = this.truncatedByBytes
  this.mtimeReady.then(mtimeMs => {
    this.resolve({
      content,
      lineCount: this.selectedLines.length,
      totalLines: this.currentLineIndex,
      totalBytes: this.totalBytesRead,
      readBytes: Buffer.byteLength(content, 'utf8'),
      mtimeMs,
      ...(truncated ? { truncatedByBytes: true } : {}),
    })
  })
}

function readFileInRangeStreaming(
  filePath: string,
  offset: number,
  maxLines: number | undefined,
  maxBytes: number | undefined,
  truncateOnByteLimit: boolean,
  signal?: AbortSignal,
): Promise<ReadFileRangeResult> {
  return new Promise((resolve, reject) => {
    const state: StreamState = {
      stream: createReadStream(filePath, {
        encoding: 'utf8',
        highWaterMark: 512 * 1024,
        ...(signal ? { signal } : undefined),
      }),
      offset,
      endLine: maxLines !== undefined ? offset + maxLines : Infinity,
      maxBytes,
      truncateOnByteLimit,
      resolve,
      totalBytesRead: 0,
      selectedBytes: 0,
      truncatedByBytes: false,
      currentLineIndex: 0,
      selectedLines: [],
      partial: '',
      isFirstChunk: true,
      resolveMtime: () => {},
      mtimeReady: null as unknown as Promise<number>,
    }
    state.mtimeReady = new Promise<number>(r => {
      state.resolveMtime = r
    })

    state.stream.once('open', streamOnOpen.bind(state))
    state.stream.on('data', streamOnData.bind(state))
    state.stream.once('end', streamOnEnd.bind(state))
    state.stream.once('error', reject)
  })
}
