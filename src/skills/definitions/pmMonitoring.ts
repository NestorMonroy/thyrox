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
  return readFileSync(join(HERE, 'pmMonitoring.prompt.md'), 'utf8')
}

export const pmMonitoring: SkillDefinition = {
  name: 'pm-monitoring',
  description: "Use when tracking and controlling a PMBOK project. pm:monitoring — measure project performance with EVM, manage integrated change control, control scope/schedule/cost/quality, implement corrective actions.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["earned value management","EVM","project monitoring","schedule variance","PMBOK controlling"] },
  get prompt(): string {
    return readPrompt()
  },
}
