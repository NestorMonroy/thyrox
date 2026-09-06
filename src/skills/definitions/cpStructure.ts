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
  return readFileSync(join(HERE, 'cpStructure.prompt.md'), 'utf8')
}

export const cpStructure: SkillDefinition = {
  name: 'cp-structure',
  description: "Use when building the analytical workplan after issue tree is approved. cp:structure — form hypotheses, design analyses to validate or kill them, create consulting workplan with workstreams.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["key findings","consulting analysis","so what test","insights synthesis","hypothesis validation"] },
  get prompt(): string {
    return readPrompt()
  },
}
