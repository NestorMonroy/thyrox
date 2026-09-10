/**
 * Prueba de la superficie declarada de `thyrox` — el mapa `exports`.
 *
 * Mitad ROJA escrita antes del mecanismo: `package.json` no declara `exports`
 * todavia y los cuatro bloques caen. Ese fallo es el resultado que se
 * persiste.
 *
 * Por que un test y no una revision a ojo
 * ----------------------------------------
 * El defecto que este archivo existe para atrapar ya ocurrio, y esta medido:
 * :ref:`h-docs-1075` encontro un `exports` **declarado y sin ningun
 * consumidor**, asi que su ausencia de efecto era invisible. Un mapa que nadie
 * ejerce no se distingue de uno roto.
 *
 * El bloque 4 es el que discrimina: importa por el nombre del paquete, que es
 * la unica via que **falla** cuando el mapa no esta. Medido con control
 * rojo/verde en
 * `docs: .claude/eventos/autoreferencia-de-exports-20260905T131451/`: bun
 * 1.3.11 resuelve la autorreferencia sin `node_modules`, y retirado el
 * `exports` el mismo import cae con `Cannot find module` y exit 1.
 *
 * Los bloques 1-3 son de forma —declarado, completo, y cada destino existe— y
 * ninguno de los tres puede fallar por si solo si el 4 pasa. Estan porque el 4
 * mide **un** subpath por import, y la completitud es del mapa entero: un
 * modulo nuevo sin su entrada no rompe ningun import existente, y por eso no
 * se ve hasta que alguien lo necesita.
 *
 * La forma del subpath NO se elige: se deriva
 * ---------------------------------------------
 * `subpath = './' + target sin './src/' sin '.ts' sin '/index'`. No es
 * preferencia — es lo que el precedente local practica, medido sobre los dos
 * paquetes de `docs: .claude/packages/`: **33 de 33** subpaths no-raiz la
 * cumplen, sin una sola desviacion. Por eso el bloque 2 exige la derivacion y
 * no solo «que exista alguna entrada»: una entrada con nombre libre pasaria un
 * check de presencia y rompería la regla que los consumidores suponen.
 *
 * Sin entrada `'.'`: los dos paquetes del precedente la tienen porque tienen
 * `src/index.ts`; thyrox no lo tiene, y fabricar uno para llenar la casilla
 * seria inventar un simbolo por simetria.
 *
 * Corregido 2026-09-07 — el bloque 2 media COBERTURA con la evidencia de FORMA
 * ------------------------------------------------------------------------
 * El bloque exigia `exports` igual a un diccionario con UNA entrada por cada
 * `.ts` de `src/`, y citaba como respaldo el «33 de 33» del precedente local.
 * Ese 33 de 33 mide como se DERIVA un subpath de su destino; no dice nada
 * sobre cuantos modulos llevan entrada. Una sola medicion sosteniendo dos
 * afirmaciones — el sub-patron A de `metrica-decide-la-conclusion.md`.
 *
 * Medido en la fuente (`ccnmt`, 31 paquetes con manifiesto): NINGUNO declara
 * una entrada por modulo. `local-observability` declara 33 claves para 60
 * `.ts`; `storage` 45 para 99; `tool-registry` 57 para 313; `repl` 184 para
 * 335. Y diez usan **patron con `*`** — `"./runtime/*.js": "./src/runtime/*.ts"`
 * en `app-host` — que es como la fuente cubre una familia entera sin
 * enumerarla.
 *
 * Por que patron y no las 513 entradas que la enumeracion pedia: una lista que
 * hay que regenerar con cada modulo nuevo es una segunda fuente de verdad que
 * nadie sincroniza, que es lo que `calibration-verified-numbers.md` prohibe en
 * su corolario. El patron cubre por construccion y no puede quedarse atras.
 *
 * Lo que el bloque mide ahora es mas fuerte, no mas debil: no «los dos
 * diccionarios son iguales» sino «cada modulo resuelve A SI MISMO por el
 * mapa», con la semantica de resolucion de Node. Sigue cayendo si un modulo
 * queda fuera de cobertura — verificado con el control de anulacion.
 *
 * Los 25 `index.ts` van explicitos porque el patron no los alcanza:
 * `subpathFor` quita el `/index`, y `"./*": "./src/*.ts"` mapearia `./skills`
 * a `./src/skills.ts`, que no existe.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '..', '..')

/** El manifiesto, leido del disco en cada bloque — no memoizado a proposito. */
function manifest(): Record<string, unknown> {
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
}

/** Los `.ts` de `src/`, relativos a la raiz. Sin `.d.ts` ni `__pycache__`. */
function sourceModules(dir = join(ROOT, 'src')): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      // `node_modules` NO es fuente: sus `.ts` son de terceros y su contenido
      // lo fabrica el gestor de paquetes. Recorrerlo además hacía que un
      // enlace colgado —el residuo que deja disolver un paquete del espacio de
      // trabajo— reventara el recorrido con ENOENT y tiñera de rojo un control
      // que no mide eso. Medido al disolver `@thyrox/tasks`.
      if (entry === '__pycache__' || entry === 'node_modules') continue
      out.push(...sourceModules(full))
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      out.push(relative(ROOT, full))
    }
  }
  return out.sort()
}

