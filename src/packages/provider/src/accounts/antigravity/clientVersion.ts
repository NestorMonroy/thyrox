/**
 * La versión con que se presenta el cliente de Antigravity: la más nueva
 * entre la publicada (feed de releases del IDE, última release del CLI) y la
 * de respaldo, con seis horas de caché. Una fuente inalcanzable deja la de
 * respaldo y se vuelve a consultar la próxima vez.
 *
 * Porte de `omniroute: open-sse/services/antigravityVersion.ts` (MIT). La
 * caché vive en la instancia, no en el módulo.
 */
import type { ClientVersionsView } from './clientIdentity.ts'

const IDE_RELEASE_FEED_URL = 'https://antigravity-auto-updater-974169037036.us-central1.run.app/releases'
const CLI_RELEASE_URL = 'https://api.github.com/repos/google-antigravity/antigravity-cli/releases/latest'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 5_000
export const IDE_FALLBACK_VERSION = '2.1.1'
export const CLI_FALLBACK_VERSION = '1.1.5'
const SEMVER_PARTS = 3

function normalizeVersion(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.trim().replace(/^v/i, '').match(/^(\d+\.\d+\.\d+)\b/)?.[1] ?? null
}

function compareSemver(a: string, b: string): number {
  const left = a.split('.').map(part => Number.parseInt(part, 10) || 0)
  const right = b.split('.').map(part => Number.parseInt(part, 10) || 0)
  for (let i = 0; i < SEMVER_PARTS; i += 1) if (left[i] !== right[i]) return left[i]! - right[i]!
  return 0
}

function newest(...versions: unknown[]): string | null {
  return versions
    .map(normalizeVersion)
    .filter((version): version is string => version !== null)
    .reduce<string | null>((best, version) => (!best || compareSemver(version, best) > 0 ? version : best), null)
}

function parseIdeReleaseFeed(payload: unknown): string | null {
  return Array.isArray(payload) ? newest(...payload.map(entry => (entry as { version?: unknown })?.version)) : null
}

function parseCliRelease(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const release = payload as { name?: unknown; tag_name?: unknown }
  return normalizeVersion(release.tag_name ?? release.name)
}

interface VersionSource {
  url: string
  fallback: string
  parse: (payload: unknown) => string | null
}

export interface ClientVersions extends ClientVersionsView {
  resolveIde(): Promise<string>
  resolveCli(): Promise<string>
}

export interface ClientVersionsDeps {
  fetch?: typeof globalThis.fetch
  now?: () => number
}

export function createClientVersions(deps: ClientVersionsDeps = {}): ClientVersions {
  const fetch = deps.fetch ?? globalThis.fetch
  const now = deps.now ?? Date.now

  const track = (source: VersionSource) => {
    let cache: { fetchedAt: number; version: string } | null = null
    let inFlight: Promise<string> | null = null

    const fetchLatest = async (): Promise<string | null> => {
      try {
        const response = await fetch(source.url, {
          headers: { Accept: 'application/json', 'User-Agent': 'thyrox-antigravity-version/1.0' },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })
        return response.ok ? source.parse(await response.json()) : null
      } catch {
        return null
      }
    }

    const resolve = async (): Promise<string> => {
      if (cache && now() - cache.fetchedAt < CACHE_TTL_MS) return newest(cache.version, source.fallback) ?? source.fallback
      if (inFlight) return inFlight
      inFlight = (async () => {
        const latest = await fetchLatest()
        const version = newest(latest, cache?.version, source.fallback) ?? source.fallback
        if (latest) cache = { fetchedAt: now(), version }
        return version
      })()
      try {
        return await inFlight
      } finally {
        inFlight = null
      }
    }

    return { resolve, cached: () => cache?.version ?? source.fallback }
  }

  const ide = track({ url: IDE_RELEASE_FEED_URL, fallback: IDE_FALLBACK_VERSION, parse: parseIdeReleaseFeed })
  const cli = track({ url: CLI_RELEASE_URL, fallback: CLI_FALLBACK_VERSION, parse: parseCliRelease })
  return { resolveIde: ide.resolve, resolveCli: cli.resolve, cachedIde: ide.cached, cachedCli: cli.cached }
}
