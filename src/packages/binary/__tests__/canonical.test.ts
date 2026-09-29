/**
 * La versión canónica de la referencia: contra ella se mide la paridad, y no
 * cambia porque el ejecutable vivo se actualice ni porque se extraiga una
 * build más reciente.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CANONICAL_REFERENCE_VERSION, canonicalRoot, resolveReadRoot } from '../src/canonical.ts'
import { corpusVersion } from '../src/freshness.ts'

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

describe('resolveReadRoot — la raíz por defecto de symbol/literal/references/declarations', () => {
  test('un --root explícito manda sobre la canónica', () => {
    expect(resolveReadRoot('/otro/root', '/corpus')).toBe('/otro/root')
  })

  test('sin --root, la raíz es la canónica aunque exista una build más reciente extraída', () => {
    const root = mkdtempSync(join(tmpdir(), 'canonical-'))
    const newerVersion = '9.9.9'
    for (const v of [CANONICAL_REFERENCE_VERSION, newerVersion]) {
      mkdirSync(join(root, v, 'bunfs-root'), { recursive: true })
      writeFileSync(join(root, v, 'MANIFEST.tsv'), 'archivo\tbytes\ttipo\tsha256\n')
    }
    // Control de que el escenario mide lo que dice: la build más reciente NO
    // es la canónica, así que si `resolveReadRoot` la devolviera por error
    // esta aserción de preparación ya lo dejaría ver.
    expect(corpusVersion(root)).toBe(newerVersion)
    expect(corpusVersion(root)).not.toBe(CANONICAL_REFERENCE_VERSION)

    expect(resolveReadRoot('', root)).toBe(canonicalRoot(root))
    expect(resolveReadRoot('', root)).not.toContain(newerVersion)
  })
})
