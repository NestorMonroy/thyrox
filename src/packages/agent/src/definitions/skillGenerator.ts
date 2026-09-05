import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentDefinition } from '../types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))

/** Ver el comentario equivalente en `migrationPorter.ts`. */
function readPrompt(): string {
  return readFileSync(join(HERE, 'skillGenerator.prompt.md'), 'utf8')
}

export const skillGenerator: AgentDefinition = {
  name: 'skill-generator',
  description:
    'Genera archivos de skill (.claude/skills/ o .claude/agents/) para una ' +
    'tecnología específica a partir de los templates en registry/. Usar ' +
    'cuando el usuario quiere agregar soporte para una nueva tecnología o ' +
    'cuando bootstrap.py lo invoca para inicializar el proyecto.',
  tools: ['Read', 'Write', 'Glob'],
  // Sin `skills`, `background` ni `color`: el .md fuente no los declara.
  get prompt(): string {
    return readPrompt()
  },
}
