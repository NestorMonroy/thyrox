/**
 * Puerto de `ccnmt: packages/voice/src/hooks/useVoice.ts` (1144 líneas),
 * 100 % portado.
 *
 * El alcance `@claude-code-how-works/` se reescribe a `@thyrox/` SOLO en
 * las líneas de specifier —las que traen `from`, `require(` o abren con
 * `import`—; el resto del archivo, incluidos sus comentarios en inglés,
 * queda verbatim. El ancla es de TOKEN y no de inicio de línea: la línea
 * 15 de la fuente cierra un import multilínea con
 * una llave de cierre seguida de la palabra clave de origen y el
 * specifier de `local-observability` en el alcance de la fuente, y un
 * ancla
 * `^\s*(import|export)\b` no la ve. Medido: 6 anclados contra 7
 * from/require en este archivo.
 *
 * EL BLOQUEADOR DECLARADO ANTES ESTABA RANCIO — verificado por conducta el
 * 2026-09-19T07:41:39, no leído de este docstring:
 *
 *   - `react` SÍ resuelve: `Bun.resolveSync('react', <este dir>)` da
 *     `node_modules/.bun/react@19.3.0/node_modules/react/index.js`.
 *   - `@anthropic/ink` y `@anthropic/ink/keybindings` existen en el árbol
 *     (`src/packages/@ant/ink`, cuyo `package.json` declara
 *     `"name": "@anthropic/ink"`); no resolvían porque este paquete no los
 *     DECLARABA, no porque faltaran.
 *   - `../voiceContext.js` está portado y presente en este mismo paquete.
 *
 * La versión anterior declaraba «3 de 4 exports» y un cuerpo que difería
 * `require('react')` para lanzar. Esa medición era correcta el día que se
 * escribió y caducó con la de-duplicación de los cinco paquetes `@ant/`
 * —ver H-THYROX-116—, sin que nadie tocara este archivo: la forma exacta
 * que `evidencia-antes-de-afirmar.md` prohíbe tratar como Observation.
 */
// Hook de React para entrada de voz hold-to-talk contra el STT de
// voice_stream de Anthropic.
//
// Se mantiene pulsado el keybinding para grabar; al soltarlo se detiene y se
// envía. Los eventos de auto-repeat reinician un timer interno: si no llega
// ninguna pulsación dentro de RELEASE_TIMEOUT_MS, la grabación se detiene
// sola. Graba con el módulo de audio nativo (macOS) o con SoX, y transcribe
// contra el endpoint voice_stream (conversation_engine) de Anthropic.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSetVoiceState } from '../voiceContext.js'
import { useTerminalFocus } from '@anthropic/ink'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@thyrox/local-observability'
import { getVoiceKeyterms } from '../voiceKeyterms.js'
import {
  connectVoiceStream,
  type FinalizeSource,
  isVoiceStreamAvailable,
  type VoiceStreamConnection,
} from '../voiceStreamSTT.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { toError } from '@thyrox/local-observability/errorHelpers.js'
import { getSystemLocaleLanguage } from '@thyrox/output/utils/intl.js'
import { logError } from '@thyrox/local-observability/logging'
import { getInitialSettings } from '@thyrox/config/settings'
import { sleep } from '@thyrox/config/sleep'

// ─── Normalización de idioma ────────────────────────────────────────────

const DEFAULT_STT_LANGUAGE = 'en'

// Mapea nombres de idioma —en inglés y en su forma nativa— a códigos BCP-47
// que el backend Deepgram de voice_stream admite. Las claves van en minúscula.
//
// Esta lista tiene que ser un SUBCONJUNTO del allowlist
// supported_language_codes del servidor (GrowthBook:
// speech_to_text_voice_stream_config).
//
// Si el CLI manda un código que el servidor rechaza, el WebSocket cierra con
// 1008 «Unsupported language» y la voz deja de funcionar. Un idioma no
// admitido cae a DEFAULT_STT_LANGUAGE, así que la grabación sigue sirviendo.
const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  english: 'en',
  spanish: 'es',
  español: 'es',
  espanol: 'es',
  french: 'fr',
  français: 'fr',
  francais: 'fr',
  japanese: 'ja',
  日本語: 'ja',
  german: 'de',
  deutsch: 'de',
  portuguese: 'pt',
  português: 'pt',
  portugues: 'pt',
  italian: 'it',
  italiano: 'it',
  korean: 'ko',
  한국어: 'ko',
  hindi: 'hi',
  हिन्दी: 'hi',
  हिंदी: 'hi',
  indonesian: 'id',
  'bahasa indonesia': 'id',
  bahasa: 'id',
  russian: 'ru',
  русский: 'ru',
  polish: 'pl',
  polski: 'pl',
  turkish: 'tr',
  türkçe: 'tr',
  turkce: 'tr',
  dutch: 'nl',
  nederlands: 'nl',
  ukrainian: 'uk',
  українська: 'uk',
  greek: 'el',
  ελληνικά: 'el',
  czech: 'cs',
  čeština: 'cs',
  cestina: 'cs',
  danish: 'da',
  dansk: 'da',
  swedish: 'sv',
  svenska: 'sv',
  norwegian: 'no',
  norsk: 'no',
}

// Subconjunto del allowlist speech_to_text_voice_stream_config de GrowthBook.
// Mandar un código que no esté en el allowlist del servidor cierra la conexión.
const SUPPORTED_LANGUAGE_CODES = new Set([
  'en',
  'es',
  'fr',
  'ja',
  'de',
  'pt',
  'it',
  'ko',
  'hi',
  'id',
  'ru',
  'pl',
  'tr',
  'nl',
  'uk',
  'el',
  'cs',
  'da',
  'sv',
  'no',
])

