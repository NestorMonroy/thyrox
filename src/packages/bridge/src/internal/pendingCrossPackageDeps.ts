/**
 * Sustitutos locales de símbolos que, en `ccnmt` (el árbol de referencia,
 * `packages/bridge/src/**`), vienen de OTROS paquetes del monorepo —
 * `@claude-code-how-works/{agent,command-runtime,config,headless-sdk,
 * local-observability,output,permission,provider,swarm}`. Mismo patrón
 * que `@thyrox/storage: src/internal/pendingCrossPackageDeps.ts`,
 * `@thyrox/local-observability: src/internal/pendingCrossPackageDeps.ts`,
 * `@thyrox/headless-sdk: src/internal/pendingCrossPackageDeps.ts` y
 * `@thyrox/daemon: src/internal/pendingCrossPackageDeps.ts`: un archivo
 * consolidado, cada entrada documentada con su cita de origen, su
 * divergencia exacta y su condición de retiro. `@thyrox/bridge` no es
 * miembro del bun workspace (`src/packages/package.json`) todavía, así
 * que ningún `@thyrox/*` resuelve desde este paquete aunque el hermano ya
 * exporte el subpath real.
 *
 * Tres formas, igual que en `@thyrox/daemon` — cada bloque dice cuál:
 *
 * 1. REIMPLEMENTACIÓN FIEL — el símbolo es puro/simple y su cuerpo real
 *    cabe aquí verbatim (o casi), O ya existe idéntico en el paquete
 *    hermano y sólo falta la membresía de workspace para resolverlo
 *    desde aquí.
 * 2. PUNTO DE INYECCIÓN — el símbolo pertenece de verdad a OTRO dominio
 *    (telemetría, sesiones concurrentes, permisos). Default inocuo
 *    (no-op) + setter. NUNCA se reimplementa la lógica real aquí.
 */
import packageJson from '../../package.json'
import memoize from 'lodash-es/memoize.js'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { execFile as execFileCb } from 'node:child_process'
import { promisify } from 'node:util'
import type { NonNullableUsage } from '@claude-code-how-works/headless-sdk/sdkUtilityTypes.js'

/**
 * `getOauthConfig` — de `@claude-code-how-works/provider/oauthConstants`.
 * Ya existe idéntica en `@thyrox/provider: src/oauthConstants.ts:155`
 * (misma lógica local/staging/prod + override por env). Se reimplementa
 * aquí en su forma acotada (bridge sólo lee `.BASE_API_URL`) porque el
 * paquete no resuelve sin membresía de workspace. Se retira cuando
 * `@thyrox/bridge` sea miembro del workspace.
 */
export interface OauthConfig {
  BASE_API_URL: string
  CONSOLE_AUTHORIZE_URL: string
}

const PROD_OAUTH_CONFIG: OauthConfig = {
  BASE_API_URL: 'https://api.anthropic.com',
  CONSOLE_AUTHORIZE_URL: 'https://console.anthropic.com/oauth/authorize',
}

export function getOauthConfig(): OauthConfig {
  const custom = process.env.CLAUDE_CODE_CUSTOM_OAUTH_URL
  if (custom) {
    const base = custom.replace(/\/$/, '')
    return { ...PROD_OAUTH_CONFIG, BASE_API_URL: base }
  }
  return PROD_OAUTH_CONFIG
}

/**
 * `getClaudeAIOAuthTokens` — de
 * `@claude-code-how-works/provider/authAlias.js`. Ya existe en
 * `@thyrox/provider: src/authAlias.ts:1008` con esta forma exacta. Punto
 * de inyección con default null (equivale a "sin sesión"). Se retira
 * cuando `@thyrox/bridge` sea miembro del workspace.
 */
export interface OAuthTokens {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  scopes?: readonly string[]
  subscriptionType?: string | null
  clientId?: string
}

let _getClaudeAIOAuthTokens: () => OAuthTokens | null = () => null

export function getClaudeAIOAuthTokens(): OAuthTokens | null {
  return _getClaudeAIOAuthTokens()
}

export function setGetClaudeAIOAuthTokensFn(fn: () => OAuthTokens | null): void {
  _getClaudeAIOAuthTokens = fn
}

/**
 * `updateSessionBridgeId` — de
 * `@claude-code-how-works/agent/concurrentSessions.js:145-149`. Escribe
 * `{bridgeSessionId}` al pid-file de la sesión (vía `updatePidFile`, un
 * mecanismo interno de ese mismo archivo) para que `claude ps` pueda
 * deduplicar sesiones bridge locales. Punto de inyección — default no-op:
 * `setReplBridgeHandle` sigue funcionando sin publicar el id al pid-file;
 * la única consecuencia es que otro peer local no la deduplique de su
 * lista. Se retira cuando `@thyrox/agent` porte `concurrentSessions.ts` Y
 * `@thyrox/bridge` sea miembro del workspace.
 */
let _updateSessionBridgeId: (bridgeSessionId: string | null) => Promise<void> =
  async () => {}

export function updateSessionBridgeId(
  bridgeSessionId: string | null,
): Promise<void> {
  return _updateSessionBridgeId(bridgeSessionId)
}

export function setUpdateSessionBridgeIdFn(
  fn: (bridgeSessionId: string | null) => Promise<void>,
): void {
  _updateSessionBridgeId = fn
}

/**
 * `redactSecrets` — de `@claude-code-how-works/storage/secretsRegistry.js`.
 * Ya existe idéntica en `@thyrox/storage: src/secretsRegistry.ts` (porte
 * COMPLETO, 121 líneas fuente, verificado). Se reimplementa aquí VERBATIM
 * —tabla de patrones completa (`high` + `low`) y las dos funciones que la
 * consultan— porque el paquete no resuelve sin membresía de workspace.
 * Se retira cuando `@thyrox/bridge` sea miembro del workspace y pueda
 * importar `@thyrox/storage/secretsRegistry.js` directo.
 */
export type SecretConfidence = 'high' | 'low'

interface SecretPattern {
  name: string
  re: RegExp
  confidence: SecretConfidence
}

