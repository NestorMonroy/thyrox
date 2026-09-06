import { describe, expect, test } from 'bun:test'
import { formatMs, formatTimelineLine, getPerformance } from '../profilerBase.js'

describe('formatMs — tres decimales fijos', () => {
  test('redondea a tres decimales', () => {
    expect(formatMs(1.23456)).toBe('1.235')
  })

  test('cero se muestra con tres decimales', () => {
    expect(formatMs(0)).toBe('0.000')
  })
})

describe('getPerformance — singleton perezoso', () => {
  test('devuelve el mismo objeto en llamadas sucesivas', () => {
    const a = getPerformance()
    const b = getPerformance()
    expect(a).toBe(b)
  })

  test('expone mark(), propio de perf_hooks.performance', () => {
    const perf = getPerformance()
    expect(typeof perf.mark).toBe('function')
  })
})

describe('formatTimelineLine — formato compartido de la línea de perfil', () => {
  test('sin memoria: no añade el segmento RSS/Heap', () => {
    const linea = formatTimelineLine(12.5, 3.25, 'checkpoint_a', undefined, 8, 7)
    expect(linea).toBe('[+  12.500ms] (+  3.250ms) checkpoint_a')
  })

  test('con memoria: añade RSS y Heap formateados con formatFileSize', () => {
    const memoria = { rss: 2048, heapUsed: 1024 } as NodeJS.MemoryUsage
    const linea = formatTimelineLine(0, 0, 'inicio', memoria, 8, 7)
    expect(linea).toBe('[+   0.000ms] (+  0.000ms) inicio | RSS: 2KB, Heap: 1KB')
  })

  test('el parámetro extra se intercala entre el nombre y la memoria', () => {
    const linea = formatTimelineLine(1, 1, 'n', undefined, 3, 3, ' [extra]')
    expect(linea).toBe('[+1.000ms] (+1.000ms) n [extra]')
  })

  test('totalPad/deltaPad alinean con padStart, no truncan', () => {
    // Un pad menor al ancho real del texto no lo recorta — padStart no trunca.
    const linea = formatTimelineLine(123.456, 1, 'x', undefined, 2, 2)
    expect(linea).toBe('[+123.456ms] (+1.000ms) x')
  })
})
