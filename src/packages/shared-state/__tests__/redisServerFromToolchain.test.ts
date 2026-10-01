import { describe, expect, test } from 'bun:test'
import { resolveRedisServerFromToolchain } from './redisServerFromToolchain.ts'

describe('resolveRedisServerFromToolchain', () => {
  test('devuelve la ruta que el toolchain resuelve y que responde --version', () => {
    const bin = resolveRedisServerFromToolchain({ PATH: process.env.PATH ?? '' })
    expect(bin.startsWith('/')).toBe(true)
    expect(Bun.spawnSync([bin, '--version'], { stdin: 'ignore' }).exitCode).toBe(0)
  })

  test('un binario ausente sin THYROX_INSTALL_REDIS rehúsa nombrando el opt-in', () => {
    expect(() =>
      resolveRedisServerFromToolchain({
        PATH: process.env.PATH ?? '',
        THYROX_TOOLCHAIN_REDIS_BIN: 'redis-server-que-no-existe',
      }),
    ).toThrow('THYROX_INSTALL_REDIS')
  })

  test('con el opt-in, un instalador que no deja el binario también rehúsa', () => {
    expect(() =>
      resolveRedisServerFromToolchain({
        PATH: process.env.PATH ?? '',
        THYROX_TOOLCHAIN_REDIS_BIN: 'redis-server-que-no-existe',
        THYROX_INSTALL_REDIS: '1',
        THYROX_TOOLCHAIN_REDIS_INSTALL_CMD: 'true',
      }),
    ).toThrow('sigue sin responder')
  })
})
