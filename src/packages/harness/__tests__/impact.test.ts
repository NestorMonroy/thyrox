/**
 * Selección de pruebas por impacto (T-046…T-049, T-052).
 *
 * Fuente: diseño nativo, con sus trade-offs en
 * `analisis-seleccion-de-pruebas-por-impacto.rst`. El control que discrimina es
 * que un cambio en una ruta NO ejercida por una prueba no la seleccione, y uno
 * en una ruta ejercida sí — no basta con que la lista salga no vacía.
 */

import { describe, expect, test } from 'bun:test'
import { selectTests, type ImpactConfig, type Io } from '../src/testing/impact.ts'

// El selector no toca disco: recibe un `Io`. Eso es lo que lo hace usable
// desde cualquier repo -- y lo que permite probarlo sin fabricar un arbol.
const arbol: Record<string, string> = {
  '__tests__/provider.test.ts': `import { AnthropicHttpProvider } from '../src/provider/anthropicHttp.ts'`,
  '__tests__/sse.test.ts': `import { parseSseEvents } from '../src/provider/sse.ts'`,
  '__tests__/loop.test.ts': `import { runLoop } from '../src/loop.ts'\nimport { RecordedProvider } from '../src/provider/recorded.ts'`,
  '__tests__/tools.test.ts': `import { registry } from '../src/tools/registry.ts'`,
  '__tests__/cli.test.ts': `import { renderEvent } from '../src/cli/render.ts'`,
}
const io: Io = {
  listTests: () => Object.keys(arbol).sort(),
  read: (ruta) => arbol[ruta] ?? '',
}

const base: ImpactConfig = {
  strategy: 'text-reference',
  runner: (rutas) => `bun test ${rutas.join(' ')}`,
  fullRunner: 'bun test',
  crossCutting: ['src/types.ts', 'src/config/**'],
}

describe('selectTests — el contrato (T-046)', () => {
  test('devuelve subconjunto, comando, denominador, metrica y ceguera', () => {
    const r = selectTests(['src/provider/sse.ts'], base, io)
    expect(r.subset).toEqual(['__tests__/sse.test.ts'])
    expect(r.command).toBe('bun test __tests__/sse.test.ts')
    expect(r.denominator).toEqual({ selected: 1, total: 5 })
    expect(r.metric).toBeTruthy()
    expect(r.blindTo).toBeTruthy()
  })

  // Un conteo sin denominador no es un resultado: con el alcance oculto, un
  // selector ciego y uno correcto publican la misma cifra.
  test('el denominador acompaña SIEMPRE al conteo, incluso al no seleccionar nada', () => {
    const r = selectTests(['README.md'], base, io)
    expect(r.subset).toEqual([])
    expect(r.denominator.total).toBe(5)
    expect(r.command).toBeNull()
  })

  test('sin cambios no hay nada que correr, y lo dice', () => {
    const r = selectTests([], base, io)
    expect(r.subset).toEqual([])
    expect(r.command).toBeNull()
    expect(r.crossCutting.triggered).toBe(false)
  })
})

describe('estrategia referencia textual (T-047)', () => {
  test('selecciona por el nombre del modulo cambiado', () => {
    expect(selectTests(['src/loop.ts'], base, io).subset).toEqual(['__tests__/loop.test.ts'])
  })

  test('un modulo con varios consumidores los trae a todos', () => {
    const r = selectTests(['src/provider/recorded.ts', 'src/provider/anthropicHttp.ts'], base, io)
    expect(r.subset).toEqual(['__tests__/loop.test.ts', '__tests__/provider.test.ts'])
  })

  test('declara su ceguera: el consumidor que no nombra el modulo', () => {
    expect(selectTests(['src/loop.ts'], base, io).blindTo).toMatch(/herencia|inyecci|no nombra/i)
  })

  // El control de sub-patron D (T-052): si la estrategia no filtrara y
  // devolviera el arbol entero, este caso cae y los otros no.
  test('el subconjunto es PROPIO: no devuelve todas las pruebas', () => {
    const r = selectTests(['src/tools/registry.ts'], base, io)
    expect(r.subset.length).toBeLessThan(io.listTests().length)
    expect(r.subset).toEqual(['__tests__/tools.test.ts'])
  })
})

