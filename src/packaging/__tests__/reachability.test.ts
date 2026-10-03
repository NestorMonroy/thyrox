/**
 * Pruebas del grafo de alcance (ADR-010, P6).
 *
 * Tres niveles: un árbol sintético que fija cada rama del extractor y del
 * resolvedor; el árbol real, donde se miden las ramas de `cli.tsx` contra los
 * abridores; y la conducta con las dependencias opcionales ausentes, que es
 * lo que la matriz afirma cuando escribe «no detectada».
 */
import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, resolve } from 'node:path'
import {
  cliBranches,
  DEPENDENCY_OPENERS,
  entrypointsOf,
  extractImports,
  importChain,
  measure,
  OPAQUE_SPECIFIER,
  ReachabilityGraph,
  WorkspaceResolver,
  type Entrypoint,
} from '../reachability.ts'

const MEASUREMENT_TIMEOUT_MS = 120_000
setDefaultTimeout(MEASUREMENT_TIMEOUT_MS)

const ROOT = resolve(import.meta.dir, '..', '..', '..')
const CLI_FILE = join(ROOT, 'src/packages/cli/src/entry/cli.tsx')
const PODMAN_OPENER = join(ROOT, 'src/packages/daemon/src/podman/podmanWorkerManager.ts')

function writeTree(base: string, files: Record<string, string>): void {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(base, path)), { recursive: true })
    writeFileSync(join(base, path), text)
  }
}

describe('extractor', () => {
  test('ve imports estáticos, dinámicos, reexportes y require, y omite los de tipo', () => {
    const text = [
      "import { a } from './a.ts'",
      "import type { T } from './types.ts'",
      "import { type U } from './onlyType.ts'",
      "export { b } from './b.ts'",
      "export type { V } from './typeReexport.ts'",
      "const c = await import('./c.ts')",
      "const d = require('./d.ts')",
      'const e = await import(name)',
    ].join('\n')
    expect(extractImports('x.ts', text)).toEqual([
      { specifier: './a.ts', kind: 'static' },
      { specifier: './b.ts', kind: 'reexport' },
      { specifier: './c.ts', kind: 'dynamic' },
      { specifier: './d.ts', kind: 'require' },
      { specifier: OPAQUE_SPECIFIER, kind: 'dynamic' },
    ])
  })
})

describe('árbol sintético', () => {
  let base = ''
  let graph: ReachabilityGraph

  beforeAll(() => {
    base = mkdtempSync(join(tmpdir(), 'reachability-'))
    writeTree(base, {
      'src/packages/lib/package.json': JSON.stringify({
        name: '@fixture/lib',
        exports: {
          '.': { '@thyrox/source': './index.ts', types: './dist/index.d.ts', default: './index.ts' },
          './*.ts': { '@thyrox/source': './*.ts', default: './*.ts' },
        },
      }),
      'src/packages/lib/index.ts': "export { deep } from './deep.ts'\n",
      'src/packages/lib/deep.ts': "import './opener.ts'\nexport const deep = 1\n",
      'src/packages/lib/opener.ts': 'export const opened = 1\n',
      'src/packages/lib/lazy.ts': 'export const lazy = 1\n',
      'src/app/main.ts': [
        "import { deep } from '@fixture/lib'",
        "import 'node:fs'",
        "import 'some-npm-package'",
        "import '@fixture/lib/missing.ts'",
        "import './nowhere.js'",
        "export const run = async () => (await import('@fixture/lib/lazy.ts')).lazy + deep",
      ].join('\n'),
    })
    graph = new ReachabilityGraph(new WorkspaceResolver(base))
  })

  afterAll(() => rmSync(base, { recursive: true, force: true }))

  test('el cierre cruza reexportes, el `exports` con comodín y el import dinámico', () => {
    const closure = graph.closure(join(base, 'src/app/main.ts'))
    const reached = [...closure.files].map(file => file.slice(base.length + 1)).sort()
    expect(reached).toEqual([
      'src/app/main.ts',
      'src/packages/lib/deep.ts',
      'src/packages/lib/index.ts',
      'src/packages/lib/lazy.ts',
      'src/packages/lib/opener.ts',
    ])
  })

  test('el abridor alcanzado a través de otro módulo es transitivo, con su cadena', () => {
    const closure = graph.closure(join(base, 'src/app/main.ts'))
    const opener = join(base, 'src/packages/lib/opener.ts')
    expect(closure.direct.has(opener)).toBe(false)
    expect(importChain(closure, opener).map(file => file.slice(base.length + 1))).toEqual([
      'src/app/main.ts',
      'src/packages/lib/index.ts',
      'src/packages/lib/deep.ts',
      'src/packages/lib/opener.ts',
    ])
  })

  test('lo que no resuelve se reporta; builtins y npm no son fallos', () => {
    const closure = graph.closure(join(base, 'src/app/main.ts'))
    expect(closure.unresolved.map(item => item.specifier).sort()).toEqual(['./nowhere.js', '@fixture/lib/missing.ts'])
  })
})

