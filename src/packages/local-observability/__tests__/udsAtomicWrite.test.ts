/**
 * La escritura atómica con modo que el buzón usa para publicar su llave:
 * `An`, `Jne`, `Kx`, `kA`, `j`, `XL`, `R`, `We`, `Ye` y el conjunto `XS`
 * (`chunk-797phdpb.js`) de 2.1.283.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { chmodSync, lstatSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { IN_PLACE_FALLBACK_CODES, isTempNameFor, PublishRefusedError, tempNameFor, writeFileAtomicWithMode } from '../src/uds/atomicWrite.ts'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'uds-atomic-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const errno = (code: string) => Object.assign(new Error(code), { code })

describe('tempNameFor (Kx) e isTempNameFor (kA)', () => {
  test('el temporal es <destino>.tmp.<8 hex>', () => {
    expect(tempNameFor('/a/b.json')).toMatch(/^\/a\/b\.json\.tmp\.[0-9a-f]{8}$/)
  })
  test('reconoce sólo el nombre temporal del destino dado', () => {
    expect(isTempNameFor('/a/b.json.tmp.0123abcd', '/a/b.json')).toBe(true)
    expect(isTempNameFor('/a/b.json.tmp.0123abc', '/a/b.json')).toBe(false)
    expect(isTempNameFor('/a/c.json.tmp.0123abcd', '/a/b.json')).toBe(false)
  })
  test('el conjunto que desvía al brazo in situ es el de la referencia', () => {
    expect([...IN_PLACE_FALLBACK_CODES].sort()).toEqual(['EBUSY', 'EEXIST', 'EPERM', 'EXDEV'])
  })
})

describe('writeFileAtomicWithMode (An/Jne)', () => {
  test('crea el archivo con el contenido y el modo pedidos, sin dejar temporales', async () => {
    const target = join(dir, 'k.json')
    await writeFileAtomicWithMode(target, '{"a":1}', { mode: 0o600 })
    expect(readFileSync(target, 'utf8')).toBe('{"a":1}')
    expect(lstatSync(target).mode & 0o777).toBe(0o600)
    expect(readdirSync(dir)).toEqual(['k.json'])
  })

  test('reemplaza un destino existente por rename: el inodo cambia', async () => {
    const target = join(dir, 'k.json')
    writeFileSync(target, 'viejo')
    const before = lstatSync(target).ino
    await writeFileAtomicWithMode(target, 'nuevo', { mode: 0o600 })
    expect(readFileSync(target, 'utf8')).toBe('nuevo')
    expect(lstatSync(target).ino).not.toBe(before)
  })

  test('el rename recibe el temporal y el destino', async () => {
    const target = join(dir, 'k.json')
    const calls: string[][] = []
    await writeFileAtomicWithMode(target, 'x', {
      mode: 0o600,
      renameFn: async (from, to) => {
        calls.push([from, to])
        const { rename } = await import('node:fs/promises')
        await rename(from, to)
      },
    })
    expect(calls).toHaveLength(1)
    expect(isTempNameFor(calls[0]![0]!, target)).toBe(true)
    expect(calls[0]![1]).toBe(target)
  })

  test('un rename que falla con un código ajeno a XS propaga y borra el temporal', async () => {
    const target = join(dir, 'k.json')
    await expect(
      writeFileAtomicWithMode(target, 'x', { mode: 0o600, renameFn: async () => { throw errno('EACCES') } }),
    ).rejects.toMatchObject({ code: 'EACCES' })
    expect(readdirSync(dir)).toEqual([])
  })

  test('un rename con código de XS cae al brazo in situ: escribe en el mismo inodo y borra el temporal', async () => {
    const target = join(dir, 'k.json')
    writeFileSync(target, 'un contenido anterior más largo')
    const before = lstatSync(target).ino
    await writeFileAtomicWithMode(target, 'nuevo', { mode: 0o600, renameFn: async () => { throw errno('EXDEV') } })
    expect(readFileSync(target, 'utf8')).toBe('nuevo')
    expect(lstatSync(target).ino).toBe(before)
    expect(readdirSync(dir)).toEqual(['k.json'])
  })

  test('el brazo in situ aplica el modo pedido cuando el destino ya existía', async () => {
    const target = join(dir, 'k.json')
    writeFileSync(target, 'viejo')
    chmodSync(target, 0o644)
    await writeFileAtomicWithMode(target, 'nuevo', { mode: 0o600, renameFn: async () => { throw errno('EPERM') } })
    expect(lstatSync(target).mode & 0o777).toBe(0o600)
  })

  test('el brazo in situ rehúsa un destino que no es archivo regular (ENXIO)', async () => {
    const target = join(dir, 'd')
    const { mkdirSync } = await import('node:fs')
    mkdirSync(target)
    // abrir un directorio para escribir falla antes; lo que se mide es que el temporal no queda
    await expect(
      writeFileAtomicWithMode(target, 'x', { mode: 0o600, renameFn: async () => { throw errno('EBUSY') } }),
    ).rejects.toBeDefined()
    expect(readdirSync(dir)).toEqual(['d'])
  })

  test('el brazo in situ no sigue un enlace simbólico en el destino', async () => {
    const real = join(dir, 'real')
    writeFileSync(real, 'intacto')
    const target = join(dir, 'k.json')
    symlinkSync(real, target)
    await expect(
      writeFileAtomicWithMode(target, 'x', { mode: 0o600, renameFn: async () => { throw errno('EXDEV') } }),
    ).rejects.toMatchObject({ code: 'ELOOP' })
    expect(readFileSync(real, 'utf8')).toBe('intacto')
  })

  test('un fallo de escritura in situ tras truncar restaura el original y lo anota', async () => {
    const target = join(dir, 'k.json')
    writeFileSync(target, 'original')
    const failure = await writeFileAtomicWithMode(target, 'nuevo', {
      mode: 0o600,
      renameFn: async () => { throw errno('EXDEV') },
      inPlaceWriteHook: () => { throw errno('ENOSPC') },
    }).catch(e => e)
    expect(failure).toMatchObject({ code: 'ENOSPC', targetOutcome: 'restored' })
    expect(String(failure.message)).toContain('original target restored')
    expect(readFileSync(target, 'utf8')).toBe('original')
    // el contenido nuevo se conserva en el temporal, y el error lo nombra
    expect(isTempNameFor(failure.preservedTmp, target)).toBe(true)
    expect(readFileSync(failure.preservedTmp, 'utf8')).toBe('nuevo')
    expect(String(failure.message)).toContain(`new contents preserved at ${failure.preservedTmp}`)
  })

  test('un fallo in situ sobre un destino ausente borra el parcial', async () => {
    const target = join(dir, 'k.json')
    const failure = await writeFileAtomicWithMode(target, 'nuevo', {
      mode: 0o600,
      renameFn: async () => { throw errno('EXDEV') },
      inPlaceWriteHook: () => { throw errno('EIO') },
    }).catch(e => e)
    expect(failure).toMatchObject({ code: 'EIO', targetOutcome: 'removed' })
    expect(readdirSync(dir)).toEqual([failure.preservedTmp.slice(dir.length + 1)])
  })

  test('una colisión del nombre temporal (EEXIST) se reintenta con otro nombre', async () => {
    const target = join(dir, 'k.json')
    const names = ['k.json.tmp.00000000', 'k.json.tmp.00000000', 'k.json.tmp.11111111'].map(n => join(dir, n))
    writeFileSync(names[0]!, 'ajeno')
    let i = 0
    await writeFileAtomicWithMode(target, 'x', { mode: 0o600, tempName: () => names[i++]! })
    expect(readFileSync(target, 'utf8')).toBe('x')
    expect(readFileSync(names[0]!, 'utf8')).toBe('ajeno')
    expect(i).toBe(3)
  })

  test('tras tres colisiones propaga EEXIST sin tocar los temporales ajenos', async () => {
    const target = join(dir, 'k.json')
    const taken = join(dir, 'k.json.tmp.00000000')
    writeFileSync(taken, 'ajeno')
    let i = 0
    await expect(
      writeFileAtomicWithMode(target, 'x', { mode: 0o600, tempName: () => (i++, taken) }),
    ).rejects.toMatchObject({ code: 'EEXIST' })
    expect(i).toBe(3)
    expect(readFileSync(taken, 'utf8')).toBe('ajeno')
  })
})

describe('opciones completas de Jne', () => {
  const withUmask = async (mask: number, run: () => Promise<void>) => {
    const previous = process.umask(mask)
    try {
      await run()
    } finally {
      process.umask(previous)
    }
  }

  test('createMode se usa al crear cuando no hay mode, y el brazo in situ no lo impone a un destino existente', async () => {
    const created = join(dir, 'c')
    await writeFileAtomicWithMode(created, 'x', { createMode: 0o640 })
    expect(lstatSync(created).mode & 0o777).toBe(0o640)
    const existing = join(dir, 'e')
    writeFileSync(existing, 'viejo')
    chmodSync(existing, 0o644)
    await writeFileAtomicWithMode(existing, 'nuevo', { createMode: 0o600, renameFn: async () => { throw errno('EXDEV') } })
    expect(lstatSync(existing).mode & 0o777).toBe(0o644)
  })

  test('exactMode fija el modo sin que el umask lo recorte; mode a secas sí se recorta', async () => {
    await withUmask(0o077, async () => {
      await writeFileAtomicWithMode(join(dir, 'exact'), 'x', { exactMode: 0o644 })
      await writeFileAtomicWithMode(join(dir, 'plain'), 'x', { mode: 0o644 })
    })
    expect(lstatSync(join(dir, 'exact')).mode & 0o777).toBe(0o644)
    expect(lstatSync(join(dir, 'plain')).mode & 0o777).toBe(0o600)
  })

  test('flush sincroniza el temporal antes de publicarlo', async () => {
    const { open } = await import('node:fs/promises')
    const handle = await open(join(dir, 'probe'), 'w')
    const proto = Object.getPrototypeOf(handle) as { sync: () => Promise<void> }
    await handle.close()
    const original = proto.sync
    let syncs = 0
    proto.sync = async function (this: unknown) {
      syncs++
      return original.call(this)
    }
    try {
      await writeFileAtomicWithMode(join(dir, 'f'), 'x', { mode: 0o600, flush: true })
      expect(syncs).toBe(1)
      await writeFileAtomicWithMode(join(dir, 'g'), 'x', { mode: 0o600 })
      expect(syncs).toBe(1)
    } finally {
      proto.sync = original
    }
  })

  test('flush tolera un sync no admitido (EINVAL) y propaga un fallo real sin tocar el destino', async () => {
    const { open } = await import('node:fs/promises')
    const handle = await open(join(dir, 'probe'), 'w')
    const proto = Object.getPrototypeOf(handle) as { sync: () => Promise<void> }
    await handle.close()
    const original = proto.sync
    try {
      proto.sync = async () => { throw errno('EINVAL') }
      await writeFileAtomicWithMode(join(dir, 'ok'), 'x', { flush: true })
      expect(readFileSync(join(dir, 'ok'), 'utf8')).toBe('x')
      proto.sync = async () => { throw errno('EIO') }
      writeFileSync(join(dir, 'kept'), 'viejo')
      await expect(writeFileAtomicWithMode(join(dir, 'kept'), 'x', { flush: true })).rejects.toMatchObject({ code: 'EIO' })
      expect(readFileSync(join(dir, 'kept'), 'utf8')).toBe('viejo')
      expect(readdirSync(dir).filter(name => name.includes('.tmp.'))).toEqual([])
    } finally {
      proto.sync = original
    }
  })

  test('stagingDir crea el temporal allí con el nombre base del destino; si no es un directorio, junto al destino', async () => {
    const { mkdirSync } = await import('node:fs')
    const staging = join(dir, 'staging')
    mkdirSync(staging)
    const target = join(dir, 'k.json')
    const seen: string[] = []
    const renameFn = async (from: string, to: string) => {
      seen.push(from)
      const { rename } = await import('node:fs/promises')
      await rename(from, to)
    }
    await writeFileAtomicWithMode(target, 'x', { stagingDir: staging, renameFn })
    expect(isTempNameFor(seen[0]!, join(staging, 'k.json'))).toBe(true)
    await writeFileAtomicWithMode(target, 'y', { stagingDir: join(dir, 'ausente'), renameFn })
    expect(isTempNameFor(seen[1]!, target)).toBe(true)
    writeFileSync(join(dir, 'archivo'), '')
    await writeFileAtomicWithMode(target, 'z', { stagingDir: join(dir, 'archivo'), renameFn })
    expect(isTempNameFor(seen[2]!, target)).toBe(true)
    expect(readFileSync(target, 'utf8')).toBe('z')
  })

  test('beforePublish que rehúsa antes del rename: nada se publica y no queda temporal', async () => {
    const target = join(dir, 'k.json')
    writeFileSync(target, 'viejo')
    const failure = await writeFileAtomicWithMode(target, 'nuevo', { beforePublish: () => false }).catch(e => e)
    expect(failure).toBeInstanceOf(PublishRefusedError)
    expect(failure.name).toBe('PublishRefusedError')
    expect(failure.target).toBe(target)
    expect(readFileSync(target, 'utf8')).toBe('viejo')
    expect(readdirSync(dir)).toEqual(['k.json'])
  })

  test('beforePublish que rehúsa dentro del brazo in situ retira el destino vacío que acaba de crear', async () => {
    const target = join(dir, 'k.json')
    const answers = [true, true, false]
    const failure = await writeFileAtomicWithMode(target, 'nuevo', {
      renameFn: async () => { throw errno('EXDEV') },
      beforePublish: () => answers.shift() ?? false,
    }).catch(e => e)
    expect(failure).toBeInstanceOf(PublishRefusedError)
    expect(readdirSync(dir)).toEqual([])
  })

  test('inPlaceOnTempCreateRefused: un EACCES al crear el temporal escribe in situ sobre un destino existente', async () => {
    const target = join(dir, 'k.json')
    writeFileSync(target, 'viejo')
    const refused = () => '/sys/uds-atomic-probe.tmp.00000000'
    await expect(writeFileAtomicWithMode(target, 'nuevo', { tempName: refused })).rejects.toMatchObject({ code: 'EACCES' })
    await writeFileAtomicWithMode(target, 'nuevo', { tempName: refused, inPlaceOnTempCreateRefused: true })
    expect(readFileSync(target, 'utf8')).toBe('nuevo')
    await expect(
      writeFileAtomicWithMode(join(dir, 'ausente'), 'x', { tempName: refused, inPlaceOnTempCreateRefused: true }),
    ).rejects.toMatchObject({ code: 'EACCES' })
  })

  test('refuseHardLinks: el brazo in situ rehúsa un destino con otros nombres (EMLINK)', async () => {
    const { linkSync } = await import('node:fs')
    const target = join(dir, 'k.json')
    writeFileSync(target, 'viejo')
    linkSync(target, join(dir, 'otro-nombre'))
    const exdev = async () => { throw errno('EXDEV') }
    await expect(writeFileAtomicWithMode(target, 'nuevo', { renameFn: exdev, refuseHardLinks: true })).rejects.toMatchObject({ code: 'EMLINK' })
    expect(readFileSync(join(dir, 'otro-nombre'), 'utf8')).toBe('viejo')
    await writeFileAtomicWithMode(target, 'nuevo', { renameFn: exdev })
    expect(readFileSync(join(dir, 'otro-nombre'), 'utf8')).toBe('nuevo')
  })

  test('followSymlinks: el brazo in situ escribe a través del enlace', async () => {
    const real = join(dir, 'real')
    writeFileSync(real, 'viejo')
    const target = join(dir, 'k.json')
    symlinkSync(real, target)
    await writeFileAtomicWithMode(target, 'nuevo', { renameFn: async () => { throw errno('EXDEV') }, followSymlinks: true })
    expect(readFileSync(real, 'utf8')).toBe('nuevo')
  })

  test('en win32 un nombre temporal ocupado se detecta con lstat antes de abrir', async () => {
    const taken = join(dir, 'k.json.tmp.00000000')
    writeFileSync(taken, 'ajeno')
    let calls = 0
    const failure = await writeFileAtomicWithMode(join(dir, 'k.json'), 'x', { platform: 'win32', tempName: () => (calls++, taken) }).catch(e => e)
    expect(failure).toMatchObject({ code: 'EEXIST', syscall: 'lstat' })
    expect(calls).toBe(3)
    const linux = await writeFileAtomicWithMode(join(dir, 'k.json'), 'x', { platform: 'linux', tempName: () => taken }).catch(e => e)
    expect(linux.syscall).not.toBe('lstat')
  })

  test('shouldRetryRename reintenta el rename; un destino de sólo lectura corta el primer reintento', async () => {
    const target = join(dir, 'k.json')
    let calls = 0
    const flaky = async (from: string, to: string) => {
      calls++
      if (calls === 1) throw errno('ETXTBSY')
      const { rename } = await import('node:fs/promises')
      await rename(from, to)
    }
    await writeFileAtomicWithMode(target, 'x', { renameFn: flaky, shouldRetryRename: error => (error as { code?: string }).code === 'ETXTBSY' })
    expect(calls).toBe(2)
    expect(readFileSync(target, 'utf8')).toBe('x')
    chmodSync(target, 0o444)
    calls = 0
    await expect(
      writeFileAtomicWithMode(target, 'y', { renameFn: flaky, shouldRetryRename: error => (error as { code?: string }).code === 'ETXTBSY' }),
    ).rejects.toMatchObject({ code: 'ETXTBSY' })
    expect(calls).toBe(1)
  })
})
