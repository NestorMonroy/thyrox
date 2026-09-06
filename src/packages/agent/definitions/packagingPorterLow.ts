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
  return readFileSync(join(HERE, 'packagingPorterLow.prompt.md'), 'utf8')
}

export const packagingPorterLow: AgentDefinition = {
  name: 'packaging-porter-low',
  description: "Agente de porte del directorio de empaquetado debian/ de la referencia Odoo a kaupamex-api. Variante de esfuerzo low del experimento de la tarea #950. Escribe sólo en su directorio de salida; no toca kaupamex-api ni commitea.",
  tools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
  model: 'claude-sonnet-5',
  effort: 'low',
  get prompt(): string {
    return readPrompt()
  },
}
