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
  return readFileSync(join(HERE, 'rmElicitation.prompt.md'), 'utf8')
}

export const rmElicitation: SkillDefinition = {
  name: 'rm-elicitation',
  description: "Use when starting requirements gathering or when stakeholder needs are unknown. rm:elicitation — plan and conduct requirements elicitation using structured techniques, confirm results with stakeholders.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["RM elicitation","requirements discovery","requirements collection RM","requirements lifecycle","RM cycle"] },
  get prompt(): string {
    return readPrompt()
  },
}
