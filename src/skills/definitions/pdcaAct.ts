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
  return readFileSync(join(HERE, 'pdcaAct.prompt.md'), 'utf8')
}

export const pdcaAct: SkillDefinition = {
  name: 'pdca-act',
  description: "Use when deciding whether to standardize or adjust a PDCA improvement. pdca:act — standardize and scale if successful, or adjust and plan next cycle if not. Document lessons learned.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  get prompt(): string {
    return readPrompt()
  },
}
