import type { AgentDefinition } from '../types.ts'
import { renderFlowHomes } from '../flowHomes.ts'

/**
 * Deriva el `.claude/agents/<name>.md` que el cliente lee del filesystem.
 *
 * El markdown dejó de ser fuente: es una CODIFICACIÓN de la definición, la
 * que el cliente consume por esa vía. Las otras dos —`--agents '<json>'` y
 * el control request del SDK— consumen el objeto directamente.
 */

/** Las claves escalares que van al frontmatter, en orden estable. */
const SCALAR_KEYS = [
  'model',
  'effort',
  'permissionMode',
  'maxTurns',
  'color',
  'background',
  'isolation',
] as const

/**
 * `initialPrompt` es prosa y se cita como `description`. Hasta 2026-09-02 el
 * emisor omitía `background`, `isolation` e `initialPrompt` aunque el tipo y el
 * esquema del cliente los declaran: 12 de 30 agentes perdían su
 * `background: true` al re-emitirse.
 */
const QUOTED_KEYS = ['initialPrompt'] as const

/** Las claves de arreglo, que van como lista YAML de guiones. */
const LIST_KEYS = ['tools', 'disallowedTools', 'skills'] as const

/** Cita una cadena YAML: comillas dobles, escapando `\` y `"`. */
function quote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export function toMarkdown(agent: AgentDefinition, updatedAt: string): string {
  const lines: string[] = ['---', `name: ${agent.name}`, `description: ${quote(agent.description)}`]

  for (const key of LIST_KEYS) {
    const list = agent[key]
    if (list === undefined) continue
    lines.push(`${key}:`)
    for (const item of list) lines.push(`  - ${item}`)
  }

  for (const key of SCALAR_KEYS) {
    const value = agent[key]
    if (value === undefined) continue
    lines.push(`${key}: ${value}`)
  }

  for (const key of QUOTED_KEYS) {
    const value = agent[key]
    if (value === undefined) continue
    lines.push(`${key}: ${quote(value)}`)
  }

  // `experimental` es la única clave anidada del esquema sombra (20 de 20 en
  // 2.1.258) y sólo la lee la vía markdown; el JSON la descarta. Se cita el
  // valor porque `1h`/`5m` son cadenas que un lector YAML podría tomar por
  // duración.
  if (agent.experimental?.cacheTtl !== undefined) {
    lines.push('experimental:', `  cacheTtl: ${quote(agent.experimental.cacheTtl)}`)
  }

  lines.push(`updated_at: ${updatedAt}`, '---')
  // Cuando el agente declara `flow`, el cuerpo lleva el bloque «Hogar de
  // diseno» derivado de `FLOW_HOMES` — la definicion CONSUME el primitivo
  // en vez de repetir el mapa en prosa dentro del `*.prompt.md`.
  const body = agent.flow ? `${agent.prompt}${renderFlowHomes(agent.flow)}` : agent.prompt
  return `${lines.join('\n')}\n${body}`
}
