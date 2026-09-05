import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * El prompt vive en su propio archivo por la misma razón que
 * `migrationPorter.prompt.md`: es prosa larga con backticks y bloques de
 * código que, dentro de un template literal, habría que escapar uno a uno.
 *
 * Ese `.md` NO es la fuente de la definición: no lleva frontmatter y no
 * declara nada. Sólo transporta la prosa.
 */
function readPrompt(): string {
  return readFileSync(join(HERE, 'retroFacilitator.prompt.md'), 'utf8')
}

export const retroFacilitator: AgentDefinition = {
  name: 'retro-facilitator',
  description:
    'Facilita la retrospectiva al cerrar una iniciativa/ciclo en kaupamex ' +
    '(THYROX cierre, Fase TRACK). Úsalo cuando un work package termina o ' +
    'el ejecutor pide capturar aprendizajes. Conduce el formato de retro ' +
    '(Start/Stop/Continue por defecto; 4Ls; Sailboat), aplica causa raíz ' +
    '(5 Whys / Ishikawa), registra errores como ERR-NNN, prioriza ' +
    'acciones (impacto/esfuerzo) con dueño, y promueve decisiones a ADR. ' +
    'Persiste lecciones en lecciones-aprendidas/. Retorna ' +
    'output_key=\'retro\'.',
  tools: ['Read', 'Glob', 'Grep', 'Bash', 'Write'],
  model: 'claude-sonnet-5',
  // `async_suitable` del .md fuente NO existe en `AgentDefinition` ni en el
  // esquema del cliente (tarea #948) — se descarta, no se inventa la clave.
  get prompt(): string {
    return readPrompt()
  },
}
