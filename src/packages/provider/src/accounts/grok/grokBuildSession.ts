/**
 * Las cabeceras de sesión de Grok Build contra su proxy de chat: la identidad
 * del cliente —versión, identificador, modo y un agente de usuario que nombra
 * plataforma y arquitectura como lo hace el CLI—, la autenticación por token
 * de xAI y, si se conocen, el modelo, el usuario y el correo. Una cuenta de
 * equipo u organización no envía correo.
 *
 * Porte de la parte de sesión de `omniroute: open-sse/config/grokBuild.ts` (MIT).
 */
import { GROK_BUILD_CLIENT_VERSION } from './grokBuild.ts'

export const GROK_BUILD_PROXY_BASE_URL = 'https://cli-chat-proxy.grok.com/v1'
export const GROK_BUILD_RESPONSES_URL = `${GROK_BUILD_PROXY_BASE_URL}/responses`
export const GROK_BUILD_MODELS_URL = `${GROK_BUILD_PROXY_BASE_URL}/models`
export const GROK_BUILD_DEFAULT_CONTEXT_WINDOW = 256_000
export const GROK_BUILD_DEFAULT_REASONING_EFFORT = 'high'
export const GROK_BUILD_SUPPORTED_REASONING_EFFORTS = Object.freeze(['low', 'medium', 'high', 'xhigh'])
export const GROK_BUILD_CLIENT_IDENTIFIER = 'grok-shell'
export const GROK_BUILD_TOKEN_AUTH = 'xai-grok-cli'
export const GROK_BUILD_REASONING_INCLUDE = 'reasoning.encrypted_content'

export type GrokBuildClientMode = 'headless' | 'interactive'

export interface RuntimeSystem {
  platform: string
  arch: string
}

export interface GrokBuildSessionHeaderOptions {
  token?: string | null
  model?: string | null
  stream?: boolean
  clientMode?: GrokBuildClientMode
  userId?: string | null
  email?: string | null
  principalType?: string | null
  system?: RuntimeSystem
}

const PLATFORM_NAMES: Readonly<Record<string, string>> = { darwin: 'macos', win32: 'windows' }
const ARCH_NAMES: Readonly<Record<string, string>> = { arm64: 'aarch64', x64: 'x86_64' }
const CURRENT_SYSTEM: RuntimeSystem = { platform: process.platform, arch: process.arch }

/** Una cuenta compartida no se identifica por un correo personal. */
function wireEmail(email?: string | null, principalType?: string | null): string | null {
  const type = principalType?.trim().toLowerCase()
  return type === 'team' || type === 'organization' ? null : email || null
}

export function grokBuildUserAgent(system: RuntimeSystem = CURRENT_SYSTEM): string {
  return `${GROK_BUILD_CLIENT_IDENTIFIER}/${GROK_BUILD_CLIENT_VERSION} (${PLATFORM_NAMES[system.platform] ?? system.platform}; ${ARCH_NAMES[system.arch] ?? system.arch})`
}

export function grokBuildClientHeaders(clientMode: GrokBuildClientMode = 'headless', system: RuntimeSystem = CURRENT_SYSTEM): Record<string, string> {
  return {
    'x-grok-client-version': GROK_BUILD_CLIENT_VERSION,
    'x-grok-client-identifier': GROK_BUILD_CLIENT_IDENTIFIER,
    'x-grok-client-mode': clientMode,
    'User-Agent': grokBuildUserAgent(system),
  }
}

export function grokBuildSessionHeaders({ token, model, stream = false, clientMode = 'headless', userId, email, principalType, system }: GrokBuildSessionHeaderOptions = {}): Record<string, string> {
  const sentEmail = wireEmail(email, principalType)
  return {
    'Content-Type': 'application/json',
    Accept: stream ? 'text/event-stream' : 'application/json',
    ...grokBuildClientHeaders(clientMode, system),
    'X-XAI-Token-Auth': GROK_BUILD_TOKEN_AUTH,
    'x-authenticateresponse': 'authenticate-response',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(model ? { 'x-grok-model-override': model } : {}),
    ...(userId ? { 'x-userid': userId, 'x-grok-user-id': userId } : {}),
    ...(sentEmail ? { 'x-email': sentEmail } : {}),
  }
}

export function grokBuildModelsHeaders({ token, userId, email, principalType, system }: Pick<GrokBuildSessionHeaderOptions, 'token' | 'userId' | 'email' | 'principalType' | 'system'>): Record<string, string> {
  const sentEmail = wireEmail(email, principalType)
  return {
    Accept: 'application/json',
    ...grokBuildClientHeaders('headless', system),
    'X-XAI-Token-Auth': GROK_BUILD_TOKEN_AUTH,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { 'x-userid': userId } : {}),
    ...(sentEmail ? { 'x-email': sentEmail } : {}),
  }
}