describe('ramas de cli.tsx', () => {
  const text = [
    "import './top.ts'",
    'async function main(): Promise<void> {',
    "  await import('./always.ts')",
    "  if (args[0] === '--fast') { return }",
    "  if (args[0] === 'soft') { await import('./soft.ts') }",
    "  if (args[0] === 'svc') { await import('./svc.ts'); return }",
    "  if (flag) { await import('./flag.ts'); if (ok) { return } }",
    "  await import('./main.ts')",
    '}',
  ].join('\n')
  const branches = new Map(cliBranches('cli.tsx', text).map(branch => [branch.name, branch]))
  const specifiers = (name: string): string[] => (branches.get(name)?.branchImports ?? []).map(item => item.specifier)

  test('cada rama terminal es un entrypoint, nombrada por su literal o su identificador', () => {
    expect([...branches.keys()]).toEqual(['cli --fast', 'cli svc', 'cli flag', 'cli'])
    expect(branches.get('cli svc')?.condition).toBe("args[0] === 'svc'")
  })

  test('una rama carga lo que la precede y lo suyo, no lo de sus hermanas que terminan', () => {
    expect(specifiers('cli --fast')).toEqual(['./top.ts', './always.ts'])
    expect(specifiers('cli svc')).toEqual(['./top.ts', './always.ts', './soft.ts', './svc.ts'])
  })

  test('el camino por defecto acumula las ramas que pueden no terminar', () => {
    expect(specifiers('cli')).toEqual(['./top.ts', './always.ts', './soft.ts', './flag.ts', './main.ts'])
  })

  test('un cli.tsx sin main() no se mide en silencio', () => {
    expect(() => cliBranches('cli.tsx', "import './x.ts'\n")).toThrow('no declara function main()')
  })
})

