/**
 * El banco de trabajo como primitiva del harness (#80, TASK-GEN-0628).
 *
 * La fuente del porte NO es el binario: es la forma que `.claude/eventos/`
 * ya practica, medida antes de codificarla —45 manifiestos legibles de 140
 * directorios, con `fecha` 29, `evento` 27, `metrica` 22, `ciega_a` 21,
 * `instrumento` 18 como las claves que más se repiten—. Las cinco que el
 * gate exige son ésas, y no por frecuencia sola: son las tres verificables
 * (identidad, fecha derivada del ID, instrumento que existe) más las dos
 * líneas que `metrica-decide-la-conclusion.md` obliga a declarar.
 *
 * Cada guardia lleva su control anulado: el caso negativo apunta a un objeto
 * que EXISTE en el material, para que el rechazo lo produzca la clasificación
 * y no la ausencia. Sub-patrón D de `metrica-decide-la-conclusion.md`.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, basename } from 'node:path'
import {
  REQUIRED_KEYS, WORKBENCH_FORMS, runIdDate, checkWorkbench, scaffoldWorkbench,
} from '../src/workbench/manifest.ts'

const BIN = join(import.meta.dir, '..', 'bin', 'harness.ts')

const raiz = () => mkdtempSync(join(tmpdir(), 'wb-'))

/** Un banco COMPLETO y conforme. Cada caso negativo lo degrada en un solo eje. */
function bancoConforme(root: string, id = 'medir-algo-20260904T120000'): string {
  const dir = join(root, id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'measure_something.py'), '# el instrumento\n')
  writeFileSync(join(dir, 'manifiesto.json'), JSON.stringify({
    evento: id,
    fecha: runIdDate(id),
    instrumento: 'measure_something.py',
    metrica: 'archivos con la clave, sobre source/',
    ciega_a: 'un documento que la declare en prosa',
  }, null, 2))
  return dir
}

describe('runIdDate — la fecha se deriva del ID, no de date(1)', () => {
  test('ISO básico al final del slug', () => {
    expect(runIdDate('hooks-claude-code-20260819T201332')).toBe('2026-08-19T20:13:32')
  })
  test('un slug con dígitos propios no confunde al patrón', () => {
    expect(runIdDate('analisis-352-20260903T155544')).toBe('2026-09-03T15:55:44')
  })
  // Los 9 directorios medidos sin sufijo ISO son reales y no se renombran; el
  // patrón tiene que decir «no» sobre ellos, no inventarles una fecha.
  test('sin sufijo ISO -> null, no una fecha fabricada', () => {
    expect(runIdDate('porte-976-sale-chart-template')).toBeNull()
    expect(runIdDate('organizar-scripts-20260827')).toBeNull()
  })
})

