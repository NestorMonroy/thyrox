/**
 * El directorio de sockets del buzón: `Re`, `Te`, `De`, `fn`, `se`, `dn` de
 * 2.1.283 (`chunk-yg53q7yp.js`), con `an` (`chunk-tp36n59y.js`) y `qr`
 * (`chunk-0qxzxz5e.js`). Directorios reales en un temporal propio.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { sanitizeForDisplay, shellQuote } from '../src/uds/displayText.ts'
import {
  SocketsDirError,
  canFallBackToPerUid,
  prepareSocketsDirectory,
  refusedComponentDetail,
  socketsDirHint,
  type SocketsDirDeps,
} from '../src/uds/socketsDir.ts'

const dirs: string[] = []
function tempDir(): string {
  const dir = mkdtempSync('/tmp/uds-dir-')
  chmodSync(dir, 0o700)
  dirs.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const OWN = process.getuid?.() ?? 0
function deps(overrides: Partial<SocketsDirDeps> = {}): SocketsDirDeps {
  return {
    getuid: () => OWN,
    getgid: () => process.getgid?.() ?? 0,
    probeNamespace: async () => undefined,
    env: {},
    ...overrides,
  }
}
async function kindOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (error) {
    return error instanceof SocketsDirError ? error.kind : `otro: ${String(error)}`
  }
}

describe('sanitizeForDisplay (an) y shellQuote (qr)', () => {
  test('quita secuencias ANSI y controles, normaliza a NFC y trunca con elipsis', () => {
    expect(sanitizeForDisplay('\x1b[31mrojo\x1b[0m')).toBe('rojo')
    expect(sanitizeForDisplay('a\u0000b c')).toBe('a b c')
    expect(sanitizeForDisplay('é')).toBe('é')
    expect(sanitizeForDisplay('`x`')).toBe("'x'")
    expect(sanitizeForDisplay('x'.repeat(200), 160)).toBe(`${'x'.repeat(160)}…`)
  })

  test('comillas de shell sólo cuando hacen falta', () => {
    expect(shellQuote(['/tmp/a', ''])).toBe("/tmp/a ''")
    expect(shellQuote(["a b'c"])).toBe(`'a b'"'"'c'`)
  })
})

describe('prepareSocketsDirectory (Re)', () => {
  test('crea el directorio con modo 0700', async () => {
    const dir = join(tempDir(), 'cc-socks')
    await prepareSocketsDirectory(dir, deps())
    expect(statSync(dir).mode & 0o777).toBe(0o700)
  })

  test('cierra a 0700 un directorio propio que estaba abierto', async () => {
    const dir = join(tempDir(), 'cc-socks')
    mkdirSync(dir, { mode: 0o755 })
    chmodSync(dir, 0o755)
    await prepareSocketsDirectory(dir, deps())
    expect(statSync(dir).mode & 0o777).toBe(0o700)
  })

  test('una ruta relativa es un error interno', async () => {
    expect(await kindOf(prepareSocketsDirectory('rel/cc-socks', deps()))).toBe('internal')
  })

  test('un enlace o un archivo en lugar del directorio se rehúsan', async () => {
    const base = tempDir()
    const target = join(base, 'real')
    mkdirSync(target)
    symlinkSync(target, join(base, 'enlace'))
    const linkError = await prepareSocketsDirectory(join(base, 'enlace'), deps()).then(() => undefined, (e: unknown) => e)
    expect((linkError as SocketsDirError).kind).toBe('leaf_shape')
    expect((linkError as SocketsDirError).message).toContain('is a symlink')
    writeFileSync(join(base, 'archivo'), '')
    expect(await kindOf(prepareSocketsDirectory(join(base, 'archivo'), deps()))).toBe('leaf_shape')
  })

  test('un directorio de otro dueño se rehúsa', async () => {
    const dir = join(tempDir(), 'cc-socks')
    mkdirSync(dir, { mode: 0o700 })
    expect(await kindOf(prepareSocketsDirectory(dir, deps({ getuid: () => OWN + 4242 })))).toBe('foreign_owner')
  })

  test('un ancestro escribible por todos sin sticky se rehúsa; con sticky, no', async () => {
    const base = tempDir()
    const shared = join(base, 'compartido')
    mkdirSync(shared)
    chmodSync(shared, 0o777)
    expect(await kindOf(prepareSocketsDirectory(join(shared, 'cc-socks'), deps()))).toBe('directory_rule')
    // fs.chmod de Bun descarta el sticky bit (H-THYROX-240); se pone con el binario.
    expect(Bun.spawnSync(['chmod', '1777', shared]).exitCode).toBe(0)
    expect(await kindOf(prepareSocketsDirectory(join(shared, 'cc-socks'), deps()))).toBeUndefined()
  })

  test('un ancestro escribible por el grupo sólo vale si el grupo es el propio uid', async () => {
    const base = tempDir()
    const group = join(base, 'grupo')
    mkdirSync(group)
    chmodSync(group, 0o770)
    const gid = statSync(group).gid
    expect(await kindOf(prepareSocketsDirectory(join(group, 'a'), deps({ getgid: () => gid + 7 })))).toBe('directory_rule')
    if (gid === OWN) expect(await kindOf(prepareSocketsDirectory(join(group, 'b'), deps({ getgid: () => gid })))).toBeUndefined()
  })

  test('los uid colapsados impiden verificar', async () => {
    const dir = join(tempDir(), 'cc-socks')
    const collapsed = deps({ probeNamespace: async () => ({ unmappedOwnerUid: undefined, uidCollapses: true, rootUidAmbiguous: false }) })
    expect(await kindOf(prepareSocketsDirectory(dir, collapsed))).toBe('uid_collapse')
  })

  test('un ancestro que es un enlace sin destino se declara colgante', async () => {
    const base = tempDir()
    symlinkSync(join(base, 'no-existe'), join(base, 'colgante'))
    expect(await kindOf(prepareSocketsDirectory(join(base, 'colgante', 'cc-socks'), deps()))).toBe('dangling_link')
  })

  test('un bucle de enlaces se declara bucle', async () => {
    const base = tempDir()
    symlinkSync(join(base, 'b'), join(base, 'a'))
    symlinkSync(join(base, 'a'), join(base, 'b'))
    expect(await kindOf(prepareSocketsDirectory(join(base, 'a', 'cc-socks'), deps()))).toBe('symlink_loop')
  })

  test('un archivo en medio del camino deja pasar ENOTDIR, que la pista y el respaldo reconocen', async () => {
    const base = tempDir()
    writeFileSync(join(base, 'archivo'), '')
    const error = await prepareSocketsDirectory(join(base, 'archivo', 'sub', 'cc-socks'), deps()).then(() => undefined, (e: unknown) => e)
    expect((error as NodeJS.ErrnoException).code).toBe('ENOTDIR')
    expect(socketsDirHint(error)).toContain('not a directory')
    expect(canFallBackToPerUid(error)).toBe(true)
  })

  test('un archivo como padre directo es un componente que no es directorio', async () => {
    const base = tempDir()
    writeFileSync(join(base, 'archivo'), '')
    expect(await kindOf(prepareSocketsDirectory(join(base, 'archivo', 'cc-socks'), deps()))).toBe('not_directory')
  })
})

describe('mensajes: canFallBackToPerUid (fn), socketsDirHint (De), refusedComponentDetail (Te)', () => {
  test('las reglas de directorio admiten el respaldo por uid; el bucle y el colapso, no', () => {
    expect(canFallBackToPerUid(new SocketsDirError('directory_rule', 'x'))).toBe(true)
    expect(canFallBackToPerUid(new SocketsDirError('symlink_loop', 'x'))).toBe(false)
    expect(canFallBackToPerUid(Object.assign(new Error('x'), { code: 'EACCES' }))).toBe(true)
    expect(canFallBackToPerUid(Object.assign(new Error('x'), { code: 'EIO' }))).toBe(false)
  })

  test('la pista nombra las variables de thyrox', () => {
    expect(socketsDirHint(new SocketsDirError('foreign_owner', 'x'))).toContain('THYROX_CODE_TMPDIR')
    expect(socketsDirHint(Object.assign(new Error('x'), { code: 'ENOENT' }))).toContain('does not exist')
  })

  test('el detalle de un directorio compartido sugiere el chmod exacto', () => {
    const error = new SocketsDirError('directory_rule', 'x', { path: '/srv/tmp', uid: 0, gid: 0, mode: 0o777 })
    expect(refusedComponentDetail(error)).toBe("'/srv/tmp' is world-writable without the sticky bit (owner 0:0, mode 0777) — chmod o-w /srv/tmp (or chmod +t), or pass --messaging-socket-path")
  })

  test('con caracteres que no se pueden citar, no sugiere un comando', () => {
    const error = new SocketsDirError('directory_rule', 'x', { path: '/srv/a$b', uid: 0, gid: 0, mode: 0o777 })
    expect(refusedComponentDetail(error)).toBe("'/srv/a?b' is world-writable without the sticky bit (owner 0:0, mode 0777) — clear its other-write bit (or chmod +t), or pass --messaging-socket-path")
  })
})
