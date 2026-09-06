import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * El prompt vive en su propio archivo porque es prosa larga: 94 backticks
 * medidos, que dentro de un template literal habría que escapar uno a uno.
 * Un backtick sin escapar rompe el parseo del módulo entero, y el defecto
 * sería silencioso hasta la siguiente edición del prompt.
 *
 * Ese `.md` NO es la fuente de la definición: no lleva frontmatter y no
 * declara nada. Sólo transporta la prosa.
 */
function readPrompt(): string {
  return readFileSync(join(HERE, 'deepDive.prompt.md'), 'utf8')
}

export const deepDive: AgentDefinition = {
  name: 'deep-dive',
  description:
    'Análisis adversarial de cualquier artefacto para determinar qué es ' +
    'verdadero, falso e incierto — y por qué. Para artefactos WP de THYROX ' +
    'aplica calibración automática (ratio OBSERVABLE+INFERRED/total ≥ 0.75). ' +
    'Ejecuta mínimo 6 capas de verificación adversarial + capa de ' +
    'calibración cuando aplica. Usar cuando se necesite saber qué es ' +
    'verdad, qué es falso y qué es incierto en cualquier artefacto. Do NOT ' +
    'use when harvesting patterns from a corpus (use pattern-harvester ' +
    'instead). De sólo lectura o planificación: apto para invocarse con background, su entregable se recoge al terminar.',
  tools: ['Read', 'Glob', 'Grep', 'Bash', 'Write'],
  // `async_suitable: true` en el disco no tiene contraparte en
  // `AgentDefinition` ni en el cliente medido (tarea #948) — se descarta,
  // no se inventa la clave.
  get prompt(): string {
    return readPrompt()
  },
}
