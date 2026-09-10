/**
 * Cliente de speech-to-text voice_stream de Anthropic para push-to-talk.
 *
 * Solo alcanzable en builds ant (gateado por feature('VOICE_MODE') en
 * el import de useVoice.ts).
 *
 * Se conecta al endpoint WebSocket voice_stream de Anthropic usando las
 * mismas credenciales OAuth que Claude Code. El endpoint usa modelos
 * respaldados por conversation_engine para speech-to-text. Diseñado
 * para hold-to-talk: mantener presionado el keybinding para grabar,
 * soltar para detener y enviar.
 *
 * El protocolo de cable usa mensajes de control JSON (KeepAlive,
 * CloseStream) y frames de audio binarios. El servidor responde con
 * mensajes JSON TranscriptText y TranscriptEndpoint.
 *
 * Puerto de `ccnmt: packages/voice/src/voiceStreamSTT.ts` (553 líneas
 * fuente, 100% portado).
 */

import type { ClientRequest, IncomingMessage } from 'http'
import WebSocket from 'ws'
import { getOauthConfig } from '@thyrox/provider/oauthConstants'
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getClaudeAIOAuthTokens,
  isAnthropicAuthEnabled,
} from '@thyrox/provider/authAlias.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { getUserAgent } from '@thyrox/provider/http.js'
import { logError } from '@thyrox/local-observability/logging'
import { getWebSocketTLSOptions } from '@thyrox/provider/mtls.js'
import { getWebSocketProxyAgent, getWebSocketProxyUrl } from '@thyrox/provider/proxy.js'
import { jsonParse, jsonStringify } from '@thyrox/local-observability/slowOperations.js'

const KEEPALIVE_MSG = '{"type":"KeepAlive"}'
const CLOSE_STREAM_MSG = '{"type":"CloseStream"}'

import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'

// ─── Constantes ──────────────────────────────────────────────────────

const VOICE_STREAM_PATH = '/api/ws/speech_to_text/voice_stream'

const KEEPALIVE_INTERVAL_MS = 8_000

// Timers de resolucion de finalize(). `noData` dispara cuando no llega
// TranscriptText tras el CloseStream — el servidor no tiene nada; no
// esperar el ~3-5s completo de teardown del WS para confirmar
// vaciedad. `safety` es el tope de ultimo recurso si el WS se cuelga.
// Exportado para que los tests puedan acortarlos.
export const FINALIZE_TIMEOUTS_MS = {
  safety: 5_000,
  noData: 1_500,
}

// ─── Tipos ──────────────────────────────────────────────────────────

export type VoiceStreamCallbacks = {
  onTranscript: (text: string, isFinal: boolean) => void
  onError: (error: string, opts?: { fatal?: boolean }) => void
  onClose: () => void
  onReady: (connection: VoiceStreamConnection) => void
}

// Como se resolvio finalize(). `no_data_timeout` significa cero
// mensajes del servidor tras CloseStream — la firma del silent-drop
// (anthropics/anthropic#287008).
export type FinalizeSource =
  | 'post_closestream_endpoint'
  | 'no_data_timeout'
  | 'safety_timeout'
  | 'ws_close'
  | 'ws_already_closed'

export type VoiceStreamConnection = {
  send: (audioChunk: Buffer) => void
  finalize: () => Promise<FinalizeSource>
  close: () => void
  isConnected: () => boolean
}

// El endpoint voice_stream devuelve chunks de transcripcion y marcadores de endpoint.
type VoiceStreamTranscriptText = {
  type: 'TranscriptText'
  data: string
}

type VoiceStreamTranscriptEndpoint = {
  type: 'TranscriptEndpoint'
}

type VoiceStreamTranscriptError = {
  type: 'TranscriptError'
  error_code?: string
  description?: string
}

type VoiceStreamMessage =
  | VoiceStreamTranscriptText
  | VoiceStreamTranscriptEndpoint
  | VoiceStreamTranscriptError
  | { type: 'error'; message?: string }

