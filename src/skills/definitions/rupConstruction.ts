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
  return readFileSync(join(HERE, 'rupConstruction.prompt.md'), 'utf8')
}

export const rupConstruction: SkillDefinition = {
  name: 'rup-construction',
  description: "Use when building the system incrementally in RUP. rup:construction — implement use cases iteratively, build and test incrementally, manage technical debt, reach IOC milestone for Transition.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["RUP construction","IOC milestone","iterative development RUP","use case implementation","build increment"] },
  get prompt(): string {
    return readPrompt()
  },
}