// Normaliza la preferencia de idioma (de `settings.language`) a un código
// BCP-47 que el endpoint voice_stream admita. Devuelve el idioma por defecto
// cuando la entrada no se puede resolver.
//
// Si la entrada no está vacía pero no está admitida, `fellBackFrom` conserva
// el valor original para que quien llama pueda avisar al usuario.
export function normalizeLanguageForSTT(language: string | undefined): {
  code: string
  fellBackFrom?: string
} {
  if (!language) return { code: DEFAULT_STT_LANGUAGE }
  const lower = language.toLowerCase().trim()
  if (!lower) return { code: DEFAULT_STT_LANGUAGE }
  if (SUPPORTED_LANGUAGE_CODES.has(lower)) return { code: lower }
  const fromName = LANGUAGE_NAME_TO_CODE[lower]
  if (fromName) return { code: fromName }
  const base = lower.split('-')[0]
  if (base && SUPPORTED_LANGUAGE_CODES.has(base)) return { code: base }
  return { code: DEFAULT_STT_LANGUAGE, fellBackFrom: language }
}

// El módulo de voice se carga de forma diferida: no se importa `voice.ts` —ni
// su dependencia nativa `audio-capture-napi`— hasta que la entrada de voz se
// activa de verdad.
//
// La razón es de conducta observable en macOS: cargar el módulo de audio
// nativo puede disparar el prompt de permiso de micrófono de TCC, y eso no
// debe ocurrir mientras el usuario no haya habilitado la voz.
type VoiceModule = typeof import('../voice.js')
let voiceModule: VoiceModule | null = null

type VoiceState = 'idle' | 'recording' | 'processing'

type UseVoiceOptions = {
  onTranscript: (text: string) => void
  onError?: (message: string) => void
  enabled: boolean
  focusMode: boolean
}

type UseVoiceReturn = {
  state: VoiceState
  handleKeyEvent: (fallbackMs?: number) => void
}

// Hueco (ms) entre eventos de auto-repeat que se interpreta como que la tecla
// se soltó. El auto-repeat de la terminal suele disparar cada 30-80 ms; 200 ms
// absorbe el jitter con holgura y sigue sintiéndose responsivo.
const RELEASE_TIMEOUT_MS = 200

// Respaldo (ms) para armar el timer de liberación cuando no se ve ningún
// auto-repeat. El delay de repetición por defecto de macOS es de ~500 ms;
// 600 ms deja margen. Cubre el caso de que el usuario pulse y suelte ANTES de
// que arranque el auto-repeat: sin esto el timer nunca se armaría y la
// grabación no se detendría.
//
// Para la activación por primera pulsación de un combo con modificador
// —`handleKeyEvent` llamado en t=0, antes de cualquier auto-repeat— quien
// llama debe pasar FIRST_PRESS_FALLBACK_MS en su lugar: ahí el hueco hasta la
// siguiente pulsación es el *delay* inicial de repetición del sistema
// operativo (hasta ~2 s en macOS con el slider en «Long»), no su *rate*.
const REPEAT_FALLBACK_MS = 600
export const FIRST_PRESS_FALLBACK_MS = 2000

// Cuánto (ms) se mantiene viva una sesión en modo focus sin que llegue habla,
// antes de desmontarla para liberar la conexión WebSocket. Se vuelve a armar
// en el ciclo de focus siguiente (blur → refocus).
const FOCUS_SILENCE_TIMEOUT_MS = 5_000

// Número de barras del visualizador de waveform durante la grabación.
const AUDIO_LEVEL_BARS = 16

// Calcula la amplitud RMS de un buffer PCM de 16 bits con signo y devuelve un
// valor normalizado entre 0 y 1. La curva de raíz cuadrada reparte los niveles
// bajos sobre más rango visual, para que el waveform use toda la escala de
// alturas de bloque en vez de quedarse pegado al suelo.
export function computeLevel(chunk: Buffer): number {
  const samples = chunk.length >> 1 // 16-bit = 2 bytes per sample
  if (samples === 0) return 0
  let sumSq = 0
  for (let i = 0; i < chunk.length - 1; i += 2) {
    // Lee 16 bits con signo, little-endian
    const sample = ((chunk[i]! | (chunk[i + 1]! << 8)) << 16) >> 16
    sumSq += sample * sample
  }
  const rms = Math.sqrt(sumSq / samples)
  const normalized = Math.min(rms / 2000, 1)
  return Math.sqrt(normalized)
}

