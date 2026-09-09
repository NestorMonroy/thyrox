/**
 * La mitad ROJA de `outputFormatting`.
 *
 * Procedencia del SUJETO:
 * `ccnmt: packages/tool-registry/src/task/outputFormatting.ts`. Los casos son
 * propios —ese árbol declara `"license": "UNLICENSED"`.
 *
 * QUÉ SE MIDE. El módulo decide qué parte de la salida de un trabajo entra al
 * contexto del modelo, así que sus dos defectos posibles son opuestos: recortar
 * de más —perder el final, que es donde está el error— y recortar de menos
 * —empujar megabytes y agotar la ventana—. Los dos se miden.
 *
 * Y una tercera cosa, que es la que hace honesto el recorte: la cabecera. Sin
 * ella una salida recortada se lee como la salida entera, y quien la lea sacará
 * una conclusión sobre un universo que no es el que tiene delante.
 *
 * Cuatro costuras con anulación, y las cuatro se corrieron:
 *
 * 1. **La cola, no la cabeza** — `slice(-espacio)`. Anulación: cambiarlo a
 *    `slice(0, espacio)` y cae **1** caso, el 8, el que fija que sobrevive el
 *    final. El 11 NO cae: con presupuesto negativo las dos formas devuelven
 *    algo, y sólo la cabecera lo distingue — por eso ese caso afirma sobre la
 *    cabecera y no sobre la cola.
 * 2. **La cabecera se descuenta del presupuesto** — `maxLength - header.length`.
 *    Anulación: usar `maxLength` a secas y cae **1** caso, el que mide que el
 *    resultado nunca pasa del límite.
 * 3. **El tope duro** — `TASK_MAX_OUTPUT_UPPER_LIMIT` como cuarto argumento.
 *    Anulación: pasar `Number.MAX_SAFE_INTEGER` y cae **1** caso, el que fija
 *    que una variable de entorno enorme queda capada.
 * 4. **La comparación no estricta** — `output.length <= maxLength`. Anulación:
 *    cambiarla a `<` y cae **1** caso, el del largo exacto, que se recortaría
 *    sin necesidad.
 *
 * Métrica: `content`, `wasTruncated` y la longitud del resultado, con
 * `TASK_MAX_OUTPUT_LENGTH` fijada por caso.
 * Ciega a: la ruta que `getTaskOutputPath` compone — depende del hogar de
 * sesión, y aquí sólo se comprueba que aparece en la cabecera.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { getTaskOutputPath } from '@thyrox/storage/task/diskOutput.js'
import {
  formatTaskOutput,
  getMaxTaskOutputLength,
  TASK_MAX_OUTPUT_DEFAULT,
  TASK_MAX_OUTPUT_UPPER_LIMIT,
} from '../outputFormatting.js'

const VARIABLE = 'TASK_MAX_OUTPUT_LENGTH'

function setLimit(value: string | undefined): void {
  if (value === undefined) {
    delete process.env[VARIABLE]
  } else {
    process.env[VARIABLE] = value
  }
}

afterEach(() => {
  setLimit(undefined)
})

describe('getMaxTaskOutputLength — el límite y su tope', () => {
  test('1. sin variable, el valor por defecto', () => {
    setLimit(undefined)
    expect(getMaxTaskOutputLength()).toBe(TASK_MAX_OUTPUT_DEFAULT)
  })

  test('2. una variable válida gana sobre el defecto', () => {
    setLimit('5000')
    expect(getMaxTaskOutputLength()).toBe(5000)
  })

  test('3. una variable enorme queda capada al tope duro', () => {
    setLimit('99999999')
    expect(getMaxTaskOutputLength()).toBe(TASK_MAX_OUTPUT_UPPER_LIMIT)
  })

  test('4. una variable que no es un entero positivo cae al defecto', () => {
    for (const v of ['abc', '0', '-5', '']) {
      setLimit(v)
      expect(getMaxTaskOutputLength()).toBe(TASK_MAX_OUTPUT_DEFAULT)
    }
  })
})

describe('formatTaskOutput — cuando cabe', () => {
  test('5. una salida corta pasa intacta y sin marcar', () => {
    setLimit('1000')
    const r = formatTaskOutput('todo bien', 'tarea-corta')
    expect(r.content).toBe('todo bien')
    expect(r.wasTruncated).toBe(false)
  })

  test('6. el largo EXACTO cabe: la comparación no es estricta', () => {
    setLimit('100')
    const r = formatTaskOutput('x'.repeat(100), 'tarea-justa')
    expect(r.wasTruncated).toBe(false)
    expect(r.content).toHaveLength(100)
  })

  test('7. la salida vacía pasa intacta', () => {
    setLimit('100')
    expect(formatTaskOutput('', 'tarea-vacia')).toEqual({
      content: '',
      wasTruncated: false,
    })
  })
})

describe('formatTaskOutput — cuando no cabe', () => {
  test('8. sobrevive el FINAL, que es donde está el error', () => {
    setLimit('200')
    const salida = 'PRINCIPIO' + 'x'.repeat(5000) + 'ERROR-FINAL'
    const r = formatTaskOutput(salida, 'tarea-larga')
    expect(r.wasTruncated).toBe(true)
    expect(r.content.endsWith('ERROR-FINAL')).toBe(true)
    expect(r.content).not.toContain('PRINCIPIO')
  })

  test('9. la cabecera nombra el archivo completo', () => {
    setLimit('200')
    const r = formatTaskOutput('y'.repeat(5000), 'tarea-cabecera')
    expect(r.content.startsWith('[Truncated. Full output: ')).toBe(true)
    expect(r.content).toContain(getTaskOutputPath('tarea-cabecera'))
  })

  test('10. el resultado con cabecera NO pasa del límite', () => {
    // La cabecera se descuenta del presupuesto: si no, el recorte devolvería
    // algo más largo que el límite que dice respetar.
    setLimit('300')
    const r = formatTaskOutput('z'.repeat(20_000), 'tarea-presupuesto')
    expect(r.content.length).toBeLessThanOrEqual(300)
  })

  test('11. un límite por debajo de la cabecera no revienta ni invierte el corte', () => {
    // `availableSpace` sale negativo, y `slice(-negativo)` sobre una cadena
    // devuelve la cola: el resultado sigue siendo cabecera + cola, nunca la
    // cabeza. Se fija la conducta REAL, que es la de la fuente.
    setLimit('1')
    const r = formatTaskOutput('a'.repeat(50) + 'FIN', 'tarea-limite-minimo')
    expect(r.wasTruncated).toBe(true)
    expect(r.content.startsWith('[Truncated. Full output: ')).toBe(true)
  })
})
