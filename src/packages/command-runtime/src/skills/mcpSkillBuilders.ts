/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/skills/mcpSkillBuilders.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO: registro de escritura única para las dos
 * funciones de `loadSkillsDir.js` que la búsqueda de skills de MCP
 * necesita — es una hoja del grafo de dependencias, sólo importa tipos,
 * así que tanto `mcpSkills.ts` como `loadSkillsDir.ts` pueden depender de
 * ella sin formar un ciclo (client.ts → mcpSkills.ts → loadSkillsDir.ts →
 * … → client.ts).
 *
 * `loadSkillsDir.ts` ya existe en este árbol, pero es un porte PARCIAL:
 * no exporta `createSkillCommand` ni `parseSkillFrontmatterFields` (medido
 * con grep sobre sus exports). El `import type` sigue siendo válido en
 * tiempo de ejecución — Bun borra los `import type` sin verificar que el
 * nombre exista en el módulo importado (verificado con un caso mínimo:
 * un `import type` de un símbolo ausente de un módulo SÍ resoluble no
 * falla al correr) — así que este archivo resuelve hoy y empezará a
 * tipar de verdad cuando `loadSkillsDir.ts` porte esas dos funciones.
 */
import type {
  createSkillCommand,
  parseSkillFrontmatterFields,
} from './loadSkillsDir.js'

export type MCPSkillBuilders = {
  createSkillCommand: typeof createSkillCommand
  parseSkillFrontmatterFields: typeof parseSkillFrontmatterFields
}

let builders: MCPSkillBuilders | null = null

export function registerMCPSkillBuilders(b: MCPSkillBuilders): void {
  builders = b
}

export function getMCPSkillBuilders(): MCPSkillBuilders {
  if (!builders) {
    throw new Error(
      'MCP skill builders not registered — loadSkillsDir.ts has not been evaluated yet',
    )
  }
  return builders
}
