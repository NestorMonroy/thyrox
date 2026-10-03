/**
 * Pruebas de la capa de aterrizaje de enlaces de 2.1.283
 * (`chunk-d310mfjt.js`: `ect`, `n5e`, `cln`, `xl`, `dln`, `ete`), sobre
 * objetos resueltos construidos a mano: aquí se mide la capa, no el disco.
 */
import { describe, expect, test } from 'bun:test'
import {
  denyUnresolvedTarget,
  displayPath,
  landingBeyondRequested,
  landingSentence,
  READ_OPERATION,
  symlinkLanding,
  WRITE_OPERATION,
} from '../fileToolPermissions.js'

const WORK = '/work/project'

function resolvedAt(requested: string, landing: string) {
  return { unresolved: false as const, requested, spellings: [requested, landing], landing, leafIsSymlink: true }
}
function ctx() {
  return {
    mode: 'default',
    additionalWorkingDirectories: new Map(),
    alwaysAllowRules: {},
    alwaysDenyRules: {},
    alwaysAskRules: {},
  } as never
}

describe('landingBeyondRequested (ect)', () => {
  test('un objeto irresoluble no tiene aterrizaje', () => {
    expect(
      landingBeyondRequested({ unresolved: true, requested: '/a', spellings: ['/a'], stoppedAt: '/a', leafIsSymlink: true }),
    ).toBeNull()
  })
  test('si el aterrizaje es la misma ruta pedida, no hay aterrizaje que contar', () => {
    expect(landingBeyondRequested(resolvedAt('/a/b', '/a/b'))).toBeNull()
  })
  test('si difiere, es el aterrizaje', () => {
    expect(landingBeyondRequested(resolvedAt('/a/b', '/c/d'))).toBe('/c/d')
  })
})

describe('symlinkLanding (n5e)', () => {
  test('carriedOut exige grafia pedida dentro y aterrizaje fuera', () => {
    const landing = symlinkLanding(resolvedAt(`${WORK}/x`, '/etc/passwd'), ctx(), new Set([WORK]))
    expect(landing).toEqual({ landing: '/etc/passwd', landingOutside: true, spellingInside: true, carriedOut: true })
  })
  test('un aterrizaje dentro del trabajo no esta fuera ni sale', () => {
    const landing = symlinkLanding(resolvedAt(`${WORK}/x`, `${WORK}/y`), ctx(), new Set([WORK]))
    expect(landing).toMatchObject({ landingOutside: false, carriedOut: false })
  })
  test('sin aterrizaje distinto, null', () => {
    expect(symlinkLanding(resolvedAt(`${WORK}/x`, `${WORK}/x`), ctx(), new Set([WORK]))).toBeNull()
  })
})

describe('landingSentence (cln) y displayPath (ete)', () => {
  test('la frase nombra el enlace y anade la clausula de fuera solo si aterriza fuera', () => {
    const outside = { landing: '/etc/passwd', landingOutside: true, spellingInside: true, carriedOut: true }
    expect(landingSentence('/w/x', outside)).toBe(
      '/w/x resolves through a symlink to /etc/passwd, which is outside the allowed working directories',
    )
    expect(landingSentence('/w/x', { ...outside, landingOutside: false })).toBe('/w/x resolves through a symlink to /etc/passwd')
  })
  test('displayPath sustituye caracteres de control y recorta a 160', () => {
    expect(displayPath('/a\u0000b‮')).toBe('/a�b�')
    const long = `/${'x'.repeat(200)}`
    const shown = displayPath(long)
    expect(shown.startsWith(long.slice(0, 160))).toBe(true)
    expect(shown).toContain('[+41 chars]')
  })
})

describe('denyUnresolvedTarget (xl)', () => {
  test('lectura y escritura conjugan el verbo y llevan la razon de dln', () => {
    const read = denyUnresolvedTarget(READ_OPERATION, '/w/x')
    const write = denyUnresolvedTarget(WRITE_OPERATION, '/w/x')
    expect(read.message.startsWith('Refusing to read /w/x')).toBe(true)
    expect(write.message.startsWith('Refusing to write /w/x')).toBe(true)
    expect(read.decisionReason).toEqual({
      type: 'other',
      reason:
        'Where /w/x leads on disk could not be determined (a link or directory on the way could not be examined, or the links do not resolve)',
    })
  })
})
