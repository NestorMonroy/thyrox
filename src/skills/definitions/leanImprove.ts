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
  return readFileSync(join(HERE, 'leanImprove.prompt.md'), 'utf8')
}

export const leanImprove: SkillDefinition = {
  name: 'lean-improve',
  description: "Use when designing and implementing Lean improvements. lean:improve — Kaizen events, 5S, Kanban, SMED, Jidoka, To-Be VSM design, value stream improvement implementation.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["5S","kaizen","kanban","poka-yoke","lean implementation"] },
  get prompt(): string {
    return readPrompt()
  },
}
