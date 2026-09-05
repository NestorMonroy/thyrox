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
  return readFileSync(join(HERE, 'patternHarvester.prompt.md'), 'utf8')
}

export const patternHarvester: AgentDefinition = {
  name: 'pattern-harvester',
  description: "Extrae patrones accionables de un corpus de archivos de análisis deep-dive y calibración, mapeando hallazgos a componentes THYROX (skills, hooks, agentes, guidelines, templates). Produce harvest report distinguiendo qué ya está cubierto vs. qué es nuevo. Usar cuando se consolidan outputs de análisis en mejoras implementables. Do NOT use for phase-to-phase coverage analysis (use deep-review instead). De sólo lectura o planificación: apto para invocarse con background, su entregable se recoge al terminar.",
  tools: ["Read", "Glob", "Grep", "Bash", "Write"],
  // `async_suitable: true` en el frontmatter — NO existe en `AgentDefinition`
  // ni en `AGENT_JSON_KEYS` (tarea #948). Se omite, no se inventa la clave.
  get prompt(): string {
    return readPrompt()
  },
}
