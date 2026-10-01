/**
 * Pruebas de `pathSafety.ts`: `Gge` de 2.1.275 (`chunk-9apg35nm.js`) y sus
 * predicados. Cada caso negativo escribe o apunta a una ruta que EXISTE.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  getOriginalCwd,
  setCwdState,
  setInlinePlugins,
  setInlinePluginsNoMcp,
  setOriginalCwd,
} from '@thyrox/app-host/bootstrap/state.js'
import {
  canonicalComparablePath,
  checkPathSafetyForAutoEdit,
  comparableSegment,
  isCommandSource,
  isConfigDirectory,
  isSettingsFilePath,
  isSensitivePath,
  isSuspiciousWindowsPath,
  isUncPath,
} from '../pathSafety.js'
import { PRODUCT_NAME } from '@thyrox/config/product'
import { foldPathCase } from '../pathCase.js'

let base: string
let previousCwd: string
function touch(...parts: string[]): string {
  const file = join(base, ...parts)
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, 'x')
  return file
}
beforeAll(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'path-safety-')))
  previousCwd = getOriginalCwd()
  setOriginalCwd(base)
  setCwdState(base)
})
afterAll(() => {
  setOriginalCwd(previousCwd)
  setCwdState(previousCwd)
  rmSync(base, { recursive: true, force: true })
})

describe('comparableSegment (sc)', () => {
  test('pliega, quita invisibles, flujo alterno y puntos finales', () => {
    expect(comparableSegment('.Git\u200d')).toBe('.git')
    expect(comparableSegment('config:$DATA')).toBe('config')
    expect(comparableSegment('bashrc. ')).toBe('bashrc')
  })
  test('un segmento que se vaciaría conserva su pliegue', () => {
    expect(comparableSegment('..')).toBe('..')
  })
})

describe('checkPathSafetyForAutoEdit (Gge)', () => {
  test('un archivo común de trabajo es seguro', () => {
    expect(checkPathSafetyForAutoEdit(touch('src', 'a.ts'))).toEqual({ safe: true })
  })
  test('el archivo de settings de un proyecto se corta como settings', () => {
    const file = touch('.claude', 'settings.json')
    const r = checkPathSafetyForAutoEdit(file)
    expect(r.safe).toBe(false)
    if (r.safe) throw new Error('unreachable')
    expect(r).toMatchObject({ classifierApprovable: true, circuitBreaker: 'claudeSettingsFile' })
    expect(r.message).toBe(`${PRODUCT_NAME} requested permissions to write to ${file}, but you haven't granted it yet.`)
  })
  test('un archivo de shell es sensible', () => {
    const file = touch('.bashrc')
    const r = checkPathSafetyForAutoEdit(file)
    expect(r).toEqual({ safe: false, message: `${PRODUCT_NAME} requested permissions to edit ${file} which is a sensitive file.`, classifierApprovable: true })
  })
  test('todo lo que cuelga de .git es sensible', () => {
    expect(checkPathSafetyForAutoEdit(touch('.git', 'config')).safe).toBe(false)
  })
  test('la secuencia .config/git es sensible', () => {
    expect(checkPathSafetyForAutoEdit(touch('.config', 'git', 'ignore')).safe).toBe(false)
  })
  test('una ruta con nombre corto 8.3 es sospechosa y no la aprueba el clasificador', () => {
    const file = touch('PROGRA~1', 'x.txt')
    expect(checkPathSafetyForAutoEdit(file)).toMatchObject({ safe: false, classifierApprovable: false, circuitBreaker: 'suspiciousWindowsPath' })
  })
  test('un comando de .claude/commands pide permiso salvo que se permita editar la config', () => {
    const file = touch('.claude', 'commands', 'deploy.md')
    const r = checkPathSafetyForAutoEdit(file)
    expect(r).toMatchObject({ safe: false, classifierApprovable: true })
    if (r.safe) throw new Error('unreachable')
    expect(r.circuitBreaker).toBeUndefined()
    expect(checkPathSafetyForAutoEdit(file, undefined, undefined, true)).toEqual({ safe: true })
  })
  test('permitir la config no abre .claude fuera de skills, agents y commands', () => {
    expect(checkPathSafetyForAutoEdit(touch('.claude', 'hooks', 'x.sh'), undefined, undefined, true).safe).toBe(false)
  })
})

describe('predicados', () => {
  test('isSettingsFilePath reconoce settings.local.json en cualquier .claude', () => {
    expect(isSettingsFilePath(join(base, 'otro', '.claude', 'settings.local.json'))).toBe(true)
    expect(isSettingsFilePath(join(base, 'otro', 'settings.json'))).toBe(false)
  })
  test('isSuspiciousWindowsPath: dispositivos, tres puntos y segmentos con punto final', () => {
    expect(isSuspiciousWindowsPath('/tmp/x/aux.con')).toBe(true)
    expect(isSuspiciousWindowsPath('/tmp/.../x')).toBe(true)
    expect(isSuspiciousWindowsPath('/tmp/dir./x')).toBe(true)
    expect(isSuspiciousWindowsPath('/tmp/dir/x.txt')).toBe(false)
  })
  test('isUncPath: doble barra y espacio de dispositivo', () => {
    expect(isUncPath('//server/share')).toBe(true)
    expect(isUncPath('\\??\\C:\\x')).toBe(true)
    expect(isUncPath('/srv/share')).toBe(false)
  })
  test('isSensitivePath: el automontaje /net es sensible salvo directorio de red de confianza', () => {
    expect(isSensitivePath('/net/host/share/x', false)).toBe(true)
    const trusted = new Map([['session', ['/net/host/share']]])
    expect(isSensitivePath('/net/host/share/x', false, trusted)).toBe(false)
  })
})

/**
 * La raíz de configuración es `.thyrox`, con respaldo en `.claude`: las dos quedan protegidas igual,
 * porque un archivo que el cliente lee como configuración es configuración
 * con cualquiera de los dos nombres.
 */
