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
  return readFileSync(join(HERE, 'agenticValidator.prompt.md'), 'utf8')
}

export const agenticValidator: AgentDefinition = {
  name: 'agentic-validator',
  description:
    'Valida código Python agentic contra el catálogo AP-01..AP-42. Detecta: ' +
    'violaciones de callback ADK (AP-01/02), type contracts (AP-03/06), ' +
    'temperatura incorrecta en clasificadores (AP-07/08), error handling ' +
    'faltante (AP-09/12), anti-patrones de observabilidad (AP-13/15), HITL ' +
    'decorativo (AP-16/17), imports deprecados (AP-18/22), diseño agentic ' +
    '(AP-23/30). Usar cuando se necesite validar código agentic Python: ' +
    'retorna reporte con AP-ID, severidad, file:line y corrección. De sólo lectura o planificación: apto para invocarse con background, su entregable se recoge al terminar.',
  tools: ['Read', 'Glob', 'Grep', 'Bash', 'Write'],
  // `async_suitable: true` en el .md de disco NO tiene contraparte en
  // `AgentDefinition` ni en el cliente (tarea #948, 0 aciertos en el
  // ejecutable) — se descarta, no se inventa la clave.
  get prompt(): string {
    return readPrompt()
  },
}
