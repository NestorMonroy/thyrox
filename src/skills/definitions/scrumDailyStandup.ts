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
  return readFileSync(join(HERE, 'scrumDailyStandup.prompt.md'), 'utf8')
}

export const scrumDailyStandup: SkillDefinition = {
  name: 'scrum-daily-standup',
  description: "Use when the Development Team needs to synchronize daily during a Sprint and inspect progress toward the Sprint Goal. scrum:daily-standup — run the 15-min Daily Scrum, update the Sprint Backlog and burndown, and escalate impediments with an owner and a date.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["daily standup","daily scrum","stand-up diario","sincronización diaria","burndown del sprint"] },
  get prompt(): string {
    return readPrompt()
  },
}
