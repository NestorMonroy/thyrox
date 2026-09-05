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
  return readFileSync(join(HERE, 'pmCoordinator.prompt.md'), 'utf8')
}

export const pmCoordinator: AgentDefinition = {
  name: 'pm-coordinator',
  description:
    'Coordinator para PMBOK — gestión de proyectos PMI, 5 grupos de ' +
    'procesos (Initiating/Planning/Executing/Monitoring & ' +
    'Controlling/Closing) con sus knowledge areas. Usar cuando la ' +
    'metodología PMBOK está activa.',
  tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  skills: ['pm-initiating', 'pm-planning', 'pm-executing', 'pm-monitoring', 'pm-closing'],
  background: true,
  color: 'yellow',
  // `model` sin declarar en el .md fuente — hereda el de la sesión.
  get prompt(): string {
    return readPrompt()
  },
}
