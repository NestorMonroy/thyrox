/**
 * `pdf.ts` — la puerta por la que un PDF entra a la conversación.
 *
 * Procedencia del sujeto: `ccnmt: packages/tool-registry/src/pdf.ts` (300
 * líneas, 6 exports).
 *
 * Por qué estas aserciones y no otras: las tres guardas de `readPDF` no son
 * validación cosmética. Un PDF inválido que entra al historial hace que TODA
 * llamada posterior al API falle con «The PDF specified was not valid», y la
 * sesión queda irrecuperable sin limpiarla — así que la comprobación de la
 * cabecera es lo que separa un error local de una sesión muerta.
 *
 * `pdftoppm` y `pdfinfo` NO están instalados en este entorno (medido). Eso no
 * es un obstáculo: es el control positivo del camino «no disponible», que en
 * un entorno con poppler no se podría ejercer sin desinstalarlo.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mkdtempSync, openSync, closeSync, ftruncateSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let dir: string

/**
 * MEDIDO en este archivo, con una sonda de tres casos: en bun 1.3.11 un
 * `mock.module` NO se puede deshacer. Ni `mock.restore()` lo revierte, ni
 * volver a registrar el espacio de nombres real capturado antes de sustituir.
 * Es hermano de la #261 y por el mismo motivo se declara aquí: el fallo que
 * produce ENGAÑA. Un caso que sustituía `fsOperations` para devolver 21 MB
 * dejaba a un caso posterior —el del archivo vacío— recibiendo ese tamaño, y
 * el veredicto salía «corrupted» tres ramas más abajo en vez de «empty».
 *
 * Por eso `fsOperations` se sustituye UNA vez, aquí, con un tamaño que cada
 * caso declara. El default consulta el archivo real, así que un caso que no
 * toque `sizeOverride` mide lo que hay en disco.
 */
/**
 * MEDIDO aquí con una sonda de tres casos: en bun 1.3.11 un `mock.module` NO
 * se puede deshacer —ni con `mock.restore()`, ni volviendo a registrar el
 * espacio de nombres real capturado antes— y ADEMÁS no se queda en su
 * archivo: `bun test` corre todos en un proceso, así que alcanza a los demás.
 * Es hermano de la #261.
 *
 * Consecuencia para este archivo: `fsOperations` NO se sustituye. El caso del
 * tope de tamaño usa un archivo DISPERSO de 21 MB, que ocupa cero en disco y
 * declara ese tamaño al `stat` real. Sale más fuerte que el sustituto: si el
 * orden de las guardas se invirtiera, ese archivo se leería entero y su
 * ausencia de cabecera daría «corrupted» en vez de «too_large», que es justo
 * lo que el caso distingue.
 */
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pdf-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

/** Un PDF mínimo válido: lo único que `readPDF` mira es la cabecera. */
function writePdf(name: string, body = 'contenido'): string {
  const p = join(dir, name)
  writeFileSync(p, `%PDF-1.4\n${body}`)
  return p
}

