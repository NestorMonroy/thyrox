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
  return readFileSync(join(HERE, 'bpaMonitor.prompt.md'), 'utf8')
}

export const bpaMonitor: SkillDefinition = {
  name: 'bpa-monitor',
  description: "Use when tracking a redesigned business process performance. bpa:monitor — monitor process KPIs against baseline and targets, identify deviations, and drive continuous improvement cycles.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["process monitoring","process KPI","process performance dashboard","before after process","process continuous improvement"] },
  get prompt(): string {
    return readPrompt()
  },
}
