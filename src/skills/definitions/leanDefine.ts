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
  return readFileSync(join(HERE, 'leanDefine.prompt.md'), 'utf8')
}

export const leanDefine: SkillDefinition = {
  name: 'lean-define',
  description: "Use when starting a Lean project focused on waste reduction. lean:define — define the waste-reduction problem scope, create Lean Project Charter (TIMWOOD focus), identify VOC, map SIPOC.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["lean","waste reduction","TIMWOOD","lean charter","muda"] },
  get prompt(): string {
    return readPrompt()
  },
}
