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
  return readFileSync(join(HERE, 'kanbanFlowMetrics.prompt.md'), 'utf8')
}

export const kanbanFlowMetrics: SkillDefinition = {
  name: 'kanban-flow-metrics',
  description: "Use when measuring and evaluating Kanban system flow. kanban:flow-metrics — measure cycle time, lead time, throughput and WIP, build the Cumulative Flow Diagram, detect bottlenecks and forecast delivery with percentile-based Service Level Expectations.",
  allowedTools: ["Read","Glob","Grep","Bash","Write","Edit"],
  effort: 'medium',
  disableModelInvocation: true,
  metadata: { triggers: ["cycle time","lead time","throughput","cumulative flow diagram","service level expectation","Little's Law","flow metrics"] },
  get prompt(): string {
    return readPrompt()
  },
}