describe('readPDF — las tres guardas antes de que el PDF entre al historial', () => {
  test('1. un archivo vacío se rechaza por su razón propia', async () => {
    const { readPDF } = await import('../pdf.ts')
    const p = join(dir, 'vacio.pdf')
    writeFileSync(p, '')
    const r = await readPDF(p)
    expect(r.success).toBe(false)
    if (r.success) throw new Error('inalcanzable')
    expect(r.error.reason).toBe('empty')
    expect(r.error.message).toContain(p)
  })

  test('2. un archivo SIN la cabecera %PDF- se rechaza como corrupto', async () => {
    // El caso real: un HTML renombrado a .pdf. Sin esta guarda entra al
    // historial y mata la sesión, no sólo la herramienta.
    const { readPDF } = await import('../pdf.ts')
    const p = join(dir, 'mentira.pdf')
    writeFileSync(p, '<!doctype html><html></html>')
    const r = await readPDF(p)
    expect(r.success).toBe(false)
    if (r.success) throw new Error('inalcanzable')
    expect(r.error.reason).toBe('corrupted')
    expect(r.error.message).toContain('%PDF-')
  })

  test('3. un PDF válido devuelve su base64 y su tamaño original', async () => {
    const { readPDF } = await import('../pdf.ts')
    const p = writePdf('bueno.pdf')
    const r = await readPDF(p)
    expect(r.success).toBe(true)
    if (!r.success) throw new Error('inalcanzable')
    expect(r.data.type).toBe('pdf')
    expect(r.data.file.filePath).toBe(p)
    expect(r.data.file.originalSize).toBe('%PDF-1.4\ncontenido'.length)
    expect(
      Buffer.from(r.data.file.base64, 'base64').toString('utf8'),
    ).toStartWith('%PDF-1.4')
  })

  test('4. un archivo que no existe cae al error genérico, no revienta', async () => {
    const { readPDF } = await import('../pdf.ts')
    const r = await readPDF(join(dir, 'no-existe.pdf'))
    expect(r.success).toBe(false)
    if (r.success) throw new Error('inalcanzable')
    expect(r.error.reason).toBe('unknown')
    expect(r.error.message.length).toBeGreaterThan(0)
  })

  test('5. el límite de tamaño es el CRUDO, no el codificado', async () => {
    // base64 crece ~33 %, así que el tope se aplica antes de codificar: si se
    // aplicara después, un PDF de 20 MB pasaría la guarda y reventaría el
    // límite de petición del API.
    const { readPDF } = await import('../pdf.ts')
    const { PDF_TARGET_RAW_SIZE } = await import(
      '@thyrox/provider/apiLimits.js'
    )
    expect(PDF_TARGET_RAW_SIZE).toBe(20 * 1024 * 1024)
    const p = join(dir, 'grande.pdf')
    writeFileSync(p, Buffer.alloc(1024, 0x41))
    const r = await readPDF(p)
    // 1 KB está por debajo del tope: la rama de tamaño NO dispara, y lo que
    // decide es la cabecera. Es el control negativo del caso 6.
    expect(r.success).toBe(false)
    if (r.success) throw new Error('inalcanzable')
    expect(r.error.reason).toBe('corrupted')
  })

  test('6. por encima del tope, la razón es el tamaño y NO la cabecera', async () => {
    // El orden importa: si la cabecera se comprobara primero, un archivo
    // enorme se leería entero en memoria para decir que no es un PDF.
    const { readPDF } = await import('../pdf.ts')
    // Disperso: 21 MB declarados, cero ocupados. Y sin cabecera `%PDF-`, que
    // es lo que convierte al caso en discriminante.
    const p = join(dir, 'enorme.pdf')
    const fd = openSync(p, 'w')
    ftruncateSync(fd, 21 * 1024 * 1024)
    closeSync(fd)
    const r = await readPDF(p)
    expect(r.success).toBe(false)
    if (r.success) throw new Error('inalcanzable')
    expect(r.error.reason).toBe('too_large')
    expect(r.error.message).toContain('20MB')
  })
})

describe('getPDFPageCount — el conteo, y su ausencia', () => {
  test('7. sin pdfinfo devuelve null en vez de lanzar', async () => {
    // Medido: poppler no está en este entorno. `execFileNoThrow` devuelve un
    // código distinto de 0 y la función tiene que degradar, no romper.
    //
    // Este caso es el único que usa el `execFileNoThrow` REAL, y por eso va
    // antes que los que lo sustituyen: la sustitución no se puede deshacer
    // (ver la nota de la cabecera), así que su orden no es cosmético.
    const { getPDFPageCount } = await import('../pdf.ts')
    expect(await getPDFPageCount(writePdf('x.pdf'))).toBeNull()
  })

  test('8. con pdfinfo, lee el conteo de su línea `Pages:`', async () => {
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async () => ({
        code: 0,
        stdout: 'Title:  algo\nPages:          42\nEncrypted:      no\n',
        stderr: '',
      }),
    }))
    const { getPDFPageCount } = await import('../pdf.ts')
    expect(await getPDFPageCount('/x.pdf')).toBe(42)
  })

  test('9. una salida SIN la línea `Pages:` devuelve null, no NaN', async () => {
    // Un NaN viajaría como número y se compararía en silencio contra el tope
    // de páginas; el null obliga a quien llama a decidir.
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async () => ({ code: 0, stdout: 'Title: algo\n', stderr: '' }),
    }))
    const { getPDFPageCount } = await import('../pdf.ts')
    expect(await getPDFPageCount('/x.pdf')).toBeNull()
  })
})

