// Contrato de la comprobacion de escritura en el sandbox (2.1.275): con el
// sandbox encendido, una ruta pasa si TODAS sus variantes evitan toda entrada
// de `denyWithinAllow` y caen dentro de alguna de `allowOnly`.
import { describe, expect, mock, test } from 'bun:test'
import type { PermissionHostBindings } from '../contracts.js'

const realFsOps = await import('@thyrox/storage/fsOperations.js')
const realSandbox = await import('@thyrox/shell/sandbox.js')
let variants: (p: string) => string[] = p => [p]
mock.module('@thyrox/storage/fsOperations.js', () => ({
  ...realFsOps,
  getPathsForPermissionCheck: (p: string) => variants(p),
}))
mock.module('@thyrox/shell/sandbox.js', () => ({
  ...realSandbox,
  SandboxManager: {
    ...realSandbox.SandboxManager,
    isSandboxingEnabled: () => true,
    getFsWriteConfig: () => ({
      allowOnly: ['/work'],
      denyWithinAllow: ['/work/secret'],
    }),
  },
}))

const { isPathInSandboxWriteAllowlist } = await import('../pathValidation.js')
const { installPermissionHostBindings } = await import('../host.js')
const { containsPathTraversal, expandPath } = await import('@thyrox/storage/path.js')
// `pathInWorkingPath` expande y valida rutas por los bindings del anfitrion.
installPermissionHostBindings({ expandPath, containsPathTraversal } as PermissionHostBindings)

describe('isPathInSandboxWriteAllowlist (sandbox encendido)', () => {
  test('una ruta dentro de allowOnly pasa', () => {
    expect(isPathInSandboxWriteAllowlist('/work/a.txt')).toBe(true)
  })
  test('deny gana dentro de allow', () => {
    expect(isPathInSandboxWriteAllowlist('/work/secret/key')).toBe(false)
  })
  test('fuera de allowOnly no pasa', () => {
    expect(isPathInSandboxWriteAllowlist('/other/file')).toBe(false)
  })
  test('basta una variante fuera (enlace simbolico) para rechazar', () => {
    variants = p => [p, '/other/real-target']
    try {
      expect(isPathInSandboxWriteAllowlist('/work/link')).toBe(false)
    } finally {
      variants = p => [p]
    }
  })
  test('las variantes ya resueltas del llamador se usan tal cual', () => {
    expect(isPathInSandboxWriteAllowlist('/ignorada', ['/work/b'])).toBe(true)
  })
})
