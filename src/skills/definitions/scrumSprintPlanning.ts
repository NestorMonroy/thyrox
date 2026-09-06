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
  return readFileSync(join(HERE, 'scrumSprintPlanning.prompt.md'), 'utf8')
}

export const scrumSprintPlanning: SkillDefinition = {
  name: 'scrum-sprint-planning',
  description: "Use when planning a Scrum Sprint — selecting backlog items, defining the Sprint Goal and building the Sprint Backlog. scrum:sprint-planning — seleccionar items del Product Backlog priorizado, fijar un Sprint Goal único y medible, descomponer en tareas, estimar en story points (Fibonacci) y confirmar capacidad del equipo.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["sprint planning","sprint goal","sprint backlog","story points","team capacity","iteration planning"] },
  get prompt(): string {
    return readPrompt()
  },
}
