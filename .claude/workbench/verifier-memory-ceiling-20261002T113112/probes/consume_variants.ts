/**
 * Aísla qué forma de consumir el cuerpo de `fetch` acumula memoria en Bun.
 * Uso: bun consume_variants.ts <url-del-blob> <variante> <destino>
 *   variante: node-pipeline | web-reader | bun-write
 */
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'

const [url, variant, destination] = process.argv.slice(2) as [string, string, string]
const response = variant === 'node-http' || variant === 'ranged' ? undefined as unknown as Response : await fetch(url)
const hash = createHash('sha256')
if (variant === 'node-pipeline') {
  const body = Readable.fromWeb(response.body as unknown as WebReadableStream<Uint8Array>)
  body.on('data', (chunk: Buffer) => hash.update(chunk))
  await pipeline(body, createWriteStream(destination))
} else if (variant === 'web-reader') {
  const sink = Bun.file(destination).writer()
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    hash.update(chunk)
    sink.write(chunk)
    await sink.flush()
  }
  await sink.end()
} else if (variant === 'web-reader-gc') {
  const sink = Bun.file(destination).writer()
  let sinceCollection = 0
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    hash.update(chunk)
    sink.write(chunk)
    sinceCollection += chunk.length
    if (sinceCollection >= 64 * 1024 * 1024) { await sink.flush(); Bun.gc(true); sinceCollection = 0 }
  }
  await sink.end()
} else if (variant === 'hash-only-gc' || variant === 'hash-only') {
  let sinceCollection = 0
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    hash.update(chunk)
    sinceCollection += chunk.length
    if (variant === 'hash-only-gc' && sinceCollection >= 16 * 1024 * 1024) { Bun.gc(true); sinceCollection = 0 }
  }
} else if (variant === 'bun-write') {
  // La forma de huggingFaceSource.ts:94: escritura nativa, y el sha256 se mide después sobre el archivo.
  await Bun.write(destination, response)
  const { sha256OfPath } = await import('@thyrox/artifact-registry/artifactFiles.ts')
  hash.update(await sha256OfPath(destination))
} else if (variant === 'ranged') {
  const span = 16 * 1024 * 1024
  const sink = Bun.file(destination).writer()
  for (let start = 0; ; start += span) {
    const part = await fetch(url, { headers: { range: `bytes=${start}-${start + span - 1}` } })
    if (part.status === 416) break
    const bytes = new Uint8Array(await part.arrayBuffer())
    hash.update(bytes)
    sink.write(bytes)
    await sink.flush()
    if (process.env.PROBE_GC !== "0") Bun.gc(true)
    if (part.status !== 206 || bytes.length < span) break
  }
  await sink.end()
} else if (variant === 'node-http') {
  const { get } = await import('node:http')
  const incoming = await new Promise<import('node:http').IncomingMessage>((resolve, reject) => get(url, resolve).on('error', reject))
  incoming.on('data', (chunk: Buffer) => hash.update(chunk))
  await pipeline(incoming, createWriteStream(destination))
} else {
  throw new Error(`variante desconocida: ${variant}`)
}
process.stderr.write(`${variant} sha256:${hash.digest('hex')}\n`)
