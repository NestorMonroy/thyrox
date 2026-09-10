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
  return readFileSync(join(HERE, 'spMonitor.prompt.md'), 'utf8')
}

export const spMonitor: SkillDefinition = {
  name: 'sp-monitor',
  description: "Use when monitoring strategy execution. sp:monitor — review KPIs, OKR check-ins, BSC dashboards, strategic review meetings.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["strategy review","BSC review","KPI monitoring strategy","OKR check-in","quarterly strategy review"] },
  get prompt(): string {
    return readPrompt()
  },
}
