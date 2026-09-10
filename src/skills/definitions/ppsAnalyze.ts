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
  return readFileSync(join(HERE, 'ppsAnalyze.prompt.md'), 'utf8')
}

export const ppsAnalyze: SkillDefinition = {
  name: 'pps-analyze',
  description: "Use when solving a structured problem with Toyota TBP. pps:analyze — identify root cause using 5 Whys and Fishbone (Ishikawa), confirm with data, begin A3 Report.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["5 whys","fishbone","ishikawa","root cause TBP","A3 analysis"] },
  get prompt(): string {
    return readPrompt()
  },
}
