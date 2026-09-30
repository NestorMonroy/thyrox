/**
 * `bin/generateCoreTypes.ts`: cada tipo de la superficie sale de su schema,
 * y un schema ausente rehúsa en vez de generar un tipo roto.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '../../bin/generateCoreTypes.ts'

const SRC = join(import.meta.dir, '..')

describe('generateCoreTypes', () => {
  test('el archivo versionado es exactamente lo que genera coreSchemas.ts', () => {
    const schemas = readFileSync(join(SRC, 'coreSchemas.ts'), 'utf8')
    expect(readFileSync(join(SRC, 'coreTypes.generated.ts'), 'utf8')).toBe(render(schemas))
  })
  test('deriva los tipos de mensaje del SDK de sus schemas', () => {
    const out = render(readFileSync(join(SRC, 'coreSchemas.ts'), 'utf8'))
    expect(out).toContain('export type SDKUserMessageReplay = z.infer<ReturnType<typeof S.SDKUserMessageReplaySchema>>')
    expect(out).toContain('export type SDKRateLimitInfo = z.infer<ReturnType<typeof S.SDKRateLimitInfoSchema>>')
  })
  test('un schema ausente rehúsa nombrándolo', () => {
    expect(() => render('export const OtroSchema = 1')).toThrow(/no declara el schema de: AccountInfo/)
  })
})
