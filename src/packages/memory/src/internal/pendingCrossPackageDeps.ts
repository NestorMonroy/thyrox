/**
 * Sustitutos locales de símbolos que, en `ccnmt` (el árbol de referencia,
 * `packages/memory/src/{paths,memdir,teamMemPaths,memoryEntrypoint,
 * extractMemories,agentMemory,sessionMemoryUtils,sessionMemoryPrompts,
 * memdir/memoryScan}.ts`), vienen de OTROS paquetes del monorepo y que
 * `@thyrox` todavía no ofrece por una frontera importable sin ciclo. Mismo
 * patrón que `@thyrox/storage: src/internal/pendingCrossPackageDeps.ts`.
 *
 * Lo que ya NO vive aquí, porque su original se importa directo:
 * `getFeatureValue_CACHED_MAY_BE_STALE` (`@thyrox/config/feature-flags`),
 * `getConfigHomeDir` (`@thyrox/config/env/configHome`) y `readFileInRange`
 * con `FileTooLargeError` y `ReadFileRangeResult`
 * (`@thyrox/repl/readFileInRange.js`). `readEnv`, `isEnvTruthy`, `logEvent`,
 * `logError` y `logForDebugging` tampoco: se importan de
 * `@thyrox/config/env/utils` y `@thyrox/local-observability`.
 *
 * Sustituciones, cada una con su alcance declarado:
 *
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
 *   con la MISMA forma, pero su `package.json` no exporta ese subpath.
 *   Sustituto: la misma forma de ruta
 *   (`{proyecto}/{sesión}/session-memory/summary.md`) con estado propio
 *   (cwd/sessionId) y sus propios setters DI.
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
 *   siempre el caso aquí (`bun test`). El original de `@thyrox/agent`
 *   cerraría un ciclo de módulos con este paquete, y por eso sigue aquí.
 */

import { join } from 'node:path'

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

