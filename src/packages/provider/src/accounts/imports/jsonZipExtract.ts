/**
 * Los `.json` de un ZIP de archivos de credenciales, con topes de cantidad y
 * tamaño —por archivo y en total— y sin nombres que escapen del archivo.
 *
 * Porte de `omniroute: src/lib/oauth/utils/jsonZipExtract.ts` (MIT); los
 * `claudeAuthZipExtract.ts` y `codexAuthZipExtract.ts` de la referencia son
 * alias de esta misma función.
 */
import { basename, isAbsolute } from 'node:path'

import { type Unzipped, unzipSync } from 'fflate'

export interface ExtractedZipFile {
  name: string
  content: string
}

export interface ExtractZipOptions {
  maxFiles?: number
  maxFileSizeBytes?: number
  maxTotalSizeBytes?: number
}

const DEFAULT_MAX_FILES = 50
const DEFAULT_MAX_FILE_SIZE = 256 * 1024
const DEFAULT_MAX_TOTAL = 10 * 1024 * 1024

const isJsonName = (name: string) => name.toLowerCase().endsWith('.json')

function isSafeEntryName(name: string): boolean {
  return isJsonName(name) && !name.includes('..') && !isAbsolute(name) && !/[\r\n\0]/.test(name)
}

export function extractJsonZip(zipBuffer: Buffer, options: ExtractZipOptions = {}): ExtractedZipFile[] {
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES
  const maxFileSize = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE
  const maxTotal = options.maxTotalSizeBytes ?? DEFAULT_MAX_TOTAL

  let unzipped: Unzipped
  try {
    unzipped = unzipSync(new Uint8Array(zipBuffer))
  } catch {
    throw new Error('Could not parse ZIP archive — file may be corrupt or not a valid ZIP')
  }
  const jsonEntries = Object.entries(unzipped).filter(([name, data]) => data !== undefined && isJsonName(name))
  if (jsonEntries.length === 0) throw new Error('ZIP archive contains no .json files')
  if (jsonEntries.length > maxFiles) throw new Error(`ZIP archive contains ${jsonEntries.length} .json files — max allowed is ${maxFiles}`)

  let totalBytes = 0
  const result: ExtractedZipFile[] = []
  for (const [entryName, data] of jsonEntries) {
    const baseName = basename(entryName)
    if (!isSafeEntryName(baseName)) throw new Error(`ZIP entry "${baseName}" has an unsafe filename (must be a .json file without path traversal)`)
    if (!isSafeEntryName(entryName)) throw new Error(`ZIP entry path "${entryName}" is unsafe (no "..", absolute paths, or control characters allowed)`)
    if (data.byteLength > maxFileSize) throw new Error(`ZIP entry "${baseName}" is ${data.byteLength} bytes — exceeds ${maxFileSize} byte limit per file`)
    totalBytes += data.byteLength
    if (totalBytes > maxTotal) throw new Error(`ZIP archive total uncompressed size exceeds ${maxTotal} byte limit`)
    result.push({ name: baseName, content: new TextDecoder('utf-8').decode(data) })
  }
  return result
}
