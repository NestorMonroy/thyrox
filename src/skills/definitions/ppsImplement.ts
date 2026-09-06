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
  return readFileSync(join(HERE, 'ppsImplement.prompt.md'), 'utf8')
}

export const ppsImplement: SkillDefinition = {
  name: 'pps-implement',
  description: "Use when solving a structured problem with Toyota TBP. pps:implement — execute the action plan, track countermeasure completion, adjust in real-time, and update A3 Report.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["TBP implement","A3 implement","contramedidas","implementation log","TBP execution"] },
  get prompt(): string {
    return readPrompt()
  },
}
