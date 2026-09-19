/**
 * Puerto de `ccnmt: packages/voice/src/hooks/useVoiceIntegration.tsx`
 * (720 líneas), 100 % portado.
 *
 * Mismo criterio de reescritura que `./useVoice.ts`: el alcance
 * `@claude-code-how-works/` pasa a `@thyrox/` sólo en líneas de specifier;
 * `@anthropic/` y `bun:bundle` quedan intactos, y los comentarios en
 * inglés de la fuente no se traducen.
 *
 * EL BLOQUEADOR DECLARADO ANTES ESTABA RANCIO EN SUS DOS CAPAS — verificado
 * por conducta el 2026-09-19T07:41:39:
 *
 *   1. `react` resuelve a 19.3.0 (ver `./useVoice.ts`).
 *   2. `@anthropic/ink` y `@thyrox/repl` NO están ausentes. El docstring
 *      anterior afirmaba `find src/packages -maxdepth 1 -iname repl` → 0
 *      resultados; medido hoy, `src/packages/repl` existe y su `exports`
 *      declara `./notifications.js` → `./src/notifications.ts` y
 *      `./overlayContext.js` → `./src/overlayContext.tsx`, los dos
 *      presentes en disco. Lo que faltaba era la DECLARACIÓN en el
 *      `package.json` de este paquete, no el paquete.
 *
 * Ese `-maxdepth 1 -iname repl` es el sub-patrón C: midió el nombre de un
 * directorio y concluyó sobre la existencia de una capa entera. Ver
 * H-THYROX-116.
 */
import { feature } from 'bun:bundle'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useNotifications } from '@thyrox/repl/notifications.js'
import { useIsModalOverlayActive } from '@thyrox/repl/overlayContext.js'
import {
  useGetVoiceState,
  useSetVoiceState,
  useVoiceState,
} from '../voiceContext.js'
import { KeyboardEvent, useInput } from '@anthropic/ink'
// Puente de retrocompatibilidad hasta que el REPL cablee `handleKeyDown` a
// `<Box onKeyDown>`
import { useOptionalKeybindingContext } from '@anthropic/ink/keybindings'
import { keystrokesEqual } from '@anthropic/ink/keybindings'
import type { ParsedKeystroke } from '@anthropic/ink/keybindings'
import { normalizeFullWidthSpace } from '@thyrox/output/utils/stringUtils.js'
import { useVoiceEnabled } from './useVoiceEnabled.js'

// Eliminación de código muerto: el import del hook de entrada de voz es
// condicional.
/* eslint-disable @typescript-eslint/no-require-imports */
// Se captura el NAMESPACE del módulo, no la función: `spyOn()` muta el objeto
// del módulo, así que `voiceNs.useVoice(...)` resuelve al spy aunque este
// módulo se hubiera cargado antes de instalarlo. Eso da independencia del
// orden de los tests.
const voiceNs: { useVoice: typeof import('./useVoice.js').useVoice } = feature(
  'VOICE_MODE',
)
  ? require('./useVoice.js')
  : {
      useVoice: ({
        enabled: _e,
      }: {
        onTranscript: (t: string) => void
        enabled: boolean
      }) => ({
        state: 'idle' as const,
        handleKeyEvent: (_fallbackMs?: number) => {},
      }),
    }
/* eslint-enable @typescript-eslint/no-require-imports */

// Hueco máximo (ms) entre pulsaciones para contarlas como tecla mantenida,
// es decir auto-repeat. El auto-repeat de la terminal dispara cada 30-80 ms;
// 120 ms absorbe el jitter y deja fuera la velocidad normal de tecleo, que
// está entre 100 y 300 ms por pulsación.
const RAPID_KEY_GAP_MS = 120

// Respaldo (ms) para la activación por primera pulsación de un combo con
// modificador. Tiene que coincidir con FIRST_PRESS_FALLBACK_MS de
// `useVoice.ts`.
//
// Cubre el delay inicial máximo de repetición del sistema operativo —~2 s en
// macOS con el slider en «Long»— para que mantener un combo no se fragmente
// en dos sesiones cuando el primer auto-repeat llega después de los 600 ms
// por defecto de REPEAT_FALLBACK_MS.
const MODIFIER_FIRST_PRESS_FALLBACK_MS = 2000

// Cuántos eventos de tecla rápidos y consecutivos hacen falta para activar la
// voz. Sólo aplica a los bindings de carácter desnudo —espacio, v, etc.—
// donde una sola pulsación podría ser tecleo normal. Un combo con modificador
// activa en la primera.
const HOLD_THRESHOLD = 5

// Cuántos eventos rápidos bastan para empezar a mostrar el feedback de
// warmup.
const WARMUP_THRESHOLD = 2

