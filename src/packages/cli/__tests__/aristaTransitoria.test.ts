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
 * git mv». Ese pase fue #266, y NO lo mudo: lo RETIRO, reapuntando el
 * binario al sucesor que ya vivia en `thyrox: src/workbench/manifest.ts`.
 * Por eso el caso 3 ya no necesita excepcion para el workbench, y la unica
 * que admite es la de `reference/`.
 *
 * MITAD ROJA: los cuatro casos fallaron contra el arbol de partida. DOS se
 * degradaron a `test.todo` al medir que su premisa era falsa —el 2 afirmaba
 * un destino sin evidencia, el 4 un estado que el tramo 7 no podia alcanzar
 * mientras el workbench superado siguiera citado—. Que un control se corrija
 * a la baja al medirlo es el resultado, no un fallo del metodo: lo contrario
 * seria mover `reference/` para que el caso pasara.
 *
 * El caso 4 volvio a medir cuando #266 retiro el workbench superado y
 * reapunto el binario a su sucesor. El caso 2 sigue `todo` bajo #265: su
 * hogar es la capa de gates, y esa capa aun no tiene sitio.
 *
 * CONTROL DE ANULACION: se devuelve el import de `testing/impact` a
 * `@thyrox/harness/testing/impact` y cae **1 de 3**, el caso 3. Los casos 1 y
 * 4 sobreviven, y deben: miden donde vive el modulo y que declara el
 * manifiesto, no de donde lo cita un tercero.
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

  test('3. el unico especificador a @thyrox/harness que queda es el de reference', () => {
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
        // `reference/` se queda (#265): su destino es la capa de gates, no
        // la CLI, y su cita no es la arista que este tramo cierra. El
        // `workbench` YA no necesita excepcion — #266 retiro el modulo
        // superado y el binario cita a su sucesor por ruta relativa.
        if (m[1].includes('reference')) continue
        citas.push(`${f.slice(RAIZ.length + 1)}: ${m[1]}`)
      }
    }
    expect(citas).toEqual([])
  })

  test('4. el manifiesto ya no declara la dependencia', () => {
    // El especificador y la dependencia son dos superficies distintas: un
    // paquete puede dejar de citar y seguir declarando. El caso 3 mide los
    // `.ts`; este mide `package.json`, que es donde vive la arista para el
    // resolvedor del workspace.
    //
    // Este caso nacio `test.todo`: mientras la cita al workbench superado
    // sobrevivio, la dependencia era legitima y no residuo. #266 retiro ese
    // modulo y reapunto el binario a su sucesor, asi que el caso pasa a medir.
    const manifest = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf-8'))
    expect(Object.keys(manifest.dependencies ?? {})).not.toContain('@thyrox/harness')
  })
})
