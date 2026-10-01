/**
 * El cliente del SDK de cada upstream de nube, construido desde su
 * configuración — porte de las ramas `bedrock`, `vertex` y `foundry` de `Fv`
 * en la pasarela del ejecutable 2.1.283 (extracto en
 * `.claude/workbench/cloud-sdk-forward-20260927T235948/outputs/gateway-sdk-upstreams.js`).
 *
 * Cada upstream lleva su región, su proyecto o su recurso y una de las formas
 * de credencial que su proveedor admite; lo que no declara lo resuelve la
 * cadena del entorno (AWS, Google, Azure). El cliente se construye sin
 * reintentos —la resiliencia es del proxy— y con el plazo de una hora de la
 * referencia.
 *
 * Las cabeceras siguen `Lh`/`Yme`: las del upstream, luego las del proceso
 * (`processHeaders`, que el cableado decide de dónde salen), y se anulan
 * `Authorization` y `X-Api-Key` para que ninguna credencial de Anthropic
 * viaje a la nube, salvo la `X-Api-Key` que el proceso declare.
 *
 * Divergencias declaradas:
 * - El portador de Bedrock (`aws_bearer_token`): la referencia lo pasa como
 *   `apiKey`, que el `@anthropic-ai/bedrock-sdk` 0.26.4 instalado no admite y
 *   deja caer a la cadena de AWS. Aquí va con `skipAuth` y la cabecera
 *   `Authorization: Bearer`, que es la petición medida que produce la
 *   referencia (`outputs/sdk-requests.jsonl`).
 * - `assume_role` de Bedrock, el `CountTokens` por `BedrockRuntimeClient`, la
 *   caché de la cadena de AWS con su invalidación (`IH`/`pCe`) y los
 *   proveedores `mantle`, `anthropicAws` y `anthropicGoogleCloud` no se
 *   portan. pendiente: se portan cuando haya un upstream que los use; sin
 *   ellos, un 401 no invalida credenciales y Bedrock responde 501 a
 *   `count_tokens`.
 * - `cA`, la opción interna que apaga la resolución de credenciales de
 *   Anthropic dentro del SDK, no existe en los SDK instalados; su efecto lo
 *   dan las cabeceras anuladas.
 * - `FH` filtra las cabeceras del proceso bajo HIPAA; aquí las cabeceras del
 *   proceso llegan ya decididas por quien las pasa.
 */
import type { SdkMessagesClient, SdkProvider } from './sdkForward.ts'

/** `qs`: el plazo de una petición a un upstream de nube. */
const CLOUD_TIMEOUT_MS = 3_600_000
const GOOGLE_CLOUD_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'
const AZURE_COGNITIVE_SCOPE = 'https://cognitiveservices.azure.com/.default'

type Headers = Record<string, string>
type NullableHeaders = Record<string, string | null>

export type BedrockUpstreamConfig = {
  name: string
  provider: 'bedrock'
  region: string
  base_url?: string
  headers?: Headers
  guardrail?: { id: string; version: string }
  auth: { aws_access_key_id?: string; aws_secret_access_key?: string; aws_session_token?: string; aws_bearer_token?: string }
}
export type VertexUpstreamConfig = {
  name: string
  provider: 'vertex'
  region: string
  project_id: string
  base_url?: string
  headers?: Headers
  auth: { access_token?: string; service_account_json?: string }
}
export type FoundryUpstreamConfig = {
  name: string
  provider: 'foundry'
  resource?: string
  base_url?: string
  headers?: Headers
  auth: { api_key?: string }
}
export type CloudUpstreamConfig = BedrockUpstreamConfig | VertexUpstreamConfig | FoundryUpstreamConfig

export type CloudUpstream = { kind: 'sdk'; name: string; provider: SdkProvider; client: SdkMessagesClient; guardrail?: true }

export type CloudClientOptions = {
  fetch?: typeof fetch
  /** Las cabeceras propias del proceso, que el cableado decide. */
  processHeaders?: Headers
}

function declaresApiKey(headers: Headers): boolean {
  return Object.keys(headers).some(name => name.toLowerCase() === 'x-api-key')
}

/** `Yme`: las cabeceras del proceso, sin credenciales de Anthropic. */
function withoutAnthropicCredentials(processHeaders: Headers): NullableHeaders {
  return { ...processHeaders, Authorization: null, ...(!declaresApiKey(processHeaders) && { 'X-Api-Key': null }) }
}

function commonOptions(options: CloudClientOptions) {
  return { timeout: CLOUD_TIMEOUT_MS, maxRetries: 0, ...(options.fetch && { fetch: options.fetch }) }
}

