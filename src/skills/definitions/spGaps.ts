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
  return readFileSync(join(HERE, 'spGaps.prompt.md'), 'utf8')
}

export const spGaps: SkillDefinition = {
  name: 'sp-gaps',
  description: "Use when analyzing strategic gaps. sp:gaps — identify where the organization is vs. where it wants to be, root causes of strategic gaps, prioritize gap areas.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["strategic gap","gap analysis strategy","capability gap","strategic aspiration","current vs desired state"] },
  get prompt(): string {
    return readPrompt()
  },
}
