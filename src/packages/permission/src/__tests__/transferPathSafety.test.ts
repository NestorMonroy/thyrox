/**
 * Los predicados de ruta de red que protegen una copia de transferencia:
 * `Djt`, `ns`, `Yi`, `nS`, `nM`, `_N`, `p9n`, `N_`, `yN`, `Pt`, `tt`, `GF`,
 * `pn` (`chunk-yqm14hey.js`) y `Mur` (`chunk-d6ekr2rh.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import { isDarwinNetworkPath, isNetworkLikePath, isNetworkRootPath, isUnsafeTransferPath, networkPathPrefixes } from '../pathSafety.js'

describe('isNetworkLikePath (Djt)', () => {
  test('UNC salvo WSL local, automontaje, /net, prefijos de dispositivo y rutas que resuelve el núcleo', () => {
    expect(isNetworkLikePath('//server/share/x')).toBe(true)
    expect(isNetworkLikePath('\\\\wsl$\\Ubuntu\\x')).toBe(false)
    expect(isNetworkLikePath('/net/host/x')).toBe(true)
    expect(isNetworkLikePath('/net')).toBe(true)
    expect(isNetworkLikePath('/Network/Servers/h/x')).toBe(true)
    expect(isNetworkLikePath('\\\\?\\C:\\x')).toBe(true)
    expect(isNetworkLikePath('/x/../??/c')).toBe(true)
    expect(isNetworkLikePath('\\GLOBAL??\\C:\\x')).toBe(true)
    expect(isNetworkLikePath('/Device/HarddiskVolume1')).toBe(true)
    expect(isNetworkLikePath('/.vol/1/2')).toBe(true)
    expect(isNetworkLikePath('/home/ana/x')).toBe(false)
    expect(isNetworkLikePath('relative/x')).toBe(false)
  })
})

describe('rutas de red de macOS (yN, tt, GF)', () => {
  test('isNetworkRootPath (yN): el primer segmento es network', () => {
    expect(isNetworkRootPath('/Network')).toBe(true)
    expect(isNetworkRootPath('/x/../network/a')).toBe(true)
    expect(isNetworkRootPath('/home/network')).toBe(false)
    expect(isNetworkRootPath('network')).toBe(false)
  })

  test('networkPathPrefixes (tt) separa prefijos completos de parciales, con el volumen de datos en darwin', () => {
    expect(networkPathPrefixes('/Network/Servers/h/x', 'linux', false)).toEqual({ complete: ['/network/servers/h'], partial: ['/network/', '/network/servers/'] })
    expect(networkPathPrefixes('/System/Volumes/Data/home/ana/x', 'darwin', true).complete).toEqual(['/home/ana'])
    expect(networkPathPrefixes('/System/Volumes/Data/home/ana/x', 'linux', true).complete).toEqual([])
    expect(networkPathPrefixes('/home/ana/x', 'darwin', true).complete).toEqual(['/home/ana'])
    expect(networkPathPrefixes('/home/ana/x', 'darwin', false).complete).toEqual([])
    expect(networkPathPrefixes('rel', 'darwin', true)).toEqual({ complete: [], partial: [] })
  })

  test('isDarwinNetworkPath (GF): sólo en darwin; /network, /.vol y el /home de otro usuario', () => {
    expect(isDarwinNetworkPath('/Network/x', 'linux')).toBe(false)
    expect(isDarwinNetworkPath('/Network/x', 'darwin')).toBe(true)
    expect(isDarwinNetworkPath('/.vol/1', 'darwin')).toBe(true)
    expect(isDarwinNetworkPath('/home/otro/x', 'darwin', true, () => '/home/yo')).toBe(true)
    expect(isDarwinNetworkPath('/home/yo/x', 'darwin', true, () => '/home/yo')).toBe(false)
    expect(isDarwinNetworkPath('/home/otro/x', 'darwin', true, () => null)).toBe(true)
    expect(isDarwinNetworkPath('/home/otro/x', 'darwin', false, () => '/home/yo')).toBe(false)
    expect(isDarwinNetworkPath('rel', 'darwin')).toBe(false)
  })
})

describe('isUnsafeTransferPath (Mur)', () => {
  test('en su forma por omisión es Linux: la rama de macOS no cuenta', () => {
    expect(isUnsafeTransferPath('//s/x')).toBe(true)
    expect(isUnsafeTransferPath('/Network/Servers/h/x')).toBe(true)
    expect(isUnsafeTransferPath('/Network/x')).toBe(false)
    expect(isUnsafeTransferPath('/Network/x', 'darwin')).toBe(true)
    expect(isUnsafeTransferPath('/home/ana/.claude/file-transfers/a')).toBe(false)
  })
})
