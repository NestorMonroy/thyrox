/**
 * La ruta de `--messaging-socket-path`: `G1o` de 2.1.283 (`chunk-yg53q7yp.js`)
 * y `CliUserError` (`_m`, `chunk-ern0s5ks.js`).
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { chmodSync, chownSync, mkdirSync, mkdtempSync, rmSync, statSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'

import { CliUserError } from '../src/errorHelpers.ts'
import { validateExplicitSocketPath } from '../src/uds/explicitSocketPath.ts'

const dirs: string[] = []
function tempDir(): string {
  const dir = mkdtempSync('/tmp/uds-exp-')
  chmodSync(dir, 0o700)
  dirs.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})
const OWN = process.getuid?.() ?? 0
const deps = (uid = OWN) => ({ getuid: () => uid })

async function refusal(path: string, uid = OWN): Promise<string> {
  try {
    await validateExplicitSocketPath(path, deps(uid))
    return 'aceptada'
  } catch (error) {
    expect(error).toBeInstanceOf(CliUserError)
    expect((error as Error).name).toBe('CliUserError')
    return (error as Error).message
  }
}

describe('validateExplicitSocketPath (G1o): forma de la ruta', () => {
  test('vacía, relativa, con .. o sin nombre de archivo', async () => {
    expect(await refusal('')).toContain('was given an empty value')
    expect(await refusal('rel/x.sock')).toContain('must be an absolute path')
    expect(await refusal('/tmp/a/../x.sock')).toContain("must not contain '..' segments")
    expect(await refusal('/tmp/a/')).toContain('must name a socket file inside a directory')
    expect(await refusal('/tmp/a/.')).toContain('must name a socket file inside a directory')
  })

  test('una ruta UNC no es local', async () => {
    expect(await refusal('//server/share/x.sock')).toContain('must be a local socket path')
  })

  test('una ruta de más de 103 bytes no cabe en un socket Unix', async () => {
    expect(await refusal(`/${'d'.repeat(110)}/x.sock`)).toContain('is too long for a Unix socket')
  })
})

describe('validateExplicitSocketPath (G1o): el directorio', () => {
  test('un directorio privado propio devuelve la ruta normalizada', async () => {
    const dir = tempDir()
    expect(await validateExplicitSocketPath(`${dir}//x.sock`, deps())).toBe(join(dir, 'x.sock'))
  })

  test('un directorio que no existe se crea con modo 0700', async () => {
    const dir = join(tempDir(), 'a', 'b')
    await validateExplicitSocketPath(join(dir, 'x.sock'), deps())
    expect(statSync(dir).mode & 0o777).toBe(0o700)
    expect(statSync(join(dir, '..')).mode & 0o777).toBe(0o700)
  })

  test('un directorio abierto, ajeno o enlazado se rehúsa', async () => {
    const base = tempDir()
    const open = join(base, 'abierto')
    mkdirSync(open, { mode: 0o755 })
    chmodSync(open, 0o755)
    expect(await refusal(join(open, 'x.sock'))).toContain('is not private (mode 755)')
    expect(await refusal(join(base, 'x.sock'), OWN + 4242)).toContain('is not owned by you')
    symlinkSync(open, join(base, 'enlace'))
    expect(await refusal(join(base, 'enlace', 'x.sock'))).toContain('must be a real directory, not a symlink')
  })

  test('no crea el directorio dentro de un ancestro de otro usuario', async () => {
    const base = tempDir()
    const foreign = join(base, 'ajeno')
    mkdirSync(foreign, { mode: 0o755 })
    chownSync(foreign, OWN + 4242, OWN + 4242)
    expect(await refusal(join(foreign, 'nuevo', 'x.sock'))).toContain('owned by another user')
  })
})
