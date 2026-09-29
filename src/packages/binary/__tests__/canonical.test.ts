/**
 * La versión canónica de la referencia: contra ella se mide la paridad, y no
 * cambia porque el ejecutable vivo se actualice.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { CANONICAL_REFERENCE_VERSION, canonicalRoot } from '../src/canonical.ts'

describe('versión canónica de la referencia', () => {
  test('está declarada como una versión N.N.N', () => {
    expect(CANONICAL_REFERENCE_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test('canonicalRoot apunta a su bunfs-root dentro del corpus dado', () => {
    expect(canonicalRoot('/corpus')).toBe(join('/corpus', CANONICAL_REFERENCE_VERSION, 'bunfs-root'))
  })

  // CONTROL: una versión canónica sin corpus versionado dejaría a las
  // herramientas midiendo contra nada; esta prueba cae si el corpus falta.
  test('el corpus canónico existe en el árbol, con su MANIFEST', () => {
    const corpus = join(import.meta.dir, '..', '..', '..', '..', '_references', 'claude-code-bin')
    expect(existsSync(join(corpus, CANONICAL_REFERENCE_VERSION, 'MANIFEST.tsv'))).toBe(true)
  })
})
