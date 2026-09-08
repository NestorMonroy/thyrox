/**
 * Puerto de `ccnmt: packages/tool-registry/src/readEditContext.ts`
 * (227 líneas, 5 símbolos exportados). Encontrar una aguja en un archivo
 * sin cargar el pajar, y devolver su vecindario con el número de línea.
 *
 * POR QUÉ NO SE LEE EL ARCHIVO ENTERO. Una edición sólo necesita el trozo
 * alrededor de la coincidencia; cargar un archivo de decenas de megas para
 * mostrar siete líneas gasta memoria proporcional al archivo, no al
 * trabajo. Se escanea en trozos de 8 KB con tope duro.
 *
 * EL SOLAPE es la pieza que no se lee sola: una aguja puede caer A CABALLO
 * entre dos lecturas, y un escáner ingenuo la perdería EN SILENCIO —
 * devolvería «no está» sobre un archivo donde sí está. Por eso la cola del
 * trozo anterior se arrastra al principio del siguiente, dimensionada para
 * la forma MÁS LARGA de la aguja (la de CRLF).
 *
 * LF CONTRA CRLF. El modelo escribe LF; el archivo del usuario puede venir
 * en CRLF. Sin la segunda pasada, toda edición multilínea sobre un archivo
 * de Windows fallaría por «no encontrado». La forma CRLF se codifica
 * PEREZOSAMENTE: sólo cuando la pasada en LF falla y la aguja tiene saltos.
 *
 * `truncated` distingue «no está» de «no cabía»: con un solo booleano de
 * fallo el llamador no sabría si reintentar con más presupuesto.
 */
import { type FileHandle, open } from 'fs/promises'
import { isENOENT } from '@thyrox/local-observability/errorHelpers.js'

export const CHUNK_SIZE = 8 * 1024
export const MAX_SCAN_BYTES = 10 * 1024 * 1024
const NEWLINE = 0x0a

export type EditContext = {
  /** El trozo: `contextLines` antes y después, cortado en línea entera. */
  content: string
  /** Línea 1-basada donde empieza `content` dentro del archivo original. */
  lineOffset: number
  /** Cierto si se agotó `MAX_SCAN_BYTES` sin encontrar la aguja. */
  truncated: boolean
}

/**
 * Busca `needle` en `path` y devuelve su vecindario. `null` si el archivo
 * no existe; `{ content: '', truncated: true }` si no apareció dentro del
 * tope.
 */
export async function readEditContext(
  path: string,
  needle: string,
  contextLines = 3,
): Promise<EditContext | null> {
  const handle = await openForScan(path)
  if (handle === null) return null
  try {
    return await scanForContext(handle, needle, contextLines)
  } finally {
    await handle.close()
  }
}

/** Abre para lectura. `null` si no existe. El llamador cierra. */
export async function openForScan(path: string): Promise<FileHandle | null> {
  try {
    return await open(path, 'r')
  } catch (e) {
    if (isENOENT(e)) return null
    throw e
  }
}

/** El núcleo, sobre un descriptor ya abierto. El llamador abre y cierra. */
export async function scanForContext(
  handle: FileHandle,
  needle: string,
  contextLines: number,
): Promise<EditContext> {
  if (needle === '') return { content: '', lineOffset: 1, truncated: false }

  const needleLF = Buffer.from(needle, 'utf8')
  // Se cuentan los saltos para dimensionar el solape a la forma CRLF, que
  // es la más larga; codificarla ya sería trabajo que casi nunca hace falta.
  let newlineCount = 0
  for (let i = 0; i < needleLF.length; i++) {
    if (needleLF[i] === NEWLINE) newlineCount++
  }
  let needleCRLF: Buffer | undefined
  const overlap = needleLF.length + newlineCount - 1

  const buf = Buffer.allocUnsafe(CHUNK_SIZE + overlap)
  let pos = 0
  let linesBeforePos = 0
  let prevTail = 0

  while (pos < MAX_SCAN_BYTES) {
    const { bytesRead } = await handle.read(buf, prevTail, CHUNK_SIZE, pos)
    if (bytesRead === 0) break
    const viewLen = prevTail + bytesRead

    let matchAt = indexOfWithin(buf, needleLF, viewLen)
    let matchLen = needleLF.length
    if (matchAt === -1 && newlineCount > 0) {
      needleCRLF ??= Buffer.from(needle.replaceAll('\n', '\r\n'), 'utf8')
      matchAt = indexOfWithin(buf, needleCRLF, viewLen)
      matchLen = needleCRLF.length
    }
    if (matchAt !== -1) {
      const absoluteMatch = pos - prevTail + matchAt
      return await sliceContext(
        handle,
        buf,
        absoluteMatch,
        matchLen,
        contextLines,
        linesBeforePos + countNewlines(buf, 0, matchAt),
      )
    }

    pos += bytesRead
    // El contador tiene que sobrevivir al desplazamiento: cuenta los saltos
    // de los bytes que se DESCARTAN, no los del búfer. Si se reiniciara con
    // cada trozo, el número de línea de una coincidencia tardía sería el
    // del trozo — un número plausible y equivocado, que no rompe nada.
    const nextTail = Math.min(overlap, viewLen)
    linesBeforePos += countNewlines(buf, 0, viewLen - nextTail)
    prevTail = nextTail
    buf.copyWithin(0, viewLen - prevTail, viewLen)
  }

  return { content: '', lineOffset: 1, truncated: pos >= MAX_SCAN_BYTES }
}

