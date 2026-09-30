/**
 * El par PKCE (verificador y su reto S256) y el `state` contra CSRF de un
 * inicio de sesión OAuth. Cada proveedor fija cuántos bytes lleva su
 * verificador.
 *
 * Porte de `omniroute: src/lib/oauth/utils/pkce.ts` (MIT).
 */
import { createHash, randomBytes } from 'node:crypto'

const DEFAULT_VERIFIER_BYTES = 32
const STATE_BYTES = 32

export interface PkcePair {
  codeVerifier: string
  codeChallenge: string
  state: string
}

export function generateCodeVerifier(bytes = DEFAULT_VERIFIER_BYTES): string {
  return randomBytes(bytes).toString('base64url')
}

export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function generateState(): string {
  return randomBytes(STATE_BYTES).toString('base64url')
}

export function generatePkce(verifierBytes = DEFAULT_VERIFIER_BYTES): PkcePair {
  const codeVerifier = generateCodeVerifier(verifierBytes)
  return { codeVerifier, codeChallenge: generateCodeChallenge(codeVerifier), state: generateState() }
}