describe('la raíz .thyrox se protege como .claude', () => {
  test('settings.local.json en cualquier .thyrox es un archivo de settings', () => {
    expect(isSettingsFilePath(join(base, 'otro', '.thyrox', 'settings.local.json'))).toBe(true)
  })
  test('un directorio .thyrox es un directorio de configuración', () => {
    mkdirSync(join(base, 'otro', '.thyrox'), { recursive: true })
    expect(isConfigDirectory(join(base, 'otro', '.thyrox'))).toBe(true)
  })
  test('THYROX_CONFIG_DIR declara el directorio del usuario', () => {
    const previous = process.env.THYROX_CONFIG_DIR
    const dir = join(base, 'cfg-declarado')
    mkdirSync(dir, { recursive: true })
    touch('cfg-declarado', 'settings.json')
    process.env.THYROX_CONFIG_DIR = dir
    try {
      expect(isConfigDirectory(dir)).toBe(true)
      expect(isSettingsFilePath(join(dir, 'settings.json'))).toBe(true)
    } finally {
      if (previous === undefined) delete process.env.THYROX_CONFIG_DIR
      else process.env.THYROX_CONFIG_DIR = previous
    }
  })
  test('comandos, agentes y skills del proyecto bajo .thyrox son fuente de comandos', () => {
    expect(isCommandSource(join(base, '.thyrox', 'commands', 'x.md'))).toBe(true)
    expect(isCommandSource(join(base, '.thyrox', 'agents', 'x.md'))).toBe(true)
    expect(isCommandSource(join(base, '.thyrox', 'skills', 'x', 'SKILL.md'))).toBe(true)
    expect(isCommandSource(join(base, '.thyrox', 'otro', 'x.md'))).toBe(false)
  })
})

/**
 * La rama con que `Lu` empieza: un archivo bajo un directorio productor de
 * comandos de plugin (`eqr`, leído de `installed_plugins.json`) o bajo la
 * raíz de un plugin en línea (`QGr`) es sensible, comparando la ruta como
 * el disco la resuelve (`PS`).
 */
