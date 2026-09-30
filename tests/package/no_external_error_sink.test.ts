/**
 * thyrox no envía errores a un servicio externo.
 *
 * `local-observability` declara que todo lo que registra se escribe en local
 * («no external sinks»), y aun así traía Sentry del porte: con `SENTRY_DSN`
 * puesto, los errores salían de la máquina. Se retiró y este control
 * impide que vuelva a entrar con otro porte.
 *
 * Qué lo haría fallar: un `import` de `@sentry/*` en `src/`, o un manifiesto
 * que lo declare como dependencia. Los casos negativos usan la línea real que
 * el árbol tenía antes de retirarlo.
 */
import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dir, '..', '..')
const SENTRY_IMPORT = /\bfrom\s+['"]@sentry\/|\bimport\s*\(\s*['"]@sentry\//

function importsSentry(source: string): boolean {
  return SENTRY_IMPORT.test(source)
}

function declaresSentry(manifest: string): boolean {
  const parsed = JSON.parse(manifest) as Record<string, Record<string, string> | undefined>
  return ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
    .some(field => Object.keys(parsed[field] ?? {}).some(name => name.startsWith('@sentry/')))
}

function* walk(dir: string, accept: (name: string) => boolean): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* walk(path, accept)
    else if (accept(name)) yield path
  }
}

describe('sin envío externo de errores', () => {
  test('ningún archivo de src importa @sentry', () => {
    const offenders = [...walk(join(ROOT, 'src'), name => /\.(ts|tsx|mts)$/.test(name))]
      .filter(path => importsSentry(readFileSync(path, 'utf8')))
      .map(path => relative(ROOT, path))
    expect(offenders).toEqual([])
  })

  test('ningún manifiesto declara @sentry', () => {
    const manifests = [join(ROOT, 'package.json'), ...walk(join(ROOT, 'src'), name => name === 'package.json')]
    const offenders = manifests
      .filter(path => declaresSentry(readFileSync(path, 'utf8')))
      .map(path => relative(ROOT, path))
    expect(offenders).toEqual([])
  })

  test('las líneas reales anteriores a la retirada se detectan', () => {
    expect(importsSentry("import * as Sentry from '@sentry/node'")).toBe(true)
    expect(declaresSentry('{"dependencies": {"@sentry/node": "^10.73.0"}}')).toBe(true)
  })

  test('mencionar Sentry sin importarlo no cuenta', () => {
    expect(importsSentry("id: 'sentry-user-token'")).toBe(false)
    expect(declaresSentry('{"dependencies": {"sentry-like": "1.0.0"}}')).toBe(false)
  })
})
