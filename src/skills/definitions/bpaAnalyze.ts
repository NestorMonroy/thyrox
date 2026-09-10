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
  return readFileSync(join(HERE, 'bpaAnalyze.prompt.md'), 'utf8')
}

export const bpaAnalyze: SkillDefinition = {
  name: 'bpa-analyze',
  description: "Use when analyzing an As-Is business process. bpa:analyze — classify activities as VA/BVA/NVA, identify bottlenecks and root causes, and produce Gap Analysis between current and target state.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["VA NVA BVA","value added analysis","process metrics","process bottleneck","root cause process"] },
  get prompt(): string {
    return readPrompt()
  },
}
