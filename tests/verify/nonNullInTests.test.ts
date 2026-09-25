import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { applyNonNullInTests } from '../../src/verify/nonNullInTests'
import { semanticDiagnosticCodes } from '../../src/verify/removeUnusedImports'
import { DEFAULT_OPTIONS } from '../../src/verify/tsLanguageService'

// Cada caso crea un servicio de lenguaje: segundos, no milisegundos.
setDefaultTimeout(60_000)

const options = { ...DEFAULT_OPTIONS, noUncheckedIndexedAccess: true }
const indexed = 'const calls: { name: string }[] = []\nexport const n = calls[0].name\n'
const maybe = 'declare const found: { id: number } | undefined\nexport const id = found.id\n'

describe('nonNullInTests', () => {
  test('asserts the flagged index in a test file and closes TS2532', () => {
    const file = '/p/__tests__/a.test.ts'
    expect(semanticDiagnosticCodes({ [file]: indexed }, file, options)).toContain(2532)
    const next = applyNonNullInTests({ [file]: indexed }, [file]).get(file)
    expect(next).toContain('calls[0]!.name')
    expect(semanticDiagnosticCodes({ [file]: next! }, file, options)).not.toContain(2532)
  })

  test('asserts a possibly undefined name and closes TS18048', () => {
    const file = '/p/b.test.ts'
    const next = applyNonNullInTests({ [file]: maybe }, [file]).get(file)
    expect(next).toContain('found!.id')
    expect(semanticDiagnosticCodes({ [file]: next! }, file, options)).not.toContain(18048)
  })

  test('leaves product code alone', () => {
    const file = '/p/src/a.ts'
    expect(semanticDiagnosticCodes({ [file]: indexed }, file, options)).toContain(2532)
    expect(applyNonNullInTests({ [file]: indexed }, [file]).size).toBe(0)
  })
})
