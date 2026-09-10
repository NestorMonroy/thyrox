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
  return readFileSync(join(HERE, 'baRequirementsAnalysis.prompt.md'), 'utf8')
}

export const baRequirementsAnalysis: SkillDefinition = {
  name: 'ba-requirements-analysis',
  description: "Use when modeling and specifying requirements in BABOK. ba:requirements-analysis — model requirements with use cases and user stories, apply INVEST, verify and validate requirements, define design options.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["requirements modeling","requirements specification BABOK","use case model","BABOK analysis","requirements design"] },
  get prompt(): string {
    return readPrompt()
  },
}
