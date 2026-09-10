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
  return readFileSync(join(HERE, 'ppsClarify.prompt.md'), 'utf8')
}

export const ppsClarify: SkillDefinition = {
  name: 'pps-clarify',
  description: "Use when solving a structured problem with Toyota TBP. pps:clarify — clarify and break down the problem using Go-and-See, define ideal vs actual state, decompose and prioritize sub-problems.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["practical problem solving","Toyota TBP","go-and-see","A3 report","gemba"] },
  get prompt(): string {
    return readPrompt()
  },
}
