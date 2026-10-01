/**
 * La ingesta de findings al corpus semántico (ADR-008 D5, TASK-THYROX-0684).
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

/** De dónde viene lo que se ingiere: el nombre del repositorio y su commit, si es un árbol de git. */
export type IngestionSource = { label: string; revision: string | null }

export type RecognizedDocument = { relativePath: string; document: DocumentInput }

export type Recognition = { recognized: RecognizedDocument[]; unrecognized: string[] }

export type IngestionSummary = { created: number; newVersion: number; unchanged: number }

const FINDING_FILE = /^hallazgo-(H-[A-Z]+-\d+)-.*\.rst$/
const EXCLUDED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build'])

export function recognizeFindings(root: string, source: IngestionSource): Recognition {
  const recognition: Recognition = { recognized: [], unrecognized: [] }
  for (const path of findingFilesUnder(root)) {
    const relativePath = relative(root, path).split(sep).join('/')
    const document = findingDocument(relativePath, readFileSync(path, 'utf8'), source)
    if (document) recognition.recognized.push({ relativePath, document })
    else recognition.unrecognized.push(relativePath)
  }
  return recognition
}

export async function ingestFindings(store: SemanticSearchStore, recognized: readonly RecognizedDocument[]): Promise<IngestionSummary> {
  const counts: Record<IngestStatus, number> = { created: 0, 'new-version': 0, unchanged: 0 }
  for (const { document } of recognized) counts[(await store.ingestDocument(document)).status] += 1
  return { created: counts.created, newVersion: counts['new-version'], unchanged: counts.unchanged }
}

function findingDocument(relativePath: string, text: string, source: IngestionSource): DocumentInput | undefined {
  const findingId = FINDING_FILE.exec(relativePath.split('/').at(-1) ?? '')?.[1]
  if (findingId === undefined) return undefined
  const { metadata, chunks } = parseRstDocument(text)
  if (chunks.length === 0) return undefined
  return {
    domain: FINDING_DOMAIN,
    scope: DOMAIN_WIDE_SCOPE,
    domainId: findingId,
    sourceRef: `${source.label}:${relativePath}`,
    sourceRevision: source.revision,
    metadata,
    chunks,
  }
}

function findingFilesUnder(root: string): string[] {
  const files: string[] = []
  const pending = [root]
  while (pending.length > 0) {
    const directory = pending.pop() as string
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && !EXCLUDED_DIRECTORIES.has(entry.name)) pending.push(join(directory, entry.name))
      else if (entry.isFile() && FINDING_FILE.test(entry.name)) files.push(join(directory, entry.name))
    }
  }
  return files.sort()
}
