/**
 * Pruebas de `pathSafety.ts`: `Gge` de 2.1.275 (`chunk-9apg35nm.js`) y sus
 * predicados. Cada caso negativo escribe o apunta a una ruta que EXISTE.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getOriginalCwd, setCwdState, setOriginalCwd } from '@thyrox/app-host/bootstrap/state.js'
import {
  checkPathSafetyForAutoEdit,
  comparableSegment,
  isClaudeSettingsPath,
  isSensitivePath,
  isSuspiciousWindowsPath,
  isUncPath,
} from '../pathSafety.js'

let base: string
let previousCwd: string
function touch(...parts: string[]): string {
  const file = join(base, ...parts)
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, 'x')
  return file
}
beforeAll(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'path-safety-')))
  previousCwd = getOriginalCwd()
  setOriginalCwd(base)
  setCwdState(base)
})
afterAll(() => {
  setOriginalCwd(previousCwd)
  setCwdState(previousCwd)
  rmSync(base, { recursive: true, force: true })
})

describe('comparableSegment (sc)', () => {
  test('pliega, quita invisibles, flujo alterno y puntos finales', () => {
    expect(comparableSegment('.Git\u200d')).toBe('.git')
    expect(comparableSegment('config:$DATA')).toBe('config')
    expect(comparableSegment('bashrc. ')).toBe('bashrc')
  })
  test('un segmento que se vaciaría conserva su pliegue', () => {
    expect(comparableSegment('..')).toBe('..')
  })
})

describe('checkPathSafetyForAutoEdit (Gge)', () => {
  test('un archivo común de trabajo es seguro', () => {
    expect(checkPathSafetyForAutoEdit(touch('src', 'a.ts'))).toEqual({ safe: true })
  })
  test('el archivo de settings de un proyecto se corta como settings', () => {
    const file = touch('.claude', 'settings.json')
    const r = checkPathSafetyForAutoEdit(file)
    expect(r.safe).toBe(false)
    if (r.safe) throw new Error('unreachable')
    expect(r).toMatchObject({ classifierApprovable: true, circuitBreaker: 'claudeSettingsFile' })
    expect(r.message).toBe(`Claude requested permissions to write to ${file}, but you haven't granted it yet.`)
  })
  test('un archivo de shell es sensible', () => {
    const file = touch('.bashrc')
    const r = checkPathSafetyForAutoEdit(file)
    expect(r).toEqual({ safe: false, message: `Claude requested permissions to edit ${file} which is a sensitive file.`, classifierApprovable: true })
  })
  test('todo lo que cuelga de .git es sensible', () => {
    expect(checkPathSafetyForAutoEdit(touch('.git', 'config')).safe).toBe(false)
  })
  test('la secuencia .config/git es sensible', () => {
    expect(checkPathSafetyForAutoEdit(touch('.config', 'git', 'ignore')).safe).toBe(false)
  })
  test('una ruta con nombre corto 8.3 es sospechosa y no la aprueba el clasificador', () => {
    const file = touch('PROGRA~1', 'x.txt')
    expect(checkPathSafetyForAutoEdit(file)).toMatchObject({ safe: false, classifierApprovable: false, circuitBreaker: 'suspiciousWindowsPath' })
  })
  test('un comando de .claude/commands pide permiso salvo que se permita editar la config', () => {
    const file = touch('.claude', 'commands', 'deploy.md')
    const r = checkPathSafetyForAutoEdit(file)
    expect(r).toMatchObject({ safe: false, classifierApprovable: true })
    if (r.safe) throw new Error('unreachable')
    expect(r.circuitBreaker).toBeUndefined()
    expect(checkPathSafetyForAutoEdit(file, undefined, undefined, true)).toEqual({ safe: true })
  })
  test('permitir la config no abre .claude fuera de skills, agents y commands', () => {
    expect(checkPathSafetyForAutoEdit(touch('.claude', 'hooks', 'x.sh'), undefined, undefined, true).safe).toBe(false)
  })
})

describe('predicados', () => {
  test('isClaudeSettingsPath reconoce settings.local.json en cualquier .claude', () => {
    expect(isClaudeSettingsPath(join(base, 'otro', '.claude', 'settings.local.json'))).toBe(true)
    expect(isClaudeSettingsPath(join(base, 'otro', 'settings.json'))).toBe(false)
  })
  test('isSuspiciousWindowsPath: dispositivos, tres puntos y segmentos con punto final', () => {
    expect(isSuspiciousWindowsPath('/tmp/x/aux.con')).toBe(true)
    expect(isSuspiciousWindowsPath('/tmp/.../x')).toBe(true)
    expect(isSuspiciousWindowsPath('/tmp/dir./x')).toBe(true)
    expect(isSuspiciousWindowsPath('/tmp/dir/x.txt')).toBe(false)
  })
  test('isUncPath: doble barra y espacio de dispositivo', () => {
    expect(isUncPath('//server/share')).toBe(true)
    expect(isUncPath('\\??\\C:\\x')).toBe(true)
    expect(isUncPath('/srv/share')).toBe(false)
  })
  test('isSensitivePath: el automontaje /net es sensible salvo directorio de red de confianza', () => {
    expect(isSensitivePath('/net/host/share/x', false)).toBe(true)
    const trusted = new Map([['session', ['/net/host/share']]])
    expect(isSensitivePath('/net/host/share/x', false, trusted)).toBe(false)
  })
})
