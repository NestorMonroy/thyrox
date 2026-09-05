import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/** Ver el comentario equivalente en `migrationPorter.ts`. */
function readPrompt(): string {
  return readFileSync(join(HERE, 'taskExecutor.prompt.md'), 'utf8')
}

export const taskExecutor: AgentDefinition = {
  name: 'task-executor',
  description:
    'Ejecuta tareas atómicas de un task-plan.md. Usar cuando hay un ' +
    'task-plan con checkboxes T-NNN y el usuario quiere implementar la ' +
    'siguiente tarea pendiente. Usa herramientas nativas para file ops y ' +
    'exec_cmd para shell. Reporta errores con contexto.',
  tools: [
    'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash',
    'mcp__thyrox-executor__exec_cmd',
    'mcp__thyrox-executor__exec_python',
    'mcp__thyrox-memory__store',
  ],
  // Sin `skills`, `background`, `color`, `model` ni `effort`: el .md fuente
  // no los declara.
  get prompt(): string {
    return readPrompt()
  },
}
