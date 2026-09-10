/**
 * Grafo de dependencias entre los modulos del contenedor.
 *
 * El empaquetador conserva los imports ENTRE chunks —son ficheros distintos
 * dentro del sistema de archivos virtual— aunque haya borrado las fronteras
 * DENTRO de cada uno. Ese grafo es la unica estructura de alto nivel que
 * sobrevive al empaquetado, y es lo que permite decir «este simbolo vive en el
 * chunk que importan estos otros» en vez de «aparece en el volcado».
 *
 * Medido sobre 2.1.258: en una muestra de 400 modulos `.js`, 326 declaran al
 * menos un import y suman 2680 aristas.
 */
import { BUNFS_PREFIX, type ModuleEntry } from './bunfs.ts'

/**
 * Las dos formas que el empaquetador emite. Se exige la palabra clave
 * (`from"…"`) y no la mera aparicion de la raiz virtual: esa cadena tambien
 * sale en mensajes de diagnostico del propio cliente, y contarla inflaria el
 * grafo con aristas inexistentes.
 */
const IMPORT_RE = /\bfrom\s*"\/\$bunfs\/root\/([^"]+)"/g

export type Graph = {
  /** modulo → modulos que importa */
  nodes: Map<string, string[]>
  edges: number
  /** destinos que ningun modulo declara: si hay alguno, el patron leyo de mas */
  dangling: string[]
}

/** Los modulos que `src` importa, sin repetidos y sin el propio `self`. */
export function importsOf(src: string, self?: string): string[] {
  const vistos = new Set<string>()
  for (const m of src.matchAll(IMPORT_RE)) {
    const destino = m[1]
    if (destino === self) continue
    vistos.add(destino)
  }
  return [...vistos]
}

/** Construye el grafo sobre los modulos `.js` de la tabla. */
export function buildGraph(payload: Buffer, entries: ModuleEntry[]): Graph {
  const js = entries.filter(e => e.name.endsWith('.js'))
  const conocidos = new Set(js.map(e => e.name.slice(BUNFS_PREFIX.length)))
  const nodes = new Map<string, string[]>()
  const dangling = new Set<string>()
  let edges = 0

  for (const e of js) {
    const propio = e.name.slice(BUNFS_PREFIX.length)
    const src = payload.subarray(e.offset, e.offset + e.length).toString('utf8')
    const destinos = importsOf(src, propio)
    for (const d of destinos) if (!conocidos.has(d)) dangling.add(d)
    nodes.set(propio, destinos)
    edges += destinos.length
  }
  return { nodes, edges, dangling: [...dangling] }
}
