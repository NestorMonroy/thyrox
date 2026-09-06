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
  return readFileSync(join(HERE, 'kanbanQueueManagement.prompt.md'), 'utf8')
}

export const kanbanQueueManagement: SkillDefinition = {
  name: 'kanban-queue-management',
  description: "Use when managing the Kanban input queue — prioritizing by cost of delay / WSJF, triaging requests, assigning classes of service and defining a cadenced replenishment policy. kanban:queue-management — minimize lead time of the highest-value work by deciding what enters the system and in what order.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["cost of delay","WSJF","replenishment","classes of service","queue prioritization","triage","input queue"] },
  get prompt(): string {
    return readPrompt()
  },
}
