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
  return readFileSync(join(HERE, 'bpaDesign.prompt.md'), 'utf8')
}

export const bpaDesign: SkillDefinition = {
  name: 'bpa-design',
  description: "Use when redesigning a business process. bpa:design — design the To-Be process applying eliminate/simplify/integrate/automate principles, producing the redesigned process map and change rationale.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["to-be process","ESIA","process redesign","eliminate simplify integrate automate","process optimization"] },
  get prompt(): string {
    return readPrompt()
  },
}
