/**
 * La ingesta por dominio al corpus semántico (ADR-008 D5, TASK-THYROX-0684):
 * `finding` y `error`, cada uno reconocido por su nombre de archivo en una
 * tabla. Un error es `error-ERR-NNN-*.rst` y su identidad `error / ERR-NNN`;
 * lo demás de abajo vale igual para los dos.
 *
 * Un finding se reconoce por su nombre, `hallazgo-H-<PREFIJO>-NNN-*.rst`, que
 * es el contrato de `kaupamex-docs`; su identidad es `finding / H-…`, única en
 * todo el dominio (`check_finding_id_unique.py`), así que el scope es el del
 * dominio entero y la ruta local del clon nunca forma parte de ella. La ruta
 * relativa al repositorio y su commit quedan como procedencia.
 *
 * El recorrido es deliberado: sólo la raíz que se nombra, sin entrar en
 * `.git`, `node_modules`, `dist` ni `build`. Un archivo con nombre de finding
 * que no da texto queda como no reconocido, nombrado, para que ningún
 * veredicto lo dé por preservado.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { DOMAIN_WIDE_SCOPE, type DocumentInput, type IngestStatus } from './corpus.ts'
import { parseRstDocument } from './rstDocument.ts'
import type { SemanticSearchStore } from './store.ts'

export const FINDING_DOMAIN = 'finding'
export const ERROR_DOMAIN = 'error'

/** De dónde viene lo que se ingiere: el nombre del repositorio y su commit, si es un árbol de git. */
export type IngestionSource = { label: string; revision: string | null }

export type RecognizedDocument = { relativePath: string; document: DocumentInput }

export type Recognition = { recognized: RecognizedDocument[]; unrecognized: string[] }

export type IngestionSummary = { created: number; newVersion: number; unchanged: number }

/** El nombre de archivo que identifica un documento de cada dominio; el grupo 1 es su identidad. */
const DOCUMENT_FILES: Readonly<Record<string, RegExp>> = {
  [FINDING_DOMAIN]: /^hallazgo-(H-[A-Z]+-\d+)-.*\.rst$/,
  [ERROR_DOMAIN]: /^error-(ERR-\d+)-.*\.rst$/,
}
const EXCLUDED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build'])

/** Los dominios que tienen reconocedor, en orden de declaración. */
export function recognizedDomains(): string[] {
  return Object.keys(DOCUMENT_FILES)
}

/** Reconoce los documentos de un dominio bajo una raíz; un dominio sin reconocedor se rehúsa. */
export function recognizeDocuments(domain: string, root: string, source: IngestionSource): Recognition {
  const pattern = DOCUMENT_FILES[domain]
  if (pattern === undefined) throw new Error(`el dominio «${domain}» no tiene reconocedor; hoy: ${recognizedDomains().join(', ')}`)
  const recognition: Recognition = { recognized: [], unrecognized: [] }
  for (const path of documentFilesUnder(root, pattern)) {
    const relativePath = relative(root, path).split(sep).join('/')
    const document = domainDocument(domain, pattern, relativePath, readFileSync(path, 'utf8'), source)
    if (document) recognition.recognized.push({ relativePath, document })
    else recognition.unrecognized.push(relativePath)
  }
  return recognition
}

export function recognizeFindings(root: string, source: IngestionSource): Recognition {
  return recognizeDocuments(FINDING_DOMAIN, root, source)
}

export function recognizeErrors(root: string, source: IngestionSource): Recognition {
  return recognizeDocuments(ERROR_DOMAIN, root, source)
}

export async function ingestFindings(store: SemanticSearchStore, recognized: readonly RecognizedDocument[]): Promise<IngestionSummary> {
  const counts: Record<IngestStatus, number> = { created: 0, 'new-version': 0, unchanged: 0 }
  for (const { document } of recognized) counts[(await store.ingestDocument(document)).status] += 1
  return { created: counts.created, newVersion: counts['new-version'], unchanged: counts.unchanged }
}

function domainDocument(domain: string, pattern: RegExp, relativePath: string, text: string, source: IngestionSource): DocumentInput | undefined {
  const domainId = pattern.exec(relativePath.split('/').at(-1) ?? '')?.[1]
  if (domainId === undefined) return undefined
  const { metadata, chunks } = parseRstDocument(text)
  if (chunks.length === 0) return undefined
  return {
    domain,
    scope: DOMAIN_WIDE_SCOPE,
    domainId,
    sourceRef: `${source.label}:${relativePath}`,
    sourceRevision: source.revision,
    metadata,
    chunks,
  }
}

function documentFilesUnder(root: string, pattern: RegExp): string[] {
  const files: string[] = []
  const pending = [root]
  while (pending.length > 0) {
    const directory = pending.pop() as string
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && !EXCLUDED_DIRECTORIES.has(entry.name)) pending.push(join(directory, entry.name))
      else if (entry.isFile() && pattern.test(entry.name)) files.push(join(directory, entry.name))
    }
  }
  return files.sort()
}
