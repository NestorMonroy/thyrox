/**
 * Sustituto local mínimo de `@claude-code-how-works/config/feature-flags`.
 *
 * La fuente (`ccnmt: packages/command-runtime/src/commands/review/ultrareviewEnabled.ts`)
 * importa ese paquete para leer un killswitch de GrowthBook. `@claude-code-how-works/*`
 * no tiene hogar en este árbol (DEC-04: el mecanismo, sin el parámetro del
 * repo que lo consume) — no hay cliente de GrowthBook aquí, ni falta: un
 * despliegue self-hosted de un solo operador no tiene un panel remoto de
 * feature flags al que consultar.
 *
 * `getFeatureValue_CACHED_MAY_BE_STALE` se reimplementa como lo que sería
 * su comportamiento sin un cliente GrowthBook instalado: la fuente misma
 * documenta que "a stale/missing GrowthBook cache produces the fallback"
 * — aquí SIEMPRE está ausente, así que siempre se devuelve el `fallback`
 * que pasa quien llama. Mismo patrón que `@thyrox/agent/featureFlags.ts`
 * usa para `agentSwarmsEnabled.ts` — no se duplica ahí porque
 * `command-runtime` no puede depender de `agent` (la dependencia va en el
 * sentido contrario: `agent` depende de `command-runtime`).
 */
export function getFeatureValue_CACHED_MAY_BE_STALE<T>(
  key: string,
  fallback: T,
): T {
  return fallback
}
