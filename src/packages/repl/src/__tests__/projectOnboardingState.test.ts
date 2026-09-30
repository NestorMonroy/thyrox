/**
 * El paso de onboarding que pide un archivo de instrucciones se da por
 * cumplido con cualquiera de los dos nombres de la ranura: `THYROX.md` o el
 * heredado `CLAUDE.md`. (thyrox-rename: keep — respaldo heredado)
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import { setCwdState } from '@thyrox/app-host/bootstrap/state.js'
import { getSteps } from '../projectOnboardingState.js'

let base: string
let previous: string
beforeAll(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'onboarding-')))
  previous = getCwd()
})
afterAll(() => {
  setCwdState(previous)
  rmSync(base, { recursive: true, force: true })
})

function instructionsStep(name: string, files: string[]): boolean {
  const dir = join(base, name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'main.ts'), '')
  for (const f of files) writeFileSync(join(dir, f), 'x')
  setCwdState(dir)
  return getSteps().find(s => s.key === 'claudemd')!.isComplete
}

describe('getSteps', () => {
  test('sin archivo de instrucciones el paso queda pendiente', () => {
    expect(instructionsStep('ninguno', [])).toBe(false)
  })
  test('THYROX.md cumple el paso', () => {
    expect(instructionsStep('propio', ['THYROX.md'])).toBe(true)
  })
  test('CLAUDE.md sigue cumpliéndolo', () => {
    expect(instructionsStep('heredado', ['CLAUDE.md'])).toBe(true)
  })
})

describe('textos del onboarding', () => {
  test('nombran el producto y el archivo propios', () => {
    const dir = join(base, 'textos')
    mkdirSync(dir, { recursive: true })
    setCwdState(dir)
    const texts = getSteps().map(s => s.text)
    expect(texts).toEqual([
      'Ask thyrox to create a new app or clone a repository',
      'Run /init to create a THYROX.md file with instructions for thyrox',
    ])
  })
})
