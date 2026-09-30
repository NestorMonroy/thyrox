/**
 * Los proveedores cuyos refresh tokens rotan revocan la familia entera si
 * dos cuentas hermanas refrescan a la vez: lo toman por reutilización. El
 * mutex por conexión no alcanza, porque las que chocan son conexiones
 * distintas. Aquí el refresco de red va de uno en uno dentro de cada familia,
 * con una pausa sólo cuando otra ya espera; las demás no esperan nada.
 *
 * Porte de `omniroute: open-sse/services/refreshSerializer.ts` (MIT).
 */
import type { Environment } from '../oauth/flows/clientId.ts'

/** Los proveedores de un mismo servicio de identidad comparten carril. */
const ROTATION_LOCK_GROUP: Readonly<Record<string, string>> = {
  codex: 'openai-auth0',
  openai: 'openai-auth0',
  claude: 'anthropic-oauth',
  'gitlab-duo': 'gitlab-duo',
  kiro: 'kiro',
  'kimi-coding': 'kimi-coding',
  cline: 'cline',
}

const DEFAULT_REFRESH_SPACING_MS = 2000

export function rotationGroupFor(provider: string): string | null {
  return ROTATION_LOCK_GROUP[provider] ?? null
}

/** La pausa entre dos refrescos de una familia; `0` la desactiva, lo ilegible vuelve al valor por defecto. */
export function refreshSpacingMs(env: Environment): number {
  const raw = env.THYROX_REFRESH_SPACING_MS
  if (raw === undefined || raw === '') return DEFAULT_REFRESH_SPACING_MS
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_REFRESH_SPACING_MS
}

export type RefreshSerializer = <T>(provider: string, fn: () => Promise<T>) => Promise<T>

export function createRefreshSerializer(deps: { env?: Environment; sleep?: (ms: number) => Promise<void> } = {}): RefreshSerializer {
  const env = deps.env ?? process.env
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))
  const groupTail = new Map<string, Promise<void>>()

  return async function serializeRefresh<T>(provider: string, fn: () => Promise<T>): Promise<T> {
    const group = rotationGroupFor(provider)
    if (!group) return fn()

    const previousTail = groupTail.get(group) ?? Promise.resolve()
    let release!: () => void
    const mine = new Promise<void>(resolve => (release = resolve))
    const myTail = previousTail.then(() => mine)
    groupTail.set(group, myTail)

    // La cola nunca rechaza: cada refresco libera su turno en `finally`, falle o no.
    await previousTail
    try {
      return await fn()
    } finally {
      // Un refresco solo no tiene con quién chocar: la pausa sólo se paga si otro espera detrás.
      if (groupTail.get(group) !== myTail) {
        const spacing = refreshSpacingMs(env)
        if (spacing > 0) await sleep(spacing)
      }
      release()
      if (groupTail.get(group) === myTail) groupTail.delete(group)
    }
  }
}
