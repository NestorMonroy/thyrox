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
  return readFileSync(join(HERE, 'leanAnalyze.prompt.md'), 'utf8')
}

export const leanAnalyze: SkillDefinition = {
  name: 'lean-analyze',
  description: "Use when identifying root causes of waste in a Lean process. lean:analyze — root cause analysis of TIMWOOD wastes, 5 Whys applied to Lean, Fishbone (6M), waste prioritization matrix.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["future state VSM","NVA elimination","kaizen events","lean root cause","waste analysis"] },
  get prompt(): string {
    return readPrompt()
  },
}
