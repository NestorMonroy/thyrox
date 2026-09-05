import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * El prompt vive en su propio archivo porque es prosa larga: 66 backticks
 * medidos, que dentro de un template literal habría que escapar uno a uno.
 * Un backtick sin escapar rompe el parseo del módulo entero, y el defecto
 * sería silencioso hasta la siguiente edición del prompt.
 *
 * Ese `.md` NO es la fuente de la definición: no lleva frontmatter y no
 * declara nada. Sólo transporta la prosa.
 */
function readPrompt(): string {
  return readFileSync(join(HERE, 'diagramaIshikawa.prompt.md'), 'utf8')
}

export const diagramaIshikawa: AgentDefinition = {
  name: 'diagrama-ishikawa',
  description:
    'Especialista en análisis de causa raíz con diagramas de Ishikawa ' +
    '(espina de pescado / causa-efecto). Usar cuando se necesite ' +
    'identificar causas raíz de cualquier problema — técnico, ' +
    'organizacional, de proceso, de producto, de ventas, de calidad, o de ' +
    'investigación. Se auto-adapta al dominio del problema detectando el ' +
    'contexto. Puede invocar sub-agentes para investigar causas ' +
    'específicas. Usar PROACTIVAMENTE cuando aparezcan errores ' +
    'recurrentes, fallas sistémicas o cuando se quiera analizar por qué no ' +
    'se alcanza un objetivo.',
  tools: ['Read', 'Write', 'Grep', 'Glob', 'Bash', 'Agent'],
  get prompt(): string {
    return readPrompt()
  },
}
