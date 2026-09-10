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
  return readFileSync(join(HERE, 'cpDiagnosis.prompt.md'), 'utf8')
}

export const cpDiagnosis: SkillDefinition = {
  name: 'cp-diagnosis',
  description: "Use when structuring a consulting problem after initiation. cp:diagnosis — build MECE Issue Tree, decompose the diagnostic question, plan initial data gathering and client interviews.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["issue tree","MECE","hypothesis driven","data collection consulting","consulting diagnosis"] },
  get prompt(): string {
    return readPrompt()
  },
}
