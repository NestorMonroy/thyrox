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
  return readFileSync(join(HERE, 'kanbanBoardSetup.prompt.md'), 'utf8')
}

export const kanbanBoardSetup: SkillDefinition = {
  name: 'kanban-board-setup',
  description: "Use when designing the Kanban board — defining columns (workflow states), explicit entry/exit policies per column, classes of service, and the value-stream mapping. kanban:board-setup — make the work visible so the team manages flow on a board that reflects how work actually moves.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["Kanban board","workflow columns","explicit policies","classes of service","visualize work"] },
  get prompt(): string {
    return readPrompt()
  },
}
