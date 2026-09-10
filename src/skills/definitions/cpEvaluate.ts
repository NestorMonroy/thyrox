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
  return readFileSync(join(HERE, 'cpEvaluate.prompt.md'), 'utf8')
}

export const cpEvaluate: SkillDefinition = {
  name: 'cp-evaluate',
  description: "Use when measuring impact and closing a consulting engagement. cp:evaluate — assess realized impact vs projected benefit, document lessons learned, and formally close the engagement.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["impact assessment","knowledge transfer","consulting ROI","engagement closure","lessons learned consulting"] },
  get prompt(): string {
    return readPrompt()
  },
}
