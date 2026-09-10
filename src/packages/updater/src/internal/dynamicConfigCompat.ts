/**
 * Sustituto local del cliente de "Dynamic Config" de GrowthBook —
 * `ccnmt: packages/config/feature-flags.ts` declara
 * `getDynamicConfig_BLOCKS_ON_INIT` y
 * `getDynamicConfig_CACHED_MAY_BE_STALE`, y `@thyrox/config/feature-flags.ts`
 * NO los expone (medido: 0 hits de `DynamicConfig` en todo `src/packages`).
 * Es distinto de `getFeatureValue_CACHED_MAY_BE_STALE` —ese SÍ está
 * portado y sirve valores booleanos/escalares de un flag—; éste sirve un
 * **objeto de configuración estructurado** desde GrowthBook, que es un
 * cliente entero no portado.
 *
 * Ambos sustitutos devuelven siempre el `fallback` — el mismo
 * comportamiento seguro que la fuente ya documenta para "GrowthBook no
 * cargó todavía": los llamadores (`assertMinVersion`, `getMaxVersion`,
 * `getMaxVersionMessage`, `getCanaryVersion`) ya envuelven la llamada en
 * try/catch y tratan la ausencia de config como "sin límite / sin
 * mensaje / sin canary" — exactamente el default que este archivo sirve.
 */

export async function getDynamicConfig_BLOCKS_ON_INIT<T>(
  _key: string,
  fallback: T,
): Promise<T> {
  return fallback
}

export function getDynamicConfig_CACHED_MAY_BE_STALE<T>(
  _key: string,
  fallback: T,
): T {
  return fallback
}
