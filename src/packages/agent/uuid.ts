/**
 * Reconocedor de UUID y acunador de identificador de agente.
 * Porte de `ccnmt: packages/agent/uuid.ts` (`validateUuid`, `createAgentId`).
 */
import { randomBytes } from 'node:crypto'
import type { AgentId } from './idTypes.ts'

/** Un UUID en su forma canonica, marcado. */
export type Uuid = string & { readonly __brand: 'Uuid' }

/** La forma canonica: 8-4-4-4-12 hexadecimales, sin distinguir mayusculas. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Reconoce un UUID canonico. Acepta `unknown` a proposito: quien lo llama
 * suele venir de JSON, donde el tipo no esta garantizado.
 */
export function validateUuid(candidate: unknown): Uuid | null {
  if (typeof candidate !== 'string') return null
  return UUID_PATTERN.test(candidate) ? (candidate as Uuid) : null
}

/**
 * Acuna un identificador de agente: `a`, la etiqueta opcional, y 16
 * hexadecimales de 8 bytes aleatorios.
 */
export function createAgentId(label?: string): AgentId {
  const suffix = randomBytes(8).toString('hex')
  return (label ? `a${label}-${suffix}` : `a${suffix}`) as AgentId
}
