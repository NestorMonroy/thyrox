/**
 * El registro de comandos: se DERIVA del disco, no se transcribe.
 *
 * Las 27 definiciones no viven como 27 archivos `.ts` escritos a mano —a
 * diferencia de `src/skills/definitions/`, que si los tiene— porque aqui no
 * hay nada que anadir: el `.md` YA contiene todo lo que `CommandDefinition`
 * modela, y transcribirlo 27 veces sólo introduce el error que nadie ve.
 *
 * Que el `.md` sea la fuente NO lo devuelve a ser markdown suelto: pasa por
 * `parseCommand`, se valida contra el tipo, y el emisor lo reproduce byte a
 * byte (control en `tests/commands/roundTrip.test.ts`). Lo que cambia frente
 * a hoy es que existe un TIPO, un registro consultable y un destino
 * declarado — que es lo que faltaba, no el formato del archivo.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseCommand } from './emit/parse.ts'
import { COMMANDS_SOURCE_DIR } from './paths.ts'
import type { CommandDefinition } from './types.ts'

export type { CommandDefinition } from './types.ts'
export { toMarkdown } from './emit/markdown.ts'
export { parseCommand } from './emit/parse.ts'
export { COMMANDS_SOURCE_DIR, COMMANDS_DIR_VAR, commandsDir } from './paths.ts'

/** Todas las definiciones, ordenadas por id. */
export function allCommands(sourceDir: string = COMMANDS_SOURCE_DIR): CommandDefinition[] {
  return readdirSync(sourceDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => parseCommand(f, readFileSync(join(sourceDir, f), 'utf8')))
}

/** Una definicion por su id, o `undefined` si no existe. */
export function findCommand(id: string, sourceDir?: string): CommandDefinition | undefined {
  return allCommands(sourceDir).find((c) => c.id === id)
}
