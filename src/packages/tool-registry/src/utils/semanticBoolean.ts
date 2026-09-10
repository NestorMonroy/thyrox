import { z } from 'zod/v4'

/**
 * Booleano que además admite los literales de cadena `"true"` y `"false"`.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/utils/semanticBoolean.ts`
 * (29 líneas). Ese árbol declara `"license": "UNLICENSED"`, así que el cuerpo
 * se reimplementa y no se copia.
 *
 * La entrada de una herramienta es JSON que escribe el modelo, y el modelo
 * entrecomilla booleanos de vez en cuando —`"replace_all":"false"` en vez de
 * `"replace_all":false`—. `z.boolean()` lo rechaza por tipo.
 *
 * `z.coerce.boolean()` NO es el arreglo: usa la veracidad de JavaScript, con
 * lo que `"false"` se convierte en `true`. Es exactamente al revés de lo que
 * el modelo quiso decir, y en silencio.
 *
 * `z.preprocess` emite `{"type":"boolean"}` al esquema del API, así que al
 * modelo se le sigue anunciando un booleano: la tolerancia a la cadena es
 * conversión invisible del lado del cliente, no una forma de entrada que se
 * publique.
 *
 * `.optional()` y `.default()` van DENTRO, sobre el esquema interno, nunca
 * encadenados después: encadenarlos sobre un `ZodPipe` ensancha `z.output<>` a
 * `unknown` en Zod v4.
 *
 *   semanticBoolean()                           -> boolean
 *   semanticBoolean(z.boolean().optional())     -> boolean | undefined
 *   semanticBoolean(z.boolean().default(false)) -> boolean
 */
export function semanticBoolean<T extends z.ZodType>(
  inner: T = z.boolean() as unknown as T,
) {
  return z.preprocess(
    (value: unknown) =>
      value === 'true' ? true : value === 'false' ? false : value,
    inner,
  )
}
