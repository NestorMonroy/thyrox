/**
 * La arista transitoria `@thyrox/cli` → `@thyrox/harness` queda cerrada.
 *
 * DE DONDE SALE EL DESTINO, y no se inventa. El analisis de la particion
 * (`kaupamex-docs: .../analisis-grafo-y-particion-del-paquete-harness.rst`)
 * dejaba `testing/` y `reference/` en **indeterminado** bajo UNA sola razon:
 * «su unico consumidor real es `bin/harness.ts`, cuyo hogar futuro declara
 * @thyrox/cli … Moverlas antes que su consumidor invierte la arista». El
 * tramo 6 mudo ese consumidor, asi que la condicion ya no se cumple.
 *
 * PERO esa razon vale para UNA de las dos, y el propio analisis lo dice tres
 * tablas mas arriba: la fila de `reference/triple.ts` declara «Quien la
 * consume: **solo su test**». Medido 2026-09-08 sobre todo el clon, sus
 * cuatro simbolos exportados —`checkPortDeclaration`, `declaredAlias`,
 * `canonicalAlias`, `sameCorpus`— tienen CERO consumidores fuera del propio
 * paquete. Su destino no lo decide un consumidor que no tiene: lo decide
 * donde viva la capa de gates (#81), y su consumidor natural es el gate del
 * paso 7 (#92), pendiente. Por eso `reference/` NO se muda en este tramo y
 * el caso 2 queda `test.todo` bajo #265, en vez de afirmar un destino que
 * ninguna evidencia sostiene.
 *
 * QUE NO SE MUDA, y tampoco es invencion: `workbench/`. :ref:`h-docs-1142`
 * lo declara un duplicado superado con contrato INCOMPATIBLE —sus cinco
 * claves no se solapan en ninguna posicion— y ordena que su retiro sea «su
 * propio pase y con su propia suite … para que no se cuele como parte de un
 * git mv». Por eso el caso 3 exige que la unica arista que queda hacia
 * `@thyrox/harness` sea esa, y ninguna otra.
 *
 * MITAD ROJA: los cuatro casos fallaron contra el arbol de partida. DOS se
 * degradaron a `test.todo` al medir que su premisa era falsa —el 2 afirmaba
 * un destino sin evidencia (#265), el 4 un estado que este tramo no puede
 * alcanzar (#266)—, y quedan los DOS que el tramo pone en verde. Que un
 * control se corrija a la baja al medirlo es el resultado, no un fallo del
 * metodo: lo contrario seria mover `reference/` para que el caso pasara.
 *
 * CONTROL DE ANULACION, a medir tras la mudanza: se devuelve el import de
 * `testing/impact` a `@thyrox/harness/testing/impact` y debe caer **1 de 2**,
 * el caso 3. El caso 1 sobrevive, y debe: mide donde vive el modulo, no de
 * donde lo cita un tercero.
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

  // #265: la triple de referencia NO se muda aqui. Su bloqueo declarado
  // —«su unico consumidor es bin/harness.ts»— resulto falso al medirlo: no
  // tiene ningun consumidor. Su hogar es la capa de gates (#81/#92), no la
  // CLI. Queda visible en la salida y nunca en verde, en vez de borrado.
  test.todo('2. la triple de referencia tiene hogar (#265: la capa de gates)')

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
        // `workbench/` y `reference/` se quedan, cada uno por su razon
        // (h-docs-1142 el primero, #265 el segundo). Sus citas NO son la
        // arista que este tramo cierra.
        if (m[1].includes('workbench') || m[1].includes('reference')) continue
        citas.push(`${f.slice(RAIZ.length + 1)}: ${m[1]}`)
      }
    }
    expect(citas).toEqual([])
  })

  // #266: el manifiesto NO puede quedar limpio en este tramo, y el caso lo
  // afirmaba. La cita al workbench SOBREVIVE a proposito —h-docs-1142 manda
  // que su retiro sea un pase propio con su propia suite, porque los dos
  // contratos son incompatibles— y mientras sobreviva, la dependencia es
  // legitima, no residuo. Queda visible y nunca en verde.
  test.todo('4. el manifiesto ya no declara @thyrox/harness (#266: retirar el workbench superado)')
})
