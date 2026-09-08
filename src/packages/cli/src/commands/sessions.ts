/**
 * `--sessions`: las sesiones reanudables de un directorio de transcript.
 *
 * Extraído de `bin/harness.ts` en #205 sin cambio de conducta. Recibe el
 * directorio ya resuelto en vez de resolverlo: quien lo resuelve es el
 * arranque, y hacerlo dos veces daría dos respuestas el día que la regla
 * cambie.
 */
import { resumeChoices } from '../resume.ts'

export function sessionsCommand(transcriptDir: string): number {
  const opciones = resumeChoices(transcriptDir)
  if (opciones.length === 0) {
    process.stdout.write(`no hay sesiones en ${transcriptDir}\n`)
    return 0
  }
  for (const o of opciones) process.stdout.write(`${o.id}  ${o.label}\n`)
  return 0
}
