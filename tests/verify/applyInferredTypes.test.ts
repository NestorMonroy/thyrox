import { describe, expect, setDefaultTimeout, test } from 'bun:test'

// Estas pruebas compilan una fixture con `tsc`: medido en la corrida completa,
// 5.6 a 8 s por caso bajo la carga de `run_ts_isolated`, contra los 5 s por
// defecto de Bun. El límite se declara aquí, donde está la razón.
setDefaultTimeout(60_000)
import { applyInferredTypes, semanticDiagnosticCodes } from '../../src/verify/applyInferredTypes'

const sources = {
  '/p/a.ts': 'export function double(value) { return value * 2 }\n',
  '/p/b.ts': 'export function keep(value: string) { return value }\n',
}

describe('applyInferredTypes', () => {
  test('adds the inferred annotation and closes TS7006', () => {
    expect(semanticDiagnosticCodes(sources, '/p/a.ts')).toContain(7006)
    const changed = applyInferredTypes(sources, ['/p/a.ts'])
    const next = changed.get('/p/a.ts')
    expect(next).toContain('value: number')
    expect(semanticDiagnosticCodes({ ...sources, '/p/a.ts': next! }, '/p/a.ts')).not.toContain(7006)
  })

  test('does not rewrite a file without an inference fix', () => {
    expect(applyInferredTypes(sources, ['/p/b.ts']).size).toBe(0)
  })

  test('rejects an inference that merely makes implicit any explicit', () => {
    const unsafe = { '/p/unsafe.ts': 'export function identity(value) { return value }\n' }
    expect(applyInferredTypes(unsafe, ['/p/unsafe.ts']).size).toBe(0)
  })
})
