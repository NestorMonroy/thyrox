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
  return readFileSync(join(HERE, 'baElicitation.prompt.md'), 'utf8')
}

export const baElicitation: SkillDefinition = {
  name: 'ba-elicitation',
  description: "Use when collecting information from stakeholders in BABOK. ba:elicitation — plan and execute elicitation activities, confirm results with stakeholders, communicate findings.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["elicitation","requirements gathering","stakeholder interviews","BABOK elicitation","information collection"] },
  get prompt(): string {
    return readPrompt()
  },
}
