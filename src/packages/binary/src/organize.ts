/**
 * Reparto de los modulos en directorios, con lo que el grafo permite afirmar.
 *
 * La etapa que falta, y por que falta: clasificar vendor contra aplicacion
 * exige saber de que paquete npm salio cada modulo, y el empaquetador borro
 * toda la señal. Medido sobre 2.1.258: `@license` 0, `Copyright (c)` 0,
 * `node_modules` 0, `require("` 0, `sourceMappingURL` 0; y 1621 de 1628
 * modulos `.js` se llaman `chunk-XXXXXXXX.js`.
 *
 * La alternativa —una base de huellas de los mil paquetes mas usados— exige
 * construirla desde npm, que necesita red. Queda declarada como DESCONOCIDO
 * con su condicion de cierre, no rellenada con una heuristica que aparente
 * clasificar.
 *
 * Lo que si sostiene el grafo es el PAPEL de cada modulo, y con eso se reparte.
 */

export type Role = 'entrada' | 'interno' | 'hoja'

/**
 * El papel de `nombre` en el grafo. `null` si el grafo no lo declara — un
 * modulo sin medir no recibe papel inventado.
 */
export function roleOf(nombre: string, grafo: Map<string, string[]>): Role | null {
  const salidas = grafo.get(nombre)
  if (salidas === undefined) return null
  let importado = false
  for (const [, destinos] of grafo) {
    if (destinos.includes(nombre)) { importado = true; break }
  }
  if (!importado) return 'entrada'
  return salidas.length === 0 ? 'hoja' : 'interno'
}

/**
 * Plan de reparto: modulo → ruta destino. No mueve nada; devolver el plan
 * separado de su aplicacion deja que se revise antes de tocar el disco.
 */
export function organize(grafo: Map<string, string[]>): Map<string, string> {
  const plan = new Map<string, string>()
  for (const nombre of grafo.keys()) {
    const papel = roleOf(nombre, grafo)
    if (papel !== null) plan.set(nombre, `${papel}/${nombre}`)
  }
  return plan
}
