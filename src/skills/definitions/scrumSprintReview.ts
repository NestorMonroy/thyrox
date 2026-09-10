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
  return readFileSync(join(HERE, 'scrumSprintReview.prompt.md'), 'utf8')
}

export const scrumSprintReview: SkillDefinition = {
  name: 'scrum-sprint-review',
  description: "Use when a Sprint ends and the Development Team must demonstrate the Done Increment to stakeholders and collect feedback. scrum:sprint-review — show only Done work, capture stakeholder feedback as Product Backlog items, and update the backlog so the next Sprint reflects what was learned.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["sprint review","demo del sprint","incremento done","stakeholder feedback","revisión del incremento","product backlog update"] },
  get prompt(): string {
    return readPrompt()
  },
}
