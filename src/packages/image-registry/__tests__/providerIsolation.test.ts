/**
 * La regla de arquitectura: Thyrox depende del contrato OCI; Docker Hub depende
 * de Thyrox mediante su adapter. En el código —fuera de comentarios— sólo el
 * adapter de Docker Hub y la factory lo nombran.
 */
import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const PACKAGE_ROOT = join(import.meta.dir, '..')
const PROVIDER_FILES = new Set(['dockerHubRegistry.ts', 'dockerHubAdminApi.ts', 'registryFactory.ts'])
const COMMENT_LINE = /^\s*(\*|\/\/|\/\*\*)/

function codeLines(file: string): string[] {
  return readFileSync(join(PACKAGE_ROOT, file), 'utf8').split('\n').filter(line => !COMMENT_LINE.test(line))
}

describe('aislamiento del proveedor', () => {
  test('ningún módulo fuera del adapter y la factory nombra a Docker Hub en su código', () => {
    const modules = readdirSync(PACKAGE_ROOT).filter(name => name.endsWith('.ts') && !PROVIDER_FILES.has(name))
    expect(modules.length).toBeGreaterThan(0)
    const offenders = modules.flatMap(file => codeLines(file).filter(line => /docker/i.test(line)).map(line => `${file}: ${line.trim()}`))
    expect(offenders).toEqual([])
  })
})
