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
  return readFileSync(join(HERE, 'pmExecuting.prompt.md'), 'utf8')
}

export const pmExecuting: SkillDefinition = {
  name: 'pm-executing',
  description: "Use when managing the execution of a PMBOK project. pm:executing — direct and manage project work, conduct quality audits, manage team and stakeholder engagement, implement approved changes.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["project execution","deliverables management","direct and manage","PMBOK executing","resource coordination"] },
  get prompt(): string {
    return readPrompt()
  },
}
