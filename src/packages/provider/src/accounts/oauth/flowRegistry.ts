/**
 * Los flujos de inicio de sesión de cada proveedor, con sus configuraciones
 * leídas del entorno: los client id salen sólo de variables `THYROX_*`, y un
 * flujo que no tiene el suyo rehúsa al usarse, nombrando la variable. Los
 * alias comparten el flujo del proveedor al que representan.
 *
 * La identidad de dispositivo de Kimi se fija al construir el registro: su id
 * se declara o se persiste una vez, para que el refresco use el mismo con que
 * se concedió el grant.
 *
 * Porte de `PROVIDERS` en `omniroute: src/lib/oauth/providers/index.ts` (MIT).
 */
import { arch, hostname, release, type as systemType } from 'node:os'
import { join } from 'node:path'

import { resolveProvidersDataDir } from '../connectionStoreHome.ts'
import { grokOAuthConfig } from '../grok/grokBuild.ts'
import { kimiDeviceModel, resolveKimiDeviceId, sanitizeKimiHeaderValue } from '../kimi/kimiIdentity.ts'
import { anthropicOAuthConfig, createAnthropicFlow } from './flows/anthropicFlow.ts'
import { antigravityOAuthConfig, createAntigravityFlow } from './flows/antigravityFlow.ts'
import type { Environment } from './flows/clientId.ts'
import { createClineFlow } from './flows/clineFlow.ts'
import { createCodebuddyCnFlow } from './flows/codebuddyCnFlow.ts'
import { codexOAuthConfig, createCodexFlow } from './flows/codexFlow.ts'
import { createCursorFlow } from './flows/cursorFlow.ts'
import { createGheCopilotFlow, gheCopilotOAuthConfig } from './flows/gheCopilotFlow.ts'
import { createGithubFlow, githubOAuthConfig } from './flows/githubFlow.ts'
import { createGitlabDuoFlow, gitlabDuoOAuthConfig } from './flows/gitlabDuoFlow.ts'
import { createGrokCliFlow } from './flows/grokCliFlow.ts'
import { createDevinFlow, createTraeFlow, createZedFlow } from './flows/importedTokenFlows.ts'
import { createKilocodeFlow } from './flows/kilocodeFlow.ts'
import { createKimiCodingFlow, kimiCodingOAuthConfig } from './flows/kimiCodingFlow.ts'
import { createKiroFlow, kiroOAuthConfig } from './flows/kiroFlow.ts'
import { createMuseCodeFlow, museCodeOAuthConfig } from './flows/museCodeFlow.ts'
import { createOpenferenceFlow, openferenceOAuthConfig } from './flows/openferenceFlow.ts'
import { createQoderFlow, qoderOAuthConfig } from './flows/qoderFlow.ts'
import { createXaiOAuthFlow } from './flows/xaiOAuthFlow.ts'
import { createZedHostedFlow } from './flows/zedHostedFlow.ts'
import type { OAuthProviderFlow } from './oauthFlows.ts'

export const OAUTH_LOGIN_PROVIDERS = [
  'claude', 'codex', 'antigravity', 'agy', 'qoder', 'kimi-coding', 'github', 'ghe-copilot', 'gitlab-duo', 'kiro', 'amazon-q',
  'cursor', 'trae', 'kilocode', 'cline', 'clinepass', 'devin-desktop', 'devin-cli', 'grok-cli', 'xai-oauth', 'openference',
  'codebuddy-cn', 'zed', 'zed-hosted', 'muse-code',
] as const

const KIMI_DEVICE_ID_FILE = 'kimi-device-id'

export interface FlowRegistryDeps {
  env?: Environment
  fetch?: typeof globalThis.fetch
  /** Dónde se persiste el id de dispositivo de Kimi; por defecto, en el hogar de proveedores. */
  kimiDeviceIdPath?: string
}

export function createOAuthFlowRegistry(deps: FlowRegistryDeps = {}): Record<string, OAuthProviderFlow<any>> {
  const env = deps.env ?? process.env
  const { fetch } = deps
  const kiro = createKiroFlow({ config: kiroOAuthConfig(), fetch })
  const cline = createClineFlow({ fetch })
  const devin = createDevinFlow()
  const kimiIdentity = () => ({
    deviceId: resolveKimiDeviceId({ env, path: deps.kimiDeviceIdPath ?? join(resolveProvidersDataDir(env), KIMI_DEVICE_ID_FILE) }),
    deviceName: sanitizeKimiHeaderValue(hostname()),
    deviceModel: sanitizeKimiHeaderValue(kimiDeviceModel({ type: systemType(), release: release(), arch: arch() })),
    osVersion: sanitizeKimiHeaderValue(release()),
  })
  const flows: Record<(typeof OAUTH_LOGIN_PROVIDERS)[number], OAuthProviderFlow<any>> = {
    claude: createAnthropicFlow({ config: anthropicOAuthConfig(env), fetch }),
    codex: createCodexFlow({ config: codexOAuthConfig(env), fetch }),
    antigravity: createAntigravityFlow({ config: antigravityOAuthConfig(env), profile: 'ide', fetch }),
    agy: createAntigravityFlow({ config: antigravityOAuthConfig(env), profile: 'cli', fetch }),
    qoder: createQoderFlow({ config: qoderOAuthConfig(env), fetch }),
    'kimi-coding': createKimiCodingFlow({ config: kimiCodingOAuthConfig(env), identity: kimiIdentity, fetch, env }),
    github: createGithubFlow({ config: githubOAuthConfig(env), fetch, env }),
    'ghe-copilot': createGheCopilotFlow({ config: gheCopilotOAuthConfig(env), fetch, env }),
    'gitlab-duo': createGitlabDuoFlow({ config: gitlabDuoOAuthConfig(env), fetch }),
    kiro,
    'amazon-q': kiro,
    cursor: createCursorFlow(),
    trae: createTraeFlow(),
    kilocode: createKilocodeFlow({ fetch }),
    cline,
    clinepass: cline,
    'devin-desktop': devin,
    'devin-cli': devin,
    'grok-cli': createGrokCliFlow({ config: grokOAuthConfig(env), fetch }),
    'xai-oauth': createXaiOAuthFlow({ config: grokOAuthConfig(env), fetch }),
    openference: createOpenferenceFlow({ config: openferenceOAuthConfig(env), fetch }),
    'codebuddy-cn': createCodebuddyCnFlow({ fetch }),
    zed: createZedFlow(),
    'zed-hosted': createZedHostedFlow({ fetch }),
    'muse-code': createMuseCodeFlow({ config: museCodeOAuthConfig(env), fetch }),
  }
  return flows
}
