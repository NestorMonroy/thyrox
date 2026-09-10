/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/skills/mcpSkills.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO — la fuente misma es un stub auto-generado.
 *
 * Divergencia declarada: la fuente tipa con
 * `import type { Command } from '@claude-code-how-works/agent/command.js'`.
 * El paquete `agent` lo está portando OTRO agente en paralelo en esta
 * misma sesión — no se toca ni se depende de su forma a mitad de porte.
 * Se usa el `Command` propio de `./types.js` (mismo propósito: la forma
 * pública de un comando que este paquete ya expone).
 */
import type { Command } from '../types.js'

export const fetchMcpSkillsForClient: ((...args: unknown[]) => Promise<Command[]>) & { cache: Map<string, unknown> } = Object.assign(
  (..._args: unknown[]) => Promise.resolve([] as Command[]),
  { cache: new Map<string, unknown>() }
)
