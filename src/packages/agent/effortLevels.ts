/**
 * El vocabulario de esfuerzo, en una hoja sin dependencias. `EFFORT_LEVELS`
 * son los 6 niveles de la resolución de esfuerzo de la sesión, con `none`
 * primero; `NAMED_EFFORT_LEVELS` son los 5 que se nombran y persisten: los
 * que valida el campo `effort:` del frontmatter (`schema.ts`) y los que
 * indexan `default_effort`/`effort_cost_index` del catálogo (`models.ts`).
 *
 * Vive aparte de `effort.ts` porque éste importa feature flags y el
 * proveedor: un esquema o un catálogo que sólo necesitan la lista no deben
 * arrastrar ese grafo.
 */
export const EFFORT_LEVELS = ['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const

export type EffortLevel = (typeof EFFORT_LEVELS)[number]

// Se deriva por posición (`none` es el primero): la desestructuración de una
// tupla `as const` conserva el tipo tupla que `z.enum` exige, y `.filter` lo
// degradaría a un arreglo.
const [, ...NAMED_EFFORT_LEVELS] = EFFORT_LEVELS
export { NAMED_EFFORT_LEVELS }

export type NamedEffortLevel = (typeof NAMED_EFFORT_LEVELS)[number]
