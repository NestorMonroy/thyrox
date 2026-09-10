import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  clearCwdEnvFiles,
  getHookEnvFilePath,
  getSessionEnvDirPath,
  getSessionEnvironmentScript,
  invalidateSessionEnvCache,
  setGetPlatformFn,
} from '../sessionEnvironment.js'
import { setSessionId } from '../sessionPaths.js'

let configDir: string
const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR
const ORIGINAL_ENV_FILE = process.env.CLAUDE_ENV_FILE

beforeEach(async () => {
  configDir = await mkdtemp(join(tmpdir(), 'session-environment-'))
  process.env.CLAUDE_CONFIG_DIR = configDir
  delete process.env.CLAUDE_ENV_FILE
  setSessionId('sesion-env-1')
  setGetPlatformFn(() => 'linux')
  invalidateSessionEnvCache()
})

afterEach(async () => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR
  if (ORIGINAL_ENV_FILE === undefined) delete process.env.CLAUDE_ENV_FILE
  else process.env.CLAUDE_ENV_FILE = ORIGINAL_ENV_FILE
  setGetPlatformFn(() => 'linux')
  invalidateSessionEnvCache()
  await rm(configDir, { recursive: true, force: true })
})

describe('getSessionEnvDirPath', () => {
  test('crea y devuelve session-env/<sessionId>/', async () => {
    const dir = await getSessionEnvDirPath()
    expect(dir).toBe(join(configDir, 'session-env', 'sesion-env-1'))
    const stat = await import('fs/promises').then(fs => fs.stat(dir))
    expect(stat.isDirectory()).toBe(true)
  })
})

describe('getHookEnvFilePath', () => {
  test('nombra el archivo en minúsculas con el índice de hook', async () => {
    const path = await getHookEnvFilePath('SessionStart', 3)
    expect(path).toBe(
      join(configDir, 'session-env', 'sesion-env-1', 'sessionstart-hook-3.sh'),
    )
  })
})

describe('clearCwdEnvFiles', () => {
  test('vacía sólo los archivos filechanged/cwdchanged, deja setup/sessionstart intactos', async () => {
    const dir = await getSessionEnvDirPath()
    await writeFile(join(dir, 'filechanged-hook-0.sh'), 'export A=1')
    await writeFile(join(dir, 'cwdchanged-hook-1.sh'), 'export B=2')
    await writeFile(join(dir, 'setup-hook-0.sh'), 'export C=3')

    await clearCwdEnvFiles()

    expect(await readFile(join(dir, 'filechanged-hook-0.sh'), 'utf8')).toBe('')
    expect(await readFile(join(dir, 'cwdchanged-hook-1.sh'), 'utf8')).toBe('')
    expect(await readFile(join(dir, 'setup-hook-0.sh'), 'utf8')).toBe(
      'export C=3',
    )
  })

  test('sin directorio de sesión, no lanza', async () => {
    await expect(clearCwdEnvFiles()).resolves.toBeUndefined()
  })
})

describe('getSessionEnvironmentScript', () => {
  test('en Windows, devuelve null sin tocar disco', async () => {
    setGetPlatformFn(() => 'windows')
    expect(await getSessionEnvironmentScript()).toBeNull()
  })

  test('sin ningún script, devuelve null y cachea el resultado', async () => {
    expect(await getSessionEnvironmentScript()).toBeNull()
  })

  test('junta CLAUDE_ENV_FILE + los .sh de hook, en orden de prioridad y no por índice puro', async () => {
    const envFile = join(configDir, 'env-padre.sh')
    await writeFile(envFile, 'export FROM_PARENT=1')
    process.env.CLAUDE_ENV_FILE = envFile

    const dir = await getSessionEnvDirPath()
    // Fuera de orden a propósito: cwdchanged-hook-0 antes que
    // sessionstart-hook-0 y setup-hook-9 — la prioridad de TIPO manda
    // sobre el orden alfabético del nombre de archivo.
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'cwdchanged-hook-0.sh'), 'export CWD=1')
    await writeFile(join(dir, 'sessionstart-hook-0.sh'), 'export START=1')
    await writeFile(join(dir, 'setup-hook-9.sh'), 'export SETUP=1')

    const script = await getSessionEnvironmentScript()
    expect(script).toBe(
      [
        'export FROM_PARENT=1',
        'export SETUP=1',
        'export START=1',
        'export CWD=1',
      ].join('\n'),
    )
  })

  test('un archivo de hook vacío no aporta línea', async () => {
    const dir = await getSessionEnvDirPath()
    await writeFile(join(dir, 'setup-hook-0.sh'), '   \n  ')
    expect(await getSessionEnvironmentScript()).toBeNull()
  })

  test('está cacheado — un archivo escrito DESPUÉS de la primera llamada no aparece sin invalidar', async () => {
    expect(await getSessionEnvironmentScript()).toBeNull()

    const dir = await getSessionEnvDirPath()
    await writeFile(join(dir, 'setup-hook-0.sh'), 'export TARDE=1')

    expect(await getSessionEnvironmentScript()).toBeNull()

    invalidateSessionEnvCache()
    expect(await getSessionEnvironmentScript()).toBe('export TARDE=1')
  })

  test('ordena por índice numérico dentro del mismo tipo de hook (10 después de 2, no antes)', async () => {
    const dir = await getSessionEnvDirPath()
    await writeFile(join(dir, 'setup-hook-10.sh'), 'export DIEZ=1')
    await writeFile(join(dir, 'setup-hook-2.sh'), 'export DOS=1')

    const script = await getSessionEnvironmentScript()
    expect(script).toBe(['export DOS=1', 'export DIEZ=1'].join('\n'))
  })
})
