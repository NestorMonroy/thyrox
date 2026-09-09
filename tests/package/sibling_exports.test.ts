/**
 * La superficie declarada de cada paquete hermano de `src/packages/`.
 *
 * `tests/package/exports.test.ts` aplica esta disciplina al manifiesto RAIZ de
 * thyrox. Este archivo la aplica a los 28 paquetes de `src/packages/`, que
 * hasta hoy no la tenian: el gate `src/gates/package_boundary.py` declara en su
 * propio docstring que NO mide si el `exports` es correcto —«mide que nadie lo
 * rodee, no que la superficie este bien elegida»—, asi que entre los dos habia
 * un hueco por el que cabe un manifiesto que no resuelve su propio nombre.
 *
 * El defecto medido, y por que no se veia
 * ---------------------------------------
 * Declarar `exports` **apaga** `main` y `types` para el subpath raiz: si el
 * mapa no trae `"."`, `import '@thyrox/tool-registry'` cae con
 * `Cannot find module` aunque `main` apunte a un `src/index.ts` que existe.
 * Medido con control positivo/negativo desde el directorio del paquete:
 *
 *     FALLA @thyrox/tool-registry          :: ResolveMessage: Cannot find module
 *     OK    @thyrox/tool-registry/Tool.js  :: 5 exports
 *
 * El subpath resuelve y el nombre pelado no. Nada en el arbol lo delataba
 * porque **ningun consumidor importaba el nombre pelado todavia** — un mapa que
 * nadie ejerce no se distingue de uno roto, que es la leccion de
 * :ref:`h-docs-1075` que el test hermano ya cita.
 *
 * Que haria fallar a cada bloque (sub-patron D de
 * `metrica-decide-la-conclusion.md` — un control tiene que poder fallar)
 * ---------------------------------------------------------------------
 * 1. **Raiz declarada**: un paquete con `exports` y sin `"."`. Cae hoy en 8 de
 *    28 — es la mitad ROJA de este archivo.
 * 2. **Destino vivo**: una entrada cuyo archivo no exista. Hoy da 0, y el
 *    bloque existe para que siga dando 0: es el unico que ve un mapa que
 *    envejece cuando un modulo se renombra.
 * 3. **Autorreferencia** (el que discrimina): importar el paquete POR SU
 *    NOMBRE, en un subproceso con `cwd` en su directorio. Es la unica via que
 *    ejerce el mapa de verdad; los bloques 1 y 2 leen JSON y podrian pasar
 *    sobre un mapa que bun rechace.
 *
 * Por que el bloque 3 corre en subproceso: la autorreferencia de Node/bun
 * resuelve `@thyrox/X` contra el `package.json` que gobierna el **directorio
 * desde el que se importa**. Desde `tests/` no hay ninguno, asi que un
 * `await import()` aqui mediria la ausencia de `node_modules` y no el mapa.
 *
 * Metrica: los `package.json` de `src/packages/*` que declaran `exports`.
 * Ciega a: un paquete SIN `exports` (queda fuera del alcance por
 * construccion — su superficie la gobierna `main`, y esa decision es de
 * `package_boundary.py`); a un destino que exista y exporte otra cosa que la
 * que su nombre promete; y a los comodines, cuyo destino no se puede
 * comprobar sin fijar antes la expansion.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const RAIZ = resolve(import.meta.dir, '..', '..')
const PAQUETES = join(RAIZ, 'src', 'packages')

type Paquete = {
  nombre: string
  dir: string
  exports: Record<string, unknown>
  /** El modulo raiz del paquete, si lo tiene. `null` = paquete solo-subpath. */
  moduloRaiz: string | null
  main: string | null
  types: string | null
}

/** Los tres nombres con que un paquete de esta raiz declara su modulo raiz. */
const CANDIDATOS_RAIZ = ['src/index.ts', 'index.ts', 'src/index.tsx']

/** Los paquetes de la raiz que declaran `exports`, leidos del disco. */
function paquetes(): Paquete[] {
  return readdirSync(PAQUETES)
    .map(d => join(PAQUETES, d))
    .filter(d => statSync(d).isDirectory() && existsSync(join(d, 'package.json')))
    .map(d => ({ dir: d, manifiesto: JSON.parse(readFileSync(join(d, 'package.json'), 'utf8')) }))
    .filter(p => p.manifiesto.exports && p.manifiesto.name)
    .map(p => ({
      nombre: p.manifiesto.name,
      dir: p.dir,
      exports: p.manifiesto.exports,
      moduloRaiz: CANDIDATOS_RAIZ.find(c => existsSync(join(p.dir, c))) ?? null,
      main: p.manifiesto.main ?? null,
      types: p.manifiesto.types ?? null,
    }))
}

