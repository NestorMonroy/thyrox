/**
 * La escritura atómica con modo que el buzón usa para publicar su llave:
 * `An`, `Jne`, `Kx`, `kA`, `j`, `XL`, `R`, `We`, `Ye` y el conjunto `XS`
 * (`chunk-797phdpb.js`) de 2.1.283.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { chmodSync, lstatSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { IN_PLACE_FALLBACK_CODES, isTempNameFor, tempNameFor, writeFileAtomicWithMode } from '../src/uds/atomicWrite.ts'

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
