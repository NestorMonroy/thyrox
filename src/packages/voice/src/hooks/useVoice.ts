/**
 * Puerto de `ccnmt: packages/voice/src/hooks/useVoice.ts` (1144 líneas).
 *
 * Cobertura DECLARADA: 3 de 4 exports.
 *
 * Portados VERBATIM (sin dependencia de React, comprobado — ninguno de
 * los tres toca `useState`/`useRef`/`useEffect`/`useCallback`):
 *   - `normalizeLanguageForSTT()` — normaliza un idioma de configuración
 *     a un código BCP-47 soportado por el backend voice_stream.
 *   - `computeLevel()` — RMS de un buffer PCM de 16 bits a [0,1].
 *   - `FIRST_PRESS_FALLBACK_MS` — constante de temporización.
 *   - Constantes/tipos de soporte: `LANGUAGE_NAME_TO_CODE`,
 *     `SUPPORTED_LANGUAGE_CODES`, `DEFAULT_STT_LANGUAGE`,
 *     `RELEASE_TIMEOUT_MS`, `REPEAT_FALLBACK_MS`,
 *     `FOCUS_SILENCE_TIMEOUT_MS`, `AUDIO_LEVEL_BARS`, `VoiceState`,
 *     `UseVoiceOptions`, `UseVoiceReturn`.
 *
 * NO portado: el hook `useVoice()` en sí (líneas 199-1144 de la fuente).
 * Bloqueador MEDIDO, no supuesto: el hook usa `useState`, `useRef`,
 * `useEffect`, `useCallback` de `react` — y `react` no existe como
 * paquete en este árbol (medido con
 * `Bun.resolveSync('react', <dir>)` desde este mismo paquete →
 * "Cannot find package 'react'"). Depende además de
 * `useSetVoiceState` (`../voiceContext.js`, tampoco portado — mismo
 * bloqueador, ver su propio módulo) y de `useTerminalFocus` de
 * `@anthropic/ink`, que tampoco existe en este árbol (0 `.tsx`
 * pre-existentes, 0 dependencia `react`/`ink` en todo `thyrox`).
 *
 * Se conserva la firma exacta (`UseVoiceOptions` → `UseVoiceReturn`) con
 * un cuerpo que difiere `require('react')` — el mismo patrón que
 * `@thyrox/teleport/remote-setup/remote-setup.tsx`'s `call()`: el
 * módulo carga sin fallar; sólo invocar `useVoice()` de verdad (que hoy
 * nada en este árbol hace) dispara el error, con el motivo explícito.
 */

// ─── Language normalization ─────────────────────────────────────────────

const DEFAULT_STT_LANGUAGE = 'en'

// Mapea nombres de idioma (inglés y nativo) a códigos BCP-47 soportados
// por el backend Deepgram de voice_stream. Las claves deben ir en
// minúscula.
//
// Esta lista debe ser un SUBCONJUNTO de la allowlist server-side
// supported_language_codes (GrowthBook: speech_to_text_voice_stream_config).
// Si el CLI envía un código que el servidor rechaza, el WebSocket cierra
// con 1008 "Unsupported language" y la voz se rompe. Los idiomas no
// soportados caen a DEFAULT_STT_LANGUAGE para que la grabación siga
// funcionando.
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

// Subconjunto de la allowlist GrowthBook speech_to_text_voice_stream_config.
// Enviar un código fuera de la allowlist del servidor cierra la conexión.
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

// Normaliza una preferencia de idioma (de settings.language) a un código
// BCP-47 soportado por el endpoint voice_stream. Devuelve el idioma por
// defecto si la entrada no puede resolverse. Cuando la entrada no está
// vacía pero no es soportada, `fellBackFrom` guarda la entrada original
// para que el llamador pueda mostrar una advertencia.
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

// Módulo de voz cargado en diferido. Se difiere la importación de
// voice.ts (y su dependencia nativa audio-capture-napi) hasta que la
// entrada de voz se active de verdad. En macOS, cargar el módulo nativo
// de audio puede disparar un prompt de permiso de micrófono (TCC) — hay
// que evitarlo hasta que la entrada de voz esté realmente habilitada.
type VoiceModule = typeof import('../voice.js')
let voiceModule: VoiceModule | null = null
void voiceModule

