// Contrato de `P0` del binario 2.1.275: el userID de la config si es valido
// (64 hex), si no el ya generado en la sesion, si no uno nuevo de 32 bytes
// aleatorios en hex que se persiste en la config global.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  _resetGeneratedUserIDForTesting,
  getOrCreateUserID,
} from '../global/config.ts'
import { installConfigHostBindings } from '../host.ts'

const VALID = 'a'.repeat(64)
const dirs: string[] = []

function configFile(content: object): string {
  const dir = mkdtempSync(join(tmpdir(), 'userid-'))
  dirs.push(dir)
  const file = join(dir, '.claude.json')
  writeFileSync(file, JSON.stringify(content))
  return file
}

beforeEach(() => {
  installConfigHostBindings({})
})

afterEach(() => {
  _resetGeneratedUserIDForTesting()
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('getOrCreateUserID', () => {
  test('devuelve el userID de la config si son 64 hex', () => {
    expect(getOrCreateUserID(configFile({ userID: VALID }))).toBe(VALID)
  })

  test('uno invalido no se usa: genera 64 hex y lo persiste', () => {
    const file = configFile({ userID: 'no-es-hex' })
    const id = getOrCreateUserID(file)
    expect(id).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.parse(readFileSync(file, 'utf8')).userID).toBe(id)
  })

  test('dentro de la sesion, el generado se reutiliza', () => {
    const first = getOrCreateUserID(configFile({}))
    expect(getOrCreateUserID(configFile({}))).toBe(first)
  })

  test('un userID valido en la config gana al generado de la sesion', () => {
    getOrCreateUserID(configFile({}))
    expect(getOrCreateUserID(configFile({ userID: VALID }))).toBe(VALID)
  })
})
