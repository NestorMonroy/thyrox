/**
 * Los tipos del puente MITM: qué agentes intercepta y cómo se declara el
 * destino de cada uno.
 *
 * Porte de `omniroute: src/mitm/types.ts` (MIT).
 */
import { z } from 'zod'

export const MITM_AGENT_IDS = [
  'antigravity', 'kiro', 'copilot', 'codex', 'cursor', 'zed',
  'claude-code', 'open-code', 'trae', 'ghe-copilot',
] as const

export type AgentId = (typeof MITM_AGENT_IDS)[number]

/** Lo mínimo de un handler que el registro de destinos necesita conocer. */
export interface MitmHandlerContract {
  readonly agentId: AgentId
}

export interface MitmTarget {
  id: AgentId
  name: string
  icon: string
  color: string
  /** Los hosts que se interceptan, p. ej. `api.githubcopilot.com`. */
  hosts: string[]
  port: number
  endpointPatterns: string[]
  defaultModels: Array<{ id: string; name: string; alias: string }>
  setupTutorial: {
    steps: string[]
    detection: { command: string; platform: 'linux' | 'macos' | 'windows' | 'all' }
  }
  handler: () => Promise<{ default: new () => MitmHandlerContract }>
  /** Clave del aviso de riesgo que se muestra al activarlo. */
  riskNoticeKey: string
  /** `investigating` marca un agente cuya superficie aún no se confirmó (Trae). */
  viability?: 'investigating' | 'supported' | 'deprecated'
}

/** La vista serializable de un destino: sin `handler`, que es una función. */
export type MitmTargetView = Omit<MitmTarget, 'handler'>

export const MitmTargetSchema = z.object({
  id: z.enum(MITM_AGENT_IDS),
  name: z.string(),
  icon: z.string(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  hosts: z.array(z.string()).min(1),
  port: z.number().int().positive().max(65535).default(443),
  endpointPatterns: z.array(z.string()).default([]),
  defaultModels: z.array(z.object({ id: z.string(), name: z.string(), alias: z.string() })).default([]),
  setupTutorial: z.object({
    steps: z.array(z.string()),
    detection: z.object({
      command: z.string(),
      platform: z.enum(['linux', 'macos', 'windows', 'all']),
    }),
  }),
  riskNoticeKey: z.string(),
  viability: z.enum(['investigating', 'supported', 'deprecated']).optional(),
})

export type DetectionResult = {
  installed: boolean
  version?: string
  path?: string
}