const REGEXES: SecretPattern[] = [
  // -------------------- HIGH-CONFIDENCE --------------------
  { name: 'anthropic-api-key', re: /sk-ant-[a-zA-Z0-9_-]{40,}/g, confidence: 'high' },
  { name: 'openai-api-key', re: /sk-(?!ant-)[A-Za-z0-9_-]{40,}/g, confidence: 'high' },
  { name: 'aws-access-key-id', re: /AKIA[0-9A-Z]{16}/g, confidence: 'high' },
  { name: 'aws-temporary-token', re: /ASIA[0-9A-Z]{16}/g, confidence: 'high' },
  { name: 'github-token', re: /gh[pousr]_[A-Za-z0-9_]{36,}/g, confidence: 'high' },
  { name: 'stripe-live-secret', re: /sk_live_[A-Za-z0-9]{16,}/g, confidence: 'high' },
  { name: 'slack-token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g, confidence: 'high' },
  {
    name: 'jwt',
    re: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    confidence: 'high',
  },
  {
    name: 'pem-private-key',
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
    confidence: 'high',
  },
  // -------------------- LOW-CONFIDENCE --------------------
  // Da falsos positivos con SHAs de commit / salidas de hash — quien
  // los use debe hacerlo por decisión explícita.
  { name: 'generic-hex-32', re: /\b[0-9a-f]{32}\b/g, confidence: 'low' },
  { name: 'generic-token-40', re: /\b[A-Za-z0-9_-]{40,}\b/g, confidence: 'low' },
  {
    name: 'authorization-header',
    re: /Authorization:\s*Bearer\s+[A-Za-z0-9._-]+/gi,
    confidence: 'low',
  },
]

function getSecretPatterns(
  opts: { confidence?: SecretConfidence } = {},
): SecretPattern[] {
  if (opts.confidence === undefined) return REGEXES.slice()
  return REGEXES.filter(p => p.confidence === opts.confidence)
}

export function redactSecrets(
  text: string,
  opts: { confidence?: SecretConfidence } = {},
): string {
  let out = text
  for (const p of getSecretPatterns(opts)) {
    out = out.replace(p.re, `[REDACTED:${p.name}]`)
  }
  return out
}

/**
 * `detectImageFormatFromBase64` (+ el sniffing de magic bytes que usa) —
 * de `@claude-code-how-works/storage/imageResizer.js`. Ya existe
 * idéntica en `@thyrox/storage: src/imageResizer.ts:67,119`
 * (mismos magic bytes PNG/JPEG/GIF/WebP). Reimplementación fiel
 * VERBATIM porque el paquete no resuelve sin membresía de workspace.
 * Se retira cuando `@thyrox/bridge` sea miembro del workspace.
 */
export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'

function detectImageFormatFromBuffer(buffer: Buffer): ImageMediaType {
  if (buffer.length < 4) return 'image/png'

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }

  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif'
  }

  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    if (
      buffer.length >= 12 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'image/webp'
    }
  }

  return 'image/png'
}

export function detectImageFormatFromBase64(base64Data: string): ImageMediaType {
  try {
    const buffer = Buffer.from(base64Data, 'base64')
    return detectImageFormatFromBuffer(buffer)
  } catch {
    return 'image/png'
  }
}

/**
 * `logForDebugging` — de
 * `@claude-code-how-works/local-observability/debug.js`. Ya existe
 * idéntica en `@thyrox/local-observability: src/debug.ts:236`. Punto de
 * inyección (telemetría/logging es dominio ajeno) — default no-op. Se
 * retira cuando `@thyrox/bridge` sea miembro del workspace.
 */
let _logForDebugging: (...args: unknown[]) => void = () => {}

export function logForDebugging(...args: unknown[]): void {
  _logForDebugging(...args)
}

export function setLogForDebuggingFn(fn: (...args: unknown[]) => void): void {
  _logForDebugging = fn
}

/**
 * `errorMessage` — de
 * `@claude-code-how-works/local-observability/errorHelpers.js:106-108`.
 * Ya existe idéntica en `@thyrox/local-observability:
 * src/errorHelpers.ts:114`. Reimplementación fiel VERBATIM (una línea,
 * cero estado) — no hace falta punto de inyección. Se retira cuando
 * `@thyrox/bridge` sea miembro del workspace.
 */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * `logEvent` — de `@claude-code-how-works/local-observability` (core.ts,
 * re-exportado desde el index). Ya existe idéntica en
 * `@thyrox/local-observability: src/core.ts:79`. Punto de inyección
 * (telemetría es dominio ajeno) — default no-op. `EventMetadata` se
 * acota a `Record<string, unknown>` (bridge sólo construye objetos
 * planos, no consume el tipo discriminado real). Se retira cuando
 * `@thyrox/bridge` sea miembro del workspace.
 */
type EventMetadata = Record<string, unknown>

let _logEvent: (name: string, metadata: EventMetadata) => void = () => {}

export function logEvent(name: string, metadata: EventMetadata = {}): void {
  _logEvent(name, metadata)
}

export function setLogEventFn(
  fn: (name: string, metadata: EventMetadata) => void,
): void {
  _logEvent = fn
}

/**
 * `jsonStringify` — de
 * `@claude-code-how-works/local-observability/slowOperations.js`. Ya
 * existe idéntica EN COMPORTAMIENTO en `@thyrox/local-observability:
 * src/slowOperations.ts:56` — misma firma de sobrecarga y mismo
 * `JSON.stringify` de fondo. Diverge en que la fuente envuelve la
 * llamada con `using _ = slowLogging(...)` para medir el tiempo cuando
 * la serialización es lenta; aquí se omite esa instrumentación porque
 * es telemetría pura, sin efecto funcional en `debugBody` (que sólo
 * necesita el string serializado). Se retira cuando `@thyrox/bridge`
 * sea miembro del workspace.
 */
export function jsonStringify(
  value: unknown,
  replacer?:
    | ((this: unknown, key: string, value: unknown) => unknown)
    | (number | string)[]
    | null,
  space?: string | number,
): string {
  return JSON.stringify(
    value,
    replacer as Parameters<typeof JSON.stringify>[1],
    space,
  )
}

/**
 * `lazySchema` — de
 * `@claude-code-how-works/tool-registry/utils/lazySchema.js`. Puro y
 * trivial (4 líneas, memoización de una fábrica) — reimplementación
 * fiel VERBATIM, sin punto de inyección. Se retira cuando
 * `@thyrox/bridge` sea miembro del workspace.
 */
export function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}

