import { describe, expect, test } from 'bun:test'
import { parseTagFromReleaseLocation } from '../githubReleases.js'

// parseTagFromReleaseLocation extrae el tag de la cabecera `Location` que
// github.com devuelve en el 302 de `/releases/latest`. Ese es el camino sin
// rate limit del que depende el auto-updater: el presupuesto sin autenticar
// de api.github.com, 60/h, se comparte por IP y se agota a menudo, y produce
// un 403 que deshabilitaba el auto-update en silencio — el defecto que esta
// funcion existe para corregir. Se fija el analisis para que una regresion
// no pueda volver a romper la resolucion de la actualizacion.
describe('parseTagFromReleaseLocation', () => {
  test('extracts tag from an absolute github.com redirect URL', () => {
    expect(
      parseTagFromReleaseLocation(
        'https://github.com/Jcg-admin/claude-code-how-works/releases/tag/v26.5.92',
      ),
    ).toBe('v26.5.92')
  })

  test('extracts tag from a relative redirect path', () => {
    expect(
      parseTagFromReleaseLocation(
        '/Jcg-admin/claude-code-how-works/releases/tag/v26.5.92',
      ),
    ).toBe('v26.5.92')
  })

  test('preserves the leading v (callers strip if needed)', () => {
    const tag = parseTagFromReleaseLocation(
      'https://github.com/o/r/releases/tag/v1.carus.000',
    )
    expect(tag).toBe('v1.carus.000')
  })

  test('strips a trailing query string', () => {
    expect(
      parseTagFromReleaseLocation(
        'https://github.com/o/r/releases/tag/v26.5.92?foo=bar',
      ),
    ).toBe('v26.5.92')
  })

  test('strips a trailing hash fragment', () => {
    expect(
      parseTagFromReleaseLocation(
        'https://github.com/o/r/releases/tag/v26.5.92#notes',
      ),
    ).toBe('v26.5.92')
  })

  test('decodes percent-encoded tag segments', () => {
    // Un tag con un caracter codificado. Es defensivo: los tags de ccb son
    // llanos, pero GitHub codifica en porcentaje los nombres de tag inusuales
    // dentro del Location.
    expect(
      parseTagFromReleaseLocation(
        'https://github.com/o/r/releases/tag/v26.5.92%2Bbuild',
      ),
    ).toBe('v26.5.92+build')
  })

  test('returns null when the URL is the releases index (no /tag/)', () => {
    // Un repo sin releases sirve el indice con 200 y sin segmento /tag/: el
    // camino de redireccion lo trata como «no hay release».
    expect(
      parseTagFromReleaseLocation('https://github.com/o/r/releases'),
    ).toBeNull()
  })

  test('returns null for an unrelated URL', () => {
    expect(
      parseTagFromReleaseLocation('https://example.com/not/a/release'),
    ).toBeNull()
  })

  test('returns null for an empty string', () => {
    expect(parseTagFromReleaseLocation('')).toBeNull()
  })

  test('returns null when the tag segment is empty', () => {
    expect(
      parseTagFromReleaseLocation('https://github.com/o/r/releases/tag/'),
    ).toBeNull()
  })
})
