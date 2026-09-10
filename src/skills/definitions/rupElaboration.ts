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
  return readFileSync(join(HERE, 'rupElaboration.prompt.md'), 'utf8')
}

export const rupElaboration: SkillDefinition = {
  name: 'rup-elaboration',
  description: "Use when establishing the architectural foundation of a RUP project. rup:elaboration — stabilize architecture, specify 80% of use cases, mitigate top technical risks, reach LCA milestone.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["RUP elaboration","architecture prototype","LCA milestone","SAD software architecture","use case specification"] },
  get prompt(): string {
    return readPrompt()
  },
}
