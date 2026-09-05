/**
 * El `attachment` y sus cuatro etapas (T-085, #36).
 *
 * Porte del mecanismo que el ejecutable 2.1.258 declara en cuatro piezas
 * separadas —construir, validar, renderizar, contar— y que este harness tenía
 * fundido en el texto de otro mensaje. Análisis y citas:
 * `analisis-flujo-del-attachment-en-el-binario.rst`.
 */
import { describe, expect, test } from 'bun:test'
import {
  attachmentBreakdown, isValidAttachment, makeAttachment, renderAttachment,
} from '../src/context/attachments.ts'
import type { Message } from '../src/types.ts'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runLoop } from '../src/loop.ts'
import { RecordedProvider } from '../src/provider/recorded.ts'
import { CORE_TOOLS } from '../src/tools/registry.ts'

describe('1. construir — el envoltorio de `hBn`', () => {
  test('envuelve el payload con su uuid y su timestamp ISO', () => {
    const a = makeAttachment({ type: 'hook_additional_context', content: ['del hook'] })
    expect(a.type).toBe('attachment')
    expect(a.attachment).toEqual({ type: 'hook_additional_context', content: ['del hook'] })
    expect(new Date(a.timestamp).toISOString()).toBe(a.timestamp)
    expect(a.uuid).toMatch(/^[0-9a-f-]{36}$/)
  })

  test('dos attachments NO comparten uuid', () => {
    const a = makeAttachment({ type: 'hook_success', content: 'ok' })
    const b = makeAttachment({ type: 'hook_success', content: 'ok' })
    expect(a.uuid).not.toBe(b.uuid)
  })
})

describe('2. validar — un predicado POR MIEMBRO, no uno global', () => {
  test('hook_success exige content string', () => {
    expect(isValidAttachment({ type: 'hook_success', content: 'ok' })).toBe(true)
    expect(isValidAttachment({ type: 'hook_success', content: ['ok'] })).toBe(false)
  })

  test('hook_additional_context exige un arreglo de strings', () => {
    expect(isValidAttachment({ type: 'hook_additional_context', content: ['a', 'b'] })).toBe(true)
    expect(isValidAttachment({ type: 'hook_additional_context', content: 'a' })).toBe(false)
    expect(isValidAttachment({ type: 'hook_additional_context', content: ['a', 3] })).toBe(false)
  })

  test('skill_listing acota la lista — `iho=4096` verbatim', () => {
    expect(isValidAttachment({ type: 'skill_listing', names: ['uno'] })).toBe(true)
    expect(isValidAttachment({ type: 'skill_listing', names: Array(4097).fill('x') })).toBe(false)
  })

  test('un miembro SIN predicado propio pasa — `default:return!0`', () => {
    // La referencia acepta por defecto: la validacion es una red por miembro,
    // no una lista blanca. Cerrarla congelaria los 59 miembros del universo.
    expect(isValidAttachment({ type: 'poll_events', lo_que_sea: 1 })).toBe(true)
  })
})

describe('3. renderizar — bloques con isMeta, o NADA', () => {
  test('hook_additional_context rinde un mensaje user con isMeta', () => {
    const m = renderAttachment({ type: 'hook_additional_context', content: ['uno', 'dos'] })
    expect(m).toHaveLength(1)
    expect(m[0]!.role).toBe('user')
    expect(m[0]!.isMeta).toBe(true)
    expect(m[0]!.content).toEqual([{ type: 'text', text: 'uno\ndos' }])
  })

  test('hook_success SÓLO rinde en los tres eventos que la referencia nombra', () => {
    const de = (hookEvent: string) => renderAttachment({ type: 'hook_success', hookEvent, hookName: 'h', content: 'x' })
    expect(de('SessionStart')).toHaveLength(1)
    expect(de('UserPromptSubmit')).toHaveLength(1)
    expect(de('UserPromptExpansion')).toHaveLength(1)
    // `if(e.hookEvent!=="SessionStart"&&…)return[]` — verbatim
    expect(de('PostToolUse')).toEqual([])
    expect(de('PreCompact')).toEqual([])
  })

  test('hook_success con content vacío NO rinde — `if(e.content==="")return[]`', () => {
    expect(renderAttachment({ type: 'hook_success', hookEvent: 'SessionStart', hookName: 'h', content: '' })).toEqual([])
  })

  test('CONTROL — un miembro sin renderizador NO rinde, y eso es correcto', () => {
    // El control que discrimina: si un miembro desconocido rindiera algo, el
    // caso de `hook_success` que devuelve [] no probaria nada — cualquier
    // implementacion pasaria los dos.
    expect(renderAttachment({ type: 'queued_command', renderedByBatchHead: true })).toEqual([])
    expect(renderAttachment({ type: 'miembro_que_no_existe' })).toEqual([])
  })

  test('el render NO altera el payload: dos llamadas dan lo mismo', () => {
    const a = { type: 'hook_additional_context', content: ['uno'] }
    expect(renderAttachment(a)).toEqual(renderAttachment(a))
  })
})

