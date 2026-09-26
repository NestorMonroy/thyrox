// Tipos de `save_result.mjs`, el hook de SubagentStop. El módulo es JS para
// que Node lo cargue sin compilar; esta declaración deja que las suites en TS
// lo importen con tipos (sin ella: TS7016, «implicitly has an 'any' type»).

/** El uso acumulado de un transcript: tokens por tipo y turnos distintos. */
export type SubagentUsage = {
  input: number
  cacheCreation: number
  cacheRead: number
  output: number
  turns: number
}

export const LOG_BASENAME: 'registro-de-agentes.md'
export function resolveLogFile(
  args?: Record<string, string | undefined>,
  env?: Record<string, string | undefined>,
): string | null
export function parseArgs(argv?: string[]): Record<string, string>
export function transcriptPath(payload?: {
  agent_transcript_path?: string
  transcript_path?: string
}): string | null
export function usageFromLines(lines?: string[]): SubagentUsage
export function lastAssistantText(lines?: string[]): string
export const COST_KINDS: Readonly<Record<string, string>>
export function harnessHeadline(usage: SubagentUsage): number
export function equivalentCost(usage: SubagentUsage): number
export function shouldRecord(text: string, usage: SubagentUsage): boolean
export function entryFor(entry: {
  ts: string
  session: string
  transcript: string
  text: string
  usage: SubagentUsage
}): string
export function appendEntry(logFile: string, entry: string): void
export function main(argv?: string[], env?: Record<string, string | undefined>): void
