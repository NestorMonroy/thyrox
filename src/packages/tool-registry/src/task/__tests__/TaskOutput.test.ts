import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile, appendFile, mkdir, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'

import {
  _resetTaskOutputDirForTest,
  getTaskOutputPath,
} from '@thyrox/storage/task/diskOutput.js'

import { TaskOutput } from '../TaskOutput.js'

/**
 * Suite del porte de `ccnmt: packages/tool-registry/src/task/TaskOutput.ts`
 * (TASK-DOCS-0234).
 *
 * Las costuras que mide, cada una con su anulación —se retira del puerto y
 * tienen que caer EXACTAMENTE las aserciones que dependen de ella; si el
 * veredicto no cambia, la costura no se estaba midiendo—:
 *
 * 1. **El umbral de derrame es estrictamente mayor** (`totalMem > maxMemory`).
 *    Un chunk que llena la memoria exacta NO derrama. Anulación (`>=`): cae
 *    **1**.
 * 2. **El prefijo `[stderr] ` al derramar el chunk que provocó el desborde.**
 *    Sin él, el archivo mezcla los dos flujos sin marca. Anulación (quitarlo
 *    de la rama del chunk en `#spillToDisk`): cae **1**.
 * 3. **El bucle inverso que vuelca `lines` al anillo.** El recorrido de
 *    `#updateProgress` va hacia atrás, así que `lines` sale invertido y el
 *    bucle lo restituye. Anulación (recorrer hacia delante): caen **2**.
 * 4. **El filtro `line.trim()`.** Una línea en blanco no entra al anillo.
 *    Anulación (quitarlo): cae **1**.
 * 5. **El máximo monótono de la extrapolación.** Cuando la cola deja de
 *    caber, `totalLines` se estima; sin `Math.max` el contador retrocede en
 *    cuanto un tick pilla líneas largas. Anulación (quitar el `Math.max`):
 *    cae **1**.
 * 6. **`notice.trimStart()`** cuando no hay cola que anteponer. Anulación
 *    (devolver `notice` tal cual): cae **1**.
 * 7. **`outputFileRedundant = bytesTotal <= bytesRead`.** Distingue «el
 *    archivo cabe entero» de «se leyó un prefijo». Anulación (fijarlo a
 *    `true`): cae **1**.
 * 8. **El camino de error devuelve un diagnóstico, no `''`.** Un archivo
 *    borrado mientras el comando corría tiene que ser visible aguas abajo.
 *    Anulación (devolver `''`): caen **2**.
 * 9. **`getStderr()` devuelve `''` una vez derramado** — MEDIDA COMO
 *    SOBREDETERMINADA: su anulación (devolver el búfer) hace caer **0**.
 *    No es un hueco del control, es una guarda que ninguna secuencia de
 *    llamadas públicas puede ejercitar: `#stderrBuffer` sólo se asigna en la
 *    rama SIN derrame de `#writeBuffered`, `#spillToDisk` lo vacía al crear
 *    el `#disk`, y a partir de ahí toda escritura de stderr va derecha a
 *    disco. Es decir: cuando `#disk` existe, `#stderrBuffer` ya es `''`, y
 *    la guarda y el `return` firman el mismo veredicto. Se conserva porque
 *    la fuente la tiene y porque documenta la invariante; se declara aquí
 *    para que nadie lea el verde del caso como prueba de que la guarda
 *    decide. Fabricar un caso que la ejercitara exigiría tocar estado
 *    privado, que es medir el instrumento y no el mecanismo.
 * 10. **`clear()` anula `#onProgress`.** Anulación (no asignarlo a null):
 *     cae **1**.
 *
 * Dos rarezas MEDIDAS de la fuente que el puerto conserva a propósito, y que
 * explican por qué varios casos anteponen una línea de descarte:
 *
 * - **`#updateProgress` nunca extrae la PRIMERA línea de un chunk.** El
 *   recorrido busca el salto ANTERIOR a cada línea y rompe al no
 *   encontrarlo, así que una línea sin salto delante queda fuera del anillo
 *   —aunque su salto sí se cuente en `totalLines`—. Por eso los casos que
 *   miden el anillo escriben `'descarte\n…'`.
 * - **El `lineCount` de `#tick` cuenta uno de más.** La búsqueda que falla
 *   (`lastIndexOf` → -1) incrementa igual antes de salir del bucle, así que
 *   un archivo de 3 líneas reporta 4. Es la aritmética de la fuente; el
 *   puerto no la «arregla» porque cambiarla haría divergir el contador de
 *   progreso respecto del original.
 *
 * Métrica: comportamiento observable por la superficie pública de la clase
 * (constructor, escrituras, getters, `getStdout`/`getStderr`, el callback de
 * progreso) contra archivos reales bajo un `CLAUDE_CODE_TMPDIR` propio.
 * Ciega a: el estado estático privado (`#registry`, `#activePolling`,
 * `#pollInterval`) salvo por su efecto en el callback; a la retención de
 * memoria que `Buffer.from(line).toString()` evita, que no tiene superficie
 * observable en JS; y al modo archivo real —aquí el archivo lo escribe el
 * test, no un descriptor de shell—.
 */

