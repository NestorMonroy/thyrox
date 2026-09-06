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
  return readFileSync(join(HERE, 'thyroxCoordinator.prompt.md'), 'utf8')
}

export const thyroxCoordinator: AgentDefinition = {
  name: 'thyrox-coordinator',
  description:
    'Coordinator genérico para THYROX — lee el YAML de metodología ' +
    'dinámicamente y resuelve transiciones para cualquier tipo de flow ' +
    '(cíclico, secuencial, iterativo, no-secuencial, condicional). Usar ' +
    'cuando hay una metodología THYROX registrada activa que no tiene ' +
    'coordinator dedicado.',
  tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  background: true,
  get prompt(): string {
    return readPrompt()
  },
}
