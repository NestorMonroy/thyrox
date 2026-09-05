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
  return readFileSync(join(HERE, 'agenticReasoning.prompt.md'), 'utf8')
}

export const agenticReasoning: AgentDefinition = {
  name: 'agentic-reasoning',
  description:
    'DEPRECATED — absorbido por deep-dive (Capa 7 calibración THYROX). Usar ' +
    'cuando se invoque este agente por error — redirigir a deep-dive, que ' +
    'auto-aplica calibración cuando el artefacto es un documento WP de ' +
    'THYROX.',
  tools: ['Read', 'Glob', 'Grep', 'Bash', 'Write'],
  // `async_suitable: false` en el .md de disco NO tiene contraparte en
  // `AgentDefinition` ni en el cliente (tarea #948, 0 aciertos en el
  // ejecutable) — se descarta, no se inventa la clave.
  get prompt(): string {
    return readPrompt()
  },
}
