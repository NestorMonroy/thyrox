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
/** El volcado de cadenas del ejecutable entero: la forma de `strings -n 4`. */
export const STRINGS = 'claude_strings.txt'
/** La descripcion del corpus, derivada del MANIFEST y del volcado. */
export const README = 'README.md'
/** Longitud minima de una cadena: la de `strings -n 4`, con que se citan todas. */
const MIN_STRING = 4

/**
 * Las corridas de caracteres imprimibles de al menos `MIN_STRING` bytes, una
 * por linea: lo que `strings -n 4` de GNU imprime (ASCII 0x20-0x7e mas el
 * tabulador). El volcado se cita contra esa herramienta, asi que tiene que
 * coincidir con ella byte a byte; el test lo compara con la real.
 */
export function extractStrings(bytes: Buffer, minimum: number = MIN_STRING): string {
  const salida: string[] = []
  let inicio = -1
  for (let i = 0; i <= bytes.length; i++) {
    const b = i < bytes.length ? bytes[i] : -1
    const imprimible = b === 9 || (b >= 32 && b < 127)
    if (imprimible && inicio < 0) inicio = i
    if (!imprimible && inicio >= 0) {
      if (i - inicio >= minimum) salida.push(bytes.toString('latin1', inicio, i))
      inicio = -1
    }
  }
  return salida.length ? salida.join('\n') + '\n' : ''
}

/**
 * El README de una build, derivado de sus cifras — no se transcribe a mano
 * (`calibration-verified-numbers.md`) — con la forma del de 2.1.281.
 */
export function renderReadme(version: string, files: number, bytes: number, stringLines: number): string {
  const base = `_references/claude-code-bin/${version}`
  return [
    `# claude-code ${version} — corpus extraído`, '',
    'Extraído con `@thyrox/binary` (`bun src/packages/binary/bin/binary.ts extract`).',
    'Este README se **deriva** del `MANIFEST.tsv` y del historial, no se transcribe:',
    'la cifra que vive en un artefacto que crece no se copia a prosa',
    '(`calibration-verified-numbers.md`).', '',
    '| Eje | Valor |', '|---|---|',
    `| Archivos en \`bunfs-root/\` | ${files} |`,
    `| Bytes de contenido | ${bytes} |`,
    '| Primer commit del MANIFEST | (sin registrar) |', '',
    `\`claude_strings.txt\` — ${stringLines} líneas.`, '',
    'Para re-derivar estas cifras sin leer este archivo:', '',
    '```bash',
    `gawk 'NR>1' ${base}/MANIFEST.tsv | wc -l`,
    `gawk 'NR>1 {s+=$2} END{print s}' ${base}/MANIFEST.tsv`,
    `git log --diff-filter=A --format=%cI -1 -- ${base}/MANIFEST.tsv`,
    '```', '',
  ].join('\n')
}

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
  binary?: Buffer,
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
  if (binary) {
    // El volcado y el README son parte del corpus: una build sin ellos queda
    // a medias y alguien los termina a mano (medido en 2.1.282).
    const cadenas = extractStrings(binary)
    writeFileSync(join(base, STRINGS), cadenas)
    const lineas = cadenas ? cadenas.split('\n').length - 1 : 0
    writeFileSync(join(base, README), renderReadme(version, entries.length, total, lineas))
  }
  return { root: base, files: entries.length, bytes: total }
}
