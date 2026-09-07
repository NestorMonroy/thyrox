/**
 * Asignación de color de teammate — porte de
 * `ccnmt: packages/swarm/src/core/teammateColors.ts`.
 *
 * Extraído en la fuente de `teammateLayoutManager.ts` para romper el
 * ciclo de 3 archivos `PaneBackendExecutor → teammateLayoutManager →
 * registry` (BLOQUEADOS los tres en este pase). Las funciones de color
 * son puras (sin acoplamiento a ningún backend); el resto de
 * `teammateLayoutManager.ts` — que sí acopla con el registro de
 * backends — queda fuera.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente importa `AgentColorName` y
 * `AGENT_COLORS` de `adapters/appRuntime.ts`, que a su vez los enruta a un
 * binding resuelto desde
 * `@claude-code-how-works/tool-registry/tools/AgentTool/agentColorManager.js`
 * — el paquete `tool-registry` (`@thyrox/tools` en este árbol) no expone
 * ese módulo (medido: `grep -rl AGENT_COLORS src/packages/tools` → sin
 * resultados). La propia suite de la fuente
 * (`core/__tests__/teammateColors.test.ts`) ya declara la paleta real
 * como un detalle de binding irrelevante para lo que prueba — instala un
 * fixture de 6 colores arbitrario (`red, blue, green, yellow, magenta,
 * cyan`) en vez de la paleta real del host. Se reimplementa aquí esa
 * MISMA paleta como constante local: cero pérdida de fidelidad de
 * comportamiento (round-robin + memoización), y el test que se porta
 * junto a este archivo queda anclado exactamente al mismo fixture.
 */

/** Paleta de colores de teammate — ver la divergencia declarada arriba. */
export const AGENT_COLORS = [
  'red',
  'blue',
  'green',
  'yellow',
  'magenta',
  'cyan',
] as const

export type AgentColorName = (typeof AGENT_COLORS)[number]

const teammateColorAssignments = new Map<string, AgentColorName>()
let colorIndex = 0

export function assignTeammateColor(teammateId: string): AgentColorName {
  const existing = teammateColorAssignments.get(teammateId)
  if (existing) {
    return existing
  }
  const color = AGENT_COLORS[colorIndex % AGENT_COLORS.length]!
  teammateColorAssignments.set(teammateId, color)
  colorIndex++
  return color
}

export function getTeammateColor(
  teammateId: string,
): AgentColorName | undefined {
  return teammateColorAssignments.get(teammateId)
}

export function clearTeammateColors(): void {
  teammateColorAssignments.clear()
  colorIndex = 0
}
