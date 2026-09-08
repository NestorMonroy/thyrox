/**
 * El cliente HTTP de Gemini — porte de
 * `ccnmt: packages/provider/src/gemini/client.ts` (119 lineas, 1 export).
 *
 * El puerto es COMPLETO: `streamGeminiGenerateContent` y sus dos funciones
 * privadas, mas las dos constantes de modulo. Ninguna queda fuera.
 *
 * DIFERENCIA DE FONDO con el cliente de OpenAI: aqui NO hay SDK. Gemini se
 * habla con `fetch` a pelo, con la clave en la cabecera `x-goog-api-key`, y el
 * stream se decodifica con el analizador de tramas de este mismo directorio.
 * Por eso este archivo tiene el bucle de lectura que aquel no necesita.
 */
import { readEnv } from '@thyrox/config/env/utils'
import { parseSSEFrames } from './sseParser.js'
import { getProviderNetworkLayer } from '../network.js'
import { errorMessage } from '../runtimeHelpers.js'
import { StreamError, UpstreamError } from '../errors.js'
import { resolveConnectionForModel } from '../providers.js'
import type { GeminiGenerateContentRequest, GeminiStreamChunk } from './types.js'

const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

const STREAM_DECODE_OPTS: TextDecodeOptions = { stream: true }

/**
 * Resolucion por modelo: gana el endpoint y la clave de la conexion Gemini que
 * coincida; sin conexion se cae a las variables de entorno, que es el modo
 * heredado de proveedor unico.
 *
 * La URL base se normaliza quitando las barras finales, porque se concatena
 * con la ruta del modelo.
 */
function getGeminiAuth(model: string): { baseUrl: string; apiKey: string } {
  const conn = resolveConnectionForModel(model)
  const usingConn = conn?.protocol === 'gemini' && conn.auth.type === 'api_key'
  return {
    baseUrl: (
      usingConn ? conn.endpoint : readEnv('GEMINI_BASE_URL') || DEFAULT_GEMINI_BASE_URL
    ).replace(/\/+$/, ''),
    apiKey: usingConn
      ? conn.auth.type === 'api_key'
        ? conn.auth.key
        : ''
      : readEnv('GEMINI_API_KEY') || '',
  }
}

/**
 * La ruta del modelo en la URL, que Gemini exige con el prefijo `models/`.
 * Se anade solo si no venia, y se quitan las barras iniciales para no producir
 * una doble barra al concatenar.
 */
function getGeminiModelPath(model: string): string {
  const normalized = model.replace(/^\/+/, '')
  return normalized.startsWith('models/') ? normalized : `models/${normalized}`
}

/**
 * Llama a `streamGenerateContent` y devuelve los chunks de Gemini uno a uno.
 *
 * El modelo que llega YA viene sin el prefijo de conexion: su unico llamador
 * le pasa el resultado de `resolveGeminiModel`, que lo desempaqueta al
 * principio. Si eso dejara de ser cierto, la URL llevaria el prefijo y Gemini
 * responderia 404.
 *
 * El buffer se vacia DOS veces: dentro del bucle conforme llegan los trozos, y
 * una vez mas al terminar con `decoder.decode()` sin argumentos, que descarga
 * lo que el decodificador tuviera pendiente. Sin esa segunda pasada, la ultima
 * trama de un stream que no termine en frontera se perderia.
 */
export async function* streamGeminiGenerateContent(params: {
  model: string
  body: GeminiGenerateContentRequest
  signal: AbortSignal
  fetchOverride?: typeof fetch
}): AsyncGenerator<GeminiStreamChunk, void> {
  const networkLayer = getProviderNetworkLayer()
  const fetchImpl = params.fetchOverride ?? fetch
  const { baseUrl, apiKey } = getGeminiAuth(params.model)
  const url = `${baseUrl}/${getGeminiModelPath(params.model)}:streamGenerateContent?alt=sse`

  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(params.body),
    signal: params.signal,
    ...networkLayer.getProxyFetchOptions({ forAnthropicAPI: false }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new UpstreamError(
      `Gemini API request failed (${response.status} ${response.statusText}): ${body || 'empty response body'}`,
    )
  }

  if (!response.body) {
    throw new StreamError('Gemini API returned no response body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, STREAM_DECODE_OPTS)
      const { frames, remaining } = parseSSEFrames(buffer)
      buffer = remaining

      for (const frame of frames) {
        if (!frame.data || frame.data === '[DONE]') continue
        try {
          yield JSON.parse(frame.data) as GeminiStreamChunk
        } catch (error) {
          throw new StreamError(
            `Failed to parse Gemini SSE payload: ${errorMessage(error)}`,
          )
        }
      }
    }

    buffer += decoder.decode()
    const { frames } = parseSSEFrames(buffer)
    for (const frame of frames) {
      if (!frame.data || frame.data === '[DONE]') continue
      try {
        yield JSON.parse(frame.data) as GeminiStreamChunk
      } catch (error) {
        throw new StreamError(
          `Failed to parse trailing Gemini SSE payload: ${errorMessage(error)}`,
        )
      }
    }
  } finally {
    // Se suelta siempre, tambien si el consumidor abandona el generador.
    reader.releaseLock()
  }
}
