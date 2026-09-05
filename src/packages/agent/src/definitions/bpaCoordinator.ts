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
  return readFileSync(join(HERE, 'bpaCoordinator.prompt.md'), 'utf8')
}

export const bpaCoordinator: AgentDefinition = {
  name: 'bpa-coordinator',
  description:
    'Coordinator para BPA — Business Process Analysis: As-Is (BPMN), ' +
    'identificación de desperdicios VA/BVA/NVA, diseño To-Be (ESIA), 6 ' +
    'fases con tollgates formales. Usar cuando la metodología BPA está ' +
    'activa.',
  tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  skills: [
    'bpa-identify',
    'bpa-map',
    'bpa-analyze',
    'bpa-design',
    'bpa-implement',
    'bpa-monitor',
  ],
  background: true,
  color: 'teal',
  get prompt(): string {
    return readPrompt()
  },
}
