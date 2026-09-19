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
  // Store is created once — stable context value means the provider never
  // triggers re-renders. Consumers subscribe to slices via useVoiceState.
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
 * Subscribe to a slice of voice state. Only re-renders when the selected
 * value changes (compared via Object.is).
 */
export function useVoiceState<T>(selector: (state: VoiceState) => T): T {
  const store = useVoiceStore()
  const get = () => selector(store.getState())
  return useSyncExternalStore(store.subscribe, get, get)
}

/**
 * Get the voice state setter. Stable reference — never causes re-renders.
 * store.setState is synchronous: callers can read getVoiceState() immediately
 * after to observe the new value (VoiceKeybindingHandler relies on this).
 */
export function useSetVoiceState(): (
  updater: (prev: VoiceState) => VoiceState,
) => void {
  return useVoiceStore().setState
}

/**
 * Get a synchronous reader for fresh state inside callbacks. Unlike
 * useVoiceState (which subscribes), this doesn't cause re-renders — use
 * inside event handlers that need to read state set earlier in the same tick.
 */
export function useGetVoiceState(): () => VoiceState {
  return useVoiceStore().getState
}