/**
 * Lee el archivo entero hasta el tope; `null` si lo excede. Para la ruta
 * multi-edición, donde los reemplazos secuenciales necesitan la cadena
 * completa.
 *
 * Un solo búfer que dobla al llenarse: ~log2(tamaño/8KB) reservas en vez
 * de N trozos más una concatenación, y se lee directo al desplazamiento
 * correcto, sin copias intermedias.
 */
export async function readCapped(handle: FileHandle): Promise<string | null> {
  let buf = Buffer.allocUnsafe(CHUNK_SIZE)
  let total = 0
  for (;;) {
    if (total === buf.length) {
      const grown = Buffer.allocUnsafe(
        Math.min(buf.length * 2, MAX_SCAN_BYTES + CHUNK_SIZE),
      )
      buf.copy(grown, 0, 0, total)
      buf = grown
    }
    const { bytesRead } = await handle.read(buf, total, buf.length - total, total)
    if (bytesRead === 0) break
    total += bytesRead
    if (total > MAX_SCAN_BYTES) return null
  }
  return normalizeCRLF(buf, total)
}

/** `indexOf` acotado a `[0, end)` sin reservar una vista. */
function indexOfWithin(buf: Buffer, needle: Buffer, end: number): number {
  const at = buf.indexOf(needle)
  return at === -1 || at + needle.length > end ? -1 : at
}

function countNewlines(buf: Buffer, start: number, end: number): number {
  let n = 0
  for (let i = start; i < end; i++) if (buf[i] === NEWLINE) n++
  return n
}

/** Decodifica `buf[0..len)`, normalizando CRLF sólo si hay algún CR. */
function normalizeCRLF(buf: Buffer, len: number): string {
  const s = buf.toString('utf8', 0, len)
  return s.includes('\r') ? s.replaceAll('\r\n', '\n') : s
}

/**
 * Dado el desplazamiento absoluto de la coincidencia, lee ±contextLines a
 * su alrededor. Reusa `scratch` —el búfer de escaneo del llamador— para
 * las tres lecturas: cero reservas nuevas cuando el contexto cabe.
 */
async function sliceContext(
  handle: FileHandle,
  scratch: Buffer,
  matchStart: number,
  matchLen: number,
  contextLines: number,
  linesBeforeMatch: number,
): Promise<EditContext> {
  // Hacia atrás, hasta encontrar `contextLines` saltos previos.
  const backChunk = Math.min(matchStart, CHUNK_SIZE)
  const { bytesRead: backRead } = await handle.read(
    scratch,
    0,
    backChunk,
    matchStart - backChunk,
  )
  let ctxStart = matchStart
  let newlinesSeen = 0
  for (let i = backRead - 1; i >= 0 && newlinesSeen <= contextLines; i--) {
    if (scratch[i] === NEWLINE) {
      newlinesSeen++
      if (newlinesSeen > contextLines) break
    }
    ctxStart--
  }
  // El desplazamiento de línea se calcula AQUÍ, antes de que la lectura
  // hacia adelante sobreescriba `scratch`.
  const walkedBack = matchStart - ctxStart
  const lineOffset =
    linesBeforeMatch - countNewlines(scratch, backRead - walkedBack, backRead) + 1

  // Hacia adelante, hasta `contextLines` saltos tras el final.
  const matchEnd = matchStart + matchLen
  const { bytesRead: forwardRead } = await handle.read(
    scratch,
    0,
    CHUNK_SIZE,
    matchEnd,
  )
  let ctxEnd = matchEnd
  newlinesSeen = 0
  for (let i = 0; i < forwardRead; i++) {
    ctxEnd++
    if (scratch[i] === NEWLINE) {
      newlinesSeen++
      if (newlinesSeen >= contextLines + 1) break
    }
  }

  const len = ctxEnd - ctxStart
  const out = len <= scratch.length ? scratch : Buffer.allocUnsafe(len)
  const { bytesRead: outRead } = await handle.read(out, 0, len, ctxStart)

  return { content: normalizeCRLF(out, outRead), lineOffset, truncated: false }
}
