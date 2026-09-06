import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * El prompt vive en su propio archivo por el mismo motivo que
 * `migrationPorter.prompt.md`: es prosa larga y un backtick sin escapar
 * dentro de un template literal rompería el parseo del módulo entero.
 *
 * Ese `.md` NO es la fuente de la definición: no lleva frontmatter y no
 * declara nada. Sólo transporta la prosa.
 */
function readPrompt(): string {
  return readFileSync(join(HERE, 'incrementAcceptor.prompt.md'), 'utf8')
}

export const incrementAcceptor: AgentDefinition = {
  name: 'increment-acceptor',
  description: "Juez de aceptación de incrementos para kaupamex (THYROX gate 6→7 / EXECUTE→TRACK). Úsalo cuando haya que aceptar un incremento o tarea contra la Definition of Done antes de cerrarla. Verifica evidencia real (no compliance), emite veredicto PASS/FAIL por criterio y un veredicto global ACEPTADO/RECHAZADO. Retorna output_key='aceptacion'.",
  tools: ["Read", "Glob", "Grep", "Bash"],
  model: 'claude-opus-5',
  // `async_suitable: false` en el frontmatter — NO existe en `AgentDefinition`
  // ni en `AGENT_JSON_KEYS` (tarea #948). Se omite, no se inventa la clave.
  get prompt(): string {
    return readPrompt()
  },
}
