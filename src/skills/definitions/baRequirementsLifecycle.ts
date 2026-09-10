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
  return readFileSync(join(HERE, 'baRequirementsLifecycle.prompt.md'), 'utf8')
}

export const baRequirementsLifecycle: SkillDefinition = {
  name: 'ba-requirements-lifecycle',
  description: "Use when managing requirements through their lifecycle in BABOK. ba:requirements-lifecycle — trace requirements, manage changes, maintain traceability matrix, control baselines, assess change impact.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["requirements traceability","requirements lifecycle","change control BABOK","BABOK lifecycle","requirements management BABOK"] },
  get prompt(): string {
    return readPrompt()
  },
}
