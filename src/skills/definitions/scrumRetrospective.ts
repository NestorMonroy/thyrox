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
  return readFileSync(join(HERE, 'scrumRetrospective.prompt.md'), 'utf8')
}

export const scrumRetrospective: SkillDefinition = {
  name: 'scrum-retrospective',
  description: "Use when a Sprint ends and the team must inspect its own process and teamwork to improve. scrum:retrospective — run a Start/Stop/Continue retrospective in a blameless space, produce at least one concrete improvement action with an owner and a date, and feed lessons into the project's lessons-learned memory.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["retrospective","retrospectiva","start stop continue","mejora continua del equipo","acciones de mejora","lecciones aprendidas","blameless retrospective"] },
  get prompt(): string {
    return readPrompt()
  },
}
