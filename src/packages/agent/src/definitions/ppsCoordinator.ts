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
  return readFileSync(join(HERE, 'ppsCoordinator.prompt.md'), 'utf8')
}

export const ppsCoordinator: AgentDefinition = {
  name: 'pps-coordinator',
  description:
    'Coordinator para PPS — Practical Problem Solving (Toyota TBP): ' +
    'Go-and-See, 5 Whys, A3 Report, 6 fases con tollgates formales. Usar ' +
    'cuando la metodología PPS está activa.',
  tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  skills: [
    'pps-clarify',
    'pps-target',
    'pps-analyze',
    'pps-countermeasures',
    'pps-implement',
    'pps-evaluate',
  ],
  background: true,
  color: 'orange',
  // `model` sin declarar en el .md fuente — hereda el de la sesión.
  get prompt(): string {
    return readPrompt()
  },
}
