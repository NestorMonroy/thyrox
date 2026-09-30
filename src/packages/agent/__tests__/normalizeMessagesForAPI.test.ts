import { beforeAll, describe, expect, test } from 'bun:test'
import { installConfigHostBindings } from '@thyrox/config'
import { InMemoryConfig } from '@thyrox/config/testing'
import type { BetaContentBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { ContentBlockParam, ToolReferenceBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { randomUUID } from 'node:crypto'
import { TaskStopTool } from '@thyrox/tool-registry/tools/TaskStopTool/TaskStopTool.js'
import { NO_CONTENT_MESSAGE } from '../constants/messages.ts'
import { createAttachmentMessage } from '../attachments.ts'
import {
  createAssistantMessage,
  createProgressMessage,
  createUserMessage,
  mergeUserMessages,
  normalizeAttachmentForAPI,
  normalizeMessagesForAPI,
  reorderAttachmentsForAPI,
  SYNTHETIC_MODEL,
  wrapInSystemReminder,
} from '../messages.ts'
import type {
  AssistantMessage,
  Message,
  SystemLocalCommandMessage,
  UserMessage,
} from '../messageShapes.ts'

// Las lecturas de configuracion (modo de ToolSearch, banderas) exigen los
// bindings del host instalados; el binding en memoria hace la suite hermetica.
beforeAll(() => {
  installConfigHostBindings(new InMemoryConfig().bindings)
})

function assistant(blocks: BetaContentBlock[], id = 'msg_1'): AssistantMessage {
  const m = createAssistantMessage({ content: blocks })
  return { ...m, message: { ...m.message, id } }
}

function text(t: string): BetaContentBlock {
  return { type: 'text', text: t, citations: [] }
}

function blocks(m: Message): ContentBlockParam[] {
  const content = m.message?.content
  if (!Array.isArray(content)) throw new Error('el contenido no es un arreglo')
  return content as ContentBlockParam[]
}

function textsOf(m: Message): string[] {
  return blocks(m).map(b => (b.type === 'text' ? b.text : ''))
}

/** El mensaje en la posicion `i`, o un fallo con nombre: nunca un `!`. */
function at(out: readonly Message[], i: number): Message {
  const m = out[i]
  if (!m) throw new Error(`no hay mensaje en la posicion ${i}`)
  return m
}

describe('normalizeMessagesForAPI — el filtro de entrada', () => {
  test('descarta los mensajes virtuales y de progreso, y conserva el resto', () => {
    const real = createUserMessage({ content: 'hola' })
    const virtual = createUserMessage({ content: 'solo pantalla', isVirtual: true })
    const progress = createProgressMessage({ toolUseID: 'tu-p', parentToolUseID: 'tu-p', data: {} })
    const virtualAssistant = createAssistantMessage({ content: 'solo pantalla', isVirtual: true })
    const out = normalizeMessagesForAPI([real, progress, virtual, virtualAssistant])
    expect(out).toHaveLength(1)
    expect(out[0]?.uuid).toBe(real.uuid)
    expect(out[0]?.message.content).toBe('hola')
  })

  test('un mensaje de sistema local_command entra como usuario y se funde con el usuario previo', () => {
    const user = createUserMessage({ content: 'primero' })
    const local: SystemLocalCommandMessage = {
      type: 'system',
      subtype: 'local_command',
      uuid: randomUUID(),
      timestamp: '2026-09-25T00:00:00.000Z',
      content: 'salida del comando',
    }
    const out = normalizeMessagesForAPI([user, local])
    expect(out).toHaveLength(1)
    expect(out[0]?.type).toBe('user')
    expect(textsOf(at(out, 0))).toEqual(['primero\n', 'salida del comando'])
  })

  test('descarta el error sintetico de API y retira los `document` del meta que lo precede', () => {
    const meta = createUserMessage({
      content: [
        { type: 'text', text: 'lee este pdf' },
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: 'AAAA' },
        },
      ],
      isMeta: true,
    })
    const errorMessage: AssistantMessage = {
      ...assistant([
        text(
          'PDF too large (max 100 pages, 20MB). Double press esc to go back and try again, or use pdftotext to convert to text first.',
        ),
      ]),
      isApiErrorMessage: true,
    }
    errorMessage.message.model = SYNTHETIC_MODEL
    const out = normalizeMessagesForAPI([meta, errorMessage])
    expect(out).toHaveLength(1)
    expect(blocks(at(out, 0)).map(b => b.type)).toEqual(['text'])
  })
})

describe('normalizeMessagesForAPI — la fusion de usuarios', () => {
  test('dos usuarios seguidos quedan en uno, con `\\n` en la costura texto-texto', () => {
    const out = normalizeMessagesForAPI([
      createUserMessage({ content: '2 + 2' }),
      createUserMessage({ content: '3 + 3' }),
    ])
    expect(out).toHaveLength(1)
    expect(blocks(at(out, 0))).toEqual([
      { type: 'text', text: '2 + 2\n' },
      { type: 'text', text: '3 + 3' },
    ])
  })

  test('los tool_result se izan al frente del mensaje fundido', () => {
    const toolUse = assistant([
      { type: 'tool_use', id: 'tu-1', name: 'Bash', input: { command: 'pwd' } } as BetaContentBlock,
    ])
    const note = createUserMessage({ content: 'nota', isMeta: true })
    const result = createUserMessage({
      content: [{ type: 'tool_result', tool_use_id: 'tu-1', content: 'ok' }],
    })
    const out = normalizeMessagesForAPI([toolUse, note, result])
    expect(out).toHaveLength(2)
    expect(blocks(at(out, 1)).map(b => b.type)).toEqual(['tool_result', 'text'])
  })

  test('mergeUserMessages conserva el uuid del operando que no es meta', () => {
    const meta = createUserMessage({ content: 'contexto', isMeta: true })
    const real = createUserMessage({ content: 'pregunta' })
    expect(mergeUserMessages(meta, real).uuid).toBe(real.uuid)
    expect(mergeUserMessages(real, meta).uuid).toBe(real.uuid)
  })
})

