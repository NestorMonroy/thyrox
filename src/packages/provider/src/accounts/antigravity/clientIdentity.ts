/**
 * Con qué identidad de cliente se presenta una cuenta de Antigravity ante
 * Google: el perfil (IDE o CLI), sus user agents, las cabeceras de las
 * llamadas de Code Assist, los metadatos de `loadCodeAssist` y los endpoints.
 *
 * Porte de `omniroute: open-sse/services/antigravityHeaders.ts`,
 * `open-sse/config/antigravityUpstream.ts` y
 * `src/shared/constants/antigravityClientProfile.ts` (MIT).
 */
export type ClientProfile = 'ide' | 'cli'

const DEFAULT_PROFILE: ClientProfile = 'ide'
/** Nombres que perfiles anteriores guardaron y que hoy son el perfil `cli`. */
const LEGACY_CLI_NAMES = new Set(['harness', 'sdk'])

export function normalizeClientProfile(value: unknown): ClientProfile {
  if (typeof value !== 'string') return DEFAULT_PROFILE
  const normalized = value.trim().toLowerCase()
  if (normalized === 'ide' || normalized === 'cli') return normalized
  return LEGACY_CLI_NAMES.has(normalized) ? 'cli' : DEFAULT_PROFILE
}

export const BOOTSTRAP_BASE_URLS = ['https://cloudcode-pa.googleapis.com'] as const
export const LOAD_CODE_ASSIST_ENDPOINTS = BOOTSTRAP_BASE_URLS.map(base => `${base}/v1internal:loadCodeAssist`)
export const ONBOARD_USER_ENDPOINTS = BOOTSTRAP_BASE_URLS.map(base => `${base}/v1internal:onboardUser`)

const IDE_NODE_API_CLIENT = 'google-api-nodejs-client/10.3.0'
const IDE_NODE_X_GOOG_API_CLIENT = 'gl-node/22.21.1'
// El backend espera la compilación de escritorio de macOS: el token de plataforma se fija, sea cual sea el anfitrión.
const OS_TYPE = 'darwin'
const ARCH = 'arm64'

export function antigravityIdeUserAgent(version: string): string {
  return `antigravity/ide/${version} ${OS_TYPE}/${ARCH}`
}

export function antigravityCliUserAgent(version: string, authMethod = 'consumer'): string {
  return `antigravity/cli/${version} (aidev_client; os_type=${OS_TYPE}; arch=${ARCH}; auth_method=${authMethod})`
}

export function antigravityIdeNodeUserAgent(version: string): string {
  return `antigravity/${version} ${OS_TYPE}/${ARCH} ${IDE_NODE_API_CLIENT}`
}

export interface ClientVersionsView {
  cachedIde(): string
  cachedCli(): string
}

/** El user agent del intercambio de tokens. */
export function oauthUserAgent(profile: ClientProfile, versions: ClientVersionsView): string {
  return profile === 'cli' ? antigravityCliUserAgent(versions.cachedCli()) : antigravityIdeNodeUserAgent(versions.cachedIde())
}

/** Las cabeceras de `loadCodeAssist`/`onboardUser`: el perfil CLI con su user agent, el IDE como cliente Node. */
export function codeAssistHeaders(profile: ClientProfile, versions: ClientVersionsView, accessToken: string): Record<string, string> {
  const headers: Record<string, string> =
    profile === 'cli'
      ? { 'Content-Type': 'application/json', 'User-Agent': antigravityCliUserAgent(versions.cachedCli()) }
      : {
          'Content-Type': 'application/json',
          'User-Agent': antigravityIdeNodeUserAgent(versions.cachedIde()),
          'X-Goog-Api-Client': IDE_NODE_X_GOOG_API_CLIENT,
        }
  headers.Authorization = `Bearer ${accessToken}`
  return headers
}

// Enumerados int32 del protobuf de `loadCodeAssist`: una identidad incompleta se rechaza con 403.
const IDE_TYPE_ANTIGRAVITY = 9
const PLUGIN_TYPE_GEMINI = 2
const PLATFORM = { UNSPECIFIED: 0, DARWIN_AMD64: 1, DARWIN_ARM64: 2, LINUX_AMD64: 3, LINUX_ARM64: 4, WINDOWS_AMD64: 5 } as const

function platformEnum(platform: string, arch: string): number {
  const arm = arch === 'arm64'
  if (platform === 'darwin') return arm ? PLATFORM.DARWIN_ARM64 : PLATFORM.DARWIN_AMD64
  if (platform === 'linux') return arm ? PLATFORM.LINUX_ARM64 : PLATFORM.LINUX_AMD64
  if (platform === 'win32') return PLATFORM.WINDOWS_AMD64
  return PLATFORM.UNSPECIFIED
}

export function loadCodeAssistMetadata(platform: string = process.platform, arch: string = process.arch): Record<string, number> {
  return { ideType: IDE_TYPE_ANTIGRAVITY, platform: platformEnum(platform, arch), pluginType: PLUGIN_TYPE_GEMINI }
}
