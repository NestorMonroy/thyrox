/**
 * Contrato de `image-processor-napi`: una fachada con la forma de `sharp`
 * sobre el módulo nativo `image-processor.node` (libvips), más el acceso al
 * portapapeles que sólo existe en macOS.
 *
 * Lo consumen `storage/imageResizer.ts` —metadata, resize, png/jpeg/webp,
 * toBuffer— y `repl/imagePaste.ts` —`getNativeModule`—. Las pruebas usan un
 * PNG construido aquí, no un archivo del disco.
 *
 * Medido con `bin/binary` sobre 2.1.283 (banco
 * `napi-contracts-20260927T073211`): esa build de Linux NO embebe
 * `image-processor.node` —sólo `audio-capture.node` y `clipboard-napi.node`—,
 * así que el contrato de la fachada lo fijan sus consumidores y el módulo
 * vendorizado (de 2.1.121, `vendor/NOTICE.md`), no el ejecutable actual.
 *
 * Restricción técnica declarada: la conducta nativa sólo corre donde el
 * `.node` corresponde a la máquina; medido en linux-x64, en otra plataforma
 * se salta con esta razón.
 *
 * Control de anulación, medido mutando la fachada y restaurándola: sin
 * reproducir la cola de operaciones caen 7, 8 y 9; con `resize` sin encolar,
 * sólo el 7; con `jpeg` encolando `png`, sólo el 8; con `resize` sin sus
 * opciones, sólo el 10; con el portapapeles en toda plataforma, sólo el 4.
 */
import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import * as processor from '../src/index.ts'

const PACKAGE = join(import.meta.dir, '..')
const VENDOR = join(PACKAGE, 'vendor')
const HOST = `${process.arch}-${process.platform}`
const nativeHere = HOST === 'x64-linux'
const { sharp } = processor

function formatOf(bytes: Buffer): string {
  if (bytes.readUInt32BE(0) === 0x7f454c46) {
    const machine = bytes.readUInt16LE(18)
    return machine === 0x3e ? 'x64-linux' : machine === 0xb7 ? 'arm64-linux' : `elf-${machine}`
  }
  if (bytes.readUInt32LE(0) === 0xfeedfacf) {
    const cpu = bytes.readUInt32LE(4)
    return cpu === 0x01000007 ? 'x64-darwin' : cpu === 0x0100000c ? 'arm64-darwin' : `macho-${cpu}`
  }
  if (bytes.toString('latin1', 0, 2) === 'MZ') return 'x64-win32'
  return 'desconocido'
}

function crc32(bytes: Buffer): number {
  let c = ~0
  for (const b of bytes) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc32(body), 8 + data.length)
  return out
}

/** Un PNG RGB de `width`×`height` con un degradado, para que no sea trivial. */
function makePng(width: number, height: number): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 2
  const rowLength = width * 3 + 1
  const raw = Buffer.alloc(rowLength * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) raw[y * rowLength + 1 + x * 3] = (x * 40) & 255
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const INPUT = makePng(8, 6)

describe('image-processor-napi — superficie', () => {
  test('1. exporta la fachada como nombre y como default, y getNativeModule', () => {
    expect(Object.keys(processor).sort()).toEqual(['default', 'getNativeModule', 'sharp'])
    expect(processor.default).toBe(sharp)
  })

  test('2. cada .node vendorizado tiene el formato de la plataforma que su directorio nombra', () => {
    const dirs = readdirSync(VENDOR).filter(d => !d.endsWith('.md')).sort()
    expect(dirs).toEqual(['arm64-darwin', 'arm64-linux', 'x64-darwin', 'x64-linux', 'x64-win32'])
    for (const dir of dirs) {
      expect([dir, formatOf(readFileSync(join(VENDOR, dir, 'image-processor.node')))]).toEqual([dir, dir])
    }
  })

  test('3. el cargador tiene una rama por cada .node vendorizado, con require literal', () => {
    const source = readFileSync(join(PACKAGE, 'src', 'index.ts'), 'utf8')
    const branches = [...source.matchAll(/require\('\.\.\/vendor\/([^/]+)\/image-processor\.node'\)/g)]
      .map(m => m[1]).sort()
    expect(branches).toEqual(readdirSync(VENDOR).filter(d => !d.endsWith('.md')).sort())
  })

  test.skipIf(process.platform === 'darwin')('4. fuera de macOS no hay módulo de portapapeles', () => {
    expect(processor.getNativeModule()).toBeNull()
  })
})

describe.skipIf(!nativeHere)(`image-processor-napi — módulo nativo en ${HOST}`, () => {
  test('5. el módulo nativo expone lo que la fachada exige', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require(join(VENDOR, HOST, 'image-processor.node')) as Record<string, unknown>
    for (const name of ['processImage', 'hasClipboardImage', 'readClipboardImage']) {
      expect([name, typeof raw[name]]).toEqual([name, 'function'])
    }
  })

  test('6. metadata lee ancho, alto y formato del PNG', async () => {
    expect(await sharp(INPUT).metadata()).toEqual({ width: 8, height: 6, format: 'png' })
  })

  test('7. resize y png encadenados producen un PNG del tamaño pedido', async () => {
    const out = await sharp(INPUT).resize(4, 3).png().toBuffer()
    expect(out.subarray(0, 4).toString('hex')).toBe('89504e47')
    expect(await sharp(out).metadata()).toEqual({ width: 4, height: 3, format: 'png' })
  })

  // El módulo nombra el formato `jpg`, no `jpeg` como sharp: por eso
  // `storage/imageResizer.ts` lo normaliza antes de usarlo como media type.
  test('8. jpeg produce un JPEG y el módulo lo nombra jpg', async () => {
    const out = await sharp(INPUT).jpeg({ quality: 80 }).toBuffer()
    expect(out.subarray(0, 3).toString('hex')).toBe('ffd8ff')
    expect((await sharp(out).metadata()).format).toBe('jpg')
  })

  test('9. webp produce un contenedor RIFF/WEBP', async () => {
    const out = await sharp(INPUT).webp({ quality: 80 }).toBuffer()
    expect(out.toString('latin1', 0, 4)).toBe('RIFF')
    expect(out.toString('latin1', 8, 12)).toBe('WEBP')
  })

  test('10. withoutEnlargement no agranda una imagen más chica que la caja', async () => {
    const out = await sharp(INPUT).resize(80, 60, { fit: 'inside', withoutEnlargement: true }).png().toBuffer()
    expect(await sharp(out).metadata()).toEqual({ width: 8, height: 6, format: 'png' })
  })

  test('11. una entrada que no es imagen rechaza, en metadata y en toBuffer', async () => {
    const garbage = Buffer.from('no es una imagen')
    await expect(sharp(garbage).metadata()).rejects.toThrow('Unable to determine image format')
    await expect(sharp(garbage).toBuffer()).rejects.toThrow('Unable to determine image format')
  })
})