describe('isPdftoppmAvailable — la caché de proceso', () => {
  test('10. el binario se sondea UNA vez y la respuesta se cachea', async () => {
    let sondas = 0
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async () => {
        sondas++
        return { code: 0, stdout: '', stderr: 'pdftoppm version 22.02' }
      },
    }))
    const { isPdftoppmAvailable, resetPdftoppmCache } = await import('../pdf.ts')
    resetPdftoppmCache()
    expect(await isPdftoppmAvailable()).toBe(true)
    expect(await isPdftoppmAvailable()).toBe(true)
    expect(sondas).toBe(1)
  })

  test('11. `false` también se cachea — no sólo el éxito', async () => {
    // Cachear sólo el sí dejaría el no re-sondeando el binario en cada
    // llamada, que es el coste que la caché existe para evitar.
    let sondas = 0
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async () => {
        sondas++
        return { code: 127, stdout: '', stderr: '' }
      },
    }))
    const { isPdftoppmAvailable, resetPdftoppmCache } = await import('../pdf.ts')
    resetPdftoppmCache()
    expect(await isPdftoppmAvailable()).toBe(false)
    expect(await isPdftoppmAvailable()).toBe(false)
    expect(sondas).toBe(1)
  })

  test('12. un stderr no vacío cuenta como disponible aunque el código no sea 0', async () => {
    // Las versiones viejas imprimen su versión a stderr y salen con 99.
    let sondas = 0
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async () => {
        sondas++
        return { code: 99, stdout: '', stderr: 'pdftoppm version 0.86.1' }
      },
    }))
    const { isPdftoppmAvailable, resetPdftoppmCache } = await import('../pdf.ts')
    resetPdftoppmCache()
    expect(await isPdftoppmAvailable()).toBe(true)
    expect(sondas).toBe(1)
  })

  test('13. `resetPdftoppmCache` vuelve a sondear', async () => {
    let sondas = 0
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async () => {
        sondas++
        return { code: 0, stdout: '', stderr: 'v' }
      },
    }))
    const { isPdftoppmAvailable, resetPdftoppmCache } = await import('../pdf.ts')
    resetPdftoppmCache()
    await isPdftoppmAvailable()
    resetPdftoppmCache()
    await isPdftoppmAvailable()
    expect(sondas).toBe(2)
  })
})

