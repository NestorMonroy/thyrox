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
  return readFileSync(join(HERE, 'baStrategy.prompt.md'), 'utf8')
}

export const baStrategy: SkillDefinition = {
  name: 'ba-strategy',
  description: "Use when analyzing the business problem and defining the change strategy in BABOK. ba:strategy — analyze current state, define future state, assess risks of the change, identify gaps, recommend solution approach.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["business need analysis","current state analysis","future state definition","BABOK strategy","change strategy BA"] },
  get prompt(): string {
    return readPrompt()
  },
}
