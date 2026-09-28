/**
 * Texto de terceros con tope: leer un archivo sólo si es regular y cabe, y
 * reducir un texto a una línea mostrable. Porte de `cl`, `rLo`, `OP`, `oLo`,
 * `lfn`, `aFt`, `t3n`, `g` y `XFr` (`chunk-q8a07cv0.js`), de `YH` con `wt`
 * y sus clases (`chunk-pbnxt79v.js`), y de `ot`, `ie` y `_a`
 * (`chunk-8w2y72gy.js`, `chunk-y0kwrsd8.js`) de 2.1.283.
 */
import { lstatSync, readFileSync, type Stats } from 'node:fs'
import { lstat, readFile } from 'node:fs/promises'

import { sliceUnits } from './displayText.ts'

/** `t3n`: unidades de la línea resumida. */
const SUMMARY_UNITS = 512
/** `g`: unidades de una línea que se llegan a mirar. */
const LINE_SCAN_UNITS = 4 * SUMMARY_UNITS
/** `XFr`: ancho en celdas del resumen de una línea. */
const ONE_LINE_WIDTH = 120

/** `cl`: el contenido de `path` si es un archivo regular, sin seguir enlaces, de `max` bytes como mucho. */
export async function readCappedFile(path: string, max: number): Promise<string | null> {
  try {
    const stats = await lstat(path)
    if (!stats.isFile() || stats.size > max) return null
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

/** `rLo`: la forma síncrona de `cl`. */
export function readCappedFileSync(path: string, max: number): string | null {
  try {
    const stats = lstatSync(path)
    if (!stats.isFile() || stats.size > max) return null
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

export type CappedReadFs = {
  stat: (path: string) => Promise<Stats>
  readFile: (path: string, options: { encoding: 'utf8' }) => Promise<string>
}
export type CappedReadFsSync = {
  statSync: (path: string) => Stats
  readFileSync: (path: string, options: { encoding: 'utf8' }) => string
}

/** `OP`: como `cl` sobre un sistema de archivos dado, que sigue enlaces; un error se propaga. */
export async function readCappedWith(fs: CappedReadFs, path: string, max: number, onRejected?: (stats: Stats) => void): Promise<string | null> {
  const stats = await fs.stat(path)
  if (!stats.isFile() || stats.size > max) {
    onRejected?.(stats)
    return null
  }
  return await fs.readFile(path, { encoding: 'utf8' })
}

/** `oLo`: la forma síncrona de `OP`, sin aviso de rechazo. */
export function readCappedWithSync(fs: CappedReadFsSync, path: string, max: number): string | null {
  const stats = fs.statSync(path)
  if (!stats.isFile() || stats.size > max) return null
  return fs.readFileSync(path, { encoding: 'utf8' })
}

/** `s`/`cde`: controles, formato, sustitutos, uso privado, no asignados e ignorables. */
const CONTROL_CLASS = '\\p{Cc}\\p{Cf}\\p{Cs}\\p{Co}\\p{Cn}\\u2028\\u2029\\p{Default_Ignorable_Code_Point}\\u2800'
/** `o`: los que unen o eligen la forma de un emoji. */
const EMOJI_JOINERS = '\\u200D\\uFE0E\\uFE0F'
const ALL_CONTROLS = new RegExp(`[${CONTROL_CLASS}]+`, 'gu')
const CONTROLS_BUT_JOINERS = new RegExp(`(?:(?![${EMOJI_JOINERS}])[${CONTROL_CLASS}])+`, 'gu')
const CONTROLS_BUT_JOINERS_AND_NEWLINES = new RegExp(`(?:(?![${EMOJI_JOINERS}\\n])[${CONTROL_CLASS}])+`, 'gu')
const LEADING_JOINERS = new RegExp(`(?<!\\S)[${EMOJI_JOINERS}]+`, 'gu')

export type ReplaceControlsOptions = { keepNewlines?: boolean; keepEmojiJoiners?: boolean }

/**
 * `YH`: sin ANSI, y cada tramo de controles sustituido por `replacement`. Con
 * `keepEmojiJoiners` (o `keepNewlines`) los que unen un emoji se conservan,
 * salvo al principio de una palabra.
 */
export function replaceControls(text: string, replacement: string, options?: ReplaceControlsOptions): string {
  const keepJoiners = options?.keepNewlines === true || options?.keepEmojiJoiners === true
  const pattern = options?.keepNewlines ? CONTROLS_BUT_JOINERS_AND_NEWLINES : keepJoiners ? CONTROLS_BUT_JOINERS : ALL_CONTROLS
  const replaced = Bun.stripANSI(text.replace(/\p{Cs}/gu, '​')).replace(pattern, replacement)
  return keepJoiners ? replaced.replace(LEADING_JOINERS, '') : replaced
}

let graphemeSegmenter: Intl.Segmenter | undefined

/** `ie`: ancho en celdas, con los ambiguos estrechos. */
function cellWidth(text: string): number {
  return Bun.stringWidth(text, { ambiguousIsNarrow: true })
}

/** `ot`: corta a `width` celdas por grafemas, con elipsis. */
export function truncateToWidth(text: string, width: number): string {
  if (cellWidth(text) <= width) return text
  if (width <= 1) return '…'
  graphemeSegmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  let used = 0
  let kept = ''
  for (const { segment } of graphemeSegmenter.segment(text)) {
    const segmentWidth = cellWidth(segment)
    if (used + segmentWidth > width - 1) break
    kept += segment
    used += segmentWidth
  }
  return `${kept}…`
}

/**
 * `lfn`: la primera línea que no queda vacía tras `transform`, con los
 * espacios colapsados y cortada a 512 unidades. Una línea que excede lo que
 * se mira termina ahí, aunque quede vacía, con elipsis.
 */
export function firstLineSummary(text: string, transform: (line: string) => string): string {
  let start = 0
  while (start <= text.length) {
    const newline = text.indexOf('\n', start)
    const end = newline === -1 ? text.length : newline
    const withinScan = end - start <= LINE_SCAN_UNITS
    const line = sliceUnits(text.slice(start, Math.min(end, start + LINE_SCAN_UNITS)), LINE_SCAN_UNITS)
    const flat = transform(line).replace(/\s+/g, ' ').trim()
    if (flat !== '' || !withinScan) {
      const cut = sliceUnits(flat, SUMMARY_UNITS)
      return !withinScan || cut.length < flat.length ? `${cut}…` : cut
    }
    if (newline === -1) break
    start = newline + 1
  }
  return ''
}

/** `aFt`: la primera línea con contenido, sin controles, en 120 celdas. */
export function oneLineSummary(text: string): string {
  const line = firstLineSummary(text, piece => replaceControls(piece, ' ', { keepEmojiJoiners: true }))
  return line === '' ? '' : truncateToWidth(line, ONE_LINE_WIDTH)
}
