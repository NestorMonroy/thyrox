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
  return readFileSync(join(HERE, 'leanCoordinator.prompt.md'), 'utf8')
}

export const leanCoordinator: AgentDefinition = {
  name: 'lean-coordinator',
  description: "Coordinator para Lean Six Sigma — eliminación de desperdicios, mejora de value stream, 5 fases con tollgates formales. Usar cuando la metodología Lean está activa.",
  tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
  skills: ["lean-define", "lean-measure", "lean-analyze", "lean-improve", "lean-control"],
  background: true,
  color: 'cyan',
  get prompt(): string {
    return readPrompt()
  },
}
