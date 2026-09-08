/**
 * Lectura y render de un PDF: la puerta por la que un documento entra a la
 * conversación.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/pdf.ts` (300 líneas,
 * 6 exports). Ese árbol declara `"license": "UNLICENSED"`, así que el cuerpo
 * se **reimplementa** —mismo nombre de módulo, mismo sitio en el paquete,
 * mismos nombres y firmas— y no se copia.
 *
 * Los dos caminos son distintos a propósito y no se pueden fundir:
 *
 * - `readPDF` manda el PDF ENTERO al API en base64, así que su tope es el que
 *   deja sitio al resto de la petición (20 MB crudos, ~27 codificados);
 * - `extractPDFPages` no manda el PDF: manda IMÁGENES que renderiza en local,
 *   así que su tope es cinco veces mayor. Confundirlos rechazaría documentos
 *   que sí se pueden leer por la segunda vía.
 *
 * DIVERGENCIA DECLARADA (única): la fuente resuelve `errorMessage`,
 * `execFileNoThrow`, `formatFileSize`, `getFsImplementation` y
 * `getToolResultsDir` por su nombre de paquete; aquí es el mismo símbolo bajo
 * el alcance `@thyrox`. No cambia ni la firma ni el comportamiento.
 */
import { randomUUID } from 'crypto'
import { mkdir, readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'
import { formatFileSize } from '@thyrox/output/formatters'
import {
  PDF_MAX_EXTRACT_SIZE,
  PDF_TARGET_RAW_SIZE,
} from '@thyrox/provider/apiLimits.js'
import { execFileNoThrow } from '@thyrox/shell/execFileNoThrow.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations.js'
import { getToolResultsDir } from '@thyrox/storage/toolResultStorage.js'

export type PDFError = {
  reason:
    | 'empty'
    | 'too_large'
    | 'password_protected'
    | 'corrupted'
    | 'unknown'
    | 'unavailable'
  message: string
}

export type PDFResult<T> =
  | { success: true; data: T }
  | { success: false; error: PDFError }

/**
 * Lee un PDF y lo devuelve codificado en base64.
 */
export async function readPDF(filePath: string): Promise<
  PDFResult<{
    type: 'pdf'
    file: {
      filePath: string
      base64: string
      originalSize: number
    }
  }>
> {
  try {
    const fs = getFsImplementation()
    const stats = await fs.stat(filePath)
    const originalSize = stats.size

    if (originalSize === 0) {
      return {
        success: false,
        error: { reason: 'empty', message: `PDF file is empty: ${filePath}` },
      }
    }

    // El tope se aplica al tamaño CRUDO y antes de leer el archivo: base64
    // crece ~33 %, y el API acota la petición entera. Comprobarlo después de
    // codificar leería en memoria un documento que ya se sabe que no cabe.
    if (originalSize > PDF_TARGET_RAW_SIZE) {
      return {
        success: false,
        error: {
          reason: 'too_large',
          message: `PDF file exceeds maximum allowed size of ${formatFileSize(PDF_TARGET_RAW_SIZE)}.`,
        },
      }
    }

    const fileBuffer = await readFile(filePath)

    // Los bytes mágicos: rechaza lo que no es un PDF —un HTML renombrado a
    // `.pdf`, por ejemplo— ANTES de que entre al contexto de la conversación.
    // Una vez que un bloque de documento inválido está en el historial, toda
    // llamada posterior al API falla con «The PDF specified was not valid» y
    // la sesión queda irrecuperable sin limpiarla. La guarda no protege a la
    // herramienta: protege a la sesión.
    const header = fileBuffer.subarray(0, 5).toString('ascii')
    if (!header.startsWith('%PDF-')) {
      return {
        success: false,
        error: {
          reason: 'corrupted',
          message: `File is not a valid PDF (missing %PDF- header): ${filePath}`,
        },
      }
    }

    const base64 = fileBuffer.toString('base64')

    // El número de páginas no se puede saber aquí sin analizar el documento.
    // El API impone su propio límite y lo reporta si se excede.

    return {
      success: true,
      data: {
        type: 'pdf',
        file: {
          filePath,
          base64,
          originalSize,
        },
      },
    }
  } catch (e: unknown) {
    return {
      success: false,
      error: {
        reason: 'unknown',
        message: errorMessage(e),
      },
    }
  }
}

/**
 * Cuenta las páginas con `pdfinfo` (de poppler-utils). Devuelve `null` cuando
 * el binario no está o cuando el conteo no se puede determinar.
 *
 * `null` y no `NaN`: un NaN viajaría como número y se compararía en silencio
 * contra un tope de páginas; el `null` obliga a quien llama a decidir.
 */
export async function getPDFPageCount(
  filePath: string,
): Promise<number | null> {
  const { code, stdout } = await execFileNoThrow('pdfinfo', [filePath], {
    timeout: 10_000,
    useCwd: false,
  })
  if (code !== 0) {
    return null
  }
  const match = /^Pages:\s+(\d+)/m.exec(stdout)
  if (!match) {
    return null
  }
  const count = parseInt(match[1]!, 10)
  return isNaN(count) ? null : count
}

export type PDFExtractPagesResult = {
  type: 'parts'
  file: {
    filePath: string
    originalSize: number
    count: number
    outputDir: string
  }
}

let pdftoppmAvailable: boolean | undefined

/** Limpia la caché de disponibilidad. Sólo para pruebas. */
export function resetPdftoppmCache(): void {
  pdftoppmAvailable = undefined
}

/**
 * ¿Está `pdftoppm` (de poppler-utils)? El resultado se cachea por proceso.
 *
 * Se cachea también el `false`: cachear sólo el sí dejaría el no sondeando el
 * binario en cada llamada, que es justo el coste que la caché evita.
 */
export async function isPdftoppmAvailable(): Promise<boolean> {
  if (pdftoppmAvailable !== undefined) return pdftoppmAvailable
  const { code, stderr } = await execFileNoThrow('pdftoppm', ['-v'], {
    timeout: 5000,
    useCwd: false,
  })
  // `pdftoppm` imprime su versión a stderr y sale con 0 — o con 99 en las
  // versiones viejas. Por eso un stderr no vacío cuenta como disponible.
  pdftoppmAvailable = code === 0 || stderr.length > 0
  return pdftoppmAvailable
}

/**
 * Renderiza las páginas del PDF a JPEG con `pdftoppm`, produciendo
 * `page-01.jpg`, `page-02.jpg`… en un directorio de salida. Es lo que permite
 * leer un PDF grande, y funciona con cualquier proveedor del API.
 *
 * @param options rango de páginas, 1-indexado e inclusivo.
 */
export async function extractPDFPages(
  filePath: string,
  options?: { firstPage?: number; lastPage?: number },
): Promise<PDFResult<PDFExtractPagesResult>> {
  try {
    const fs = getFsImplementation()
    const stats = await fs.stat(filePath)
    const originalSize = stats.size

    if (originalSize === 0) {
      return {
        success: false,
        error: { reason: 'empty', message: `PDF file is empty: ${filePath}` },
      }
    }

    if (originalSize > PDF_MAX_EXTRACT_SIZE) {
      return {
        success: false,
        error: {
          reason: 'too_large',
          message: `PDF file exceeds maximum allowed size for text extraction (${formatFileSize(PDF_MAX_EXTRACT_SIZE)}).`,
        },
      }
    }

    const available = await isPdftoppmAvailable()
    if (!available) {
      return {
        success: false,
        error: {
          reason: 'unavailable',
          message:
            'pdftoppm is not installed. Install poppler-utils (e.g. `brew install poppler` or `apt-get install poppler-utils`) to enable PDF page rendering.',
        },
      }
    }

    const uuid = randomUUID()
    // El directorio cuelga del de resultados de la SESIÓN, no de un temporal
    // del sistema: así la limpieza de la sesión arrastra las imágenes en vez
    // de dejarlas huérfanas en disco.
    const outputDir = join(getToolResultsDir(), `pdf-${uuid}`)
    await mkdir(outputDir, { recursive: true })

    // `pdftoppm` produce `<prefijo>-01.jpg`, `<prefijo>-02.jpg`, etc.
    const prefix = join(outputDir, 'page')
    const args = ['-jpeg', '-r', '100']
    if (options?.firstPage) {
      args.push('-f', String(options.firstPage))
    }
    // `Infinity` NO viaja: sale de un rango abierto de quien llama, y como
    // argumento daría `-l Infinity`, que no es un número y hace fallar el
    // render entero.
    if (options?.lastPage && options.lastPage !== Infinity) {
      args.push('-l', String(options.lastPage))
    }
    args.push(filePath, prefix)
    const { code, stderr } = await execFileNoThrow('pdftoppm', args, {
      timeout: 120_000,
      useCwd: false,
    })

    if (code !== 0) {
      if (/password/i.test(stderr)) {
        return {
          success: false,
          error: {
            reason: 'password_protected',
            message:
              'PDF is password-protected. Please provide an unprotected version.',
          },
        }
      }
      if (/damaged|corrupt|invalid/i.test(stderr)) {
        return {
          success: false,
          error: {
            reason: 'corrupted',
            message: 'PDF file is corrupted or invalid.',
          },
        }
      }
      return {
        success: false,
        error: { reason: 'unknown', message: `pdftoppm failed: ${stderr}` },
      }
    }

    const entries = await readdir(outputDir)
    const imageFiles = entries.filter(f => f.endsWith('.jpg')).sort()
    const pageCount = imageFiles.length

    // Cero páginas es un fallo, no un éxito con `count: 0`. Un éxito vacío
    // haría que quien llama mandara un mensaje sin imágenes y sin error: el
    // fallo se volvería invisible.
    if (pageCount === 0) {
      return {
        success: false,
        error: {
          reason: 'corrupted',
          message: 'pdftoppm produced no output pages. The PDF may be invalid.',
        },
      }
    }

    const count = imageFiles.length

    return {
      success: true,
      data: {
        type: 'parts',
        file: {
          filePath,
          originalSize,
          outputDir,
          count,
        },
      },
    }
  } catch (e: unknown) {
    return {
      success: false,
      error: {
        reason: 'unknown',
        message: errorMessage(e),
      },
    }
  }
}
