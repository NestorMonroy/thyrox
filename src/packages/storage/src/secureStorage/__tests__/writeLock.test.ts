/**
 * Puerto de `fWr` (`chunk-mmqkf96q.js`, 2.1.283): el candado de escritura
 * del almacén de credenciales toma un candado de archivo entre procesos
 * (`Ci`, proper-lockfile) sobre `<configHome>/.storage-write`, además de
 * serializar dentro del proceso. Aquí se mide el candado de archivo: que
 * exista mientras corre la tarea, que espere a otro poseedor, que cree el
 * directorio y que sea reentrante.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { lock } from '../../lockfile.js'
import { withWriteLock, WRITE_LOCK_FILE_NAME } from '../credentialStoreInternals.js'

let dir: string
let originalConfigDir: string | undefined

function useTmpConfigDir(): string {
  originalConfigDir = process.env.THYROX_CONFIG_DIR
  dir = mkdtempSync(join(tmpdir(), 'writelock-test-'))
  process.env.THYROX_CONFIG_DIR = dir
  return dir
}

function lockPathOf(configDir: string): string {
  return `${join(configDir, WRITE_LOCK_FILE_NAME)}.lock`
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

afterEach(() => {
  if (originalConfigDir === undefined) delete process.env.THYROX_CONFIG_DIR
  else process.env.THYROX_CONFIG_DIR = originalConfigDir
  if (dir) rmSync(dir, { recursive: true, force: true })
})

describe('withWriteLock (fWr): candado de archivo entre procesos', () => {
  test('el candado existe mientras corre la tarea y desaparece al terminar', async () => {
    const configDir = useTmpConfigDir()

    const heldDuringTask = await withWriteLock(async () => existsSync(lockPathOf(configDir)))

    expect(heldDuringTask).toBe(true)
    expect(existsSync(lockPathOf(configDir))).toBe(false)
  })

  test('espera a un poseedor ajeno del mismo candado en vez de correr a la vez', async () => {
    const configDir = useTmpConfigDir()
    const release = await lock(join(configDir, WRITE_LOCK_FILE_NAME), { realpath: false })
    let ran = false

    const pending = withWriteLock(async () => {
      ran = true
    })
    await sleep(150)
    const ranWhileHeld = ran
    await release()
    await pending

    expect(ranWhileHeld).toBe(false)
    expect(ran).toBe(true)
  })

  test('crea el directorio de configuración si no existe antes de tomar el candado', async () => {
    const configDir = join(useTmpConfigDir(), 'nested', 'home')
    process.env.THYROX_CONFIG_DIR = configDir

    await withWriteLock(async () => undefined)

    expect(existsSync(configDir)).toBe(true)
  })

  test('es reentrante: una llamada anidada corre sin volver a tomar el candado', async () => {
    useTmpConfigDir()

    const nested = await withWriteLock(() => withWriteLock(async () => 'inner'))

    expect(nested).toBe('inner')
  })
})