let tmpBase: string
const ORIGINAL_TMPDIR = process.env.CLAUDE_CODE_TMPDIR
const ORIGINAL_MAX_OUTPUT = process.env.BASH_MAX_OUTPUT_LENGTH

/** Las instancias vivas del caso, para que `afterEach` las desmonte. */
let live: TaskOutput[] = []

function track(instance: TaskOutput): TaskOutput {
  live.push(instance)
  return instance
}

beforeEach(async () => {
  tmpBase = await mkdtemp(join(tmpdir(), 'task-output-'))
  process.env.CLAUDE_CODE_TMPDIR = tmpBase
  _resetTaskOutputDirForTest()
  live = []
})

afterEach(async () => {
  // El sondeo es estático: una instancia registrada que no se desmonta
  // sobrevive al caso y su tick cae después del teardown, sobre un
  // directorio ya borrado.
  for (const instance of live) {
    // `flush()` ANTES de `clear()`: el drenado de DiskTaskOutput es
    // fire-and-forget, y si se retoma después del `rm` de abajo abre un
    // archivo bajo un directorio ya borrado → ENOENT como rechazo no
    // capturado, que es la clase de flake que `storage/task/diskOutput.ts`
    // documenta. `clear()` solo no basta: cancela la cola pendiente, no la
    // escritura ya en vuelo.
    await instance.flush()
    instance.clear()
  }
  live = []
  await rm(tmpBase, { recursive: true, force: true })
  _resetTaskOutputDirForTest()
  if (ORIGINAL_TMPDIR === undefined) delete process.env.CLAUDE_CODE_TMPDIR
  else process.env.CLAUDE_CODE_TMPDIR = ORIGINAL_TMPDIR
  if (ORIGINAL_MAX_OUTPUT === undefined) delete process.env.BASH_MAX_OUTPUT_LENGTH
  else process.env.BASH_MAX_OUTPUT_LENGTH = ORIGINAL_MAX_OUTPUT
})

/** Escribe el archivo de salida de una tarea como lo haría el shell. */
async function seedOutputFile(taskId: string, content: string): Promise<string> {
  const path = getTaskOutputPath(taskId)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
  return path
}

