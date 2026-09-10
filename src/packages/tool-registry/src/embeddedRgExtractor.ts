/**
 * Extrae el binario de ripgrep — sólo para la caja de arena.
 *
 * El camino normal del harness hacia ripgrep es `ripgrep-napi`: en proceso, sin
 * lanzar nada. Pero el respaldo Linux de la caja de arena invoca `rg` como
 * comando EXTERNO para calcular las rutas denegadas del sistema de archivos, y
 * para eso necesita un archivo real en disco al que hacer `posix_spawn`. NAPI
 * no sirve ahí porque la caja de arena es un proceso *aparte*.
 *
 * Para ese único caso —Linux, con la caja de arena habilitada, que es opcional
 * y poco frecuente— el binario de la plataforma viaja embebido en el ejecutable
 * autónomo y se extrae cuando hace falta.
 *
 * En macOS la caja de arena usa primitivas de glob nativas y no necesita rg; en
 * Windows no está soportada. En ambos devuelve `null`.
 *
 * La caché va en `os.tmpdir()/thyrox-sandbox-rg-<sha16>`, y es efímera a
 * propósito: el sistema limpia su temporal y un reinicio la borra. El sha es el
 * de los bytes embebidos, así que al subir de versión el binario no encuentra
 * la caché vieja y vuelve a extraer — sin eso, una actualización serviría el
 * rg anterior en silencio.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/embeddedRgExtractor.ts`
 * (83 líneas, 1 símbolo exportado). Ese árbol declara
 * `"license": "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se
 * copia.
 *
 * DIVERGENCIA DECLARADA (una): los dos identificadores que nombran al producto
 * —la global `__CCB_SANDBOX_RG_PATH__` y el prefijo de caché `ccb-sandbox-rg-`—
 * nombran el harness de la fuente, no éste. Aquí son `__THYROX_SANDBOX_RG_PATH__`
 * y `thyrox-sandbox-rg-`. Conservarlos habría metido el dominio del proveedor
 * en el código del consumidor, que es justo lo que la tarea #249 registra como
 * defecto; y el prefijo de caché además colisionaría en un sistema donde
 * convivieran los dos.
 */
import { createHash } from 'crypto'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { isInBundledMode } from '@thyrox/config/bundledMode'
import { logForDebugging } from '@thyrox/local-observability/debug.js'

declare global {
  // eslint-disable-next-line no-var
  var __THYROX_SANDBOX_RG_PATH__: string | undefined
}

let cachedExtracted: string | null = null

/**
 * La ruta en disco de un rg ya extraído, lista para que la caja de arena lo
 * lance. `null` en las plataformas donde la caja de arena no necesita rg
 * (macOS, Windows), y en modo de desarrollo —ahí el build deja un rg junto a
 * `dist/` y el adaptador lo resuelve por su cuenta; a este módulo sólo le toca
 * el caso del ejecutable autónomo.
 */
export function ensureExtractedRipgrepForSandbox(): string | null {
  if (process.platform !== 'linux') return null
  if (cachedExtracted !== null) return cachedExtracted

  if (!isInBundledMode()) return null

  const embeddedPath = globalThis.__THYROX_SANDBOX_RG_PATH__
  if (!embeddedPath) return null

  let bytes: Buffer
  try {
    bytes = readFileSync(embeddedPath)
  } catch (e) {
    logForDebugging(
      `embeddedRgExtractor: readFileSync failed for ${embeddedPath}: ${String(e)}`,
    )
    return null
  }

  const sha = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
  const target = join(tmpdir(), `thyrox-sandbox-rg-${sha}`)

  if (!existsSync(target)) {
    try {
      mkdirSync(tmpdir(), { recursive: true })
      writeFileSync(target, bytes)
      // Sin el bit de ejecución el `posix_spawn` de la caja de arena falla
      // con EACCES, que es un error del lanzamiento y no de la extracción:
      // costaría buscarlo en el sitio equivocado.
      chmodSync(target, 0o755)
      logForDebugging(
        `embeddedRgExtractor: extracted ${bytes.length} bytes to ${target}`,
      )
    } catch (e) {
      logForDebugging(`embeddedRgExtractor: extract failed: ${String(e)}`)
      return null
    }
  }

  cachedExtracted = target
  return target
}
