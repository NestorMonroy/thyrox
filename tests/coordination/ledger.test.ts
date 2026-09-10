/**
 * Prueba de `coordination/ledger` — el hogar declarado del ledger de reservas.
 *
 * Mitad ROJA escrita antes del mecanismo: el modulo no existe todavia y este
 * archivo falla al importarlo. Ese fallo es el resultado que se persiste.
 *
 * Los dos defectos que motivan cada bloque estan MEDIDOS, no supuestos, con
 * las dos sondas de
 * `docs: .claude/eventos/hogar-del-ledger-de-coordinacion-20260905T122607/`:
 *
 * 1. **Fuera de un repo el ledger se escribe igual.** La cabecera del
 *    mecanismo de origen declara que el estado compartido vive en texto
 *    versionado *porque* «git lo fusiona linea a linea». La sonda 1 escribio
 *    el ledger en un directorio temporal sin `.git` y `git status` fallo con
 *    `not a git repository`: el archivo existe y la propiedad que justifica su
 *    formato no.
 * 2. **Dos subdirectorios del mismo repo NO comparten ledger.** La sonda 2
 *    reservo la misma ruta desde la raiz y desde `packages/harness`; el gate
 *    de solape vio **0** solapes donde hay 1. Es un verde que no discrimina:
 *    el mecanismo reporta sano justo cuando ha dejado de funcionar.
 *
 * El bloque 5 es el control de anulacion. Retirada la resolucion al top level
 * —sustituyendola por un resolutor que no asciende ni rehusa— tienen que caer
 * EXACTAMENTE las aserciones que dependen de ella, y ninguna mas.
 */
import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { realpathSync } from 'node:fs'

import {
  CoordinationRootError,
  LEDGER_REL,
  gitTopLevel,
  ledgerPathFor,
} from '../../src/coordination/ledger'

/** Un repo sintetico con un subdirectorio, para medir que los dos coinciden. */
function makeRepo(): { root: string; sub: string } {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'coord-')))
  execFileSync('git', ['-C', root, 'init', '-q'])
  const sub = join(root, 'packages', 'harness')
  mkdirSync(sub, { recursive: true })
  return { root, sub }
}

/** Un directorio que NO esta dentro de ningun repositorio. */
function makeNonRepo(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), 'no-repo-')))
}

describe('1. La ubicacion se declara una vez', () => {
  test('la constante nombra el ledger, y es relativa', () => {
    expect(LEDGER_REL).toBe('.claude/coordination/claims.jsonl')
    expect(LEDGER_REL.startsWith('/')).toBe(false)
  })
})

describe('2. El ledger vive en el TOP LEVEL del repo, no en el cwd', () => {
  test('la raiz y un subdirectorio dan EL MISMO archivo', () => {
    const { root, sub } = makeRepo()
    expect(ledgerPathFor(sub)).toBe(ledgerPathFor(root))
  })

  test('y ese archivo cuelga del top level', () => {
    const { root, sub } = makeRepo()
    expect(ledgerPathFor(sub)).toBe(join(root, LEDGER_REL))
  })

  test('gitTopLevel asciende desde el subdirectorio', () => {
    const { root, sub } = makeRepo()
    expect(gitTopLevel(sub)).toBe(root)
  })
})

describe('3. Fuera de un repo REHUSA nombrando, y no fabrica ruta', () => {
  test('lanza CoordinationRootError', () => {
    const fuera = makeNonRepo()
    expect(() => ledgerPathFor(fuera)).toThrow(CoordinationRootError)
  })

  test('el mensaje NOMBRA el directorio que no pudo resolver', () => {
    const fuera = makeNonRepo()
    let mensaje = ''
    try {
      ledgerPathFor(fuera)
    } catch (e) {
      mensaje = (e as Error).message
    }
    expect(mensaje).toContain(fuera)
  })

  test('y no deja nada escrito: rehusar no es escribir a medias', () => {
    const fuera = makeNonRepo()
    try {
      ledgerPathFor(fuera)
    } catch {
      /* esperado */
    }
    expect(existsSync(join(fuera, '.claude'))).toBe(false)
  })

  test('gitTopLevel devuelve null en vez de lanzar: el juicio es del llamador', () => {
    expect(gitTopLevel(makeNonRepo())).toBe(null)
  })
})

describe('4. La ruta explicita es la via de escape, y no se comprueba', () => {
  test('una ruta explicita se devuelve tal cual, aunque no haya repo', () => {
    const fuera = makeNonRepo()
    const mia = join(fuera, 'mi-ledger.jsonl')
    expect(ledgerPathFor(fuera, { explicit: mia })).toBe(mia)
  })
})

describe('5. Controles de anulacion — retirada la causa, el veredicto CAMBIA', () => {
  /** El resolutor de ANTES: no asciende y nunca rehusa. */
  const sinAscenso = (start: string): string | null => start

  test('sin ascenso, los dos subdirectorios DEJAN de coincidir', () => {
    const { root, sub } = makeRepo()
    expect(
      ledgerPathFor(sub, { resolver: sinAscenso }),
    ).not.toBe(ledgerPathFor(root, { resolver: sinAscenso }))
  })

  test('sin la comprobacion de repo, la raiz de fuera DEJA de rehusar', () => {
    const fuera = makeNonRepo()
    expect(ledgerPathFor(fuera, { resolver: sinAscenso })).toBe(join(fuera, LEDGER_REL))
  })

  test('y el bloque 1 SOBREVIVE al control: no depende de la causa', () => {
    expect(LEDGER_REL).toBe('.claude/coordination/claims.jsonl')
  })
})
