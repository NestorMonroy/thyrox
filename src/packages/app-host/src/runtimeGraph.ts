// Adaptación de @claude-code-how-works/app-host: src/runtimeGraph.ts.
// Capa 0 (sin cita a paquete hermano) — porte verbatim, sin divergencias.

import type { RuntimeGraph, RuntimeHandles } from './contracts.js'

export function createRuntimeGraph(
  handles: RuntimeHandles,
): RuntimeGraph {
  return {
    createdAt: Date.now(),
    handles,
  }
}
