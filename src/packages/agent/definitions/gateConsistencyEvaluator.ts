import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * El prompt vive en su propio archivo porque es prosa larga: 14 backticks
 * medidos, que dentro de un template literal habría que escapar uno a uno.
 * Un backtick sin escapar rompe el parseo del módulo entero, y el defecto
 * sería silencioso hasta la siguiente edición del prompt.
 *
 * Ese `.md` NO es la fuente de la definición: no lleva frontmatter y no
 * declara nada. Sólo transporta la prosa.
 */
function readPrompt(): string {
  return readFileSync(join(HERE, 'gateConsistencyEvaluator.prompt.md'), 'utf8')
}

export const gateConsistencyEvaluator: AgentDefinition = {
  name: 'gate-consistency-evaluator',
  description:
    'Evalúa claims de un artefacto contra decisiones previas y artefactos ' +
    'de stages anteriores. Retorna output_key=\'consistencia\' con ' +
    'schema: {claims_contradictorios, claims_heredados_sin_verificar, ' +
    'gate_pasa, notas}. Usar cuando un gate de Stage THYROX requiere ' +
    'evaluación de consistencia. De sólo lectura o planificación: apto para invocarse con background, su entregable se recoge al terminar.',
  tools: ['Read', 'Glob', 'Grep'],
  // `async_suitable: true` en el disco no tiene contraparte en
  // `AgentDefinition` ni en el cliente medido (tarea #948) — se descarta,
  // no se inventa la clave.
  get prompt(): string {
    return readPrompt()
  },
}
