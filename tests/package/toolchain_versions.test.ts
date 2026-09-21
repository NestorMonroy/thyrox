import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const manifest = JSON.parse(
  readFileSync(resolve(import.meta.dir, '..', '..', 'package.json'), 'utf8'),
) as { engines?: Record<string, string> }

describe('declared JavaScript runtimes', () => {
  test('Bun declares the version that resolves bun:bundle', () => {
    expect(manifest.engines?.bun).toBe('>=1.4.0')
  })

  test('Node declares the supported runtime floor', () => {
    expect(manifest.engines?.node).toBe('>=20')
  })
})
