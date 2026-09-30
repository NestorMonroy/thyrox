/**
 * Caché de sesión → credencial con caducidad — porte de CLIProxyAPI
 * (`sdk/cliproxy/auth/session_cache.go`, leído como referencia).
 *
 * Una sesión lógica tiene varios alias (la identidad explícita, la derivada,
 * la clave de caché de prompt…) y todos apuntan a la misma credencial. Los
 * alias de un grupo caducan juntos, se refrescan juntos y se desalojan
 * juntos: el grupo más viejo sale primero cuando se supera la capacidad.
 *
 * Divergencias declaradas:
 * - JavaScript corre en un solo hilo: no hay candados. La prueba de acceso
 *   concurrente de la referencia se porta intercalando los ocho escritores.
 * - El reloj se inyecta (`now`), para probar la caducidad sin dormir.
 * - La limpieza periódica usa un temporizador que no retiene el proceso
 *   (`unref`); sin él, `Get` y `GetAndRefresh` ya descartan lo caducado.
 */
const MAX_STABLE_SESSION_ALIASES = 64
const DEFAULT_MAX_SESSION_ENTRIES = 65_536
const DEFAULT_TTL_MS = 30 * 60 * 1000

type SessionEntry = { authId: string; expiresAt: number; aliases: readonly string[] }

export type SessionCacheOptions = {
  ttlMs?: number
  maxEntries?: number
  now?: () => number
  /** Limpieza periódica cada `ttl/2`; desactivable en pruebas. */
  cleanup?: boolean
}

export class SessionCache {
  private readonly entries = new Map<string, SessionEntry>()
  /** Los grupos por su alias primario, en orden de inserción: el primero es el más viejo. */
  private readonly groups = new Map<string, SessionEntry>()
  private readonly ttlMs: number
  private readonly maxEntries: number
  private readonly now: () => number
  private timer: ReturnType<typeof setInterval> | undefined

  constructor(options: SessionCacheOptions = {}) {
    this.ttlMs = options.ttlMs && options.ttlMs > 0 ? options.ttlMs : DEFAULT_TTL_MS
    this.maxEntries = options.maxEntries && options.maxEntries > 0 ? options.maxEntries : DEFAULT_MAX_SESSION_ENTRIES
    this.now = options.now ?? Date.now
    if (options.cleanup !== false) {
      this.timer = setInterval(() => this.cleanup(), Math.max(1, Math.floor(this.ttlMs / 2)))
      this.timer.unref?.()
    }
  }

  /** La credencial de la sesión si sigue vigente; no refresca. */
  get(sessionId: string): string | undefined {
    if (!sessionId) return undefined
    const entry = this.entries.get(sessionId)
    if (!entry) return undefined
    if (this.now() < entry.expiresAt) return entry.authId
    this.removeGroup(entry)
    return undefined
  }

  /** La credencial de la sesión, refrescando la caducidad de todo su grupo. */
  getAndRefresh(sessionId: string): string | undefined {
    if (!sessionId) return undefined
    const entry = this.entries.get(sessionId)
    if (!entry) return undefined
    const now = this.now()
    if (now >= entry.expiresAt) {
      this.removeGroup(entry)
      return undefined
    }
    this.replaceGroups(entry.authId, now + this.ttlMs, compactAliases(mergeAliases([sessionId], ...entry.aliases)), entry)
    return entry.authId
  }

  set(sessionId: string, authId: string): void {
    this.setAliases(authId, sessionId)
  }

  /** Une varios alias de una sesión a la credencial, junto con los que ya tuvieran. */
  setAliases(authId: string, ...sessionIds: string[]): void {
    if (!authId) return
    const now = this.now()
    let aliases = mergeAliases([], ...sessionIds)
    const previous: SessionEntry[] = []
    for (const sessionId of sessionIds) {
      const entry = this.entries.get(sessionId)
      if (!entry) continue
      if (now >= entry.expiresAt) {
        this.removeGroup(entry)
        continue
      }
      previous.push(entry)
      aliases = mergeAliases(aliases, ...entry.aliases)
    }
    aliases = compactAliases(aliases)
    if (aliases.length === 0) return
    this.replaceGroups(authId, now + this.ttlMs, aliases, ...previous)
  }

  /** Refresca la sesión sólo si sigue unida a la credencial esperada. */
  touch(sessionId: string, expectedAuthId: string): boolean {
    if (!sessionId || !expectedAuthId) return false
    const now = this.now()
    const entry = this.entries.get(sessionId)
    if (!entry || entry.authId !== expectedAuthId || now >= entry.expiresAt) return false
    this.replaceGroups(expectedAuthId, now + this.ttlMs, compactAliases(mergeAliases([sessionId], ...entry.aliases)), entry)
    return true
  }