/**
 * La regla del precedente: 33 de 33 subpaths no-raiz de `.claude/packages/`.
 *
 * El `/index` NO se quita cuando existe un hermano `<stem>.ts`: es la
 * precedencia del propio resolvedor —`./x` lleva a `x.ts` antes que a
 * `x/index.ts`— y sin ella los dos modulos derivan el MISMO subpath y uno
 * queda inalcanzable. Ocurre una vez y viene de la fuente:
 * `packages/storage/src/secureStorage.ts` convive con `secureStorage/` en
 * `ccnmt`, asi que el puerto heredo la forma, no la invento.
 */
function subpathFor(moduleRelPath: string): string {
  const sinExt = moduleRelPath.replace(/^src\//, '').replace(/\.ts$/, '')
  const conHermano =
    sinExt.endsWith('/index') &&
    existsSync(join(ROOT, 'src', sinExt.slice(0, -'/index'.length) + '.ts'))
  return './' + (conHermano ? sinExt : sinExt.replace(/\/index$/, ''))
}

describe('1 — el mapa esta declarado', () => {
  test('package.json declara exports', () => {
    expect(manifest().exports).toBeDefined()
  })

  test('cada subpath empieza con ./ y apunta a ./src/', () => {
    const exports = manifest().exports as Record<string, string>
    for (const [subpath, target] of Object.entries(exports)) {
      expect(subpath.startsWith('.')).toBe(true)
      expect(target.startsWith('./src/')).toBe(true)
    }
  })
})

/**
 * Resolucion de un subpath contra el mapa, con la semantica de Node: primero
 * la coincidencia exacta, y si no, el patron de prefijo mas largo con `*`.
 *
 * Se implementa aqui —quince lineas— porque el control necesita preguntar «¿a
 * que archivo lleva este subpath?», y comparar dos diccionarios no responde esa
 * pregunta en cuanto el mapa declara un patron.
 */
function resolveSubpath(exports: Record<string, string>, subpath: string): string | null {
  const exacto = exports[subpath]
  if (exacto !== undefined) return exacto
  let mejorPrefijo = ''
  let mejorDestino: string | null = null
  for (const [clave, destino] of Object.entries(exports)) {
    const estrella = clave.indexOf('*')
    if (estrella === -1) continue
    const prefijo = clave.slice(0, estrella)
    const sufijo = clave.slice(estrella + 1)
    if (!subpath.startsWith(prefijo) || !subpath.endsWith(sufijo)) continue
    if (subpath.length < prefijo.length + sufijo.length) continue
    if (prefijo.length < mejorPrefijo.length) continue
    mejorPrefijo = prefijo
    const comodin = subpath.slice(prefijo.length, subpath.length - sufijo.length)
    mejorDestino = destino.replace('*', comodin)
  }
  return mejorDestino
}

describe('2 — el mapa esta completo y su forma se deriva', () => {
  test('cada modulo .ts de src/ resuelve a si mismo por el mapa', () => {
    const exports = manifest().exports as Record<string, string>
    const sinCubrir = sourceModules().filter(
      (m) => resolveSubpath(exports, subpathFor(m)) !== './' + m,
    )
    expect(sinCubrir).toEqual([])
  })

  test('el patron no tapa una entrada explicita', () => {
    const exports = manifest().exports as Record<string, string>
    for (const [subpath, destino] of Object.entries(exports)) {
      if (subpath.includes('*')) continue
      expect(resolveSubpath(exports, subpath)).toBe(destino)
    }
  })
})

describe('3 — cada destino existe', () => {
  test('ningun subpath apunta a un archivo ausente', () => {
    const exports = manifest().exports as Record<string, string>
    const dangling = Object.entries(exports)
      // Un patron no nombra un archivo: `./src/*.ts` no existe como ruta, y
      // exigirle `existsSync` medía la forma del literal en vez de la
      // resolucion. Su cobertura la mide el bloque 2, que resuelve el `*`.
      .filter(([subpath]) => !subpath.includes('*'))
      .filter(([, target]) => !existsSync(join(ROOT, target)))
      .map(([subpath]) => subpath)
    expect(dangling).toEqual([])
  })
})

describe('4 — el mapa PESA: el import por nombre resuelve', () => {
  test('thyrox/coordination/ledger entrega LEDGER_REL', async () => {
    const mod = await import('thyrox/coordination/ledger')
    expect(mod.LEDGER_REL).toBe('.claude/coordination/claims.jsonl')
  })

  test('thyrox/workbench/manifest entrega las cinco claves obligatorias', async () => {
    const mod = await import('thyrox/workbench/manifest')
    expect(Array.isArray(mod.REQUIRED_KEYS)).toBe(true)
    expect(mod.REQUIRED_KEYS.length).toBe(5)
  })
})