/** El destino de una entrada, resuelto a texto — condicional o plano. */
function destino(valor: unknown): string | null {
  if (typeof valor === 'string') return valor
  if (valor && typeof valor === 'object') {
    const v = valor as Record<string, string>
    return v.default ?? Object.values(v)[0] ?? null
  }
  return null
}

const TODOS = paquetes()

/** El manifiesto de la raiz de paquetes, que declara `workspaces`. */
function raizDePaquetes(): { workspaces: string[] } {
  return JSON.parse(readFileSync(join(PAQUETES, 'package.json'), 'utf8'))
}

describe('exports de los paquetes hermanos', () => {
  test('el alcance no esta vacio — si lo estuviera, los tres bloques pasarian sin medir', () => {
    expect(TODOS.length).toBeGreaterThan(20)
  })

  test('bloque 0 — todo directorio con package.json es un workspace declarado', () => {
    // Es la causa de la que cuelgan las demas: un paquete fuera de
    // `workspaces` no entra en la resolucion de `bun install`, asi que sus
    // `dependencies` quedan declaradas y sin instalar. Medido: `lru-cache`
    // esta en las deps de `tool-registry`, `tool-registry` no estaba en la
    // lista, y cargar el paquete moria con `Cannot find package 'lru-cache'`.
    // El manifiesto infra-declara lo que el arbol tiene — la misma forma que
    // el subpath "." ausente del bloque 1, un nivel mas arriba.
    const declarados = new Set(raizDePaquetes().workspaces)
    const enDisco = readdirSync(PAQUETES)
      .filter(d => d !== 'node_modules')
      .filter(d => statSync(join(PAQUETES, d)).isDirectory())
      .filter(d => existsSync(join(PAQUETES, d, 'package.json')))
    expect(enDisco.filter(d => !declarados.has(d))).toEqual([])
  })

  describe('bloque 1 — hay modulo raiz si y solo si hay subpath "."', () => {
    for (const p of TODOS) {
      test(p.nombre, () => {
        if (p.moduloRaiz === null) {
          // Un paquete solo-subpath no fabrica un index para llenar la casilla:
          // seria inventar un simbolo por simetria, que es lo que
          // `exports.test.ts` ya rehusa para el manifiesto raiz de thyrox.
          expect({ pkg: p.nombre, declara: '.' in p.exports }).toEqual({
            pkg: p.nombre, declara: false,
          })
          return
        }
        expect({ pkg: p.nombre, declara: '.' in p.exports }).toEqual({
          pkg: p.nombre, declara: true,
        })
        const t = destino(p.exports['.'])
        expect(existsSync(join(p.dir, t as string))).toBe(true)
      })
    }
  })

  describe('bloque 2 — ningun destino declarado apunta a un archivo ausente', () => {
    for (const p of TODOS) {
      test(p.nombre, () => {
        const muertos: string[] = []
        for (const [sub, valor] of Object.entries(p.exports)) {
          const t = destino(valor)
          if (t === null || t.includes('*')) continue
          if (!existsSync(join(p.dir, t))) muertos.push(`${sub} -> ${t}`)
        }
        // `main` y `types` son destinos igual que una entrada del mapa, y el
        // bloque no los miraba: `mcp-runtime` apuntaba `main` a un
        // `./src/index.ts` inexistente y ningun bloque lo veia.
        for (const [clave, t] of [['main', p.main], ['types', p.types]] as const) {
          if (t && !existsSync(join(p.dir, t))) muertos.push(`${clave} -> ${t}`)
        }
        expect(muertos).toEqual([])
      })
    }
  })

  describe('bloque 3 — el paquete resuelve POR SU NOMBRE desde su propio directorio', () => {
    for (const p of TODOS.filter(p => p.moduloRaiz !== null)) {
      test(p.nombre, () => {
        const r = spawnSync(
          'bun',
          ['-e', `await import(${JSON.stringify(p.nombre)}); console.log('OK')`],
          { cwd: p.dir, encoding: 'utf8' },
        )
        expect(`${p.nombre}: ${r.stdout.trim() || r.stderr.split('\n')[0]}`)
          .toBe(`${p.nombre}: OK`)
      })
    }
  })
})
