/**
 * `checkNetworkPathRead` contra 2.1.281 (`ULn`): además del mapa `/net`, la
 * ruta `/net/<host>` (`Bi`) y los prefijos que el núcleo de macOS redirige
 * (`/.vol`, `/.file`, `/.nofollow`, `/.resolve`, `UH`) piden aprobación.
 */
import { describe, expect, test } from 'bun:test'
import { checkNetworkPathRead } from '../fileToolPermissions.js'
import { isKernelResolvedPath } from '../pathSafety.js'

const Read = { name: 'Read', getPath: (i: { file_path: string }) => i.file_path }
const Glob = { name: 'Glob', getPath: (i: { path?: string }) => i.path ?? '/work' }
const ctx = (trusted?: Map<string, readonly string[]>) =>
  ({ mode: 'default', additionalWorkingDirectories: new Map(), trustedNetworkDirectories: trusted }) as never
const reason = (d: unknown) => (d as { decisionReason?: { reason?: string } } | null)?.decisionReason?.reason

describe('isKernelResolvedPath (UH)', () => {
  // Como el binario, basta con que el prefijo sea primer segmento en algún
  // momento del recorrido: `/.vol/../home` también cuenta.
  test('reconoce los cuatro prefijos como primer segmento, sin distinguir mayúsculas', () => {
    for (const p of ['/.vol/1/2', '/.file/id=1', '/.NoFollow/x', '/.resolve', '/a/../.vol/x', '/.vol/../home'])
      expect(isKernelResolvedPath(p)).toBe(true)
  })
  test('fuera del primer segmento, relativo o con otro nombre, no', () => {
    for (const p of ['/home/.vol/x', '.vol/x', '/.volume/x', '/'])
      expect(isKernelResolvedPath(p)).toBe(false)
  })
})

describe('checkNetworkPathRead (ULn, 2.1.281)', () => {
  test('una ruta bajo /.vol pide aprobación', () => {
    expect(reason(checkNetworkPathRead(Read as never, { file_path: '/.vol/16777220/2' }, ctx(), []))).toBe(
      'Kernel-resolved path prefix (/.vol etc.) detected (defense-in-depth check)',
    )
  })
  test('una ruta resuelta bajo /.file pide aprobación citando la original', () => {
    const d = checkNetworkPathRead(Read as never, { file_path: '/work/link' }, ctx(), ['/work/link', '/.file/id=9'])
    expect(reason(d)).toBe('Kernel-resolved path prefix (/.vol etc.) detected (defense-in-depth check)')
    expect((d as { message: string }).message).toContain('read from /work/link, which is under /.vol')
  })
  test('un patrón de Glob bajo /.resolve pide aprobación', () => {
    expect(reason(checkNetworkPathRead(Glob as never, { pattern: '/.resolve/**' }, ctx(), []))).toBe(
      'Kernel-resolved path prefix (/.vol etc.) glob pattern detected (defense-in-depth check)',
    )
  })
  test('una ruta /net/<host> pide aprobación como automontaje', () => {
    expect(reason(checkNetworkPathRead(Read as never, { file_path: '/net/host/share/a' }, ctx(), []))).toBe(
      'Automount -hosts path detected (defense-in-depth check)',
    )
  })
  test('un directorio de red de confianza lo exime', () => {
    const trusted = new Map([['session', ['/.vol']]])
    expect(checkNetworkPathRead(Read as never, { file_path: '/.vol/1/2' }, ctx(trusted), [])).toBeNull()
  })
  test('una ruta local no dispara nada', () => {
    expect(checkNetworkPathRead(Read as never, { file_path: '/home/u/a' }, ctx(), ['/home/u/a'])).toBeNull()
  })
})
