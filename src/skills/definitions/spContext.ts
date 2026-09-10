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
  return readFileSync(join(HERE, 'spContext.prompt.md'), 'utf8')
}

export const spContext: SkillDefinition = {
  name: 'sp-context',
  description: "Use when starting a strategic planning process. sp:context — define organizational context, mission/vision/values, stakeholder landscape, and current strategic position.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  get prompt(): string {
    return readPrompt()
  },
}
