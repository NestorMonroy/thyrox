/**
 * Puerto de `ccnmt: packages/memory/src/memoryShapeTelemetry.ts` (verbatim).
 */

// Telemetría de forma de memoria — stub sin efecto. La implementación real
// registra qué memorias consideró el algoritmo de recall frente a las que
// seleccionó, y la forma de las llamadas de escritura de memoria. Se
// mantiene como stub para que los llamadores condicionados por feature
// flag sigan compilando.

import type { MemoryScope } from './memoryFileDetection.js'

type MemoryHeaderLike = {
  filename: string
  filePath: string
  mtimeMs: number
  description: string | null
  type: unknown
}

export const logMemoryRecallShape: (
  memories: MemoryHeaderLike[],
  selected: MemoryHeaderLike[],
) => void = () => {}

export const logMemoryWriteShape: (
  toolName: string,
  toolInput: Record<string, unknown>,
  filePath: string,
  scope: MemoryScope,
) => void = () => {}
