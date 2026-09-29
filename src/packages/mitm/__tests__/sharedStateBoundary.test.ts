/**
 * Frontera entre transporte y coordinación: `@thyrox/mitm` termina TLS y
 * enruta al proxy local; el estado compartido entre proxies (leases,
 * ventanas globales, cooldowns) y Redis son del proxy (ADR-THYROX-006, R5).
 *
 * `@thyrox/mitm` depende de `@thyrox/provider`, que sí depende de
 * `@thyrox/shared-state`: por eso no basta con mirar los imports directos.
 * Se empaqueta el paquete entero —todo archivo fuera de `__tests__`, porque
 * `exports` publica `./*`— y se mira el grafo real de módulos.
 */
import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

const PACKAGE_DIR = join(import.meta.dir, '..')
const FORBIDDEN_PACKAGE = '@thyrox/shared-state'
const SHARED_STATE_DIR = join(PACKAGE_DIR, '..', 'shared-state') + sep
const REDIS_CLIENT_INPUT = /(^|\/)node_modules\/(ioredis|redis)\//

/** El metafile publica rutas relativas al directorio de trabajo: se resuelven antes de compararlas. */
function isForbidden(input: string): boolean {
  return resolve(process.cwd(), input).startsWith(SHARED_STATE_DIR) || REDIS_CLIENT_INPUT.test(input)
}

function sourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (name === '__tests__' || name === 'node_modules' || name === 'dist') continue
    if (statSync(path).isDirectory()) files.push(...sourceFiles(path))
    else if (/\.tsx?$/.test(name) && !name.endsWith('.d.ts')) files.push(path)
  }
  return files
}

/** Módulos del grafo (un addon nativo sin compilar queda externo: no es JS que importe nada)  de `entrypoints` que pertenecen al estado compartido o a un cliente de Redis. */
export async function forbiddenModules(entrypoints: string[]): Promise<string[]> {
  const result = await Bun.build({ entrypoints, target: 'bun', metafile: true, throw: false, external: ['*.node'] })
  if (!result.success) throw new Error(`el empaquetado falló: ${result.logs.map(String).join('\n')}`)
  return Object.keys(result.metafile?.inputs ?? {}).filter(isForbidden)
}

describe('@thyrox/mitm no llega al estado compartido', () => {
  test('package.json no declara @thyrox/shared-state ni un cliente de Redis', () => {
    const manifest = JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8'))
    const declared = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })
    expect(declared.filter(name => name === FORBIDDEN_PACKAGE || /redis/i.test(name))).toEqual([])
  })

  test('ningún archivo del paquete usa Bun.RedisClient', () => {
    const offenders = sourceFiles(join(PACKAGE_DIR, 'src')).filter(path =>
      /\bRedisClient\b/.test(readFileSync(path, 'utf8')),
    )
    expect(offenders.map(path => relative(PACKAGE_DIR, path))).toEqual([])
  })

  test('el grafo de módulos del paquete entero no incluye estado compartido ni Redis', async () => {
    expect(await forbiddenModules(sourceFiles(join(PACKAGE_DIR, 'src')))).toEqual([])
  }, 120_000)

  test('control: un archivo que importa @thyrox/shared-state sí se detecta', async () => {
    // La sonda vive fuera de `src/` para que el caso del paquete entero no la vea.
    const probe = join(import.meta.dir, `.boundary-probe-${process.pid}.ts`)
    writeFileSync(probe, "export { openSharedStateStore } from '@thyrox/shared-state/factory.ts'\n")
    try {
      expect((await forbiddenModules([probe])).length).toBeGreaterThan(0)
    } finally {
      rmSync(probe, { force: true })
    }
  }, 120_000)
})
