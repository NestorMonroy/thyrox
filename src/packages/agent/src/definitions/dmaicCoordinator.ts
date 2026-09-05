import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * El prompt vive en su propio archivo porque es prosa larga: 136 backticks
 * medidos, que dentro de un template literal habría que escapar uno a uno.
 * Un backtick sin escapar rompe el parseo del módulo entero, y el defecto
 * sería silencioso hasta la siguiente edición del prompt.
 *
 * Ese `.md` NO es la fuente de la definición: no lleva frontmatter y no
 * declara nada. Sólo transporta la prosa.
 */
function readPrompt(): string {
  return readFileSync(join(HERE, 'dmaicCoordinator.prompt.md'), 'utf8')
}

export const dmaicCoordinator: AgentDefinition = {
  name: 'dmaic-coordinator',
  description:
    'Coordinator para DMAIC — Six Sigma process improvement, 5 fases ' +
    '(Define/Measure/Analyze/Improve/Control) con tollgates formales. ' +
    'Usar cuando la metodología DMAIC está activa.',
  tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  skills: ['dmaic-define', 'dmaic-measure', 'dmaic-analyze', 'dmaic-improve', 'dmaic-control'],
  background: true,
  color: 'green',
  get prompt(): string {
    return readPrompt()
  },
}
