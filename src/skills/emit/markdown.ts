import type { SkillDefinition } from '../types.ts'

/**
 * Deriva el `.claude/skills/<name>/SKILL.md` que el cliente lee del
 * filesystem. Mismo criterio que `packages/agent/emit/markdown.ts`: el
 * markdown DEJA de ser fuente — es una codificación de la definición.
 *
 * El orden de claves es el canónico que 30 de los 71 `SKILL.md` medidos ya
 * usaban (`metadata` ANTES de `updated_at`); los otros 29 lo llevaban
 * después. No es una preferencia: es la mayoría medida, y de las dos formas
 * en disco la que coincide con dónde el emisor de agentes pone su última
 * clave anidada (`experimental`, justo antes de `updated_at`) — la misma
 * posición relativa.
 */

/** Cita una cadena YAML: comillas dobles, escapando `\` y `"`. */
function quote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** Lista YAML de flujo, citada elemento a elemento: `["a", "b"]`. */
function quoteFlowList(items: string[]): string {
  return `[${items.map(quote).join(', ')}]`
}

export function toMarkdown(skill: SkillDefinition, updatedAt: string): string {
  const lines: string[] = ['---', `name: ${skill.name}`, `description: ${quote(skill.description)}`]

  if (skill.allowedTools !== undefined) {
    lines.push(`allowed-tools: ${skill.allowedTools.join(' ')}`)
  }
  if (skill.effort !== undefined) {
    lines.push(`effort: ${skill.effort}`)
  }
  if (skill.disableModelInvocation !== undefined) {
    lines.push(`disable-model-invocation: ${skill.disableModelInvocation}`)
  }
  if (skill.metadata !== undefined) {
    lines.push('metadata:', `  triggers: ${quoteFlowList(skill.metadata.triggers)}`)
  }

  lines.push(`updated_at: ${updatedAt}`, '---')
  return `${lines.join('\n')}\n\n${skill.prompt}`
}
