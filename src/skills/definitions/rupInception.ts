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
  return readFileSync(join(HERE, 'rupInception.prompt.md'), 'utf8')
}

export const rupInception: SkillDefinition = {
  name: 'rup-inception',
  description: "Use when starting a RUP project or iteration. rup:inception — establish project vision, identify critical risks, validate business case, reach LCO milestone to authorize Elaboration.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["RUP inception","vision document","LCO milestone","business case RUP","project kickoff RUP"] },
  get prompt(): string {
    return readPrompt()
  },
}
