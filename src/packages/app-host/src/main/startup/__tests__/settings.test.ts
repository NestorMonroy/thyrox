import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  eagerLoadSettings,
  initializeEntrypoint,
  loadSettingSourcesFromFlag,
  loadSettingsFromFlag,
  runMigrations,
  type SettingsFlagDeps,
} from '../settings.js'

const ENV_KEYS = ['CLAUDE_CODE_ENTRYPOINT', 'CLAUDE_CODE_ACTION', 'USER_TYPE'] as const
let snapshot: Record<string, string | undefined>
let argvOriginal: string[]

beforeEach(() => {
  snapshot = {}
  for (const k of ENV_KEYS) {
    snapshot[k] = process.env[k]
    delete process.env[k]
  }
  argvOriginal = process.argv
})

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (snapshot[k] === undefined) delete process.env[k]
    else process.env[k] = snapshot[k]
  }
  process.argv = argvOriginal
})

describe('initializeEntrypoint', () => {
  test('si CLAUDE_CODE_ENTRYPOINT ya está seteado, no lo toca', () => {
    process.env.CLAUDE_CODE_ENTRYPOINT = 'ya-seteado'
    initializeEntrypoint(false)
    expect(process.env.CLAUDE_CODE_ENTRYPOINT).toBe('ya-seteado')
  })

  test('con "mcp serve" en argv, fija "mcp"', () => {
    process.argv = ['node', 'cli.js', 'mcp', 'serve']
    initializeEntrypoint(false)
    expect(process.env.CLAUDE_CODE_ENTRYPOINT).toBe('mcp')
  })

  test('con CLAUDE_CODE_ACTION truthy, fija el entrypoint de la GitHub Action', () => {
    process.argv = ['node', 'cli.js']
    process.env.CLAUDE_CODE_ACTION = '1'
    initializeEntrypoint(false)
    expect(process.env.CLAUDE_CODE_ENTRYPOINT).toBe('claude-code-how-works-how-works-github-action')
  })

  test('no interactivo sin banderas: fija "sdk-cli"', () => {
    process.argv = ['node', 'cli.js']
    initializeEntrypoint(true)
    expect(process.env.CLAUDE_CODE_ENTRYPOINT).toBe('sdk-cli')
  })

  test('interactivo sin banderas: fija "cli"', () => {
    process.argv = ['node', 'cli.js']
    initializeEntrypoint(false)
    expect(process.env.CLAUDE_CODE_ENTRYPOINT).toBe('cli')
  })
})

function rastrear(): { deps: SettingsFlagDeps; llamados: Record<string, unknown[]> } {
  const llamados: Record<string, unknown[]> = {
    resetSettingsCache: [],
    setFlagSettingsPath: [],
    setAllowedSettingSources: [],
    errorSink: [],
    exitProcess: [],
    writeFile: [],
  }
  const deps: SettingsFlagDeps = {
    resetSettingsCache: () => llamados.resetSettingsCache!.push(true),
    setFlagSettingsPath: (p) => llamados.setFlagSettingsPath!.push(p),
    setAllowedSettingSources: (s) => llamados.setAllowedSettingSources!.push(s),
    errorSink: (m) => llamados.errorSink!.push(m),
    exitProcess: (c) => llamados.exitProcess!.push(c),
    writeFile: (p, c) => llamados.writeFile!.push([p, c]),
  }
  return { deps, llamados }
}

