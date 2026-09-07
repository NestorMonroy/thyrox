/**
 * Puerto de `ccnmt: packages/ide/src/__tests__/idePathConversion.test.ts`.
 * Mismos casos que la fuente, reescritos: aserciones de comportamiento
 * observable sobre `checkWSLDistroMatch`, no expresión con derechos de autor.
 */
import { describe, expect, test } from 'bun:test'
import { checkWSLDistroMatch } from '../idePathConversion.js'

describe('checkWSLDistroMatch — rutas que no son WSL', () => {
  test('true para una ruta Windows llana (no es un UNC de WSL)', () => {
    expect(checkWSLDistroMatch('C:\\Users\\me\\project', 'Ubuntu')).toBe(true)
  })
  test('true para una ruta POSIX llana', () => {
    expect(checkWSLDistroMatch('/home/me/project', 'Ubuntu')).toBe(true)
  })
  test('true para ruta vacía', () => {
    expect(checkWSLDistroMatch('', 'Ubuntu')).toBe(true)
  })
  test('true para ruta relativa', () => {
    expect(checkWSLDistroMatch('./relative', 'Ubuntu')).toBe(true)
  })
})

describe('checkWSLDistroMatch — forma \\\\wsl.localhost', () => {
  test('true cuando el nombre de la distro coincide', () => {
    expect(
      checkWSLDistroMatch('\\\\wsl.localhost\\Ubuntu\\home\\me', 'Ubuntu'),
    ).toBe(true)
  })
  test('false cuando el nombre de la distro difiere', () => {
    expect(
      checkWSLDistroMatch('\\\\wsl.localhost\\Debian\\home\\me', 'Ubuntu'),
    ).toBe(false)
  })
  test('el match distingue mayúsculas (Ubuntu ≠ ubuntu)', () => {
    expect(
      checkWSLDistroMatch('\\\\wsl.localhost\\Ubuntu\\home\\me', 'ubuntu'),
    ).toBe(false)
  })
})

describe('checkWSLDistroMatch — forma \\\\wsl$ (legacy)', () => {
  test('true cuando el nombre de la distro coincide', () => {
    expect(checkWSLDistroMatch('\\\\wsl$\\Ubuntu\\home\\me', 'Ubuntu')).toBe(
      true,
    )
  })
  test('false cuando el nombre de la distro difiere', () => {
    expect(checkWSLDistroMatch('\\\\wsl$\\Debian\\home\\me', 'Ubuntu')).toBe(
      false,
    )
  })
  test('maneja \\\\wsl$ en la raíz (sin ruta final)', () => {
    expect(checkWSLDistroMatch('\\\\wsl$\\Ubuntu', 'Ubuntu')).toBe(true)
  })
})

describe('checkWSLDistroMatch — parcial / malformado', () => {
  test('un prefijo UNC parcial se trata como no-WSL → true', () => {
    expect(checkWSLDistroMatch('\\\\wsl', 'Ubuntu')).toBe(true)
  })
  test('un UNC con el segmento de distro vacío se trata como no-WSL → true', () => {
    // La regex exige [^\\]+ para la parte de la distro — si está vacía
    // (\\\\wsl$\\\\path), la regex no matchea y la función devuelve true
    // (la rama "no es un UNC de WSL").
    expect(checkWSLDistroMatch('\\\\wsl$\\\\path', 'Ubuntu')).toBe(true)
  })
})
