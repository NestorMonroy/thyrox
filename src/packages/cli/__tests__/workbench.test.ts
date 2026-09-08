/**
 * El banco de trabajo como subcomando de la CLI (#80, #266).
 *
 * POR QUE ESTA SUITE SE REESCRIBE Y NO SE REAPUNTA. Habia dos portes del
 * mismo mecanismo conviviendo: `thyrox: src/workbench/manifest.ts` (sucesor)
 * y `thyrox: src/packages/harness/src/workbench/manifest.ts` (superado).
 * :ref:`h-docs-1142` los midio y declaro sus contratos INCOMPATIBLES —sus
 * cinco claves no se solapan en ninguna posicion— y ordeno que el retiro
 * fuera «su propio pase y con su propia suite … para que no se cuele como
 * parte de un git mv». Esto es ese pase.
 *
 * Lo que cambia entre los dos contratos, medido:
 *
 * | eje        | superado                                   | sucesor                                        |
 * |------------|--------------------------------------------|------------------------------------------------|
 * | claves     | evento fecha instrumento metrica ciega_a   | question instrument metric blind_to destination |
 * | archivo    | `manifiesto.json`                          | `manifest.json`                                |
 * | formas     | corpus medicion transformacion             | corpus measurement transformation              |
 * | piezas     | tests/ salidas/ radio/                     | tests/ outputs/ radius/                        |
 * | andamiaje  | siembra evento+fecha, `.ruta-del-evento`   | siembra `{}` — no fabrica lo que no sabe       |
 *
 * `fecha` desaparece del contrato porque el sucesor la DERIVA del sufijo ISO
 * del identificador, que es su fuente, en vez de leer una copia que el autor
 * teclea (h-docs-1073). `question` y `destination` son nuevas.
 *
 * Los identificadores y las claves van en ingles por
 * `identificadores-en-ingles.md` —«una clave es un atributo»—; los comentarios
 * y la prosa, en espanol.
 *
 * MITAD ROJA, medida: 18 pasan y **1 falla** —`--workbench-new`—, porque
 * `bin/harness.ts` sigue importando el modulo superado y emite el contrato
 * viejo. Esa es exactamente la arista que este pase cierra.
 *
 * La prediccion decia que caerian los DOS casos de CLI y era falsa: se
 * corrige la prediccion, no la medicion. `--workbench-check` sobre un
 * directorio sin manifiesto **no discrimina**, porque es no-conforme bajo los
 * dos contratos —al superado le falta `manifiesto.json` y al sucesor
 * `manifest.json`—. Sigue en la suite porque mide otra cosa que si importa
 * (que `--strict` bloquee y el modo normal no), pero no separa un contrato
 * del otro y no se cuenta como si lo hiciera.
 *
 * El unico caso que separa los dos contratos es `--workbench-new`, y lo hace
 * por AUSENCIA ademas de por presencia: exige que `manifest.json` y `outputs/`
 * existan **y** que `manifiesto.json` y `salidas/` no. Sin la mitad negativa,
 * un binario que emitiera los dos juegos pasaria.
 *
 * CONTROL DE ANULACION, a medir tras el reapuntado: se devuelve el import de
 * `bin/harness.ts` al modulo superado y debe caer **1 de 19**, el de
 * `--workbench-new`. Los 18 restantes sobreviven, y deben: miden el sucesor
 * directamente, no por donde lo cite el binario.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, basename } from 'node:path'
import {
  REQUIRED_KEYS, WORKBENCH_FORMS, MANIFEST_FILE_NAME,
  runIdDate, runIdFor, checkWorkbench, scaffoldWorkbench,
} from '../../../workbench/manifest.ts'

const BIN = join(import.meta.dir, '..', 'bin', 'harness.ts')

const root = () => mkdtempSync(join(tmpdir(), 'wb-'))

/** Un banco COMPLETO y conforme. Cada caso negativo lo degrada en un solo eje. */
function conformingWorkbench(base: string, id = 'measure-something-20260904T120000'): string {
  const dir = join(base, id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'measure_something.py'), '# el instrumento\n')
  writeFileSync(join(dir, MANIFEST_FILE_NAME), JSON.stringify({
    question: 'cuantos archivos declaran la clave',
    instrument: 'measure_something.py',
    metric: 'archivos con la clave, sobre source/',
    blind_to: 'un documento que la declare en prosa',
    destination: 'el hallazgo que la cita',
  }, null, 2))
  return dir
}