describe('árbol real', () => {
  const branches = new Map(cliBranches(CLI_FILE, readFileSync(CLI_FILE, 'utf8')).map(branch => [branch.name, branch]))
  const graph = new ReachabilityGraph(new WorkspaceResolver(ROOT))
  const branchClosure = (name: string) => {
    const branch = branches.get(name) as Entrypoint
    return graph.closure(branch.file, branch.branchImports ?? undefined)
  }
  const reachedOpeners = (name: string): string[] => {
    const closure = branchClosure(name)
    return DEPENDENCY_OPENERS.filter(opener => closure.files.has(join(ROOT, opener.file))).map(opener => opener.file)
  }

  test('`--version` no alcanza ningún abridor de dependencia operacional', () => {
    expect(reachedOpeners('cli --version')).toEqual([])
  })

  // Medido: el worker (`--daemon-worker`, workerRegistry) NO alcanza Podman;
  // quien lo alcanza es la rama `daemon` (main -> bgDaemon -> supervisión).
  test('la rama `daemon` alcanza Podman; la del worker no', () => {
    expect(importChain(branchClosure('cli daemon'), PODMAN_OPENER).length).toBeGreaterThan(0)
    expect(branchClosure('cli --daemon-worker').files.has(PODMAN_OPENER)).toBe(false)
  })

  test('cada abridor declarado existe en el árbol', () => {
    const missing = DEPENDENCY_OPENERS.filter(opener => !Bun.file(join(ROOT, opener.file)).size)
    expect(missing).toEqual([])
  })

  test('la matriz nunca escribe «no existe» y distingue directa de transitiva', () => {
    const wrappers = new Map([['cli', 'src/packages/cli/src/entry/cli.tsx']])
    const rows = measure(ROOT, entrypointsOf(ROOT, wrappers)).rows
    expect(rows.some(row => /no existe/.test(Object.values(row).join(' ')))).toBe(false)
    expect(new Set(rows.map(row => row.relation))).toEqual(new Set(['—', 'transitiva']))
  })

  test('`--check` sale 0 contra la matriz versionada', () => {
    const run = Bun.spawnSync(['bash', join(ROOT, 'bin/packaging-reachability'), '--check'], { stdin: 'ignore' })
    expect(run.exitCode).toBe(0)
  })
})

describe('dependencias opcionales ausentes', () => {
  let shadowPath = ''

  /** Un PATH con todo ejecutable del PATH real salvo Podman. */
  function pathWithoutPodman(): string {
    const directory = mkdtempSync(join(tmpdir(), 'no-podman-'))
    for (const source of (process.env.PATH ?? '').split(delimiter).filter(Boolean)) {
      let names: string[] = []
      try {
        names = readdirSync(source)
      } catch {
        continue
      }
      for (const name of names.filter(entry => !entry.startsWith('podman'))) {
        try {
          symlinkSync(join(source, name), join(directory, name))
        } catch {
          // El primero del PATH gana, igual que en la resolución del shell.
        }
      }
    }
    return directory
  }

  function bareEnvironment(): Record<string, string> {
    const environment: Record<string, string> = {}
    for (const [key, value] of Object.entries(process.env)) {
      const isOptionalDependency = /REDIS_URL|POSTGRES|DATABASE_URL|_DB_URL|STORE_URL/.test(key)
      if (value !== undefined && !isOptionalDependency) environment[key] = value
    }
    environment.PATH = shadowPath
    return environment
  }

  beforeAll(() => {
    shadowPath = pathWithoutPodman()
  })

  afterAll(() => rmSync(shadowPath, { recursive: true, force: true }))

  const commandsWithoutDependency: readonly (readonly string[])[] = [
    ['cli', '--version'],
    ['agent-recommend', 'analisis'],
    ['storage', '--help'],
  ]

  test('la matriz declara estos comandos sin dependencia detectada', () => {
    const matrix = readFileSync(join(ROOT, 'src/packaging/reachability-matrix.tsv'), 'utf8')
    const undetected = new Set(
      matrix.split('\n').filter(line => line.split('\t')[2] === 'no detectada').map(line => line.split('\t')[0]),
    )
    expect(undetected.has('cli --version')).toBe(true)
    expect(undetected.has('agent-recommend')).toBe(true)
    expect(undetected.has('storage')).toBe(true)
  })

  test('sin Podman en PATH ni URLs de Redis o base de datos, salen 0', () => {
    const environment = bareEnvironment()
    expect(Bun.spawnSync(['sh', '-c', 'command -v podman'], { env: environment }).exitCode).not.toBe(0)
    for (const command of commandsWithoutDependency) {
      const [name, ...args] = command
      const run = Bun.spawnSync(['bash', join(ROOT, 'bin', name as string), ...args], { env: environment, stdin: 'ignore' })
      expect({ command: command.join(' '), exitCode: run.exitCode }).toEqual({ command: command.join(' '), exitCode: 0 })
    }
  })
})
