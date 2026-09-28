/**
 * El espacio de nombres de uid del proceso: `F`, `h`, `R`, `B`, `bko`, `LOt`
 * y `A` de 2.1.283 (`chunk-wngxtykq.js`).
 */
import { describe, expect, test } from 'bun:test'

import {
  OVERFLOW_UID_DEFAULT,
  TRUSTED_SYSTEM_DIRS,
  hostUidForPeerDirs,
  isIdentityUidMap,
  parseOverflowUid,
  parseUidMap,
  probeUidNamespace,
  type UidNamespaceReaders,
} from '../src/uds/uidNamespace.ts'

const IDENTITY = '         0          0 4294967295\n'
function readers(uidMap: string | undefined, overflow: string | undefined, uid: number | undefined): UidNamespaceReaders {
  return {
    readUidMap: async () => uidMap,
    readOverflowUid: async () => overflow,
    getuid: () => uid,
  }
}

describe('parseUidMap (F)', () => {
  test('lee las filas inicio-interior, inicio-anfitrión y cuenta', () => {
    expect(parseUidMap('0 1000 1\n1 100000 65536\n')).toEqual([
      { innerStart: 0, hostStart: 1000, count: 1 },
      { innerStart: 1, hostStart: 100000, count: 65536 },
    ])
  })

  test('una fila malformada invalida el mapa entero', () => {
    expect(parseUidMap('0 1000\n')).toBeUndefined()
    expect(parseUidMap('0 1000 0\n')).toBeUndefined()
    expect(parseUidMap('-1 1000 1\n')).toBeUndefined()
  })

  test('un mapa vacío es una lista vacía', () => {
    expect(parseUidMap('\n')).toEqual([])
  })
})

describe('isIdentityUidMap (h) y parseOverflowUid (R)', () => {
  test('el mapa identidad del espacio inicial', () => {
    expect(isIdentityUidMap(parseUidMap(IDENTITY)!)).toBe(true)
    expect(isIdentityUidMap(parseUidMap('0 1000 1')!)).toBe(false)
  })

  test('overflowuid sólo si es un entero', () => {
    expect(parseOverflowUid('65534\n')).toBe(65534)
    expect(parseOverflowUid('abc')).toBeUndefined()
  })

  test('el uid de desbordamiento por defecto es 65534', () => {
    expect(OVERFLOW_UID_DEFAULT).toBe(65534)
  })
})

describe('probeUidNamespace (bko)', () => {
  test('en el espacio inicial no hay nada que declarar', async () => {
    expect(await probeUidNamespace(readers(IDENTITY, '65534', 1000))).toBeUndefined()
  })

  test('sin uid_map legible y con el uid de desbordamiento, los uid colapsan', async () => {
    expect(await probeUidNamespace(readers(undefined, '65534', 65534))).toEqual({
      unmappedOwnerUid: undefined, uidCollapses: true, rootUidAmbiguous: false,
    })
    expect(await probeUidNamespace(readers(undefined, '65534', 1000))).toBeUndefined()
  })

  test('en un espacio con mapa, el overflowuid sin mapear es el dueño sin mapear', async () => {
    expect(await probeUidNamespace(readers('0 1000 1', '65534', 0))).toEqual({
      unmappedOwnerUid: 65534, uidCollapses: false, rootUidAmbiguous: false,
    })
  })

  test('un mapa vacío colapsa, y overflowuid 0 hace ambiguo a root', async () => {
    expect(await probeUidNamespace(readers('\n', '0', 5))).toEqual({
      unmappedOwnerUid: undefined, uidCollapses: true, rootUidAmbiguous: true,
    })
  })
})

describe('hostUidForPeerDirs (LOt)', () => {
  test('en el espacio inicial es el propio uid', async () => {
    expect(await hostUidForPeerDirs(readers(IDENTITY, '65534', 1000))).toBe(1000)
  })

  test('traduce el uid interior al del anfitrión', async () => {
    expect(await hostUidForPeerDirs(readers('0 100000 1000', '65534', 5))).toBe(100005)
  })

  test('sin uid_map, o si el propio uid es el de desbordamiento, no hay respuesta', async () => {
    expect(await hostUidForPeerDirs(readers(undefined, '65534', 1000))).toBeUndefined()
    expect(await hostUidForPeerDirs(readers('0 1000 1', '65534', 65534))).toBeUndefined()
  })

  test('si el overflowuid cae dentro del mapa, el uid no se traduce', async () => {
    expect(await hostUidForPeerDirs(readers('0 200000 70000', '65534', 7))).toBe(7)
  })
})

describe('TRUSTED_SYSTEM_DIRS (A)', () => {
  test('son los directorios de sistema de la referencia', () => {
    expect([...TRUSTED_SYSTEM_DIRS]).toEqual(['/', '/dev', '/dev/shm', '/run', '/run/user', '/tmp', '/var', '/var/tmp', '/var/run', '/home', '/var/home', '/root', '/var/roothome', '/mnt', '/mnt/wslg'])
  })
})
