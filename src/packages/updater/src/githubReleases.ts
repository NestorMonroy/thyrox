/**
 * Adaptador de GitHub Releases para el auto-updater. Reemplaza la ruta
 * del bucket GCS que usaba Anthropic upstream. Fuente única de verdad
 * para "¿bajo qué repo y convención de nombre de asset publica ccb?".
 *
 * Puerto de `ccnmt: packages/updater/src/githubReleases.ts` (276 líneas
 * fuente, 100% portado).
 */

import axios from 'axios'
import { logEvent } from '@thyrox/local-observability'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { logError } from '@thyrox/local-observability/log.js'
import type { NpmDistTags } from './autoUpdater.js'
import { getPlatform } from './nativeInstaller/platform.js'

// Hard-coded — este es el repo donde se publican los releases de ccb.
// Sobreescribible via la env CCB_RELEASES_REPO para forks/testing.
const DEFAULT_REPO = 'Jcg-admin/claude-code-how-works-how-works-how-works'

function getRepo(): string {
  return process.env.CCB_RELEASES_REPO || DEFAULT_REPO
}

function getReleasesApiUrl(): string {
  return `https://api.github.com/repos/${getRepo()}/releases`
}

/**
 * La URL web (no-API) de "ultimo release". Un GET contra esta devuelve
 * un 302 cuyo `Location` es `.../releases/tag/<tag>`. Crucialmente esta
 * ruta la sirve github.com, NO api.github.com, asi que NO esta sujeta al
 * limite de 60-peticiones/hora de la API sin autenticar. install.sh usa
 * exactamente este redirect para resolver "latest" — el auto-updater
 * dentro de la app ahora tambien, asi que ambos concuerdan y ninguno
 * muere por un 403 de IP compartida.
 */
function getReleasesWebLatestUrl(): string {
  return `https://github.com/${getRepo()}/releases/latest`
}

export function getAssetDownloadUrl(tag: string, assetName: string): string {
  return `https://github.com/${getRepo()}/releases/download/${tag}/${assetName}`
}

/**
 * Mapea nuestro string interno de plataforma (darwin-arm64, linux-x64,
 * ...) al nombre de archivo del asset de release. Espeja
 * scripts/build-platforms.ts. Los binarios de Windows llevan sufijo
 * `.exe` del lado del asset; el binario local que cae en
 * `versions/<v>` NO incluye el sufijo porque la plataforma es la de la
 * maquina local — ccb corriendo en Windows ya sabe que es Windows.
 */
export function getAssetNameForPlatform(platform: string = getPlatform()): string {
  // Descarta el sufijo musl — los assets de release solo publican
  // Linux glibc por ahora.
  const normalized = platform.replace(/-musl$/, '')
  if (normalized.startsWith('win32')) {
    // getPlatform() de Bun devuelve "win32-x64"; nuestro asset de
    // release es "ccb-windows-x64.exe".
    return 'ccb-windows-x64.exe'
  }
  return `ccb-${normalized}`
}

/**
 * Parsea una URL `.../releases/tag/<tag>` de GitHub (el `Location` del
 * redirect web de "latest") y devuelve el segmento `<tag>` puro, o null
 * si la URL no calza con esa forma. Exportado para tests unitarios.
 */
