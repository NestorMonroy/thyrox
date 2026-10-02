/**
 * Baja un blob grande por tramos `Range` a un archivo, midiendo su sha256 a
 * la vez. La memoria del proceso queda acotada al tramo, no al blob.
 *
 * Por qué no basta leer el cuerpo en flujo: el `fetch` de Bun no aplica
 * contrapresión, y en un enlace más rápido que el consumidor acumula en
 * memoria todo lo que llegó y aún no se leyó. Medido en el banco
 * `verifier-memory-ceiling-20261002T113112` con un blob de 1 GiB: leerlo
 * en flujo, con `Bun.write` o con `node:http` deja un pico de RSS de 1.7 a
 * 2.1 GiB; por tramos de 16 MiB, 121 MiB. El verificador corre con un techo
 * de 1024 MiB y moría con 137.
 *
 * Quién lee un tramo lo decide el llamador (`RangeReader`): un registry OCI
 * con su token, o el hub de Hugging Face. Un servidor que ignora `Range` y
 * responde 200 entero se acepta —su cuerpo se escribe tal cual— y el
 * resultado lo declara con `ranged: false`, porque ese caso vuelve a costar
 * la memoria del blob.
 */
import { createHash } from 'node:crypto'
import { open } from 'node:fs/promises'

/** Lee los bytes `start..end`, ambos incluidos. */
export type RangeReader = (start: number, end: number) => Promise<Response>

export interface DownloadedFile {
  readonly sha256: string
  readonly size: number
  /** `false` si el servidor ignoró `Range` y respondió el blob entero. */
  readonly ranged: boolean
}

export class BoundedDownloadError extends Error {
  constructor(readonly start: number, readonly end: number, reason: string) {
    super(`tramo bytes=${start}-${end}: ${reason}`)
    this.name = 'BoundedDownloadError'
  }
}

/** 16 MiB: el tramo medido en el banco; un pico de 121 MiB para cualquier tamaño de blob. */
export const DEFAULT_CHUNK_BYTES = 16 * 1024 * 1024

const PARTIAL_CONTENT = 206
const CONTENT_RANGE = /^bytes (\d+)-(\d+)\/(\d+|\*)$/

export async function downloadToFile(read: RangeReader, totalBytes: number, destination: string,
  chunkBytes: number = DEFAULT_CHUNK_BYTES): Promise<DownloadedFile> {
  const hash = createHash('sha256')
  const file = await open(destination, 'w')
  let size = 0
  try {
    for (let start = 0; start < totalBytes; start += chunkBytes) {
      const end = Math.min(start + chunkBytes, totalBytes) - 1
      const response = await read(start, end)
      if (response.status === 200 && start === 0) {
        size = await writeWholeBody(response, file, hash)
        return { sha256: hash.digest('hex'), size, ranged: false }
      }
      if (response.status !== PARTIAL_CONTENT) throw new BoundedDownloadError(start, end, `el servidor respondió ${response.status}`)
      requireRangeStart(response, start, end)
      const bytes = new Uint8Array(await response.arrayBuffer())
      hash.update(bytes)
      await file.write(bytes)
      size += bytes.length
    }
  } finally {
    await file.close()
  }
  return { sha256: hash.digest('hex'), size, ranged: true }
}

function requireRangeStart(response: Response, start: number, end: number): void {
  const match = CONTENT_RANGE.exec(response.headers.get('content-range') ?? '')
  if (match === null) throw new BoundedDownloadError(start, end, 'la respuesta 206 no trae Content-Range')
  if (Number(match[1]) !== start) throw new BoundedDownloadError(start, end, `el servidor devolvió el tramo que empieza en ${match[1]}`)
}

async function writeWholeBody(response: Response, file: Awaited<ReturnType<typeof open>>, hash: ReturnType<typeof createHash>): Promise<number> {
  let size = 0
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    hash.update(chunk)
    await file.write(chunk)
    size += chunk.length
  }
  return size
}
