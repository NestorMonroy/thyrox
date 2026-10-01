/**
 * THYROX_MORERIGHT activa el panel derecho extra del REPL, sólo en build
 * interna.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { readReplEnvFlags } from '../screens/repl/useReplEnvFlags.ts'

const KEYS = ['USER_TYPE', 'THYROX_MORERIGHT']
const saved: Record<string, string | undefined> = {}
beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
})
afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe('THYROX_MORERIGHT', () => {
  test('en build interna activa el panel derecho extra', () => {
    process.env.USER_TYPE = 'ant'
    expect(readReplEnvFlags().moreRightEnabled).toBe(false)
    process.env.THYROX_MORERIGHT = '1'
    expect(readReplEnvFlags().moreRightEnabled).toBe(true)
  })

  test('fuera de build interna no tiene efecto', () => {
    process.env.THYROX_MORERIGHT = '1'
    expect(readReplEnvFlags().moreRightEnabled).toBe(false)
  })
})
