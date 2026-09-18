/**
 * Copia de `ccnmt: packages/permission/src/__tests__/classifierTranscriptMeta.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Contrato: `buildTranscriptEntries` tiene que EXCLUIR los mensajes de usuario
 * meta del transcript que se le pasa al clasificador de modo automático.
 *
 * POR QUÉ EXISTE — un mensaje de usuario meta (`isMeta:true`) es contexto que
 * el sistema inyecta, no intención real del usuario: system-reminders, el
 * contexto adicional del hook `UserPromptSubmit`, los avisos de captura de
 * pantalla o de archivo adjunto, etc. (se marcan `isMeta:true` al crearse; ver
 * quién llama a `createUserMessage` en `messages.ts`). Cuando se colaban en el
 * transcript del clasificador, el modelo se agarraba a contenido meta rancio
 * —una ruta de captura bajo /var/folders, una discusión anterior sobre un
 * registro de CI— y fabricaba una razón de denegación sin relación con la
 * acción que de verdad estaba clasificando (por ejemplo, denegar `git status`
 * con «reading CI failure log that may contain sensitive information»). ant
 * los filtra en `gZ7` (2.1.150 3149.js:202: `if (K.isMeta) continue`); el
 * porte de ccb había dejado caer esa línea.
 *
 * Los turnos de usuario reales, los que no son meta, tienen que seguir
 * pasando — el clasificador necesita intención genuina del usuario para
 * autorizar acciones. Estas aserciones dejan las dos mitades bajo llave.
 */
import { describe, expect, test } from 'bun:test'

import { buildTranscriptEntries } from '../yoloClassifier.js'
import type { Message } from '@claude-code-how-works/agent/messageShapes'

function userMsg(text: string, isMeta = false): Message {
  return {
    type: 'user',
    uuid: crypto.randomUUID(),
    ...(isMeta ? { isMeta: true } : {}),
    message: { role: 'user', content: text },
  } as unknown as Message
}

describe('buildTranscriptEntries — meta filtering (ant gZ7 parity)', () => {
  test('drops meta user messages, keeps real ones', () => {
    const messages = [
      userMsg('real user intent: refactor the parser', false),
      userMsg('<system-reminder>CAVEMAN MODE ACTIVE</system-reminder>', true),
      userMsg('screenshot at /var/folders/xx/T/screencaptureui/foo.png', true),
      userMsg('also please add tests', false),
    ]
    const entries = buildTranscriptEntries(messages)
    const texts = entries.flatMap(e =>
      e.content.flatMap(b => (b.type === 'text' ? [b.text] : [])),
    )
    expect(texts).toEqual([
      'real user intent: refactor the parser',
      'also please add tests',
    ])
  })

  test('a transcript of only meta user messages yields no user entries', () => {
    const messages = [
      userMsg('<system-reminder>hook additional context</system-reminder>', true),
      userMsg('UserPromptSubmit hook: CAVEMAN MODE', true),
    ]
    const entries = buildTranscriptEntries(messages)
    expect(entries.filter(e => e.role === 'user')).toHaveLength(0)
  })

  test('non-meta user message with no isMeta field is kept', () => {
    const entries = buildTranscriptEntries([userMsg('plain message')])
    expect(entries).toHaveLength(1)
    expect(entries[0]!.role).toBe('user')
  })
})

describe('buildTranscriptEntries — AskUserQuestion answers (ant gZ7 parity)', () => {
  function askMsg(id: string): Message {
    return {
      type: 'assistant',
      uuid: crypto.randomUUID(),
      message: {
        role: 'assistant',
        content: [
          { type: 'tool_use', id, name: 'AskUserQuestion', input: {} },
        ],
      },
    } as unknown as Message
  }

  function answerMsg(
    toolUseId: string,
    answer: string,
    isError = false,
  ): Message {
    return {
      type: 'user',
      uuid: crypto.randomUUID(),
      message: {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUseId,
            is_error: isError,
            content: answer,
          },
        ],
      },
    } as unknown as Message
  }

  test('folds the user answer to a prior AskUserQuestion into the transcript', () => {
    const entries = buildTranscriptEntries([
      askMsg('toolu_ask1'),
      answerMsg('toolu_ask1', 'Yes, deploy to prod'),
    ])
    const userTexts = entries
      .filter(e => e.role === 'user')
      .flatMap(e =>
        e.content.flatMap(b => (b.type === 'text' ? [b.text] : [])),
      )
    expect(userTexts).toEqual([
      '[User answered AskUserQuestion]: Yes, deploy to prod',
    ])
  })

  test('ignores a tool_result with no matching AskUserQuestion call', () => {
    // Un `tool_result` pelado (el resultado de un Bash, por ejemplo) NO es
    // una respuesta del usuario — no debe colarse en el transcript como
    // intención de usuario falsa.
    const entries = buildTranscriptEntries([
      answerMsg('toolu_unknown', 'some bash output'),
    ])
    expect(entries.filter(e => e.role === 'user')).toHaveLength(0)
  })

  test('ignores an errored AskUserQuestion tool_result', () => {
    const entries = buildTranscriptEntries([
      askMsg('toolu_ask2'),
      answerMsg('toolu_ask2', 'error text', true),
    ])
    expect(entries.filter(e => e.role === 'user')).toHaveLength(0)
  })
})
