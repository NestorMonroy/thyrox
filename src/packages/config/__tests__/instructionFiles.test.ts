/**
 * Los nombres del archivo de instrucciones: el propio (`THYROX.md`) con el
 * heredado (`CLAUDE.md`) de respaldo, ranura por ranura.
 */
import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import {
  instructionsFileCandidates,
  isInstructionsFileName,
  localInstructionsFileCandidates,
  nestedInstructionsFileCandidates,
  pickInstructionsFile,
  rulesDirectories,
} from '../env/instructionFiles.js'

const only = (...paths: string[]) => (p: string) => paths.includes(p)

describe('candidatos por ranura', () => {
  test('el nombre propio va primero en cada ranura', () => {
    expect(instructionsFileCandidates('/r')).toEqual([join('/r', 'THYROX.md'), join('/r', 'CLAUDE.md')])
    expect(localInstructionsFileCandidates('/r')).toEqual([join('/r', 'THYROX.local.md'), join('/r', 'CLAUDE.local.md')])
    expect(nestedInstructionsFileCandidates('/r')).toEqual([
      join('/r', '.thyrox', 'THYROX.md'),
      join('/r', '.claude', 'CLAUDE.md'),
    ])
    expect(rulesDirectories('/r')).toEqual([join('/r', '.thyrox', 'rules'), join('/r', '.claude', 'rules')])
  })

  test('isInstructionsFileName reconoce los cuatro nombres y nada más', () => {
    for (const name of ['THYROX.md', 'CLAUDE.md', 'THYROX.local.md', 'CLAUDE.local.md']) {
      expect(isInstructionsFileName(name)).toBe(true)
    }
    expect(isInstructionsFileName('README.md')).toBe(false)
  })
})

describe('pickInstructionsFile', () => {
  const c = instructionsFileCandidates('/r')

  test('sin ninguno en disco, el destino es el nombre propio', () => {
    expect(pickInstructionsFile(c, () => false)).toBe(join('/r', 'THYROX.md'))
  })

  test('con sólo el heredado, se usa el heredado', () => {
    expect(pickInstructionsFile(c, only(join('/r', 'CLAUDE.md')))).toBe(join('/r', 'CLAUDE.md'))
  })

  test('con los dos, gana el propio', () => {
    expect(pickInstructionsFile(c, only(join('/r', 'CLAUDE.md'), join('/r', 'THYROX.md')))).toBe(join('/r', 'THYROX.md'))
  })
})
