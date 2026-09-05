import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/** Ver el comentario equivalente en `migrationPorter.ts`. */
function readPrompt(): string {
  return readFileSync(join(HERE, 'rupCoordinator.prompt.md'), 'utf8')
}

export const rupCoordinator: AgentDefinition = {
  name: 'rup-coordinator',
  description:
    'Coordinator para RUP — Rational Unified Process: 4 fases iterativas ' +
    '(Inception/Elaboration/Construction/Transition) con milestones ' +
    'LCO/LCA/IOC/PD. Usar cuando la metodología RUP está activa.',
  tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  skills: ['rup-inception', 'rup-elaboration', 'rup-construction', 'rup-transition'],
  background: true,
  color: 'purple',
  // Indexa FLOW_HOMES: el emisor pega el bloque «Hogar de diseno»
  // derivado del primitivo; no puede driftear como una tabla en prosa.
  flow: 'rup',
  // `model`/`effort` sin declarar: el .md fuente no los lleva, hereda de la
  // sesión.
  get prompt(): string {
    return readPrompt()
  },
}
