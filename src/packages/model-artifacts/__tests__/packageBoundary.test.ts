import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const PACKAGE_ROOT = join(import.meta.dir, '..')
const IMPORT_SPECIFIER = /from\s+'([^']+)'/g
const ALLOWED_EXTERNAL = new Set(['node:fs/promises'])

function sourceFiles(): string[] {
  return readdirSync(PACKAGE_ROOT).filter(name => name.endsWith('.ts')).map(name => join(PACKAGE_ROOT, name))
}

function importSpecifiers(file: string): string[] {
  return [...readFileSync(file, 'utf8').matchAll(IMPORT_SPECIFIER)].map(match => match[1] ?? '')
}

describe('frontera del paquete — lógica pura, sin Podman ni red', () => {
  test('cada módulo importa sólo módulos hermanos o node:fs/promises', () => {
    const files = sourceFiles()
    expect(files.length).toBe(5)
    const offenders = files.flatMap(file =>
      importSpecifiers(file)
        .filter(specifier => !specifier.startsWith('./') && !ALLOWED_EXTERNAL.has(specifier))
        .map(specifier => `${file}: ${specifier}`))
    expect(offenders).toEqual([])
  })
})
