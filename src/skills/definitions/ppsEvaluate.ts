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
  return readFileSync(join(HERE, 'ppsEvaluate.prompt.md'), 'utf8')
}

export const ppsEvaluate: SkillDefinition = {
  name: 'pps-evaluate',
  description: "Use when solving a structured problem with Toyota TBP. pps:evaluate — confirm effect against target, standardize successful countermeasures, share learnings, and close A3 Report.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["effect confirmation","A3 evaluate","results verification","standardize TBP","yokoten TBP"] },
  get prompt(): string {
    return readPrompt()
  },
}
