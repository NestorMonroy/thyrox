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
  return readFileSync(join(HERE, 'pmPlanning.prompt.md'), 'utf8')
}

export const pmPlanning: SkillDefinition = {
  name: 'pm-planning',
  description: "Use when developing the project management plan in PMBOK. pm:planning — develop all subsidiary plans across 10 knowledge areas, create WBS, define schedule with CPM/PERT, estimate costs, plan quality/risks/communications/stakeholders.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["project management plan","WBS","schedule planning","PMBOK planning","cost estimation"] },
  get prompt(): string {
    return readPrompt()
  },
}
