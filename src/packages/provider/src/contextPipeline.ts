/**
 * Acceso a la tubería de contexto que el host instaló.
 *
 * Reimplementación del contrato de `ccnmt: packages/provider/src/contextPipeline.ts`
 * — bajo UNLICENSED se porta el patrón, no el archivo
 * (`porte-completo-no-parcial.md`, «la licencia cambia el MECANISMO, nunca la
 * fidelidad»).
 *
 * Por qué existe teniendo `getProviderHostBindings()` al lado: el consumidor
 * —`createProductionDeps`, al armar su `ContextDep`— necesita **la tubería**,
 * no el objeto de bindings. Sin este accesor tendría que importar los
 * bindings enteros y destructurar, con lo que quedaría acoplado a su FORMA y
 * no a la capacidad que consume.
 *
 * DELEGA, no fabrica: devuelve la instancia instalada. Si construyera una
 * propia, el consumidor hablaría con una tubería distinta de la del host y el
 * contexto que leyera no sería el de la sesión.
 */
import { getProviderHostBindings } from './host.ts'
import type { ContextPipeline } from './types.ts'

export function getProviderContextPipeline(): ContextPipeline {
  return getProviderHostBindings().contextPipeline
}