// Empareja un `KeyboardEvent` con un `ParsedKeystroke`. Sustituye al camino
// legacy `matchesKeystroke(input, Key, ...)`, que asumía el argumento `input`
// crudo de `useInput`.
//
// `KeyboardEvent.key` lleva nombres normalizados —'space', 'f9'— que
// `getKeyName()` no manejaba, así que los combos con modificador y las teclas
// de función dejaron de emparejar EN SILENCIO tras la migración a `onKeyDown`
// (#23524).
function matchesKeyboardEvent(
  e: KeyboardEvent,
  target: ParsedKeystroke,
): boolean {
  // `KeyboardEvent` guarda nombres de tecla; `ParsedKeystroke` guarda ' ' para
  // el espacio y 'enter' para el retorno (ver los casos 'space'/'return' de
  // `parser.ts`).
  const key =
    e.key === 'space' ? ' ' : e.key === 'return' ? 'enter' : e.key.toLowerCase()
  if (key !== target.key) return false
  if (e.ctrl !== target.ctrl) return false
  if (e.shift !== target.shift) return false
  // `KeyboardEvent.meta` colapsa alt y option —limitación de la terminal, que
  // los manda con prefijo esc—; en `ParsedKeystroke`, alt y meta son alias de
  // lo mismo.
  if (e.meta !== (target.alt || target.meta)) return false
  if (e.superKey !== target.super) return false
  return true
}

// Valor por defecto fijo para cuando no hay ningún `KeybindingProvider` —
// contextos headless o de test.
//
// NO se usa cuando el provider existe y la consulta devuelve null: eso
// significa que el usuario desligó la tecla o reasignó el espacio, y caer al
// espacio elegiría una tecla muerta o en conflicto.
const DEFAULT_VOICE_KEYSTROKE: ParsedKeystroke = {
  key: ' ',
  ctrl: false,
  alt: false,
  shift: false,
  meta: false,
  super: false,
}

type InsertTextHandle = {
  insert: (text: string) => void
  setInputWithCursor: (value: string, cursor: number) => void
  cursorOffset: number
}

type UseVoiceIntegrationArgs = {
  setInputValueRaw: React.Dispatch<React.SetStateAction<string>>
  inputValueRef: React.RefObject<string>
  insertTextRef: React.RefObject<InsertTextHandle | null>
}

type InterimRange = { start: number; end: number }

type StripOpts = {
  // Qué carácter se retira: la tecla de mantener configurada. Por defecto, el
  // espacio.
  char?: string
  // Captura el ancla de prefijo y sufijo de voz en la posición retirada.
  anchor?: boolean
  // Mínimo de caracteres finales que hay que dejar: impide retirar los
  // caracteres de warmup intencionales al limpiar fugas de forma defensiva.
  floor?: number
}

type UseVoiceIntegrationResult = {
  // Devuelve cuántos caracteres finales quedan tras el retiro.
  stripTrailing: (maxStrip: number, opts?: StripOpts) => number
  // Deshace el espacio de hueco y reinicia las refs de ancla tras una
  // activación de voz fallida.
  resetAnchor: () => void
  handleKeyEvent: (fallbackMs?: number) => void
  interimRange: InterimRange | null
}

