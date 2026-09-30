/**
 * Cuerpo de `/pause-memory` — porte de 2.1.281 (`chunk-69mye76c.js`):
 * alterna la pausa de la sesión, registra `tengu_memory_toggled` y responde
 * con el texto del binario.
 *
 * pendiente: el binario también avisa al estado de sesión del cambio
 * (`t.sessionState?.notifyInternalMetadataChanged({memory_toggled_off})`),
 * que lo propaga a los metadatos internos de la sesión remota. El contexto
 * de comando de este árbol no expone `sessionState`; se completa cuando lo
 * haga.
 */
import { logEvent } from '@thyrox/local-observability'
import { isMemoryPaused, setMemoryPaused } from '@thyrox/memory/memoryPause'
import type { LocalCommandCall } from '../../runtime.js'

const PAUSED =
  'Memory paused for this session · this conversation will not write or read new memories, and previously-loaded memory content should not be referenced.\n\nRun /pause-memory again to resume.'
const RESUMED = 'Memory resumed · memory content may be referenced and new memories can be saved.'

export const call: LocalCommandCall = async () => {
  const paused = !isMemoryPaused()
  setMemoryPaused(paused)
  logEvent('tengu_memory_toggled', { toggled_off: paused })
  return { type: 'text', value: paused ? PAUSED : RESUMED }
}