describe('isSensitivePath: productores de comandos de plugin (eqr, QGr)', () => {
  let previousCacheDir: string | undefined
  let currentProducer: string
  let previousProducer: string
  beforeAll(() => {
    previousCacheDir = process.env.THYROX_CODE_PLUGIN_CACHE_DIR
    const pluginsDir = join(base, 'plugin-cache')
    process.env.THYROX_CODE_PLUGIN_CACHE_DIR = pluginsDir
    currentProducer = join(base, 'producers', 'current')
    previousProducer = join(base, 'producers', 'old')
    mkdirSync(currentProducer, { recursive: true })
    mkdirSync(previousProducer, { recursive: true })
    mkdirSync(pluginsDir, { recursive: true })
    writeFileSync(
      join(pluginsDir, 'installed_plugins.json'),
      JSON.stringify({
        version: 2,
        plugins: {
          'tool@market': [
            {
              scope: 'user',
              installPath: join(pluginsDir, 'cache', 'market', 'tool', '1.0.0'),
              sourceProducerPath: currentProducer,
              previousProducerPaths: [previousProducer, 7, '/net/host/share'],
            },
          ],
        },
      }),
    )
    symlinkSync(currentProducer, join(base, 'producer-link'))
    setInlinePlugins(['inline-plugin', 'https://example.com/plugin.zip'])
    setInlinePluginsNoMcp([join(base, 'inline-plugin-no-mcp')])
  })
  afterAll(() => {
    if (previousCacheDir === undefined) delete process.env.THYROX_CODE_PLUGIN_CACHE_DIR
    else process.env.THYROX_CODE_PLUGIN_CACHE_DIR = previousCacheDir
    setInlinePlugins([])
    setInlinePluginsNoMcp([])
  })
  test('un archivo bajo sourceProducerPath es sensible', () => {
    expect(isSensitivePath(touch('producers', 'current', 'commands', 'deploy.md'), true)).toBe(true)
  })
  test('un archivo bajo previousProducerPaths es sensible; la entrada no-string no rompe la lectura', () => {
    expect(isSensitivePath(touch('producers', 'old', 'deploy.md'), true)).toBe(true)
  })
  test('un archivo bajo una raíz de plugin en línea, relativa al cwd, es sensible', () => {
    expect(isSensitivePath(touch('inline-plugin', 'commands', 'x.md'), true)).toBe(true)
  })
  test('un archivo bajo una raíz de plugin en línea sin MCP es sensible', () => {
    expect(isSensitivePath(touch('inline-plugin-no-mcp', 'skills', 'x', 'SKILL.md'), true)).toBe(true)
  })
  test('la ruta se compara como el disco la resuelve: un enlace al productor también es sensible', () => {
    expect(isSensitivePath(join(base, 'producer-link', 'commands', 'deploy.md'), true)).toBe(true)
  })
  test('fuera de productores y raíces en línea nada cambia', () => {
    expect(isSensitivePath(touch('src', 'b.ts'), true)).toBe(false)
    expect(isSensitivePath(touch('producers-other', 'x.md'), true)).toBe(false)
    expect(isSensitivePath(join(base, 'producers'), true)).toBe(false)
  })
  test('una ruta de red no llega a la rama de productores: la juzgan los predicados de red', () => {
    const trusted = new Map([['session', ['/net/host/share']]])
    expect(isSensitivePath('/net/host/share/x', false, trusted)).toBe(false)
  })
  test('un plugin en línea por URL no tiene raíz en disco que proteger', () => {
    expect(isSensitivePath(touch('https:', 'example.com', 'plugin.zip', 'x.md'), true)).toBe(false)
  })
  test('el registro de plugins que cuelga del cwd no es raíz productora', () => {
    expect(isSensitivePath(touch('plugin-cache', 'note.md'), true)).toBe(false)
  })
  test('el registro se relee sólo cuando la lectura anterior caducó (maxAgeMs)', () => {
    expect(isSensitivePath(touch('producers', 'current', 'again.md'), true)).toBe(true)
    const late = join(base, 'producers', 'late')
    mkdirSync(late, { recursive: true })
    writeFileSync(
      join(base, 'plugin-cache', 'installed_plugins.json'),
      JSON.stringify({ version: 2, plugins: { 'tool@market': [{ scope: 'user', installPath: '/x', sourceProducerPath: late }] } }),
    )
    expect(isSensitivePath(touch('producers', 'late', 'x.md'), true)).toBe(false)
  })
  test('canonicalComparablePath resuelve el tramo que existe y añade el que no', () => {
    expect(canonicalComparablePath(join(base, 'producer-link', 'Nuevo', 'x.md'))).toBe(foldPathCase(join(currentProducer, 'nuevo', 'x.md')))
  })
})

/** La otra mitad de `eqr`: el registro de plugins mismo, si no cuelga del cwd, es raíz productora. */
describe('isSensitivePath: el registro de plugins fuera del cwd', () => {
  let previousCacheDir: string | undefined
  let registry: string
  beforeAll(() => {
    previousCacheDir = process.env.THYROX_CODE_PLUGIN_CACHE_DIR
    registry = realpathSync(mkdtempSync(join(tmpdir(), 'plugin-registry-')))
    process.env.THYROX_CODE_PLUGIN_CACHE_DIR = registry
  })
  afterAll(() => {
    if (previousCacheDir === undefined) delete process.env.THYROX_CODE_PLUGIN_CACHE_DIR
    else process.env.THYROX_CODE_PLUGIN_CACHE_DIR = previousCacheDir
    rmSync(registry, { recursive: true, force: true })
  })
  test('un archivo bajo el registro es sensible aunque no haya installed_plugins.json', () => {
    const file = join(registry, 'cache', 'market', 'tool', 'commands', 'x.md')
    mkdirSync(join(file, '..'), { recursive: true })
    writeFileSync(file, 'x')
    expect(isSensitivePath(file, true)).toBe(true)
  })
})
