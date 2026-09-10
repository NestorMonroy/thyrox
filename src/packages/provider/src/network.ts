/**
 * Acceso a la capa de red que el host instaló.
 *
 * Reimplementación del contrato de `ccnmt: packages/provider/src/network.ts`.
 * Hermano exacto de `contextPipeline.ts`, y por la misma razón: los bindings
 * la tienen y el paquete no la publicaba, así que el consumidor —cada
 * adaptador de `adapters.ts`— tendría que importar los bindings enteros y
 * destructurar, acoplándose a su forma en vez de a la capacidad.
 *
 * DELEGA, no fabrica: devuelve la instalada.
 */
import { getProviderHostBindings } from './host.ts'
import type { NetworkLayer } from './types.ts'

export function getProviderNetworkLayer(): NetworkLayer {
  return getProviderHostBindings().networkLayer
}
