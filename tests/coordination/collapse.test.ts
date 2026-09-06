/**
 * Control del COLAPSO del duplicado del ledger de coordinación.
 *
 * `harness/src/cowork/claims.ts` llevaba su propia copia de tres símbolos que
 * `src/coordination/ledger.ts` ya declara —la ruta relativa, el ascenso al top
 * level y la resolución de la ruta— y lo declaraba en su propia cabecera:
 *
 *     DUPLICADO TEMPORAL: el dueño canónico es `thyrox: src/coordination/
 *     ledger.ts` (thyrox@a1a4fd8). Este cuerpo se colapsa a una reexportación
 *     cuando P3c mueva `packages` a thyrox y el import entre repos deje de
 *     estar bloqueado — tarea #138.
 *
 * La precondición se cumplió: `packages` vive en `src/packages/` de este mismo
 * árbol, así que el import ya no cruza repositorios — es la misma distancia
 * que `claims.ts` ya recorre para `store/db.ts`.
 *
 * Por qué el duplicado no era inocuo aunque los dos cuerpos coincidieran: el
 * canónico gana capacidades que la copia no tiene —un `resolver` inyectable,
 * que es lo que permite ANULAR el ascenso en un control, y un error con
 * nombre— y el consumidor vivo (`bin/harness.ts`) usaba la copia. La mejora
 * vivía en el cuerpo que nadie llamaba.
 *
 * Qué haría fallar este control:
 *
 * 1. Que el colapso fuera una copia más: los cuerpos seguirían en `claims.ts`.
 * 2. Que fuera una reimplementación en vez de una reexportación. La identidad
 *    de referencia lo distingue —dos funciones equivalentes no son la misma
 *    función— y es la única aserción que ve la diferencia.
 * 3. Que la ruta relativa se declarara dos veces con dos nombres y los valores
 *    divergieran.
 * 4. Que la conducta se perdiera: fuera de un repositorio hay que rehusar, no
 *    fabricar una ruta.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_LEDGER_REL, gitTopLevel as gitTopLevelHarness, ledgerPathFor as ledgerPathForHarness,
} from '../../src/packages/harness/src/cowork/claims.ts'
import {
  CoordinationRootError, gitTopLevel, ledgerPathFor, LEDGER_REL,
} from '../../src/coordination/ledger.ts'

const RAIZ = new URL('../..', import.meta.url).pathname
const CLAIMS = join(RAIZ, 'src/packages/harness/src/cowork/claims.ts')

describe('el duplicado se colapsó a una reexportación', () => {
  test('claims.ts ya no declara los tres cuerpos', () => {
    const t = readFileSync(CLAIMS, 'utf8')
    expect(t).not.toContain('export function ledgerPathFor')
    expect(t).not.toContain('export function gitTopLevel')
    // La ruta relativa es la decisión, no el literal: declararla aquí otra vez
    // es la segunda fuente de verdad que el colapso elimina.
    expect(t).not.toContain("'.claude/coordination/claims.jsonl'")
  })

  test('es la MISMA función, no una equivalente', () => {
    expect(gitTopLevelHarness).toBe(gitTopLevel)
  })

  test('la ruta relativa tiene un solo valor bajo sus dos nombres', () => {
    expect(DEFAULT_LEDGER_REL).toBe(LEDGER_REL)
  })
})

describe('la conducta se preserva a través de la superficie del harness', () => {
  test('fuera de un repositorio rehúsa con el error con nombre', () => {
    const fuera = mkdtempSync(join(tmpdir(), 'sin-repo-'))
    expect(() => ledgerPathForHarness(fuera)).toThrow(CoordinationRootError)
  })

  test('la ruta explícita sigue ganando, en la forma que el binario usa', () => {
    const mia = join(tmpdir(), 'mi-ledger.jsonl')
    expect(ledgerPathForHarness(process.cwd(), { explicit: mia })).toBe(mia)
  })

  test('sin ruta explícita cuelga LEDGER_REL del top level', () => {
    expect(ledgerPathForHarness(RAIZ)).toBe(ledgerPathFor(RAIZ))
  })
})
