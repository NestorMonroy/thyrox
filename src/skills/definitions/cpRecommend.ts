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
  return readFileSync(join(HERE, 'cpRecommend.prompt.md'), 'utf8')
}

export const cpRecommend: SkillDefinition = {
  name: 'cp-recommend',
  description: "Use when synthesizing consulting findings into recommendations. cp:recommend — apply Pyramid Principle and SCQA to build the executive storyline and recommendation deck.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["Pyramid Principle","SCQA","recommendation deck","storyline consulting","executive communication"] },
  get prompt(): string {
    return readPrompt()
  },
}
