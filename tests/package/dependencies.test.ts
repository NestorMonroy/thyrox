/**
 * Toda dependencia de terceros que un paquete IMPORTA está DECLARADA
 * **y RESUELVE**.
 *
 * El defecto que cierra (#202): `jsonc-parser@3.3.1` se instaló bajo
 * `node_modules/` sin tocar ningún `package.json` —su propio módulo lo declara
 * en el docstring, y la razón fue buena: otro agente de aquella tanda estaba
 * escribiendo el manifiesto—. `node_modules/` es gitignored, así que la
 * dependencia existe en este contenedor y **no existe en un clon fresco**: el
 * import falla allí y aquí no, que es la forma de defecto más cara de ver.
 *
 * El segundo defecto que cierra (#214, :ref:`h-docs-1145`): el especificador
 * que **no resuelve** —importado, ni declarado ni instalado—. Hasta hoy este
 * archivo lo declaraba como su ceguera y seguía adelante con un `continue`;
 * esa línea es la que convertía un defecto en una nota. Medidos entonces en
 * `@thyrox/storage`: `picomatch`, `ignore` y `proper-lockfile`, los tres
 * ausentes con dos formas de fallo distintas —import estático (el módulo no
 * carga) y `require` diferido (carga y revienta al llamar)—, que es
 * precisamente lo que un control por resolución ve igual y a tiempo.
 *
 * Qué haría fallar este control, declarado antes de escribirlo:
 *
 * 1. Que un import externo resuelva a `node_modules` sin figurar en el
 *    manifiesto de su paquete ni en el de la raíz. Es el caso de #202.
 * 2. Que el manifiesto pierda una entrada que un import sigue usando —el
 *    mismo defecto por el otro extremo.
 * 3. Que un import externo **no resuelva en absoluto**. Es el caso de #214.
 *
 * Los tres se prueban con controles positivos sintéticos al final del archivo:
 * un fixture que importa un paquete inexistente TIENE que aparecer en
 * `noResuelven`, y uno que sólo importa builtins TIENE que salir vacío. Sin
 * esos dos, un verde no distinguiría «el árbol está limpio» de «el detector no
 * mira» — el sub-patrón D de `metrica-decide-la-conclusion.md`.
 *
 * Por qué se resuelve con `Bun.resolveSync` y no con una expresión regular
 * sobre el texto: un censo por regex mezcla builtins de Node (`fs`, `path`),
 * especificadores citados dentro de un docstring de porte
 * (`@claude-code-how-works/*`) y hasta trozos de expresión regular. Medido al
 * escribir esto: el censo por texto daba 40 «dependencias» de las que **una**
 * era el defecto real. El resolvedor separa las tres clases por conducta —
 * builtin, tercero instalado, no resoluble— en vez de por su forma.
 *
 * *Métrica:* especificadores externos que aparecen en un `import`/`export …
 * from`, en un `import(…)` dinámico o en un `require(…)`, resueltos con
 * `Bun.resolveSync` desde el directorio del paquete, contra `dependencies` +
 * `devDependencies` del paquete y de la raíz.
 * *Ciega a:* el especificador computado (`require(variable)`), que ninguna de
 * las tres formas literales atrapa; a la dependencia declarada que nadie
 * importa, que es deuda de manifiesto y no de carga; y al especificador citado
 * dentro de un COMENTARIO, que `LLAMADA` no sabe separar del código —medido:
 * un solo hit, y se descarta por la regla de que un paquete npm no empieza
 * con `-`.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const RAIZ = new URL('../..', import.meta.url).pathname
const PAQUETES = join(RAIZ, 'src', 'packages')

function manifiesto(dir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
}

function declaradas(m: Record<string, unknown>): Set<string> {
  const deps = (m.dependencies ?? {}) as Record<string, string>
  const dev = (m.devDependencies ?? {}) as Record<string, string>
  return new Set([...Object.keys(deps), ...Object.keys(dev)])
}

/** Los .ts del paquete, sin `node_modules`. */
function modulos(dir: string, salida: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules') continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) modulos(p, salida)
    else if (p.endsWith('.ts')) salida.push(p)
  }
  return salida
}

/** `import … from 'x'` / `export … from 'x'` — incluye `import type`. */
const DESDE = /^\s*(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]/gm
/** `import('x')` dinámico y `require('x')` — literal, nunca computado. */
const LLAMADA = /\b(?:import|require)\(\s*['"]([^'"]+)['"]\s*\)/g

