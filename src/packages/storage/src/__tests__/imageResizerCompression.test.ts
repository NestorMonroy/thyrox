/**
 * Prueba de conducta para los ocho símbolos que el segundo pase de
 * `../imageResizer.ts` añade — los que dependían de `getImageProcessor`
 * (ya portado en `@thyrox/tool-registry/tools/FileReadTool/imageProcessor.js`)
 * y estaban declarados bloqueados.
 *
 * Ni `sharp` ni `image-processor-napi` están instalados en este árbol, así
 * que `getImageProcessor()` SIEMPRE rechaza aquí — cada función bajo
 * prueba entra por su rama de `catch`. Eso no es una limitación de la
 * prueba: es exactamente la rama que un `FileReadTool` real ejecuta hoy
 * mismo en este entorno, y es la que discrimina el comportamiento —
 * passthrough silencioso cuando cabe en el límite, `ImageResizeError`
 * cuando no.
 */
import { describe, expect, test } from 'bun:test'
import type { ImageBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import {
  compressImageBlock,
  compressImageBuffer,
  compressImageBufferWithTokenLimit,
  ImageResizeError,
  maybeResizeAndDownsampleImageBlock,
  maybeResizeAndDownsampleImageBuffer,
} from '../imageResizer.js'

// Firma JPEG (FF D8 FF), sin nada más — basta para que
// detectImageFormatFromBuffer la reconozca en la rama de fallback.
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0])

function pngWithDeclaredDimensions(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24)
  buf[0] = 0x89
  buf[1] = 0x50
  buf[2] = 0x4e
  buf[3] = 0x47
  buf.writeUInt32BE(width, 16)
  buf.writeUInt32BE(height, 20)
  return buf
}

describe('ImageResizeError', () => {
  test('es una subclase real de Error, con .name propio', () => {
    const err = new ImageResizeError('mensaje de prueba')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ImageResizeError')
    expect(err.message).toBe('mensaje de prueba')
  })
})

describe('maybeResizeAndDownsampleImageBuffer', () => {
  test('buffer vacío (0 bytes) rechaza ANTES de tocar getImageProcessor', async () => {
    // Guarda síncrona previa al try/catch — no depende de sharp en absoluto.
    await expect(
      maybeResizeAndDownsampleImageBuffer(Buffer.alloc(0), 0, 'png'),
    ).rejects.toThrow(ImageResizeError)
    await expect(
      maybeResizeAndDownsampleImageBuffer(Buffer.alloc(0), 0, 'png'),
    ).rejects.toThrow(/empty/i)
  })

  test('buffer pequeño, no-PNG-sobredimensionado → passthrough sin lanzar', async () => {
    // getImageProcessor() rechaza (sharp ausente); el tamaño base64
    // (134 bytes) está muy por debajo del límite de 5 MB, así que la
    // rama de catch devuelve el buffer original sin procesar.
    const result = await maybeResizeAndDownsampleImageBuffer(
      JPEG_MAGIC,
      JPEG_MAGIC.length,
      'jpeg',
    )
    expect(result.buffer).toBe(JPEG_MAGIC)
    expect(result.mediaType).toBe('jpeg')
    expect(result.dimensions).toBeUndefined()
  })

  test('buffer grande (base64 > 5MB), no-PNG → ImageResizeError de límite de API', async () => {
    const big = Buffer.alloc(6_000_000, 0xaa) // base64Size = 8_000_000 > 5_242_880
    await expect(
      maybeResizeAndDownsampleImageBuffer(big, big.length, 'jpeg'),
    ).rejects.toThrow(/exceeds the 5MB API limit/i)
  })

  test('PNG con dimensiones declaradas > 2000px → ImageResizeError de dimensiones, aunque el buffer sea chico', async () => {
    // 24 bytes: muy por debajo del límite de 5MB en base64 — el único
    // motivo del rechazo es el header IHDR, no el tamaño.
    const oversizedPng = pngWithDeclaredDimensions(3000, 3000)
    await expect(
      maybeResizeAndDownsampleImageBuffer(oversizedPng, oversizedPng.length, 'png'),
    ).rejects.toThrow(/2000x2000/)
  })

  test('PNG con dimensiones declaradas DENTRO del límite y buffer chico → passthrough', async () => {
    const smallPng = pngWithDeclaredDimensions(500, 500)
    const result = await maybeResizeAndDownsampleImageBuffer(
      smallPng,
      smallPng.length,
      'png',
    )
    expect(result.buffer).toBe(smallPng)
    expect(result.mediaType).toBe('png')
  })
})

