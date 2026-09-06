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
  return readFileSync(join(HERE, 'spAdjust.prompt.md'), 'utf8')
}

export const spAdjust: SkillDefinition = {
  name: 'sp-adjust',
  description: "Use when adapting strategy based on results. sp:adjust — update strategy based on monitoring, embed learnings, refresh OKRs and BSC for next cycle.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["strategy adjustment","strategic pivot","annual strategy review","new strategic cycle","strategy refresh"] },
  get prompt(): string {
    return readPrompt()
  },
}
