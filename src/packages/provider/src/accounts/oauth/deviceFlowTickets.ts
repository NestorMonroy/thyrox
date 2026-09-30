/**
 * Tickets de un solo uso para el enlace público de conexión de codex. Quien
 * genera el enlace comparte el token y sondea su estado; quien lo abre completa
 * el flujo de dispositivo en su navegador, y la conexión se guarda una sola vez:
 * reclamar el ticket rechaza los envíos duplicados o concurrentes.
 *
 * En memoria: no sobreviven a un reinicio ni se comparten entre procesos, lo
 * que basta para un enlace de quince minutos.
 *
 * Porte de `omniroute: src/lib/oauth/deviceFlowTickets.ts` (MIT).
 */
import { randomBytes } from 'node:crypto'

/** La caducidad del código de dispositivo de OpenAI. */
export const DEVICE_FLOW_TICKET_TTL_MS = 15 * 60 * 1000
const TOKEN_BYTES = 32

export type DeviceFlowTicketStatus = 'pending' | 'claimed' | 'completed'

export interface DeviceFlowTicketResult {
  connectionId: string
  email: string | null
}

export interface DeviceFlowTicket {
  token: string
  provider: string
  /** La conexión que se actualiza en vez de crear otra. */
  connectionId?: string
  /** Milisegundos epoch. */
  expiresAt: number
  status: DeviceFlowTicketStatus
  result?: DeviceFlowTicketResult
}

export interface DeviceFlowTicketsDeps {
  now?: () => number
  newToken?: () => string
}

export function createDeviceFlowTickets(deps: DeviceFlowTicketsDeps = {}) {
  const now = deps.now ?? Date.now
  const newToken = deps.newToken ?? (() => randomBytes(TOKEN_BYTES).toString('base64url'))
  const tickets = new Map<string, DeviceFlowTicket>()

  const isExpired = (ticket: DeviceFlowTicket) => ticket.expiresAt <= now()

  function prune(): void {
    for (const [token, ticket] of tickets) if (isExpired(ticket)) tickets.delete(token)
  }

  function create(provider: string, connectionId?: string): { token: string; expiresAt: number } {
    prune()
    const token = newToken()
    const expiresAt = now() + DEVICE_FLOW_TICKET_TTL_MS
    tickets.set(token, { token, provider, connectionId, expiresAt, status: 'pending' })
    return { token, expiresAt }
  }

  /** El ticket vigente, en cualquier estado. */
  function peek(token: string): DeviceFlowTicket | null {
    prune()
    return tickets.get(token) ?? null
  }

  /** Reclama un ticket pendiente del proveedor para completarlo exactamente una vez. */
  function claim(token: string, provider: string): DeviceFlowTicket | null {
    const ticket = peek(token)
    if (!ticket || ticket.provider !== provider || ticket.status !== 'pending') return null
    ticket.status = 'claimed'
    return ticket
  }

  function complete(token: string, result: DeviceFlowTicketResult): void {
    const ticket = tickets.get(token)
    if (!ticket) return
    ticket.status = 'completed'
    ticket.result = result
  }

  /** Tras un fallo, el ticket reclamado vuelve a pendiente para que el visitante reintente. */
  function release(token: string): void {
    const ticket = tickets.get(token)
    if (ticket?.status === 'claimed') ticket.status = 'pending'
  }

  /** Lo que sondea quien generó el enlace: `expired` si ya no existe. */
  function status(token: string): { status: DeviceFlowTicketStatus | 'expired'; result: DeviceFlowTicketResult | null } {
    const ticket = peek(token)
    if (!ticket) return { status: 'expired', result: null }
    return { status: ticket.status, result: ticket.result ?? null }
  }

  return { create, peek, claim, complete, release, status, size: () => tickets.size }
}
