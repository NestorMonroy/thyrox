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
  return readFileSync(join(HERE, 'taskPlanner.prompt.md'), 'utf8')
}

export const taskPlanner: AgentDefinition = {
  name: 'task-planner',
  description:
    'Use when planning NEW work from scratch — breaks work into T-NNN ' +
    'tasks. NEVER executes. Descompone trabajo en tareas atómicas con IDs ' +
    'trazables. Usar cuando el usuario quiere planificar un feature, bug ' +
    'fix, refactoring, o cualquier trabajo que requiera más de un paso. ' +
    'Produce task-plan.md con checkboxes T-NNN. NUNCA ejecuta — solo ' +
    'planifica. Do NOT use when consolidating existing analysis outputs ' +
    '(use task-synthesizer instead). De sólo lectura o planificación: apto para invocarse con background, su entregable se recoge al terminar.',
  tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Agent', 'TodoWrite'],
  // `async_suitable: true` en el .md de disco NO tiene contraparte en
  // `AgentDefinition` ni en el cliente (tarea #948, 0 aciertos en el
  // ejecutable) — se descarta, no se inventa la clave.
  get prompt(): string {
    return readPrompt()
  },
}
