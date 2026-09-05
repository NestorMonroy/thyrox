import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * El prompt vive en su propio archivo porque es prosa larga: 67 backticks
 * medidos, que dentro de un template literal habría que escapar uno a uno.
 * Un backtick sin escapar rompe el parseo del módulo entero, y el defecto
 * sería silencioso hasta la siguiente edición del prompt.
 *
 * Ese `.md` NO es la fuente de la definición: no lleva frontmatter y no
 * declara nada. Sólo transporta la prosa.
 */
function readPrompt(): string {
  return readFileSync(join(HERE, 'migrationPorter.prompt.md'), 'utf8')
}

export const migrationPorter: AgentDefinition = {
  name: 'migration-porter',
  description:
    'Agente de migración/porte de un archivo de la referencia Odoo al árbol ' +
    'de kaupamex-api. Úsalo cuando haya que portar o completar un archivo ' +
    'concreto (modelo, controller, helper) desde odoo-tools. Descubre la ' +
    'forma leyendo la referencia — nunca de conocimiento de dominio asumido ' +
    '—, porta TODOS los símbolos o declara su cobertura, y cierra contra los ' +
    'gates estáticos del repo más el subconjunto derivado de pytest. NO ' +
    'cierra la tarea: eso lo hace el ejecutor (I-011). Persiste su análisis ' +
    'y su hallazgo en docs antes de resumir.',
  tools: ['Read', 'Glob', 'Grep', 'Bash', 'Write', 'Edit'],
  model: 'claude-sonnet-5',
  color: 'cyan',
  // `effort` sin declarar a propósito: hereda el de la sesión hasta que
  // el ejecutor decida cuál corresponde (tarea #950).
  get prompt(): string {
    return readPrompt()
  },
}
