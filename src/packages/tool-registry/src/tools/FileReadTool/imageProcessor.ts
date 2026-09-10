/**
 * Adaptación de
 * `ccnmt: packages/tool-registry/src/tools/FileReadTool/imageProcessor.ts`.
 *
 * Resuelve, de forma perezosa y memoizada a nivel de módulo, la función
 * `sharp`-compatible que el resto del paquete usa para procesar imágenes.
 *
 * Ni `image-processor-napi` (binario nativo propio) ni `sharp` están
 * instalados en este árbol — medido: ningún `package.json` del workspace
 * los declara, y no hay entrada suya en `node_modules/.bun`. No es un
 * bloqueo de PORTE: la carga es dinámica, así que el módulo importa limpio
 * sin ninguno de los dos binarios presentes, y sólo rechaza cuando algo
 * llama de verdad a `getImageProcessor()` o `getImageCreator()`. Instalar
 * cualquiera de los dos es una decisión de runtime, no de este agente.
 */
import { isInBundledMode } from '@thyrox/config/bundledMode'

/** Superficie mínima de una instancia `sharp` que el resto del paquete consume. */
export type SharpInstance = {
  metadata(): Promise<{ width: number; height: number; format: string }>
  resize(
    width: number,
    height: number,
    options?: { fit?: string; withoutEnlargement?: boolean },
  ): SharpInstance
  jpeg(options?: { quality?: number }): SharpInstance
  png(options?: {
    compressionLevel?: number
    palette?: boolean
    colors?: number
  }): SharpInstance
  webp(options?: { quality?: number }): SharpInstance
  toBuffer(): Promise<Buffer>
}

/** La función `sharp(buffer)` — punto de entrada para procesar una imagen existente. */
export type SharpFunction = (input: Buffer) => SharpInstance

/** Opciones del constructor `sharp({ create: ... })` — lienzo en blanco, sin buffer fuente. */
type SharpCreatorOptions = {
  create: {
    width: number
    height: number
    channels: 3 | 4
    background: { r: number; g: number; b: number }
  }
}

/** La función `sharp({ create })` — punto de entrada para crear una imagen desde cero. */
type SharpCreator = (options: SharpCreatorOptions) => SharpInstance

// Caché a nivel de módulo: dos llamadas concurrentes a getImageProcessor()
// (o getImageCreator()) no disparan dos imports dinámicos por separado.
let cachedProcessor: SharpFunction | null = null
let cachedCreator: SharpCreator | null = null

/**
 * Devuelve la función de procesamiento para imágenes YA EXISTENTES
 * (redimensionar, recomprimir). Intenta primero el binario nativo
 * `image-processor-napi` — funciona tanto en `bun dist/cli.js` como en un
 * bundle standalone de `bun build --compile`, donde `sharp` no resuelve su
 * binario de plataforma. Si esa carga falla — plataforma sin `.node`
 * embebido, o el propio `sharp` tampoco resuelve — cae a `sharp` a secas.
 *
 * `isInBundledMode` se conserva importado sin usarse como compuerta de
 * decisión: la fuente lo retiene para un llamador futuro que sí distinga
 * por modo empaquetado, y este porte preserva esa forma tal cual en vez de
 * decidir por su cuenta que sobra.
 */
export async function getImageProcessor(): Promise<SharpFunction> {
  if (cachedProcessor) return cachedProcessor
  void isInBundledMode // referenciado para no perder el import; no gatea nada aquí

  try {
    const napiModule = await import('image-processor-napi')
    const candidate = (napiModule.sharp ?? napiModule.default) as SharpFunction
    if (typeof candidate === 'function') {
      cachedProcessor = candidate
      return candidate
    }
  } catch {
    // Sin binario nativo para esta plataforma (o sin el paquete instalado):
    // se sigue con el intento directo a sharp más abajo.
    console.warn('Native image processor not available, falling back to sharp')
  }

  // Último recurso: sharp directo. Su binario de plataforma tampoco está
  // garantizado en toda configuración de runtime — si falla, quien llame
  // ve el rechazo y decide su propio fallback (p. ej. pasar el buffer sin
  // procesar).
  const imported = (await import('sharp')) as MaybeDefault<SharpFunction>
  const sharpFn = unwrapDefault(imported)
  cachedProcessor = sharpFn
  return sharpFn
}

/**
 * Devuelve el constructor para CREAR una imagen desde cero (lienzo en
 * blanco vía `{ create: ... }`). `image-processor-napi` no implementa
 * creación de imágenes — sólo procesamiento de imágenes existentes — así
 * que aquí se va SIEMPRE directo a `sharp`, sin intentar el nativo primero
 * ni emitir el aviso de fallback.
 */
export async function getImageCreator(): Promise<SharpCreator> {
  if (cachedCreator) return cachedCreator

  const imported = (await import('sharp')) as MaybeDefault<SharpCreator>
  const creator = unwrapDefault(imported)
  cachedCreator = creator
  return creator
}

// La forma del resultado de un import() dinámico varía según el modo de
// interop del paquete cargado: ESM entrega `{ default: fn }`, CJS entrega
// `fn` directamente como el propio módulo.
type MaybeDefault<T> = T | { default: T }

function unwrapDefault<T extends (...args: never[]) => unknown>(
  mod: MaybeDefault<T>,
): T {
  return typeof mod === 'function' ? mod : mod.default
}