/**
 * `getFeatureValue_CACHED_WITH_REFRESH` — de
 * `@claude-code-how-works/config/feature-flags`. Ya existe en
 * `@thyrox/config: feature-flags.ts:74`, con resolución real (override
 * de env → config → LOCAL_GATE_DEFAULTS → fallback). Punto de inyección
 * — la resolución de banderas de feature es dominio de `@thyrox/config`,
 * no de bridge; el default devuelve `fallback` sin más (equivale a
 * "ninguna bandera declarada", que es el comportamiento de
 * `DEFAULT_POLL_CONFIG` sin GrowthBook). Se retira cuando
 * `@thyrox/bridge` sea miembro del workspace.
 */
let _getFeatureValueCachedWithRefresh: <T>(
  feature: string,
  fallback: T,
  refreshIntervalMs?: number,
) => T = (_feature, fallback) => fallback

export function getFeatureValue_CACHED_WITH_REFRESH<T>(
  feature: string,
  fallback: T,
  refreshIntervalMs?: number,
): T {
  return _getFeatureValueCachedWithRefresh(feature, fallback, refreshIntervalMs)
}

export function setGetFeatureValueCachedWithRefreshFn(
  fn: <T>(feature: string, fallback: T, refreshIntervalMs?: number) => T,
): void {
  _getFeatureValueCachedWithRefresh = fn
}

/**
 * `feature()` — de `bun:bundle`, macro de build time de ccnmt (medido:
 * `import('bun:bundle')` no resuelve en Bun 1.3.11 fuera del build de
 * ccnmt — "Cannot find package 'bundle'"). Mismo sustituto ya adoptado
 * en `@thyrox/voice: src/voiceModeEnabled.ts:18` — lectura de la
 * variable de entorno `CCB_FEATURE_<FLAG>` — pero el default por
 * bandera NO es uniforme: se deriva de
 * `ccnmt: scripts/default-features.ts` (medido, `grep -n
 * "CCR_AUTO_CONNECT\|CCR_MIRROR\|BRIDGE_MODE\|STABLE_FEATURES"`):
 *
 * - `BRIDGE_MODE` está en `STABLE_FEATURES` (línea 24) — encendida en
 *   TODO build de ccnmt, dev y release. Default-ON aquí (`!== '0'`).
 * - `CCR_AUTO_CONNECT` y `CCR_MIRROR` NO están en `STABLE_FEATURES` —
 *   son banderas opt-in de build (`bridgeEnabled.ts:177`: "ant-only"),
 *   sólo encendidas cuando el build setea `FEATURE_CCR_AUTO_CONNECT=1`
 *   / `FEATURE_CCR_MIRROR=1` (`default-features.ts:73-77`). Default-OFF
 *   aquí (`=== '1'`) — lo contrario de `BRIDGE_MODE`.
 */
export function feature(
  flag: 'BRIDGE_MODE' | 'CCR_AUTO_CONNECT' | 'CCR_MIRROR',
): boolean {
  if (flag === 'BRIDGE_MODE') return process.env[`CCB_FEATURE_${flag}`] !== '0'
  return process.env[`CCB_FEATURE_${flag}`] === '1'
}

/**
 * `getFeatureValue_CACHED_MAY_BE_STALE` — de
 * `@claude-code-how-works/config/feature-flags`. Ya existe en
 * `@thyrox/config: feature-flags.ts:63`, con resolución real (override
 * de env → config → LOCAL_GATE_DEFAULTS → fallback). Punto de inyección
 * — mismo razonamiento que `getFeatureValue_CACHED_WITH_REFRESH` arriba:
 * la resolución de banderas es dominio de `@thyrox/config`. Default:
 * devuelve `fallback`. Se retira cuando `@thyrox/bridge` sea miembro del
 * workspace.
 */
let _getFeatureValueCachedMayBeStale: <T>(gate: string, fallback: T) => T = (
  _gate,
  fallback,
) => fallback

export function getFeatureValue_CACHED_MAY_BE_STALE<T>(
  gate: string,
  fallback: T,
): T {
  return _getFeatureValueCachedMayBeStale(gate, fallback)
}

export function setGetFeatureValueCachedMayBeStaleFn(
  fn: <T>(gate: string, fallback: T) => T,
): void {
  _getFeatureValueCachedMayBeStale = fn
}

/**
 * `checkGate_CACHED_OR_BLOCKING` / `getDynamicConfig_CACHED_MAY_BE_STALE`
 * — de `@claude-code-how-works/config/feature-flags`. Ya existen en
 * `@thyrox/config: feature-flags.ts:183,215` — y AHÍ son literalmente
 * wrappers de una línea sobre `getFeatureValue_CACHED_MAY_BE_STALE`.
 * Reimplementación fiel VERBATIM de esa misma relación, delegando al
 * sustituto de arriba (no un punto de inyección propio, porque no
 * añaden lógica). Se retira cuando `@thyrox/bridge` sea miembro del
 * workspace.
 */
export async function checkGate_CACHED_OR_BLOCKING(
  gate: string,
): Promise<boolean> {
  return Boolean(getFeatureValue_CACHED_MAY_BE_STALE(gate, false))
}

export function getDynamicConfig_CACHED_MAY_BE_STALE<T>(
  configName: string,
  defaultValue: T,
): T {
  return getFeatureValue_CACHED_MAY_BE_STALE(configName, defaultValue)
}

/**
 * `isEnvTruthy` — de `@claude-code-how-works/config/env/utils`. Ya
 * existe idéntica en `@thyrox/config: env/utils.ts:25`. Reimplementación
 * fiel VERBATIM (pura, 5 líneas). Se retira cuando `@thyrox/bridge` sea
 * miembro del workspace.
 */
export function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalized = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

/**
 * `lt` — de `@claude-code-how-works/config/semver`. Ya existe en
 * `@thyrox/provider`... en realidad vive en `@thyrox/config` en la
 * fuente y aún no se porta ahí. Reimplementación fiel ACOTADA: la fuente
 * tiene una rama `typeof Bun !== 'undefined'` (Bun.semver.order) y un
 * fallback a la librería npm `semver` para Node — aquí sólo se porta la
 * rama Bun, porque este árbol es exclusivamente Bun (`_references/`,
 * runtime declarado). Se retira cuando `@thyrox/bridge` sea miembro del
 * workspace.
 */