describe('TaskOutput — modo pipe: acumulación en memoria', () => {
  test('devuelve el stdout acumulado sin tocar disco', async () => {
    const out = track(new TaskOutput('t-mem', null))
    out.writeStdout('primera\n')
    out.writeStdout('segunda\n')

    expect(await out.getStdout()).toBe('primera\nsegunda\n')
    expect(out.isOverflowed).toBe(false)
    expect(out.totalBytes).toBe(16)
    expect(out.totalLines).toBe(2)
  })

  test('getStderr devuelve el búfer de stderr mientras no haya derrame', () => {
    const out = track(new TaskOutput('t-err', null))
    out.writeStderr('falló\n')

    expect(out.getStderr()).toBe('falló\n')
    expect(out.isOverflowed).toBe(false)
  })

  test('un chunk que llena la memoria EXACTA no derrama (costura 1)', () => {
    const out = track(new TaskOutput('t-limite', null, false, 10))
    out.writeStdout('0123456789')

    expect(out.isOverflowed).toBe(false)
    expect(out.getStderr()).toBe('')
  })

  test('un byte más que la memoria sí derrama (costura 1, lado positivo)', () => {
    const out = track(new TaskOutput('t-derrame', null, false, 10))
    out.writeStdout('01234567890')

    expect(out.isOverflowed).toBe(true)
  })
})

describe('TaskOutput — el derrame a disco', () => {
  test('vuelca los búferes en orden y marca el stderr (costuras 2)', async () => {
    const out = track(new TaskOutput('t-orden', null, false, 20))
    out.writeStdout('salida\n')
    out.writeStderr('X'.repeat(30))
    await out.flush()

    const contenido = await readFile(getTaskOutputPath('t-orden'), 'utf8')
    expect(contenido).toBe(`salida\n[stderr] ${'X'.repeat(30)}`)
  })

  test('una vez derramado, getStderr devuelve vacío (costura 9, sobredeterminada)', () => {
    const out = track(new TaskOutput('t-err-derramado', null, false, 5))
    out.writeStderr('Y'.repeat(20))

    expect(out.isOverflowed).toBe(true)
    expect(out.getStderr()).toBe('')
  })

  test('lo escrito después del derrame también lleva su marca', async () => {
    const out = track(new TaskOutput('t-post', null, false, 5))
    out.writeStdout('A'.repeat(10))
    out.writeStderr('boom')
    await out.flush()

    const contenido = await readFile(getTaskOutputPath('t-post'), 'utf8')
    expect(contenido).toBe(`${'A'.repeat(10)}[stderr] boom`)
  })

  test('spillToDisk() fuerza el derrame sin datos nuevos', async () => {
    const out = track(new TaskOutput('t-forzado', null))
    out.writeStdout('en memoria\n')
    expect(out.isOverflowed).toBe(false)

    out.spillToDisk()
    await out.flush()

    expect(out.isOverflowed).toBe(true)
    expect(await readFile(getTaskOutputPath('t-forzado'), 'utf8')).toBe(
      'en memoria\n',
    )
  })

  test('el aviso de truncado va sin salto inicial cuando no hay cola (costura 6)', async () => {
    // Datos sin ningún salto de línea: el anillo queda vacío, así que
    // `getStdout` devuelve sólo el aviso.
    const out = track(new TaskOutput('t-aviso', null, false, 5))
    out.writeStdout('Z'.repeat(20))

    const stdout = await out.getStdout()
    expect(stdout.startsWith('Output truncated (')).toBe(true)
    expect(stdout).toContain(getTaskOutputPath('t-aviso'))
  })

  test('con cola, el aviso va detrás de las últimas líneas', async () => {
    const out = track(new TaskOutput('t-aviso-cola', null, false, 5))
    out.writeStdout('una\ndos\n')

    const stdout = await out.getStdout()
    expect(stdout.startsWith('una\ndos\n')).toBe(false)
    expect(stdout.split('\n')[0]).toBe('dos')
    expect(stdout).toContain('\nOutput truncated (')
  })
})

