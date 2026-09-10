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
  return readFileSync(join(HERE, 'scrumDefinitionOfDone.prompt.md'), 'utf8')
}

export const scrumDefinitionOfDone: SkillDefinition = {
  name: 'scrum-definition-of-done',
  description: "Use when defining or maintaining the Definition of Done — the shared quality checklist every increment must meet to be considered finished. scrum:definition-of-done — establish, version, and evolve the DoD aligned with the project's real CI gates (automated tests, OpenAPI, code review, no new technical debt).",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["Definition of Done","DoD","increment done criteria","quality gate scrum","done checklist"] },
  get prompt(): string {
    return readPrompt()
  },
}
