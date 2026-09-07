/**
 * Puerto de `ccnmt: packages/memory/src/memorySourceTypes.ts` (verbatim).
 * `feature('TEAMMEM')` es el flag de compilación nativo de Bun
 * (`bun:bundle`), no un símbolo bloqueado — no requiere sustituto.
 */
import { feature } from 'bun:bundle'

export const MEMORY_TYPE_VALUES = [
  'User',
  'Project',
  'Local',
  'Managed',
  'AutoMem',
  ...(feature('TEAMMEM') ? (['TeamMem'] as const) : []),
] as const

export type MemoryType = (typeof MEMORY_TYPE_VALUES)[number]
