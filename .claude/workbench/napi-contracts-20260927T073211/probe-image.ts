// Sonda: conducta del procesador de imagen nativo sobre un PNG construido aquí.
import { deflateSync } from 'node:zlib'
import sharp, { getNativeModule } from '../../../src/packages/image-processor-napi/src/index.ts'

function crc32(bytes: Buffer): number {
  let c = ~0
  for (const b of bytes) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)) }
  return ~c >>> 0
}
function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc32(body), 8 + data.length)
  return out
}
function png(width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) raw[y * (width * 3 + 1) + 1 + x * 3] = (x * 40) & 255
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
const input = png(8, 6)
const out: Record<string, unknown> = {}
out.meta = await sharp(input).metadata()
const small = await sharp(input).resize(4, 3).png().toBuffer()
out.resizedPngMagic = small.subarray(0, 4).toString('hex')
out.resizedMeta = await sharp(small).metadata()
const jpg = await sharp(input).jpeg({ quality: 80 }).toBuffer()
out.jpegMagic = jpg.subarray(0, 3).toString('hex'); out.jpegMeta = await sharp(jpg).metadata()
const webp = await sharp(input).webp({ quality: 80 }).toBuffer()
out.webpMagic = webp.subarray(8, 12).toString('latin1')
out.noEnlarge = await sharp(await sharp(input).resize(80, 60, { fit: 'inside', withoutEnlargement: true }).png().toBuffer()).metadata()
try { await sharp(Buffer.from('no es una imagen')).metadata(); out.garbage = 'resolvio' } catch (e) { out.garbage = `rechaza: ${e}` }
try { await sharp(Buffer.from('no es una imagen')).toBuffer(); out.garbageBuf = 'resolvio' } catch (e) { out.garbageBuf = `rechaza: ${e}` }
out.clipboardModule = getNativeModule()
console.log(JSON.stringify(out, null, 1))
