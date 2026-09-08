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
 * DIVERGENCIA DECLARADA, y es la única de firma. La fuente resuelve la ruta
 * ella misma (`_getGlobalClaudeFile()`) y para poder probarse desvía a un
 * objeto fijo cuando `NODE_ENV === 'test'` — o sea, en pruebas nunca lee un
 * archivo. Aquí se añade un parámetro de ruta **opcional**: sin él la
 * conducta es la de la fuente, y con él el mecanismo se puede medir leyendo
 * y escribiendo de verdad. Es aditivo — ningún llamador de la firma original
 * cambia — y compra el único control que importa: que lo guardado aterrice
 * en disco y vuelva a leerse.
 *
 * MITAD ROJA: los casos fallan porque `global/config.ts` no existe.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  DEFAULT_GLOBAL_CONFIG, GLOBAL_CONFIG_KEYS, isGlobalConfigKey,
  getGlobalConfig, saveGlobalConfig, _setGlobalConfigCacheForTesting,
  type ConnectionRecord, type GlobalConfig,
} from '../global/config.ts'
import { installConfigHostBindings } from '../host.ts'

const arbol = () => mkdtempSync(join(tmpdir(), 'gconf-'))

// PRECONDICIÓN del módulo, no un andamio del test: `_fs()` resuelve por
// `getConfigHostBindings()`, que LANZA si nadie los instaló. Es deliberado en
// la fuente —la capa de fs virtual es carga útil para el sandbox, y caer a
// `node:fs` crudo en silencio la saltaría—, así que un objeto vacío basta:
// cada método tiene su respaldo individual.
beforeEach(() => {
  installConfigHostBindings({})
  _setGlobalConfigCacheForTesting(null)
})

describe('el registro de configuración global', () => {
  test('1. sin archivo devuelve el default MIGRADO, no un objeto vacío', () => {
    // El sustituto que esto reemplaza devolvía `{}`, y un `{}` no distingue
    // «no hay configuración» de «hay una con todo por defecto». El default
    // sí: trae sus claves con valor, así que un consumidor lee `theme` sin
    // comprobar antes si existe.
    //
    // Y lo que devuelve NO es el default crudo: `migrateConfigFields` corre
    // siempre, y sobre un config sin `installMethod` fija `'unknown'` +
    // `autoUpdates: true`. Afirmar `toEqual(DEFAULT_GLOBAL_CONFIG)` sería
    // medir MI encuadre en vez del de la fuente, y además no discriminaría
    // «se migró» de «se devolvió el default tal cual».
    const c = getGlobalConfig(join(arbol(), 'no-existe.json'))
    expect(c).toEqual({
      ...DEFAULT_GLOBAL_CONFIG,
      installMethod: 'unknown',
      autoUpdates: true,
    })
    // `connections` es OPCIONAL y el default de la fuente NO la declara.
    // Fabricarle un `[]` cambiaría la conducta: un consumidor que distinga
    // «sin lista» de «lista vacía» leería lo contrario de lo que hay.
    expect(c.connections).toBeUndefined()
  })

  test('2. lee lo que hay en disco y conserva lo que el default aporta', () => {
    const d = arbol()
    const ruta = join(d, 'config.json')
    writeFileSync(ruta, JSON.stringify({ theme: 'dark' }))
    const c = getGlobalConfig(ruta)
    expect(c.theme).toBe('dark')
    // La clave ausente del archivo NO desaparece: sale del default. Sin esta
    // mitad, leer un archivo parcial dejaría al consumidor con `undefined`
    // donde el default declara un valor.
    expect(c.verbose).toBe(false)
    expect(c.messageIdleNotifThresholdMs).toBe(60000)
  })

  test('3. el registro de CONEXIONES viaja entero — es lo que #260 pide', () => {
    const d = arbol()
    const ruta = join(d, 'config.json')
    // Los ocho campos que la fuente declara. Inventarle tres seria medir
    // un contrato mio en vez del suyo.
    const conexion: ConnectionRecord = {
      id: 'c1', name: 'una cuenta', protocol: 'anthropic',
      endpoint: 'https://api.anthropic.com',
      auth: { type: 'oauth', source: 'claude.ai' },
      enabled: true, models: [], createdAt: 1_700_000_000_000,
    }
    writeFileSync(ruta, JSON.stringify({ connections: [conexion] }))
    const c = getGlobalConfig(ruta)
    expect(c.connections).toHaveLength(1)
    expect(c.connections?.[0]?.protocol).toBe('anthropic')
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
    //
    // La fuente declara por `logDebug` del host binding, no por una
    // propiedad en la función — inventarle un `.lastError` sería medir una
    // API mía. Se instala el binding y se mide SU llamada.
    const dichos: string[] = []
    installConfigHostBindings({ logDebug: (m: string) => { dichos.push(m) } })
    const ruta = join(arbol(), 'config.json')
    writeFileSync(ruta, '{ esto no es json')
    _setGlobalConfigCacheForTesting(null)
    const c = getGlobalConfig(ruta)
    expect(c.theme).toBe(DEFAULT_GLOBAL_CONFIG.theme)
    expect(dichos.some(m => /corrupt/i.test(m))).toBe(true)
    installConfigHostBindings({})
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