export function useVoiceIntegration({
  setInputValueRaw,
  inputValueRef,
  insertTextRef,
}: UseVoiceIntegrationArgs): UseVoiceIntegrationResult {
  const { addNotification } = useNotifications()

  // Registra el contenido del input antes y después del cursor cuando arranca
  // la voz, para poder insertar las transcripciones interim en la posición del
  // cursor sin pisar el texto que el usuario tiene alrededor.
  const voicePrefixRef = useRef<string | null>(null)
  const voiceSuffixRef = useRef<string>('')
  // Registra el último valor de input que ESTE hook escribió, sea por el
  // ancla, por el efecto de interim o por `handleVoiceTranscript`. Si
  // `inputValueRef.current` diverge, el usuario envió o editó, y los dos
  // caminos de escritura se retiran para no pisarlo.
  //
  // Es la única guarda que maneja bien el caso de prefijo y sufijo vacíos: un
  // control con `startsWith('')`/`endsWith('')` pasa de forma vacua, y uno de
  // longitud no distingue un input que se limpió de uno que nunca se fijó.
  const lastSetInputRef = useRef<string | null>(null)

  // Retira los caracteres de la hold-key que quedan al final (y, si se pide,
  // captura el anchor de voz). Se llama durante el warmup —para limpiar los
  // caracteres que se colaron pese a `stopImmediatePropagation`, porque el
  // orden de los listeners no está garantizado— y en la activación (con
  // `anchor=true`, para capturar el prefijo y el sufijo alrededor del cursor
  // donde se colocará el interim transcript). Quien llama pasa el conteo
  // exacto que espera retirar, de modo que los caracteres preexistentes en el
  // límite se conservan (p. ej. la «v» de «hav» cuando la hold-key es «v»).
  // La opción `floor` fija un mínimo de caracteres finales que se dejan
  // (durante el warmup es el conteo que se deja pasar a propósito, así que la
  // limpieza defensiva sólo retira lo que se filtró). Devuelve cuántos
  // caracteres finales quedan tras retirar. Si nada cambia, no se actualiza
  // el estado.
  const stripTrailing = useCallback(
    (
      maxStrip: number,
      { char = ' ', anchor = false, floor = 0 }: StripOpts = {},
    ) => {
      const prev = inputValueRef.current
      const offset = insertTextRef.current?.cursorOffset ?? prev.length
      const beforeCursor = prev.slice(0, offset)
      const afterCursor = prev.slice(offset)
      // Cuando la hold-key es el espacio, cuenta también los espacios de
      // ancho completo (U+3000) que un IME CJK pudo insertar por la misma
      // tecla física. U+3000 está en el BMP y ocupa una sola unidad de
      // código, así que los índices siguen alineados con `beforeCursor`.
      const scan =
        char === ' ' ? normalizeFullWidthSpace(beforeCursor) : beforeCursor
      let trailing = 0
      while (
        trailing < scan.length &&
        scan[scan.length - 1 - trailing] === char
      ) {
        trailing++
      }
      const stripCount = Math.max(0, Math.min(trailing - floor, maxStrip))
      const remaining = trailing - stripCount
      const stripped = beforeCursor.slice(0, beforeCursor.length - stripCount)
      // Al anclar con un sufijo que no empieza por espacio, se inserta un
      // espacio de separación para que el cursor del waveform se pose sobre
      // él en vez de tapar la primera letra del sufijo. El efecto del interim
      // transcript mantiene esta misma estructura (prefijo + inicio + interim
      // + final + sufijo), así que la separación es continua en cuanto llega
      // el texto transcrito.
      // Al anclar se sobreescribe siempre: si una activación previa no logró
      // arrancar la voz (`voiceState` se quedó en 'idle'), el efecto de
      // limpieza no disparó y el anchor viejo quedó obsoleto. `anchor=true`
      // sólo se pasa en la única llamada de activación, nunca durante la
      // grabación, así que sobreescribir es seguro.
      let gap = ''
      if (anchor) {
        voicePrefixRef.current = stripped
        voiceSuffixRef.current = afterCursor
        if (afterCursor.length > 0 && !/^\s/.test(afterCursor)) {
          gap = ' '
        }
      }
      const newValue = stripped + gap + afterCursor
      if (anchor) lastSetInputRef.current = newValue
      if (newValue === prev && stripCount === 0) return remaining
      if (insertTextRef.current) {
        insertTextRef.current.setInputWithCursor(newValue, stripped.length)
      } else {
        setInputValueRaw(newValue)
      }
      return remaining
    },
    [setInputValueRaw, inputValueRef, insertTextRef],
  )

  // Deshace el espacio de separación que insertó `stripTrailing(...,
  // {anchor:true})` y reinicia las refs de prefijo y sufijo de voz. Se llama
  // cuando la activación de voz falla (`voiceState` se queda en 'idle' tras
  // `voiceHandleKeyEvent`), porque el efecto de limpieza (el `useEffect` de
  // `voiceState` de más abajo) —que sólo dispara en una transición de
  // `voiceState`— no alcanza al anchor obsoleto. Sin esto, el espacio de
  // separación y las refs viejas se quedan en el input.
  const resetAnchor = useCallback(() => {
    const prefix = voicePrefixRef.current
    if (prefix === null) return
    const suffix = voiceSuffixRef.current
    voicePrefixRef.current = null
    voiceSuffixRef.current = ''
    const restored = prefix + suffix
    if (insertTextRef.current) {
      insertTextRef.current.setInputWithCursor(restored, prefix.length)
    } else {
      setInputValueRaw(restored)
    }
  }, [setInputValueRaw, insertTextRef])

  // Selectores del estado de voz. `useVoiceEnabled` = intención del usuario
  // (settings) + auth + kill-switch de GrowthBook, con la mitad de auth
  // memoizada sobre `authVersion` para que un bucle de render nunca dispare
  // un arranque en frío del keychain.
  const voiceEnabled = feature('VOICE_MODE') ? useVoiceEnabled() : false
  const voiceState = feature('VOICE_MODE')
    ?
      useVoiceState(s => s.voiceState)
    : ('idle' as const)
  const voiceInterimTranscript = feature('VOICE_MODE')
    ?
      useVoiceState(s => s.voiceInterimTranscript)
    : ''

  // Fija el anchor de voz para el focus mode, donde la grabación arranca por
  // el focus del terminal y no por mantener la tecla. Con hold-key el anchor
  // lo fija `stripTrailing`.
  useEffect(() => {
    if (!feature('VOICE_MODE')) return
    if (voiceState === 'recording' && voicePrefixRef.current === null) {
      const input = inputValueRef.current
      const offset = insertTextRef.current?.cursorOffset ?? input.length
      voicePrefixRef.current = input.slice(0, offset)
      voiceSuffixRef.current = input.slice(offset)
      lastSetInputRef.current = input
    }
    if (voiceState === 'idle') {
      voicePrefixRef.current = null
      voiceSuffixRef.current = ''
      lastSetInputRef.current = null
    }
  }, [voiceState, inputValueRef, insertTextRef])

  // Actualiza el input del prompt en vivo con el interim transcript conforme
  // la voz transcribe. El prefijo —lo que el usuario escribió antes del
  // cursor— se conserva, y lo transcrito se inserta entre prefijo y sufijo.
  useEffect(() => {
    if (!feature('VOICE_MODE')) return
    if (voicePrefixRef.current === null) return
    const prefix = voicePrefixRef.current
    const suffix = voiceSuffixRef.current
    // Carrera con el submit: si el input no es lo último que este hook fijó,
    // el usuario lo envió (dejándolo vacío) o lo editó. `voicePrefixRef` sólo
    // se limpia en la transición `voiceState`→idle, así que sigue asignada
    // durante la ventana de 'processing' entre `CloseStream` y el cierre del
    // WebSocket: esto ataja un `TranscriptText` refinado que llegue entonces
    // y vuelva a llenar un input ya vaciado.
    if (inputValueRef.current !== lastSetInputRef.current) return
    const needsSpace =
      prefix.length > 0 &&
      !/\s$/.test(prefix) &&
      voiceInterimTranscript.length > 0
    // No se condiciona a `voiceInterimTranscript.length`: cuando el interim se
    // vacía a '' después de que `handleVoiceTranscript` fija el texto final,
    // el espacio entre prefijo y sufijo tiene que conservarse igual.
    const needsTrailingSpace = suffix.length > 0 && !/^\s/.test(suffix)
    const leadingSpace = needsSpace ? ' ' : ''
    const trailingSpace = needsTrailingSpace ? ' ' : ''
    const newValue =
      prefix + leadingSpace + voiceInterimTranscript + trailingSpace + suffix
    // Coloca el cursor después del texto transcrito, antes del sufijo
    const cursorPos =
      prefix.length + leadingSpace.length + voiceInterimTranscript.length
    if (insertTextRef.current) {
      insertTextRef.current.setInputWithCursor(newValue, cursorPos)
    } else {
      setInputValueRaw(newValue)
    }
    lastSetInputRef.current = newValue
  }, [voiceInterimTranscript, setInputValueRaw, inputValueRef, insertTextRef])

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      if (!feature('VOICE_MODE')) return
      const prefix = voicePrefixRef.current
      // Sin anchor de voz: la voz se reinició, o nunca arrancó. Nada que hacer.
      if (prefix === null) return
      const suffix = voiceSuffixRef.current
      // Carrera con el submit: `finishRecording()` → el usuario pulsa Enter
      // (el input queda vacío) → cierra el WebSocket → este callback dispara
      // con un prefijo y un sufijo ya obsoletos. Si el input no es lo último
      // que este hook fijó (por el efecto del interim o por el anchor), el
      // usuario envió o editó: no se vuelve a llenar. Comparar contra
      // `text.length` daría un falso positivo cuando el final es más largo
      // que el interim, cosa que el ASR hace de rutina al añadir puntuación
      // o correcciones.
      if (inputValueRef.current !== lastSetInputRef.current) return
      const needsSpace =
        prefix.length > 0 && !/\s$/.test(prefix) && text.length > 0
      const needsTrailingSpace =
        suffix.length > 0 && !/^\s/.test(suffix) && text.length > 0
      const leadingSpace = needsSpace ? ' ' : ''
      const trailingSpace = needsTrailingSpace ? ' ' : ''
      const newInput = prefix + leadingSpace + text + trailingSpace + suffix
      // Coloca el cursor después del texto transcrito, antes del sufijo
      const cursorPos = prefix.length + leadingSpace.length + text.length
      if (insertTextRef.current) {
        insertTextRef.current.setInputWithCursor(newInput, cursorPos)
      } else {
        setInputValueRaw(newInput)
      }
      lastSetInputRef.current = newInput
      // Extiende el prefijo con este fragmento para que el focus mode pueda
      // seguir añadiendo los transcripts siguientes a continuación.
      voicePrefixRef.current = prefix + leadingSpace + text
    },
    [setInputValueRaw, inputValueRef, insertTextRef],
  )

  const voice = voiceNs.useVoice({
    onTranscript: handleVoiceTranscript,
    onError: (message: string) => {
      addNotification({
        key: 'voice-error',
        text: message,
        color: 'error',
        priority: 'immediate',
        timeoutMs: 10_000,
      })
    },
    enabled: voiceEnabled,
    focusMode: false,
  })

  // Calcula el rango de caracteres que ocupa el interim transcript —el texto
  // aún no finalizado— dentro del valor del input, para que la UI lo atenúe.
  const interimRange = useMemo((): InterimRange | null => {
    if (!feature('VOICE_MODE')) return null
    if (voicePrefixRef.current === null) return null
    if (voiceInterimTranscript.length === 0) return null
    const prefix = voicePrefixRef.current
    const needsSpace =
      prefix.length > 0 &&
      !/\s$/.test(prefix) &&
      voiceInterimTranscript.length > 0
    const start = prefix.length + (needsSpace ? 1 : 0)
    const end = start + voiceInterimTranscript.length
    return { start, end }
  }, [voiceInterimTranscript])

  return {
    stripTrailing,
    resetAnchor,
    handleKeyEvent: voice.handleKeyEvent,
    interimRange,
  }
}