export function lt(a: string, b: string): boolean {
  return Bun.semver.order(a, b) === -1
}

/**
 * `MACRO.VERSION` — define de build de ccnmt (`scripts/defines.ts`,
 * sustituido por Bun.build en tiempo de compilación). Aquí no hay build
 * propio con ese macro; se resuelve en runtime desde el propio
 * `package.json` del paquete — mismo patrón que
 * `@thyrox/provider: src/internal/pendingCrossPackageDeps.ts` usa para
 * `MACRO.VERSION`, aquí con import JSON estático (Bun lo soporta
 * nativamente) en vez de `require()`, para no introducir un import
 * perezoso donde el especificador SÍ resuelve.
 */

export function getMacroVersion(): string {
  return (packageJson as { version: string }).version
}

/**
 * `getClaudeAiBaseUrl` / `getRemoteSessionUrl` / `isRemoteSessionLocal` /
 * `isRemoteSessionStaging` — de
 * `@claude-code-how-works/config/product`. `@thyrox/config` no las
 * porta aún. Reimplementación fiel VERBATIM (puras, constantes +
 * comparación de substring). `getRemoteSessionUrl` en la fuente hace un
 * `require()` perezoso de `@claude-code-how-works/bridge/sessionIdCompat.js`
 * para romper un ciclo config→bridge→config; aquí NO hace falta: es
 * nuestro propio `./sessionIdCompat.js` hermano, así que se importa
 * estático arriba del archivo (nunca hay ciclo real desde este lado). Se
 * retira cuando `@thyrox/bridge` sea miembro del workspace.
 */
export const CLAUDE_AI_BASE_URL = 'https://claude.ai'
export const CLAUDE_AI_STAGING_BASE_URL = 'https://claude-ai.staging.ant.dev'
export const CLAUDE_AI_LOCAL_BASE_URL = 'http://localhost:4000'

export function isRemoteSessionStaging(
  sessionId?: string,
  ingressUrl?: string,
): boolean {
  return (
    sessionId?.includes('_staging_') === true ||
    ingressUrl?.includes('staging') === true
  )
}

export function isRemoteSessionLocal(
  sessionId?: string,
  ingressUrl?: string,
): boolean {
  return (
    sessionId?.includes('_local_') === true ||
    ingressUrl?.includes('localhost') === true
  )
}

export function getClaudeAiBaseUrl(
  sessionId?: string,
  ingressUrl?: string,
): string {
  if (isRemoteSessionLocal(sessionId, ingressUrl)) {
    return CLAUDE_AI_LOCAL_BASE_URL
  }
  if (isRemoteSessionStaging(sessionId, ingressUrl)) {
    return CLAUDE_AI_STAGING_BASE_URL
  }
  return CLAUDE_AI_BASE_URL
}

/**
 * `isClaudeAISubscriber` / `hasProfileScope` / `getOauthAccountInfo` —
 * de `@claude-code-how-works/provider/authAlias.js`. Ya existen en
 * `@thyrox/provider: src/authAlias.ts:1283,1289,1299`, con lógica real
 * (lee `getGlobalConfig().oauthAccount`, scopes del token OAuth). Punto
 * de inyección — el estado global de config/auth es dominio de
 * `@thyrox/provider`/`@thyrox/config`, no de bridge. Defaults inocuos:
 * `false`/`false`/`undefined` (equivale a "no hay sesión con
 * entitlement", que es el fallback que la propia fuente usa en sus
 * try/catch de `bridgeEnabled.ts:94-116`). Se retira cuando
 * `@thyrox/bridge` sea miembro del workspace.
 */
export interface AccountInfo {
  organizationUuid?: string
  billingType?: string
}

let _isClaudeAISubscriber: () => boolean = () => false
let _hasProfileScope: () => boolean = () => false
let _getOauthAccountInfo: () => AccountInfo | undefined = () => undefined

export function isClaudeAISubscriber(): boolean {
  return _isClaudeAISubscriber()
}
export function hasProfileScope(): boolean {
  return _hasProfileScope()
}
export function getOauthAccountInfo(): AccountInfo | undefined {
  return _getOauthAccountInfo()
}
export function setIsClaudeAISubscriberFn(fn: () => boolean): void {
  _isClaudeAISubscriber = fn
}
export function setHasProfileScopeFn(fn: () => boolean): void {
  _hasProfileScope = fn
}
export function setGetOauthAccountInfoFn(
  fn: () => AccountInfo | undefined,
): void {
  _getOauthAccountInfo = fn
}

/**
 * `stringWidth` — de `@anthropic/ink` (fork de Ink vendorizado en ccnmt
 * como `packages/@ant/ink`, NO publicado en npm — `@ant/ink` da 404 en
 * el registro público). La fuente
 * (`@ant/ink: src/core/stringWidth.ts:213-221`) resuelve a
 * `Bun.stringWidth(str, {ambiguousIsNarrow: true})` cuando existe, con
 * un fallback JS (emoji-regex + get-east-asian-width) para Node. Aquí
 * SÓLO se porta la rama Bun: este árbol es exclusivamente Bun, así que
 * el fallback JS nunca se ejercería y añadiría dos dependencias npm sin
 * uso real. Se retira cuando `@thyrox/bridge` sea miembro del workspace
 * Y `@ant/ink` (o su puerto) esté disponible.
 */
export function stringWidth(str: string): number {
  return Bun.stringWidth(str, { ambiguousIsNarrow: true })
}

/**
 * `getGraphemeSegmenter` — de
 * `@claude-code-how-works/output/utils/intl.js`. Ya existe idéntica en
 * `@thyrox/output: src/utils/intl.ts:17`. Reimplementación fiel
 * VERBATIM (memoiza un `Intl.Segmenter`). Se retira cuando
 * `@thyrox/bridge` sea miembro del workspace.
 */
let _graphemeSegmenter: Intl.Segmenter | undefined
export function getGraphemeSegmenter(): Intl.Segmenter {
  if (!_graphemeSegmenter) {
    _graphemeSegmenter = new Intl.Segmenter(undefined, {
      granularity: 'grapheme',
    })
  }
  return _graphemeSegmenter
}

/**
 * `formatDuration` — de
 * `@claude-code-how-works/output/formatters/format.js`. Ya existe
 * idéntica en `@thyrox/output: src/formatters/format.ts:44`.
 * Reimplementación fiel VERBATIM. Se retira cuando `@thyrox/bridge` sea
 * miembro del workspace.
 */
