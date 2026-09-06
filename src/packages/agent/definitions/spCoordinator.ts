import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/** Ver el comentario equivalente en `migrationPorter.ts`. */
function readPrompt(): string {
  return readFileSync(join(HERE, 'spCoordinator.prompt.md'), 'utf8')
}

export const spCoordinator: AgentDefinition = {
  name: 'sp-coordinator',
  description:
    'Coordinator para Strategic Planning: PESTEL/SWOT, strategy ' +
    'formulation, Balanced Scorecard, OKRs, 8 fases con tollgates y ciclos ' +
    'estratégicos (sp:adjust → sp:analysis). Usar cuando la metodología SP ' +
    'está activa.',
  tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  skills: [
    'sp-context', 'sp-analysis', 'sp-gaps', 'sp-formulate',
    'sp-plan', 'sp-execute', 'sp-monitor', 'sp-adjust',
  ],
  background: true,
  color: 'purple',
  // `model`/`effort` sin declarar: el .md fuente no los lleva, hereda de la
  // sesión.
  get prompt(): string {
    return readPrompt()
  },
}
