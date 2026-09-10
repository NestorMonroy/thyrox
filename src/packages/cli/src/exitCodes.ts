/**
 * Los códigos de salida que ya usan los `bin/*.ts` de thyrox — nombrados,
 * no en números sueltos (TASK-DOCS-0205).
 *
 * Patrón, no código: `claude-code-nestor-monroy-tools:
 * packages/cli/src/exit.ts` declara el mismo cuádruple semántico
 * (éxito · fallo · uso incorrecto) para consolidar ~60 sitios repetidos de
 * "imprime y sale" — su docstring lo dice explícitamente. La referencia no
 * declara licencia, así que aquí se cita la ruta y se reimplementa, no se
 * copia el cuerpo.
 *
 * Lo que NO se porta de esa forma: `cliError`/`cliOk` en la referencia
 * llaman `process.exit()` DENTRO del manejador (`return undefined as
 * never`), lo que obliga a espiar `process.exit` para probarlos — su propio
 * comentario lo admite ("tests spy on process.exit and let it return").
 * `harness/bin/harness.ts` ya usa el patrón superior: sus funciones
 * DEVUELVEN el código (`return 2`, `return 0`, …) y un único
 * `process.exit()` vive en el borde (`if (import.meta.main)`). Forzar la
 * forma de la referencia aquí sería reintroducir el peor de los dos
 * estilos donde el mejor ya existe.
 *
 * Medido en el propio árbol (no en la referencia), sin tocar ningún
 * archivo — está fuera de las rutas de esta tarea:
 *
 *   harness/bin/harness.ts   12 `return 2` · 3 `return 3` · 2 `return 1` · 9 `return 0`
 *   binary/bin/binary.ts     `process.exit(EXIT_GUARD)` con EXIT_GUARD = 2 (nombrado allí)
 *   agent/bin/emit.ts        `process.exit(2)` · `process.exit(1)` (sin nombre)
 *
 * Ningún archivo de esos tres se toca aquí. Esta tabla es el vocabulario
 * para cuando se toquen — hoy, el mismo cuádruple vive repetido en tres
 * formas (número suelto, constante local `EXIT_GUARD`, número suelto otra
 * vez) sin un nombre compartido entre ellas.
 */

/** Terminó bien: el turno cerró en `end_turn`, el gate no encontró nada. */
export const EXIT_OK = 0

/** Falló algo que el propio dominio decide: `--strict` con hallazgos, un turno que no cerró en `end_turn`. */
export const EXIT_FAIL = 1

/** Uso incorrecto: falta un flag obligatorio, un valor no reconocido. Nunca se adivina lo que falta. */
export const EXIT_USAGE = 2

/** Conflicto detectado antes de escribir: una reserva ajena, un solape — se puede forzar con `--force`. */
export const EXIT_CONFLICT = 3

export const EXIT_CODE = {
  OK: EXIT_OK,
  FAIL: EXIT_FAIL,
  USAGE: EXIT_USAGE,
  CONFLICT: EXIT_CONFLICT,
} as const

export type ExitCode = (typeof EXIT_CODE)[keyof typeof EXIT_CODE]

/**
 * El nombre humano de un código, para mensajes de diagnóstico y tests.
 *
 * Un código fuera del cuádruple se declara `DESCONOCIDO(N)` — no se le
 * inventa un nombre del cuádruple más cercano, que sería adivinar.
 */
export function exitCodeName(code: number): string {
  switch (code) {
    case EXIT_OK:
      return 'OK'
    case EXIT_FAIL:
      return 'FAIL'
    case EXIT_USAGE:
      return 'USAGE'
    case EXIT_CONFLICT:
      return 'CONFLICT'
    default:
      return `DESCONOCIDO(${code})`
  }
}