describe('loadSettingsFromFlag', () => {
  test('JSON inline válido: escribe un temp file y fija flagSettingsPath', () => {
    const { deps, llamados } = rastrear()
    loadSettingsFromFlag('{"model":"claude-sonnet-5"}', deps)
    expect(llamados.exitProcess!.length).toBe(0)
    expect(llamados.writeFile!.length).toBe(1)
    expect(llamados.setFlagSettingsPath!.length).toBe(1)
    expect(llamados.resetSettingsCache!.length).toBe(1)
  })

  test('JSON inline inválido: reporta el error y sale con código 1, sin escribir nada', () => {
    const { deps, llamados } = rastrear()
    loadSettingsFromFlag('{not valid json}', deps)
    expect(llamados.exitProcess).toEqual([1])
    expect(llamados.writeFile!.length).toBe(0)
    expect(llamados.setFlagSettingsPath!.length).toBe(0)
  })

  test('la misma cadena JSON produce siempre la MISMA ruta de temp file (hash estable)', () => {
    const { deps: d1, llamados: l1 } = rastrear()
    const { deps: d2, llamados: l2 } = rastrear()
    loadSettingsFromFlag('{"a":1}', d1)
    loadSettingsFromFlag('{"a":1}', d2)
    expect(l1.writeFile![0]).toEqual(l2.writeFile![0])
  })

  test('ruta a archivo inexistente: reporta "Settings file not found" y sale con código 1', () => {
    const { deps, llamados } = rastrear()
    loadSettingsFromFlag('/no/existe/settings.json', deps)
    expect(llamados.exitProcess).toEqual([1])
    expect(String(llamados.errorSink![0])).toContain('Settings file not found')
  })
})

describe('loadSettingSourcesFromFlag', () => {
  test('mapea user,project a los nombres canónicos y fija las fuentes', () => {
    const { deps, llamados } = rastrear()
    loadSettingSourcesFromFlag('user,project', deps)
    expect(llamados.setAllowedSettingSources).toEqual([['userSettings', 'projectSettings']])
    expect(llamados.resetSettingsCache!.length).toBe(1)
  })

  test('un nombre inválido: reporta el error y sale con código 1', () => {
    const { deps, llamados } = rastrear()
    loadSettingSourcesFromFlag('nombre-invalido', deps)
    expect(llamados.exitProcess).toEqual([1])
    expect(String(llamados.errorSink![0])).toContain('Invalid setting source')
  })
})

describe('eagerLoadSettings', () => {
  test('sin --settings ni --setting-sources en argv, no llama a ningún colaborador', () => {
    process.argv = ['node', 'cli.js']
    const { deps, llamados } = rastrear()
    eagerLoadSettings(deps)
    expect(llamados.setFlagSettingsPath!.length).toBe(0)
    expect(llamados.setAllowedSettingSources!.length).toBe(0)
  })

  test('con --setting-sources en argv, delega a loadSettingSourcesFromFlag', () => {
    process.argv = ['node', 'cli.js', '--setting-sources', 'local']
    const { deps, llamados } = rastrear()
    eagerLoadSettings(deps)
    expect(llamados.setAllowedSettingSources).toEqual([['localSettings']])
  })
})

describe('runMigrations', () => {
  test('con la versión ya al día, no corre ninguna migración', () => {
    let corridas = 0
    let guardado: number | undefined
    runMigrations({
      getMigrationVersion: () => 11,
      migrations: [() => corridas++],
      saveMigrationVersion: (v) => (guardado = v),
    })
    expect(corridas).toBe(0)
    expect(guardado).toBeUndefined()
  })

  test('con versión desactualizada, corre las migraciones EN ORDEN y guarda la versión actual', () => {
    const orden: string[] = []
    runMigrations({
      getMigrationVersion: () => 3,
      migrations: [() => orden.push('m1'), () => orden.push('m2'), () => orden.push('m3')],
      saveMigrationVersion: (v) => orden.push(`save:${v}`),
    })
    expect(orden).toEqual(['m1', 'm2', 'm3', 'save:11'])
  })

  test('USER_TYPE=ant: corre también la migración exclusiva de ant', () => {
    process.env.USER_TYPE = 'ant'
    let antCorrida = false
    runMigrations({
      getMigrationVersion: () => 3,
      antOnlyMigration: () => (antCorrida = true),
    })
    expect(antCorrida).toBe(true)
  })

  test('sin USER_TYPE=ant: NO corre la migración exclusiva de ant', () => {
    let antCorrida = false
    runMigrations({
      getMigrationVersion: () => 3,
      antOnlyMigration: () => (antCorrida = true),
    })
    expect(antCorrida).toBe(false)
  })
})