describe('normalizeMessagesForAPI — los mensajes de asistente', () => {
  test('dos fragmentos con el mismo message.id se funden en uno', () => {
    const out = normalizeMessagesForAPI([assistant([text('uno')], 'msg_x'), assistant([text('dos')], 'msg_x')])
    expect(out).toHaveLength(1)
    expect(textsOf(at(out, 0))).toEqual(['uno', 'dos'])
  })

  test('fragmentos con message.id distinto no se funden', () => {
    const out = normalizeMessagesForAPI([assistant([text('uno')], 'a'), assistant([text('dos')], 'b')])
    expect(out).toHaveLength(2)
  })

  test('retira el thinking final del ultimo asistente', () => {
    const last = assistant([
      text('respuesta'),
      { type: 'thinking', thinking: 'pensando', signature: 'sig' },
    ])
    const out = normalizeMessagesForAPI([createUserMessage({ content: 'q' }), last])
    expect(blocks(at(out, 1)).map(b => b.type)).toEqual(['text'])
  })

  test('un asistente intermedio sin contenido recibe el centinela', () => {
    const out = normalizeMessagesForAPI([
      createUserMessage({ content: 'q' }),
      assistant([], 'e'),
      createUserMessage({ content: 'r' }),
    ])
    expect(blocks(at(out, 1))).toEqual([{ type: 'text', text: NO_CONTENT_MESSAGE, citations: [] }])
  })

  test('preserva metadata ajena del tool_use y resuelve el nombre canonico por alias', () => {
    // `KillShell` es el alias heredado de `TaskStop` en el registro real.
    const a = assistant([
      {
        type: 'tool_use',
        id: 'tu-2',
        name: 'KillShell',
        input: { task_id: 't-1' },
        _geminiThoughtSignature: 'sig-9',
      } as BetaContentBlock,
    ])
    const out = normalizeMessagesForAPI([a], [TaskStopTool])
    const block = blocks(at(out, 0))[0] as { name?: string; _geminiThoughtSignature?: string }
    expect(block.name).toBe(TaskStopTool.name)
    expect(block._geminiThoughtSignature).toBe('sig-9')
  })
})

describe('normalizeMessagesForAPI — tool_result y tool_reference', () => {
  test('un tool_result de error con imagen queda solo con su texto', () => {
    const out = normalizeMessagesForAPI([
      createUserMessage({
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tu-3',
            is_error: true,
            content: [
              { type: 'text', text: 'fallo' },
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AA' } },
            ],
          },
        ],
      }),
    ])
    const tr = blocks(at(out, 0))[0]
    if (tr?.type !== 'tool_result') throw new Error('tipo inesperado')
    expect(tr.content).toEqual([{ type: 'text', text: 'fallo' }])
  })

  test('los tool_reference de un tool_result se retiran cuando no hay herramienta que los respalde', () => {
    const reference: ToolReferenceBlockParam = { type: 'tool_reference', tool_name: 'mcp__gone__x' }
    const out = normalizeMessagesForAPI([
      createUserMessage({
        content: [{ type: 'tool_result', tool_use_id: 'tu-4', content: [reference] }],
      }),
    ])
    const tr = blocks(at(out, 0))[0]
    if (tr?.type !== 'tool_result') throw new Error('tipo inesperado')
    const inner = tr.content
    if (!Array.isArray(inner)) throw new Error('contenido inesperado')
    expect(inner.map(b => b.type)).toEqual(['text'])
    expect((inner[0] as { text: string }).text.startsWith('[Tool references removed')).toBe(true)
  })
})

describe('reorderAttachmentsForAPI y el caso attachment', () => {
  test('un adjunto sube hasta el asistente o el tool_result que lo frena', () => {
    const a = assistant([text('a')])
    const u = createUserMessage({ content: 'u' })
    const att = createAttachmentMessage({ type: 'date_change', newDate: '2026-09-25' })
    const out = reorderAttachmentsForAPI([a, u, att])
    expect(out.map(m => m.type)).toEqual(['assistant', 'attachment', 'user'])
  })

  test('el adjunto se rinde como usuario meta y se funde con el usuario contiguo', () => {
    const u = createUserMessage({ content: 'u' })
    const att = createAttachmentMessage({ type: 'date_change', newDate: '2026-09-25' })
    const out = normalizeMessagesForAPI([u, att])
    expect(out).toHaveLength(1)
    const texts = textsOf(at(out, 0))
    expect(texts[0]?.startsWith('<system-reminder>')).toBe(true)
    expect(texts[0]).toContain('2026-09-25')
    expect(texts[1]).toBe('u')
  })

  test('normalizeAttachmentForAPI: un hook_success fuera de SessionStart/UserPromptSubmit no rinde', () => {
    expect(
      normalizeAttachmentForAPI({ type: 'hook_success', hookEvent: 'PostToolUse', hookName: 'h', content: 'x' }),
    ).toEqual([])
    const [m] = normalizeAttachmentForAPI({
      type: 'hook_success',
      hookEvent: 'SessionStart',
      hookName: 'h',
      content: 'x',
    })
    expect((m as UserMessage).message.content).toBe(wrapInSystemReminder('h hook success: x'))
  })

  test('normalizeAttachmentForAPI: un tipo desconocido rinde vacio en vez de fallar', () => {
    expect(normalizeAttachmentForAPI({ type: 'no_existe' })).toEqual([])
  })
})
