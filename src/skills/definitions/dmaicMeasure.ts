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
  return readFileSync(join(HERE, 'dmaicMeasure.prompt.md'), 'utf8')
}

export const dmaicMeasure: SkillDefinition = {
  name: 'dmaic-measure',
  description: "Use when establishing a quantitative baseline in a DMAIC project. dmaic:measure — define measurement plan, collect process data, calculate Sigma Level baseline, and validate measurement system.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  get prompt(): string {
    return readPrompt()
  },
}
