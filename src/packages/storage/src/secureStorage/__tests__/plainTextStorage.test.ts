import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { NodeFsOperations, setFsImplementation, setOriginalFsImplementation } from '../../fsOperations.js'
import { plainTextStorage } from '../plainTextStorage.js'

let dir: string
let originalConfigDir: string | undefined

function useTmpConfigDir(): void {
  dir = mkdtempSync(join(tmpdir(), 'plaintextstorage-test-'))
  process.env.CLAUDE_CONFIG_DIR = dir
}

afterEach(() => {
  if (originalConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = originalConfigDir
  if (dir) rmSync(dir, { recursive: true, force: true })
  setOriginalFsImplementation()
})

describe('plainTextStorage.read / readAsync', () => {
  test('sin archivo de credenciales, read() devuelve null', () => {
    originalConfigDir = process.env.CLAUDE_CONFIG_DIR
    useTmpConfigDir()
    expect(plainTextStorage.read()).toBeNull()
  })

  test('sin archivo de credenciales, readAsync() devuelve null', async () => {
    originalConfigDir = process.env.CLAUDE_CONFIG_DIR
    useTmpConfigDir()
    expect(await plainTextStorage.readAsync()).toBeNull()
  })
})

describe('plainTextStorage.update / read / delete — ciclo completo', () => {
  test('update() crea el directorio de config, escribe con permisos 0o600, y read() lo recupera', () => {
    originalConfigDir = process.env.CLAUDE_CONFIG_DIR
    useTmpConfigDir()
    const result = plainTextStorage.update({ token: 'sk-ant-xyz' })
    expect(result).toEqual({
      success: true,
      warning: 'Warning: Storing credentials in plaintext.',
    })

    const storagePath = join(dir, '.credentials.json')
    const mode = statSync(storagePath).mode & 0o777
    expect(mode).toBe(0o600)

    expect(plainTextStorage.read()).toEqual({ token: 'sk-ant-xyz' })
  })

  test('readAsync() recupera lo mismo que update() escribio', async () => {
    originalConfigDir = process.env.CLAUDE_CONFIG_DIR
    useTmpConfigDir()
    plainTextStorage.update({ token: 'async-token' })
    expect(await plainTextStorage.readAsync()).toEqual({ token: 'async-token' })
  })

  test('update() es idempotente si el directorio de config ya existe', () => {
    originalConfigDir = process.env.CLAUDE_CONFIG_DIR
    useTmpConfigDir()
    plainTextStorage.update({ a: 1 })
    const second = plainTextStorage.update({ a: 2 })
    expect(second.success).toBe(true)
    expect(plainTextStorage.read()).toEqual({ a: 2 })
  })

  test('delete() borra el archivo y read() posterior devuelve null', () => {
    originalConfigDir = process.env.CLAUDE_CONFIG_DIR
    useTmpConfigDir()
    plainTextStorage.update({ token: 'x' })
    expect(plainTextStorage.delete()).toBe(true)
    expect(plainTextStorage.read()).toBeNull()
  })

  test('delete() sobre un archivo YA ausente (ENOENT) devuelve true, no false', () => {
    originalConfigDir = process.env.CLAUDE_CONFIG_DIR
    useTmpConfigDir()
    expect(plainTextStorage.delete()).toBe(true)
  })
})

describe('plainTextStorage — ramas de error', () => {
  test('update() ante un mkdirSync que falla con algo distinto de EEXIST devuelve success:false', () => {
    originalConfigDir = process.env.CLAUDE_CONFIG_DIR
    useTmpConfigDir()
    setFsImplementation({
      ...NodeFsOperations,
      mkdirSync(): never {
        const err = new Error('EACCES') as NodeJS.ErrnoException
        err.code = 'EACCES'
        throw err
      },
    })
    expect(plainTextStorage.update({ x: 1 })).toEqual({ success: false })
  })

  test('delete() ante un unlinkSync que falla con algo distinto de ENOENT devuelve false', () => {
    originalConfigDir = process.env.CLAUDE_CONFIG_DIR
    useTmpConfigDir()
    plainTextStorage.update({ x: 1 })
    setFsImplementation({
      ...NodeFsOperations,
      unlinkSync(): never {
        const err = new Error('EACCES') as NodeJS.ErrnoException
        err.code = 'EACCES'
        throw err
      },
    })
    expect(plainTextStorage.delete()).toBe(false)
  })
})
