/**
 * `bin/generateStorageKey.ts`: genera `THYROX_STORAGE_ENCRYPTION_KEY` y la
 * añade a un `.env`, sin rotar una clave ya declarada — rotarla dejaría
 * huérfanas las conexiones que esa clave ya cifró.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { STORAGE_KEY_VARIABLE } from '../accounts/fieldCipher.ts'
import { main } from '../../bin/generateStorageKey.ts'

function tmpEnvDir(): string {
  return mkdtempSync(join(tmpdir(), 'generate-storage-key-'))
}

/** Captura stdout/stderr sin tocar el terminal de la suite. */
async function run(argv: string[]) {
  const out: string[] = []
  const err: string[] = []
  const so = process.stdout.write.bind(process.stdout)
  const se = process.stderr.write.bind(process.stderr)
  process.stdout.write = ((s: string) => { out.push(String(s)); return true }) as typeof process.stdout.write
  process.stderr.write = ((s: string) => { err.push(String(s)); return true }) as typeof process.stderr.write
  try {
    const code = await main(argv)
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