/**
 * Componente que gobierna la activación de voz en hold-to-talk.
 *
 * La tecla de activación se configura por keybinding (`voice:pushToTalk`,
 * espacio por defecto). Detectar que la tecla se mantiene depende de que el
 * auto-repeat del sistema operativo entregue un flujo de eventos cada 30-80
 * ms. Funcionan dos tipos de binding:
 *
 * **Modificador + letra (meta+k, ctrl+x, alt+v):** el caso más limpio.
 * Activa en la primera pulsación, porque una combinación con modificador es
 * intención inequívoca —no se teclea por accidente— y por eso no aplica
 * ningún umbral de hold. La parte de letra hace auto-repeat mientras se
 * mantiene, que es lo que alimenta la detección de release en `useVoice.ts`.
 * Ni flow-through ni retirada de caracteres.
 *
 * **Caracteres sueltos (space, v, x):** exigen `HOLD_THRESHOLD` pulsaciones
 * rápidas para activar, porque un solo espacio podría ser escritura normal.
 * Las primeras `WARMUP_THRESHOLD` pulsaciones pasan al input (flow-through)
 * para que una pulsación suelta escriba como siempre. A partir de ahí las
 * pulsaciones rápidas se tragan, y al activar se retiran los caracteres que
 * pasaron. Enlazar «v» no vuelve la «v» intecleable: la escritura normal
 * —más de 120 ms entre pulsaciones— pasa igual, y sólo el auto-repeat rápido
 * de una tecla mantenida dispara la activación.
 *
 * Casos rotos conocidos: modificador+espacio (NUL, que se analiza como
 * ctrl+backtick) y los acordes (secuencias discretas, sin hold). La
 * validación avisa de ambos.
 */
