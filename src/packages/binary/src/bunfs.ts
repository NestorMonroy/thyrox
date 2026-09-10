/**
 * El contenedor que Bun escribe dentro de un ejecutable autonomo.
 *
 * El payload NO es bytecode: es JavaScript minificado en claro, precedido por
 * una tabla que dice donde empieza y cuanto mide cada modulo. Por eso el
 * analisis no necesita un descompilador — necesita leer la tabla.
 *
 * Nada de esto esta documentado por Bun: se derivo midiendo el ejecutable, y
 * cada constante de aqui declara contra que se midio.
 */

/** El literal que Bun escribe al cerrar el payload. */
export const BUN_MAGIC = Buffer.from('\n---- Bun! ----\n')

/**
 * La raiz virtual que el payload declara. Aparece en cada import del bundle
 * (`from"/$bunfs/root/chunk-….js"`). NO se retira al extraer: es la estructura
 * que el binario declara, y se conserva como directorio de salida.
 */
export const BUNFS_PREFIX = '/$bunfs/root/'

/** Su forma en disco: sin el `$`, que en una ruta es un peligro de shell. */
export const BUNFS_ROOT_DIR = 'bunfs-root'

/**
 * La seccion `.bun` antepone ocho bytes de cabecera al payload. Los punteros
 * del trailer son relativos al PAYLOAD, no a la seccion: sin restar esto, la
 * tabla se lee corrida y produce basura en vez de rutas.
 */
export const SECTION_HEADER = 8

/** Pasos candidatos entre entradas de la tabla. El correcto se DERIVA. */
const STRIDE_CANDIDATES = [36, 40, 44, 48, 52, 56, 60] as const
const MAX_NAME_LENGTH = 512
const MIN_ENTRIES = 3

/** El propio payload declara su version; se deriva de ahi, no del nombre. */
const VERSION_RE = /\/\/ Version: (\d+\.\d+\.\d+)/

export type Trailer = { tableOffset: number; tableLength: number; entryPointId: number }
export type ModuleEntry = { name: string; offset: number; length: number }
export type ModuleTable = { entries: ModuleEntry[]; stride: number; tableLength: number }

/**
 * Lee el trailer. `null` si el payload no lo trae — el fallo tiene que ser
 * distinguible de una tabla vacia, no colapsarse con ella.
 *
 * Los tres campos son u32 con relleno, NO u64: leerlos como u64 devuelve
 * offsets enormes que caen fuera del payload.
 */
export function readTrailer(payload: Buffer): Trailer | null {
  const fin = payload.lastIndexOf(BUN_MAGIC)
  if (fin < 24) return null
  return {
    tableOffset: payload.readUInt32LE(fin - 24),
    tableLength: payload.readUInt32LE(fin - 20),
    entryPointId: payload.readUInt32LE(fin - 4),
  }
}

/** Intenta leer la tabla con un (arranque, paso) dado. `null` si algo falla. */
function tryRead(
  payload: Buffer,
  tableOffset: number,
  tableLength: number,
  start: number,
  stride: number,
): ModuleEntry[] | null {
  const entries: ModuleEntry[] = []
  const limite = tableOffset + tableLength
  let pos = tableOffset + start

  while (pos + 16 <= limite + stride) {
    if (pos + 16 > payload.length) break
    const nameOffset = payload.readUInt32LE(pos)
    const nameLength = payload.readUInt32LE(pos + 4)
    const offset = payload.readUInt32LE(pos + 8)
    const length = payload.readUInt32LE(pos + 12)

    if (nameLength <= 0 || nameLength > MAX_NAME_LENGTH) break
    if (nameOffset + nameLength > payload.length) break
    if (offset + length > payload.length) break

    const name = payload.subarray(nameOffset, nameOffset + nameLength).toString('utf8')
    // Un candidato equivocado produce bytes al azar. Que TODOS los nombres
    // sean imprimibles y cuelguen de la raiz virtual es lo que lo descarta.
    if (!/^[\x20-\x7e]+$/.test(name)) return null
    entries.push({ name, offset, length })
    pos += stride
  }
  return entries.length >= MIN_ENTRIES ? entries : null
}

/**
 * Lee la tabla de modulos derivando su forma.
 *
 * El paso entre entradas no esta declarado en ninguna parte del contenedor, y
 * cambia entre versiones de Bun. Se prueban los candidatos y se acepta el que
 * produce nombres imprimibles bajo la raiz virtual en TODAS sus entradas —
 * criterio que un paso equivocado no puede cumplir por casualidad.
 */
export function readModuleTable(payload: Buffer): ModuleTable | null {
  const trailer = readTrailer(payload)
  if (trailer === null) return null

  let mejor: ModuleTable | null = null
  for (const stride of STRIDE_CANDIDATES) {
    for (let start = 0; start < stride; start += 4) {
      const entries = tryRead(payload, trailer.tableOffset, trailer.tableLength, start, stride)
      if (entries === null) continue
      if (!entries.every(e => e.name.startsWith(BUNFS_PREFIX))) continue
      if (mejor === null || entries.length > mejor.entries.length) {
        mejor = { entries, stride, tableLength: trailer.tableLength }
      }
    }
  }
  return mejor
}

/** La version que el propio payload declara. `null` si no la trae. */
export function deriveVersion(section: Buffer): string | null {
  return VERSION_RE.exec(section.toString('latin1'))?.[1] ?? null
}
