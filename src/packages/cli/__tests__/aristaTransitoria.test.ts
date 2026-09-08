/**
 * La arista transitoria `@thyrox/cli` → `@thyrox/harness` queda cerrada.
 *
 * DE DONDE SALE EL DESTINO, y no se inventa. El analisis de la particion
 * (`kaupamex-docs: .../analisis-grafo-y-particion-del-paquete-harness.rst`)
 * dejaba `testing/` y `reference/` en **indeterminado**, y decia por que:
 * «su unico consumidor real es `bin/harness.ts`, cuyo hogar futuro declara
 * @thyrox/cli … Moverlas antes que su consumidor invierte la arista». El
 * tramo 6 mudo ese consumidor; la condicion que las bloqueaba ya no se
 * cumple, y el destino se sigue de su unico consumidor.
 *
 * QUE NO SE MUDA, y tampoco es invencion: `workbench/`. :ref:`h-docs-1142`
 * lo declara un duplicado superado con contrato INCOMPATIBLE —sus cinco
 * claves no se solapan en ninguna posicion— y ordena que su retiro sea «su
 * propio pase y con su propia suite … para que no se cuele como parte de un
 * git mv». Por eso el caso 3 exige que la unica arista que queda hacia
 * `@thyrox/harness` sea esa, y ninguna otra.
 *
 * MITAD ROJA: los cuatro casos fallan contra el arbol de hoy — `testing/` y
 * `reference/` siguen en el paquete que se vacia, y el manifiesto sigue
 * declarando la dependencia.
 *
 * CONTROL DE ANULACION, a medir tras la mudanza: se devuelve el import de
 * `testing/impact` a `@thyrox/harness/testing/impact` y debe caer **1 de 4**,
 * el caso 3. Los casos 1, 2 y 4 sobreviven, y deben: miden donde vive el
 * modulo y que declara el manifiesto, no de donde lo cita un tercero.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const RAIZ = join(import.meta.dir, '..')

/** Todo `.ts` del paquete, sin node_modules. */
function fuentes(dir: string, salida: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue
    const p = join(dir, e.name)
    if (e.isDirectory()) fuentes(p, salida)
    else if (e.name.endsWith('.ts')) salida.push(p)
  }
  return salida
}

describe('el paquete aloja las utilidades de repositorio que su binario usa', () => {
  test('1. el selector de pruebas por impacto vive aqui', () => {
    expect(existsSync(join(RAIZ, 'src', 'testing', 'impact.ts'))).toBe(true)
    expect(existsSync(join(RAIZ, 'src', 'testing', 'io.ts'))).toBe(true)
  })

  test('2. la triple de referencia vive aqui', () => {
    expect(existsSync(join(RAIZ, 'src', 'reference', 'triple.ts'))).toBe(true)
  })

  test('3. el unico especificador a @thyrox/harness que queda es el del workbench', () => {
    // `workbench/` NO se muda: h-docs-1142 lo declara duplicado superado con
    // contrato incompatible, y su retiro es un pase aparte. Cualquier OTRO
    // especificador seria arista transitoria que este tramo debia cerrar.
    //
    // Metrica: especificadores de modulo —`from '...'` e `import('...')`— que
    // nombren `@thyrox/harness`, en todo `.ts` del paquete.
    // Ciega a: la prosa que lo mencione (por eso NO se cuenta cualquier linea
    // que contenga la cadena: este mismo archivo la nombra varias veces y se
    // quedaria rojo para siempre), y a una cita que entre por una ruta
    // relativa que salga del paquete, que los casos 1 y 2 no cubren.
    const ESPECIFICADOR = /(?:from|import)\s*\(?\s*['"]([^'"]*@thyrox\/harness[^'"]*)['"]/g
    const citas: string[] = []
    for (const f of fuentes(RAIZ)) {
      const texto = readFileSync(f, 'utf-8')
      for (const m of texto.matchAll(ESPECIFICADOR)) {
        if (m[1].includes('workbench')) continue
        citas.push(`${f.slice(RAIZ.length + 1)}: ${m[1]}`)
      }
    }
    expect(citas).toEqual([])
  })

  test('4. el manifiesto ya no declara la dependencia transitoria', () => {
    // El especificador y la dependencia son dos superficies distintas: un
    // paquete puede dejar de citar y seguir declarando. El caso 3 mide los
    // `.ts`; este mide `package.json`, que es donde vive la arista para el
    // resolvedor del workspace.
    const manifiesto = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf-8'))
    expect(Object.keys(manifiesto.dependencies ?? {})).not.toContain('@thyrox/harness')
  })
})