export function parseTagFromReleaseLocation(location: string): string | null {
  // Acepta tanto la forma absoluta (https://github.com/o/r/releases/tag/v1.2.3)
  // como la forma relativa rara (/o/r/releases/tag/v1.2.3). Descarta
  // cualquier query/hash. El tag es el ultimo segmento de ruta despues
  // de `/tag/`.
  const match = location.match(/\/releases\/tag\/([^/?#]+)/)
  if (!match) return null
  const tag = decodeURIComponent(match[1]!).trim()
  return tag.length > 0 ? tag : null
}

/**
 * Resuelve el tag del ultimo release.
 *
 * La ruta por defecto es el redirect web de github.com
 * (`/releases/latest` → 302 `Location: /releases/tag/<tag>`), que NO
 * esta rate-limited como api.github.com. Esto importa porque la *API*
 * de GitHub sin autenticar solo permite 60 peticiones/hora POR IP — en
 * una IP compartida/NAT'd ese presupuesto se agota rutinariamente por
 * trafico ajeno, y el auto-updater entonces recibiria un 403 en cada
 * arranque y nunca actualizaria en silencio. install.sh ya resuelve
 * "latest" via este mismo redirect; alinear el updater dentro de la
 * app elimina esa asimetria. (Verificado: el redirect web no devuelve
 * cabeceras x-ratelimit-*.)
 *
 * Cuando GITHUB_TOKEN esta seteado se prefiere la API (5000/h
 * autenticado, y devuelve JSON estructurado) — los runners de CI la
 * setean; los usuarios finales raramente.
 *
 * Devuelve el string del tag (p.ej. "v26.5.92") con la "v" inicial
 * preservada — los llamadores la descartan si necesitan un numero de
 * version puro.
 */
export async function fetchLatestReleaseTag(): Promise<string> {
  if (process.env.GITHUB_TOKEN) {
    return fetchLatestReleaseTagViaApi()
  }
  return fetchLatestReleaseTagViaRedirect()
}

/**
 * Resuelve el ultimo tag via el redirect web de github.com (sin limite
 * de la API). Se le dice a axios que NO siga el redirect
 * (maxRedirects: 0) para poder leer la cabecera `Location` del 302
 * nosotros mismos.
 */
async function fetchLatestReleaseTagViaRedirect(): Promise<string> {
  const url = getReleasesWebLatestUrl()
  const startTime = Date.now()
  try {
    const response = await axios.get(url, {
      timeout: 30_000,
      maxRedirects: 0,
      // 302/301 = el redirect que queremos. 404 = sin releases (fork
      // fresco). 200 significaria que GitHub sirvio la pagina
      // directamente sin redirect (no existe release) — manejado abajo
      // como "sin location".
      validateStatus: status =>
        status === 302 || status === 301 || status === 200 || status === 404,
    })
    const latencyMs = Date.now() - startTime

    if (response.status === 404) {
      logEvent('tengu_version_check_no_releases', {})
      throw new Error('No releases published for this repository.')
    }

    const location =
      (response.headers?.location as string | undefined) ??
      (response.headers?.Location as string | undefined)
    const tag = location ? parseTagFromReleaseLocation(location) : null
    if (!tag) {
      // Sin target de redirect (p.ej. un repo con cero releases sirve
      // el indice de releases en 200 sin tag) — se trata como "sin
      // release".
      logEvent('tengu_version_check_no_releases', {})
      throw new Error(
        `No release tag found in redirect from ${url} (location: ${location ?? 'none'})`,
      )
    }

    logEvent('tengu_version_check_success', { latency_ms: latencyMs })
    logForDebugging(`[githubReleases] latest tag (redirect): ${tag}`)
    return tag
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    let httpStatus: number | undefined
    if (axios.isAxiosError(error) && error.response) {
      httpStatus = error.response.status
    }
    logEvent('tengu_version_check_failure', {
      latency_ms: latencyMs,
      http_status: httpStatus,
      is_timeout: errorMessage.includes('timeout'),
    })
    const wrapped = new Error(
      `Failed to fetch latest release from ${url}: ${errorMessage}`,
    )
    logError(wrapped)
    throw wrapped
  }
}

/**
 * Resuelve el ultimo tag via la API autenticada de GitHub (5000/h). Solo
 * se usa cuando GITHUB_TOKEN esta presente. Devuelve JSON estructurado,
 * asi que se lee `tag_name` directamente.
 */
async function fetchLatestReleaseTagViaApi(): Promise<string> {
  const url = `${getReleasesApiUrl()}/latest`
  const startTime = Date.now()
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  }

  try {
    const response = await axios.get(url, {
      timeout: 30_000,
      headers,
      validateStatus: status => status === 200 || status === 404,
    })
    const latencyMs = Date.now() - startTime

    if (response.status === 404) {
      // Sin releases publicados aun (fork fresco) — se trata como "sin
      // actualizacion disponible".
      logEvent('tengu_version_check_no_releases', {})
      throw new Error('No releases published for this repository.')
    }

    const tag = (response.data?.tag_name as string | undefined)?.trim()
    if (!tag) {
      throw new Error(
        `GitHub API returned no tag_name in response from ${url}`,
      )
    }

    logEvent('tengu_version_check_success', { latency_ms: latencyMs })
    logForDebugging(`[githubReleases] latest tag (api): ${tag}`)
    return tag
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    let httpStatus: number | undefined
    if (axios.isAxiosError(error) && error.response) {
      httpStatus = error.response.status
    }
    logEvent('tengu_version_check_failure', {
      latency_ms: latencyMs,
      http_status: httpStatus,
      is_timeout: errorMessage.includes('timeout'),
    })
    const wrapped = new Error(
      `Failed to fetch latest release from ${url}: ${errorMessage}`,
    )
    logError(wrapped)
    throw wrapped
  }
}

/**
 * Obtiene el checksum SHA256 de un asset dado, si hay uno publicado.
 * Convencion: cada asset binario `ccb-<platform>` tiene un hermano
 * `ccb-<platform>.sha256` con el formato `<hex>  <filename>`.
 *
 * Devuelve null si no existe el archivo de checksum — el llamador debe
 * tratarlo como "confiar en la descarga" (aun asi verificada por TLS,
 * solo que no fijada por contenido).
 */
export async function fetchAssetSha256(
  tag: string,
  assetName: string,
): Promise<string | null> {
  const url = getAssetDownloadUrl(tag, `${assetName}.sha256`)
  try {
    const response = await axios.get(url, {
      timeout: 10_000,
      responseType: 'text',
      validateStatus: s => s === 200 || s === 404,
    })
    if (response.status === 404) {
      logForDebugging(`[githubReleases] no .sha256 for ${assetName} (skipping verify)`)
      return null
    }
    // Parsea el output formato shasum `<hex>  <filename>`. Toma el
    // primer token hex de 64 caracteres.
    const match = String(response.data).match(/\b[0-9a-f]{64}\b/i)
    return match?.[0] ?? null
  } catch (error) {
    logForDebugging(
      `[githubReleases] sha256 fetch failed for ${assetName}: ${error}`,
    )
    return null
  }
}

/**
 * Dist-tags para instalaciones nativas de ccb (el panel "Updates" del
 * doctor).
 *
 * ccb publica a GitHub Releases, NO al bucket GCS de Anthropic — asi que
 * una instalacion nativa de ccb debe resolver su "latest" desde GitHub.
 * Antes la pantalla de doctor llamaba getGcsDistTags() para TODAS las
 * instalaciones nativas, lo que hacia que ccb reportara la version
 * upstream de Anthropic (p.ej. "2.1.150") en vez de la propia (p.ej.
 * "26.5.92"). Ese numero es incorrecto e inalcanzable (26.x > 2.x, asi
 * que isVersionNewer nunca dispara), lo que hacia parecer que existia
 * una actualizacion que nunca podria instalarse.
 *
 * ccb no tiene un canal "stable" separado de "latest" — ambos mapean al
 * unico release "latest" de GitHub. Se descarta la "v" inicial para que
 * el valor concuerde con MACRO.VERSION ("26.5.92", no "v26.5.92").
 */
export async function getGithubDistTags(): Promise<NpmDistTags> {
  try {
    const tag = await fetchLatestReleaseTag()
    const version = tag.startsWith('v') ? tag.slice(1) : tag
    return { latest: version, stable: version }
  } catch (error) {
    logForDebugging(`getGithubDistTags: GitHub fetch failed: ${error}`)
    return { latest: null, stable: null }
  }
}
