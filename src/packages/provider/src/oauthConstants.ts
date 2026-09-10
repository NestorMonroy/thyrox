/**
 * Porte COMPLETO de `ccnmt: packages/provider/src/oauthConstants.ts` — todas
 * sus exportaciones (constantes de scope, `MCP_CLIENT_METADATA_URL`,
 * `fileSuffixForOauthConfig`, `getOauthConfig`), ninguna omitida.
 *
 * Único cruce de paquete: `readEnv`/`isEnvTruthy` de `@thyrox/config/env/utils`
 * (resuelve). Sin más dependencias — igual que en la fuente.
 */

import { isEnvTruthy, readEnv } from '@thyrox/config/env/utils'

type OauthConfigType = 'prod' | 'staging' | 'local'

function getOauthConfigType(): OauthConfigType {
  if (process.env.USER_TYPE === 'ant') {
    if (isEnvTruthy(readEnv('USE_LOCAL_OAUTH'))) return 'local'
    if (isEnvTruthy(readEnv('USE_STAGING_OAUTH'))) return 'staging'
  }
  return 'prod'
}

export function fileSuffixForOauthConfig(): string {
  if (readEnv('CLAUDE_CODE_CUSTOM_OAUTH_URL')) {
    return '-custom-oauth'
  }
  switch (getOauthConfigType()) {
    case 'local':
      return '-local-oauth'
    case 'staging':
      return '-staging-oauth'
    case 'prod':
      return ''
  }
}

export const CLAUDE_AI_INFERENCE_SCOPE = 'user:inference' as const
export const CLAUDE_AI_PROFILE_SCOPE = 'user:profile' as const
const CONSOLE_SCOPE = 'org:create_api_key' as const
export const OAUTH_BETA_HEADER = 'oauth-2025-04-20' as const

/** TTL del token OAuth de larga duración (1 año). */
export const LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60

export const CONSOLE_OAUTH_SCOPES = [CONSOLE_SCOPE, CLAUDE_AI_PROFILE_SCOPE] as const

export const CLAUDE_AI_OAUTH_SCOPES = [
  CLAUDE_AI_PROFILE_SCOPE,
  CLAUDE_AI_INFERENCE_SCOPE,
  'user:sessions:claude_code',
  'user:mcp_servers',
  'user:file_upload',
] as const

// Unión de todos los scopes usados por el CLI — al iniciar sesión se piden
// todos para manejar tanto el redirect Console → Claude.ai como el directo.
export const ALL_OAUTH_SCOPES = Array.from(
  new Set([...CONSOLE_OAUTH_SCOPES, ...CLAUDE_AI_OAUTH_SCOPES]),
)

type OauthConfig = {
  BASE_API_URL: string
  CONSOLE_AUTHORIZE_URL: string
  CLAUDE_AI_AUTHORIZE_URL: string
  CLAUDE_AI_ORIGIN: string
  TOKEN_URL: string
  API_KEY_URL: string
  ROLES_URL: string
  CONSOLE_SUCCESS_URL: string
  CLAUDEAI_SUCCESS_URL: string
  MANUAL_REDIRECT_URL: string
  CLIENT_ID: string
  OAUTH_FILE_SUFFIX: string
  MCP_PROXY_URL: string
  MCP_PROXY_PATH: string
}

const PROD_OAUTH_CONFIG = {
  BASE_API_URL: 'https://api.anthropic.com',
  CONSOLE_AUTHORIZE_URL: 'https://platform.claude.com/oauth/authorize',
  CLAUDE_AI_AUTHORIZE_URL: 'https://claude.com/cai/oauth/authorize',
  CLAUDE_AI_ORIGIN: 'https://claude.ai',
  TOKEN_URL: 'https://platform.claude.com/v1/oauth/token',
  API_KEY_URL: 'https://api.anthropic.com/api/oauth/claude_cli/create_api_key',
  ROLES_URL: 'https://api.anthropic.com/api/oauth/claude_cli/roles',
  CONSOLE_SUCCESS_URL:
    'https://platform.claude.com/buy_credits?returnUrl=/oauth/code/success%3Fapp%3Dclaude-code',
  CLAUDEAI_SUCCESS_URL:
    'https://platform.claude.com/oauth/code/success?app=claude-code-how-works-how-works',
  MANUAL_REDIRECT_URL: 'https://platform.claude.com/oauth/code/callback',
  CLIENT_ID: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
  OAUTH_FILE_SUFFIX: '',
  MCP_PROXY_URL: 'https://mcp-proxy.anthropic.com',
  MCP_PROXY_PATH: '/v1/mcp/{server_id}',
} as const

export const MCP_CLIENT_METADATA_URL =
  'https://claude.ai/oauth/claude-code-how-works-how-works-client-metadata'

