/**
 * `@thyrox/cli` — la convención de códigos de salida (TASK-DOCS-0205).
 *
 * Mitad ROJA escrita ANTES del mecanismo: `src/packages/cli/src/exitCodes.ts`
 * no existía todavía, así que el import (relativo, ver nota abajo) fallaba
 * con «Cannot find module».
 *
 * Por qué el import es RELATIVO y no por nombre de paquete
 * ------------------------------------------------------------
 * El criterio correcto —y el que sigue `tests/package/exports.test.ts`
 * bloque 4— es importar por NOMBRE, porque es el único control que falla
 * cuando el mapa de `exports` no está. Medido en esta misma tarea: por
 * nombre falla siempre hoy, incluso para un paquete SIN ninguna dependencia
 * — `@thyrox/cli` no resuelve por nombre desde ningún sitio hasta que
 * `src/packages/bun.lock` registre el workspace (confirmado con
 * `bun install --dry-run`: aditivo, sin red, sin tocar ninguna entrada
 * existente). Ese archivo no está entre las rutas asignadas a este agente
 * en esta tanda, así que el import de abajo usa la ruta relativa como
 * puente — y sigue siendo un control real: antes de escribir
 * `exitCodes.ts` este mismo import relativo fallaba igual.
 */
import { describe, expect, test } from 'bun:test'
import { EXIT_CODE, EXIT_CONFLICT, EXIT_FAIL, EXIT_OK, EXIT_USAGE, exitCodeName } from '../../src/packages/cli/src/exitCodes.ts'

describe('EXIT_CODE — los cuatro valores que ya usan los bin/*.ts de thyrox', () => {
  test('OK es 0', () => {
    expect(EXIT_OK).toBe(0)
    expect(EXIT_CODE.OK).toBe(0)
  })

  test('FAIL es 1 — el mismo valor con que `--strict` falla en harness.ts', () => {
    expect(EXIT_FAIL).toBe(1)
    expect(EXIT_CODE.FAIL).toBe(1)
  })

  test('USAGE es 2 — el que usan los `Falta --flag` de harness.ts', () => {
    expect(EXIT_USAGE).toBe(2)
    expect(EXIT_CODE.USAGE).toBe(2)
  })

  test('CONFLICT es 3 — el que usa claimsCommand ante --overlap / doble reserva', () => {
    expect(EXIT_CONFLICT).toBe(3)
    expect(EXIT_CODE.CONFLICT).toBe(3)
  })

  test('los cuatro son distintos entre sí', () => {
    const valores = [EXIT_OK, EXIT_FAIL, EXIT_USAGE, EXIT_CONFLICT]
    expect(new Set(valores).size).toBe(valores.length)
  })
})

describe('exitCodeName — el nombre humano de un código, para diagnóstico', () => {
  test('nombra los cuatro códigos conocidos', () => {
    expect(exitCodeName(EXIT_OK)).toBe('OK')
    expect(exitCodeName(EXIT_FAIL)).toBe('FAIL')
    expect(exitCodeName(EXIT_USAGE)).toBe('USAGE')
    expect(exitCodeName(EXIT_CONFLICT)).toBe('CONFLICT')
  })

  test('un código fuera del cuádruple se declara DESCONOCIDO, no se inventa un nombre', () => {
    expect(exitCodeName(7)).toBe('DESCONOCIDO(7)')
    expect(exitCodeName(-1)).toBe('DESCONOCIDO(-1)')
  })
})