describe('maybeResizeAndDownsampleImageBlock', () => {
  test('source.type !== "base64" → devuelve el bloque intacto, sin decodificar nada', async () => {
    const block = {
      type: 'image',
      source: { type: 'url', url: 'https://ejemplo.invalido/x.png' },
    } as unknown as ImageBlockParam
    const result = await maybeResizeAndDownsampleImageBlock(block)
    expect(result.block).toBe(block)
    expect(result.dimensions).toBeUndefined()
  })

  test('source.type === "base64", pequeño → delega y envuelve el resultado en un bloque nuevo', async () => {
    const block: ImageBlockParam = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: JPEG_MAGIC.toString('base64'),
      },
    }
    const result = await maybeResizeAndDownsampleImageBlock(block)
    expect(result.block.type).toBe('image')
    if (result.block.source.type === 'base64') {
      expect(result.block.source.media_type).toBe('image/jpeg')
      expect(result.block.source.data).toBe(JPEG_MAGIC.toString('base64'))
    } else {
      throw new Error('se esperaba source.type === "base64"')
    }
  })
})

describe('compressImageBuffer', () => {
  test('buffer dentro del límite → passthrough con el formato detectado por magic bytes', async () => {
    const result = await compressImageBuffer(JPEG_MAGIC, 1_000_000)
    expect(result.mediaType).toBe('image/jpeg')
    expect(result.base64).toBe(JPEG_MAGIC.toString('base64'))
    expect(result.originalSize).toBe(JPEG_MAGIC.length)
  })

  test('buffer que EXCEDE maxBytes y sharp ausente → ImageResizeError, no passthrough', async () => {
    const buf = Buffer.alloc(100, 0xbb)
    await expect(compressImageBuffer(buf, 10)).rejects.toThrow(ImageResizeError)
    await expect(compressImageBuffer(buf, 10)).rejects.toThrow(/Unable to compress image/i)
  })
})

describe('compressImageBufferWithTokenLimit — conversión token→byte antes de delegar', () => {
  // maxTokens=1000 → maxBase64Chars=floor(1000/0.125)=8000 → maxBytes=floor(8000*0.75)=6000
  test('buffer exactamente en el límite derivado (6000 bytes) → passthrough', async () => {
    const atLimit = Buffer.alloc(6000, 0xcc)
    const result = await compressImageBufferWithTokenLimit(atLimit, 1000)
    expect(result.originalSize).toBe(6000)
  })

  test('buffer un byte por encima del límite derivado (6001 bytes) → ImageResizeError', async () => {
    const overLimit = Buffer.alloc(6001, 0xcc)
    await expect(
      compressImageBufferWithTokenLimit(overLimit, 1000),
    ).rejects.toThrow(ImageResizeError)
  })
})

describe('compressImageBlock', () => {
  test('bloque no-base64 → passthrough sin tocar compressImageBuffer', async () => {
    const block = {
      type: 'image',
      source: { type: 'url', url: 'https://ejemplo.invalido/x.png' },
    } as unknown as ImageBlockParam
    const result = await compressImageBlock(block, 1000)
    expect(result).toBe(block)
  })

  test('bloque base64 YA dentro del límite → passthrough (ni siquiera decodifica de más)', async () => {
    const block: ImageBlockParam = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: JPEG_MAGIC.toString('base64'),
      },
    }
    const result = await compressImageBlock(block, 1_000_000)
    expect(result).toBe(block)
  })

  test('bloque base64 que EXCEDE el límite, sharp ausente → rechaza con ImageResizeError', async () => {
    const bigData = Buffer.alloc(100, 0xdd).toString('base64')
    const block: ImageBlockParam = {
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: bigData },
    }
    await expect(compressImageBlock(block, 10)).rejects.toThrow(ImageResizeError)
  })
})