describe('extractPDFPages — el render a imágenes', () => {
  test('14. sin pdftoppm, la razón es `unavailable` y dice cómo instalarlo', async () => {
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async () => ({ code: 127, stdout: '', stderr: '' }),
    }))
    const { extractPDFPages, resetPdftoppmCache } = await import('../pdf.ts')
    resetPdftoppmCache()
    const r = await extractPDFPages(writePdf('a.pdf'))
    expect(r.success).toBe(false)
    if (r.success) throw new Error('inalcanzable')
    expect(r.error.reason).toBe('unavailable')
    expect(r.error.message).toContain('poppler-utils')
  })

  test('15. el tope de extracción es OTRO, mayor que el de lectura', async () => {
    // Extraer no manda el PDF al API: manda imágenes. Por eso su tope es de
    // 100 MB y no de 20 — confundirlos rechazaría PDFs que sí se pueden
    // renderizar.
    const { PDF_MAX_EXTRACT_SIZE, PDF_TARGET_RAW_SIZE } = await import(
      '@thyrox/provider/apiLimits.js'
    )
    expect(PDF_MAX_EXTRACT_SIZE).toBe(100 * 1024 * 1024)
    expect(PDF_MAX_EXTRACT_SIZE).toBeGreaterThan(PDF_TARGET_RAW_SIZE)
  })

  test('16. un archivo vacío se rechaza antes de sondear el binario', async () => {
    let sondas = 0
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async () => {
        sondas++
        return { code: 0, stdout: '', stderr: 'v' }
      },
    }))
    const { extractPDFPages, resetPdftoppmCache } = await import('../pdf.ts')
    resetPdftoppmCache()
    const p = join(dir, 'vacio.pdf')
    writeFileSync(p, '')
    const r = await extractPDFPages(p)
    expect(r.success).toBe(false)
    if (r.success) throw new Error('inalcanzable')
    expect(r.error.reason).toBe('empty')
    expect(sondas).toBe(0)
  })

  test('17. un stderr con «password» se traduce a su razón propia', async () => {
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async (_b: string, args: string[]) => {
        if (args[0] === '-v') return { code: 0, stdout: '', stderr: 'v' }
        return { code: 1, stdout: '', stderr: 'Command Line Error: Incorrect password' }
      },
    }))
    const { extractPDFPages, resetPdftoppmCache } = await import('../pdf.ts')
    resetPdftoppmCache()
    const r = await extractPDFPages(writePdf('p.pdf'))
    expect(r.success).toBe(false)
    if (r.success) throw new Error('inalcanzable')
    expect(r.error.reason).toBe('password_protected')
  })

  test('18. un stderr con «damaged» se traduce a corrupto', async () => {
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async (_b: string, args: string[]) => {
        if (args[0] === '-v') return { code: 0, stdout: '', stderr: 'v' }
        return { code: 1, stdout: '', stderr: 'Error: PDF file is damaged' }
      },
    }))
    const { extractPDFPages, resetPdftoppmCache } = await import('../pdf.ts')
    resetPdftoppmCache()
    const r = await extractPDFPages(writePdf('d.pdf'))
    expect(r.success).toBe(false)
    if (r.success) throw new Error('inalcanzable')
    expect(r.error.reason).toBe('corrupted')
  })

  test('19. un fallo sin patrón conocido conserva el stderr en el mensaje', async () => {
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async (_b: string, args: string[]) => {
        if (args[0] === '-v') return { code: 0, stdout: '', stderr: 'v' }
        return { code: 1, stdout: '', stderr: 'algo raro y nuevo' }
      },
    }))
    const { extractPDFPages, resetPdftoppmCache } = await import('../pdf.ts')
    resetPdftoppmCache()
    const r = await extractPDFPages(writePdf('r.pdf'))
    expect(r.success).toBe(false)
    if (r.success) throw new Error('inalcanzable')
    expect(r.error.reason).toBe('unknown')
    expect(r.error.message).toContain('algo raro y nuevo')
  })

  test('20. el rango de páginas viaja como -f y -l, y `Infinity` NO viaja', async () => {
    // `Infinity` como último argumento sale de un rango abierto de quien
    // llama. Pasarlo a pdftoppm daría `-l Infinity`, que no es un número y
    // hace fallar el render entero.
    let capturados: string[] = []
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async (_b: string, args: string[]) => {
        if (args[0] === '-v') return { code: 0, stdout: '', stderr: 'v' }
        capturados = args
        return { code: 1, stdout: '', stderr: 'x' }
      },
    }))
    const { extractPDFPages, resetPdftoppmCache } = await import('../pdf.ts')
    resetPdftoppmCache()
    await extractPDFPages(writePdf('g.pdf'), { firstPage: 3, lastPage: 7 })
    expect(capturados).toContain('-f')
    expect(capturados[capturados.indexOf('-f') + 1]).toBe('3')
    expect(capturados[capturados.indexOf('-l') + 1]).toBe('7')

    await extractPDFPages(writePdf('h.pdf'), { firstPage: 2, lastPage: Infinity })
    expect(capturados).toContain('-f')
    expect(capturados).not.toContain('-l')
  })

  test('21. el directorio de salida cuelga del de resultados de la sesión', async () => {
    // No de un temporal del sistema: la limpieza de la sesión tiene que
    // arrastrar las imágenes, o quedan huérfanas en disco.
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async (_b: string, args: string[]) => {
        if (args[0] === '-v') return { code: 0, stdout: '', stderr: 'v' }
        return { code: 1, stdout: '', stderr: 'x' }
      },
    }))
    const { extractPDFPages, resetPdftoppmCache } = await import('../pdf.ts')
    const { getToolResultsDir } = await import('@thyrox/storage/toolResultStorage.js')
    resetPdftoppmCache()
    let capturado = ''
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async (_b: string, args: string[]) => {
        if (args[0] === '-v') return { code: 0, stdout: '', stderr: 'v' }
        capturado = args[args.length - 1]!
        return { code: 1, stdout: '', stderr: 'x' }
      },
    }))
    await extractPDFPages(writePdf('s.pdf'))
    expect(capturado.startsWith(getToolResultsDir())).toBe(true)
    expect(capturado.endsWith('/page')).toBe(true)
  })

  test('22. cero páginas producidas es corrupto, no éxito con count 0', async () => {
    // Un éxito con `count: 0` haría que quien llama mandara un mensaje sin
    // imágenes y sin error: el fallo se volvería invisible.
    mock.module('@thyrox/shell/execFileNoThrow.js', () => ({
      execFileNoThrow: async () => ({ code: 0, stdout: '', stderr: 'v' }),
    }))
    const { extractPDFPages, resetPdftoppmCache } = await import('../pdf.ts')
    resetPdftoppmCache()
    const r = await extractPDFPages(writePdf('z.pdf'))
    expect(r.success).toBe(false)
    if (r.success) throw new Error('inalcanzable')
    expect(r.error.reason).toBe('corrupted')
    expect(r.error.message).toContain('no output pages')
  })
})
