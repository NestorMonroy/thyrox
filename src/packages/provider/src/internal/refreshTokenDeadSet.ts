/**
 * Porte de `ccnmt: packages/provider/src/oauth/refreshTokenDeadSet.ts` —
 * sibling NO asignado a este pase, compartido por `authAlias.ts` y
 * `oauth/client.ts` (ambos de los 18): un `Set` en memoria de proceso de
 * refresh tokens ya conocidos como muertos (`invalid_grant`), para no
 * volver a intentar refrescarlos hasta que un rewrite externo de
 * `.credentials.json` invalide la caché.
 */

const deadRefreshTokens = new Set<string>()

export function markRefreshTokenDead(token: string): void {
  deadRefreshTokens.add(token)
}

export function isRefreshTokenDead(token: string): boolean {
  return deadRefreshTokens.has(token)
}

export function clearRefreshTokenDeadSet(): void {
  deadRefreshTokens.clear()
}
