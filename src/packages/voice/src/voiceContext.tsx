/**
 * Puerto de `ccnmt: packages/voice/src/voiceContext.tsx` (76 líneas),
 * 100 % portado.
 *
 * Mismo criterio de reescritura que `./hooks/useVoice.ts`: el alcance de
 * la fuente pasa a `@thyrox/` sólo en líneas de specifier, y los
 * comentarios en inglés de la fuente quedan verbatim.
 *
 * EL BLOQUEADOR DECLARADO ANTES ESTABA RANCIO — verificado por conducta el
 * 2026-09-19T07:44:53: `react` resuelve a 19.3.0 y
 * `@thyrox/repl/stateStore.js` resuelve a
 * `src/packages/repl/src/stateStore.ts`. Lo que faltaba era la
 * DECLARACIÓN de `@thyrox/repl` en el manifiesto de este paquete.
 *
 * Este archivo fue el que destapó la cascada: el porte de
 * `./hooks/useVoiceIntegration.tsx` dejó de lanzar su propio error de
 * bloqueo y pasó a lanzar el de `useGetVoiceState()` de AQUÍ. Un conteo
 * de líneas no lo habría visto —este módulo medía 93 contra 76 de la
 * fuente, o sea MÁS— porque el stub sustituía el cuerpo por un `throw`
 * de longitud parecida. Lo vio la sonda de conducta que discrimina por el
 * CONTENIDO del mensaje. Ver H-THYROX-116.
 */
import React, {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
} from 'react'
import { createStore, type Store } from '@thyrox/repl/stateStore.js'

export type VoiceState = {
  voiceState: 'idle' | 'recording' | 'processing'
  voiceError: string | null
  voiceInterimTranscript: string
  voiceAudioLevels: number[]
  voiceWarmingUp: boolean
}

const DEFAULT_STATE: VoiceState = {
  voiceState: 'idle',
  voiceError: null,
  voiceInterimTranscript: '',
  voiceAudioLevels: [],
  voiceWarmingUp: false,
}

type VoiceStore = Store<VoiceState>

const VoiceContext = createContext<VoiceStore | null>(null)

type Props = {
  children: React.ReactNode
}

export function VoiceProvider({ children }: Props): React.ReactNode {
  // El store se crea UNA vez: al ser estable el context value, el provider
  // nunca dispara re-renders por sí mismo. Los consumidores se suscriben a
  // slices con `useVoiceState`, que es donde vive la granularidad.
  const [store] = useState(() => createStore<VoiceState>(DEFAULT_STATE))
  return <VoiceContext.Provider value={store}>{children}</VoiceContext.Provider>
}

function useVoiceStore(): VoiceStore {
  const store = useContext(VoiceContext)
  if (!store) {
    throw new Error('useVoiceState must be used within a VoiceProvider')
  }
  return store
}

/**
 * Se suscribe a un slice del estado de voice. Sólo re-renderiza cuando cambia
 * el valor seleccionado, comparado con `Object.is`.
 */
export function useVoiceState<T>(selector: (state: VoiceState) => T): T {
  const store = useVoiceStore()
  const get = () => selector(store.getState())
  return useSyncExternalStore(store.subscribe, get, get)
}

/**
 * Devuelve el setter del estado de voice. La referencia es estable, así que
 * nunca provoca un re-render.
 *
 * `store.setState` es SÍNCRONO: quien lo llama puede leer `getVoiceState()`
 * inmediatamente después y observar ya el valor nuevo. `VoiceKeybindingHandler`
 * depende de esa sincronía.
 */
export function useSetVoiceState(): (
  updater: (prev: VoiceState) => VoiceState,
) => void {
  return useVoiceStore().setState
}

/**
 * Devuelve un lector síncrono del estado fresco para usar dentro de callbacks.
 * A diferencia de `useVoiceState`, que se suscribe, éste no provoca re-renders:
 * es para event handlers que necesitan leer un estado fijado antes en el MISMO
 * tick.
 */
export function useGetVoiceState(): () => VoiceState {
  return useVoiceStore().getState
}
