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
  return readFileSync(join(HERE, 'ppsTarget.prompt.md'), 'utf8')
}

export const ppsTarget: SkillDefinition = {
  name: 'pps-target',
  description: "Use when solving a structured problem with Toyota TBP. pps:target — set a measurable SMART target, establish baseline, define deadline and success criteria.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["SMART target","baseline TBP","performance gap","problem target","TBP target"] },
  get prompt(): string {
    return readPrompt()
  },
}
