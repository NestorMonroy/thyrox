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
  return readFileSync(join(HERE, 'bpaImplement.prompt.md'), 'utf8')
}

export const bpaImplement: SkillDefinition = {
  name: 'bpa-implement',
  description: "Use when implementing a redesigned business process. bpa:implement — implement process changes through pilot rollout, SOP documentation, and change management to ensure adoption.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["process implementation","process change","SOP process","process training","process rollout"] },
  get prompt(): string {
    return readPrompt()
  },
}