describe('checkWorkbench — el gate', () => {
  test('un banco conforme no reporta nada', () => {
    expect(checkWorkbench(bancoConforme(raiz()))).toEqual([])
  })

  test('las cinco claves son las declaradas', () => {
    expect([...REQUIRED_KEYS]).toEqual(['evento', 'fecha', 'instrumento', 'metrica', 'ciega_a'])
  })

  test('sin manifiesto -> un problema que lo nombra', () => {
    const dir = join(raiz(), 'vacio-20260904T120000')
    mkdirSync(dir, { recursive: true })
    const ps = checkWorkbench(dir)
    expect(ps).toHaveLength(1)
    expect(ps[0]!.problem).toContain('manifiesto.json')
  })

  test('cada clave ausente se reporta por separado', () => {
    const dir = bancoConforme(raiz())
    const m = JSON.parse(readFileSync(join(dir, 'manifiesto.json'), 'utf8'))
    delete m.metrica; delete m.ciega_a
    writeFileSync(join(dir, 'manifiesto.json'), JSON.stringify(m))
    expect(checkWorkbench(dir).map(p => p.key).sort()).toEqual(['ciega_a', 'metrica'])
  })

  // CONTROL ANULADO — una clave vacía es exactamente el placeholder que
  // H-DOCS-1036 registró: pasa un check de presencia y no dice nada.
  test('una clave presente pero vacía se reporta igual que ausente', () => {
    const dir = bancoConforme(raiz())
    const m = JSON.parse(readFileSync(join(dir, 'manifiesto.json'), 'utf8'))
    m.ciega_a = '   '
    writeFileSync(join(dir, 'manifiesto.json'), JSON.stringify(m))
    expect(checkWorkbench(dir).map(p => p.key)).toEqual(['ciega_a'])
  })

  test('evento distinto del nombre del directorio -> se reporta', () => {
    const dir = bancoConforme(raiz())
    const m = JSON.parse(readFileSync(join(dir, 'manifiesto.json'), 'utf8'))
    m.evento = 'otro-evento-20260904T120000'
    writeFileSync(join(dir, 'manifiesto.json'), JSON.stringify(m))
    const ps = checkWorkbench(dir)
    expect(ps).toHaveLength(1)
    expect(ps[0]!.key).toBe('evento')
  })

  // CONTROL ANULADO — es la regla del README: con `date -u` en su lugar,
  // re-correr el generador re-fecha los N archivos y produce un diff de ruido.
  test('fecha que no deriva del ID -> se reporta', () => {
    const dir = bancoConforme(raiz())
    const m = JSON.parse(readFileSync(join(dir, 'manifiesto.json'), 'utf8'))
    m.fecha = '2026-09-04T23:59:59'   // la de `date -u`, no la del ID
    writeFileSync(join(dir, 'manifiesto.json'), JSON.stringify(m))
    expect(checkWorkbench(dir).map(p => p.key)).toEqual(['fecha'])
  })

  test('un ID sin sufijo ISO no exige fecha derivada, pero lo dice', () => {
    const root = raiz()
    const dir = join(root, 'sin-iso')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'x.py'), '#\n')
    writeFileSync(join(dir, 'manifiesto.json'), JSON.stringify({
      evento: 'sin-iso', fecha: '2026-09-04T12:00:00', instrumento: 'x.py',
      metrica: 'm', ciega_a: 'c',
    }))
    const ps = checkWorkbench(dir)
    expect(ps).toHaveLength(1)
    expect(ps[0]!.problem).toContain('sufijo ISO')
  })

  // El caso negativo apunta a un archivo que EXISTE en el material (el
  // conforme lo crea): así el rechazo lo produce el nombre equivocado y no la
  // ausencia de todo instrumento.
  test('instrumento que no existe en el banco -> se reporta', () => {
    const dir = bancoConforme(raiz())
    const m = JSON.parse(readFileSync(join(dir, 'manifiesto.json'), 'utf8'))
    m.instrumento = 'no_esta.py'
    writeFileSync(join(dir, 'manifiesto.json'), JSON.stringify(m))
    expect(checkWorkbench(dir).map(p => p.key)).toEqual(['instrumento'])
  })
})

describe('la forma declarada exige su pieza (#89)', () => {
  test('las tres formas son las del README', () => {
    expect([...WORKBENCH_FORMS]).toEqual(['corpus', 'medicion', 'transformacion'])
  })

  const conForma = (forma: string) => {
    const dir = bancoConforme(raiz())
    const m = JSON.parse(readFileSync(join(dir, 'manifiesto.json'), 'utf8'))
    m.forma = forma
    writeFileSync(join(dir, 'manifiesto.json'), JSON.stringify(m))
    return dir
  }

  test('sin `forma` no se exige ninguna pieza: la clave es opcional', () => {
    expect(checkWorkbench(bancoConforme(raiz()))).toEqual([])
  })
  test('medicion sin tests/ ni salidas/ -> se reportan las dos', () => {
    expect(checkWorkbench(conForma('medicion')).map(p => p.problem.split(' ')[0]).sort())
      .toEqual(['salidas/', 'tests/'])
  })
  // La pieza que distingue la transformación es `radio/`: quién se rompe. Sin
  // ella no hay diferencia entre transformar y medir (:ref:`h-docs-1039`).
  test('transformacion sin radio/ -> se reporta', () => {
    const ps = checkWorkbench(conForma('transformacion'))
    expect(ps).toHaveLength(1)
    expect(ps[0]!.problem).toContain('radio/')
  })
  test('transformacion CON radio/ -> limpio', () => {
    const dir = conForma('transformacion')
    mkdirSync(join(dir, 'radio'))
    expect(checkWorkbench(dir)).toEqual([])
  })
  test('una forma que no existe se reporta', () => {
    expect(checkWorkbench(conForma('inventada')).map(p => p.key)).toEqual(['forma'])
  })
})

