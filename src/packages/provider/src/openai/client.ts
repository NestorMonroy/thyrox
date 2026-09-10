/**
 * Envoltura del SDK de OpenAI — porte de
 * `ccnmt: packages/provider/src/openai/client.ts` (81 lineas, 2 exports).
 *
 * El puerto es COMPLETO: `getOpenAIClient` y `clearOpenAIClientCache`, las dos
 * exportaciones de la fuente, mas su cache de modulo. Ninguna queda fuera.
 *
 * Los casts `as any` sobre `fetchOptions` y `fetch` son un rodeo del sistema
 * de tipos POR DISENO, y viajan del original: las opciones del SDK admiten en
 * ejecucion tanto la interfaz de fetch de Node como la de la web, pero sus
 * tipos publicados fijan una sola variante. Es compatibilidad de version del
 * SDK, no descuido.
 *
 * El paquete `openai` NO estaba en el arbol al empezar este porte; se declaro
 * como dependencia de este paquete (`^6.33.0`, el mismo rango que la fuente
 * declara en su raiz) en vez de reimplementar el cliente HTTP. Portar el
 * modulo sin su SDK habria sido portar otra cosa.
 */
import OpenAI from 'openai'
import { readEnv } from '@thyrox/config/env/utils'
import { getProviderNetworkLayer } from '../network.js'
import { resolveConnectionForModel } from '../providers.js'

/**
 * El registro de conexiones es la fuente de verdad del endpoint y la clave.
 * Cuando una conexion coincide con el modelo pedido, SU endpoint y SU clave
 * ganan sobre las variables de entorno — asi es como conviven varios
 * proveedores compatibles con OpenAI (Ollama, DeepSeek y vLLM, cada uno con su
 * conexion).
 *
 * El respaldo por entorno es el modo heredado de proveedor unico:
 *
 * - `OPENAI_API_KEY`    obligatoria; la clave.
 * - `OPENAI_BASE_URL`   recomendada; la URL base.
 * - `OPENAI_ORG_ID`     opcional.
 * - `OPENAI_PROJECT_ID` opcional.
 */

// Cache por id de conexion —o por la clave del respaldo por entorno— para que
// varias conexiones no se pisen un unico cliente compartido. Cambiar de modelo
// dispara una resolucion nueva; el cliente viejo se recolecta si nadie lo
// referencia.
const clientCache = new Map<string, OpenAI>()

export function getOpenAIClient(options?: {
  maxRetries?: number
  fetchOverride?: unknown
  source?: string
  /** Id del modelo — sirve para resolver el endpoint y la clave de su conexion. */
  model?: string
}): OpenAI {
  const networkLayer = getProviderNetworkLayer()

  const conn = options?.model ? resolveConnectionForModel(options.model) : undefined
  const usingConn = conn?.protocol === 'openai' && conn.auth.type === 'api_key'

  const apiKey = usingConn
    ? conn.auth.type === 'api_key'
      ? conn.auth.key
      : ''
    : readEnv('OPENAI_API_KEY') || ''
  const baseURL = usingConn ? conn.endpoint : readEnv('OPENAI_BASE_URL')

  // Clave de cache: `conn:<id>` para los clientes por conexion, `env` para el
  // respaldo. `fetchOverride` desactiva la cache — es la costura de prueba.
  const cacheKey = usingConn && conn ? `conn:${conn.id}` : 'env'
  if (!options?.fetchOverride) {
    const cached = clientCache.get(cacheKey)
    if (cached) return cached
  }

  const client = new OpenAI({
    apiKey,
    ...(baseURL && { baseURL }),
    maxRetries: options?.maxRetries ?? 0,
    timeout: parseInt(readEnv('API_TIMEOUT_MS') || String(600 * 1000), 10),
    dangerouslyAllowBrowser: true,
    ...(readEnv('OPENAI_ORG_ID') && { organization: readEnv('OPENAI_ORG_ID') }),
    ...(readEnv('OPENAI_PROJECT_ID') && { project: readEnv('OPENAI_PROJECT_ID') }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchOptions: networkLayer.getProxyFetchOptions({ forAnthropicAPI: false }) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options?.fetchOverride && { fetch: options.fetchOverride as any }),
  })

  if (!options?.fetchOverride) {
    clientCache.set(cacheKey, client)
  }

  return client
}

/** Vacia los clientes cacheados; util cuando las conexiones cambian en caliente. */
export function clearOpenAIClientCache(): void {
  clientCache.clear()
}
