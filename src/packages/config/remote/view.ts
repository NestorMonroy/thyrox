/**
 * Las lecturas sobre el estado de carga remota (`./loadState.ts`) que la
 * composición de política consume — porte de `chunk-379zyrv7.js` de 2.1.283:
 *
 * | Fuente | Aquí |
 * |---|---|
 * | `Ha` | `TRANSPORT_ENV_ALLOWLIST` (con `G1`, `LL`, `Bs`, `Lpt`, `qn`, `Zn`, `ymn` desplegadas) |
 * | `ja` / `um` | `unverifiedView` / `unverifiedViewOf` |
 * | `Ka` | `isVerifiedOrOverridden` |
 * | `om` | `projectPolicySnapshot` — DIVERGENCIA, ver abajo |
 * | `Xk` | `getProjectedRemoteSettings` |
 * | `Ta` | `hasManagedMcpServers` |
 * | `FL` / `ha` / `fa` / `ls` | `HELPER_PLATFORMS` / `HELPER_SLOT_PATHS` / `helperSlotPlatform` / `policyHelperSlots` |
 * | `Yo` / `hg` / `Cne` | `platformFallbackChain` / `isWslKernel` / `platformChain` |
 * | `agn` | `hasWithheldManagedMcpServers` |
 *
 * `um` sirve la caché de sesión aún no confirmada por el servidor sin sus
 * `managedMcpServers` y con `env` acotado a las variables de transporte
 * (`Ha`): lo que hace falta para llegar al servidor que confirmará el resto.
 * `agn` es el otro lado de esa retención: dice si el crudo retenido traía
 * servidores MCP, en la raíz o en una ranura del asistente cuya plataforma
 * esté en la cadena de la máquina.
 *
 * DIVERGENCIA — `om`/`X3n`: en modo instantánea (`evalPolicySnapshotOnly`)
 * la fuente proyecta el crudo a sus campos restrictivos (`X3n`: la tabla
 * `Qe()` con `Ls`, `nc`, `st`, `qt`) y añade `managedSourcesBehavior:
 * 'merge'`. De esas piezas este paquete sólo tiene `Qe` (`RESTRICTIVE_SETTINGS`
 * en `policyMerge.ts`); `Ls`, `nc`, `st` y `qt` no están extraídas
 * (`.claude/workbench/policy-settings-port-20260927T083804/` no las trae).
 * Aquí `projectPolicySnapshot` devuelve el crudo, así que la vista proyectada
 * es el crudo y `isServedSnapshot` mide la identidad con él. Condición de
 * cierre: extraer `X3n` con sus cuatro tablas y portarla; la prueba 9 de
 * `remoteView.test.ts` cae ese día.
 *
 * `hg` lee `/proc/version` con el `fs` del host cuando lo hay y con
 * `node:fs` si no — mismo respaldo que `syncCacheState.ts`.
 */

import { readFileSync } from 'node:fs'
import { tryGetConfigHostBindings } from '../host.js'
import { getPlatform, type Platform } from '../platform.js'
import type { SettingsJson } from '../settings/types.js'
import { getRemoteLoadState, getRemoteSettingsOverridePath, isEvalPolicySnapshotOnly, type RemoteLoadState } from './loadState.js'
import { getRemoteManagedSettingsSyncFromCache } from './syncCacheState.js'

type PolicyDocument = Record<string, unknown>

/** `G1`: los interruptores de proveedor. */
const PROVIDER_SWITCHES = [
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY',
  'CLAUDE_CODE_USE_ANTHROPIC_AWS',
  'CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD',
  'CLAUDE_CODE_USE_MANTLE',
  'CLAUDE_CODE_USE_GATEWAY',
  'ANTHROPIC_FOUNDRY_RESOURCE',
  'ANTHROPIC_VERTEX_PROJECT_ID',
  'ANTHROPIC_AWS_WORKSPACE_ID',
  'ANTHROPIC_GOOGLE_CLOUD_PROJECT',
  'ANTHROPIC_GOOGLE_CLOUD_LOCATION',
  'ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID',
  'CLOUD_ML_REGION',
]

/** `Bs`. */
const MEMORY_API_VARIABLES = ['CLAUDE_CODE_MEMORY_API_BASE_URL', 'CLAUDE_CODE_MEMORY_API_TOKEN']

