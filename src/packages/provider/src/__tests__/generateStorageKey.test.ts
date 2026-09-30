/**
 * `bin/generateStorageKey.ts`: genera `THYROX_STORAGE_ENCRYPTION_KEY` y la
 * añade a un `.env`, sin rotar una clave ya declarada — rotarla dejaría
 * huérfanas las conexiones que esa clave ya cifró.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Database } from 'bun:sqlite'

import { createFieldCipher, STORAGE_KEY_VARIABLE } from '../accounts/fieldCipher.ts'
import { main } from '../../bin/generateStorageKey.ts'

function tmpEnvDir(): string {
  return mkdtempSync(join(tmpdir(), 'generate-storage-key-'))
}

/** Captura stdout/stderr sin tocar el terminal de la suite. */
async function run(argv: string[], deps?: Parameters<typeof main>[1]) {
  const out: string[] = []
  const err: string[] = []
  const so = process.stdout.write.bind(process.stdout)
  const se = process.stderr.write.bind(process.stderr)
  process.stdout.write = ((s: string) => { out.push(String(s)); return true }) as typeof process.stdout.write
  process.stderr.write = ((s: string) => { err.push(String(s)); return true }) as typeof process.stderr.write
  try {
    const code = await main(argv, deps)
    return { code, out: out.join(''), err: err.join('') }
  } finally {
    process.stdout.write = so
    process.stderr.write = se
  }
}

const dirsToClean: string[] = []
const inheritedRoot = process.env.THYROX_ROOT
afterEach(() => {
  if (inheritedRoot === undefined) delete process.env.THYROX_ROOT
  else process.env.THYROX_ROOT = inheritedRoot
  while (dirsToClean.length) rmSync(dirsToClean.pop()!, { recursive: true, force: true })
})

describe('escribe una clave nueva', () => {
  test('en un .env que aún no existe, y nunca la imprime', async () => {
    const dir = tmpEnvDir()
    dirsToClean.push(dir)
    const envFile = join(dir, '.env')

    const { code, out, err } = await run(['--env-file', envFile])

    expect(code).toBe(0)
    const written = readFileSync(envFile, 'utf8')
    const match = written.match(new RegExp(`^${STORAGE_KEY_VARIABLE}=([0-9a-f]+)$`, 'm'))
    expect(match).not.toBeNull()
    const key = match![1]!
    expect(key.length).toBeGreaterThanOrEqual(32)
    expect(out).not.toContain(key)
    expect(err).not.toContain(key)
  })

  test('la añade a un .env que ya tiene otras variables, conservándolas', async () => {
    const dir = tmpEnvDir()
    dirsToClean.push(dir)
    const envFile = join(dir, '.env')
    writeFileSync(envFile, 'OTHER_VAR=hello\n')

    const { code } = await run(['--env-file', envFile])

    expect(code).toBe(0)
    const written = readFileSync(envFile, 'utf8')
    expect(written).toContain('OTHER_VAR=hello')
    expect(written).toMatch(new RegExp(`${STORAGE_KEY_VARIABLE}=[0-9a-f]+`))
  })

  test('completa la variable si está declarada en blanco', async () => {
    const dir = tmpEnvDir()
    dirsToClean.push(dir)
    const envFile = join(dir, '.env')
    writeFileSync(envFile, `${STORAGE_KEY_VARIABLE}=\n`)

    const { code } = await run(['--env-file', envFile])

    expect(code).toBe(0)
    const written = readFileSync(envFile, 'utf8')
    const declarations = written.split('\n').filter(line => line.startsWith(`${STORAGE_KEY_VARIABLE}=`))
    expect(declarations).toHaveLength(1)
    expect(declarations[0]).toMatch(new RegExp(`^${STORAGE_KEY_VARIABLE}=[0-9a-f]+$`))
  })

  test('completa la declaración en blanco en su sitio, sin mover las demás líneas', async () => {
    const dir = tmpEnvDir()
    dirsToClean.push(dir)
    const envFile = join(dir, '.env')
    writeFileSync(envFile, `FIRST=1\n${STORAGE_KEY_VARIABLE}=\nLAST=2\n`)

    const { code } = await run(['--env-file', envFile])

    expect(code).toBe(0)
    const lines = readFileSync(envFile, 'utf8').split('\n')
    expect(lines[0]).toBe('FIRST=1')
    expect(lines[1]).toMatch(new RegExp(`^${STORAGE_KEY_VARIABLE}=[0-9a-f]+$`))
    expect(lines[2]).toBe('LAST=2')
  })
})

describe('rehúsa rotar una clave existente', () => {
  test('con código distinto de 0, deja el archivo intacto y no imprime la clave', async () => {
    const dir = tmpEnvDir()
    dirsToClean.push(dir)
    const envFile = join(dir, '.env')
    const before = `${STORAGE_KEY_VARIABLE}=ya-declarada-antes\n`
    writeFileSync(envFile, before)

    const { code, out, err } = await run(['--env-file', envFile])

    expect(code).not.toBe(0)
    expect(readFileSync(envFile, 'utf8')).toBe(before)
    expect(out).not.toContain('ya-declarada-antes')
    expect(err).not.toContain('ya-declarada-antes')
  })
})

describe('--env-file por defecto', () => {
  test('sin --env-file usa el .env de la raíz del árbol (THYROX_ROOT)', async () => {
    const dir = tmpEnvDir()
    dirsToClean.push(dir)
    process.env.THYROX_ROOT = dir

    const { code } = await run([])

    expect(code).toBe(0)
    const written = readFileSync(join(dir, '.env'), 'utf8')
    expect(written).toMatch(new RegExp(`${STORAGE_KEY_VARIABLE}=[0-9a-f]+`))
  })
})