export function formatDuration(
  ms: number,
  options?: { hideTrailingZeros?: boolean; mostSignificantOnly?: boolean },
): string {
  if (ms < 60000) {
    if (ms === 0) {
      return '0s'
    }
    if (ms < 1) {
      const s = (ms / 1000).toFixed(1)
      return `${s}s`
    }
    const s = Math.floor(ms / 1000).toString()
    return `${s}s`
  }

  let days = Math.floor(ms / 86400000)
  let hours = Math.floor((ms % 86400000) / 3600000)
  let minutes = Math.floor((ms % 3600000) / 60000)
  let seconds = Math.round((ms % 60000) / 1000)

  if (seconds === 60) {
    seconds = 0
    minutes++
  }
  if (minutes === 60) {
    minutes = 0
    hours++
  }
  if (hours === 24) {
    hours = 0
    days++
  }

  const hide = options?.hideTrailingZeros

  if (options?.mostSignificantOnly) {
    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    return `${seconds}s`
  }

  if (days > 0) {
    if (hide && hours === 0 && minutes === 0) return `${days}d`
    if (hide && minutes === 0) return `${days}d ${hours}h`
    return `${days}d ${hours}h ${minutes}m`
  }
  if (hours > 0) {
    if (hide && minutes === 0 && seconds === 0) return `${hours}h`
    if (hide && seconds === 0) return `${hours}h ${minutes}m`
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    if (hide && seconds === 0) return `${minutes}m`
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

/**
 * `truncateToWidth` — de
 * `@claude-code-how-works/output/formatters/truncate.js`. NO portado en
 * `@thyrox/output` (depende de `stringWidth` de `@anthropic/ink`, ver
 * el docstring de ese paquete). Reimplementación fiel VERBATIM usando
 * el `stringWidth`/`getGraphemeSegmenter` de arriba. Se retira cuando
 * `@thyrox/bridge` sea miembro del workspace Y `@thyrox/output` porte
 * `truncate.ts`.
 */
export function truncateToWidth(text: string, maxWidth: number): string {
  if (stringWidth(text) <= maxWidth) return text
  if (maxWidth <= 1) return '…'
  let width = 0
  let result = ''
  for (const { segment } of getGraphemeSegmenter().segment(text)) {
    const segWidth = stringWidth(segment)
    if (width + segWidth > maxWidth - 1) break
    result += segment
    width += segWidth
  }
  return result + '…'
}

/**
 * `getClaudeConfigHomeDir` — de
 * `@claude-code-how-works/config/env/utils`. `@thyrox/config: env/utils.ts`
 * la MENCIONA en su docstring de cabecera pero no la exporta todavía
 * (porte parcial de ese paquete). Reimplementación fiel VERBATIM (pura,
 * memoizada con `lodash-es/memoize`, ya dependencia npm real de este
 * paquete). Se retira cuando `@thyrox/config` la porte Y `@thyrox/bridge`
 * sea miembro del workspace.
 */

export const getClaudeConfigHomeDir = memoize(
  (): string => {
    return (
      process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')
    ).normalize('NFC')
  },
  () => process.env.CLAUDE_CONFIG_DIR,
)

/**
 * `getSessionId` — de `@claude-code-how-works/app-host/bootstrap/state.js`.
 * NO existe todavía en `@thyrox/app-host: src/bootstrap/state.ts` (medido:
 * `grep -n getSessionId bootstrap/state.ts` sin resultados, ya señalado
 * en `@thyrox/app-host: src/startup/startupProfiler.ts:8-13`). Punto de
 * inyección — el ID de sesión es estado global de `@thyrox/app-host`, no
 * de bridge. Default: un UUID generado una vez por proceso, memoizado
 * (nunca colisiona entre procesos concurrentes, a diferencia de un
 * placeholder fijo). Se retira cuando `@thyrox/app-host` porte
 * `getSessionId` Y `@thyrox/bridge` sea miembro del workspace.
 */

let _getSessionId: () => string = (() => {
  let cached: string | undefined
  return () => (cached ??= randomUUID())
})()

export function getSessionId(): string {
  return _getSessionId()
}

export function setGetSessionIdFn(fn: () => string): void {
  _getSessionId = fn
}

/**
 * `jsonParse` — de
 * `@claude-code-how-works/local-observability/slowOperations.js`. Misma
 * relación que `jsonStringify` arriba: existe idéntica EN
 * COMPORTAMIENTO en `@thyrox/local-observability`, pero ese paquete no
 * la porta como símbolo propio todavía (medido: 0 hits de
 * `export.*jsonParse` ahí). Reimplementación fiel ACOTADA — se omite el
 * `using _ = slowLogging(...)` de telemetría (sin efecto funcional) y
 * la rama de deopt de V8 para `reviver` (bridge nunca lo pasa). Se
 * retira cuando `@thyrox/local-observability` la porte Y
 * `@thyrox/bridge` sea miembro del workspace.
 */
export function jsonParse(
  text: string,
  reviver?: (this: unknown, key: string, value: unknown) => unknown,
): unknown {
  return typeof reviver === 'undefined'
    ? JSON.parse(text)
    : JSON.parse(text, reviver)
}

/**
 * `getProjectsDir` — de
 * `@claude-code-how-works/storage/sessionStoragePortable.js`. Ya existe
 * idéntica en `@thyrox/storage: src/sessionStoragePortable.ts:329`.
 * Reimplementación fiel VERBATIM, compuesta con el
 * `getClaudeConfigHomeDir` de arriba. Se retira cuando `@thyrox/bridge`
 * sea miembro del workspace.
 */
export function getProjectsDir(): string {
  return join(getClaudeConfigHomeDir(), 'projects')
}

/**
 * `sanitizePath` (+ djb2Hash/simpleHash que usa) — de
 * `@claude-code-how-works/storage/sessionStoragePortable.js`. Ya existe
 * idéntica en `@thyrox/storage: src/sessionStoragePortable.ts:264`.
 * Reimplementación fiel VERBATIM. Se retira cuando `@thyrox/bridge` sea
 * miembro del workspace.
 */
const MAX_SANITIZED_LENGTH = 200

function djb2Hash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return hash
}

function simpleHash(str: string): string {
  return Math.abs(djb2Hash(str)).toString(36)
}

export function sanitizePath(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '-')
  if (sanitized.length <= MAX_SANITIZED_LENGTH) {
    return sanitized
  }
  const hash =
    typeof Bun !== 'undefined' ? Bun.hash(name).toString(36) : simpleHash(name)
  return `${sanitized.slice(0, MAX_SANITIZED_LENGTH)}-${hash}`
}

