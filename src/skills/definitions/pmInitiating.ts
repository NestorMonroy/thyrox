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
  return readFileSync(join(HERE, 'pmInitiating.prompt.md'), 'utf8')
}

export const pmInitiating: SkillDefinition = {
  name: 'pm-initiating',
  description: "Use when starting a PMBOK project or phase. pm:initiating — develop Project Charter, identify stakeholders, define high-level scope and risks, obtain formal authorization to proceed.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["project charter","project authorization","stakeholder identification","PMBOK initiating","project kickoff"] },
  get prompt(): string {
    return readPrompt()
  },
}
