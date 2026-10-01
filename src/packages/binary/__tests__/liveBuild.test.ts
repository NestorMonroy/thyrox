/**
 * `classifyLiveBuild` — los tres estados posibles de la build viva frente al
 * árbol, sin depender de que el ejecutable vivo exista ni de que coincida
 * con la versión canónica.
 */
import { describe, expect, test } from 'bun:test'
import { classifyLiveBuild } from '../src/liveBuild.ts'

describe('classifyLiveBuild', () => {
  test('measured — hay fila en MEASURED para la versión viva', () => {
    const r = classifyLiveBuild({
      liveVersion: '2.1.283',
      measuredVersions: ['2.1.281', '2.1.283'],
      corpusVersions: ['2.1.281', '2.1.283'],
    })
    expect(r).toBe('measured')
  })

  test('unmeasured-without-corpus — versión nueva, sin fila y sin corpus: estado legítimo', () => {
    const r = classifyLiveBuild({
      liveVersion: '2.1.284',
      measuredVersions: ['2.1.281', '2.1.283'],
      corpusVersions: ['2.1.281', '2.1.283'],
    })
    expect(r).toBe('unmeasured-without-corpus')
  })

  test('unmeasured-with-corpus — hay corpus pero falta la fila: inconsistencia', () => {
    const r = classifyLiveBuild({
      liveVersion: '2.1.282',
      measuredVersions: ['2.1.281', '2.1.283'],
      corpusVersions: ['2.1.281', '2.1.282', '2.1.283'],
    })
    expect(r).toBe('unmeasured-with-corpus')
  })

  test('measured gana aunque la versión también tenga corpus — la fila es lo que decide', () => {
    const r = classifyLiveBuild({
      liveVersion: '2.1.283',
      measuredVersions: ['2.1.283'],
      corpusVersions: ['2.1.283'],
    })
    expect(r).toBe('measured')
  })

  test('sin fila y sin corpus para ninguna versión — sigue siendo unmeasured-without-corpus', () => {
    const r = classifyLiveBuild({ liveVersion: '9.9.9', measuredVersions: [], corpusVersions: [] })
    expect(r).toBe('unmeasured-without-corpus')
  })

  // CONTROL de anulación: sin el guard de `measured` (retirado a mano aquí,
  // reproduciendo la rama que quedaría si se borrara del código), una versión
  // con fila Y corpus caería en `unmeasured-with-corpus` — exactamente la
  // aserción de arriba que distingue las dos ramas.
  test('anulación — sin discriminar por measuredVersions, el caso "measured gana" no se sostiene', () => {
    const withoutMeasuredGuard = ({ liveVersion, corpusVersions }: { liveVersion: string; measuredVersions: Iterable<string>; corpusVersions: Iterable<string> }) => {
      const corpus = new Set(corpusVersions)
      return corpus.has(liveVersion) ? 'unmeasured-with-corpus' : 'unmeasured-without-corpus'
    }
    const r = withoutMeasuredGuard({ liveVersion: '2.1.283', measuredVersions: ['2.1.283'], corpusVersions: ['2.1.283'] })
    expect(r).toBe('unmeasured-with-corpus')
    expect(r).not.toBe(classifyLiveBuild({ liveVersion: '2.1.283', measuredVersions: ['2.1.283'], corpusVersions: ['2.1.283'] }))
  })
})
