/**
 * El valor de una bandera, por el analizador MÁS completo de los que el
 * árbol tenía (#205).
 *
 * `src/argv.ts` dejó medidas tres copias divergentes del mismo mecanismo y
 * declaró la unificación pendiente «porque exige tocar `harness/bin/harness.ts`
 * y `binary/bin/binary.ts`, ambos fuera de las rutas de este agente». Esta
 * tarea SÍ toca el primero —lo retira—, así que la deuda se paga aquí para su
 * mitad: los comandos de este paquete pasan del `arg()` local a
 * `eagerParseCliFlag`, que es el porte verbatim de la referencia
 * (`ccnmt: packages/app-host/src/cliArgs.ts`).
 *
 * Es una AMPLIACIÓN de conducta, no un refactor, y se declara: el `arg()`
 * retirado sólo reconocía `--flag valor`; éste reconoce además `--flag=valor`.
 * Ninguna invocación que funcionara antes deja de funcionar — el conjunto de
 * entradas aceptadas crece, no cambia.
 *
 * `binary/bin/binary.ts` conserva su `opcion()`: está fuera de este paquete y
 * de esta tarea. Su unificación queda como la mitad no pagada de la deuda.
 */
import { eagerParseCliFlag } from '../argv.ts'

/** El valor de `--<name>`, en cualquiera de sus dos formas. */
export function flag(argv: string[], name: string): string | undefined {
  return eagerParseCliFlag(`--${name}`, argv)
}

/** ¿Está `--<name>` presente, con o sin valor pegado? */
export function hasFlag(argv: string[], name: string): boolean {
  return argv.some(a => a === `--${name}` || a.startsWith(`--${name}=`))
}
