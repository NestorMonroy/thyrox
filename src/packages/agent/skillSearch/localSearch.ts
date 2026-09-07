/**
 * Porte COMPLETO de `ccnmt: packages/agent/skillSearch/localSearch.ts`.
 *
 * La fuente misma es un stub auto-generado: `clearSkillIndexCache` es un
 * no-op sin implementación real detrás. El porte lo refleja tal cual, sin
 * inventar lógica de indexado que la fuente no declara — mismo criterio que
 * `querySource.ts`/`taskSummary.ts`.
 *
 * El resto de `skillSearch/` (`prefetch.ts`, `remoteSkillLoader.ts`,
 * `remoteSkillState.ts`, `signals.ts`, `telemetry.ts`) NO se porta en este
 * pase — su relación con `@thyrox/skills` (que hoy sólo declara `bundled.ts`,
 * `fromDir.ts`, `registry.ts`, sin superficie de búsqueda/prefetch) no está
 * verificada y excede el alcance de este porte.
 */
export const clearSkillIndexCache: () => void = () => {}
