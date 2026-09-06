import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * El prompt vive en su propio archivo por la misma razon que
 * `migrationPorter.prompt.md`: es prosa larga con backticks de sobra para
 * escapar uno a uno dentro de un template literal.
 *
 * Ese `.md` NO es la fuente de la definicion: no lleva frontmatter y no
 * declara nada. Solo transporta la prosa.
 */
function readPrompt(): string {
  return readFileSync(join(HERE, 'workbenchInstrumenter.prompt.md'), 'utf8')
}

export const workbenchInstrumenter: AgentDefinition = {
  name: 'workbench-instrumenter',
  description:
    'Agente que construye una pieza de scripts/workbench/ de kaupamex-api: ' +
    'un manifest.json con question/instrument/metric/blind_to/destination, ' +
    'un test o sonda escrito ANTES del instrumento, un control que ' +
    'discrimina (neutralize_and_measure.sh cuando aplica), y su conclusion ' +
    'persistida como analisis u hallazgo en docs. Usalo cuando ya haya una ' +
    'pregunta concreta que exige construir algo para responderla — no ' +
    'genera la pregunta, la recibe. NO corre pytest si el orquestador lo ' +
    'despacha junto a otros agentes de workbench sobre el mismo arbol ' +
    '(bash-background-tasks.md: la base de pruebas es compartida). NUNCA ' +
    'restaura con git checkout. NO cierra la tarea: eso lo hace el ' +
    'ejecutor (I-011).',
  tools: ['Read', 'Glob', 'Grep', 'Bash', 'Write', 'Edit'],
  model: 'claude-sonnet-5',
  color: 'magenta',
  // `effort`, `maxTurns` y `isolation` sin declarar a proposito: no hay
  // medicion propia de un despacho real de este agente todavia — fijarlos
  // sin esa cifra violaria calibration-verified-numbers.md. Ver el analisis
  // en docs (analisis-workbench-de-api-como-agente.rst), seccion "Preguntas
  // abiertas". `isolation: "worktree"` queda documentado como invariante de
  // despacho en el propio prompt, no hardcodeado aqui — mismo patron que
  // migrationPorter.ts.
  get prompt(): string {
    return readPrompt()
  },
}
