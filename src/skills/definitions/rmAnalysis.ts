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
  return readFileSync(join(HERE, 'rmAnalysis.prompt.md'), 'utf8')
}

export const rmAnalysis: SkillDefinition = {
  name: 'rm-analysis',
  description: "Use when reviewing and prioritizing collected requirements. rm:analysis — analyze completeness, consistency and priority of requirements; resolve conflicts; decide whether to proceed or return to elicitation.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["requirements analysis RM","RM analysis","requirements prioritization","conflict resolution requirements","requirements completeness"] },
  get prompt(): string {
    return readPrompt()
  },
}
