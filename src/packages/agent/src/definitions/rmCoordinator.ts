import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/** Ver el comentario equivalente en `migrationPorter.ts`: el prompt vive en
 * su propio archivo para no tener que escapar backticks dentro de un
 * template literal. */
function readPrompt(): string {
  return readFileSync(join(HERE, 'rmCoordinator.prompt.md'), 'utf8')
}

export const rmCoordinator: AgentDefinition = {
  name: 'rm-coordinator',
  description:
    'Coordinator para RM — Requirements Management: elicitación, análisis, ' +
    'especificación, validación, gestión de cambios, con retornos ' +
    'condicionales (gaps → re-elicitación, change requests → re-análisis). ' +
    'Usar cuando la metodología RM está activa.',
  tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  skills: ['rm-elicitation', 'rm-analysis', 'rm-specification', 'rm-validation', 'rm-management'],
  background: true,
  color: 'orange',
  // `model`/`effort` sin declarar: el .md fuente no los lleva, hereda de la
  // sesión.
  get prompt(): string {
    return readPrompt()
  },
}
