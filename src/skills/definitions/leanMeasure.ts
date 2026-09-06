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
  return readFileSync(join(HERE, 'leanMeasure.prompt.md'), 'utf8')
}

export const leanMeasure: SkillDefinition = {
  name: 'lean-measure',
  description: "Use when mapping the current state of a Lean process. lean:measure — create VSM As-Is, measure cycle times, takt time, process efficiency, and identify waste by type.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["value stream map","VSM","current state map","lead time","takt time"] },
  get prompt(): string {
    return readPrompt()
  },
}
