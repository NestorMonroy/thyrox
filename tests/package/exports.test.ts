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
      if (entry === '__pycache__') continue
      out.push(...sourceModules(full))
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      out.push(relative(ROOT, full))
    }
  }
  return out.sort()
}

/** La regla del precedente: 33 de 33 subpaths no-raiz de `.claude/packages/`. */
function subpathFor(moduleRelPath: string): string {
  return './' + moduleRelPath
    .replace(/^src\//, '')
    .replace(/\.ts$/, '')
    .replace(/\/index$/, '')
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

describe('2 — el mapa esta completo y su forma se deriva', () => {
  test('cada modulo .ts de src/ tiene su subpath derivado', () => {
    const exports = manifest().exports as Record<string, string>
    const expected = Object.fromEntries(
      sourceModules().map((m) => [subpathFor(m), './' + m]),
    )
    // Comparacion en las dos direcciones: falta un modulo, o sobra una entrada.
    expect(exports).toEqual(expected)
  })
})

describe('3 — cada destino existe', () => {
  test('ningun subpath apunta a un archivo ausente', () => {
    const exports = manifest().exports as Record<string, string>
    const dangling = Object.entries(exports)
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
