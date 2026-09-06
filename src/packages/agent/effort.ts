/**
 * Nivel de esfuerzo de razonamiento — porte PARCIAL de
 * `ccnmt: packages/agent/effort.ts`.
 *
 * Recorte declarado: la fuente completa importa media docena de módulos de
 * `@claude-code-how-works/*` (config/env, config/settings, config/feature-flags,
 * provider/thinking, provider/authAlias, provider/providers, provider/connections,
 * provider/model/modelSupportOverrides, provider/antModels,
 * headless-sdk/runtimeTypes) que NO existen en este árbol. Esas dependencias
 * sólo alimentan funciones que resuelven el efecto de red (qué modelo soporta
 * qué nivel, el precedente de settings, las llamadas de red de feature-flags):
 * `modelSupportsEffort`, `modelSupportsNoneEffort`, `modelSupportsMaxEffort`,
 * `modelSupportsXhighEffort`, `getInitialEffortSetting`,
 * `resolvePickerEffortPersistence`, `getEffortEnvOverride`,
 * `resolveAppliedEffort`, `getDisplayedEffortLevel`, `getEffortSuffix`,
 * `getEffortLevelDescription`, `getEffortValueDescription`,
 * `getDefaultEffortForModel`, `getOpusDefaultEffortConfig` — ninguna la
 * ejercita el porte de test (`__tests__/effort.test.ts`), que sólo importa
 * los seis símbolos de abajo.
 *
 * Los seis son AUTOCONTENIDOS en la fuente — no dependen de ningún import
 * externo, sólo de `process.env.USER_TYPE` — así que se portan completos y
 * con fidelidad byte a byte de comportamiento.
 *
 * NO confundir con `EFFORT_LEVELS` de `./schema.ts`: ése es el enum de 5
 * niveles (sin `none`) que valida el campo `effort:` del frontmatter de un
 * agente — otro dominio, otra fuente de verdad. Éste es el de 6 niveles que
 * gobierna la resolución de esfuerzo de la sesión/modelo.
 */

export const EFFORT_LEVELS = [
  'none',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const

export type EffortLevel = (typeof EFFORT_LEVELS)[number]
export type EffortValue = EffortLevel | number

export function isEffortLevel(value: string): value is EffortLevel {
  return (EFFORT_LEVELS as readonly string[]).includes(value)
}

export function isValidNumericEffort(value: number): boolean {
  return Number.isInteger(value)
}

export function parseEffortValue(value: unknown): EffortValue | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value === 'number' && isValidNumericEffort(value)) {
    return value
  }
  const str = String(value).toLowerCase()
  if (isEffortLevel(str)) {
    return str
  }
  const numericValue = parseInt(str, 10)
  if (!Number.isNaN(numericValue) && isValidNumericEffort(numericValue)) {
    return numericValue
  }
  return undefined
}

/**
 * Los valores numéricos son sólo default-de-modelo y no se persisten.
 * Los niveles-cadena (none/low/medium/high/xhigh/max) sí son persistibles.
 */
export function toPersistableEffort(
  value: EffortValue | undefined,
): EffortLevel | undefined {
  if (
    value === 'none' ||
    value === 'low' ||
    value === 'medium' ||
    value === 'high' ||
    value === 'xhigh' ||
    value === 'max'
  ) {
    return value
  }
  return undefined
}

export function convertEffortValueToLevel(value: EffortValue): EffortLevel {
  if (typeof value === 'string') {
    return isEffortLevel(value) ? value : 'high'
  }
  if (process.env.USER_TYPE === 'ant' && typeof value === 'number') {
    // El rango numérico de ant abarca 5 niveles — se conservan los cortes
    // low/medium/high sin tocar (herramental existente los asume), y xhigh
    // se intercala entre high y max en el extremo superior.
    if (value <= 50) return 'low'
    if (value <= 85) return 'medium'
    if (value <= 95) return 'high'
    if (value <= 100) return 'xhigh'
    return 'max'
  }
  return 'high'
}
