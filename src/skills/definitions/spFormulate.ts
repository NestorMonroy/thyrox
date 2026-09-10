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
  return readFileSync(join(HERE, 'spFormulate.prompt.md'), 'utf8')
}

export const spFormulate: SkillDefinition = {
  name: 'sp-formulate',
  description: "Use when formulating strategy. sp:formulate — create Balanced Scorecard, Strategy Map, OKRs, and define strategic objectives across perspectives.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["strategy formulation","Strategy Map","Balanced Scorecard","strategic options","OKR design"] },
  get prompt(): string {
    return readPrompt()
  },
}
