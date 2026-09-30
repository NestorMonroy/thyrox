#!/usr/bin/env bash
# Anulaciones de #106d-6e-3: tickets de un solo uso del flujo de dispositivo.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts/oauth/deviceFlowTickets.ts"
run() { timeout 120 bun test ./__tests__/accounts/oauth/deviceFlowTickets.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: otra caducidad"; annul "$F" "DEVICE_FLOW_TICKET_TTL_MS = 15 * 60 * 1000" "DEVICE_FLOW_TICKET_TTL_MS = 16 * 60 * 1000"
echo "== 2: un token corto"; annul "$F" "const TOKEN_BYTES = 32" "const TOKEN_BYTES = 16"
echo "== 3: el token en base64"; annul "$F" "randomBytes(TOKEN_BYTES).toString('base64url')" "randomBytes(TOKEN_BYTES).toString('base64')"
echo "== 4: la caducidad no inclusiva"; annul "$F" "const isExpired = (ticket: DeviceFlowTicket) => ticket.expiresAt <= now()" "const isExpired = (ticket: DeviceFlowTicket) => ticket.expiresAt < now()"
echo "== 5: sin podar al crear"; annul "$F" "    prune()
    const token = newToken()" "    const token = newToken()"
echo "== 6: sin la conexión destino"; annul "$F" "tickets.set(token, { token, provider, connectionId, expiresAt" "tickets.set(token, { token, provider, expiresAt"
echo "== 7: peek sin caducidad"; annul "$F" "return ticket && !isExpired(ticket) ? ticket : null" "return ticket ?? null"
echo "== 8: cualquier proveedor reclama"; annul "$F" "ticket.provider !== provider || " ""
echo "== 9: se reclama dos veces"; annul "$F" " || ticket.status !== 'pending') return null" ") return null"
echo "== 10: reclamar no marca"; annul "$F" "    ticket.status = 'claimed'" "    void 0"
echo "== 11: completar sin resultado"; annul "$F" "    ticket.result = result" "    void result"
echo "== 12: completar sin estado"; annul "$F" "    ticket.status = 'completed'" "    void 0"
echo "== 13: liberar cualquier estado"; annul "$F" "    if (ticket?.status === 'claimed') ticket.status = 'pending'" "    if (ticket) ticket.status = 'pending'"
echo "== 14: sin liberar"; annul "$F" "    if (ticket?.status === 'claimed') ticket.status = 'pending'" "    void ticket"
echo "== 15: el estado sin resultado"; annul "$F" "return { status: ticket.status, result: ticket.result ?? null }" "return { status: ticket.status, result: null }"
echo "== 16: sin expirado"; annul "$F" "    if (!ticket) return { status: 'expired', result: null }" "    if (!ticket) return { status: 'pending', result: null }"
echo "== 17: tickets compartidos"; annul "$F" "export function createDeviceFlowTickets(deps: DeviceFlowTicketsDeps = {}) {
  const now = deps.now ?? Date.now
  const newToken = deps.newToken ?? (() => randomBytes(TOKEN_BYTES).toString('base64url'))
  const tickets = new Map<string, DeviceFlowTicket>()" "const SHARED = new Map<string, DeviceFlowTicket>()
export function createDeviceFlowTickets(deps: DeviceFlowTicketsDeps = {}) {
  const now = deps.now ?? Date.now
  const newToken = deps.newToken ?? (() => randomBytes(TOKEN_BYTES).toString('base64url'))
  const tickets = SHARED"
echo "== restaurado"; run
