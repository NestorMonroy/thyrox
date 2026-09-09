/**
 * Prueba de conducta para `../tools/FileReadTool/imageProcessor.js` — el
 * porte de `ccnmt: packages/tool-registry/src/tools/FileReadTool/imageProcessor.ts`.
 *
 * Ni `image-processor-napi` ni `sharp` están instalados en este árbol
 * (medido en el informe de la tarea), así que las dos funciones exportadas
 * SIEMPRE rechazan aquí — el punto de la prueba no es "resuelve una
 * imagen" sino la CONDUCTA que las distingue una de otra: sólo
 * `getImageProcessor` intenta primero el binario nativo y avisa por
 * `console.warn` antes de caer a `sharp`; `getImageCreator` va derecho a
 * `sharp`, sin aviso.
 */
import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { getImageCreator, getImageProcessor } from '../tools/FileReadTool/imageProcessor.js'

afterEach(() => {
  // Ambas funciones cachean su resultado a nivel de módulo tras la PRIMERA
  // resolución exitosa — pero aquí nunca resuelven (ambos binarios
  // ausentes), así que no hay caché que limpiar entre tests: cada llamada
  // vuelve a intentar el import dinámico.
})

describe('getImageProcessor — intenta el nativo primero, avisa, y cae a sharp', () => {
  test('rechaza (ningún binario instalado) con un error que menciona sharp', async () => {
    await expect(getImageProcessor()).rejects.toThrow(/sharp/i)
  })

  test('avisa por console.warn ANTES de rechazar — el nativo se intentó y falló', async () => {
    const warnSpy = spyOn(console, 'warn')
    await expect(getImageProcessor()).rejects.toThrow()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(String(warnSpy.mock.calls[0]?.[0])).toMatch(/falling back to sharp/i)
    warnSpy.mockRestore()
  })

  test('el error final es el de resolución de `sharp`, no el de `image-processor-napi`', async () => {
    try {
      await getImageProcessor()
      throw new Error('se esperaba rechazo')
    } catch (error) {
      expect(String((error as Error).message)).toMatch(/sharp/i)
      expect(String((error as Error).message)).not.toMatch(/image-processor-napi/i)
    }
  })
})

describe('getImageCreator — va directo a sharp, sin intentar el nativo', () => {
  test('rechaza (sharp no instalado) con un error que menciona sharp', async () => {
    await expect(getImageCreator()).rejects.toThrow(/sharp/i)
  })

  test('NO avisa por console.warn — nunca intenta el binario nativo', async () => {
    const warnSpy = spyOn(console, 'warn')
    await expect(getImageCreator()).rejects.toThrow()
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

describe('getImageProcessor vs getImageCreator — discriminan entre sí', () => {
  test('mismo destino final (sharp), conducta previa distinta (aviso sí/no)', async () => {
    const warnSpy = spyOn(console, 'warn')

    await expect(getImageProcessor()).rejects.toThrow(/sharp/i)
    const callsAfterProcessor = warnSpy.mock.calls.length
    expect(callsAfterProcessor).toBe(1)

    await expect(getImageCreator()).rejects.toThrow(/sharp/i)
    const callsAfterCreator = warnSpy.mock.calls.length
    // getImageCreator no añade ninguna llamada nueva a console.warn.
    expect(callsAfterCreator).toBe(callsAfterProcessor)

    warnSpy.mockRestore()
  })
})
