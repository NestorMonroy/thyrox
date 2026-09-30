/**
 * Los hosts que se redirigen a 127.0.0.1 por cada agente cuando su DNS pasa
 * por el MITM; se muestran para quien tenga que añadirlos a mano.
 *
 * Porte de `omniroute: src/shared/constants/mitmToolHosts.ts` (MIT). La
 * referencia guarda una copia a mano porque su interfaz no puede importar los
 * destinos, que cargan código de Node; aquí no hay tal interfaz, así que el
 * mapa se deriva de `ALL_TARGETS` y no puede desincronizarse.
 */
import { ALL_TARGETS } from './index.ts'

export const MITM_TOOL_HOSTS: Record<string, string[]> = Object.fromEntries(
  ALL_TARGETS.map(target => [target.id, target.hosts]),
)

/** Los hosts de un agente; `[]` si el id no es conocido. */
export function getMitmToolHosts(toolId: string): string[] {
  return MITM_TOOL_HOSTS[toolId] ?? []
}
