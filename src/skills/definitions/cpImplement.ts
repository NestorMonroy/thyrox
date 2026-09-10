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
  return readFileSync(join(HERE, 'cpImplement.prompt.md'), 'utf8')
}

export const cpImplement: SkillDefinition = {
  name: 'cp-implement',
  description: "Use when supporting client implementation of approved recommendations. cp:implement — manage workstreams, support steering committee, resolve blockers, and maintain implementation momentum.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["consulting implementation","steering committee","change management consulting","workstream management","implementation momentum"] },
  get prompt(): string {
    return readPrompt()
  },
}