  /** Retira el alias sólo si sigue unido a la credencial esperada. */
  compareAndDelete(sessionId: string, expectedAuthId: string): boolean {
    if (!sessionId || !expectedAuthId) return false
    const entry = this.entries.get(sessionId)
    if (!entry || entry.authId !== expectedAuthId) return false
    this.removeAlias(entry, sessionId)
    return true
  }

  /** Retira un alias sin que los demás del grupo lo vuelvan a crear al refrescarse. */
  invalidate(sessionId: string): void {
    if (!sessionId) return
    const entry = this.entries.get(sessionId)
    if (entry) this.removeAlias(entry, sessionId)
  }

  /** Retira todas las sesiones de una credencial que dejó de estar disponible. */
  invalidateAuth(authId: string): void {
    if (!authId) return
    for (const group of [...this.groups.values()]) {
      if (group.authId === authId) this.removeGroup(group)
    }
  }

  /** Cuántos alias hay registrados. */
  get size(): number {
    return this.entries.size
  }

  stop(): void {
    if (this.timer !== undefined) clearInterval(this.timer)
    this.timer = undefined
  }

  /** Retira los grupos caducados. */
  cleanup(): void {
    const now = this.now()
    for (const group of [...this.groups.values()]) {
      if (now >= group.expiresAt) this.removeGroup(group)
    }
  }

  private removeAlias(entry: SessionEntry, sessionId: string): void {
    this.removeGroup(entry)
    const surviving = entry.aliases.filter(alias => alias !== sessionId)
    if (surviving.length > 0) this.replaceGroups(entry.authId, entry.expiresAt, surviving)
  }

  private replaceGroups(authId: string, expiresAt: number, aliases: readonly string[], ...previous: SessionEntry[]): void {
    for (const entry of previous) this.removeGroup(entry)
    if (aliases.length === 0) return
    const primary = aliases[0]!
    const existing = this.groups.get(primary)
    if (existing) this.removeGroup(existing)
    const entry: SessionEntry = { authId, expiresAt, aliases: [...aliases] }
    this.groups.set(primary, entry)
    for (const alias of aliases) this.entries.set(alias, entry)
    while (this.entries.size > this.maxEntries) {
      const oldest = this.groups.values().next()
      if (oldest.done) break
      this.removeGroup(oldest.value)
    }
  }

  private removeGroup(entry: SessionEntry): void {
    if (entry.aliases.length === 0) return
    const primary = entry.aliases[0]!
    if (sameGroup(this.groups.get(primary), entry)) this.groups.delete(primary)
    for (const alias of entry.aliases) {
      if (sameGroup(this.entries.get(alias), entry)) this.entries.delete(alias)
    }
  }
}

function sameGroup(left: SessionEntry | undefined, right: SessionEntry): boolean {
  return left !== undefined && left.authId === right.authId && left.expiresAt === right.expiresAt &&
    left.aliases.length === right.aliases.length && left.aliases.every((alias, index) => alias === right.aliases[index])
}

/** `isLocalPromptCacheSessionAlias`: `pck:<clave>` o `<prefijo>::pck:<clave>`. */
export function isPromptCacheAlias(alias: string): boolean {
  if (alias.startsWith('pck:')) return true
  const separator = alias.indexOf('::')
  return separator >= 0 && alias.slice(separator + 2).startsWith('pck:')
}

/** Como mucho una clave de caché de prompt y 64 alias estables, en su orden. */
export function compactAliases(aliases: readonly string[], isPromptCache: (alias: string) => boolean = isPromptCacheAlias): string[] {
  const compacted: string[] = []
  let promptCacheSeen = false
  let stable = 0
  for (const alias of aliases) {
    if (isPromptCache(alias)) {
      if (promptCacheSeen) continue
      promptCacheSeen = true
    } else {
      if (stable >= MAX_STABLE_SESSION_ALIASES) continue
      stable++
    }
    compacted.push(alias)
  }
  return compacted
}

/** Los alias existentes seguidos de los candidatos, sin vacíos ni repetidos. */
export function mergeAliases(existing: readonly string[], ...candidates: string[]): string[] {
  const seen = new Set<string>()
  const merged: string[] = []
  for (const alias of [...existing, ...candidates]) {
    if (!alias || seen.has(alias)) continue
    seen.add(alias)
    merged.push(alias)
  }
  return merged
}
