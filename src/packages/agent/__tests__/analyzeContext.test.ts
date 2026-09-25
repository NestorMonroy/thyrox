/**
 * `analyzeContext` (`ccnmt: packages/agent/contextAnalysis.ts:27`): el
 * recorrido bloque a bloque que reparte los tokens de una conversación en
 * cubos —humano, asistente, salida de comando local, peticiones y
 * resultados por herramienta, adjuntos, lecturas repetidas—.
 *
 * Los tokens esperados se calculan con el MISMO estimador que la función
 * usa (`roughTokenCountEstimation` sobre el JSON del bloque), no a mano:
 * lo que se mide es el reparto, no la aritmética del estimador.
 */
import { beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { analyzeContext } from '../contextAnalysis.ts'
import { installAgentHostBindings } from '../host.ts'
import type { AgentHostBindings } from '../contracts.ts'
import type { Message } from '../messageShapes.ts'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { roughTokenCountEstimation } from '../tokenEstimation.ts'
import { jsonStringify } from '@thyrox/local-observability/slowOperations.js'

const blockTokens = (block: unknown): number => roughTokenCountEstimation(jsonStringify(block))

// El host instala sus enlaces al arrancar; aquí se instala el normalizador
// con el filtro que la API recibe: sólo mensajes de usuario y asistente.
// `queryRuntime.ts` resuelve este enlace por nombre sobre el mismo objeto
// (`DynamicAgentBindings`), así que aquí se declara con la misma anchura.
beforeAll(() => {
  const bindings = {
    normalizeMessagesForAPI: (messages: { type: string }[]) =>
      messages.filter(m => m.type === 'user' || m.type === 'assistant'),
  }
  installAgentHostBindings(bindings as AgentHostBindings)
})

function user(content: ContentBlockParam[]): Message {
  return { type: 'user', uuid: randomUUID(), message: { role: 'user', content } }
}
function assistant(content: ContentBlockParam[]): Message {
  return { type: 'assistant', uuid: randomUUID(), message: { role: 'assistant', content } }
}

describe('analyzeContext', () => {
  test('una conversación vacía da estadísticas en cero', () => {
    const stats = analyzeContext([])
    expect(stats.total).toBe(0)
    expect(stats.humanMessages).toBe(0)
    expect(stats.toolRequests.size).toBe(0)
    expect(stats.duplicateFileReads.size).toBe(0)
  })

  test('el texto de usuario y de asistente va a su cubo; el total los suma', () => {
    const userBlock = { type: 'text' as const, text: 'hola desde el usuario' }
    const assistantBlock = { type: 'text' as const, text: 'hola desde el asistente' }
    const stats = analyzeContext([user([userBlock]), assistant([assistantBlock])])
    expect(stats.humanMessages).toBe(blockTokens(userBlock))
    expect(stats.assistantMessages).toBe(blockTokens(assistantBlock))
    expect(stats.total).toBe(blockTokens(userBlock) + blockTokens(assistantBlock))
  })

  test('un texto de usuario con salida de comando local NO cuenta como humano', () => {
    const block = { type: 'text' as const, text: '<local-command-stdout>ls</local-command-stdout>' }
    const stats = analyzeContext([user([block])])
    expect(stats.localCommandOutputs).toBe(blockTokens(block))
    expect(stats.humanMessages).toBe(0)
  })

  test('tool_use y tool_result se atribuyen a la herramienta por su id', () => {
    const use = { type: 'tool_use' as const, id: 'tu-1', name: 'Bash', input: { command: 'ls' } }
    const result = { type: 'tool_result' as const, tool_use_id: 'tu-1', content: 'a b c' }
    const stats = analyzeContext([assistant([use]), user([result])])
    expect(stats.toolRequests.get('Bash')).toBe(blockTokens(use))
    expect(stats.toolResults.get('Bash')).toBe(blockTokens(result))
  })

  test('un tool_result sin tool_use conocido se atribuye a `unknown`', () => {
    const result = { type: 'tool_result' as const, tool_use_id: 'huerfano', content: 'x' }
    const stats = analyzeContext([user([result])])
    expect(stats.toolResults.get('unknown')).toBe(blockTokens(result))
  })

  test('dos lecturas del mismo archivo: la segunda es duplicado, con los tokens de una lectura media', () => {
    const use1 = { type: 'tool_use' as const, id: 'r-1', name: 'Read', input: { file_path: '/a.ts' } }
    const res1 = { type: 'tool_result' as const, tool_use_id: 'r-1', content: 'contenido corto' }
    const use2 = { type: 'tool_use' as const, id: 'r-2', name: 'Read', input: { file_path: '/a.ts' } }
    const res2 = { type: 'tool_result' as const, tool_use_id: 'r-2', content: 'contenido bastante mas largo que el primero' }
    const stats = analyzeContext([assistant([use1]), user([res1]), assistant([use2]), user([res2])])
    const totalRead = blockTokens(res1) + blockTokens(res2)
    expect(stats.duplicateFileReads.get('/a.ts')).toEqual({
      count: 2,
      tokens: Math.floor(totalRead / 2),
    })
  })

  test('una sola lectura por archivo no es duplicado', () => {
    const use = { type: 'tool_use' as const, id: 'r-1', name: 'Read', input: { file_path: '/solo.ts' } }
    const res = { type: 'tool_result' as const, tool_use_id: 'r-1', content: 'x' }
    const stats = analyzeContext([assistant([use]), user([res])])
    expect(stats.duplicateFileReads.size).toBe(0)
  })

  test('los adjuntos se cuentan por tipo y no aportan tokens', () => {
    const attachment: Message = {
      type: 'attachment',
      uuid: randomUUID(),
      attachment: { type: 'plan_file_reference', planContent: 'x'.repeat(400) },
    }
    const stats = analyzeContext([attachment, attachment])
    expect(stats.attachments.get('plan_file_reference')).toBe(2)
    expect(stats.total).toBe(0)
  })

  test('un mensaje que no va a la API (progress) no aporta tokens', () => {
    const progress: Message = { type: 'progress', uuid: randomUUID(), data: { text: 'x'.repeat(400) } }
    const stats = analyzeContext([progress])
    expect(stats.total).toBe(0)
  })

  test('los bloques que no son texto ni herramienta caen en `other`', () => {
    const thinking = { type: 'thinking' as const, thinking: 'pensando', signature: 'sig' }
    const stats = analyzeContext([assistant([thinking])])
    expect(stats.other).toBe(blockTokens(thinking))
    expect(stats.assistantMessages).toBe(0)
  })
})
