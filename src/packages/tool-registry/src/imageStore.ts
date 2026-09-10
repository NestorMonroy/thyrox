/**
 * Puerto de `ccnmt: packages/tool-registry/src/imageStore.ts` (167 líneas,
 * 6 símbolos exportados). La imagen pegada: en disco y en un índice.
 *
 * DOS CAMINOS A PROPÓSITO, y la separación es de latencia. `cacheImagePath`
 * puebla el índice SIN tocar el disco, para que pegar una imagen sea
 * instantáneo; `storeImage` escribe después. Fundirlos metería una
 * escritura de archivo en el camino de teclado.
 *
 * EL ÍNDICE TIENE TOPE. Sin él, una sesión larga que pegue imágenes crece
 * sin límite en memoria. El desalojo es por orden de inserción, que es el
 * que `Map` conserva.
 *
 * NADA DE ESTO PUEDE LANZAR. Pegar una imagen no puede tumbar el turno: un
 * fallo de escritura devuelve `null` y la conversación sigue sin ella.
 *
 * El archivo se abre con permisos `0600`: es contenido del usuario en un
 * directorio de configuración compartido con otros procesos.
 */
import { mkdir, open } from 'fs/promises'
import { join } from 'path'
import { getSessionId } from '@thyrox/app-host/bootstrap/state.js'
import type { PastedContent } from '@thyrox/config'
import { getClaudeConfigHomeDir } from '@thyrox/config/env/utils'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations.js'

const IMAGE_STORE_DIR = 'image-cache'
const MAX_STORED_IMAGE_PATHS = 200

/** Índice en memoria de las rutas ya conocidas, por id de contenido. */
const storedImagePaths = new Map<number, string>()

/** El directorio de imágenes de ESTA sesión. */
function getImageStoreDir(): string {
  return join(getClaudeConfigHomeDir(), IMAGE_STORE_DIR, getSessionId())
}

async function ensureImageStoreDir(): Promise<void> {
  await mkdir(getImageStoreDir(), { recursive: true })
}

/**
 * La extensión sale del `mediaType`. Sin ese campo —que el porte de #260
 * había dejado fuera del tipo— un jpeg aterrizaría llamándose `.png`.
 */
function getImagePath(imageId: number, mediaType: string): string {
  const extension = mediaType.split('/')[1] || 'png'
  return join(getImageStoreDir(), `${imageId}.${extension}`)
}

/** Puebla el índice sin tocar el disco. `null` si no es imagen. */
export function cacheImagePath(content: PastedContent): string | null {
  if (content.type !== 'image') return null
  const imagePath = getImagePath(content.id, content.mediaType || 'image/png')
  evictOldestIfAtCap()
  storedImagePaths.set(content.id, imagePath)
  return imagePath
}

/** Escribe la imagen a disco. `null` si no es imagen o si algo falla. */
export async function storeImage(content: PastedContent): Promise<string | null> {
  if (content.type !== 'image') return null

  try {
    await ensureImageStoreDir()
    const imagePath = getImagePath(content.id, content.mediaType || 'image/png')
    const fileHandle = await open(imagePath, 'w', 0o600)
    try {
      await fileHandle.writeFile(content.content, { encoding: 'base64' })
      // `datasync` porque el índice apunta a la ruta ya: si el proceso
      // muriera antes del volcado, el índice nombraría un archivo vacío.
      await fileHandle.datasync()
    } finally {
      await fileHandle.close()
    }
    evictOldestIfAtCap()
    storedImagePaths.set(content.id, imagePath)
    logForDebugging(`Stored image ${content.id} to ${imagePath}`)
    return imagePath
  } catch (error) {
    logForDebugging(`Failed to store image: ${error}`)
    return null
  }
}

/** Escribe todas las imágenes del pegado y devuelve sólo las que son imagen. */
export async function storeImages(
  pastedContents: Record<number, PastedContent>,
): Promise<Map<number, string>> {
  const pathMap = new Map<number, string>()
  for (const [id, content] of Object.entries(pastedContents)) {
    if (content.type === 'image') {
      const path = await storeImage(content)
      if (path) pathMap.set(Number(id), path)
    }
  }
  return pathMap
}

export function getStoredImagePath(imageId: number): string | null {
  return storedImagePaths.get(imageId) ?? null
}

export function clearStoredImagePaths(): void {
  storedImagePaths.clear()
}

function evictOldestIfAtCap(): void {
  while (storedImagePaths.size >= MAX_STORED_IMAGE_PATHS) {
    const oldest = storedImagePaths.keys().next().value
    if (oldest !== undefined) storedImagePaths.delete(oldest)
    else break
  }
}

/**
 * Borra las cachés de sesiones ANTERIORES, respetando la actual. Cada
 * fallo individual se traga: una sesión que no se pueda borrar no puede
 * impedir que se borren las demás.
 */
export async function cleanupOldImageCaches(): Promise<void> {
  const fsImplementation = getFsImplementation()
  const baseDir = join(getClaudeConfigHomeDir(), IMAGE_STORE_DIR)
  const currentSessionId = getSessionId()

  try {
    let sessionDirs
    try {
      sessionDirs = await fsImplementation.readdir(baseDir)
    } catch {
      return
    }

    for (const sessionDir of sessionDirs) {
      if (sessionDir.name === currentSessionId) continue
      const sessionPath = join(baseDir, sessionDir.name)
      try {
        await fsImplementation.rm(sessionPath, { recursive: true, force: true })
        logForDebugging(`Cleaned up old image cache: ${sessionPath}`)
      } catch {
        // Un directorio que no se deja borrar no detiene a los demás.
      }
    }

    try {
      const remaining = await fsImplementation.readdir(baseDir)
      if (remaining.length === 0) await fsImplementation.rmdir(baseDir)
    } catch {
      // El directorio base puede quedarse; no es un fallo del usuario.
    }
  } catch {
    // Leer el directorio base puede fallar; la limpieza es best-effort.
  }
}
