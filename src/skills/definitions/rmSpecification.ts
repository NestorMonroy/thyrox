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
  return readFileSync(join(HERE, 'rmSpecification.prompt.md'), 'utf8')
}

export const rmSpecification: SkillDefinition = {
  name: 'rm-specification',
  description: "Use when formalizing analyzed requirements into a specification document. rm:specification — write requirements in a standard format (SRS/BRD/User Stories) with acceptance criteria and traceability.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["requirements specification RM","SRS","BRD","RM specification","acceptance criteria definition"] },
  get prompt(): string {
    return readPrompt()
  },
}
