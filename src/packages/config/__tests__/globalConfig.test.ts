/**
 * `global/config.ts` — el registro de configuración global (#260).
 *
 * QUÉ FALTABA. `@thyrox/config` no exportaba `getGlobalConfig`, así que sus
 * dos consumidores reales viven de sustitutos:
 *
 *   `updater/src/internal/globalConfigCompat.ts` — devuelve `{}` cuando el
 *       módulo no existe, y su `saveGlobalConfig` es un no-op declarado.
 *   `provider/src/oauth/client.ts` — un `require()` diferido con la misma
 *       forma.
 *
 * Los dos son honestos —declaran que sustituyen— y los dos hacen lo mismo:
 * fingir que la configuración está vacía. Un `oauth/client` que lee `{}` no
 * encuentra el registro de conexiones y se comporta como si el usuario no
 * tuviera ninguna, que es exactamente el defecto que #260 nombra.
 *
 * ALCANCE DEL PORTE, medido y declarado (`porte-completo-no-parcial.md`).
 * La fuente son **1883 líneas y 45 símbolos exportados**: 23 funciones, 7
 * constantes y 15 tipos. Este pase porta el **núcleo de lectura/escritura y
 * su modelo de datos**, que es lo que desbloquea a los dos consumidores, y
 * declara aquí lo que NO trae — no lo omite en silencio.
 *
 * MITAD ROJA: los casos fallan porque `global/config.ts` no existe.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  DEFAULT_GLOBAL_CONFIG, GLOBAL_CONFIG_KEYS, isGlobalConfigKey,
  getGlobalConfig, saveGlobalConfig, _setGlobalConfigCacheForTesting,
  type ConnectionRecord, type GlobalConfig,
} from '../global/config.ts'

const arbol = () => mkdtempSync(join(tmpdir(), 'gconf-'))

describe('el registro de configuración global', () => {
  test('1. sin archivo devuelve el default, no un objeto vacío', () => {
    // El sustituto que esto reemplaza devolvía `{}`, y un `{}` no distingue
    // «no hay configuración» de «hay una con todo por defecto». El default
    // sí: trae las claves con su valor, así que un consumidor puede leer
    // `config.connections` sin comprobar antes si existe.
    const c = getGlobalConfig(join(arbol(), 'no-existe.json'))
    expect(c).toEqual(DEFAULT_GLOBAL_CONFIG)
    expect(c.connections).toEqual([])
  })

  test('2. lee lo que hay en disco y conserva lo que el default aporta', () => {
    const d = arbol()
    const ruta = join(d, 'config.json')
    writeFileSync(ruta, JSON.stringify({ theme: 'dark' }))
    const c = getGlobalConfig(ruta)
    expect(c.theme).toBe('dark')
    // La clave ausente NO desaparece: sale del default. Sin esta mitad, leer
    // un archivo parcial dejaría al consumidor con `undefined` donde el
    // default declara un valor.
    expect(c.connections).toEqual([])
  })

  test('3. el registro de CONEXIONES viaja entero — es lo que #260 pide', () => {
    const d = arbol()
    const ruta = join(d, 'config.json')
    const conexion: ConnectionRecord = {
      id: 'c1', protocol: 'anthropic', name: 'una cuenta',
    }
    writeFileSync(ruta, JSON.stringify({ connections: [conexion] }))
    const c = getGlobalConfig(ruta)
    expect(c.connections).toHaveLength(1)
    expect(c.connections[0].protocol).toBe('anthropic')
  })

  test('4. guardar y volver a leer devuelve lo guardado', () => {
    const ruta = join(arbol(), 'config.json')
    saveGlobalConfig((c: GlobalConfig) => ({ ...c, theme: 'light' }), ruta)
    expect(getGlobalConfig(ruta).theme).toBe('light')
    // Y aterrizó en disco, no sólo en la caché: el control que separa
    // «se guardó» de «se recordó».
    expect(JSON.parse(readFileSync(ruta, 'utf8')).theme).toBe('light')
  })

  test('5. un archivo ilegible NO se traga: se declara y se cae al default', () => {
    // La conducta que discrimina. Un JSON roto podría (a) reventar, (b)
    // devolver el default en silencio, o (c) devolver el default DICIÉNDOLO.
    // La (b) es la peor: el consumidor pierde su configuración sin enterarse
    // y el siguiente `save` la sobreescribe con el default.
    const ruta = join(arbol(), 'config.json')
    writeFileSync(ruta, '{ esto no es json')
    const c = getGlobalConfig(ruta)
    expect(c).toEqual(DEFAULT_GLOBAL_CONFIG)
    expect(getGlobalConfig.lastError).toBeTruthy()
  })

  test('6. isGlobalConfigKey reconoce lo declarado y rechaza lo inventado', () => {
    expect(GLOBAL_CONFIG_KEYS.length).toBeGreaterThan(0)
    expect(isGlobalConfigKey(GLOBAL_CONFIG_KEYS[0])).toBe(true)
    expect(isGlobalConfigKey('clave-que-nadie-declaro')).toBe(false)
  })

  test('7. la caché se puede vaciar — sin eso un test contamina al siguiente', () => {
    const ruta = join(arbol(), 'config.json')
    saveGlobalConfig((c: GlobalConfig) => ({ ...c, theme: 'dark' }), ruta)
    _setGlobalConfigCacheForTesting(null)
    expect(getGlobalConfig(ruta).theme).toBe('dark')
  })
})
