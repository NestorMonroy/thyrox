/**
 * La superficie declarada de cada paquete hermano de `src/packages/`.
 *
 * `tests/package/exports.test.ts` aplica esta disciplina al manifiesto RAIZ de
 * thyrox. Este archivo la aplica a los 28 paquetes de `src/packages/`, que
 * hasta hoy no la tenian: el gate `src/verify/package_boundary.py` declara en su
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
        // Un destino bajo `dist/` es la DECLARACION emitida, que no se versiona:
        // `emit_declarations.py` la declara precondicion de construccion, no
        // requisito — sin ella el resolutor cae al `default`, que es la fuente.
        // Se juzga sólo si el paquete ESTA construido: ahi un destino ausente sí
        // es una declaracion envejecida. Sin construir, contarla mediria el
        // contenedor, no el mapa.
        const construido = existsSync(join(p.dir, 'dist'))
        const vivo = (t: string) =>
          existsSync(join(p.dir, t)) || (!construido && /^\.\/dist\//.test(t))
        for (const [sub, valor] of Object.entries(p.exports)) {
          const destinos = typeof valor === 'string' ? [valor]
            : valor && typeof valor === 'object' ? Object.values(valor as Record<string, string>) : []
          for (const t of destinos) {
            if (typeof t !== 'string' || t.includes('*')) continue
            if (!vivo(t)) muertos.push(`${sub} -> ${t}`)
          }
        }
        // `main` y `types` son destinos igual que una entrada del mapa, y el
        // bloque no los miraba: `mcp-runtime` apuntaba `main` a un
        // `./src/index.ts` inexistente y ningun bloque lo veia.
        for (const [clave, t] of [['main', p.main], ['types', p.types]] as const) {
          if (t && !vivo(t)) muertos.push(`${clave} -> ${t}`)
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

  describe('bloque 4 — toda subruta que el arbol CONSUME resuelve por el mapa a un archivo vivo', () => {
    // CONTRATO CAMBIADO al cerrar la superficie (`close_exports.py`). La version
    // anterior (T-9) exigia que CADA modulo de `src/` —tests incluidos— se
    // resolviera a si mismo por el mapa: la superficie ABIERTA que el comodin
    // `./*` daba. Cerrar los mapas a las subrutas que se consumen la contradice
    // por construccion: medido contra los manifiestos de antes y de despues, el
    // criterio viejo pasaba de 11 paquetes en rojo a 25, y ninguno de los 14
    // nuevos tenia un consumidor roto — eran modulos internos que dejaron de
    // estar publicados, que es justo lo que el cierre busca.
    //
    // Lo que el cierre SI puede romper es a un consumidor: una subruta que el
    // arbol importa y que el mapa ya no resuelve. Eso es lo que este bloque
    // mide, por paquete, con la misma resolucion de Node que `close_exports`
    // (exacta, luego el prefijo de comodin mas largo).
    //
    // Metrica: especificadores literales `@thyrox/<pkg>[/<subruta>]` en el
    // codigo de `src/` y `tests/`.
    // Ciega a: un especificador compuesto en tiempo de ejecucion, y a un
    // consumidor fuera de esas dos raices.
    const ESPECIFICADOR = /(?:from\s*|import\s*\(\s*|import\s+|require\s*\(\s*|mock\.module\s*\(\s*)['"](@thyrox\/[^'"]+)['"]/g
    const CODIGO = /\.(?:[cm]?[jt]sx?)$/

    function consumos(): Map<string, Set<string>> {
      const porPaquete = new Map<string, Set<string>>()
      const recorrer = (dir: string) => {
        for (const entry of readdirSync(dir)) {
          if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
          const full = join(dir, entry)
          if (statSync(full).isDirectory()) { recorrer(full); continue }
          if (!CODIGO.test(entry) || entry.endsWith('.d.ts')) continue
          for (const m of readFileSync(full, 'utf8').matchAll(ESPECIFICADOR)) {
            const partes = m[1]!.split('/')
            const nombre = partes.slice(0, 2).join('/')
            const sub = partes.length > 2 ? './' + partes.slice(2).join('/') : '.'
            if (!porPaquete.has(nombre)) porPaquete.set(nombre, new Set())
            porPaquete.get(nombre)!.add(sub)
          }
        }
      }
      for (const raiz of ['src', 'tests']) recorrer(join(RAIZ, raiz))
      return porPaquete
    }

    /** Exacta, luego el prefijo `*` mas largo — la resolucion de Node. */
    function resolveSubpath(exportsMap: Record<string, unknown>, subpath: string): string | null {
      const exacto = destino(exportsMap[subpath])
      if (exacto !== undefined && exacto !== null) return exacto
      let mejorPrefijo = ''
      let mejorDestino: string | null = null
      for (const [clave, valor] of Object.entries(exportsMap)) {
        const estrella = clave.indexOf('*')
        if (estrella === -1) continue
        const prefijo = clave.slice(0, estrella)
        const sufijo = clave.slice(estrella + 1)
        if (!subpath.startsWith(prefijo) || !subpath.endsWith(sufijo)) continue
        if (subpath.length < prefijo.length + sufijo.length) continue
        if (prefijo.length < mejorPrefijo.length) continue
        mejorPrefijo = prefijo
        const comodin = subpath.slice(prefijo.length, subpath.length - sufijo.length)
        const plantilla = destino(valor)
        mejorDestino = plantilla ? plantilla.replace('*', comodin) : null
      }
      return mejorDestino
    }

    // Subrutas que el arbol nombra SIN embarcarlas, y por que no son consumo
    // roto: cada una esta tras un `feature()` de `bun:bundle` que la build
    // externa compila a `false` —el volcado 2.1.275 no trae ninguna cadena de
    // esos flags— o tras un `import()` dinamico dentro de un `try`. Son ramas
    // muertas fieles a la referencia, no destinos que el cierre rompio.
    const NO_EMBARCADAS: Record<string, Record<string, string>> = {
      '@thyrox/tool-registry': {
        './tools/SleepTool/SleepTool.js': "feature('PROACTIVE') || feature('KAIROS')",
        './tools/TerminalCaptureTool/TerminalCaptureTool.js': "feature('TERMINAL_PANEL')",
        './tools/WebBrowserTool/WebBrowserTool.js': "feature('WEB_BROWSER_TOOL')",
        './tools/SnipTool/SnipTool.js': "feature('HISTORY_SNIP')",
        './tools/REPLTool/REPLTool.js': 'import() dinamico dentro de try (runAgentTelemetry)',
      },
    }

    const CONSUMOS = consumos()

    test('una excepcion que empieza a resolver deja de ser excepcion', () => {
      // Si alguien embarca la herramienta, la entrada de arriba sobra: dejarla
      // taparia un destino roto futuro con la razon de uno que ya no aplica.
      const vivas: string[] = []
      for (const [nombre, subs] of Object.entries(NO_EMBARCADAS)) {
        const p = TODOS.find(x => x.nombre === nombre)!
        for (const sub of Object.keys(subs)) {
          const t = resolveSubpath(p.exports, sub)
          if (t !== null && existsSync(join(p.dir, t))) vivas.push(`${nombre}/${sub}`)
        }
      }
      expect(vivas).toEqual([])
    })

    test('el alcance no esta vacio — sin consumos el bloque pasaria sin medir', () => {
      expect([...CONSUMOS.values()].reduce((n, s) => n + s.size, 0)).toBeGreaterThan(100)
    })

    for (const p of TODOS) {
      test(p.nombre, () => {
        const rotos = [...(CONSUMOS.get(p.nombre) ?? [])].filter(sub => {
          if (NO_EMBARCADAS[p.nombre]?.[sub]) return false
          const t = resolveSubpath(p.exports, sub)
          return t === null || !existsSync(join(p.dir, t))
        })
        expect(rotos.sort()).toEqual([])
      })
    }
  })
})