describe('el contrato del sucesor, no el del modulo superado (#266)', () => {
  test('las cinco claves son las inglesas, y ninguna es del contrato viejo', () => {
    expect([...REQUIRED_KEYS]).toEqual(['question', 'instrument', 'metric', 'blind_to', 'destination'])
    // El control de h-docs-1142: los dos juegos no se solapan en NINGUNA
    // posicion. Si alguien reintrodujera una clave del contrato viejo, este
    // caso lo nombra.
    for (const old of ['evento', 'fecha', 'instrumento', 'metrica', 'ciega_a']) {
      expect(REQUIRED_KEYS as readonly string[]).not.toContain(old)
    }
  })

  test('el archivo del manifiesto es manifest.json', () => {
    expect(MANIFEST_FILE_NAME).toBe('manifest.json')
  })

  test('las tres formas van en ingles; corpus ya lo estaba y no se rebautiza', () => {
    expect([...WORKBENCH_FORMS]).toEqual(['corpus', 'measurement', 'transformation'])
  })
})

describe('runIdDate — la fecha se deriva del ID, no de date(1)', () => {
  test('ISO basico al final del slug', () => {
    expect(runIdDate('hooks-claude-code-20260819T201332')).toBe('2026-08-19T20:13:32')
  })
  test('un slug con digitos propios no confunde al patron', () => {
    expect(runIdDate('analysis-352-20260903T155544')).toBe('2026-09-03T15:55:44')
  })
  // Los directorios sin sufijo ISO son reales y no se renombran; el patron
  // tiene que decir «no» sobre ellos, no inventarles una fecha.
  test('sin sufijo ISO -> null, no una fecha fabricada', () => {
    expect(runIdDate('port-976-sale-chart-template')).toBeNull()
    expect(runIdDate('organize-scripts-20260827')).toBeNull()
  })
})

describe('checkWorkbench — el gate', () => {
  test('un banco conforme no reporta nada', () => {
    expect(checkWorkbench(conformingWorkbench(root()))).toEqual([])
  })

  test('sin manifiesto, lo nombra por su nombre nuevo', () => {
    const dir = join(root(), 'empty-20260904T120000')
    mkdirSync(dir, { recursive: true })
    const ps = checkWorkbench(dir)
    expect(ps).toHaveLength(1)
    expect(ps[0]!.problem).toContain('manifest.json')
  })

  test('una clave ausente se nombra; una vacia tambien', () => {
    const dir = conformingWorkbench(root())
    const m = JSON.parse(readFileSync(join(dir, MANIFEST_FILE_NAME), 'utf8'))
    delete m.metric
    m.blind_to = '   '
    writeFileSync(join(dir, MANIFEST_FILE_NAME), JSON.stringify(m))
    expect(checkWorkbench(dir).map(p => p.key).sort()).toEqual(['blind_to', 'metric'])
  })

  test('el ID sin sufijo ISO se rechaza: su fecha no se puede verificar', () => {
    const dir = conformingWorkbench(root(), 'sin-iso')
    expect(checkWorkbench(dir).map(p => p.problem).join(' ')).toContain('sufijo ISO')
  })

  test('un instrumento que NO existe se nombra', () => {
    const dir = conformingWorkbench(root())
    const m = JSON.parse(readFileSync(join(dir, MANIFEST_FILE_NAME), 'utf8'))
    m.instrument = 'no_existe.py'
    writeFileSync(join(dir, MANIFEST_FILE_NAME), JSON.stringify(m))
    expect(checkWorkbench(dir).map(p => p.key)).toEqual(['instrument'])
  })

  // El corte esta medido en la cabecera del modulo: 11 de 26 bancos vivos
  // declaran un COMANDO, no un archivo. Exigir archivo rechazaria al 42 % del
  // corpus que el gate dice gobernar.
  test('un comando declarado como instrumento NO se exige en disco', () => {
    const dir = conformingWorkbench(root())
    const m = JSON.parse(readFileSync(join(dir, MANIFEST_FILE_NAME), 'utf8'))
    m.instrument = 'uv run pytest -n 4 --reuse-db'
    writeFileSync(join(dir, MANIFEST_FILE_NAME), JSON.stringify(m))
    expect(checkWorkbench(dir)).toEqual([])
  })

  test('una forma inventada se rechaza; las tres validas no', () => {
    const conForma = (form: string) => {
      const dir = conformingWorkbench(root())
      const m = JSON.parse(readFileSync(join(dir, MANIFEST_FILE_NAME), 'utf8'))
      m.form = form
      writeFileSync(join(dir, MANIFEST_FILE_NAME), JSON.stringify(m))
      return dir
    }
    expect(checkWorkbench(conForma('invented')).map(p => p.key)).toEqual(['form'])
    // `measurement` exige sus dos piezas, y sin ellas las nombra.
    expect(checkWorkbench(conForma('measurement')).map(p => p.problem).sort())
      .toEqual(['outputs/ lo exige la forma \'measurement\'', 'tests/ lo exige la forma \'measurement\''])
    // `corpus` no exige ninguna: su valor es el material, no un procedimiento.
    expect(checkWorkbench(conForma('corpus'))).toEqual([])
  })
})

