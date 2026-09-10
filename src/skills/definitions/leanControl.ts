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
  return readFileSync(join(HERE, 'leanControl.prompt.md'), 'utf8')
}

export const leanControl: SkillDefinition = {
  name: 'lean-control',
  description: "Use when sustaining Lean improvements after implementation. lean:control — 5S audits, standard work documentation, visual controls, A3 sustainability reviews, Yokoten (horizontal deployment).",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["visual management","gemba walk","yokoten","SOP lean","lean sustain"] },
  get prompt(): string {
    return readPrompt()
  },
}