describe('4. contar — línea presupuestaria propia, con desglose por miembro', () => {
  const msg = (texto: string): Message => ({ role: 'user', content: [{ type: 'text', text: texto }] })

  test('attachmentTokens NO se mezcla con userMessageTokens', () => {
    // Es el defecto que el porte cierra: concatenado al prompt, el contexto
    // del hook se facturaba a la cuenta del usuario.
    const b = attachmentBreakdown([
      msg('x'.repeat(400)),
      makeAttachment({ type: 'hook_additional_context', content: ['y'.repeat(800)] }),
    ])
    expect(b.userMessageTokens).toBeGreaterThan(0)
    expect(b.attachmentTokens).toBeGreaterThan(0)
    expect(b.attachmentsByType['hook_additional_context']).toBe(b.attachmentTokens)
  })

  test('el desglose reparte por miembro, no en un solo cubo', () => {
    const b = attachmentBreakdown([
      makeAttachment({ type: 'hook_additional_context', content: ['a'.repeat(400)] }),
      makeAttachment({ type: 'hook_success', hookEvent: 'SessionStart', hookName: 'h', content: 'b'.repeat(400) }),
    ])
    expect(Object.keys(b.attachmentsByType).sort()).toEqual(['hook_additional_context', 'hook_success'])
    const suma = Object.values(b.attachmentsByType).reduce((a, n) => a + n, 0)
    expect(suma).toBe(b.attachmentTokens)
  })

  test('CONTROL — sin attachments, attachmentTokens es 0 y el desglose vacío', () => {
    const b = attachmentBreakdown([msg('sólo el usuario')])
    expect(b.attachmentTokens).toBe(0)
    expect(b.attachmentsByType).toEqual({})
    expect(b.userMessageTokens).toBeGreaterThan(0)
  })
})

/**
 * El cableado: el productor REAL del harness deja de fundirse en el prompt.
 *
 * `loop.ts:173` concatenaba el `additionalContext` de `UserPromptSubmit` al
 * texto del usuario. Con eso el transcript atribuía al usuario texto que no
 * escribió, y el costo del hook se facturaba a `userMessageTokens`.
 */
describe('el hook UserPromptSubmit produce un attachment, no texto del usuario', () => {
  const dir = () => mkdtempSync(join(tmpdir(), 'adjunto-'))
  const uso = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

  test('el prompt queda LIMPIO y el contexto va en su propia línea', async () => {
    const d = dir()
    const gancho = join(d, 'h.sh')
    writeFileSync(gancho, `#!/bin/sh\nprintf '%s' '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"contexto del gancho"}}'\n`)
    chmodSync(gancho, 0o755)
    const p = new RecordedProvider([{
      id: 'm1', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso,
      content: [{ type: 'text', text: 'listo' }],
    }])
    const r = await runLoop({
      cwd: d, model: 'claude-opus-5', system: 's', tools: CORE_TOOLS, transcriptDir: d,
      prompt: 'la pregunta del usuario', provider: p,
      hooks: { UserPromptSubmit: [{ hooks: [{ type: 'command', command: gancho }] }] }, maxTurns: 2,
    })
    expect(r.stop).toBe('end_turn')

    const lineas = readFileSync(r.transcriptPath, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    const user = lineas.find((l) => l.type === 'user')!
    // El prompt del usuario es SÓLO el prompt: sin esto, `readTranscript` al
    // reanudar devuelve como escrito por el usuario lo que inyectó un hook.
    expect(user.message.content[0].text).toBe('la pregunta del usuario')
    expect(user.message.content[0].text).not.toContain('contexto del gancho')

    const adj = lineas.find((l) => l.type === 'attachment')!
    expect(adj.attachment.type).toBe('hook_additional_context')
    expect(adj.attachment.content).toEqual(['contexto del gancho'])

    // Y llega al modelo: separar no es descartar.
    const textos = p.requests[0]!.messages.flatMap((m) =>
      m.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text))
    expect(textos).toContain('la pregunta del usuario')
    expect(textos).toContain('contexto del gancho')
  })

  test('CONTROL — sin hook no hay línea attachment, y el prompt es el mismo', async () => {
    const d = dir()
    const p = new RecordedProvider([{
      id: 'm1', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso,
      content: [{ type: 'text', text: 'listo' }],
    }])
    const r = await runLoop({
      cwd: d, model: 'claude-opus-5', system: 's', tools: CORE_TOOLS, transcriptDir: d,
      prompt: 'la pregunta del usuario', provider: p, maxTurns: 2,
    })
    const lineas = readFileSync(r.transcriptPath, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    expect(lineas.filter((l) => l.type === 'attachment')).toHaveLength(0)
    expect(lineas.find((l) => l.type === 'user')!.message.content[0].text).toBe('la pregunta del usuario')
  })
})