describe('scaffoldWorkbench — el andamiaje', () => {
  const nueve = new Date(Date.UTC(2026, 8, 4, 23, 47, 5))

  test('el ID lleva el ISO básico derivado del reloj que se le pasa', () => {
    const dir = scaffoldWorkbench(raiz(), 'medir-algo', nueve)
    expect(basename(dir)).toBe('medir-algo-20260904T234705')
  })

  test('crea la anatomía del README: piezas y puntero', () => {
    const dir = scaffoldWorkbench(raiz(), 'medir-algo', nueve)
    for (const p of ['manifiesto.json', 'README.md', '.ruta-del-evento', 'tests', 'salidas', 'sondas']) {
      expect(existsSync(join(dir, p))).toBe(true)
    }
  })

  test('el puntero vive DENTRO del evento y apunta a él (h-docs-400)', () => {
    const root = join(raiz(), '.claude', 'eventos')
    mkdirSync(root, { recursive: true })
    const dir = scaffoldWorkbench(root, 'medir-algo', nueve)
    expect(readFileSync(join(dir, '.ruta-del-evento'), 'utf8').trim())
      .toBe('.claude/eventos/medir-algo-20260904T234705')
  })

  // El andamiaje NO fabrica un valor para lo que sólo el autor sabe. Omitir es
  // distinto de poner un placeholder: un placeholder pasa el check de presencia
  // y se lee como dato (H-DOCS-1036); una clave ausente la nombra el gate. Un
  // banco recién andamiado NO es conforme, y ése es el estado correcto.
  test('omite las tres que no puede saber, y el gate las reclama', () => {
    const dir = scaffoldWorkbench(raiz(), 'medir-algo', nueve)
    const m = JSON.parse(readFileSync(join(dir, 'manifiesto.json'), 'utf8'))
    for (const k of ['instrumento', 'metrica', 'ciega_a']) expect(k in m).toBe(false)
    expect(checkWorkbench(dir).map(p => p.key)).toEqual(['instrumento', 'metrica', 'ciega_a'])
  })

  test('la fecha del manifiesto deriva del ID que acaba de acuñar', () => {
    const dir = scaffoldWorkbench(raiz(), 'medir-algo', nueve)
    const m = JSON.parse(readFileSync(join(dir, 'manifiesto.json'), 'utf8'))
    expect(m.fecha).toBe(runIdDate(basename(dir)))
  })

  test('rehúsa un slug que ya trae sufijo ISO: acuñaría dos', () => {
    expect(() => scaffoldWorkbench(raiz(), 'medir-algo-20260101T000000', nueve)).toThrow(/ISO/)
  })
})

describe('la CLI (#80) — andamiar y medir desde fuera', () => {
  test('--workbench-new crea el banco y nombra en stderr lo que le falta', () => {
    const root = raiz()
    const p = Bun.spawnSync(['bun', 'run', BIN, '--workbench-new', 'medir-algo', '--eventos', root])
    expect(p.exitCode).toBe(0)
    const dir = p.stdout.toString().trim()
    expect(existsSync(join(dir, 'manifiesto.json'))).toBe(true)
    // Lo que falta va a **stderr**: en stdout desaparece con el primer
    // `>/dev/null`, y ése es el defecto que dejó una escotilla sin probar toda
    // su vida (test-contrato-de-escotilla.sh).
    expect(p.stderr.toString()).toContain('ciega_a')
  })

  test('--workbench-check no bloquea por defecto y sí con --strict', () => {
    const root = raiz()
    const dir = join(root, 'roto-20260904T120000')
    mkdirSync(dir, { recursive: true })
    const corre = (extra: string[]) =>
      Bun.spawnSync(['bun', 'run', BIN, '--workbench-check', dir, ...extra]).exitCode
    expect(corre([])).toBe(0)
    expect(corre(['--strict'])).toBe(1)
  })
})
