/**
 * Escritura del corpus de una build.
 *
 * La salida NO es la raiz sino `<raiz>/<version>/`: la version la declara el
 * propio payload, y una build ya extraida no se pisa. Un directorio tecleado a
 * mano puede mentir sobre lo que contiene, y entonces el corpus deja de ser
 * comparable entre builds.
 *
 * El `MANIFEST.tsv` conserva las cuatro columnas que el probe Python ya
 * escribio para 2.1.246 — `archivo`, `bytes`, `tipo`, `sha256`. El SHA-256 es
 * lo que hace verificable la extraccion: cualquiera la repite sobre el mismo
 * binario y compara, sin confiar en este codigo.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { BUNFS_PREFIX, BUNFS_ROOT_DIR, type ModuleEntry } from './bunfs.ts'

/** El archivo que declara que una build esta extraida. Lo comparte `freshness`. */
export const MANIFEST = 'MANIFEST.tsv'

export type CorpusResult = { root: string; files: number; bytes: number }

/** `texto`, `binario`, o `mixto-NNpc` con el porcentaje imprimible medido. */
function measureType(bytes: Buffer): string {
  if (bytes.length === 0) return 'texto'
  let imprimibles = 0
  for (const b of bytes) if (b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127)) imprimibles++
  const pc = Math.round((imprimibles / bytes.length) * 100)
  if (pc === 100) return 'texto'
  if (pc < 20) return 'binario'
  return `mixto-${pc}pc`
}

/**
 * La ruta en disco de una entrada, confinada bajo el directorio que le toca.
 *
 * El confinamiento se mide contra `base/bunfs-root` y no contra `base`: un
 * nombre con un solo `..` sale de la raiz virtual sin salir del corpus, y
 * `join` lo normaliza antes de que ningun guard lo vea. Comprobarlo contra
 * `base` deja pasar exactamente ese caso — lo destapo el test, no una lectura
 * del codigo.
 */
function safeTarget(base: string, name: string): string {
  const conPrefijo = name.startsWith(BUNFS_PREFIX)
  const raiz = conPrefijo ? resolve(base, BUNFS_ROOT_DIR) : resolve(base)
  const rel = conPrefijo ? name.slice(BUNFS_PREFIX.length) : name.replace(/^\/+/, '')
  const destino = resolve(raiz, rel)
  // El nombre viene del binario, no de nosotros. Se rechaza en vez de
  // sanearse: sanear escondería la anomalia en vez de reportarla.
  const desviacion = relative(raiz, destino)
  if (desviacion.startsWith('..') || isAbsolute(desviacion)) {
    throw new Error(`ruta fuera de la raiz del corpus: ${name}`)
  }
  return destino
}

export function writeCorpus(
  root: string,
  version: string,
  payload: Buffer,
  entries: ModuleEntry[],
): CorpusResult {
  const base = join(root, version)
  // El discriminador es el MANIFEST, el mismo que usa `corpusVersion`. Con la
  // existencia del directorio, un `2.1.258/` que solo trae prosa quedaba a la
  // vez «sin corpus» para el gate e «intocable» para la escritura.
  if (existsSync(join(base, MANIFEST))) throw new Error(`version ya extraida: ${base}`)

  const filas: string[] = ['archivo\tbytes\ttipo\tsha256']
  let total = 0

  for (const e of entries) {
    const destino = safeTarget(base, e.name)
    const datos = payload.subarray(e.offset, e.offset + e.length)
    mkdirSync(dirname(destino), { recursive: true })
    writeFileSync(destino, datos)
    const sha = new Bun.CryptoHasher('sha256').update(datos).digest('hex')
    filas.push([relative(base, destino), datos.length, measureType(datos), sha].join('\t'))
    total += datos.length
  }

  writeFileSync(join(base, MANIFEST), filas.join('\n') + '\n')
  return { root: base, files: entries.length, bytes: total }
}