function especificadoresExternos(texto: string): string[] {
  const fuera: string[] = []
  for (const patron of [DESDE, LLAMADA]) {
    for (const [, spec] of texto.matchAll(patron)) {
      if (!spec || spec.startsWith('.') || spec.startsWith('/')) continue
      if (spec.startsWith('node:') || spec.startsWith('bun:')) continue
      // Un nombre de paquete npm no puede empezar con `-`. El único hit de
      // esta forma venía de un `import('-foo')` citado DENTRO de un comentario
      // (`shell/.../loadFigSpec.test.ts:29`): `LLAMADA` no distingue código de
      // comentario, y ésta es la barrera barata que sí es una regla real.
      if (spec.startsWith('-')) continue
      fuera.push(spec)
    }
  }
  return fuera
}

function raizDelPaquete(spec: string): string {
  if (!spec.startsWith('@')) return spec.split('/')[0] ?? spec
  const partes = spec.split('/')
  return partes.slice(0, 2).join('/')
}

/**
 * Las dos clases de defecto, en un solo recorrido: el tercero instalado que
 * nadie declaró, y el especificador que no resuelve.
 */
function clasificar(dir: string, conocidas: Set<string>) {
  const sinDeclarar = new Set<string>()
  const noResuelven = new Set<string>()
  for (const archivo of modulos(dir)) {
    const texto = readFileSync(archivo, 'utf8')
    for (const spec of especificadoresExternos(texto)) {
      const raiz = raizDelPaquete(spec)
      let resuelto: string
      try {
        resuelto = Bun.resolveSync(spec, dir)
      } catch {
        noResuelven.add(raiz)
        continue
      }
      if (conocidas.has(raiz)) continue
      // Un builtin resuelve fuera de `node_modules`; un tercero, dentro.
      if (resuelto.includes('node_modules')) sinDeclarar.add(raiz)
    }
  }
  return { sinDeclarar, noResuelven }
}

/**
 * Deuda heredada, congelada y FECHADA — no barrida. Un especificador listado
 * no bloquea; uno NUEVO sí. Mismo criterio prospectivo que los baselines de
 * `identifier_language_baseline.txt` y hermanos.
 *
 * Su conteo y su reparto los publica el propio control al correr; no se
 * transcriben aquí (`calibration-verified-numbers.md`).
 */
const BASELINE = new Set(
  readFileSync(join(import.meta.dir, 'dependencies_baseline.txt'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#')),
)

const deLaRaiz = declaradas(manifiesto(RAIZ))

const paquetes = readdirSync(PAQUETES).filter((d) => {
  try { return statSync(join(PAQUETES, d, 'package.json')).isFile() } catch { return false }
})

describe('un tercero instalado y usado está declarado, y todo import resuelve', () => {
  // Sin paquetes no habría nada que comprobar y el verde no diría nada.
  test('hay paquetes que medir', () => {
    expect(paquetes.length).toBeGreaterThan(0)
  })

  for (const nombre of paquetes) {
    const dir = join(PAQUETES, nombre)
    const m = manifiesto(dir)
    const conocidas = new Set([...declaradas(m), ...deLaRaiz])

    test(`${m.name}: sus terceros instalados están en el manifiesto`, () => {
      expect([...clasificar(dir, conocidas).sinDeclarar].sort()).toEqual([])
    })

    test(`${m.name}: todo import externo resuelve`, () => {
      const nuevos = [...clasificar(dir, conocidas).noResuelven]
        .filter((r) => !BASELINE.has(`${nombre}::${r}`))
        .sort()
      expect(nuevos).toEqual([])
    })
  }
})

describe('el detector discrimina — control positivo y negativo', () => {
  function fixture(cuerpo: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'deps-control-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'fixture' }))
    writeFileSync(join(dir, 'modulo.ts'), cuerpo)
    return dir
  }

  test('POSITIVO: un import que no resuelve aparece en noResuelven', () => {
    const dir = fixture("import x from 'paquete-que-no-existe-en-ningun-sitio'\n")
    const { noResuelven } = clasificar(dir, new Set())
    expect([...noResuelven]).toEqual(['paquete-que-no-existe-en-ningun-sitio'])
  })

  test('POSITIVO: un require diferido que no resuelve también aparece', () => {
    const dir = fixture("function f() { return require('otro-paquete-inexistente') }\n")
    const { noResuelven } = clasificar(dir, new Set())
    expect([...noResuelven]).toEqual(['otro-paquete-inexistente'])
  })

  test('NEGATIVO: sólo builtins no produce ningún hallazgo', () => {
    const dir = fixture("import { readFileSync } from 'node:fs'\nimport { test } from 'bun:test'\n")
    const { sinDeclarar, noResuelven } = clasificar(dir, new Set())
    expect([...sinDeclarar]).toEqual([])
    expect([...noResuelven]).toEqual([])
  })
})
