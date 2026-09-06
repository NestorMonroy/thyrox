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
  return readFileSync(join(HERE, 'taskSynthesizer.prompt.md'), 'utf8')
}

export const taskSynthesizer: AgentDefinition = {
  name: 'task-synthesizer',
  description:
    'Consolida outputs existentes de análisis (cluster reports, gap ' +
    'analyses) en un task-plan: deduplica hallazgos, resuelve conflictos, ' +
    'construye el DAG correcto y asigna IDs T-NNN continuando el plan ' +
    'existente. Usar cuando se consolidan outputs de pattern-harvester o ' +
    'deep-dive en blocks listos para ejecutar. Do NOT use for initial ' +
    'planning from scratch (use task-planner instead). De sólo lectura o planificación: apto para invocarse con background, su entregable se recoge al terminar.',
  tools: ['Read', 'Glob', 'Grep', 'Bash', 'Write'],
  // `async_suitable: true` en el .md de disco NO tiene contraparte en
  // `AgentDefinition` ni en el cliente (tarea #948, 0 aciertos en el
  // ejecutable) — se descarta, no se inventa la clave.
  get prompt(): string {
    return readPrompt()
  },
}
