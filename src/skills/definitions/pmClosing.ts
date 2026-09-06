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
  return readFileSync(join(HERE, 'pmClosing.prompt.md'), 'utf8')
}

export const pmClosing: SkillDefinition = {
  name: 'pm-closing',
  description: "Use when formally closing a PMBOK project or phase. pm:closing — obtain final acceptance, document lessons learned by knowledge area, archive project artifacts, release resources, close contracts.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["project closure","project closeout","lessons learned PMBOK","PMBOK closing","final acceptance"] },
  get prompt(): string {
    return readPrompt()
  },
}
