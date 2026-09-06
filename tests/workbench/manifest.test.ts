/**
 * Prueba de `workbench/manifest` — la primitiva del banco de trabajo.
 *
 * Mitad ROJA escrita antes del mecanismo. El modulo no existe: este archivo
 * falla al importarlo, y ese fallo es el resultado que se persiste.
 *
 * Que cubre cada bloque, y contra que defecto medido nace:
 *
 * 1. **Las cinco claves son las de api, no las del harness.** H-DOCS-1073 mide
 *    que las cinco del harness aparecen en 0 de los 26 manifiestos del banco
 *    vivo, y que dos de ellas —identidad y fecha— son redundantes con la ruta.
 * 2. **La identidad y la fecha se verifican contra la RUTA.** Siguen siendo
 *    checks que pueden fallar; lo que cambia es que su fuente es el nombre del
 *    directorio y no una copia que el autor teclea.
 * 3. **No hay alias en espanol.** Una primera version del modulo los traia,
 *    para que el gate pudiera leer los 54 manifiestos en español de
 *    `docs: .claude/eventos/`. Ese corpus NO viaja a THYROX, asi que el gate
 *    nunca lo iba a ver: era superficie para un consumidor hipotetico. Aqui
 *    las claves son atributos y van en ingles, sin excepcion.
 * 4. **Una clave presente y vacia se reporta como ausente.** Un placeholder
 *    que pasa el check de presencia y no dice nada es H-DOCS-1036.
 * 5. **El andamiaje omite lo que no puede saber.** Un banco recien andamiado
 *    NO es conforme, y ese es el estado correcto.
 * 6. **El gate no lanza: devuelve la lista.** Abortar al primer defecto obliga
 *    a N pasadas para ver N problemas.
 */
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  REQUIRED_KEYS,
  WORKBENCH_FORMS,
  checkWorkbench,
  runIdDate,
  runIdFor,
  scaffoldWorkbench,
} from '../../src/workbench/manifest'

/** Un banco sintetico con el manifiesto que se le pase. */
function makeWorkbench(id: string, manifest: Record<string, unknown> | null, opts: {
  fileName?: string
  instrumentOnDisk?: string
} = {}): string {
  const base = mkdtempSync(join(tmpdir(), 'wb-'))
  const dir = join(base, id)
  mkdirSync(dir, { recursive: true })
  if (opts.instrumentOnDisk) writeFileSync(join(dir, opts.instrumentOnDisk), '# instrumento\n')
  if (manifest !== null) {
    writeFileSync(join(dir, opts.fileName ?? 'manifest.json'), JSON.stringify(manifest, null, 2))
  }
  return dir
}

const ID = 'medir-algo-20260905T120000'

/** Un manifiesto conforme, para partir de el y romper una cosa a la vez. */
function goodManifest(): Record<string, unknown> {
  return {
    question: '¿el mecanismo lee la constante por raiz?',
    instrument: 'measure.py',
    metric: 'raices resueltas por cada eslabon de la cadena',
    blind_to: ['una ruta compuesta en tiempo de ejecucion'],
    destination: 'docs: .../hallazgo-H-DOCS-1070-....rst',
  }
}

describe('las cinco claves son las del banco vivo', () => {
  test('REQUIRED_KEYS son las de api, en ingles', () => {
    expect([...REQUIRED_KEYS]).toEqual([
      'question', 'instrument', 'metric', 'blind_to', 'destination',
    ])
  })

  test('no exige identidad ni fecha: la ruta ya las da', () => {
    expect(REQUIRED_KEYS).not.toContain('event' as never)
    expect(REQUIRED_KEYS).not.toContain('date' as never)
  })

  test('un manifiesto conforme no reporta problemas', () => {
    const dir = makeWorkbench(ID, goodManifest(), { instrumentOnDisk: 'measure.py' })
    expect(checkWorkbench(dir)).toEqual([])
  })
})

describe('cada clave puede hacer fallar el gate', () => {
  for (const key of ['question', 'instrument', 'metric', 'blind_to', 'destination']) {
    test(`falta ${key}`, () => {
      const m = goodManifest()
      delete m[key]
      const dir = makeWorkbench(ID, m, { instrumentOnDisk: 'measure.py' })
      expect(checkWorkbench(dir).map((p) => p.key)).toContain(key)
    })
  }

  test('una clave presente y vacia se reporta como ausente (H-DOCS-1036)', () => {
    const m = { ...goodManifest(), metric: '   ' }
    const dir = makeWorkbench(ID, m, { instrumentOnDisk: 'measure.py' })
    expect(checkWorkbench(dir).map((p) => p.key)).toContain('metric')
  })

  test('blind_to vacio como lista tampoco cuenta', () => {
    const m = { ...goodManifest(), blind_to: [] }
    const dir = makeWorkbench(ID, m, { instrumentOnDisk: 'measure.py' })
    expect(checkWorkbench(dir).map((p) => p.key)).toContain('blind_to')
  })
})

