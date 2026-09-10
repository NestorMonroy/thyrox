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
  return readFileSync(join(HERE, 'rupTransition.prompt.md'), 'utf8')
}

export const rupTransition: SkillDefinition = {
  name: 'rup-transition',
  description: "Use when deploying the system to end users in RUP. rup:transition — deploy to production, conduct user acceptance, resolve critical defects, reach PD milestone for formal product release.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["RUP transition","PD milestone","product release RUP","UAT user acceptance","beta deployment"] },
  get prompt(): string {
    return readPrompt()
  },
}
