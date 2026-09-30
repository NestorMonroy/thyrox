/**
 * Las conversaciones que el upstream `claude-cli` reconoce: cada una es una
 * sesión de claude (`--session-id`), y se reconoce por alias en una
 * `SessionCache` (`../session/sessionCache.ts`, la caché de afinidad de
 * CLIProxyAPI): el id de cada `tool_use` que se devolvió al cliente, y la
 * clave de prefijo de la historia que el cliente va a reenviar. Un turno
 * suspendido se RETIENE aquí con su plazo: si el cliente no vuelve con el
 * `tool_result` antes, se abandona con causa y el proceso termina.
 */
import { SessionCache } from '../session/sessionCache.ts'
import type { RunningTurn } from './turn.ts'

const TOOL_USE_ALIAS = 'tool_use:'
const PREFIX_ALIAS = 'prefix:'

export function toolUseAlias(toolUseId: string): string {
  return `${TOOL_USE_ALIAS}${toolUseId}`
}

export function prefixAlias(prefixKey: string): string {
  return `${PREFIX_ALIAS}${prefixKey}`
}

type HeldTurn = { turn: RunningTurn; timer: ReturnType<typeof setTimeout> }

export class ConversationRegistry {
  private readonly sessions: SessionCache
  private readonly held = new Map<string, HeldTurn>()

  constructor(options: { conversationTtlMs: number; now?: () => number }) {
    this.sessions = new SessionCache({ ttlMs: options.conversationTtlMs, now: options.now, cleanup: false })
  }

  /** Une los alias a la sesión, junto a los que ya tuviera. */
  bind(sessionId: string, aliases: readonly string[]): void {
    this.sessions.setAliases(sessionId, ...aliases)
  }

  /** La sesión del primer alias vigente, refrescada. */
  sessionOf(aliases: readonly string[]): string | undefined {
    for (const alias of aliases) {
      const sessionId = this.sessions.getAndRefresh(alias)
      if (sessionId) return sessionId
    }
    return undefined
  }

  /** Retiene un turno suspendido hasta que alguien lo tome o venza su plazo. */
  hold(turn: RunningTurn, ttlMs: number, onExpire: (turn: RunningTurn) => void): void {
    const timer = setTimeout(() => {
      this.held.delete(turn.sessionId)
      onExpire(turn)
    }, ttlMs)
    timer.unref?.()
    this.held.set(turn.sessionId, { turn, timer })
  }

  /** El turno retenido de la sesión, que deja de estar retenido. */
  take(sessionId: string): RunningTurn | undefined {
    const held = this.held.get(sessionId)
    if (!held) return undefined
    clearTimeout(held.timer)
    this.held.delete(sessionId)
    return held.turn
  }

  heldCount(): number {
    return this.held.size
  }

  /** Suelta todo turno retenido, avisando de cada uno. */
  stop(onAbandon: (turn: RunningTurn) => void): void {
    for (const sessionId of [...this.held.keys()]) {
      const turn = this.take(sessionId)
      if (turn) onAbandon(turn)
    }
    this.sessions.stop()
  }
}
