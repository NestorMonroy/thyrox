import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/** El prompt es corto, pero se mantiene en su propio archivo por consistencia
 * con el resto de definiciones del paquete (ver `migrationPorter.ts`). */
function readPrompt(): string {
  return readFileSync(join(HERE, 'pruebaPalancas.prompt.md'), 'utf8')
}

export const pruebaPalancas: AgentDefinition = {
  name: 'prueba-palancas',
  description:
    'Agente de PRUEBA — mide si maxTurns, disallowedTools y effort surten ' +
    'efecto en este entorno. No hace trabajo real; se borra tras la ' +
    'medición.',
  tools: ['Read', 'Grep', 'Glob', 'Bash', 'Write', 'Edit'],
  disallowedTools: ['Write', 'Edit'],
  model: 'claude-sonnet-5',
  effort: 'low',
  maxTurns: 2,
  get prompt(): string {
    return readPrompt()
  },
}
