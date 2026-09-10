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
  return readFileSync(join(HERE, 'kanbanWipLimits.prompt.md'), 'utf8')
}

export const kanbanWipLimits: SkillDefinition = {
  name: 'kanban-wip-limits',
  description: "Use when calculating and applying Work In Progress limits per column or person to maximize flow and expose bottlenecks. kanban:wip-limits — set WIP limits with Little's Law, turn the board into a pull system, and make the team swarm to unblock instead of starting new work when a limit is reached.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["WIP limits","work in progress","pull system","Little's Law","bottleneck","stop starting start finishing"] },
  get prompt(): string {
    return readPrompt()
  },
}
