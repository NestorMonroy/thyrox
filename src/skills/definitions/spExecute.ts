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
  return readFileSync(join(HERE, 'spExecute.prompt.md'), 'utf8')
}

export const spExecute: SkillDefinition = {
  name: 'sp-execute',
  description: "Use when executing strategic initiatives. sp:execute — launch initiatives, manage change, cascade strategy to teams, track early progress.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["strategy execution","cascading strategy","strategic initiatives launch","change management strategy","strategy communication"] },
  get prompt(): string {
    return readPrompt()
  },
}
