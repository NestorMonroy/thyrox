import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ModelQualification } from '@thyrox/model-artifacts/modelQualification.ts'

import { QualificationFileError, appendQualification, loadQualifications } from '../qualificationStore.js'

const WORKDIR = mkdtempSync(join(tmpdir(), 'qualification-store-'))
afterAll(() => rmSync(WORKDIR, { recursive: true, force: true }))

const QUALIFICATION: ModelQualification = {
  model: 'thyrox-library--qwen2.5-0.5b:q4_k_m-ollama-cccccccccccc',
  kind: 'protocol',
  suite: 'tool-calling@1',
  casesPassed: 6,
  casesTotal: 6,
  passed: true,
  contextTokens: 8192,
  tokensPerSecond: 31.5,
  measurementCondition: 'contended',
  measuredAt: '2026-10-01T05:00:00.000Z',
}

describe('qualificationStore', () => {
  test('un archivo ausente es una lista vacía', async () => {
    expect(await loadQualifications(join(WORKDIR, 'absent.json'))).toEqual([])
  })

  test('añadir conserva las anteriores y crea el directorio', async () => {
    const path = join(WORKDIR, 'nested', 'dir', 'qualifications.json')
    await appendQualification(path, QUALIFICATION)
    const later = { ...QUALIFICATION, passed: false, casesPassed: 5, measuredAt: '2026-10-01T06:00:00.000Z' }
    await appendQualification(path, later)
    expect(await loadQualifications(path)).toEqual([QUALIFICATION, later])
    expect(readFileSync(path, 'utf8').endsWith('\n')).toBe(true)
  })

  test('un archivo inválido se rehúsa con la ruta, nunca como lista vacía', async () => {
    const path = join(WORKDIR, 'broken.json')
    writeFileSync(path, '{"qualifications": [{"model": ""}]}')
    await expect(loadQualifications(path)).rejects.toThrow(QualificationFileError)
    await expect(loadQualifications(path)).rejects.toThrow(path)
  })

  test('un archivo que no es JSON se rehúsa con la ruta', async () => {
    const path = join(WORKDIR, 'not-json.json')
    writeFileSync(path, 'nope')
    await expect(loadQualifications(path)).rejects.toThrow(path)
  })

  test('añadir sobre un archivo inválido no lo pisa', async () => {
    const path = join(WORKDIR, 'broken-append.json')
    writeFileSync(path, 'nope')
    await expect(appendQualification(path, QUALIFICATION)).rejects.toThrow(QualificationFileError)
    expect(readFileSync(path, 'utf8')).toBe('nope')
  })
})
