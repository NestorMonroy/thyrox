/**
 * Frescura del corpus contra el ejecutable vivo.
 *
 * El hueco que cierra esta medido: las builds 2.1.250, 2.1.251 y 2.1.258
 * quedaron con dos archivos cada una —solo el volcado de `strings`— mientras
 * 2.1.246 tenia 1716. Nadie aviso: el binario se actualiza sin que el
 * repositorio se entere.
 *
 * Las dos versiones se derivan de sitios distintos a proposito. La viva sale
 * del payload; la del corpus, de lo que hay en disco. Ni el nombre de un
 * directorio ni `claude --version` sirven de arbitro: en H-DOCS-455 el
 * contenedor actualizo el ejecutable a media sesion y los dos mintieron.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { MANIFEST } from './corpus.ts'

export type Freshness = { corpus: string | null; live: string; stale: boolean; reason: string }

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(.*)$/

/**
 * La build mas alta **extraida**. `null` si no hay ninguna.
 *
 * El discriminador es el `MANIFEST.tsv`, no la existencia del directorio: el
 * corpus real tiene `2.1.258/` con dos archivos —README y volcado de
 * `strings`— y ninguna extraccion. Contar la carpeta seria un verde que no
 * distingue «extraida» de «tiene carpeta con su nombre».
 */
export function corpusVersion(root: string): string | null {
  if (!existsSync(root)) return null
  const builds = readdirSync(root).filter(n => {
    if (!SEMVER.test(n)) return false
    if (!statSync(join(root, n)).isDirectory()) return false
    return existsSync(join(root, n, MANIFEST))
  })
  return builds.sort(comparaVersion).at(-1) ?? null
}

/**
 * Orden por (mayor, menor, parche) y, a igualdad, por el sufijo.
 *
 * El sufijo NO se puede pasar por `Number`: el corpus tiene
 * `2.1.246-nombrado`, y `Number('246-nombrado')` da `NaN`. Un `NaN` en el
 * comparador deja el orden sin definir, y con eso el gate publico esa carpeta
 * como la build mas alta teniendo 2.1.258 en disco.
 */
function comparaVersion(a: string, b: string): number {
  const pa = SEMVER.exec(a)!
  const pb = SEMVER.exec(b)!
  for (let i = 1; i <= 3; i++) {
    const d = Number(pa[i]) - Number(pb[i])
    if (d !== 0) return d
  }
  return pa[4].localeCompare(pb[4])
}

/**
 * Compara y **nombra el motivo**. Un booleano solo no dice que hacer, y ese
 * silencio es lo que dejo el corpus tres builds atras.
 */
export function freshness(root: string, live: string): Freshness {
  const corpus = corpusVersion(root)
  if (corpus === null) {
    return { corpus, live, stale: true, reason: `sin corpus en ${root}; extraer ${live}` }
  }
  if (corpus === live) {
    return { corpus, live, stale: false, reason: `el corpus esta en ${live}` }
  }
  return {
    corpus,
    live,
    stale: true,
    reason: `el corpus llega a ${corpus} y el ejecutable declara ${live}; extraer ${live}`,
  }
}
