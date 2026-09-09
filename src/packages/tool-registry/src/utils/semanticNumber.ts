import { z } from 'zod/v4'

/**
 * Número que además admite literales decimales en cadena: `"30"`, `"-5"`,
 * `"3.14"`.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/utils/semanticNumber.ts`
 * (36 líneas). Ese árbol declara `"license": "UNLICENSED"`, así que el cuerpo
 * se reimplementa y no se copia.
 *
 * La entrada de una herramienta es JSON que escribe el modelo, y el modelo
 * entrecomilla números de vez en cuando —`"head_limit":"30"` en vez de
 * `"head_limit":30`—. `z.number()` lo rechaza por tipo.
 *
 * `z.coerce.number()` NO es el arreglo: acepta `""` y `null` convirtiéndolos
 * con `Number()`, que da `0`. Eso no tolera un descuido del modelo: enmascara
 * un defecto y lo entrega como un cero legítimo.
 *
 * Sólo se convierte lo que es un literal decimal —`/^-?\d+(\.\d+)?$/`—. Todo
 * lo demás pasa tal cual y lo rechaza el esquema interno: notación científica
 * (`"1e5"`), hexadecimal (`"0x10"`), signo explícito (`"+5"`), punto sin parte
 * entera (`".5"`) o sin parte decimal (`"5."`), y cualquier cosa con espacios.
 *
 * `z.preprocess` emite `{"type":"number"}` al esquema del API, así que al
 * modelo se le sigue anunciando un número.
 *
 * `.optional()` y `.default()` van DENTRO, igual que en `semanticBoolean`.
 *
 *   semanticNumber()                          -> number
 *   semanticNumber(z.number().optional())     -> number | undefined
 *   semanticNumber(z.number().default(0))     -> number
 */
export function semanticNumber<T extends z.ZodType>(
  inner: T = z.number() as unknown as T,
) {
  return z.preprocess((value: unknown) => {
    if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
    return value
  }, inner)
}