async function bedrockUpstream(config: BedrockUpstreamConfig, options: CloudClientOptions): Promise<CloudUpstream> {
  const { AnthropicBedrock } = await import('@anthropic-ai/bedrock-sdk')
  const { auth } = config
  if (!auth.aws_access_key_id !== !auth.aws_secret_access_key || (auth.aws_session_token && !auth.aws_access_key_id)) {
    throw new Error('bedrock upstream: aws_access_key_id and aws_secret_access_key must be set together (and are required with aws_session_token)')
  }
  const processHeaders = options.processHeaders ?? {}
  const guardrail = config.guardrail && {
    'X-Amzn-Bedrock-GuardrailIdentifier': config.guardrail.id,
    'X-Amzn-Bedrock-GuardrailVersion': config.guardrail.version,
  }
  const base = { awsRegion: config.region, ...(config.base_url && { baseURL: config.base_url }), ...commonOptions(options) }
  const apiKeyNull = !declaresApiKey(processHeaders) && { 'X-Api-Key': null }
  const signedHeaders = { ...config.headers, ...processHeaders, Authorization: null, ...apiKeyNull, ...guardrail }
  const client = auth.aws_bearer_token
    ? new AnthropicBedrock({
      ...base,
      skipAuth: true,
      defaultHeaders: { ...config.headers, ...processHeaders, Authorization: `Bearer ${auth.aws_bearer_token}`, ...apiKeyNull, ...guardrail },
    })
    : auth.aws_access_key_id && auth.aws_secret_access_key
      ? new AnthropicBedrock({
        ...base,
        defaultHeaders: signedHeaders,
        awsAccessKey: auth.aws_access_key_id,
        awsSecretKey: auth.aws_secret_access_key,
        awsSessionToken: auth.aws_session_token,
      })
      // Sin claves ni portador firma con la cadena de AWS del entorno.
      : new AnthropicBedrock({ ...base, defaultHeaders: signedHeaders })
  return { kind: 'sdk', name: config.name, provider: 'bedrock', client: client as unknown as SdkMessagesClient, ...(config.guardrail && { guardrail: true as const }) }
}

async function vertexUpstream(config: VertexUpstreamConfig, options: CloudClientOptions): Promise<CloudUpstream> {
  const { AnthropicVertex } = await import('@anthropic-ai/vertex-sdk')
  const token = config.auth.access_token
  const credential = token
    ? { authClient: { projectId: config.project_id, getRequestHeaders: async () => ({ Authorization: `Bearer ${token}` }) } }
    : {
      googleAuth: new (await import('google-auth-library')).GoogleAuth({
        scopes: [GOOGLE_CLOUD_SCOPE],
        projectId: config.project_id,
        ...(config.auth.service_account_json && { keyFilename: config.auth.service_account_json }),
      }),
    }
  const client = new AnthropicVertex({
    region: config.region,
    projectId: config.project_id,
    ...(config.base_url && { baseURL: config.base_url }),
    defaultHeaders: { ...config.headers, ...withoutAnthropicCredentials(options.processHeaders ?? {}) },
    ...commonOptions(options),
    ...(credential as object),
  })
  return { kind: 'sdk', name: config.name, provider: 'vertex', client: settleAuthClient(client) as unknown as SdkMessagesClient }
}

/**
 * `Kme`: el SDK de Vertex arranca la resolución de credenciales al
 * construirse; si falla antes de la primera petición, ese rechazo quedaría
 * sin atender y tumbaría el proceso. La primera petición vuelve a verlo.
 */
function settleAuthClient<T>(client: T): T {
  const pending = (client as { _authClientPromise?: Promise<unknown> })._authClientPromise
  if (pending && typeof pending.catch === 'function') pending.catch(() => {})
  return client
}

async function foundryUpstream(config: FoundryUpstreamConfig, options: CloudClientOptions): Promise<CloudUpstream> {
  const { AnthropicFoundry } = await import('@anthropic-ai/foundry-sdk')
  const processHeaders = options.processHeaders ?? {}
  const withKey = config.auth.api_key !== undefined
  const location = config.base_url ? { baseURL: config.base_url } : { resource: config.resource }
  const defaultHeaders = withKey ? { ...config.headers, ...processHeaders, Authorization: null } : { ...config.headers, ...processHeaders }
  let credential: { apiKey: string } | { azureADTokenProvider: () => Promise<string> }
  if (withKey) {
    credential = { apiKey: config.auth.api_key! }
  } else {
    const { DefaultAzureCredential } = await import('@azure/identity')
    const azure = new DefaultAzureCredential()
    credential = {
      azureADTokenProvider: async () => {
        const token = await azure.getToken(AZURE_COGNITIVE_SCOPE)
        if (!token) throw new Error('Azure AD token unavailable')
        return token.token
      },
    }
  }
  const client = new AnthropicFoundry({ ...location, defaultHeaders, ...commonOptions(options), ...credential })
  return { kind: 'sdk', name: config.name, provider: 'foundry', client: client as unknown as SdkMessagesClient }
}

/** Las ramas de nube de `Fv`: el cliente del SDK de un upstream. */
export async function createCloudUpstream(config: CloudUpstreamConfig, options: CloudClientOptions = {}): Promise<CloudUpstream> {
  switch (config.provider) {
    case 'bedrock': return bedrockUpstream(config, options)
    case 'vertex': return vertexUpstream(config, options)
    case 'foundry': return foundryUpstream(config, options)
  }
}
