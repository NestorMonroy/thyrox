/**
 * Porte COMPLETO de `ccnmt: packages/agent/contextCollapse/index.ts`.
 *
 * La fuente misma es un stub auto-generado: las nueve exportaciones son
 * no-ops o valores fijos (`isContextCollapseEnabled` siempre `false`), sin
 * mecanismo real de colapso de contexto detrás. El porte lo refleja tal
 * cual — sólo se preservan las formas (interfaces, firmas) para que el
 * resto del árbol pueda tipar contra ellas.
 *
 * DIVERGENCIA DE ALCANCE en un tipo de la firma — mismo criterio que
 * `skillSearch/prefetch.ts`: `ToolUseContext` (fuente:
 * `@claude-code-how-works/tool-registry/Tool.js`, bloqueado — otro agente de
 * esta ola porta `tool-registry`) se sustituye por el `ToolUseContext` ya
 * declarado en `../postSamplingHooks.ts`. Como ningún cuerpo inspecciona sus
 * campos, la sustitución no cambia el comportamiento observable.
 */

import type { Message } from '../messageShapes.ts'
import type { ToolUseContext } from '../postSamplingHooks.ts'
import type { QuerySource } from '../querySource.ts'

export interface ContextCollapseHealth {
  totalSpawns: number
  totalErrors: number
  lastError: string | null
  emptySpawnWarningEmitted: boolean
  totalEmptySpawns: number
}

export interface ContextCollapseStats {
  collapsedSpans: number
  collapsedMessages: number
  stagedSpans: number
  health: ContextCollapseHealth
}

export interface CollapseResult {
  messages: Message[]
}

export interface DrainResult {
  committed: number
  messages: Message[]
}

export const getStats: () => ContextCollapseStats = () => ({
  collapsedSpans: 0,
  collapsedMessages: 0,
  stagedSpans: 0,
  health: {
    totalSpawns: 0,
    totalErrors: 0,
    lastError: null,
    emptySpawnWarningEmitted: false,
    totalEmptySpawns: 0,
  },
})

export const isContextCollapseEnabled: () => boolean = () => false

export const subscribe: (callback: () => void) => () => void =
  (_callback: () => void) => () => {}

export const applyCollapsesIfNeeded: (
  messages: Message[],
  toolUseContext: ToolUseContext,
  querySource: QuerySource,
) => Promise<CollapseResult> = async (messages: Message[]) => ({ messages })

export const isWithheldPromptTooLong: (
  message: Message,
  isPromptTooLongMessage: (msg: Message) => boolean,
  querySource: QuerySource,
) => boolean = () => false

export const recoverFromOverflow: (
  messages: Message[],
  querySource: QuerySource,
) => DrainResult = (messages: Message[]) => ({ committed: 0, messages })

export const resetContextCollapse: () => void = () => {}

export const initContextCollapse: () => void = () => {}
