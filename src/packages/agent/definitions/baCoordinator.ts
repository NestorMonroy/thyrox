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
  return readFileSync(join(HERE, 'baCoordinator.prompt.md'), 'utf8')
}

export const baCoordinator: AgentDefinition = {
  name: 'ba-coordinator',
  description:
    'Coordinator para BABOK — Business Analysis Body of Knowledge (v3), ' +
    'no-secuencial: selecciona el knowledge area más relevante o presenta ' +
    'los 6 para que el usuario elija. Usar cuando la metodología BABOK ' +
    'está activa.',
  tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  skills: [
    'ba-planning',
    'ba-elicitation',
    'ba-requirements-analysis',
    'ba-requirements-lifecycle',
    'ba-strategy',
    'ba-solution-evaluation',
  ],
  background: true,
  color: 'cyan',
  get prompt(): string {
    return readPrompt()
  },
}