describe('TaskOutput — el progreso en modo pipe', () => {
  test('las últimas líneas llegan en su orden original (costura 3)', () => {
    const vistas: string[] = []
    const out = track(
      new TaskOutput('t-orden-lineas', lastLines => vistas.push(lastLines)),
    )
    out.writeStdout('descarte\nuno\ndos\ntres\n')

    expect(vistas).toHaveLength(1)
    expect(vistas[0]).toBe('uno\ndos\ntres')
  })

  test('las líneas en blanco no entran al anillo (costura 4)', () => {
    const vistas: string[] = []
    const out = track(
      new TaskOutput('t-blancos', lastLines => vistas.push(lastLines)),
    )
    out.writeStdout('descarte\nuno\n   \ndos\n')

    expect(vistas[0]).toBe('uno\ndos')
    // Los saltos SÍ se cuentan aunque su línea no entre al anillo.
    expect(out.totalLines).toBe(4)
  })

  test('no se avisa cuando el chunk no cierra ninguna línea', () => {
    let llamadas = 0
    const out = track(new TaskOutput('t-sin-salto', () => llamadas++))
    out.writeStdout('sin salto todavía')

    expect(llamadas).toBe(0)
    expect(out.totalLines).toBe(0)
    expect(out.totalBytes).toBe(17)
  })

  test('el callback recibe el total acumulado, no el del chunk', () => {
    const totales: number[] = []
    const out = track(
      new TaskOutput('t-acumulado', (_l, _a, totalLines) =>
        totales.push(totalLines),
      ),
    )
    out.writeStdout('descarte\na\n')
    out.writeStdout('descarte\nb\nc\n')

    expect(totales).toEqual([2, 5])
  })

  test('clear() desconecta el callback (costura 10)', () => {
    let llamadas = 0
    const out = new TaskOutput('t-clear', () => llamadas++)
    out.writeStdout('descarte\nantes\n')
    expect(llamadas).toBe(1)

    out.clear()
    out.writeStdout('descarte\ndespués\n')

    expect(llamadas).toBe(1)
  })
})

describe('TaskOutput — modo archivo', () => {
  test('lee el archivo entero y lo declara redundante (costura 7)', async () => {
    await seedOutputFile('t-archivo', 'linea uno\nlinea dos\n')
    const out = track(new TaskOutput('t-archivo', null, true))

    expect(await out.getStdout()).toBe('linea uno\nlinea dos\n')
    expect(out.outputFileRedundant).toBe(true)
    expect(out.outputFileSize).toBe(20)
  })

  test('un archivo que no cabe NO es redundante (costura 7)', async () => {
    process.env.BASH_MAX_OUTPUT_LENGTH = '10'
    await seedOutputFile('t-grande', 'X'.repeat(100))
    const out = track(new TaskOutput('t-grande', null, true))

    const stdout = await out.getStdout()
    expect(stdout).toHaveLength(10)
    expect(out.outputFileRedundant).toBe(false)
    expect(out.outputFileSize).toBe(100)
  })

  test('un archivo vacío devuelve vacío y se declara redundante', async () => {
    await seedOutputFile('t-vacio', '')
    const out = track(new TaskOutput('t-vacio', null, true))

    expect(await out.getStdout()).toBe('')
    expect(out.outputFileRedundant).toBe(true)
  })

  test('un archivo ausente devuelve un diagnóstico, no vacío (costura 8)', async () => {
    const out = track(new TaskOutput('t-ausente', null, true))

    const stdout = await out.getStdout()
    expect(stdout).toContain('<bash output unavailable')
    expect(stdout).toContain('ENOENT')
    expect(stdout).toContain(out.path)
  })

  test('getStderr devuelve vacío: el stderr va intercalado en el archivo', async () => {
    await seedOutputFile('t-archivo-err', 'todo junto\n')
    const out = track(new TaskOutput('t-archivo-err', null, true))

    expect(out.getStderr()).toBe('')
  })

  test('deleteOutputFile no revienta si el archivo no existe', async () => {
    const out = track(new TaskOutput('t-borrar', null, true))
    await expect(out.deleteOutputFile()).resolves.toBeUndefined()
  })

  test('deleteOutputFile borra el archivo cuando existe', async () => {
    await seedOutputFile('t-borrar-2', 'algo\n')
    const out = track(new TaskOutput('t-borrar-2', null, true))
    await out.deleteOutputFile()

    const despues = track(new TaskOutput('t-borrar-2', null, true))
    expect(await despues.getStdout()).toContain('<bash output unavailable')
  })
})

