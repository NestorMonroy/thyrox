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
  return readFileSync(join(HERE, 'scrumBacklogRefinement.prompt.md'), 'utf8')
}

export const scrumBacklogRefinement: SkillDefinition = {
  name: 'scrum-backlog-refinement',
  description: "Use when keeping the Product Backlog healthy — splitting epics into stories, applying INVEST, estimating and ordering by value. scrum:backlog-refinement — desglosar épicas en historias Como/Quiero/Para, aplicar criterios INVEST, estimar en story points por planning poker, ordenar por valor y definir la Definition of Ready (DoR), manteniendo la trazabilidad historia→UC RUP.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["backlog refinement","product backlog","INVEST","definition of ready","user stories","story splitting","planning poker","refinamiento de backlog"] },
  get prompt(): string {
    return readPrompt()
  },
}
