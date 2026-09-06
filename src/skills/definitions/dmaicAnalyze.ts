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
  return readFileSync(join(HERE, 'dmaicAnalyze.prompt.md'), 'utf8')
}

export const dmaicAnalyze: SkillDefinition = {
  name: 'dmaic-analyze',
  description: "Use when identifying root causes in a DMAIC project. dmaic:analyze — perform root cause analysis using statistical tools (Pareto, Ishikawa, regression), validate causes with data.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  get prompt(): string {
    return readPrompt()
  },
}
