import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * El prompt vive en su propio archivo porque es prosa larga: 60 backticks
 * medidos, que dentro de un template literal habría que escapar uno a uno.
 * Un backtick sin escapar rompe el parseo del módulo entero, y el defecto
 * sería silencioso hasta la siguiente edición del prompt.
 *
 * Ese `.md` NO es la fuente de la definición: no lleva frontmatter y no
 * declara nada. Sólo transporta la prosa.
 */
function readPrompt(): string {
  return readFileSync(join(HERE, 'deepReview.prompt.md'), 'utf8')
}

export const deepReview: AgentDefinition = {
  name: 'deep-review',
  description:
    'Use when analyzing coverage between consecutive WP phases, or ' +
    'analyzing architectural patterns in external repos/docs. Analiza ' +
    'cobertura entre artefactos de fases consecutivas del WP, o ' +
    'profundidad de referencias externas. Usar cuando el usuario pide un ' +
    'deep-review antes de avanzar de Phase N a Phase N+1, o cuando quiere ' +
    'analizar patrones arquitectónicos en documentación externa (README, ' +
    'specs, repos). Do NOT use when harvesting patterns from a corpus of ' +
    'analysis files (use pattern-harvester instead). De sólo lectura o planificación: apto para invocarse con background, su entregable se recoge al terminar.',
  tools: ['Read', 'Glob', 'Grep', 'Bash'],
  // `async_suitable: true  # Read-only analysis …` en el disco no tiene
  // contraparte en `AgentDefinition` ni en el cliente medido (tarea #948) —
  // se descarta la clave, y con ella su comentario inline.
  get prompt(): string {
    return readPrompt()
  },
}