describe('la identidad y la fecha se verifican contra la ruta', () => {
  test('un ID sin sufijo ISO se nombra como no verificable', () => {
    const dir = makeWorkbench('sin-sufijo', goodManifest(), { instrumentOnDisk: 'measure.py' })
    expect(checkWorkbench(dir).some((p) => p.problem.includes('ISO'))).toBe(true)
  })

  test('runIdDate deriva la fecha extendida del ID', () => {
    expect(runIdDate(ID)).toBe('2026-09-05T12:00:00')
  })

  test('runIdDate devuelve null, no una fecha fabricada', () => {
    expect(runIdDate('sin-sufijo')).toBeNull()
  })

  test('runIdFor acuña el ISO basico en UTC', () => {
    expect(runIdFor('medir-algo', new Date(Date.UTC(2026, 8, 5, 12, 0, 0))))
      .toBe('medir-algo-20260905T120000')
  })

  test('runIdFor rehusa un slug que ya trae sufijo', () => {
    expect(() => runIdFor(ID, new Date())).toThrow()
  })
})

describe('el instrumento se verifica cuando NOMBRA UN ARCHIVO, y sólo entonces', () => {
  // Medido sobre los 26 bancos vivos de `api: scripts/workbench/`: 15 declaran
  // un archivo dentro del banco y **11 declaran un comando** (`uv run pytest
  // -n 4 --reuse-db`). Un check que exija archivo rechaza al 42 % del corpus
  // que dice gobernar — el mismo defecto que H-DOCS-1073 midio en el gate del
  // harness. El corte: se verifica si el primer token PARECE un archivo.
  test('un archivo declarado que no existe se nombra', () => {
    const dir = makeWorkbench(ID, goodManifest())
    expect(checkWorkbench(dir).map((p) => p.key)).toContain('instrument')
  })

  test('un archivo con su glosa tras el guion largo se resuelve', () => {
    const m = { ...goodManifest(), instrument: 'measure.py — recorre los campos' }
    const dir = makeWorkbench(ID, m, { instrumentOnDisk: 'measure.py' })
    expect(checkWorkbench(dir)).toEqual([])
  })

  test('un COMANDO no se verifica contra disco: no es un archivo', () => {
    const m = { ...goodManifest(), instrument: 'uv run pytest -n 4 -q --reuse-db' }
    const dir = makeWorkbench(ID, m)
    expect(checkWorkbench(dir)).toEqual([])
  })

  test('el instrumento como lista: basta que una pieza resuelva', () => {
    const m = { ...goodManifest(), instrument: ['measure.py — mide', 'uv run pytest'] }
    const dir = makeWorkbench(ID, m, { instrumentOnDisk: 'measure.py' })
    expect(checkWorkbench(dir)).toEqual([])
  })

  test('una ruta relativa a la raiz del repo se resuelve por su nombre', () => {
    // 2 de los 26 bancos vivos declaran asi: scripts/workbench/<id>/x.py, y el
    // archivo esta en el banco. La ruta es otra forma de nombrarlo, no un
    // archivo distinto.
    const m = { ...goodManifest(), instrument: 'scripts/workbench/algo/measure.py' }
    const dir = makeWorkbench(ID, m, { instrumentOnDisk: 'measure.py' })
    expect(checkWorkbench(dir)).toEqual([])
  })

  test('pero un nombre mal escrito sigue fallando', () => {
    const m = { ...goodManifest(), instrument: 'scripts/workbench/algo/mesure.py' }
    const dir = makeWorkbench(ID, m, { instrumentOnDisk: 'measure.py' })
    expect(checkWorkbench(dir).map((p) => p.key)).toContain('instrument')
  })

  test('una lista cuyo archivo declarado no existe SI falla', () => {
    const m = { ...goodManifest(), instrument: ['no-existe.py — mide'] }
    const dir = makeWorkbench(ID, m)
    expect(checkWorkbench(dir).map((p) => p.key)).toContain('instrument')
  })
})

