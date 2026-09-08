/**
 * Qué repositorio de GitHub es éste.
 *
 * Procedencia: `ccnmt: packages/storage/src/detectRepository.ts` (121 líneas,
 * 6 exports). Ese árbol declara `"license": "UNLICENSED"`, así que el cuerpo
 * se **reimplementa** —mismo nombre de módulo, mismo sitio, mismos nombres y
 * firmas— y no se copia.
 *
 * Sustituye al porte parcial anterior, que declaraba UNO de los seis. Sus tres
 * razones estaban caducadas, medido: `app-host/bootstrap/cwd` existe,
 * `getRemoteUrl` de `./git.js` existe —llegó en el pase anterior— y
 * `local-observability` existe, así que el `logForDebugging` no-op local se
 * retira y el módulo vuelve a tener canal de diagnóstico.
 *
 * El módulo tiene DOS caras a propósito, y no se pueden fundir:
 * `detectCurrentRepositoryWithHost` responde por cualquier host —una
 * instalación privada de GitHub incluida— y `detectCurrentRepository` filtra
 * a github.com, porque quien la llama construye URLs de github.com con la
 * respuesta. Colapsarlas no da un error: da enlaces que apuntan al sitio
 * equivocado y parecen correctos.
 */
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { getRemoteUrl } from './git.js'
import { parseGitRemote, type ParsedRepository } from './parseGitRemote.js'

export { parseGitRemote, type ParsedRepository }

/**
 * La caché va POR directorio, no global: dos worktrees o dos proyectos
 * abiertos a la vez tienen remotos distintos, y una caché global le daría a
 * uno la respuesta del otro.
 */
const repositoryWithHostCache = new Map<string, ParsedRepository | null>()

export function clearRepositoryCaches(): void {
  repositoryWithHostCache.clear()
}

export async function detectCurrentRepository(): Promise<string | null> {
  const result = await detectCurrentRepositoryWithHost()
  if (!result) return null
  // Sólo github.com: quien llama asume que el resultado es de ahí. Para
  // instalaciones privadas está `detectCurrentRepositoryWithHost`.
  if (result.host !== 'github.com') return null
  return `${result.owner}/${result.name}`
}

/**
 * Como `detectCurrentRepository`, pero devuelve también el host. Quien
 * necesite construir URLs contra un host concreto usa ésta.
 */
export async function detectCurrentRepositoryWithHost(): Promise<ParsedRepository | null> {
  const cwd = getCwd()

  if (repositoryWithHostCache.has(cwd)) {
    return repositoryWithHostCache.get(cwd) ?? null
  }

  try {
    const remoteUrl = await getRemoteUrl()
    logForDebugging(`Git remote URL: ${remoteUrl}`)
    if (!remoteUrl) {
      logForDebugging('No git remote URL found')
      // El `null` se cachea también: si sólo se cacheara el acierto, cada
      // consulta en un repositorio sin remoto volvería a lanzar git.
      repositoryWithHostCache.set(cwd, null)
      return null
    }

    const parsed = parseGitRemote(remoteUrl)
    logForDebugging(
      `Parsed repository: ${parsed ? `${parsed.host}/${parsed.owner}/${parsed.name}` : null} from URL: ${remoteUrl}`,
    )
    repositoryWithHostCache.set(cwd, parsed)
    return parsed
  } catch (error) {
    logForDebugging(`Error detecting repository: ${error}`)
    repositoryWithHostCache.set(cwd, null)
    return null
  }
}

/**
 * El repositorio de github.com cacheado para el cwd actual, como
 * `owner/name`, de forma SÍNCRONA. `null` si nadie lo ha resuelto todavía o
 * si el host no es github.com.
 *
 * Es síncrona a propósito: la usa código que no puede esperar. Sin nada
 * cacheado la respuesta honesta es `null`, no un valor a medias — quien la
 * necesite resuelta llama antes a `detectCurrentRepository`.
 */
export function getCachedRepository(): string | null {
  const parsed = repositoryWithHostCache.get(getCwd())
  if (!parsed || parsed.host !== 'github.com') return null
  return `${parsed.owner}/${parsed.name}`
}

/**
 * Parsea una URL de remoto git —o un `owner/repo` pelado— y devuelve
 * `owner/repo`. Sólo responde por github.com; para una instalación privada,
 * `parseGitRemote` directamente.
 *
 * El `owner/repo` pelado se acepta por retrocompatibilidad con quien ya
 * guardaba la respuesta en ese formato.
 */
export function parseGitHubRepository(input: string): string | null {
  const trimmed = input.trim()

  const parsed = parseGitRemote(trimmed)
  if (parsed) {
    if (parsed.host !== 'github.com') return null
    return `${parsed.owner}/${parsed.name}`
  }

  // Si ningún patrón de URL casó, puede venir ya en formato `owner/repo`.
  if (
    !trimmed.includes('://') &&
    !trimmed.includes('@') &&
    trimmed.includes('/')
  ) {
    const parts = trimmed.split('/')
    if (parts.length === 2 && parts[0] && parts[1]) {
      const repo = parts[1].replace(/\.git$/, '')
      return `${parts[0]}/${repo}`
    }
  }

  logForDebugging(`Could not parse repository from: ${trimmed}`)
  return null
}
