import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SkillDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * El prompt vive en su propio archivo — es prosa larga, con tablas y
 * rutas relativas a `./assets/` y `./references/` propios del skill.
 * Ese `.md` NO es la fuente de la definición: no lleva frontmatter.
 */
function readPrompt(): string {
  return readFileSync(join(HERE, 'bpaMap.prompt.md'), 'utf8')
}

export const bpaMap: SkillDefinition = {
  name: 'bpa-map',
  description: "Use when documenting an As-Is business process. bpa:map — document As-Is processes using swimlane diagrams and BPMN notation to create a shared understanding of how work actually flows.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["BPMN","process mapping","swim lane diagram","as-is process","process documentation"] },
  get prompt(): string {
    return readPrompt()
  },
}