export function useVoiceKeybindingHandler({
  voiceHandleKeyEvent,
  stripTrailing,
  resetAnchor,
  isActive,
}: {
  voiceHandleKeyEvent: (fallbackMs?: number) => void
  stripTrailing: (maxStrip: number, opts?: StripOpts) => number
  resetAnchor: () => void
  isActive: boolean
}): { handleKeyDown: (e: KeyboardEvent) => void } {
  const getVoiceState = useGetVoiceState()
  const setVoiceState = useSetVoiceState()
  const keybindingContext = useOptionalKeybindingContext()
  const isModalOverlayActive = useIsModalOverlayActive()
  const voiceEnabled = feature('VOICE_MODE') ? useVoiceEnabled() : false
  const voiceState = feature('VOICE_MODE')
    ?
      useVoiceState(s => s.voiceState)
    : 'idle'

  // Busca en el contexto de keybindings la tecla configurada para
  // `voice:pushToTalk`. El recorrido va hacia delante y gana el último, igual
  // que el resolver: si un binding de Chat posterior sobreescribe el mismo
  // acorde con null o con otra acción, el binding de voz se descarta y se
  // devuelve null — el usuario deshabilitó el hold-to-talk de forma explícita
  // con esa sobreescritura, así que no se le contradice con un respaldo. El
  // DEFAULT sólo se usa cuando no hay provider en absoluto. El filtro por
  // contexto es obligatorio: el espacio también está enlazado en
  // Settings/Confirmation/Plugin (`select:accept` y demás), y sin el filtro
  // ésos anularían el default.
  const voiceKeystroke = useMemo((): ParsedKeystroke | null => {
    if (!keybindingContext) return DEFAULT_VOICE_KEYSTROKE
    let result: ParsedKeystroke | null = null
    for (const binding of keybindingContext.bindings) {
      if (binding.context !== 'Chat') continue
      if (binding.chord.length !== 1) continue
      const ks = binding.chord[0]
      if (!ks) continue
      if (binding.action === 'voice:pushToTalk') {
        result = ks
      } else if (result !== null && keystrokesEqual(ks, result)) {
        // Un binding posterior sobreescribe este acorde (desenlace con null
        // o reasignación)
        result = null
      }
    }
    return result
  }, [keybindingContext])

  // Si el binding es un único carácter imprimible suelto, sin modificador, el
  // auto-repeat del terminal puede agrupar N pulsaciones en un solo evento de
  // entrada (p. ej. «vvv») y el carácter pasa al input de texto: hacen falta
  // flow-through y retirada. Las combinaciones con modificador (meta+k,
  // ctrl+x) también hacen auto-repeat —repite la parte de letra— pero no
  // insertan texto, así que se tragan desde la primera pulsación y no hay
  // nada que retirar. De ésas se encarga `matchesKeyboardEvent`.
  const bareChar =
    voiceKeystroke !== null &&
    voiceKeystroke.key.length === 1 &&
    !voiceKeystroke.ctrl &&
    !voiceKeystroke.alt &&
    !voiceKeystroke.shift &&
    !voiceKeystroke.meta &&
    !voiceKeystroke.super
      ? voiceKeystroke.key
      : null

  const rapidCountRef = useRef(0)
  // Cuántos caracteres rápidos se dejan pasar a propósito al input de texto
  // (los primeros `WARMUP_THRESHOLD`). La retirada de la activación quita
  // hasta esa cantidad más la posible fuga del evento que activó. Con el
  // default —el espacio— la cuenta es precisa, porque es raro que el texto ya
  // terminara en espacios. Con un binding de letra (la validación avisa) puede
  // retirar de más un carácter preexistente si el input ya terminaba en la
  // letra enlazada (p. ej. «hav» + mantener «v» → «ha»). Ese límite no se
  // rastrea: es lo mejor que se puede hacer, y el aviso lo declara.
  const charsInInputRef = useRef(0)
  // Cuántos caracteres finales quedan tras la retirada de la activación:
  // pertenecen al prefijo anclado del usuario y hay que conservarlos durante
  // la limpieza defensiva de fugas de la grabación.
  const recordingFloorRef = useRef(0)
  // Verdadero cuando la grabación en curso arrancó manteniendo la tecla, no
  // por focus. Sirve para no tragarse las pulsaciones durante una grabación
  // en focus mode.
  const isHoldActiveRef = useRef(false)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reinicia el estado del hold en cuanto se sale de 'recording'. El hold
  // físico termina cuando cesa el auto-repeat (estado → 'processing'), y dejar
  // la ref asignada durante 'processing' se tragaría los espacios nuevos que
  // el usuario teclee mientras se finaliza el transcript.
  useEffect(() => {
    if (voiceState !== 'recording') {
      isHoldActiveRef.current = false
      rapidCountRef.current = 0
      charsInInputRef.current = 0
      recordingFloorRef.current = 0
      setVoiceState(prev => {
        if (!prev.voiceWarmingUp) return prev
        return { ...prev, voiceWarmingUp: false }
      })
    }
  }, [voiceState, setVoiceState])

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (!voiceEnabled) return

    // `PromptInput` no es un destino válido para el transcript: la hold-key
    // pasa de largo en vez de tragarse hacia refs obsoletas (#33556).
    // Son dos caminos distintos de desmontaje o pérdida de focus, y hacen
    // falta los dos:
    //   - `!isActive`: un comando local-jsx ocultó `PromptInput`
    //     (`shouldHidePromptInput`) sin registrar un overlay — p. ej.
    //     /install-github-app, /plugin. Refleja la guarda `isActive` de
    //     `CommandKeybindingHandlers`.
    //   - `isModalOverlayActive`: un overlay (diálogo de permiso, `Select` con
    //     `onCancel`) tiene el focus; `PromptInput` está montado pero con
    //     `focus=false`.
    if (!isActive || isModalOverlayActive) return

    // null significa que el usuario sobreescribió el default (desenlace con
    // null o reasignación): el hold-to-talk está deshabilitado por binding.
    // Para activar o desactivar la funcionalidad misma se usa /voice.
    if (voiceKeystroke === null) return

    // Compara contra la tecla configurada. Un carácter suelto se compara por
    // contenido —así cubre el auto-repeat agrupado tipo «vvv»— y se rechaza si
    // trae modificador, para que ctrl+v no dispare un binding de «v». Las
    // combinaciones con modificador pasan por `matchesKeyboardEvent`, que
    // recibe un evento por repetición y sin agrupar.
    let repeatCount: number
    if (bareChar !== null) {
      if (e.ctrl || e.meta || e.shift) return
      // Con el espacio enlazado se acepta también U+3000, el espacio de ancho
      // completo que los IME CJK emiten por la misma tecla física.
      const normalized =
        bareChar === ' ' ? normalizeFullWidthSpace(e.key) : e.key
      // Camino rápido: la escritura normal —cualquier carácter que no sea el
      // enlazado— sale aquí sin reservar memoria. El control con `repeat()`
      // sólo importa para el auto-repeat agrupado (`input.length > 1`), que
      // es raro.
      if (normalized[0] !== bareChar) return
      if (
        normalized.length > 1 &&
        normalized !== bareChar.repeat(normalized.length)
      )
        return
      repeatCount = normalized.length
    } else {
      if (!matchesKeyboardEvent(e, voiceKeystroke)) return
      repeatCount = 1
    }

    // Guarda: sólo se tragan las pulsaciones cuando la grabación arrancó
    // manteniendo la tecla. La grabación en focus mode también pone
    // `voiceState` en 'recording', pero ahí las pulsaciones tienen que pasar
    // con normalidad (`voiceHandleKeyEvent` sale temprano en las sesiones que
    // arrancan por focus). Se consulta además `voiceState` en el store para
    // que, si `voiceHandleKeyEvent()` no logra la transición —módulo sin
    // cargar, stream no disponible—, no se traguen las pulsaciones para
    // siempre.
    const currentVoiceState = getVoiceState().voiceState
    if (isHoldActiveRef.current && currentVoiceState !== 'idle') {
      // Ya está grabando: se tragan las pulsaciones que siguen y se
      // reenvían a la voz para detectar el release. Con caracteres sueltos
      // se retira de forma defensiva, por si el handler del input de texto
      // disparó antes que éste — el orden de los listeners no está
      // garantizado. Las combinaciones con modificador no insertan texto,
      // así que no hay nada que retirar.
      e.stopImmediatePropagation()
      if (bareChar !== null) {
        stripTrailing(repeatCount, {
          char: bareChar,
          floor: recordingFloorRef.current,
        })
      }
      voiceHandleKeyEvent()
      return
    }

    // Hay una grabación que no viene de hold (focus mode), o un
    // 'processing' en curso. Las combinaciones con modificador no deben
    // reactivar: `stripTrailing(0,{anchor:true})` sobreescribiría
    // `voicePrefixRef` con texto del interim y duplicaría el transcript en la
    // siguiente actualización. Antes de #22144, una pulsación suelta caía en
    // la rama `else` del warmup, que sólo traga. Los caracteres sueltos pasan
    // sin condición: el usuario puede estar escribiendo mientras graba por
    // focus.
    if (currentVoiceState !== 'idle') {
      if (bareChar === null) e.stopImmediatePropagation()
      return
    }

    const countBefore = rapidCountRef.current
    rapidCountRef.current += repeatCount

    // ── Activación ────────────────────────────────────────────
    // Va primero para que la rama de warmup de más abajo NO corra también
    // en este evento: dos llamadas a la retirada en el mismo tick leerían
    // las dos el `inputValueRef` ya obsoleto, y la segunda retiraría de
    // menos. Las combinaciones con modificador activan en la primera
    // pulsación, porque no se teclean por accidente, así que no aplica el
    // umbral de hold —que existe para distinguir teclear un espacio de
    // mantenerlo pulsado—.
    if (bareChar === null || rapidCountRef.current >= HOLD_THRESHOLD) {
      e.stopImmediatePropagation()
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }
      rapidCountRef.current = 0
      isHoldActiveRef.current = true
      setVoiceState(prev => {
        if (!prev.voiceWarmingUp) return prev
        return { ...prev, voiceWarmingUp: false }
      })
      if (bareChar !== null) {
        // Retira los caracteres del warmup que se dejaron pasar a propósito
        // más la fuga de este evento, si el input de texto disparó antes. El
        // tope cubre ambos, y el `min(trailing)` cubre el caso sin fuga. Aquí
        // se ancla el prefijo de voz. Lo que devuelve —los que quedan— pasa a
        // ser el `floor` de la limpieza de fugas durante la grabación.
        recordingFloorRef.current = stripTrailing(
          charsInInputRef.current + repeatCount,
          { char: bareChar, anchor: true },
        )
        charsInInputRef.current = 0
        voiceHandleKeyEvent()
      } else {
        // Combinación con modificador: no insertó nada, no hay nada que
        // retirar. Sólo se ancla el prefijo de voz en la posición actual del
        // cursor. El respaldo es más largo porque esta llamada ocurre en t=0,
        // antes del auto-repeat: el hueco hasta la siguiente pulsación es el
        // *retardo* inicial de repetición del sistema operativo (hasta ~2 s),
        // no la *frecuencia* de repetición (~30-80 ms).
        stripTrailing(0, { anchor: true })
        voiceHandleKeyEvent(MODIFIER_FIRST_PRESS_FALLBACK_MS)
      }
      // Si la voz no logró la transición —módulo sin cargar, stream no
      // disponible, `enabled` obsoleto— se limpia la ref para que una
      // grabación posterior en focus mode no herede un estado de hold viejo
      // y se trague las pulsaciones. El store es síncrono, así que la
      // comprobación es inmediata. El anchor que fijó `stripTrailing` arriba
      // se sobreescribe en el reintento: anclar ahora sobreescribe siempre.
      if (getVoiceState().voiceState === 'idle') {
        isHoldActiveRef.current = false
        resetAnchor()
      }
      return
    }

    // ── Warmup (sólo carácter suelto; las combinaciones activaron arriba) ──
    // Los primeros `WARMUP_THRESHOLD` caracteres pasan al input de texto para
    // que la escritura normal tenga latencia cero: una pulsación suelta
    // escribe como siempre. Los caracteres rápidos que siguen se tragan, para
    // que el input quede alineado con la UI del warmup. La retirada es
    // defensiva —el orden de los listeners no está garantizado, y el input de
    // texto pudo añadir ya el carácter—. El `floor` conserva los caracteres
    // del warmup dejados pasar a propósito, y la retirada es un no-op si no
    // se filtró nada. Se consulta `countBefore` para que el evento que cruza
    // el umbral siga pasando, porque el terminal agrupa.
    if (countBefore >= WARMUP_THRESHOLD) {
      e.stopImmediatePropagation()
      stripTrailing(repeatCount, {
        char: bareChar,
        floor: charsInInputRef.current,
      })
    } else {
      charsInInputRef.current += repeatCount
    }

    // Muestra la señal del warmup en cuanto se detecta un patrón de hold
    if (rapidCountRef.current >= WARMUP_THRESHOLD) {
      setVoiceState(prev => {
        if (prev.voiceWarmingUp) return prev
        return { ...prev, voiceWarmingUp: true }
      })
    }

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
    }
    resetTimerRef.current = setTimeout(
      (resetTimerRef, rapidCountRef, charsInInputRef, setVoiceState) => {
        resetTimerRef.current = null
        rapidCountRef.current = 0
        charsInInputRef.current = 0
        setVoiceState(prev => {
          if (!prev.voiceWarmingUp) return prev
          return { ...prev, voiceWarmingUp: false }
        })
      },
      RAPID_KEY_GAP_MS,
      resetTimerRef,
      rapidCountRef,
      charsInInputRef,
      setVoiceState,
    )
  }

  // Puente de compatibilidad hacia atrás: `REPL.tsx` todavía no cablea
  // `handleKeyDown` a `<Box onKeyDown>`. Se suscribe con `useInput` y adapta
  // `InputEvent` → `KeyboardEvent` hasta que el consumidor se migre (en un PR
  // aparte).
  // TODO(onKeyDown-migration): retirar cuando REPL pase `handleKeyDown`.
  useInput(
    (_input, _key, event) => {
      const kbEvent = new KeyboardEvent(event.keypress)
      handleKeyDown(kbEvent)
      // `handleKeyDown` detuvo el evento del adaptador, no el `InputEvent`
      // que el emisor consulta de verdad: hay que reenviarlo para que el
      // listener `useInput` del input de texto se salte y los espacios
      // mantenidos no se filtren al prompt.
      if (kbEvent.didStopImmediatePropagation()) {
        event.stopImmediatePropagation()
      }
    },
    { isActive },
  )

  return { handleKeyDown }
}

// TODO(onKeyDown-migration): shim temporal para que los consumidores JSX
// que ya existen (`<VoiceKeybindingHandler .../>`) sigan compilando. Retirar
// cuando `REPL.tsx` cablee `handleKeyDown` de forma directa.
export function VoiceKeybindingHandler(props: {
  voiceHandleKeyEvent: (fallbackMs?: number) => void
  stripTrailing: (maxStrip: number, opts?: StripOpts) => number
  resetAnchor: () => void
  isActive: boolean
}): null {
  useVoiceKeybindingHandler(props)
  return null
}
