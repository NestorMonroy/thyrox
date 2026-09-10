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
  return readFileSync(join(HERE, 'cpPlan.prompt.md'), 'utf8')
}

export const cpPlan: SkillDefinition = {
  name: 'cp-plan',
  description: "Use when building the implementation plan after recommendations are approved. cp:plan — define workstreams, milestones, quick wins, change management, and resource plan for client execution.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["implementation plan consulting","consulting roadmap","quick wins","workstreams","change management plan"] },
  get prompt(): string {
    return readPrompt()
  },
}
