import type { CommandDefinition } from '../types.ts'

/**
 * Deriva el `.claude/commands/<id>.md` que el cliente lee. Mismo criterio que
 * `skills/emit/markdown.ts`: el markdown DEJA de ser fuente — es una
 * codificacion de la definicion.
 *
 * Dos diferencias con el emisor de skills, y las dos salen de medir los 27,
 * no de preferencia:
 *
 *   - `description` va SIN comillas. Ninguna de las 26 en disco las lleva; el
 *     emisor de skills si cita porque alli si van citadas.
 *   - `updated_at` NO se emite. Ningun `.md` de comando lo declara — el de
 *     skills lo emite porque 71 de 71 lo llevan. Anadirlo aqui rompeeria la
 *     ida y vuelta byte a byte contra los 27 que ya existen.
 *
 * El orden de claves es el de disco: name, description, argument-hint,
 * allowed-tools.
 */
export function toMarkdown(command: CommandDefinition): string {
  const lines: string[] = []

  if (command.name !== undefined) lines.push(`name: ${command.name}`)
  if (command.description !== undefined) lines.push(`description: ${command.description}`)
  if (command.argumentHint !== undefined) lines.push(`argument-hint: ${command.argumentHint}`)
  if (command.allowedTools !== undefined) {
    lines.push(`allowed-tools: ${command.allowedTools.join(' ')}`)
  }

  // Sin ninguna clave no se emite frontmatter. NO es un caso hipotetico:
  // `workflow_init.md` no tiene frontmatter — su `---` de la linea 5 es una
  // regla horizontal del cuerpo. Son 26 de 27, no 27; la medicion que dijo
  // «los 27» usaba `grep -lc '^---$'`, que cuenta archivos que CONTIENEN un
  // `---`, no que empiecen con el. Emitir `---\n---` aqui inventaria un
  // frontmatter vacio que el archivo no tiene, y el control de ida y vuelta
  // lo atrapo.
  if (lines.length === 0) return command.prompt

  return `---\n${lines.join('\n')}\n---\n${command.prompt}`
}