/**
 * `getWorktreePathsPortable` — de
 * `@claude-code-how-works/storage/getWorktreePathsPortable.js`. Ya
 * existe idéntica en `@thyrox/storage:
 * src/getWorktreePathsPortable.ts:23` (puerto COMPLETO ahí, sólo
 * `child_process`+`util` de Node). Reimplementación fiel VERBATIM. Se
 * retira cuando `@thyrox/bridge` sea miembro del workspace.
 */

const execFileAsync = promisify(execFileCb)

export async function getWorktreePathsPortable(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['worktree', 'list', '--porcelain'],
      { cwd, timeout: 5000 },
    )
    if (!stdout) return []
    return stdout
      .split('\n')
      .filter(line => line.startsWith('worktree '))
      .map(line => line.slice('worktree '.length).normalize('NFC'))
  } catch {
    return []
  }
}

/**
 * `getErrnoCode` / `isENOENT` — de
 * `@claude-code-how-works/local-observability/errorHelpers.js`. Ya
 * existen idénticas en `@thyrox/local-observability: src/errorHelpers.ts:119,127`.
 * Reimplementación fiel VERBATIM. Se retira cuando `@thyrox/bridge` sea
 * miembro del workspace.
 */
export function getErrnoCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') {
    return e.code
  }
  return undefined
}

export function isENOENT(e: unknown): boolean {
  return getErrnoCode(e) === 'ENOENT'
}

/**
 * `logForDiagnosticsNoPII` — de
 * `@claude-code-how-works/local-observability/logging`. Ya existe con
 * lógica real en `@thyrox/local-observability: src/logging/diag-log.ts:35`
 * (escribe a un archivo de diagnóstico vía una abstracción de fs
 * inyectable). Punto de inyección — infraestructura de logging a disco
 * es dominio de `@thyrox/local-observability`, no de bridge. Default
 * no-op. Se retira cuando `@thyrox/bridge` sea miembro del workspace.
 */
type DiagnosticLogLevel = 'debug' | 'info' | 'warn' | 'error'

let _logForDiagnosticsNoPII: (
  level: DiagnosticLogLevel,
  event: string,
  data?: Record<string, unknown>,
) => void = () => {}

export function logForDiagnosticsNoPII(
  level: DiagnosticLogLevel,
  event: string,
  data?: Record<string, unknown>,
): void {
  _logForDiagnosticsNoPII(level, event, data)
}

export function setLogForDiagnosticsNoPIIFn(
  fn: (
    level: DiagnosticLogLevel,
    event: string,
    data?: Record<string, unknown>,
  ) => void,
): void {
  _logForDiagnosticsNoPII = fn
}

/**
 * `isPolicyAllowed` / `waitForPolicyLimitsToLoad` — de
 * `@claude-code-how-works/provider/policyLimits/index.js`. Ya existen
 * con lógica real (fetch de red, caché de sesión) en `@thyrox/provider:
 * src/policyLimits/index.ts:341,147` (469 líneas). Punto de inyección —
 * el subsistema de límites de política organizacional es dominio de
 * `@thyrox/provider`, no de bridge. Defaults: `isPolicyAllowed` → `true`
 * (fail-open, MISMO comportamiento que la fuente documenta para
 * "desconocida/no disponible" — no es una relajación nuestra);
 * `waitForPolicyLimitsToLoad` → resuelve de inmediato. Se retira cuando
 * `@thyrox/bridge` sea miembro del workspace.
 */
let _isPolicyAllowed: (policy: string) => boolean = () => true
let _waitForPolicyLimitsToLoad: () => Promise<void> = async () => {}

export function isPolicyAllowed(policy: string): boolean {
  return _isPolicyAllowed(policy)
}
export function waitForPolicyLimitsToLoad(): Promise<void> {
  return _waitForPolicyLimitsToLoad()
}
export function setIsPolicyAllowedFn(fn: (policy: string) => boolean): void {
  _isPolicyAllowed = fn
}
export function setWaitForPolicyLimitsToLoadFn(fn: () => Promise<void>): void {
  _waitForPolicyLimitsToLoad = fn
}

/**
 * `getPrivacyLevel` / `isEssentialTrafficOnly` — de
 * `@claude-code-how-works/config/env/privacy-level`. `@thyrox/config`
 * NO tiene este archivo todavía (medido: `find … -iname "*privacy*"`
 * sin resultados). Reimplementación fiel VERBATIM (pura, lee dos env
 * vars). Se retira cuando `@thyrox/config` la porte Y `@thyrox/bridge`
 * sea miembro del workspace.
 */
type PrivacyLevel = 'default' | 'no-telemetry' | 'essential-traffic'

export function getPrivacyLevel(): PrivacyLevel {
  if (process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) {
    return 'essential-traffic'
  }
  if (process.env.DISABLE_TELEMETRY) {
    return 'no-telemetry'
  }
  return 'default'
}

export function isEssentialTrafficOnly(): boolean {
  return getPrivacyLevel() === 'essential-traffic'
}

/**
 * `getSecureStorage` (+ `SecureStorageData`) — de
 * `@claude-code-how-works/storage/secureStorage.js`. Ya existe con
 * lógica real (keychain de macOS vía subproceso `security`, fallback
 * plaintext con chmod 0o600) en `@thyrox/storage:
 * src/secureStorage/index.ts:23`. Punto de inyección — acceso a
 * keychain/disco con efectos secundarios de seguridad es dominio de
 * `@thyrox/storage`, no de bridge. Default: un store en memoria (NO
 * toca el keychain real ni el disco) que sí honra read/update dentro
 * del mismo proceso, para que enrollTrustedDevice/clearTrustedDeviceToken
 * degraden con un comportamiento internamente consistente en vez de un
 * no-op que siempre "tenga éxito" sin persistir nada. `SecureStorageData`
 * se acota al único campo que trustedDevice.ts toca. Se retira cuando
 * `@thyrox/bridge` sea miembro del workspace.
 */
