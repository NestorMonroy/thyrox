/**
 * La identidad de cliente de GitHub Copilot: la versión fijada del CLI (o la
 * que declare el operador, si tiene forma de versión), su user agent de chat
 * y la versión de la API.
 *
 * Porte de `omniroute: open-sse/config/providerHeaderProfiles.ts` (MIT).
 */
import { type Environment, readVariable } from './clientId.ts'

export const COPILOT_API_VERSION = '2026-08-01'
const COPILOT_CLI_VERSION = '1.0.88'
// Un valor de la variable que no tenga forma de versión no llega a una cabecera.
const SAFE_VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/

export function copilotCliVersion(env: Environment = process.env): string {
  const declared = readVariable(env, 'THYROX_GITHUB_COPILOT_CLI_VERSION')
  return declared && SAFE_VERSION.test(declared) ? declared : COPILOT_CLI_VERSION
}

export function copilotChatUserAgent(env: Environment = process.env): string {
  return `GitHubCopilotChat/${copilotCliVersion(env)}`
}