export type VoiceState = 'idle' | 'recording' | 'processing'

export type UseVoiceOptions = {
  onTranscript: (text: string) => void
  onError?: (message: string) => void
  enabled: boolean
  focusMode: boolean
}

export type UseVoiceReturn = {
  state: VoiceState
  handleKeyEvent: (fallbackMs?: number) => void
}

// Separación (ms) entre eventos de auto-repetición de tecla que señala
// la liberación de la tecla. La auto-repetición de terminal suele
// disparar cada 30-80ms; 200ms cubre el jitter cómodamente sin dejar de
// sentirse responsivo.
const RELEASE_TIMEOUT_MS = 200

// Fallback (ms) para armar el timer de liberación si no se ve
// auto-repetición. El delay de repetición por defecto de macOS es
// ~500ms; 600ms da margen. Si el usuario tocó y soltó antes de que
// empezara la auto-repetición, esto asegura que el timer de liberación
// se arme y la grabación se detenga.
//
// Para activación por combinación de modificador en la primera pulsación
// (handleKeyEvent llamado en t=0, antes de cualquier auto-repetición),
// los llamadores deben pasar FIRST_PRESS_FALLBACK_MS en su lugar — la
// separación hasta la siguiente pulsación es el *delay* inicial de
// repetición del SO (hasta ~2s en macOS con el slider en "Long"), no la
// *tasa* de repetición.
const REPEAT_FALLBACK_MS = 600
void REPEAT_FALLBACK_MS
export const FIRST_PRESS_FALLBACK_MS = 2000

// Cuánto tiempo (ms) mantener viva una sesión de modo foco sin ningún
// habla antes de destruirla para liberar la conexión WebSocket. Se
// rearma en el siguiente ciclo de foco (blur → refoco).
const FOCUS_SILENCE_TIMEOUT_MS = 5_000
void FOCUS_SILENCE_TIMEOUT_MS

// Número de barras mostradas en el visualizador de forma de onda de
// grabación.
const AUDIO_LEVEL_BARS = 16
void AUDIO_LEVEL_BARS

// Calcula la amplitud RMS de un buffer PCM firmado de 16 bits y la
// devuelve normalizada en [0,1]. Una curva de raíz cuadrada reparte los
// niveles más silenciosos sobre más rango visual para que la forma de
// onda use el conjunto completo de alturas de bloque.
export function computeLevel(chunk: Buffer): number {
  const samples = chunk.length >> 1 // 16 bits = 2 bytes por muestra
  if (samples === 0) return 0
  let sumSq = 0
  for (let i = 0; i < chunk.length - 1; i += 2) {
    // Lee un entero de 16 bits firmado little-endian
    const sample = ((chunk[i]! | (chunk[i + 1]! << 8)) << 16) >> 16
    sumSq += sample * sample
  }
  const rms = Math.sqrt(sumSq / samples)
  const normalized = Math.min(rms / 2000, 1)
  return Math.sqrt(normalized)
}

/**
 * NO PORTADO — ver docstring del módulo. `require('react')` diferido:
 * el módulo carga sin fallar (nada aquí es un import estático de
 * `react`); sólo invocar `useVoice()` de verdad dispara el error.
 */
export function useVoice(_options: UseVoiceOptions): UseVoiceReturn {
  // `react` no existe como paquete en este árbol (medido con
  // Bun.resolveSync arriba en el docstring del módulo). Se resuelve con
  // require() diferido — es la ÚNICA excepción admitida a "sin lazy
  // imports": el especificador no resuelve hoy, no una preferencia de
  // estilo.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react')
  throw new Error(
    'useVoice() no está portado: depende de react, de useSetVoiceState ' +
      '(../voiceContext.js) y de @anthropic/ink#useTerminalFocus, ' +
      'ninguno de los tres presente en este árbol. Los tres exports ' +
      'puros del módulo (normalizeLanguageForSTT, computeLevel, ' +
      'FIRST_PRESS_FALLBACK_MS) sí están portados y son usables.',
  )
}
