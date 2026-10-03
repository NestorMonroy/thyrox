/**
 * Un documento RST preparado para el corpus semántico (ADR-008, D5;
 * TASK-THYROX-0684): el bloque `.. meta::` pasa a metadata y el cuerpo se
 * parte en chunks, uno por sección. Una sección más larga que el tope se
 * parte por párrafos, y un párrafo más largo que el tope, por caracteres:
 * ningún texto del cuerpo se pierde.
 *
 * El texto anterior al primer encabezado (las etiquetas `.. _ref:`) se une al
 * final del primer chunk, para que cada chunk empiece por su título.
 */

export type ParsedRstDocument = {
  metadata: Record<string, string>
  chunks: string[]
}

/** Tope de caracteres de un chunk: holgado para un modelo de embeddings de 512 tokens o más. */
export const MAX_CHUNK_CHARACTERS = 2000

const META_DIRECTIVE = '.. meta::'
const META_FIELD = /^\s+:([^:]+):\s*(.*)$/
const ADORNMENT = /^([=\-~^"'`#*+<>:._])\1+$/
const PARAGRAPH_BREAK = /\n\s*\n/
const PARAGRAPH_SEPARATOR = '\n\n'

type Section = { lines: string[] }

export function parseRstDocument(text: string): ParsedRstDocument {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const metadata: Record<string, string> = {}
  const body = withoutMetaBlock(lines, metadata)
  const { preamble, sections } = splitSections(body)
  const chunks = sections.flatMap((section, index) => chunksOf(sectionText(section, index === 0 ? preamble : [])))
  if (sections.length === 0) chunks.push(...chunksOf(preamble.join('\n')))
  return { metadata, chunks }
}

/** Retira el bloque `.. meta::` y sus campos indentados, que guarda en `metadata`. */
function withoutMetaBlock(lines: readonly string[], metadata: Record<string, string>): string[] {
  const body: string[] = []
  let inMeta = false
  for (const line of lines) {
    if (line.trim() === META_DIRECTIVE) {
      inMeta = true
      continue
    }
    if (inMeta && (line.trim() === '' || /^\s/.test(line))) {
      const field = META_FIELD.exec(line)
      if (field) metadata[(field[1] as string).trim()] = (field[2] as string).trim()
      continue
    }
    inMeta = false
    body.push(line)
  }
  return body
}

function isHeading(lines: readonly string[], index: number): boolean {
  const title = lines[index] as string
  const underline = lines[index + 1]
  if (underline === undefined || title.trim() === '' || /^\s/.test(title)) return false
  return ADORNMENT.test(underline.trim()) && [...underline.trim()].length >= [...title.trimEnd()].length
}

function splitSections(lines: readonly string[]): { preamble: string[]; sections: Section[] } {
  const preamble: string[] = []
  const sections: Section[] = []
  for (let index = 0; index < lines.length; index += 1) {
    if (isHeading(lines, index)) {
      dropOverline(sections.at(-1)?.lines ?? preamble, lines[index + 1] as string)
      sections.push({ lines: [lines[index] as string] })
      index += 1
      continue
    }
    ;(sections.at(-1)?.lines ?? preamble).push(lines[index] as string)
  }
  return { preamble, sections }
}

/** Un título con sobrelínea deja el adorno superior al final de lo anterior: no es texto. */
function dropOverline(previous: string[], underline: string): void {
  if (previous.at(-1)?.trim() === underline.trim()) previous.pop()
}

function sectionText(section: Section, preamble: readonly string[]): string {
  return [...section.lines, '', ...preamble].join('\n').trim()
}

function chunksOf(text: string): string[] {
  const trimmed = text.trim()
  if (trimmed === '') return []
  if (trimmed.length <= MAX_CHUNK_CHARACTERS) return [trimmed]
  return packParagraphs(trimmed.split(PARAGRAPH_BREAK).map(paragraph => paragraph.trim()).filter(paragraph => paragraph !== ''))
}

/** Junta párrafos hasta el tope; un párrafo que solo ya lo pasa se corta por caracteres. */
function packParagraphs(paragraphs: readonly string[]): string[] {
  const chunks: string[] = []
  let current = ''
  for (const paragraph of paragraphs.flatMap(splitOversized)) {
    const joined = current === '' ? paragraph : `${current}${PARAGRAPH_SEPARATOR}${paragraph}`
    if (joined.length <= MAX_CHUNK_CHARACTERS) {
      current = joined
      continue
    }
    chunks.push(current)
    current = paragraph
  }
  if (current !== '') chunks.push(current)
  return chunks
}

function splitOversized(paragraph: string): string[] {
  const pieces: string[] = []
  for (let start = 0; start < paragraph.length; start += MAX_CHUNK_CHARACTERS) pieces.push(paragraph.slice(start, start + MAX_CHUNK_CHARACTERS))
  return pieces
}
