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
  return readFileSync(join(HERE, 'techDetector.prompt.md'), 'utf8')
}

export const techDetector: AgentDefinition = {
  name: 'tech-detector',
  description:
    'Detecta el stack tecnológico de un proyecto analizando archivos de ' +
    'configuración, dependencias y estructura de directorios. Usar cuando ' +
    'el usuario quiere inicializar skills para su proyecto o cuando ' +
    'bootstrap.py necesita saber qué tecnologías están presentes.',
  tools: ['Glob', 'Read', 'Grep'],
  get prompt(): string {
    return readPrompt()
  },
}
