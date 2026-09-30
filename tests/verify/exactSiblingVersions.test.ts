/**
 * Un paquete depende de su hermano —cualquier miembro del workspace, se llame
 * `@thyrox/*` o conserve su nombre heredado— por la versión EXACTA que el
 * hermano declara, no por `workspace:*`.
 *
 * `workspace:*` acepta cualquier versión del hermano: el manifiesto no dice
 * contra qué contrato se escribió el importador. Con la versión exacta, Bun
 * 1.3.11 enlaza el miembro local sólo si coincide; si no, lo busca en el
 * registro y falla (medido: `@t/a@0.2.0 failed to resolve` con el miembro en
 * 0.1.0). El pin se comprueba al instalar.
 *
 * Métrica: especificadores de un miembro del workspace en `dependencies`,
 * `devDependencies`, `peerDependencies` y `optionalDependencies` de cada
 * `src/packages/*\/package.json` y del manifiesto raíz.
 * Ciega a: si lo que el especificador enlaza se consume por su build o por su
 * fuente — eso lo decide el mapa `exports`, no el especificador.
 */
import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '../..')
const PACKAGES = join(ROOT, 'src/packages')
const FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

type Manifest = { name?: string; version?: string } & Record<string, unknown>

function read(path: string): Manifest {
  return JSON.parse(readFileSync(path, 'utf8')) as Manifest
}

const manifests: Array<[string, Manifest]> = [
  ['package.json', read(join(ROOT, 'package.json'))],
  ...readdirSync(PACKAGES)
    .map(dir => join(PACKAGES, dir, 'package.json'))
    .filter(existsSync)
    .map(path => [path.slice(ROOT.length + 1), read(path)] as [string, Manifest]),
]

const versions = new Map(
  manifests.slice(1).filter(([, m]) => m.name).map(([, m]) => [m.name!, m.version]),
)

function siblingSpecs(): Array<{ where: string; dep: string; spec: string }> {
  const out: Array<{ where: string; dep: string; spec: string }> = []
  for (const [where, manifest] of manifests) {
    for (const field of FIELDS) {
      const deps = (manifest[field] ?? {}) as Record<string, string>
      for (const [dep, spec] of Object.entries(deps)) {
        if (versions.has(dep)) out.push({ where: `${where}#${field}`, dep, spec })
      }
    }
  }
  return out
}

describe('los hermanos del workspace se declaran por versión exacta', () => {
  test('hay dependencias entre hermanos que medir', () => {
    expect(siblingSpecs().length).toBeGreaterThan(0)
  })

  test('ninguna usa el protocolo workspace:', () => {
    expect(siblingSpecs().filter(s => s.spec.startsWith('workspace:'))
      .map(s => `${s.where} ${s.dep}`)).toEqual([])
  })

  test('cada una es la versión que el hermano declara', () => {
    expect(siblingSpecs().filter(s => s.spec !== versions.get(s.dep))
      .map(s => `${s.where} ${s.dep}=${s.spec} (hermano ${versions.get(s.dep)})`)).toEqual([])
  })
})

/**
 * La sección `workspaces` de `bun.lock` repite los especificadores de cada
 * manifiesto, y Bun 1.3.11 no los contrasta: con uno mutado,
 * `bun install --frozen-lockfile` sale 0 igual. Por eso lo mide esta prueba.
 */
describe('bun.lock repite los especificadores de los manifiestos', () => {
  const lock = JSON.parse(
    readFileSync(join(ROOT, 'bun.lock'), 'utf8').replace(/,(\s*[}\]])/g, '$1'),
  ) as { workspaces: Record<string, Record<string, unknown>> }

  test('cada hermano del lock lleva la versión del manifiesto', () => {
    const mismatches: string[] = []
    for (const [dir, entry] of Object.entries(lock.workspaces)) {
      for (const field of FIELDS) {
        const deps = (entry[field] ?? {}) as Record<string, string>
        for (const [dep, spec] of Object.entries(deps)) {
          if (versions.has(dep) && spec !== versions.get(dep)) {
            mismatches.push(`${dir || '.'}#${field} ${dep}=${spec}`)
          }
        }
      }
    }
    expect(mismatches).toEqual([])
  })
})