describe('el gate reporta, no aborta', () => {
  test('sin manifiesto lo dice, y solo eso', () => {
    const dir = makeWorkbench(ID, null)
    const ps = checkWorkbench(dir)
    expect(ps).toHaveLength(1)
    expect(ps[0]!.problem).toContain('manifest.json')
  })

  test('un JSON roto se nombra sin lanzar', () => {
    const base = mkdtempSync(join(tmpdir(), 'wb-'))
    const dir = join(base, ID)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'manifest.json'), '{ roto')
    expect(() => checkWorkbench(dir)).not.toThrow()
    expect(checkWorkbench(dir)).toHaveLength(1)
  })

  test('varios defectos se devuelven juntos, no de a uno', () => {
    const dir = makeWorkbench(ID, { question: 'solo esta' })
    expect(checkWorkbench(dir).length).toBeGreaterThanOrEqual(4)
  })
})

describe('el andamiaje omite lo que no puede saber', () => {
  test('un banco recien andamiado NO es conforme', () => {
    const base = mkdtempSync(join(tmpdir(), 'wb-'))
    const dir = scaffoldWorkbench(base, 'medir-algo', new Date(Date.UTC(2026, 8, 5, 12, 0, 0)))
    expect(checkWorkbench(dir).length).toBeGreaterThan(0)
  })

  test('y su directorio lleva el ID acuñado', () => {
    const base = mkdtempSync(join(tmpdir(), 'wb-'))
    const dir = scaffoldWorkbench(base, 'medir-algo', new Date(Date.UTC(2026, 8, 5, 12, 0, 0)))
    expect(dir.endsWith('medir-algo-20260905T120000')).toBe(true)
  })

  test('rehusa un slug que ya trae sufijo: acuñaria dos', () => {
    const base = mkdtempSync(join(tmpdir(), 'wb-'))
    expect(() => scaffoldWorkbench(base, ID)).toThrow()
  })
})


/**
 * Las FORMAS del banco — portadas del puerto en español con sus valores en
 * inglés, y su mitad ROJA escrita antes.
 *
 * Directiva del ejecutor 2026-09-06: *«nosotros no vamos a corregir lo que
 * tiene docs/.claude/eventos/ … nosotros vamos a hacer las claves en inglés»*.
 * `identificadores-en-ingles.md` ya lo cubría —«claves de manifiesto: una clave
 * es un atributo»— y las FORMAS son valores de una clave, así que el mismo
 * criterio las alcanza: `medicion` → `measurement`, `transformacion` →
 * `transformation`, y la pieza `radio/` → `radius/`.
 *
 * Traducir no es rebautizar: `corpus` ya estaba en inglés y no se toca.
 */
function bancoConforme(dir: string, extra: Record<string, unknown> = {}): void {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'medir.py'), '# instrumento\n')
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({
    question: '¿?', instrument: 'medir.py', metric: 'qué cuenta',
    blind_to: 'qué no ve', destination: 'a dónde va', ...extra,
  }))
}

describe('las formas del banco, con valores en inglés', () => {
  test('las tres formas, traducidas — corpus ya estaba en inglés', () => {
    expect([...WORKBENCH_FORMS]).toEqual(['corpus', 'measurement', 'transformation'])
  })

  test('sin `form` no se exige ninguna pieza: la clave es opcional', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'wf-')), 'x-20260906T000000')
    bancoConforme(dir)
    expect(checkWorkbench(dir)).toEqual([])
  })

  test('measurement sin tests/ ni outputs/ reporta las dos', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'wf-')), 'x-20260906T000000')
    bancoConforme(dir, { form: 'measurement' })
    expect(checkWorkbench(dir).length).toBe(2)
  })

  test('transformation sin radius/ lo reporta, y con radius/ queda limpio', () => {
    const sin = join(mkdtempSync(join(tmpdir(), 'wf-')), 'x-20260906T000000')
    bancoConforme(sin, { form: 'transformation' })
    expect(checkWorkbench(sin).length).toBe(1)

    const con = join(mkdtempSync(join(tmpdir(), 'wf-')), 'x-20260906T000000')
    bancoConforme(con, { form: 'transformation' })
    mkdirSync(join(con, 'radius'))
    expect(checkWorkbench(con)).toEqual([])
  })

  test('una forma que no existe se reporta, y nombra la clave', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'wf-')), 'x-20260906T000000')
    bancoConforme(dir, { form: 'medicion' })   // la del puerto viejo: ya no vale
    const ps = checkWorkbench(dir)
    expect(ps.length).toBe(1)
    expect(ps[0]!.key).toBe('form')
  })
})
