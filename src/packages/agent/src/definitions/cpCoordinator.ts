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
  return readFileSync(join(HERE, 'cpCoordinator.prompt.md'), 'utf8')
}

export const cpCoordinator: AgentDefinition = {
  name: 'cp-coordinator',
  description:
    'Coordinator para Consulting Process (McKinsey/BCG): Issue Tree, MECE, ' +
    'hipótesis, Pyramid Principle, Recommendation Deck, 7 fases con ' +
    'tollgates formales. Usar cuando la metodología CP está activa.',
  tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  skills: [
    'cp-initiation',
    'cp-diagnosis',
    'cp-structure',
    'cp-recommend',
    'cp-plan',
    'cp-implement',
    'cp-evaluate',
  ],
  background: true,
  color: 'yellow',
  get prompt(): string {
    return readPrompt()
  },
}
