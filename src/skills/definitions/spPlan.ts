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
  return readFileSync(join(HERE, 'spPlan.prompt.md'), 'utf8')
}

export const spPlan: SkillDefinition = {
  name: 'sp-plan',
  description: "Use when creating the strategic plan. sp:plan — define strategic initiatives, owners, timelines, resource allocation, and quick wins.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["strategic plan","strategic initiatives","OKR","strategic roadmap","resource allocation strategy"] },
  get prompt(): string {
    return readPrompt()
  },
}