describe('estrategia convencion de ruta (T-048)', () => {
  const porRuta: ImpactConfig = { ...base, strategy: 'path-convention',
    pathPattern: { from: 'src/(.+)\\.ts$', to: '__tests__/$1.test.ts' } }

  test('deriva el test del fuente sin leer ningun archivo', () => {
    const leidos: string[] = []
    const espia: Io = { listTests: io.listTests, read: (r) => { leidos.push(r); return io.read(r) } }
    const r = selectTests(['src/loop.ts'], porRuta, espia)
    expect(r.subset).toEqual(['__tests__/loop.test.ts'])
    expect(leidos).toEqual([])   // su ventaja: no recorre contenido
  })

  test('un fuente sin test hermano no selecciona nada', () => {
    expect(selectTests(['src/provider/anthropicHttp.ts'], porRuta, io).subset).toEqual([])
  })

  // Su ceguera es distinta de la textual, y por eso se publica por estrategia
  // y no una sola vez: `src/loop.ts` cambia y `provider.test.ts` no entra
  // aunque lo ejercite.
  test('declara que NO ve ningun consumidor cruzado', () => {
    expect(selectTests(['src/loop.ts'], porRuta, io).blindTo).toMatch(/cruzado/i)
  })
})

describe('disparadores de transversalidad (T-049)', () => {
  test('un cambio en ruta declarada transversal fuerza la suite completa', () => {
    const r = selectTests(['src/types.ts'], base, io)
    expect(r.crossCutting).toEqual({ triggered: true, byPath: 'src/types.ts', rule: 'src/types.ts' })
    expect(r.command).toBe('bun test')
    expect(r.subset).toEqual(io.listTests())
  })

  test('el patron glob tambien dispara, y nombra la regla que lo hizo', () => {
    const r = selectTests(['src/config/settings.ts'], base, io)
    expect(r.crossCutting).toEqual({
      triggered: true, byPath: 'src/config/settings.ts', rule: 'src/config/**',
    })
  })

  test('basta UNO transversal entre muchos cambios acotados', () => {
    const r = selectTests(['src/loop.ts', 'src/types.ts'], base, io)
    expect(r.crossCutting.triggered).toBe(true)
    expect(r.command).toBe('bun test')
  })

  test('sin disparador, el veredicto lo dice explicitamente', () => {
    expect(selectTests(['src/loop.ts'], base, io).crossCutting).toEqual({ triggered: false })
  })

  // Control: si el disparador se infiriera en vez de declararse, un cambio
  // acotado en un archivo de nombre parecido lo activaria por accidente.
  test('un archivo que sólo SE PARECE a uno transversal no dispara', () => {
    expect(selectTests(['src/types.helper.ts'], base, io).crossCutting.triggered).toBe(false)
  })
})

// El instrumento falló contra el árbol real, no contra el sintético: con los
// cambios de este mismo pase devolvió 22 de 22 archivos. Causa medida: el
// módulo `src/testing/io.ts` se buscaba como SUBCADENA, y `io` casa dentro de
// `compactacion`, `conversacion`, `directorio`... El caso sintético no lo veía
// porque sus nombres —loop, sse, tools— son distintivos por casualidad.
describe('referencia textual — el nombre corto no puede casar dentro de otra palabra', () => {
  const arbolReal: Record<string, string> = {
    '__tests__/autocompact.test.ts': "describe('umbral de compactacion', () => {})\nconst conversacion = []",
    '__tests__/io.test.ts': "import { fsIo } from '../src/testing/io.ts'",
    '__tests__/otro.test.ts': "import { algo } from '../src/otro.ts'   // sin relacion",
  }
  const ioReal: Io = { listTests: () => Object.keys(arbolReal).sort(), read: (r) => arbolReal[r] ?? '' }

  test('un módulo de nombre corto NO arrastra a todo el árbol', () => {
    const r = selectTests(['src/testing/io.ts'], base, ioReal)
    expect(r.subset).toEqual(['__tests__/io.test.ts'])
    expect(r.subset).not.toContain('__tests__/autocompact.test.ts')
  })

  test('la ruta del módulo casa aunque el nombre sea ambiguo', () => {
    const conRuta: Record<string, string> = {
      '__tests__/a.test.ts': "import { x } from '../src/testing/io.ts'",
      // `io` aparece SOLO dentro de otras palabras — nunca como token suelto
      '__tests__/b.test.ts': "// compactacion, conversacion, directorio, option",
    }
    const io2: Io = { listTests: () => Object.keys(conRuta).sort(), read: (r) => conRuta[r] ?? '' }
    expect(selectTests(['src/testing/io.ts'], base, io2).subset).toEqual(['__tests__/a.test.ts'])
  })
})