export function useVoice({
  onTranscript,
  onError,
  enabled,
  focusMode,
}: UseVoiceOptions): UseVoiceReturn {
  const [state, setState] = useState<VoiceState>('idle')
  const stateRef = useRef<VoiceState>('idle')
  const connectionRef = useRef<VoiceStreamConnection | null>(null)
  const accumulatedRef = useRef('')
  const onTranscriptRef = useRef(onTranscript)
  const onErrorRef = useRef(onError)
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Pasa a true en cuanto se ve una SEGUNDA pulsación (auto-repeat) durante la
  // grabación. El delay de repetición del sistema operativo —~500 ms en macOS—
  // hace que la primera pulsación llegue sola: armar el timer de liberación
  // antes de que arranque el auto-repeat produciría una liberación falsa.
  const seenRepeatRef = useRef(false)
  const repeatFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  // True cuando la sesión de grabación en curso la inició el focus de la
  // terminal, no una pulsación. Una sesión dirigida por focus termina con el
  // blur, no al soltar la tecla.
  const focusTriggeredRef = useRef(false)
  // Timer que desmonta la sesión tras un silencio prolongado en modo focus.
  const focusSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  // Se fija cuando una sesión en modo focus se desmonta por silencio. Impide
  // que el efecto de focus la reinicie de inmediato. Se limpia con el blur,
  // para que el ciclo de focus siguiente vuelva a armar la grabación.
  const silenceTimedOutRef = useRef(false)
  const recordingStartRef = useRef(0)
  // Se incrementa en cada `startRecordingSession()`. Cada callback captura su
  // generación y se retira si ya arrancó una sesión más nueva. Es lo que impide
  // que un WebSocket zombi de conexión lenta, perteneciente a una sesión
  // abandonada, sobreescriba `connectionRef` a mitad de la sesión siguiente.
  const sessionGenRef = useRef(0)
  // True si el reintento por error temprano disparó durante esta sesión.
  // Se registra para el evento de analítica `tengu_voice_recording_completed`.
  const retryUsedRef = useRef(false)
  // Todo el audio capturado en esta sesión, conservado para el replay ante un
  // silent-drop. Alrededor del 1 % de las sesiones caen en un pod de CE roto
  // de forma pegajosa, que acepta el audio y devuelve cero transcripciones
  // (variante session-sticky de anthropics/anthropic#287008).
  //
  // Cuando `finalize()` resuelve por `no_data_timeout` con
  // `hadAudioSignal=true`, el buffer se reproduce UNA vez sobre un WebSocket
  // nuevo. Está acotado: 32 KB/s × ~60 s como máximo ≈ 2 MB.
  const fullAudioRef = useRef<Buffer[]>([])
  const silentDropRetriedRef = useRef(false)
  // Avanza cuando se programa el reintento por error temprano. Se captura por
  // cada `attemptConnect`: así `onError` se traga los eventos de generación
  // rancia —el close-error de cola de la conexión 1— y sí expone los de la
  // generación vigente —el fallo genuino de la conexión 2—. Misma forma que
  // `sessionGenRef`, un nivel más abajo.
  const attemptGenRef = useRef(0)
  // Acumulado de caracteres volcados en modo focus: cada transcripción final se
  // inyecta de inmediato y `accumulatedRef` se reinicia. Se suma a
  // `transcriptChars` en el evento de completado para que una sesión en modo
  // focus no dé un falso positivo de silent-drop —`transcriptChars=0` pese a
  // haber transcrito bien.
  const focusFlushedCharsRef = useRef(0)
  // True si llegó al menos un chunk de audio con señal no trivial. Es lo que
  // distingue «el micrófono está mudo o inaccesible» de «no se detectó habla».
  const hasAudioSignalRef = useRef(false)
  // Pasa a true en cuanto `onReady` dispara para la sesión en curso. A
  // diferencia de `connectionRef`, que `cleanup()` pone a null, éste sobrevive
  // a las carreras de orden entre efectos en las que el cleanup del efecto 3
  // corre antes del `finishRecording()` del efecto 2 — por ejemplo al apagar
  // `/voice` a mitad de grabación en modo focus.
  //
  // Alimenta la dimensión de analítica `wsConnected` y la ramificación del
  // mensaje de error. Se reinicia en `startRecordingSession`.
  const everConnectedRef = useRef(false)
  const audioLevelsRef = useRef<number[]>([])
  const isFocused = useTerminalFocus()
  const setVoiceState = useSetVoiceState()

  // Mantiene al día las refs de callback sin disparar re-renders
  onTranscriptRef.current = onTranscript
  onErrorRef.current = onError

  function updateState(newState: VoiceState): void {
    stateRef.current = newState
    setState(newState)
    setVoiceState(prev => {
      if (prev.voiceState === newState) return prev
      return { ...prev, voiceState: newState }
    })
  }

  const cleanup = useCallback((): void => {
    // Marca como rancia cualquier sesión en vuelo: la conexión principal por
    // `isStale()`, el replay por `isStale()`, y la continuación de
    // `finishRecording`. Sin esto, apagar la voz durante la ventana de replay
    // deja que el replay rancio abra un WebSocket, acumule transcripción y la
    // inyecte DESPUÉS de que la voz ya se desmontó.
    sessionGenRef.current++
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current)
      cleanupTimerRef.current = null
    }
    if (releaseTimerRef.current) {
      clearTimeout(releaseTimerRef.current)
      releaseTimerRef.current = null
    }
    if (repeatFallbackTimerRef.current) {
      clearTimeout(repeatFallbackTimerRef.current)
      repeatFallbackTimerRef.current = null
    }
    if (focusSilenceTimerRef.current) {
      clearTimeout(focusSilenceTimerRef.current)
      focusSilenceTimerRef.current = null
    }
    silenceTimedOutRef.current = false
    voiceModule?.stopRecording()
    if (connectionRef.current) {
      connectionRef.current.close()
      connectionRef.current = null
    }
    accumulatedRef.current = ''
    audioLevelsRef.current = []
    fullAudioRef.current = []
    setVoiceState(prev => {
      if (prev.voiceInterimTranscript === '' && !prev.voiceAudioLevels.length)
        return prev
      return { ...prev, voiceInterimTranscript: '', voiceAudioLevels: [] }
    })
  }, [setVoiceState])

  function finishRecording(): void {
    logForDebugging(
      '[voice] finishRecording: stopping recording, transitioning to processing',
    )
    // La sesión está terminando: se marcan como rancios los intentos en vuelo
    // para que su `onError` tardío —la conexión 2 respondiendo después de que
    // el usuario soltó la tecla— no dispare por segunda vez encima del mensaje
    // de «check network» de abajo.
    attemptGenRef.current++
    // Se captura `focusTriggered` ANTES de limpiarlo: hace falta como dimensión
    // del evento para que BigQuery pueda filtrar las auto-grabaciones pasivas
    // del modo focus. El usuario enfoca la terminal sin hablar, el ruido
    // ambiente pone `hadAudioSignal=true`, y sale una firma FALSA de
    // silent-drop.
    //
    // `focusFlushedCharsRef` arregla la exactitud de `transcriptChars` en las
    // sesiones CON habla; `focusTriggered` permite filtrar las que NO la
    // tuvieron.
    const focusTriggered = focusTriggeredRef.current
    focusTriggeredRef.current = false
    updateState('processing')
    voiceModule?.stopRecording()
    // La duración se captura ANTES del viaje de ida y vuelta de `finalize`,
    // para que la espera del WebSocket no cuente: si no, un toque rápido
    // aparenta durar más de 2 s.
    //
    // TODOS los valores respaldados por ref se capturan aquí, antes de la
    // frontera asíncrona. Una pulsación durante la espera de `finalize` puede
    // arrancar una sesión nueva y reiniciar estas refs —por ejemplo
    // `focusFlushedCharsRef = 0` en `startRecordingSession`—, reproduciendo
    // justo el falso positivo de silent-drop que esta ref existe para evitar.
    const recordingDurationMs = Date.now() - recordingStartRef.current
    const hadAudioSignal = hasAudioSignalRef.current
    const retried = retryUsedRef.current
    const focusFlushedChars = focusFlushedCharsRef.current
    // `wsConnected` distingue «el backend recibió el audio y lo tiró» —el bug
    // que arregla el PR de backend #287008— de «el handshake del WebSocket
    // nunca se completó». En el segundo caso el audio sigue en `audioBuffer`
    // y jamás llegó al servidor, pero `hasAudioSignalRef` ya está en true por
    // el ruido ambiente.
    const wsConnected = everConnectedRef.current
    // La generación se captura ANTES del `.then()`. Si arranca una sesión nueva
    // durante la espera de `finalize`, `sessionGenRef` ya avanzó cuando corre
    // la continuación: capturarla DENTRO del `.then()` daría la generación de
    // la sesión nueva y todo control de rancidez sería un no-op.
    const myGen = sessionGenRef.current
    const isStale = () => sessionGenRef.current !== myGen
    logForDebugging('[voice] Recording stopped')

    // Se manda `finalize` y se espera al cierre del WebSocket antes de leer la
    // transcripción acumulada. El handler de cierre promueve a final cualquier
    // texto interim sin reportar, así que hay que esperar a que dispare.
    const finalizePromise: Promise<FinalizeSource | undefined> =
      connectionRef.current
        ? connectionRef.current.finalize()
        : Promise.resolve(undefined)

    void finalizePromise
      .then(async finalizeSource => {
        if (isStale()) return
        // Replay ante silent-drop: el servidor aceptó el audio
        // (`wsConnected`), el micrófono capturó señal real
        // (`hadAudioSignal`), y aun así `finalize` venció con cero
        // transcripción — el bug del ~1 % de pods de CE pegajosos.
        //
        // El audio en buffer se reproduce UNA vez sobre una conexión nueva. El
        // backoff de 250 ms despeja la carrera de reconexión rápida contra el
        // mismo pod; es el mismo hueco que usa el reintento por error temprano
        // de abajo.
        if (
          finalizeSource === 'no_data_timeout' &&
          hadAudioSignal &&
          wsConnected &&
          !focusTriggered &&
          focusFlushedChars === 0 &&
          accumulatedRef.current.trim() === '' &&
          !silentDropRetriedRef.current &&
          fullAudioRef.current.length > 0
        ) {
          silentDropRetriedRef.current = true
          logForDebugging(
            `[voice] Silent-drop detected (no_data_timeout, ${String(fullAudioRef.current.length)} chunks); replaying on fresh connection`,
          )
          logEvent('tengu_voice_silent_drop_replay', {
            recordingDurationMs,
            chunkCount: fullAudioRef.current.length,
          })
          if (connectionRef.current) {
            connectionRef.current.close()
            connectionRef.current = null
          }
          const replayBuffer = fullAudioRef.current
          await sleep(250)
          if (isStale()) return
          const stt = normalizeLanguageForSTT(getInitialSettings().language)
          const keyterms = await getVoiceKeyterms()
          if (isStale()) return
          await new Promise<void>(resolve => {
            void connectVoiceStream(
              {
                onTranscript: (t, isFinal) => {
                  if (isStale()) return
                  if (isFinal && t.trim()) {
                    if (accumulatedRef.current) accumulatedRef.current += ' '
                    accumulatedRef.current += t.trim()
                  }
                },
                onError: () => resolve(),
                onClose: () => {},
                onReady: conn => {
                  if (isStale()) {
                    conn.close()
                    resolve()
                    return
                  }
                  connectionRef.current = conn
                  const SLICE = 32_000
                  let slice: Buffer[] = []
                  let bytes = 0
                  for (const c of replayBuffer) {
                    if (bytes > 0 && bytes + c.length > SLICE) {
                      conn.send(Buffer.concat(slice))
                      slice = []
                      bytes = 0
                    }
                    slice.push(c)
                    bytes += c.length
                  }
                  if (slice.length) conn.send(Buffer.concat(slice))
                  void conn.finalize().then(() => {
                    conn.close()
                    resolve()
                  })
                },
              },
              { language: stt.code, keyterms },
            ).then(
              c => {
                if (!c) resolve()
              },
              () => resolve(),
            )
          })
          if (isStale()) return
        }
        fullAudioRef.current = []

        const text = accumulatedRef.current.trim()
        logForDebugging(
          `[voice] Final transcript assembled (${String(text.length)} chars): "${text.slice(0, 200)}"`,
        )

        // Mide la tasa de silent-drop: `transcriptChars=0` +
        // `hadAudioSignal=true` + `recordingDurationMs>2000` es la firma del
        // bug que arregla el PR de backend #287008.
        //
        // `focusFlushedCharsRef` hace exacto a `transcriptChars` en modo focus,
        // donde cada final se inyecta de inmediato y `accumulatedRef` se
        // reinicia.
        //
        // OJO: esto sólo dispara por el camino de `finishRecording()`. El
        // camino de caída de `onError` y el de `!conn` —sin OAuth— lo
        // esquivan, así que NO se puede calcular
        // `COUNT(completed)/COUNT(started)` como tasa de éxito. El
        // denominador del silent-drop —sólo eventos completed— sí es
        // internamente consistente.
        logEvent('tengu_voice_recording_completed', {
          transcriptChars: text.length + focusFlushedChars,
          recordingDurationMs,
          hadAudioSignal,
          retried,
          silentDropRetried: silentDropRetriedRef.current,
          wsConnected,
          focusTriggered,
        })

        if (connectionRef.current) {
          connectionRef.current.close()
          connectionRef.current = null
        }

        if (text) {
          logForDebugging(
            `[voice] Injecting transcript (${String(text.length)} chars)`,
          )
          onTranscriptRef.current(text)
        } else if (focusFlushedChars === 0 && recordingDurationMs > 2000) {
          // Sólo se avisa de transcripción vacía si tampoco se volcó nada en
          // modo focus y la grabación duró más de 2 s. Una grabación corta es
          // un toque accidental: se vuelve a idle en silencio.
          if (!wsConnected) {
            // El WebSocket nunca conectó, así que el audio no llegó al
            // backend. No es un silent-drop sino un fallo de conexión:
            // refresh de OAuth lento, red, etc.
            onErrorRef.current?.(
              'Voice connection failed. Check your network and try again.',
            )
          } else if (!hadAudioSignal) {
            // Distingue un micrófono mudo —problema de captura— de un habla
            // que no se reconoció.
            onErrorRef.current?.(
              'No audio detected from microphone. Check that the correct input device is selected and that Claude Code has microphone access.',
            )
          } else {
            onErrorRef.current?.('No speech detected.')
          }
        }

        accumulatedRef.current = ''
        setVoiceState(prev => {
          if (prev.voiceInterimTranscript === '') return prev
          return { ...prev, voiceInterimTranscript: '' }
        })
        updateState('idle')
      })
      .catch(err => {
        logError(toError(err))
        if (!isStale()) updateState('idle')
      })
  }

  // Con la voz habilitada se importa `voice.ts` de forma diferida, para que
  // `checkRecordingAvailability` y compañía estén listos cuando el usuario
  // pulse la tecla de voz.
  //
  // NO se precarga el módulo nativo: `require('audio-capture.node')` es un
  // `dlopen` SÍNCRONO de CoreAudio/AudioUnit que bloquea el event loop entre
  // ~1 s en caliente y ~8 s con `coreaudiod` en frío. `setImmediate` no
  // ayuda —cede un tick y el `dlopen` sigue bloqueando—. El coste lo paga la
  // primera pulsación de voz.
  useEffect(() => {
    if (enabled && !voiceModule) {
      void import('../voice.js').then(mod => {
        voiceModule = mod
      })
    }
  }, [enabled])

  // ── Timer de silencio en modo focus ────────────────────────────────
  // Arma —o reinicia— un timer que desmonta la sesión en modo focus tras
  // FOCUS_SILENCE_TIMEOUT_MS sin habla. Se llama al arrancar una sesión y
  // después de cada transcripción volcada.
  function armFocusSilenceTimer(): void {
    if (focusSilenceTimerRef.current) {
      clearTimeout(focusSilenceTimerRef.current)
    }
    focusSilenceTimerRef.current = setTimeout(
      (
        focusSilenceTimerRef,
        stateRef,
        focusTriggeredRef,
        silenceTimedOutRef,
        finishRecording,
      ) => {
        focusSilenceTimerRef.current = null
        if (stateRef.current === 'recording' && focusTriggeredRef.current) {
          logForDebugging(
            '[voice] Focus silence timeout — tearing down session',
          )
          silenceTimedOutRef.current = true
          finishRecording()
        }
      },
      FOCUS_SILENCE_TIMEOUT_MS,
      focusSilenceTimerRef,
      stateRef,
      focusTriggeredRef,
      silenceTimedOutRef,
      finishRecording,
    )
  }

  // ── Grabación dirigida por focus ────────────────────────────────────
  // En modo focus, la grabación arranca cuando la terminal gana el focus y
  // se detiene cuando lo pierde. Habilita el flujo de trabajo de varias
  // instancias en paralelo, donde la entrada de voz sigue al focus de la
  // ventana.
  useEffect(() => {
    if (!enabled || !focusMode) {
      // El modo focus se deshabilitó con una grabación dirigida por focus
      // activa: se detiene para que no quede colgando hasta que dispare el
      // timer de silencio.
      if (focusTriggeredRef.current && stateRef.current === 'recording') {
        logForDebugging(
          '[voice] Focus mode disabled during recording, finishing',
        )
        finishRecording()
      }
      return
    }
    let cancelled = false
    if (
      isFocused &&
      stateRef.current === 'idle' &&
      !silenceTimedOutRef.current
    ) {
      const beginFocusRecording = (): void => {
        // Se revisan las condiciones otra vez: el estado, `enabled` o
        // `focusMode` pueden haber cambiado durante el await —el cleanup del
        // efecto fija `cancelled`.
        if (
          cancelled ||
          stateRef.current !== 'idle' ||
          silenceTimedOutRef.current
        )
          return
        logForDebugging('[voice] Focus gained, starting recording session')
        focusTriggeredRef.current = true
        void startRecordingSession()
        armFocusSilenceTimer()
      }
      if (voiceModule) {
        beginFocusRecording()
      } else {
        // El módulo de voice se está cargando: el import asíncrono resuelve
        // desde caché como microtask. Hay que esperarlo antes de arrancar la
        // sesión de grabación.
        void import('../voice.js').then(mod => {
          voiceModule = mod
          beginFocusRecording()
        })
      }
    } else if (!isFocused) {
      // Se limpia la bandera de timeout por silencio en el blur, para que el
      // ciclo de focus siguiente vuelva a armar la grabación.
      silenceTimedOutRef.current = false
      if (stateRef.current === 'recording') {
        logForDebugging('[voice] Focus lost, finishing recording')
        finishRecording()
      }
    }
    return () => {
      cancelled = true
    }
  }, [enabled, focusMode, isFocused])

  // ── Arranca una sesión de grabación (connect a voice_stream + audio) ──
  async function startRecordingSession(): Promise<void> {
    if (!voiceModule) {
      onErrorRef.current?.(
        'Voice module not loaded yet. Try again in a moment.',
      )
      return
    }

    // La transición a 'recording' es SÍNCRONA y va antes de cualquier await,
    // porque quien llama lee el estado justo después de
    // `void startRecordingSession()`:
    //
    // - la guarda de space-hold de `useVoiceIntegration.tsx` lee `voiceState`
    //   del store de inmediato; si ve 'idle' limpia `isSpaceHoldActiveRef` y
    //   el auto-repeat del espacio se fuga al input de texto (reproducible el
    //   100 % de las veces);
    // - el control de reentrada `currentState === 'idle'` de `handleKeyEvent`,
    //   más abajo.
    //
    // Con un await por delante, los dos verían un 'idle' rancio. Ver la
    // revisión del PR #20873.
    updateState('recording')
    recordingStartRef.current = Date.now()
    accumulatedRef.current = ''
    seenRepeatRef.current = false
    hasAudioSignalRef.current = false
    retryUsedRef.current = false
    silentDropRetriedRef.current = false
    fullAudioRef.current = []
    focusFlushedCharsRef.current = 0
    everConnectedRef.current = false
    const myGen = ++sessionGenRef.current

    // ── Comprobación previa: ¿se puede grabar audio de verdad? ─────────
    const availability = await voiceModule.checkRecordingAvailability()
    if (!availability.available) {
      logForDebugging(
        `[voice] Recording not available: ${availability.reason ?? 'unknown'}`,
      )
      onErrorRef.current?.(
        availability.reason ?? 'Audio recording is not available.',
      )
      cleanup()
      updateState('idle')
      return
    }

    logForDebugging(
      '[voice] Starting recording session, connecting voice stream',
    )
    // Limpia cualquier error anterior
    setVoiceState(prev => {
      if (!prev.voiceError) return prev
      return { ...prev, voiceError: null }
    })

    // Los chunks de audio se acumulan en buffer mientras el WebSocket conecta.
    // En cuanto la conexión está lista —dispara `onReady`— se vuelca el buffer
    // y los chunks siguientes se mandan directos.
    const audioBuffer: Buffer[] = []

    // La grabación arranca de INMEDIATO: el audio queda en buffer hasta que el
    // WebSocket abre, lo que elimina la latencia de 1-2 s de esperar al OAuth
    // y a la conexión.
    logForDebugging(
      '[voice] startRecording: buffering audio while WebSocket connects',
    )
    audioLevelsRef.current = []
    const started = await voiceModule.startRecording(
      (chunk: Buffer) => {
        // Se copia para el buffer de replay de `fullAudioRef`. El `send()` de
        // `voiceStreamSTT` vuelve a copiar por defensa: es un sobrecoste
        // aceptable a las tasas del audio.
        //
        // En modo focus no se acumula: el replay está condicionado a
        // `!focusTriggered`, así que el buffer sería peso muerto —hasta unos
        // 20 MB en una sesión de 10 minutos.
        const owned = Buffer.from(chunk)
        if (!focusTriggeredRef.current) {
          fullAudioRef.current.push(owned)
        }
        if (connectionRef.current) {
          connectionRef.current.send(owned)
        } else {
          audioBuffer.push(owned)
        }
        // Actualiza el histograma de nivel de audio del visualizador
        const level = computeLevel(chunk)
        if (!hasAudioSignalRef.current && level > 0.01) {
          hasAudioSignalRef.current = true
        }
        const levels = audioLevelsRef.current
        if (levels.length >= AUDIO_LEVEL_BARS) {
          levels.shift()
        }
        levels.push(level)
        // Se copia el array para que React vea una referencia nueva
        const snapshot = [...levels]
        audioLevelsRef.current = snapshot
        setVoiceState(prev => ({ ...prev, voiceAudioLevels: snapshot }))
      },
      () => {
        // Fin externo —por ejemplo un error del dispositivo—: se trata como
        // una detención
        if (stateRef.current === 'recording') {
          finishRecording()
        }
      },
      { silenceDetection: false },
    )

    if (!started) {
      logError(new Error('[voice] Recording failed — no audio tool found'))
      onErrorRef.current?.(
        'Failed to start audio capture. Check that your microphone is accessible.',
      )
      cleanup()
      updateState('idle')
      setVoiceState(prev => ({
        ...prev,
        voiceError: 'Recording failed — no audio tool found',
      }))
      return
    }

    const rawLanguage = getInitialSettings().language
    const stt = normalizeLanguageForSTT(rawLanguage)
    logEvent('tengu_voice_recording_started', {
      focusTriggered: focusTriggeredRef.current,
      sttLanguage:
        stt.code as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      sttLanguageIsDefault: !rawLanguage?.trim(),
      sttLanguageFellBack: stt.fellBackFrom !== undefined,
      // Subetiqueta ISO 639 que viene de `Intl`: conjunto acotado, nunca texto
      // del usuario. Queda `undefined` si `Intl` falló, en cuyo caso se omite
      // del payload sin coste de reintento, porque está cacheado.
      systemLocaleLanguage:
        getSystemLocaleLanguage() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })

    // Se reintenta UNA vez si la conexión da error antes de entregar ninguna
    // transcripción. El proxy de conversation-engine puede rechazar
    // reconexiones rápidas —colisión contra el mismo pod, ~1/N_pods— o el
    // upstream de Deepgram de CE puede fallar durante su propia ventana de
    // desmontaje; anthropics/anthropic#287008 lo expone como `TranscriptError`
    // en vez de como silent-drop. Un backoff de 250 ms despeja los dos casos.
    //
    // El audio capturado durante la ventana de reintento se encamina a
    // `audioBuffer` —por el control de `connectionRef.current` a null en el
    // callback de grabación de arriba— y lo vuelca el segundo `onReady`.
    let sawTranscript = false

    // El WebSocket conecta en paralelo con la grabación de audio: primero se
    // reúnen los keyterms —asíncrono pero rápido, sin llamadas a ningún
    // modelo— y luego se conecta.
    //
    // Los callbacks se retiran si ya arrancó una sesión más nueva. Eso impide
    // que un WebSocket zombi de conexión lenta —el usuario soltó, volvió a
    // pulsar, y el primero sigue en handshake— dispare `onReady`/`onError`
    // dentro de la sesión nueva, corrompiendo su `connectionRef` o lanzando un
    // reintento espurio.
    const isStale = () => sessionGenRef.current !== myGen

    const attemptConnect = (keyterms: string[]): void => {
      const myAttemptGen = attemptGenRef.current
      void connectVoiceStream(
        {
          onTranscript: (text: string, isFinal: boolean) => {
            if (isStale()) return
            sawTranscript = true
            logForDebugging(
              `[voice] onTranscript: isFinal=${String(isFinal)} text="${text}"`,
            )
            if (isFinal && text.trim()) {
              if (focusTriggeredRef.current) {
                // Modo focus: cada transcripción final se vuelca de
                // inmediato y la grabación sigue. Da transcripción continua
                // mientras la terminal tenga el focus.
                logForDebugging(
                  `[voice] Focus mode: flushing final transcript immediately: "${text.trim()}"`,
                )
                onTranscriptRef.current(text.trim())
                focusFlushedCharsRef.current += text.trim().length
                setVoiceState(prev => {
                  if (prev.voiceInterimTranscript === '') return prev
                  return { ...prev, voiceInterimTranscript: '' }
                })
                accumulatedRef.current = ''
                // El usuario está hablando: se reinicia el timer de silencio.
                armFocusSilenceTimer()
              } else {
                // Hold-to-talk: las transcripciones finales se acumulan
                // separadas por espacios
                if (accumulatedRef.current) {
                  accumulatedRef.current += ' '
                }
                accumulatedRef.current += text.trim()
                logForDebugging(
                  `[voice] Accumulated final transcript: "${accumulatedRef.current}"`,
                )
                // Se limpia el interim: el final lo sustituye
                setVoiceState(prev => {
                  const preview = accumulatedRef.current
                  if (prev.voiceInterimTranscript === preview) return prev
                  return { ...prev, voiceInterimTranscript: preview }
                })
              }
            } else if (!isFinal) {
              // El habla interim activa reinicia el timer de silencio del
              // modo focus. Nova 3 deshabilita el auto-finalize, así que
              // `isFinal` nunca es true a mitad de stream: sin esto, el timer
              // de 5 s dispararía mientras el usuario habla y desmontaría la
              // sesión.
              if (focusTriggeredRef.current) {
                armFocusSilenceTimer()
              }
              // Muestra los finales acumulados más el interim actual como
              // vista previa en vivo
              const interim = text.trim()
              const preview = accumulatedRef.current
                ? accumulatedRef.current + (interim ? ' ' + interim : '')
                : interim
              setVoiceState(prev => {
                if (prev.voiceInterimTranscript === preview) return prev
                return { ...prev, voiceInterimTranscript: preview }
              })
            }
          },
          onError: (error: string, opts?: { fatal?: boolean }) => {
            if (isStale()) {
              logForDebugging(
                `[voice] ignoring onError from stale session: ${error}`,
              )
              return
            }
            // Se tragan los errores de los intentos ya sustituidos. Cubre el
            // cierre de cola de la conexión 1 después de programar el
            // reintento, Y el evento de cierre de la conexión actual cuando su
            // error ya salió a la superficie abajo —la generación avanza al
            // exponerlo.
            if (attemptGenRef.current !== myAttemptGen) {
              logForDebugging(
                `[voice] ignoring stale onError from superseded attempt: ${error}`,
              )
              return
            }
            // Reintento por fallo temprano: un error del servidor antes de
            // cualquier transcripción suele ser una carrera transitoria del
            // upstream —rechazo de CE, Deepgram no listo—. Se limpia
            // `connectionRef` para que el audio vuelva al buffer, se espera el
            // backoff y se reconecta.
            //
            // Se omite si el usuario ya soltó la tecla —el estado dejó de ser
            // 'recording'—: no tiene sentido reintentar una sesión que él
            // terminó. Un error fatal —el bot challenge de Cloudflare, un
            // rechazo de auth— da el mismo fallo en cada intento, así que cae
            // hasta abajo para exponer el mensaje.
            if (
              !opts?.fatal &&
              !sawTranscript &&
              stateRef.current === 'recording'
            ) {
              if (!retryUsedRef.current) {
                retryUsedRef.current = true
                logForDebugging(
                  `[voice] early voice_stream error (pre-transcript), retrying once: ${error}`,
                )
                logEvent('tengu_voice_stream_early_retry', {})
                connectionRef.current = null
                attemptGenRef.current++
                setTimeout(
                  (stateRef, attemptConnect, keyterms) => {
                    if (stateRef.current === 'recording') {
                      attemptConnect(keyterms)
                    }
                  },
                  250,
                  stateRef,
                  attemptConnect,
                  keyterms,
                )
                return
              }
            }
            // Al exponerlo se avanza la generación, para que el close-error
            // de cola de esta conexión —el WebSocket dispara error y luego
            // close 1006— se lo trague la rama de arriba.
            attemptGenRef.current++
            logError(new Error(`[voice] voice_stream error: ${error}`))
            onErrorRef.current?.(`Voice stream error: ${error}`)
            // El buffer de audio se limpia ante un error, para no filtrar
            // memoria
            audioBuffer.length = 0
            focusTriggeredRef.current = false
            cleanup()
            updateState('idle')
          },
          onClose: () => {
            // no-op; del ciclo de vida se encarga `cleanup()`
          },
          onReady: conn => {
            // Sólo se sigue si el estado aún es 'recording' Y ésta sigue
            // siendo la sesión vigente. Un WebSocket zombi de conexión tardía,
            // de una sesión abandonada, puede pasar el control de 'recording'
            // si el usuario arrancó otra sesión mientras tanto.
            if (isStale() || stateRef.current !== 'recording') {
              conn.close()
              return
            }

            // El WebSocket ya está abierto de verdad: se asigna
            // `connectionRef` para que los callbacks de audio siguientes
            // manden directo en vez de acumular en buffer.
            connectionRef.current = conn
            everConnectedRef.current = true

            // Se vuelcan todos los chunks acumulados mientras el WebSocket
            // conectaba. Es seguro porque `onReady` dispara desde el evento
            // 'open' del WebSocket, lo que garantiza que `send()` no se
            // descarta.
            //
            // Se agrupan en porciones de ~1 s en vez de un `ws.send` por
            // chunk: menos frames de WebSocket es menos sobrecoste en los dos
            // extremos.
            const SLICE_TARGET_BYTES = 32_000 // ~1s at 16kHz/16-bit/mono
            if (audioBuffer.length > 0) {
              let totalBytes = 0
              for (const c of audioBuffer) totalBytes += c.length
              const slices: Buffer[][] = [[]]
              let sliceBytes = 0
              for (const chunk of audioBuffer) {
                if (
                  sliceBytes > 0 &&
                  sliceBytes + chunk.length > SLICE_TARGET_BYTES
                ) {
                  slices.push([])
                  sliceBytes = 0
                }
                slices[slices.length - 1]!.push(chunk)
                sliceBytes += chunk.length
              }
              logForDebugging(
                `[voice] onReady: flushing ${String(audioBuffer.length)} buffered chunks (${String(totalBytes)} bytes) as ${String(slices.length)} coalesced frame(s)`,
              )
              for (const slice of slices) {
                conn.send(Buffer.concat(slice))
              }
            }
            audioBuffer.length = 0

            // Se reinicia el timer de liberación ahora que el WebSocket está
            // listo. Sólo se arma si ya se vio auto-repeat: de lo contrario el
            // delay de repetición del sistema operativo —~500 ms— todavía no
            // transcurrió y el timer dispararía antes de tiempo.
            if (releaseTimerRef.current) {
              clearTimeout(releaseTimerRef.current)
            }
            if (seenRepeatRef.current) {
              releaseTimerRef.current = setTimeout(
                (releaseTimerRef, stateRef, finishRecording) => {
                  releaseTimerRef.current = null
                  if (stateRef.current === 'recording') {
                    finishRecording()
                  }
                },
                RELEASE_TIMEOUT_MS,
                releaseTimerRef,
                stateRef,
                finishRecording,
              )
            }
          },
        },
        {
          language: stt.code,
          keyterms,
        },
      ).then(conn => {
        if (isStale()) {
          conn?.close()
          return
        }
        if (!conn) {
          logForDebugging(
            '[voice] Failed to connect to voice_stream (no OAuth token?)',
          )
          onErrorRef.current?.(
            'Voice mode requires a Claude.ai account. Please run /login to sign in.',
          )
          // El buffer de audio se limpia ante el fallo
          audioBuffer.length = 0
          cleanup()
          updateState('idle')
          return
        }

        // Control de seguridad: si el usuario soltó la tecla antes de que
        // `connectVoiceStream` resolviera —pero después de que `onReady` ya
        // corriera—, se cierra la conexión.
        if (stateRef.current !== 'recording') {
          audioBuffer.length = 0
          conn.close()
          return
        }
      })
    }

    void getVoiceKeyterms().then(attemptConnect)
  }

  // ── Handler de hold-to-talk ─────────────────────────────────────────
  // Se llama en cada pulsación, incluidos los auto-repeats de la terminal
  // mientras la tecla sigue pulsada. Un hueco entre eventos mayor que
  // RELEASE_TIMEOUT_MS se interpreta como que la tecla se soltó.
  //
  // La grabación arranca de inmediato con la primera pulsación, para
  // eliminar el retardo de arranque. El timer de liberación sólo se arma
  // cuando se detecta auto-repeat, y así se evitan liberaciones falsas
  // durante el delay de repetición del sistema operativo, de ~500 ms en
  // macOS.
  const handleKeyEvent = useCallback(
    (fallbackMs = REPEAT_FALLBACK_MS): void => {
      if (!enabled || !isVoiceStreamAvailable()) {
        return
      }

      // En modo focus la grabación la dirige el focus de la terminal, no las
      // pulsaciones.
      if (focusTriggeredRef.current) {
        // Grabación por focus activa: se ignoran los eventos de tecla, porque
        // la sesión termina con el blur.
        return
      }
      if (focusMode && silenceTimedOutRef.current) {
        // La sesión de focus venció por silencio: una pulsación la rearma.
        logForDebugging(
          '[voice] Re-arming focus recording after silence timeout',
        )
        silenceTimedOutRef.current = false
        focusTriggeredRef.current = true
        void startRecordingSession()
        armFocusSilenceTimer()
        return
      }

      const currentState = stateRef.current

      // Se ignoran las pulsaciones mientras se procesa
      if (currentState === 'processing') {
        return
      }

      if (currentState === 'idle') {
        logForDebugging(
          '[voice] handleKeyEvent: idle, starting recording session immediately',
        )
        void startRecordingSession()
        // Respaldo: si no llega ningún auto-repeat dentro de
        // REPEAT_FALLBACK_MS, el timer de liberación se arma igualmente —lo
        // más probable es que el usuario pulsara y soltara.
        repeatFallbackTimerRef.current = setTimeout(
          (
            repeatFallbackTimerRef,
            stateRef,
            seenRepeatRef,
            releaseTimerRef,
            finishRecording,
          ) => {
            repeatFallbackTimerRef.current = null
            if (stateRef.current === 'recording' && !seenRepeatRef.current) {
              logForDebugging(
                '[voice] No auto-repeat seen, arming release timer via fallback',
              )
              seenRepeatRef.current = true
              releaseTimerRef.current = setTimeout(
                (releaseTimerRef, stateRef, finishRecording) => {
                  releaseTimerRef.current = null
                  if (stateRef.current === 'recording') {
                    finishRecording()
                  }
                },
                RELEASE_TIMEOUT_MS,
                releaseTimerRef,
                stateRef,
                finishRecording,
              )
            }
          },
          fallbackMs,
          repeatFallbackTimerRef,
          stateRef,
          seenRepeatRef,
          releaseTimerRef,
          finishRecording,
        )
      } else if (currentState === 'recording') {
        // Segunda pulsación o posterior durante la grabación: el auto-repeat
        // ya arrancó.
        seenRepeatRef.current = true
        if (repeatFallbackTimerRef.current) {
          clearTimeout(repeatFallbackTimerRef.current)
          repeatFallbackTimerRef.current = null
        }
      }

      // El timer de liberación se reinicia en cada pulsación, auto-repeats
      // incluidos
      if (releaseTimerRef.current) {
        clearTimeout(releaseTimerRef.current)
      }

      // El timer de liberación sólo se arma cuando ya se vio auto-repeat. El
      // delay de repetición del sistema operativo es de ~500 ms en macOS: sin
      // esta guarda, el timer de 200 ms dispararía antes de que arrancara la
      // repetición y produciría una liberación falsa.
      if (stateRef.current === 'recording' && seenRepeatRef.current) {
        releaseTimerRef.current = setTimeout(
          (releaseTimerRef, stateRef, finishRecording) => {
            releaseTimerRef.current = null
            if (stateRef.current === 'recording') {
              finishRecording()
            }
          },
          RELEASE_TIMEOUT_MS,
          releaseTimerRef,
          stateRef,
          finishRecording,
        )
      }
    },
    [enabled, focusMode, cleanup],
  )

  // El cleanup corre sólo al deshabilitar o desmontar, NO ante cambios de
  // estado
  useEffect(() => {
    if (!enabled && stateRef.current !== 'idle') {
      cleanup()
      updateState('idle')
    }
    return () => {
      cleanup()
    }
  }, [enabled, cleanup])

  return {
    state,
    handleKeyEvent,
  }
}
