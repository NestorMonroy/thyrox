/**
 * La mitad ROJA de `classifyToolError`.
 *
 * Procedencia del SUJETO:
 * `ccnmt: packages/tool-registry/src/services/classifyToolError.ts`. Los casos
 * son propios —ese árbol declara `"license": "UNLICENSED"`.
 *
 * QUÉ SE MIDE, y por qué es una función de una línea con cuatro casos. La
 * etiqueta viaja a un tablero de telemetría, así que dos defectos opuestos
 * cuestan: emitir algo que no dice nada (`nJT`, un nombre mangleado) y emitir
 * algo que no debería salir (una ruta, un fragmento de código). El orden de
 * las ramas ES el contrato: primero el mensaje ya vetado, luego el código del
 * runtime, luego el nombre —si es largo—, y sólo entonces el genérico.
 *
 * Cuatro costuras con anulación, y las cuatro se corrieron:
 *
 * 1. **La prioridad de `TelemetrySafeError`** — va antes que `instanceof
 *    Error`, del que hereda. Anulación: quitar su rama y caen **3** casos, los
 *    tres de su bloque: sin ella los tres pasan por la rama del nombre y salen
 *    como `TelemetrySafeError`, perdiendo el mensaje ya vetado.
 * 2. **La rama de errno** — un error de `fs` se etiqueta por su código.
 *    Anulación: quitarla y caen **2** casos, el 4 y el 5; `ENOENT` saldría
 *    como `Error`, porque el nombre de un error de `fs` es el genérico.
 * 3. **El umbral de nombre mangleado** — `length > 3`. Anulación: bajarlo a
 *    `> 0` y cae **1** caso, el 8, el del identificador de tres letras, que es
 *    exactamente lo que el módulo existe para no emitir.
 * 4. **Los dos recortes, que son costuras distintas** — Anulación por
 *    separado: quitar el de 200 cae el caso 3; quitar el de 60 cae el 10.
 *    **1** caso cada uno.
 *
 * Métrica: la cadena devuelta para las cuatro clases de entrada.
 * Ciega a: si el mensaje vetado es de verdad seguro — eso lo afirma quien
 * construye el `TelemetrySafeError`, y ninguna función puede verificarlo.
 */
import { describe, expect, test } from 'bun:test'
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS as TelemetrySafeError } from '@thyrox/local-observability/errorHelpers.js'
import { classifyToolError } from '../classifyToolError.js'

/** Un error de `fs` real, con la forma que le da el runtime. */
function errnoError(code: string): Error {
  return Object.assign(new Error(`${code}: no such file`), { code })
}

describe('classifyToolError — la rama del mensaje ya vetado', () => {
  test('1. emite el telemetryMessage, no el message', () => {
    const e = new TelemetrySafeError('falló leyendo /home/user/secreto', 'read failed')
    expect(classifyToolError(e)).toBe('read failed')
  })

  test('2. gana sobre la rama del nombre, de la que hereda', () => {
    // `TelemetrySafeError` ES un `Error` con `name` de 18 caracteres: si su
    // rama no fuera primero, saldría el nombre y se perdería el mensaje.
    const e = new TelemetrySafeError('x', 'vetado')
    expect(e).toBeInstanceOf(Error)
    expect(e.name.length).toBeGreaterThan(3)
    expect(classifyToolError(e)).toBe('vetado')
  })

  test('3. recorta el mensaje vetado a 200 caracteres', () => {
    const e = new TelemetrySafeError('x', 'a'.repeat(500))
    expect(classifyToolError(e)).toHaveLength(200)
  })
})

describe('classifyToolError — la rama del código del runtime', () => {
  test('4. un error de fs sale como Error:<código>', () => {
    expect(classifyToolError(errnoError('ENOENT'))).toBe('Error:ENOENT')
    expect(classifyToolError(errnoError('EACCES'))).toBe('Error:EACCES')
  })

  test('5. el código gana sobre el nombre propio', () => {
    const e = Object.assign(new Error('x'), { code: 'EPERM', name: 'FileSystemError' })
    expect(classifyToolError(e)).toBe('Error:EPERM')
  })

  test('6. un `code` que no es cadena no activa la rama', () => {
    const e = Object.assign(new Error('x'), { code: 42 })
    expect(classifyToolError(e)).toBe('Error')
  })
})

describe('classifyToolError — la rama del nombre, y su umbral', () => {
  test('7. un nombre real y largo se emite', () => {
    const e = new Error('x')
    e.name = 'AbortError'
    expect(classifyToolError(e)).toBe('AbortError')
  })

  test('8. un nombre mangleado de tres letras NO se emite', () => {
    // El defecto que el módulo existe para evitar: en un build minificado el
    // nombre queda como un identificador corto que no dice nada.
    const e = new Error('x')
    e.name = 'nJT'
    expect(classifyToolError(e)).toBe('Error')
  })

  test('9. el genérico `Error` tampoco se emite como nombre', () => {
    expect(classifyToolError(new Error('x'))).toBe('Error')
  })

  test('10. recorta el nombre a 60 caracteres', () => {
    const e = new Error('x')
    e.name = 'N'.repeat(200)
    expect(classifyToolError(e)).toHaveLength(60)
  })
})

describe('classifyToolError — lo que no es un Error', () => {
  test('11. cualquier valor ajeno sale como UnknownError', () => {
    for (const v of ['una cadena', 42, null, undefined, { code: 'ENOENT' }, []]) {
      expect(classifyToolError(v)).toBe('UnknownError')
    }
  })
})
