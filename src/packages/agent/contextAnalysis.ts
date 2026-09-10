/**
 * Porte PARCIAL de `ccnmt: packages/agent/contextAnalysis.ts`.
 *
 * La fuente declara además `analyzeContext` (recorre `Message[]` y produce
 * un `TokenStats`), `processBlock` e `increment`. `analyzeContext` depende
 * de `normalizeMessagesForAPI` (`../messages.js`, PROHIBIDO tocar en este
 * porte — otro agente lo escribe ahora mismo) y de tipos del SDK de
 * Anthropic (`BetaContentBlock`, `ContentBlock`, `ContentBlockParam`) que
 * este árbol aún no vendoriza.
 *
 * DIVERGENCIA DE ALCANCE, declarada: aquí sólo se porta el tipo `TokenStats`
 * (declarado localmente, idéntico campo a campo al de la fuente) y la
 * función pura `tokenStatsToStatsigMetrics`, que es la única que
 * `__tests__/tokenStatsToStatsigMetrics.test.ts` ejercita — no consume
 * `analyzeContext` ni el SDK. `analyzeContext`/`processBlock`/`increment`
 * se portan cuando `../messages.js::normalizeMessagesForAPI` exista en el
 * árbol y tengan consumidor real.
 */

export type TokenStats = {
  toolRequests: Map<string, number>
  toolResults: Map<string, number>
  humanMessages: number
  assistantMessages: number
  localCommandOutputs: number
  other: number
  attachments: Map<string, number>
  duplicateFileReads: Map<string, { count: number; tokens: number }>
  total: number
}

export function tokenStatsToStatsigMetrics(
  stats: TokenStats,
): Record<string, number> {
  const metrics: Record<string, number> = {
    total_tokens: stats.total,
    human_message_tokens: stats.humanMessages,
    assistant_message_tokens: stats.assistantMessages,
    local_command_output_tokens: stats.localCommandOutputs,
    other_tokens: stats.other,
  }

  stats.attachments.forEach((count, type) => {
    metrics[`attachment_${type}_count`] = count
  })

  stats.toolRequests.forEach((tokens, tool) => {
    metrics[`tool_request_${tool}_tokens`] = tokens
  })

  stats.toolResults.forEach((tokens, tool) => {
    metrics[`tool_result_${tool}_tokens`] = tokens
  })

  const duplicateTotal = [...stats.duplicateFileReads.values()].reduce(
    (sum, d) => sum + d.tokens,
    0,
  )

  metrics.duplicate_read_tokens = duplicateTotal
  metrics.duplicate_read_file_count = stats.duplicateFileReads.size

  if (stats.total > 0) {
    metrics.human_message_percent = Math.round(
      (stats.humanMessages / stats.total) * 100,
    )
    metrics.assistant_message_percent = Math.round(
      (stats.assistantMessages / stats.total) * 100,
    )
    metrics.local_command_output_percent = Math.round(
      (stats.localCommandOutputs / stats.total) * 100,
    )
    metrics.duplicate_read_percent = Math.round(
      (duplicateTotal / stats.total) * 100,
    )

    const toolRequestTotal = [...stats.toolRequests.values()].reduce(
      (sum, v) => sum + v,
      0,
    )
    const toolResultTotal = [...stats.toolResults.values()].reduce(
      (sum, v) => sum + v,
      0,
    )

    metrics.tool_request_percent = Math.round(
      (toolRequestTotal / stats.total) * 100,
    )
    metrics.tool_result_percent = Math.round(
      (toolResultTotal / stats.total) * 100,
    )

    // Porcentajes de solicitud por herramienta.
    stats.toolRequests.forEach((tokens, tool) => {
      metrics[`tool_request_${tool}_percent`] = Math.round(
        (tokens / stats.total) * 100,
      )
    })

    // Porcentajes de resultado por herramienta.
    stats.toolResults.forEach((tokens, tool) => {
      metrics[`tool_result_${tool}_percent`] = Math.round(
        (tokens / stats.total) * 100,
      )
    })
  }

  return metrics
}
