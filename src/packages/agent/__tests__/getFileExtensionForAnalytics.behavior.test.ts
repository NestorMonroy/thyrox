/**
 * Porte de `ccnmt: packages/agent/__tests__/getFileExtensionForAnalytics.behavior.test.ts`.
 * Fija la conducta de la clave de analitica por tipo de archivo: una
 * extraccion equivocada reparte el uso en cubos que no corresponden.
 */
import { describe, expect, test } from 'bun:test'
import { getFileExtensionForAnalytics } from '../eventMetadata.ts'

describe('getFileExtensionForAnalytics', () => {
  test('normaliza a minusculas y quita el punto', () => {
    expect(getFileExtensionForAnalytics('foo.TS')).toBe('ts')
    expect(getFileExtensionForAnalytics('/path/to/file.py')).toBe('py')
  })

  test('sin extension devuelve indefinido', () => {
    expect(getFileExtensionForAnalytics('README')).toBeUndefined()
    expect(getFileExtensionForAnalytics('Makefile')).toBeUndefined()
  })

  test('el archivo oculto SIN extension propia devuelve indefinido', () => {
    // En `.bashrc` el punto abre el nombre, no separa una extension.
    expect(getFileExtensionForAnalytics('.bashrc')).toBeUndefined()
    expect(getFileExtensionForAnalytics('.gitignore')).toBeUndefined()
  })

  test('el archivo oculto CON extension conserva la ultima', () => {
    expect(getFileExtensionForAnalytics('.env.local')).toBe('local')
  })

  test('por encima de diez caracteres cae al cubo de sobrante', () => {
    expect(getFileExtensionForAnalytics('foo.thisisverylongextension')).toBe('other')
  })

  test('diez caracteres exactos pasan: es el limite, no el corte', () => {
    expect(getFileExtensionForAnalytics('foo.tenletters')).toBe('tenletters')
    expect(getFileExtensionForAnalytics('foo.elevenchars')).toBe('other')
  })

  test('la normalizacion a minusculas se aplica al valor final', () => {
    expect(getFileExtensionForAnalytics('report.XLSX')).toBe('xlsx')
    expect(getFileExtensionForAnalytics('IMG.JPG')).toBe('jpg')
  })

  test('con varios puntos cuenta solo el ULTIMO tramo', () => {
    expect(getFileExtensionForAnalytics('archive.tar.gz')).toBe('gz')
  })

  test('el punto final devuelve indefinido', () => {
    expect(getFileExtensionForAnalytics('foo.')).toBeUndefined()
  })
})