describe('TaskOutput — el sondeo compartido del modo archivo', () => {
  test('startPolling avisa con la cola del archivo', async () => {
    await seedOutputFile('t-sondeo', 'a\nb\nc\n')
    let resolver: (() => void) | null = null
    const primera = new Promise<void>(r => {
      resolver = r
    })
    const vistas: Array<[string, number, number, boolean]> = []
    const out = track(
      new TaskOutput(
        't-sondeo',
        (lastLines, _all, totalLines, totalBytes, isIncomplete) => {
          vistas.push([lastLines, totalLines, totalBytes, isIncomplete])
          resolver?.()
        },
        true,
      ),
    )

    TaskOutput.startPolling('t-sondeo')
    await primera
    TaskOutput.stopPolling('t-sondeo')

    expect(vistas[0]![0]).toBe('a\nb\nc\n')
    expect(vistas[0]![1]).toBe(4)
    expect(vistas[0]![2]).toBe(6)
    expect(vistas[0]![3]).toBe(false)
    expect(out.totalLines).toBe(4)
  }, 8000)

  test('un archivo vacío también despierta el bucle de progreso', async () => {
    await seedOutputFile('t-sondeo-vacio', '')
    let resolver: (() => void) | null = null
    const primera = new Promise<void>(r => {
      resolver = r
    })
    const vistas: Array<[string, number]> = []
    track(
      new TaskOutput(
        't-sondeo-vacio',
        (lastLines, _all, _tl, totalBytes) => {
          vistas.push([lastLines, totalBytes])
          resolver?.()
        },
        true,
      ),
    )

    TaskOutput.startPolling('t-sondeo-vacio')
    await primera
    TaskOutput.stopPolling('t-sondeo-vacio')

    expect(vistas[0]).toEqual(['', 0])
  }, 8000)

  test('el contador de líneas no retrocede al crecer el archivo (costura 5)', async () => {
    // 200 líneas cortas caben en la cola de 4 KB → conteo exacto.
    const path = await seedOutputFile('t-monotono', 'x\n'.repeat(200))
    const totales: number[] = []
    let despertar: (() => void) | null = null
    const siguiente = () =>
      new Promise<void>(r => {
        despertar = r
      })

    let esperando = siguiente()
    track(
      new TaskOutput(
        't-monotono',
        (_l, _a, totalLines) => {
          totales.push(totalLines)
          despertar?.()
        },
        true,
      ),
    )

    TaskOutput.startPolling('t-monotono')
    await esperando
    expect(totales[0]).toBe(201)

    // Ahora líneas MUY largas: la cola de 4 KB apenas verá saltos, y la
    // extrapolación cruda daría un número mucho menor que 200.
    esperando = siguiente()
    await appendFile(path, `${'L'.repeat(3000)}\n`.repeat(20))
    await esperando
    TaskOutput.stopPolling('t-monotono')

    expect(totales.length).toBeGreaterThanOrEqual(2)
    for (let i = 1; i < totales.length; i++) {
      expect(totales[i]!).toBeGreaterThanOrEqual(totales[i - 1]!)
    }
  }, 15000)

  test('startPolling es no-op para una instancia de modo pipe', async () => {
    let llamadas = 0
    track(new TaskOutput('t-no-registrada', () => llamadas++))

    TaskOutput.startPolling('t-no-registrada')
    await new Promise(r => setTimeout(r, 1300))
    TaskOutput.stopPolling('t-no-registrada')

    expect(llamadas).toBe(0)
  }, 8000)
})
