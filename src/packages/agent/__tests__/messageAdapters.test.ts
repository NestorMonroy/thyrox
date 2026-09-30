/**
 * Adaptadores reales entre el modelo del bucle (`AgentMessage`, anidado) y el
 * de `AgentCore` (`CoreMessage`, plano). Cuatro propiedades, cada una con su
 * caso:
 *
 *   1. Ida: el core recibe la forma plana que declara (`content`, `usage`,
 *      `stop_reason`, `model` en la raiz), sin `message`.
 *   2. Vuelta sin cambios: el bucle recupera EL MISMO objeto que entro
 *      (`fromCoreMessages(event.after)` depende de eso).
 *   3. Vuelta de un mensaje creado por el core: se construye la forma anidada.
 *   4. Vuelta de una copia modificada por el core: conserva los campos del
 *      bucle y del cuerpo que el core no conoce, con los cambios del core.
 */
import { describe, expect, test } from 'bun:test'
// Ruta sustituible para los controles de anulacion en paralelo
// (`src/verify/annul_parallel.sh`): cada variante es una copia del modulo.
const { fromCoreMessage, fromCoreMessages, toCoreMessage, toCoreMessages } = (await import(
  process.env.MESSAGE_ADAPTERS_MODULE ?? '../messageAdapters.ts'
)) as typeof import('../messageAdapters.ts')
import type { AgentMessage } from '../internalTypes.ts'
import type { CoreAssistantMessage, CoreMessage } from '../coreMessages.ts'

const usage = { input_tokens: 10, output_tokens: 4, cache_read_input_tokens: 2 }

function agentAssistant(): AgentMessage {
  return {
    type: 'assistant',
    uuid: 'a-1',
    timestamp: '2026-09-24T22:00:00.000Z',
    isMeta: false,
    message: {
      id: 'msg_1',
      role: 'assistant',
      model: 'claude-sonnet-5',
      content: [{ type: 'text', text: 'hola' }],
      usage,
      stop_reason: 'end_turn',
    },
  }
}

describe('toCoreMessage — ida a la forma plana', () => {
  test('un assistant lleva content, usage, stop_reason y model en la raiz', () => {
    const core = toCoreMessage(agentAssistant()) as CoreAssistantMessage
    expect(core.type).toBe('assistant')
    expect(core.role).toBe('assistant')
    expect(core.content).toEqual([{ type: 'text', text: 'hola' }])
    expect(core.usage).toEqual(usage)
    expect(core.stop_reason).toBe('end_turn')
    expect(core.model).toBe('claude-sonnet-5')
    expect(core.timestamp).toBe(Date.parse('2026-09-24T22:00:00.000Z'))
    expect('message' in core).toBe(false)
  })

  test('un user conserva su content de cadena', () => {
    const core = toCoreMessage({ type: 'user', uuid: 'u-1', message: { role: 'user', content: 'hola' } })
    expect(core).toMatchObject({ type: 'user', role: 'user', content: 'hola' })
  })

  test('un system lleva el content de la raiz y su subtype', () => {
    const core = toCoreMessage({ type: 'system', uuid: 's-1', subtype: 'compact_boundary', content: 'x' })
    expect(core).toMatchObject({ type: 'system', content: 'x', subtype: 'compact_boundary' })
  })

  test('un tipo que el core no modela viaja como system con su tipo en subtype', () => {
    const core = toCoreMessage({ type: 'attachment', uuid: 't-1', attachment: { type: 'file' } })
    expect(core).toMatchObject({ type: 'system', subtype: 'attachment' })
  })
})

describe('fromCoreMessage — vuelta al modelo anidado', () => {
  test('sin cambios devuelve el MISMO objeto que entro', () => {
    const original = agentAssistant()
    const attachment: AgentMessage = { type: 'attachment', uuid: 't-1', attachment: { type: 'file' } }
    expect(fromCoreMessage(toCoreMessage(original))).toBe(original)
    expect(fromCoreMessage(toCoreMessage(attachment))).toBe(attachment)
  })

  test('un mensaje creado por el core se construye anidado', () => {
    const created: CoreMessage = {
      type: 'assistant', uuid: 'c-1', role: 'assistant',
      content: [{ type: 'text', text: 'resumen' }], usage, stop_reason: 'end_turn',
      timestamp: Date.parse('2026-09-24T22:00:00.000Z'),
    }
    const agent = fromCoreMessage(created)
    expect(agent.type).toBe('assistant')
    expect(agent.uuid).toBe('c-1')
    expect(agent.timestamp).toBe('2026-09-24T22:00:00.000Z')
    expect(agent.message).toMatchObject({ role: 'assistant', content: [{ type: 'text', text: 'resumen' }], usage, stop_reason: 'end_turn' })
    expect('content' in agent).toBe(false)
  })

  test('una copia modificada por el core conserva lo que el core no conoce', () => {
    const copy = { ...toCoreMessage(agentAssistant()), content: [{ type: 'text', text: 'recortado' }] } as CoreMessage
    const agent = fromCoreMessage(copy)
    expect(agent.isMeta).toBe(false)
    expect(agent.message).toMatchObject({ id: 'msg_1', model: 'claude-sonnet-5', content: [{ type: 'text', text: 'recortado' }] })
  })
})

describe('un tipo que el core no modela', () => {
  test('una copia modificada recupera su tipo del bucle, no el system de transito', () => {
    const attachment: AgentMessage = { type: 'attachment', uuid: 't-1', attachment: { type: 'file' } }
    const copy = { ...toCoreMessage(attachment) } as CoreMessage
    const back = fromCoreMessage(copy)
    expect(back.type).toBe('attachment')
    expect(back.attachment).toEqual({ type: 'file' })
    expect('subtype' in back).toBe(false)
  })

  test('un system creado por el core con subtype sigue siendo system', () => {
    const created: CoreMessage = { type: 'system', uuid: 's-9', subtype: 'attachment', content: 'x' }
    expect(fromCoreMessage(created).type).toBe('system')
  })
})

describe('las versiones de arreglo conservan el orden', () => {
  test('ida y vuelta', () => {
    const list: AgentMessage[] = [
      { type: 'user', uuid: 'u-1', message: { role: 'user', content: 'hola' } },
      agentAssistant(),
    ]
    const back = fromCoreMessages(toCoreMessages(list))
    expect(back).toHaveLength(2)
    expect(back[0]).toBe(list[0])
    expect(back[1]).toBe(list[1])
  })
})