const STAGING_OAUTH_CONFIG =
  process.env.USER_TYPE === 'ant'
    ? ({
        BASE_API_URL: 'https://api-staging.anthropic.com',
        CONSOLE_AUTHORIZE_URL: 'https://platform.staging.ant.dev/oauth/authorize',
        CLAUDE_AI_AUTHORIZE_URL: 'https://claude-ai.staging.ant.dev/oauth/authorize',
        CLAUDE_AI_ORIGIN: 'https://claude-ai.staging.ant.dev',
        TOKEN_URL: 'https://platform.staging.ant.dev/v1/oauth/token',
        API_KEY_URL: 'https://api-staging.anthropic.com/api/oauth/claude_cli/create_api_key',
        ROLES_URL: 'https://api-staging.anthropic.com/api/oauth/claude_cli/roles',
        CONSOLE_SUCCESS_URL:
          'https://platform.staging.ant.dev/buy_credits?returnUrl=/oauth/code/success%3Fapp%3Dclaude-code',
        CLAUDEAI_SUCCESS_URL:
          'https://platform.staging.ant.dev/oauth/code/success?app=claude-code-how-works-how-works',
        MANUAL_REDIRECT_URL: 'https://platform.staging.ant.dev/oauth/code/callback',
        CLIENT_ID: '22422756-60c9-4084-8eb7-27705fd5cf9a',
        OAUTH_FILE_SUFFIX: '-staging-oauth',
        MCP_PROXY_URL: 'https://mcp-proxy-staging.anthropic.com',
        MCP_PROXY_PATH: '/v1/mcp/{server_id}',
      } as const)
    : undefined

// Tres servidores de desarrollo local: :8000 api-proxy, :4000 frontend
// claude-ai, :3000 frontend Console. Variables de entorno permiten override.
function getLocalOauthConfig(): OauthConfig {
  const api = readEnv('CLAUDE_LOCAL_OAUTH_API_BASE')?.replace(/\/$/, '') ?? 'http://localhost:8000'
  const apps =
    readEnv('CLAUDE_LOCAL_OAUTH_APPS_BASE')?.replace(/\/$/, '') ?? 'http://localhost:4000'
  const consoleBase =
    readEnv('CLAUDE_LOCAL_OAUTH_CONSOLE_BASE')?.replace(/\/$/, '') ?? 'http://localhost:3000'
  return {
    BASE_API_URL: api,
    CONSOLE_AUTHORIZE_URL: `${consoleBase}/oauth/authorize`,
    CLAUDE_AI_AUTHORIZE_URL: `${apps}/oauth/authorize`,
    CLAUDE_AI_ORIGIN: apps,
    TOKEN_URL: `${api}/v1/oauth/token`,
    API_KEY_URL: `${api}/api/oauth/claude_cli/create_api_key`,
    ROLES_URL: `${api}/api/oauth/claude_cli/roles`,
    CONSOLE_SUCCESS_URL: `${consoleBase}/buy_credits?returnUrl=/oauth/code/success%3Fapp%3Dclaude-code`,
    CLAUDEAI_SUCCESS_URL: `${consoleBase}/oauth/code/success?app=claude-code-how-works-how-works`,
    MANUAL_REDIRECT_URL: `${consoleBase}/oauth/code/callback`,
    CLIENT_ID: '22422756-60c9-4084-8eb7-27705fd5cf9a',
    OAUTH_FILE_SUFFIX: '-local-oauth',
    MCP_PROXY_URL: 'http://localhost:8205',
    MCP_PROXY_PATH: '/v1/toolbox/shttp/mcp/{server_id}',
  }
}

// Sólo despliegues FedStart/PubSec pueden usar CLAUDE_CODE_CUSTOM_OAUTH_URL —
// evita que un token OAuth se envíe a un endpoint arbitrario.
const ALLOWED_OAUTH_BASE_URLS = [
  'https://beacon.claude-ai.staging.ant.dev',
  'https://claude.fedstart.com',
  'https://claude-staging.fedstart.com',
]

export function getOauthConfig(): OauthConfig {
  let config: OauthConfig = (() => {
    switch (getOauthConfigType()) {
      case 'local':
        return getLocalOauthConfig()
      case 'staging':
        return STAGING_OAUTH_CONFIG ?? PROD_OAUTH_CONFIG
      case 'prod':
        return PROD_OAUTH_CONFIG
    }
  })()

  const oauthBaseUrl = readEnv('CLAUDE_CODE_CUSTOM_OAUTH_URL')
  if (oauthBaseUrl) {
    const base = oauthBaseUrl.replace(/\/$/, '')
    if (!ALLOWED_OAUTH_BASE_URLS.includes(base)) {
      throw new Error('CLAUDE_CODE_CUSTOM_OAUTH_URL is not an approved endpoint.')
    }
    config = {
      ...config,
      BASE_API_URL: base,
      CONSOLE_AUTHORIZE_URL: `${base}/oauth/authorize`,
      CLAUDE_AI_AUTHORIZE_URL: `${base}/oauth/authorize`,
      CLAUDE_AI_ORIGIN: base,
      TOKEN_URL: `${base}/v1/oauth/token`,
      API_KEY_URL: `${base}/api/oauth/claude_cli/create_api_key`,
      ROLES_URL: `${base}/api/oauth/claude_cli/roles`,
      CONSOLE_SUCCESS_URL: `${base}/oauth/code/success?app=claude-code-how-works-how-works`,
      CLAUDEAI_SUCCESS_URL: `${base}/oauth/code/success?app=claude-code-how-works-how-works`,
      MANUAL_REDIRECT_URL: `${base}/oauth/code/callback`,
      OAUTH_FILE_SUFFIX: '-custom-oauth',
    }
  }

  const clientIdOverride = readEnv('CLAUDE_CODE_OAUTH_CLIENT_ID')
  if (clientIdOverride) {
    config = { ...config, CLIENT_ID: clientIdOverride }
  }

  return config
}
