/**
 * Porte fiel de `ccnmt: packages/shell/src/findExecutable.ts`.
 *
 * Busca un ejecutable recorriendo PATH, análogo a `which`. Sustituye a
 * `findActualExecutable` de spawn-rx para no arrastrar rxjs (~313 KB).
 *
 * Devuelve `{ cmd, args }` para calzar con la forma del API de spawn-rx:
 * `cmd` es la ruta resuelta si se encontró, o el nombre original si no.
 * `args` es siempre el paso directo de los argumentos de entrada.
 *
 * Porte COMPLETO: el único símbolo exportado de la fuente está presente.
 *
 * @module
 */
import { whichSync } from './which.js'

export function findExecutable(
  exe: string,
  args: string[],
): { cmd: string; args: string[] } {
  const resolved = whichSync(exe)
  return { cmd: resolved ?? exe, args }
}