/** `LL`: las URL base de cada proveedor y de los artefactos. */
const BASE_URL_VARIABLES = [
  'ANTHROPIC_BASE_URL',
  '_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL',
  'ANTHROPIC_BEDROCK_BASE_URL',
  'ANTHROPIC_VERTEX_BASE_URL',
  'ANTHROPIC_FOUNDRY_BASE_URL',
  'ANTHROPIC_AWS_BASE_URL',
  'ANTHROPIC_GOOGLE_CLOUD_BASE_URL',
  'ANTHROPIC_BEDROCK_MANTLE_BASE_URL',
  'CLAUDE_CODE_ARTIFACTS_API_BASE_URL',
  'CLAUDE_CODE_ARTIFACTS_API_TOKEN',
  'CLAUDE_CODE_ARTIFACT_ASSET_BASE_URL',
  'CLAUDE_CODE_ARTIFACT_LIVE_BASE_URL',
  'CLAUDE_CODE_ARTIFACT_SYNC_BASE_URL',
  'CLAUDE_CODE_ARTIFACT_VIEWER_BASE_URL',
  ...MEMORY_API_VARIABLES,
]

/** `qn`. */
const AWS_STATIC_CREDENTIALS = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN']

/** `Lpt`: las credenciales de nube por archivo o perfil. */
const CLOUD_CREDENTIAL_FILES = [
  ...AWS_STATIC_CREDENTIALS,
  'AWS_PROFILE',
  'AWS_CONFIG_FILE',
  'AWS_SHARED_CREDENTIALS_FILE',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_CLOUD_PROJECT',
]

/** `Zn`: las credenciales AWS por contenedor, metadatos o identidad web. */
const AWS_RUNTIME_CREDENTIALS = [
  'AWS_CONTAINER_CREDENTIALS_FULL_URI',
  'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI',
  'AWS_CONTAINER_AUTHORIZATION_TOKEN',
  'AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE',
  'AWS_EC2_METADATA_SERVICE_ENDPOINT',
  'AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE',
  'AWS_WEB_IDENTITY_TOKEN_FILE',
  'AWS_ROLE_ARN',
]

/** `ymn`. */
const GCE_METADATA_VARIABLES = ['GCE_METADATA_HOST', 'GCE_METADATA_ROOT', 'GCE_METADATA_IP', 'METADATA_SERVER_DETECTION']

/** `Ha`: las variables que la caché sin verificar puede fijar — las de llegar al servidor. */
export const TRANSPORT_ENV_ALLOWLIST: ReadonlySet<string> = new Set([
  'HTTPS_PROXY',
  'HTTP_PROXY',
  'NO_PROXY',
  'CLAUDE_CODE_PROXY_RESOLVES_HOSTS',
  'CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER',
  'CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS',
  'API_FORCE_IDLE_TIMEOUT',
  'ANTHROPIC_UNIX_SOCKET',
  'NODE_EXTRA_CA_CERTS',
  'CLAUDE_CODE_CERT_STORE',
  'CLAUDE_CODE_CLIENT_CERT',
  'CLAUDE_CODE_CLIENT_KEY',
  'CLAUDE_CODE_CLIENT_KEY_PASSPHRASE',
  'ALL_PROXY',
  'NODE_OPTIONS',
  'NODE_TLS_REJECT_UNAUTHORIZED',
  ...PROVIDER_SWITCHES,
  ...BASE_URL_VARIABLES,
  'AWS_ENDPOINT_URL_STS',
  'AWS_ENDPOINT_URL',
  'AWS_ENDPOINT_URL_SSO',
  'AWS_ENDPOINT_URL_SSO_OIDC',
  'AWS_ENDPOINT_URL_BEDROCK',
  'AWS_ENDPOINT_URL_BEDROCK_RUNTIME',
  ...CLOUD_CREDENTIAL_FILES,
  ...AWS_RUNTIME_CREDENTIALS,
  ...GCE_METADATA_VARIABLES,
  'CLOUDSDK_CONFIG',
  'GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES',
  'GCLOUD_PROJECT',
  'CLAUDE_CODE_CUSTOM_OAUTH_URL',
])

/** `z`. */
function isPlainRecord(value: unknown): value is PolicyDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `Ia`: un objeto llano, de prototipo `Object` o nulo. */
function isPlainObject(value: unknown): value is PolicyDocument {
  if (typeof value !== 'object' || value === null) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** `yt`: lectura por ruta con puntos. */
function getAtDottedPath(value: unknown, path: string): unknown {
  let current: unknown = value
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as PolicyDocument)[key]
  }
  return current
}

/** `ja`: la vista de un crudo sin verificar — sin `managedMcpServers`, `env` acotado al transporte. */
export function unverifiedView<T extends PolicyDocument | null>(raw: T): T {
  if (!raw || (!raw.env && !('managedMcpServers' in raw))) return raw
  const { managedMcpServers: _withheld, ...rest } = raw
  if (!raw.env) return rest as T
  const env = Object.fromEntries(
    Object.entries(raw.env as Record<string, unknown>).filter(([name]) => TRANSPORT_ENV_ALLOWLIST.has(name.toUpperCase())),
  )
  return { ...rest, env } as unknown as T
}