export interface SecureStorageData {
  trustedDeviceToken?: string
  [key: string]: unknown
}

export interface SecureStorage {
  read(): SecureStorageData | null
  update(data: SecureStorageData): { success: boolean; warning?: string }
}

function createInMemorySecureStorage(): SecureStorage {
  let store: SecureStorageData | null = null
  return {
    read: () => store,
    update: data => {
      store = data
      return { success: true }
    },
  }
}

let _getSecureStorage: () => SecureStorage = (() => {
  const singleton = createInMemorySecureStorage()
  return () => singleton
})()

export function getSecureStorage(): SecureStorage {
  return _getSecureStorage()
}

export function setGetSecureStorageFn(fn: () => SecureStorage): void {
  _getSecureStorage = fn
}

/**
 * `updateSessionIngressAuthToken` — de
 * `@claude-code-how-works/provider/sessionIngressAuth.js`. NO existe
 * todavía en `@thyrox/provider` (medido: 0 hits de
 * `export.*updateSessionIngressAuthToken`). Reimplementación fiel
 * VERBATIM (una línea: fija una env var de proceso). Se retira cuando
 * `@thyrox/provider` la porte Y `@thyrox/bridge` sea miembro del
 * workspace.
 */
export function updateSessionIngressAuthToken(token: string): void {
  process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN = token
}

/**
 * `getOAuthHeaders` — de `@claude-code-how-works/teleport/api.js`. Ya
 * existe idéntica en `@thyrox/teleport: src/api.ts:287`. Reimplementación
 * fiel VERBATIM (pura, 5 líneas). Se retira cuando `@thyrox/bridge` sea
 * miembro del workspace.
 */
export function getOAuthHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  }
}

/**
 * `parseGitRemote` (+ `ParsedRepository`, `looksLikeRealHostname`) — de
 * `@claude-code-how-works/storage/detectRepository.js` (extraído a
 * `parseGitRemote.ts` en la fuente). Ya existe idéntica en
 * `@thyrox/storage: src/parseGitRemote.ts:21` (puerto COMPLETO ahí, sin
 * dependencias externas). Reimplementación fiel VERBATIM. Se retira
 * cuando `@thyrox/bridge` sea miembro del workspace.
 */
export interface ParsedRepository {
  host: string
  owner: string
  name: string
}

function looksLikeRealHostname(host: string): boolean {
  if (!host.includes('.')) return false
  const lastSegment = host.split('.').pop()
  if (!lastSegment) return false
  return /^[a-zA-Z]+$/.test(lastSegment)
}

export function parseGitRemote(input: string): ParsedRepository | null {
  const trimmed = input.trim()

  const sshMatch = trimmed.match(/^git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/)
  if (sshMatch?.[1] && sshMatch[2] && sshMatch[3]) {
    if (!looksLikeRealHostname(sshMatch[1])) return null
    return {
      host: sshMatch[1],
      owner: sshMatch[2],
      name: sshMatch[3],
    }
  }

  const urlMatch = trimmed.match(
    /^(https?|ssh|git):\/\/(?:[^@]+@)?([^/:]+(?::\d+)?)\/([^/]+)\/([^/]+?)(?:\.git)?$/,
  )
  if (urlMatch?.[1] && urlMatch[2] && urlMatch[3] && urlMatch[4]) {
    const protocol = urlMatch[1]
    const hostWithPort = urlMatch[2]
    const hostWithoutPort = hostWithPort.split(':')[0] ?? ''
    if (!looksLikeRealHostname(hostWithoutPort)) return null
    const host =
      protocol === 'https' || protocol === 'http'
        ? hostWithPort
        : hostWithoutPort
    return {
      host,
      owner: urlMatch[3],
      name: urlMatch[4],
    }
  }

  return null
}

/**
 * `parseGitHubRepository` — de
 * `@claude-code-how-works/storage/detectRepository.js`. Ya existe
 * idéntica en `@thyrox/storage: src/detectRepository.ts:49` (puerto
 * completo en lógica ahí). Reimplementación fiel VERBATIM, delegando en
 * el `parseGitRemote` de arriba. Se retira cuando `@thyrox/bridge` sea
 * miembro del workspace.
 */
export function parseGitHubRepository(input: string): string | null {
  const trimmed = input.trim()

  const parsed = parseGitRemote(trimmed)
  if (parsed) {
    if (parsed.host !== 'github.com') return null
    return `${parsed.owner}/${parsed.name}`
  }

  if (
    !trimmed.includes('://') &&
    !trimmed.includes('@') &&
    trimmed.includes('/')
  ) {
    const parts = trimmed.split('/')
    if (parts.length === 2 && parts[0] && parts[1]) {
      const repo = parts[1].replace(/\.git$/, '')
      return `${parts[0]}/${repo}`
    }
  }

  return null
}

/**
 * `getOrganizationUUID` — de
 * `@claude-code-how-works/provider/oauth/client.js`. Ya existe con
 * lógica real (env override → oauthAccount guardado → fetch de perfil
 * en vivo) en `@thyrox/provider: src/oauth/client.ts:432`. Punto de
 * inyección — depende de config global + fetch de red, dominio de
 * `@thyrox/provider`, no de bridge. Default: `null` (createSession ya
 * trata esto como "no se pudo crear la sesión", su propio camino de
 * fallo declarado). Se retira cuando `@thyrox/bridge` sea miembro del
 * workspace.
 */
let _getOrganizationUUID: () => Promise<string | null> = async () => null

export function getOrganizationUUID(): Promise<string | null> {
  return _getOrganizationUUID()
}

export function setGetOrganizationUUIDFn(
  fn: () => Promise<string | null>,
): void {
  _getOrganizationUUID = fn
}

/**
 * `getDefaultBranch` — de `@claude-code-how-works/storage/git.js`. Ya
 * existe en `@thyrox/storage: src/git.ts:184` (delega en
 * `getCachedDefaultBranch()`, un subsistema de caché + shell-out a git).
 * Punto de inyección — ese subsistema es dominio de `@thyrox/storage`,
 * no de bridge. Default: `''` (createSession ya trata un valor falsy
 * como "sin default branch conocido": `branch || (await
 * getDefaultBranch()) || undefined`). Se retira cuando `@thyrox/bridge`
 * sea miembro del workspace.
 */
