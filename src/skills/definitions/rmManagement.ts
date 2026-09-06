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
  return readFileSync(join(HERE, 'rmManagement.prompt.md'), 'utf8')
}

export const rmManagement: SkillDefinition = {
  name: 'rm-management',
  description: "Use when managing requirements baseline, changes and traceability over the project lifecycle. rm:management — maintain requirements baseline, process change requests through CCB, maintain traceability matrix.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["requirements management RM","change request CCB","traceability matrix","RM management","requirements baseline"] },
  get prompt(): string {
    return readPrompt()
  },
}
