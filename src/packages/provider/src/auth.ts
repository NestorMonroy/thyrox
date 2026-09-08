/**
 * Proveedores de credenciales, uno por familia de API.
 *
 * Reimplementación del contrato de `ccnmt: packages/provider/src/auth.ts`
 * (109 líneas). Bajo UNLICENSED se porta el patrón, no el archivo
 * (`porte-completo-no-parcial.md`).
 *
 * Los tres símbolos que la fuente exporta —`anthropicAuthProvider`,
 * `openAIAuthProvider`, `geminiAuthProvider`— más `getAnthropicAuthProvider`.
 * Ninguno omitido. `adapters.ts` los compone: cada adaptador lleva el suyo.
 *
 * Codex NO tiene proveedor aquí, y coincidimos con la fuente en la razón, que
 * ella deja escrita: sus peticiones viajan por el camino de Anthropic con un
 * `fetch` sobrescrito, y la autenticación se resuelve dentro de ese `fetch`.
 * Añadirle una entrada aquí invitaría a cablear otra vez una rama paralela al
 * nivel del stream, que es justo lo que su reescritura quitó.
 */
import { getProviderHostBindings } from './host.ts'
import { readEnv } from '@thyrox/config/env/utils'
import type {
  AnthropicCredentials,
  AuthProvider,
  ProviderAuthContext,
  ProviderAvailability,
} from './types.ts'

/**
 * El encabezado `Bearer`, con el token del entorno por delante del ayudante.
 *
 * El orden importa: `ANTHROPIC_AUTH_TOKEN` es la vía por la que un host
 * inyecta credenciales sin que el usuario las teclee, así que gana sobre el
 * ayudante configurado.
 */
async function getAnthropicAuthorizationHeader(
  context?: ProviderAuthContext,
): Promise<string | null> {
  const { auth } = getProviderHostBindings()
  const token =
    readEnv('ANTHROPIC_AUTH_TOKEN') ||
    (await auth.getApiKeyFromApiKeyHelper(
      context?.isNonInteractiveSession ?? false,
    ))
  return token ? `Bearer ${token}` : null
}

export const anthropicAuthProvider: AuthProvider<AnthropicCredentials> = {
  id: 'anthropic',

  async refresh(): Promise<void> {
    await getProviderHostBindings().auth.checkAndRefreshOAuthTokenIfNeeded()
  },

  /**
   * EXCLUSIÓN MUTUA, y es el invariante crítico: un suscriptor recibe
   * `apiKey: null` y su token de OAuth; un no suscriptor, al revés. Firmar
   * con los dos a la vez confunde la tubería de autenticación del servidor.
   *
   * Se refresca ANTES de leer: si el token venció, leerlo primero daría el
   * viejo y la petición saldría con una credencial muerta.
   */
  async getCredentials(
    context?: ProviderAuthContext,
  ): Promise<AnthropicCredentials> {
    const { auth } = getProviderHostBindings()
    await auth.checkAndRefreshOAuthTokenIfNeeded()

    const subscriber = auth.isClaudeAISubscriber()
    const apiKey = subscriber
      ? null
      : context?.apiKeyOverride || auth.getAnthropicApiKey() || null
    const authToken = subscriber
      ? auth.getClaudeAIOAuthTokens()?.accessToken ?? null
      : null

    return {
      subscriber,
      apiKey,
      authToken,
      authorizationHeader: subscriber
        ? null
        : await getAnthropicAuthorizationHeader(context),
      // Bandera de construcción interna: apunta el OAuth a staging. Exige las
      // DOS condiciones — el tipo de usuario y la bandera— para que un
      // entorno con la variable suelta no desvíe una sesión real.
      ...(process.env.USER_TYPE === 'ant' &&
      auth.isEnvTruthy(readEnv('USE_STAGING_OAUTH'))
        ? { baseURL: auth.getOauthConfig().BASE_API_URL }
        : {}),
    }
  },

  async isAvailable(
    context?: ProviderAuthContext,
  ): Promise<ProviderAvailability> {
    const creds = await this.getCredentials(context)
    if (creds.subscriber || creds.apiKey || creds.authToken) {
      return { available: true }
    }
    // La razón nombra las DOS vías a propósito: es lo que el usuario lee al
    // preguntarse por qué no está autenticado, y con una sola no sabría cuál
    // le falta.
    return {
      available: false,
      reason: 'No Anthropic API key or Claude.ai OAuth token is configured.',
    }
  },
}

/**
 * La forma común de los proveedores cuya credencial es una variable de
 * entorno: sin refresco —una variable no caduca— y con la razón nombrando la
 * variable concreta, que es lo que hace accionable el fallo.
 */
function createEnvAuthProvider(
  id: string,
  getToken: () => string | undefined,
  reason: string,
): AuthProvider<{ apiKey: string | null }> {
  return {
    id,
    async refresh(): Promise<void> {},
    async getCredentials(): Promise<{ apiKey: string | null }> {
      return { apiKey: getToken() ?? null }
    },
    async isAvailable(): Promise<ProviderAvailability> {
      return getToken() ? { available: true } : { available: false, reason }
    },
  }
}

export const openAIAuthProvider = createEnvAuthProvider(
  'openai',
  () => readEnv('OPENAI_API_KEY'),
  'OPENAI_API_KEY is not configured.',
)

export const geminiAuthProvider = createEnvAuthProvider(
  'gemini',
  () => readEnv('GEMINI_API_KEY'),
  'GEMINI_API_KEY is not configured.',
)

/** Accesor con nombre, para el consumidor que no quiere la constante. */
export function getAnthropicAuthProvider(): AuthProvider<AnthropicCredentials> {
  return anthropicAuthProvider
}