let _getDefaultBranch: () => Promise<string> = async () => ''

export function getDefaultBranch(): Promise<string> {
  return _getDefaultBranch()
}

export function setGetDefaultBranchFn(fn: () => Promise<string>): void {
  _getDefaultBranch = fn
}

/**
 * `getMainLoopModel` — de `@claude-code-how-works/provider/model.js`.
 * Ya existe con lógica real (tier de suscripción, overrides de ant,
 * inflado de conexión) en `@thyrox/provider: src/model.ts:123`. Punto
 * de inyección — resolución de modelo por tier es dominio de
 * `@thyrox/provider`, no de bridge (createSession sólo necesita UN
 * string para `session_context.model`, informativo). Default: un id de
 * modelo Sonnet de catálogo. Se retira cuando `@thyrox/bridge` sea
 * miembro del workspace.
 */
let _getMainLoopModel: () => string = () => 'claude-sonnet-5'

export function getMainLoopModel(): string {
  return _getMainLoopModel()
}

export function setGetMainLoopModelFn(fn: () => string): void {
  _getMainLoopModel = fn
}

/**
 * `PermissionMode` — de `@claude-code-how-works/permission/PermissionMode.js`
 * (verbatim: `permission/src/PermissionMode.ts:8` re-exporta el alias desde
 * `./types/permissions.js` → `../permissionTypes.js`). `@thyrox/permission`
 * aún no porta ese archivo (su `permissions.ts` es porte PARCIAL DECLARADO
 * enfocado en `getDenyRuleForTool`, y cita `PermissionMode.js` como sibling
 * no portado). Se declara aquí el tipo estructural — únicamente los seis
 * modos que `EXTERNAL_PERMISSION_MODES` fija en la fuente
 * (`permissionTypes.ts:16-22`); el séptimo (`'auto'`) sólo entra bajo
 * `feature('TRANSCRIPT_CLASSIFIER')`, que este árbol no resuelve — se omite
 * por lo mismo que `feature()` de este archivo defaultea esa bandera a OFF.
 */
export type PermissionMode =
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'default'
  | 'dontAsk'
  | 'plan'
  | 'ask'

/**
 * `EMPTY_USAGE` — de `@claude-code-how-works/provider/emptyUsage.js`
 * (verbatim). NO es el mismo símbolo que el `EMPTY_USAGE` ya portado en
 * `@thyrox/provider: src/internal/legacyRuntimeSupport.ts:528` — son DOS
 * constantes homónimas de dos archivos-fuente distintos en ccnmt
 * (`provider/src/emptyUsage.ts` vs `provider/src/claudeLegacyRuntime.ts`,
 * que declara la suya inline) y DIVERGEN: `service_tier` es `'standard'`
 * aquí y `null` allá; `inference_geo` es `''` aquí y ausente (opcional)
 * allá; `iterations`/`speed` sólo están aquí. Reusar la de
 * `legacyRuntimeSupport.ts` habría sido citar el símbolo equivocado.
 */
export const EMPTY_USAGE: Readonly<NonNullableUsage> = {
  input_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  output_tokens: 0,
  server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
  service_tier: 'standard',
  cache_creation: {
    ephemeral_1h_input_tokens: 0,
    ephemeral_5m_input_tokens: 0,
  },
  inference_geo: '',
  iterations: [],
  speed: 'standard',
}

/**
 * `normalizeControlMessageKeys` — de
 * `@claude-code-how-works/headless-sdk/controlMessageCompat.js` (verbatim,
 * la fuente no tiene imports). Ya existe idéntica en
 * `@thyrox/headless-sdk: src/controlMessageCompat.ts` (porte completo,
 * verificado). Se reimplementa aquí VERBATIM porque el paquete no resuelve
 * en runtime sin membresía de workspace (medido:
 * `require.resolve('@thyrox/headless-sdk/controlMessageCompat')` →
 * `Cannot find module`). Se retira cuando `@thyrox/bridge` sea miembro del
 * workspace.
 */
export function normalizeControlMessageKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  const record = obj as Record<string, unknown>
  if ('requestId' in record && !('request_id' in record)) {
    record.request_id = record.requestId
    delete record.requestId
  }
  if (
    'response' in record &&
    record.response !== null &&
    typeof record.response === 'object'
  ) {
    const response = record.response as Record<string, unknown>
    if ('requestId' in response && !('request_id' in response)) {
      response.request_id = response.requestId
      delete response.requestId
    }
  }
  return obj
}

/**
 * `stripDisplayTagsAllowEmpty` — de
 * `@claude-code-how-works/output/utils/displayTags.js` (verbatim, la
 * fuente no tiene imports). Ya existe idéntica en
 * `@thyrox/output: src/utils/displayTags.ts` (porte completo de las tres
 * funciones del archivo, verificado). Se reimplementa aquí VERBATIM sólo
 * la función que `bridgeMessaging.ts` consume (`extractTitleText`) —
 * `stripDisplayTags`/`stripIdeContextTags` no tienen consumidor en bridge
 * todavía — porque el paquete no resuelve en runtime sin membresía de
 * workspace. Se retira cuando `@thyrox/bridge` sea miembro del workspace.
 */
const XML_TAG_BLOCK_PATTERN = /<([a-z][\w-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>\n?/g

export function stripDisplayTagsAllowEmpty(text: string): string {
  return text.replace(XML_TAG_BLOCK_PATTERN, '').trim()
}

/**
 * `BRIDGE_SPINNER_FRAMES` / `BRIDGE_READY_INDICATOR` / `BRIDGE_FAILED_INDICATOR`
 * — de `@claude-code-how-works/output/constants/figures.js` (verbatim, la
 * fuente no tiene imports). Ya existen idénticas en
 * `@thyrox/output: src/constants/figures.ts:50-57` (porte completo de las
 * 26 constantes del archivo, verificado). Se reimplementan aquí VERBATIM
 * sólo las tres que `bridgeUI.ts` consume porque el paquete no resuelve en
 * runtime sin membresía de workspace. Se retiran cuando `@thyrox/bridge`
 * sea miembro del workspace.
 */
export const BRIDGE_SPINNER_FRAMES = ['·|·', '·/·', '·—·', '·\\·']
export const BRIDGE_READY_INDICATOR = '·✔︎·'
export const BRIDGE_FAILED_INDICATOR = '×'
