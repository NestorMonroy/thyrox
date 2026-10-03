import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const PACKAGE_ROOT = join(import.meta.dir, '..')
const IMPORT_SPECIFIER = /from\s+'([^']+)'/g

function sourceFiles(): string[] {
  return readdirSync(PACKAGE_ROOT).filter(name => name.endsWith('.ts')).map(name => join(PACKAGE_ROOT, name))
}

function importSpecifiers(file: string): string[] {
  return [...readFileSync(file, 'utf8').matchAll(IMPORT_SPECIFIER)].map(match => match[1] ?? '')
}

describe('frontera del paquete — la primitiva funciona sin el daemon', () => {
  test('ningún módulo del paquete importa el daemon, el registro ni las credenciales, ni sale del paquete por ruta relativa', () => {
    const files = sourceFiles()
    expect(files.length).toBeGreaterThan(0)
    const offenders = files.flatMap(file =>
      importSpecifiers(file)
        .filter(specifier => specifier.includes('daemon') || specifier.startsWith('../') || /image-registry|registry-credentials/.test(specifier))
        .map(specifier => `${file}: ${specifier}`))
    expect(offenders).toEqual([])
  })
})
