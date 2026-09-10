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
  return readFileSync(join(HERE, 'ppsCountermeasures.prompt.md'), 'utf8')
}

export const ppsCountermeasures: SkillDefinition = {
  name: 'pps-countermeasures',
  description: "Use when solving a structured problem with Toyota TBP. pps:countermeasures — develop countermeasures per root cause, evaluate with feasibility/impact matrix, prioritize and create Action Plan.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["countermeasures","TBP action plan","corrective action","A3 countermeasures","action matrix"] },
  get prompt(): string {
    return readPrompt()
  },
}