describe('--env-file sin valor', () => {
  test('rehúsa con código 2', async () => {
    const { code, err } = await run(['--env-file'])
    expect(code).toBe(2)
    expect(err).toContain('--env-file')
  })
})

describe('el entorno de la suite', () => {
  test('restaura el THYROX_ROOT heredado en vez de borrarlo', () => {
    // Este caso corre después del que fija THYROX_ROOT a un temporal: el
    // afterEach tiene que haber devuelto el valor con que arrancó la suite.
    expect(process.env.THYROX_ROOT).toBe(inheritedRoot)
  })
})

describe('--rotate', () => {
  const OLD_KEY = 'a'.repeat(64)
  const inheritedDataDir = process.env.THYROX_PROVIDERS_DATA_DIR
  afterEach(() => {
    if (inheritedDataDir === undefined) delete process.env.THYROX_PROVIDERS_DATA_DIR
    else process.env.THYROX_PROVIDERS_DATA_DIR = inheritedDataDir
  })

  /** Un `.env` con la clave anterior y un store con una credencial que ella cifró. */
  function fixture() {
    const dir = tmpEnvDir()
    dirsToClean.push(dir)
    const envFile = join(dir, '.env')
    writeFileSync(envFile, `OTRA=1\n${STORAGE_KEY_VARIABLE}=${OLD_KEY}\nFIN=2\n`)
    process.env.THYROX_PROVIDERS_DATA_DIR = dir
    const db = new Database(join(dir, 'connections.sqlite3'))
    db.run('CREATE TABLE provider_connections (id TEXT PRIMARY KEY, api_key TEXT, access_token TEXT, refresh_token TEXT, id_token TEXT)')
    const stored = createFieldCipher(OLD_KEY, () => {}).encrypt('sk-guardada') as string
    db.query('INSERT INTO provider_connections (id, api_key) VALUES (?, ?)').run('c1', stored)
    db.close()
    return { dir, envFile }
  }

  function storedApiKey(dir: string): string | null {
    const db = new Database(join(dir, 'connections.sqlite3'), { readonly: true })
    const row = db.query('SELECT api_key FROM provider_connections WHERE id = ?').get('c1') as { api_key: string | null }
    db.close()
    return row.api_key
  }

  function declaredKey(envFile: string): string | undefined {
    return readFileSync(envFile, 'utf8').match(new RegExp(`^${STORAGE_KEY_VARIABLE}=(.*)$`, 'm'))?.[1]
  }

  test('reemplaza la clave en su sitio, recifra el store y no imprime ninguna clave', async () => {
    const { dir, envFile } = fixture()

    const { code, out, err } = await run(['--rotate', '--env-file', envFile])

    expect(code).toBe(0)
    const next = declaredKey(envFile)!
    expect(next).not.toBe(OLD_KEY)
    expect(readFileSync(envFile, 'utf8')).toBe(`OTRA=1\n${STORAGE_KEY_VARIABLE}=${next}\nFIN=2\n`)
    expect(createFieldCipher(next, () => {}).decrypt(storedApiKey(dir))).toBe('sk-guardada')
    expect(createFieldCipher(OLD_KEY, () => {}).decrypt(storedApiKey(dir))).toBeNull()
    for (const text of [out, err]) {
      expect(text).not.toContain(next)
      expect(text).not.toContain(OLD_KEY)
    }
  })

  test('sin clave declarada no hay nada que rotar: sale 1 y no escribe', async () => {
    const dir = tmpEnvDir()
    dirsToClean.push(dir)
    const envFile = join(dir, '.env')
    writeFileSync(envFile, 'OTRA=1\n')

    const { code, err } = await run(['--rotate', '--env-file', envFile])

    expect(code).toBe(1)
    expect(err).toContain(STORAGE_KEY_VARIABLE)
    expect(readFileSync(envFile, 'utf8')).toBe('OTRA=1\n')
  })

  test('si el store rehúsa, el .env queda intacto', async () => {
    const { dir, envFile } = fixture()
    const db = new Database(join(dir, 'connections.sqlite3'))
    const foreign = createFieldCipher('otra-clave', () => {}).encrypt('x') as string
    db.query('INSERT INTO provider_connections (id, access_token) VALUES (?, ?)').run('c2', foreign)
    db.close()
    const before = readFileSync(envFile, 'utf8')

    const { code, err } = await run(['--rotate', '--env-file', envFile])

    expect(code).toBe(1)
    expect(err).toContain('c2')
    expect(readFileSync(envFile, 'utf8')).toBe(before)
    expect(createFieldCipher(OLD_KEY, () => {}).decrypt(storedApiKey(dir))).toBe('sk-guardada')
  })

  test('si no se puede publicar el .env nuevo, devuelve el store a la clave anterior', async () => {
    const { dir, envFile } = fixture()
    const before = readFileSync(envFile, 'utf8')

    const { code } = await run(['--rotate', '--env-file', envFile], {
      rename: () => {
        throw new Error('rename denegado')
      },
    })

    expect(code).toBe(2)
    expect(readFileSync(envFile, 'utf8')).toBe(before)
    expect(createFieldCipher(OLD_KEY, () => {}).decrypt(storedApiKey(dir))).toBe('sk-guardada')
  })

  test('sin store todavía, sólo reemplaza la clave', async () => {
    const dir = tmpEnvDir()
    dirsToClean.push(dir)
    const envFile = join(dir, '.env')
    writeFileSync(envFile, `${STORAGE_KEY_VARIABLE}=${OLD_KEY}\n`)
    process.env.THYROX_PROVIDERS_DATA_DIR = join(dir, 'sin-store')

    const { code } = await run(['--rotate', '--env-file', envFile])

    expect(code).toBe(0)
    expect(declaredKey(envFile)).not.toBe(OLD_KEY)
  })
})