/** `Ka`: el crudo es el verificado, o hay archivo de anulación. */
function isVerifiedOrOverridden(state: RemoteLoadState<SettingsJson>, raw: SettingsJson | null): boolean {
  return raw === state.verifiedPayload || Boolean(getRemoteSettingsOverridePath())
}

/** `um`: la vista sin verificar, memoizada por identidad del crudo. */
function unverifiedViewOf(state: RemoteLoadState<SettingsJson>, raw: SettingsJson | null): SettingsJson | null {
  if (raw === null) return null
  if (state.unverifiedView?.raw !== raw) state.unverifiedView = { raw, view: unverifiedView(raw) }
  return state.unverifiedView.view
}

/** `om`: ver la DIVERGENCIA del docstring del módulo — hoy devuelve el crudo. */
function projectPolicySnapshot(raw: SettingsJson): SettingsJson {
  return raw
}

/** `Xk`: lo que la capa remota sirve a la composición. */
export function getProjectedRemoteSettings(): SettingsJson | null {
  const raw = getRemoteManagedSettingsSyncFromCache()
  const state = getRemoteLoadState()
  const served = isVerifiedOrOverridden(state, raw) ? raw : unverifiedViewOf(state, raw)
  if (served === null || !isEvalPolicySnapshotOnly()) return served
  if (state.projectedView?.raw !== served) state.projectedView = { raw: served, view: projectPolicySnapshot(served) }
  return state.projectedView.view
}

/** `Ta`. */
export function hasManagedMcpServers(document: PolicyDocument): boolean {
  const servers = document.managedMcpServers
  return isPlainRecord(servers) && Object.keys(servers).length > 0
}

/** `FL`. */
export const HELPER_PLATFORMS = ['macos', 'linux', 'windows', 'wsl'] as const
type HelperPlatform = (typeof HELPER_PLATFORMS)[number]

/** `ha`: las rutas de ranura del asistente, por plataforma y la de respaldo. */
export const HELPER_SLOT_PATHS = [...HELPER_PLATFORMS.map(platform => `${platform}.defaultSettings`), 'default'] as const

/** `fa`: la plataforma de una ruta de ranura; `default` no tiene. */
export function helperSlotPlatform(path: string): HelperPlatform | undefined {
  return HELPER_PLATFORMS.find(platform => path === `policyHelpers.${platform}.defaultSettings`)
}

/** `ls`: cada ranura del asistente presente, sin sus propias claves de asistente. */
export function policyHelperSlots(document: PolicyDocument): Array<[string, PolicyDocument]> {
  const slots: Array<[string, PolicyDocument]> = []
  for (const suffix of HELPER_SLOT_PATHS) {
    const path = `policyHelpers.${suffix}`
    const slot = getAtDottedPath(document, path)
    if (!isPlainObject(slot)) continue
    const { policyHelper: _helper, policyHelpers: _helpers, ...rest } = slot
    slots.push([path, rest])
  }
  return slots
}

/** `Yo`: wsl hereda linux; el resto es su propia cadena. */
function platformFallbackChain(platform: Exclude<Platform, 'unknown'>): Platform[] {
  return platform === 'wsl' ? ['wsl', 'linux'] : [platform]
}

/** `hg`/`MYn`/`DYn`: el kernel se declara WSL en `/proc/version`. */
export function isWslKernel(): boolean {
  try {
    const read = tryGetConfigHostBindings().readFileSync ?? ((path: string, encoding: string) => readFileSync(path, { encoding: encoding as BufferEncoding }))
    const version = read('/proc/version', 'utf8').toLowerCase()
    return version.includes('microsoft') || version.includes('wsl')
  } catch {
    return false
  }
}

export type PlatformChain = { platform: Platform; chain: Platform[] }

/** `Cne`: una wsl que el kernel no confirma se trata como linux. */
export function platformChain(platform: Platform = getPlatform(), wslKernel: () => boolean = isWslKernel): PlatformChain {
  const effective = platform === 'wsl' && !wslKernel() ? 'linux' : platform
  if (effective === 'unknown') return { platform: effective, chain: [] }
  return { platform: effective, chain: platformFallbackChain(effective) }
}

/** `agn`: el crudo retenido traía servidores MCP que la sesión aún no sirve. */
export function hasWithheldManagedMcpServers(chain: PlatformChain = platformChain()): boolean {
  const raw = getRemoteManagedSettingsSyncFromCache()
  if (raw === null || isVerifiedOrOverridden(getRemoteLoadState(), raw)) return false
  if (hasManagedMcpServers(raw)) return true
  const slots = policyHelperSlots(raw)
  if (slots.length === 0) return false
  return slots.some(([path, slot]) => {
    const platform = helperSlotPlatform(path)
    return (platform === undefined || chain.chain.includes(platform)) && hasManagedMcpServers(slot)
  })
}
