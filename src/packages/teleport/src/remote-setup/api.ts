/**
 * Puerto de `ccnmt: packages/teleport/src/remote-setup/api.ts` (182
 * líneas fuente, 100% portado). Cliente del flujo de onboarding web:
 * importar un token de GitHub, crear el entorno por defecto y resolver
 * si el usuario ya inicio sesion.
 */

import axios from 'axios'
import { getOauthConfig } from '@thyrox/provider/oauthConstants'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { getOAuthHeaders, prepareApiRequest } from '../api.js'
import { fetchEnvironments } from '../environments.js'

const CCR_BYOC_BETA_HEADER = 'ccr-byoc-2025-07-29'

/**
 * Envuelve un token crudo de GitHub para que su representacion en string
 * quede redactada. `String(token)`, template literals,
 * `JSON.stringify(token)`, y cualquier mensaje de error adjunto mostraran
 * `[REDACTED:gh-token]` en vez del valor del token. Llamar `.reveal()`
 * solo en el unico punto donde el valor crudo se coloca en un cuerpo HTTP.
 */
export class RedactedGithubToken {
  readonly #value: string
  constructor(raw: string) {
    this.#value = raw
  }
  reveal(): string {
    return this.#value
  }
  toString(): string {
    return '[REDACTED:gh-token]'
  }
  toJSON(): string {
    return '[REDACTED:gh-token]'
  }
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return '[REDACTED:gh-token]'
  }
}

export type ImportTokenResult = {
  github_username: string
}

export type ImportTokenError =
  | { kind: 'not_signed_in' }
  | { kind: 'invalid_token' }
  | { kind: 'server'; status: number }
  | { kind: 'network' }

/**
 * Hace POST de un token de GitHub al backend de CCR, que lo valida
 * contra el endpoint /user de GitHub y lo guarda cifrado con Fernet en
 * sync_user_tokens. El token guardado satisface las mismas rutas de
 * lectura que un token OAuth, asi que clone/push en claude.ai/code
 * funciona de inmediato tras esto.
 */
export async function importGithubToken(
  token: RedactedGithubToken,
): Promise<
  | { ok: true; result: ImportTokenResult }
  | { ok: false; error: ImportTokenError }
> {
  let accessToken: string, orgUUID: string
  try {
    ;({ accessToken, orgUUID } = await prepareApiRequest())
  } catch {
    return { ok: false, error: { kind: 'not_signed_in' } }
  }

  const url = `${getOauthConfig().BASE_API_URL}/v1/code/github/import-token`
  const headers = {
    ...getOAuthHeaders(accessToken),
    'anthropic-beta': CCR_BYOC_BETA_HEADER,
    'x-organization-uuid': orgUUID,
  }

  try {
    const response = await axios.post<ImportTokenResult>(
      url,
      { token: token.reveal() },
      { headers, timeout: 15000, validateStatus: () => true },
    )
    if (response.status === 200) {
      return { ok: true, result: response.data }
    }
    if (response.status === 400) {
      return { ok: false, error: { kind: 'invalid_token' } }
    }
    if (response.status === 401) {
      return { ok: false, error: { kind: 'not_signed_in' } }
    }
    logForDebugging(`import-token returned ${response.status}`, {
      level: 'error',
    })
    return { ok: false, error: { kind: 'server', status: response.status } }
  } catch (err) {
    if (axios.isAxiosError(err)) {
      // err.config.data contendria el cuerpo del POST con el token
      // crudo. No lo incluyas en ningun log. El codigo de error solo ya
      // es suficiente.
      logForDebugging(`import-token network error: ${err.code ?? 'unknown'}`, {
        level: 'error',
      })
    }
    return { ok: false, error: { kind: 'network' } }
  }
}

async function hasExistingEnvironment(): Promise<boolean> {
  try {
    const envs = await fetchEnvironments()
    return envs.length > 0
  } catch {
    return false
  }
}

/**
 * Creacion best-effort del entorno por defecto. Espeja el
 * DEFAULT_CLOUD_ENVIRONMENT_REQUEST del onboarding web para que un
 * usuario primerizo llegue al composer en vez de a env-setup. Primero
 * chequea si ya hay entornos, para que re-correr /web-setup no acumule
 * duplicados. Los fallos son no-fatales — el import del token ya tuvo
 * exito, y la maquina de estados web cae a env-setup en la siguiente carga.
 */
export async function createDefaultEnvironment(): Promise<boolean> {
  let accessToken: string, orgUUID: string
  try {
    ;({ accessToken, orgUUID } = await prepareApiRequest())
  } catch {
    return false
  }

  if (await hasExistingEnvironment()) {
    return true
  }

  // La ruta /private/organizations/{org}/ rechaza tokens OAuth de CLI
  // (dependencia de auth equivocada). La ruta publica usa
  // build_flexible_auth — la misma que usa fetchEnvironments(). La org
  // se pasa via la cabecera x-organization-uuid.
  const url = `${getOauthConfig().BASE_API_URL}/v1/environment_providers/cloud/create`
  const headers = {
    ...getOAuthHeaders(accessToken),
    'x-organization-uuid': orgUUID,
  }

  try {
    const response = await axios.post(
      url,
      {
        name: 'Default',
        kind: 'anthropic_cloud',
        description: 'Default - trusted network access',
        config: {
          environment_type: 'anthropic',
          cwd: '/home/user',
          init_script: null,
          environment: {},
          languages: [
            { name: 'python', version: '3.11' },
            { name: 'node', version: '20' },
          ],
          network_config: {
            allowed_hosts: [],
            allow_default_hosts: true,
          },
        },
      },
      { headers, timeout: 15000, validateStatus: () => true },
    )
    return response.status >= 200 && response.status < 300
  } catch {
    return false
  }
}

/** Devuelve true cuando el usuario tiene credenciales OAuth de Claude validas. */
export async function isSignedIn(): Promise<boolean> {
  try {
    await prepareApiRequest()
    return true
  } catch {
    return false
  }
}

export function getCodeWebUrl(): string {
  return `${getOauthConfig().CLAUDE_AI_ORIGIN}/code`
}
