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
  return readFileSync(join(HERE, 'rmValidation.prompt.md'), 'utf8')
}

export const rmValidation: SkillDefinition = {
  name: 'rm-validation',
  description: "Use when verifying that requirements meet quality standards and stakeholders approve them. rm:validation — conduct formal or informal inspection, obtain stakeholder sign-off, or return to analysis if corrections are needed.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["requirements validation","requirements review RM","sign-off requirements","RM validation","requirements approval"] },
  get prompt(): string {
    return readPrompt()
  },
}