// ─── Disponibilidad ──────────────────────────────────────────────────

export function isVoiceStreamAvailable(): boolean {
  // voice_stream usa el mismo OAuth que Claude Code — disponible cuando
  // el usuario esta autenticado con Anthropic (suscriptor de Claude.ai
  // o tiene tokens OAuth validos).
  if (!isAnthropicAuthEnabled()) {
    return false
  }
  const tokens = getClaudeAIOAuthTokens()
  return tokens !== null && tokens.accessToken !== null
}

// ─── Conexion ────────────────────────────────────────────────────────

export async function connectVoiceStream(
  callbacks: VoiceStreamCallbacks,
  options?: { language?: string; keyterms?: string[] },
): Promise<VoiceStreamConnection | null> {
  // Asegura que el token OAuth este fresco antes de conectar
  await checkAndRefreshOAuthTokenIfNeeded()

  const tokens = getClaudeAIOAuthTokens()
  if (!tokens?.accessToken) {
    logForDebugging('[voice_stream] No OAuth token available')
    return null
  }

  // voice_stream es una ruta private_api, pero /api/ws/ tambien esta
  // expuesta en el listener de api.anthropic.com (service_definitions.yaml
  // private-api: visibility.external: true). Se apunta a ese host en
  // vez de claude.ai porque la zona CF de claude.ai usa TLS
  // fingerprinting y desafia a clientes no-navegador
  // (anthropics/claude-code-how-works-how-works#34094). Mismo pod
  // private-api, misma auth OAuth Bearer — solo una zona CF que no nos
  // bloquea. El dictado de escritorio sigue usando claude.ai (Swift
  // URLSession tiene un fingerprint JA3 clase-navegador, asi que CF lo
  // deja pasar).
  const wsBaseUrl =
    process.env.VOICE_STREAM_BASE_URL ||
    getOauthConfig()
      .BASE_API_URL.replace('https://', 'wss://')
      .replace('http://', 'ws://')

  if (process.env.VOICE_STREAM_BASE_URL) {
    logForDebugging(
      `[voice_stream] Using VOICE_STREAM_BASE_URL override: ${process.env.VOICE_STREAM_BASE_URL}`,
    )
  }

  const params = new URLSearchParams({
    encoding: 'linear16',
    sample_rate: '16000',
    channels: '1',
    endpointing_ms: '300',
    utterance_end_ms: '1000',
    language: options?.language ?? 'en',
  })

  // Enruta a traves de conversation-engine con Deepgram Nova 3
  // (saltandose el gate de GrowthBook project_bell_v2_config del
  // servidor). El lado servidor es anthropics/anthropic#278327 +
  // #281372; esto permite escalar clientes independientemente.
  const isNova3 = getFeatureValue_CACHED_MAY_BE_STALE(
    'tengu_cobalt_frost',
    false,
  )
  if (isNova3) {
    params.set('use_conversation_engine', 'true')
    params.set('stt_provider', 'deepgram-nova3')
    logForDebugging('[voice_stream] Nova 3 gate enabled (tengu_cobalt_frost)')
  }

  const forwardInterimsTyped =
    process.env.CLAUDE_CODE_VOICE_FORWARD_INTERIMS_TYPED === '1' ||
    process.env.CLAUDE_CODE_VOICE_FORWARD_INTERIMS_TYPED === 'true' ||
    getFeatureValue_CACHED_MAY_BE_STALE('tengu_brick_follow', false)
  if (forwardInterimsTyped) {
    params.set('forward_interims', 'typed')
    logForDebugging('[voice_stream] forward_interims=typed enabled')
  }

  // Agrega los keyterms como query params — el proxy voice_stream los
  // reenvia al servicio STT que aplica el boosting apropiado.
  if (options?.keyterms?.length) {
    for (const term of options.keyterms) {
      params.append('keyterms', term)
    }
  }

  const url = `${wsBaseUrl}${VOICE_STREAM_PATH}?${params.toString()}`

  logForDebugging(`[voice_stream] Connecting to ${url}`)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${tokens.accessToken}`,
    'User-Agent': getUserAgent(),
    'x-app': 'cli',
  }

  const tlsOptions = getWebSocketTLSOptions()
  const wsOptions =
    typeof Bun !== 'undefined'
      ? {
          headers,
          proxy: getWebSocketProxyUrl(url),
          tls: tlsOptions || undefined,
        }
      : { headers, agent: getWebSocketProxyAgent(url), ...tlsOptions }

  const ws = new WebSocket(url, wsOptions)

  let keepaliveTimer: ReturnType<typeof setInterval> | null = null
  let connected = false
  // Se pone en true una vez que CloseStream se envio (o el ws se cerro).
  // Despues de esto, envios de audio adicionales se descartan.
  let finalized = false
  // Se pone en true cuando finalize() se llama por primera vez, para prevenir doble-disparo.
  let finalizing = false
  // Se setea cuando el upgrade HTTP fue rechazado (unexpected-response).
  // El evento close que sigue (1006 de nuestro req.destroy()) es solo
  // teardown mecanico; el handler de upgrade ya reporto el error.
  let upgradeRejected = false
  // Resuelve finalize(). Cuatro disparadores: TranscriptEndpoint
  // post-CloseStream (~300ms); timer sin-datos (1.5s); cierre de WS
  // (~3-5s); timer de seguridad (5s).
  let resolveFinalize: ((source: FinalizeSource) => void) | null = null
  let cancelNoDataTimer: (() => void) | null = null

  // Define el objeto de conexion antes de los handlers de evento para
  // que se pueda pasar a onReady cuando el WebSocket abra.
  const connection: VoiceStreamConnection = {
    send(audioChunk: Buffer): void {
      if (ws.readyState !== WebSocket.OPEN) {
        return
      }
      if (finalized) {
        // Despues de que se envio CloseStream, el servidor rechaza
        // audio adicional. Descarta el chunk para evitar un error de protocolo.
        logForDebugging(
          `[voice_stream] Dropping audio chunk after CloseStream: ${String(audioChunk.length)} bytes`,
        )
        return
      }
      logForDebugging(
        `[voice_stream] Sending audio chunk: ${String(audioChunk.length)} bytes`,
      )
      // Copia el buffer antes de enviar: los objetos Buffer de NAPI de
      // modulos nativos pueden compartir un ArrayBuffer pooled. Crear
      // una vista con `new Uint8Array(buf.buffer, offset, len)` puede
      // referenciar memoria obsoleta o superpuesta para cuando la
      // libreria ws la lee. `Buffer.from()` hace una copia propia que
      // la libreria ws puede consumir con seguridad como un frame
      // WebSocket binario.
      ws.send(Buffer.from(audioChunk))
    },
    finalize(): Promise<FinalizeSource> {
      if (finalizing || finalized) {
        // Ya finalizado o WebSocket ya cerrado — resuelve inmediatamente.
        return Promise.resolve('ws_already_closed')
      }
      finalizing = true

      return new Promise<FinalizeSource>(resolve => {
        const safetyTimer = setTimeout(
          () => resolveFinalize?.('safety_timeout'),
          FINALIZE_TIMEOUTS_MS.safety,
        )
        const noDataTimer = setTimeout(
          () => resolveFinalize?.('no_data_timeout'),
          FINALIZE_TIMEOUTS_MS.noData,
        )
        cancelNoDataTimer = () => {
          clearTimeout(noDataTimer)
          cancelNoDataTimer = null
        }

        resolveFinalize = (source: FinalizeSource) => {
          clearTimeout(safetyTimer)
          clearTimeout(noDataTimer)
          resolveFinalize = null
          cancelNoDataTimer = null
          // Deepgram legacy puede dejar un interim en lastTranscriptText
          // sin ningun TranscriptEndpoint (websocket_manager.py envia
          // TranscriptChunk y TranscriptEndpoint como items de canal
          // independientes). Todos los disparadores de resolve deben
          // promoverlo; se centraliza aqui. No-op cuando el handler de
          // close ya lo hizo.
          if (lastTranscriptText) {
            logForDebugging(
              `[voice_stream] Promoting unreported interim before ${source} resolve`,
            )
            const t = lastTranscriptText
            lastTranscriptText = ''
            callbacks.onTranscript(t, true)
          }
          logForDebugging(`[voice_stream] Finalize resolved via ${source}`)
          resolve(source)
        }

        // Si el WebSocket ya esta cerrado, resuelve inmediatamente.
        if (
          ws.readyState === WebSocket.CLOSED ||
          ws.readyState === WebSocket.CLOSING
        ) {
          resolveFinalize('ws_already_closed')
          return
        }

        // Difiere CloseStream a la siguiente iteracion del event-loop
        // para que cualquier callback de audio ya encolado por el
        // modulo de grabacion nativo se vacie al WebSocket antes de que
        // se le diga al servidor que deje de aceptar audio. Sin esto,
        // stopRecording() puede devolver sincronicamente mientras el
        // modulo nativo aun tiene un callback onData pendiente en la
        // cola de eventos, causando que el audio llegue despues de CloseStream.
        setTimeout(() => {
          finalized = true
          if (ws.readyState === WebSocket.OPEN) {
            logForDebugging('[voice_stream] Sending CloseStream (finalize)')
            ws.send(CLOSE_STREAM_MSG)
          }
        }, 0)
      })
    },
    close(): void {
      finalized = true
      if (keepaliveTimer) {
        clearInterval(keepaliveTimer)
        keepaliveTimer = null
      }
      connected = false
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    },
    isConnected(): boolean {
      return connected && ws.readyState === WebSocket.OPEN
    },
  }

  ws.on('open', () => {
    logForDebugging('[voice_stream] WebSocket connected')
    connected = true

    // Envia un KeepAlive inmediato para que el servidor sepa que el
    // cliente esta activo. La inicializacion del hardware de audio
    // puede tomar >1s, asi que esto previene que el servidor cierre la
    // conexion antes de que empiece la captura de audio.
    logForDebugging('[voice_stream] Sending initial KeepAlive')
    ws.send(KEEPALIVE_MSG)

    // Envia keepalive periodico para prevenir timeout por inactividad
    keepaliveTimer = setInterval(
      ws => {
        if (ws.readyState === WebSocket.OPEN) {
          logForDebugging('[voice_stream] Sending periodic KeepAlive')
          ws.send(KEEPALIVE_MSG)
        }
      },
      KEEPALIVE_INTERVAL_MS,
      ws,
    )

    // Pasa la conexion al llamador para que pueda empezar a enviar
    // audio. Esto dispara solo despues de que el WebSocket este
    // realmente abierto, garantizando que las llamadas a send() no se
    // descarten en silencio.
    callbacks.onReady(connection)
  })

  // Trackea el ultimo TranscriptText para que cuando llegue
  // TranscriptEndpoint se pueda emitir como la transcripcion final. El
  // servidor a veces envia multiples mensajes TranscriptText
  // no-acumulativos sin endpoints entre ellos; el handler de
  // TranscriptText auto-finaliza segmentos previos cuando detecta que
  // el texto cambio de forma no-acumulativa.
  let lastTranscriptText = ''

  ws.on('message', (raw: Buffer | string) => {
    const text = raw.toString()
    logForDebugging(
      `[voice_stream] Message received (${String(text.length)} chars): ${text.slice(0, 200)}`,
    )
    let msg: VoiceStreamMessage
    try {
      msg = jsonParse(text) as VoiceStreamMessage
    } catch {
      return
    }

    switch (msg.type) {
      case 'TranscriptText': {
        const transcript = msg.data
        logForDebugging(`[voice_stream] TranscriptText: "${transcript ?? ''}"`)
        // Los datos llegaron despues de CloseStream — desarma el timer
        // sin-datos para que un flush lento-pero-real no se corte.
        // Solo desarma una vez finalizado (CloseStream enviado); datos
        // pre-CloseStream que compiten con el envio diferido
        // cancelarian el timer prematuramente, cayendo al timeout de
        // seguridad mas lento de 5s en vez del timer sin-datos de 1.5s.
        if (finalized) {
          cancelNoDataTimer?.()
        }
        if (transcript) {
          // Detecta cuando el servidor se movio a un nuevo segmento de
          // habla. Los refinamientos progresivos extienden o acortan
          // el texto previo (p.ej., "hello" → "hello world", o "hello
          // wor" → "hello wo"). Un segmento nuevo empieza con texto
          // completamente distinto (ninguno es prefijo del otro).
          // Cuando se detecta, emite el texto previo como final para
          // que el llamador lo pueda acumular, previniendo que el
          // nuevo segmento lo sobreescriba y pierda el viejo.
          //
          // Los interims de Nova 3 son acumulativos a traves de
          // segmentos Y pueden revisar texto anterior ("Hello?" →
          // "Hello."). La revision rompe el chequeo de prefijo,
          // causando un falso auto-finalize → el mismo texto
          // committed una vez Y reapareciendo en el interim acumulativo
          // = duplicacion. Nova 3 solo hace endpoint en el flush final,
          // asi que auto-finalize nunca es correcto para el.
          if (!isNova3 && lastTranscriptText) {
            const prev = lastTranscriptText.trimStart()
            const next = transcript.trimStart()
            if (
              prev &&
              next &&
              !next.startsWith(prev) &&
              !prev.startsWith(next)
            ) {
              logForDebugging(
                `[voice_stream] Auto-finalizing previous segment (new segment detected): "${lastTranscriptText}"`,
              )
              callbacks.onTranscript(lastTranscriptText, true)
            }
          }
          lastTranscriptText = transcript
          // Emite como interim para que el llamador pueda mostrar un preview en vivo.
          callbacks.onTranscript(transcript, false)
        }
        break
      }
      case 'TranscriptEndpoint': {
        logForDebugging(
          `[voice_stream] TranscriptEndpoint received, lastTranscriptText="${lastTranscriptText}"`,
        )
        // El servidor señala el fin de una emision. Emite el ultimo
        // TranscriptText como transcripcion final para que el llamador
        // lo pueda commitear.
        const finalText = lastTranscriptText
        lastTranscriptText = ''
        if (finalText) {
          callbacks.onTranscript(finalText, true)
        }
        // Cuando TranscriptEndpoint llega despues de que se envio
        // CloseStream, el servidor ya vacio su transcripcion final —
        // no viene nada mas. Resuelve finalize ahora para que el
        // llamador lea el buffer acumulado inmediatamente (~300ms) en
        // vez de esperar el evento de cierre del WebSocket (~3-5s de
        // teardown del servidor). `finalized` (no `finalizing`) es el
        // gate correcto: cambia dentro del setTimeout(0) que realmente
        // envia CloseStream, asi que un TranscriptEndpoint que compite
        // con el envio diferido igual espera.
        if (finalized) {
          resolveFinalize?.('post_closestream_endpoint')
        }
        break
      }
      case 'TranscriptError': {
        const desc =
          msg.description ?? msg.error_code ?? 'unknown transcription error'
        logForDebugging(`[voice_stream] TranscriptError: ${desc}`)
        if (!finalizing) {
          callbacks.onError(desc)
        }
        break
      }
      case 'error': {
        const errorDetail = msg.message ?? jsonStringify(msg)
        logForDebugging(`[voice_stream] Server error: ${errorDetail}`)
        if (!finalizing) {
          callbacks.onError(errorDetail)
        }
        break
      }
      default:
        break
    }
  })

  ws.on('close', (code, reason) => {
    const reasonStr = reason?.toString() ?? ''
    logForDebugging(
      `[voice_stream] WebSocket closed: code=${String(code)} reason="${reasonStr}"`,
    )
    connected = false
    if (keepaliveTimer) {
      clearInterval(keepaliveTimer)
      keepaliveTimer = null
    }
    // Si el servidor cerro la conexion antes de enviar
    // TranscriptEndpoint, promueve el ultimo transcript interim a final
    // para que no se pierda texto.
    if (lastTranscriptText) {
      logForDebugging(
        '[voice_stream] Promoting unreported interim transcript to final on close',
      )
      const finalText = lastTranscriptText
      lastTranscriptText = ''
      callbacks.onTranscript(finalText, true)
    }
    // Durante finalize, suprime onError — la sesion ya entrego lo que
    // tenia. La ruta onError de useVoice borra accumulatedRef, lo que
    // destruiria la transcripcion antes de que el .then() de finalize
    // la lea. `finalizing` (no resolveFinalize) es el gate: se setea
    // una vez a la entrada de finalize(), nunca se limpia, asi que se
    // mantiene preciso despues de que la ruta rapida o un timer ya resolvio.
    resolveFinalize?.('ws_close')
    if (!finalizing && !upgradeRejected && code !== 1000 && code !== 1005) {
      callbacks.onError(
        `Connection closed: code ${String(code)}${reasonStr ? ` — ${reasonStr}` : ''}`,
      )
    }
    callbacks.onClose()
  })

  // La libreria ws dispara 'unexpected-response' cuando el upgrade HTTP
  // devuelve un status no-101. Escucharlo permite mostrar el status
  // real y marcar 4xx como fatal (el mismo token/fingerprint TLS no
  // cambiara al reintentar). Con un listener registrado, ws NO aborta
  // por nuestra cuenta — destruimos el request; 'error' no dispara,
  // 'close' si (suprimido via upgradeRejected arriba).
  //
  // El shim de ws de Bun historicamente no implementaba este evento
  // (se loguea un warning una vez al registrarse). Bajo Bun un upgrade
  // no-101 cae a la ruta generica 'error' + 'close' 1002 sin status
  // recuperable; el guard attemptGenRef en useVoice.ts igual muestra el
  // fallo del intento de reintento, el usuario solo ve "Expected 101
  // status code" en vez de "HTTP 503". Sin daño — el fix de gen es la
  // parte load-bearing.
  ws.on('unexpected-response', (req: ClientRequest, res: IncomingMessage) => {
    const status = res.statusCode ?? 0
    // La implementacion de ws de Bun en Windows puede disparar este
    // evento para una respuesta exitosa 101 Switching Protocols
    // (anthropics/claude-code-how-works-how-works#40510). 101 nunca es
    // un rechazo — sale antes de destruir un upgrade que funciona.
    if (status === 101) {
      logForDebugging(
        '[voice_stream] unexpected-response fired with 101; ignoring',
      )
      return
    }
    logForDebugging(
      `[voice_stream] Upgrade rejected: status=${String(status)} cf-mitigated=${String(res.headers['cf-mitigated'])} cf-ray=${String(res.headers['cf-ray'])}`,
    )
    upgradeRejected = true
    res.resume()
    req.destroy()
    if (finalizing) return
    callbacks.onError(
      `WebSocket upgrade rejected with HTTP ${String(status)}`,
      { fatal: status >= 400 && status < 500 },
    )
  })

  ws.on('error', (err: Error) => {
    logError(err)
    logForDebugging(`[voice_stream] WebSocket error: ${err.message}`)
    if (!finalizing) {
      callbacks.onError(`Voice stream connection error: ${err.message}`)
    }
  })

  return connection
}