describe('scaffoldWorkbench — el andamiaje', () => {
  const nine = new Date(Date.UTC(2026, 8, 4, 23, 47, 5))

  test('el ID lleva el ISO basico derivado del reloj que se le pasa', () => {
    expect(basename(scaffoldWorkbench(root(), 'measure-something', nine)))
      .toBe('measure-something-20260904T234705')
  })

  test('crea la anatomia del sucesor: manifest.json y las tres carpetas en ingles', () => {
    const dir = scaffoldWorkbench(root(), 'measure-something', nine)
    for (const p of [MANIFEST_FILE_NAME, 'README.md', 'tests', 'outputs', 'probes']) {
      expect(existsSync(join(dir, p))).toBe(true)
    }
  })

  // El andamiaje NO fabrica un valor para lo que solo el autor sabe. Omitir es
  // distinto de poner un placeholder: un placeholder pasa el check de presencia
  // y se lee como dato (H-DOCS-1036); una clave ausente la nombra el gate. Un
  // banco recien andamiado NO es conforme, y ese es el estado correcto.
  test('siembra un manifiesto vacio, y el gate reclama las cinco', () => {
    const dir = scaffoldWorkbench(root(), 'measure-something', nine)
    expect(JSON.parse(readFileSync(join(dir, MANIFEST_FILE_NAME), 'utf8'))).toEqual({})
    expect(checkWorkbench(dir).map(p => p.key)).toEqual([...REQUIRED_KEYS])
  })

  test('rehusa un slug que ya trae sufijo ISO: acunaria dos', () => {
    expect(() => runIdFor('measure-something-20260101T000000', nine)).toThrow(/ISO/)
    expect(() => scaffoldWorkbench(root(), 'measure-something-20260101T000000', nine)).toThrow(/ISO/)
  })
})

describe('la CLI — andamiar y medir desde fuera', () => {
  test('--workbench-new emite el contrato del SUCESOR, no el superado', () => {
    const base = root()
    const p = Bun.spawnSync(['bun', 'run', BIN, '--workbench-new', 'measure-something', '--eventos', base])
    expect(p.exitCode).toBe(0)
    const dir = p.stdout.toString().trim()
    // El discriminador: el archivo del sucesor existe y el del superado NO.
    // Si el binario siguiera importando el modulo viejo, este caso lo nombra.
    expect(existsSync(join(dir, MANIFEST_FILE_NAME))).toBe(true)
    expect(existsSync(join(dir, 'manifiesto.json'))).toBe(false)
    expect(existsSync(join(dir, 'outputs'))).toBe(true)
    expect(existsSync(join(dir, 'salidas'))).toBe(false)
    // Lo que falta va a **stderr**: en stdout desaparece con el primer
    // `>/dev/null`, y ese es el defecto que dejo una escotilla sin probar toda
    // su vida (test-contrato-de-escotilla.sh).
    expect(p.stderr.toString()).toContain('destination')
  })

  test('--workbench-check no bloquea por defecto y si con --strict', () => {
    const dir = join(root(), 'broken-20260904T120000')
    mkdirSync(dir, { recursive: true })
    const run = (extra: string[]) =>
      Bun.spawnSync(['bun', 'run', BIN, '--workbench-check', dir, ...extra]).exitCode
    expect(run([])).toBe(0)
    expect(run(['--strict'])).toBe(1)
  })
})
