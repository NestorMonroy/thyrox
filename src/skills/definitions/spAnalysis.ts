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
  return readFileSync(join(HERE, 'spAnalysis.prompt.md'), 'utf8')
}

export const spAnalysis: SkillDefinition = {
  name: 'sp-analysis',
  description: "Use when doing environmental scanning for strategic planning. sp:analysis — conduct SWOT, PESTEL, Porter's Five Forces, and current state baseline assessment.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["PESTEL","SWOT","Porter five forces","environmental analysis","strategic analysis"] },
  get prompt(): string {
    return readPrompt()
  },
}
