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
  return readFileSync(join(HERE, 'baSolutionEvaluation.prompt.md'), 'utf8')
}

export const baSolutionEvaluation: SkillDefinition = {
  name: 'ba-solution-evaluation',
  description: "Use when evaluating whether a solution delivered the expected business value in BABOK. ba:solution-evaluation — measure solution performance with KPIs, assess value realization, identify limitations, recommend next steps.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["solution evaluation","value realization","solution performance KPI","BABOK evaluation","solution assessment"] },
  get prompt(): string {
    return readPrompt()
  },
}
