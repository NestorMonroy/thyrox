/**
 * `downloadToFile`: bajar un blob grande por tramos `Range`, para que la
 * memoria del proceso quede acotada al tramo y no al blob.
 *
 * Medido en el banco `verifier-memory-ceiling-20261002T113112`: el cuerpo de
 * un `fetch` de Bun no aplica contrapresión, y leerlo entero —en flujo,
 * con `Bun.write` o con `node:http`— deja un pico de RSS de 1.7 a 2.1 GiB
 * para un blob de 1 GiB; por tramos de 16 MiB, 121 MiB con el mismo blob.
 *
 * Métrica: los tramos pedidos, el archivo en el destino, su sha256 y su
 * tamaño.
 * Ciega a: la memoria real del proceso, que mide la sonda del banco y no
 * esta suite.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { downloadToFile, BoundedDownloadError, type RangeReader } from '../boundedDownload.ts'

const CONTENT = new TextEncoder().encode('0123456789abcdefghijklmnopqrstuvwxyz')
const SHA256 = createHash('sha256').update(CONTENT).digest('hex')

let workdir: string
beforeEach(() => { workdir = mkdtempSync(join(tmpdir(), 'ranged-download-')) })
afterEach(() => { rmSync(workdir, { recursive: true, force: true }) })

/** Un lector que respeta los tramos, como un registry con soporte de `Range`. */
function rangedReader(requests: Array<[number, number]>): RangeReader {
  return async (start, end) => {
    requests.push([start, end])
    const last = Math.min(end, CONTENT.length - 1)
    return new Response(CONTENT.slice(start, last + 1), {
      status: 206,
      headers: { 'content-range': `bytes ${start}-${last}/${CONTENT.length}` },
    })
  }
}

describe('downloadToFile', () => {
  test('baja el blob en tramos consecutivos del tamaño pedido y mide su sha256', async () => {
    const requests: Array<[number, number]> = []
    const destination = join(workdir, 'blob')
    const downloaded = await downloadToFile(rangedReader(requests), CONTENT.length, destination, 10)
    expect(requests).toEqual([[0, 9], [10, 19], [20, 29], [30, 35]])
    expect(readFileSync(destination)).toEqual(Buffer.from(CONTENT))
    expect(downloaded).toEqual({ sha256: SHA256, size: CONTENT.length, ranged: true })
  })

  test('un servidor que ignora Range responde 200 entero: se escribe ese cuerpo y se declara sin tramos', async () => {
    const requests: Array<[number, number]> = []
    const destination = join(workdir, 'blob')
    const ignoring: RangeReader = async (start, end) => {
      requests.push([start, end])
      return new Response(CONTENT, { status: 200 })
    }
    const downloaded = await downloadToFile(ignoring, CONTENT.length, destination, 10)
    expect(requests).toEqual([[0, 9]])
    expect(readFileSync(destination)).toEqual(Buffer.from(CONTENT))
    expect(downloaded).toEqual({ sha256: SHA256, size: CONTENT.length, ranged: false })
  })

  test('un tramo que empieza en otro byte se rehúsa: concatenarlo corrompería el blob', async () => {
    const shifted: RangeReader = async start => new Response(CONTENT.slice(start + 1, start + 11), {
      status: 206,
      headers: { 'content-range': `bytes ${start + 1}-${start + 10}/${CONTENT.length}` },
    })
    await expect(downloadToFile(shifted, CONTENT.length, join(workdir, 'blob'), 10)).rejects.toThrow(BoundedDownloadError)
  })

  test('una respuesta que no es 200 ni 206 se rehúsa nombrando el estado y el tramo', async () => {
    const failing: RangeReader = async () => new Response('denied', { status: 403 })
    await expect(downloadToFile(failing, CONTENT.length, join(workdir, 'blob'), 10)).rejects.toThrow(/bytes=0-9.*403/)
  })

  test('un blob vacío no pide ningún tramo', async () => {
    const requests: Array<[number, number]> = []
    const destination = join(workdir, 'empty')
    const downloaded = await downloadToFile(rangedReader(requests), 0, destination, 10)
    expect(requests).toEqual([])
    expect(readFileSync(destination).length).toBe(0)
    expect(downloaded.size).toBe(0)
  })
})
