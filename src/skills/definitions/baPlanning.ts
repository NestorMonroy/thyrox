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
  return readFileSync(join(HERE, 'baPlanning.prompt.md'), 'utf8')
}

export const baPlanning: SkillDefinition = {
  name: 'ba-planning',
  description: "Use when planning Business Analysis activities in BABOK. ba:planning — develop the BA Plan, define stakeholder engagement approach, establish governance, create ba-progress tracking structure.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["BA plan","business analysis planning","stakeholder engagement","BABOK planning","BA approach"] },
  get prompt(): string {
    return readPrompt()
  },
}
