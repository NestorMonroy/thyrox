import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * El prompt vive en su propio archivo por la misma razón que
 * `migrationPorter.prompt.md`: es prosa larga con backticks y bloques de
 * código que, dentro de un template literal, habría que escapar uno a uno.
 *
 * Ese `.md` NO es la fuente de la definición: no lleva frontmatter y no
 * declara nada. Sólo transporta la prosa.
 */
function readPrompt(): string {
  return readFileSync(join(HERE, 'pdcaCoordinator.prompt.md'), 'utf8')
}

export const pdcaCoordinator: AgentDefinition = {
  name: 'pdca-coordinator',
  description:
    'Coordinator para PDCA — ciclo de mejora continua (Plan/Do/Check/Act), ' +
    '4 stages con updates de methodology_step. Usar cuando la metodología ' +
    'PDCA está activa.',
  tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  skills: ['pdca-plan', 'pdca-do', 'pdca-check', 'pdca-act'],
  background: true,
  color: 'blue',
  // `model` sin declarar en el .md fuente — hereda el de la sesión.
  get prompt(): string {
    return readPrompt()
  },
}
