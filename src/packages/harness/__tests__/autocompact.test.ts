/**
 * Compactación automática (T-023): umbral, resumen y frontera.
 *
 * Fuente del porte: la decisión del ejecutable (`fZe`/`nxe`) más el catálogo de
 * `@thyrox/agent`, del que sale la ventana. Los valores no se imaginan: el
 * umbral se deriva de la ventana del catálogo, no de una constante. El diseño
 * está en `analisis-portar-la-decision-de-compactacion.rst`.
 */

import { describe, expect, test } from 'bun:test'
import {
  AUTOCOMPACT_BUFFER_TOKENS,
  MAX_OUTPUT_TOKENS_FOR_SUMMARY,
  autoCompactThreshold,
  compactMessages,
  effectiveContextWindow,
  estimateMessagesTokens,
  shouldAutoCompact,
} from '../src/context/autocompact.ts'
import type { Message } from '../src/types.ts'

/**
 * Fijación del porte contra el ejecutable 2.1.258 — `_references/claude-code-bin/2.1.258/`.
 *
 * Estas aserciones NO describen lo que decidimos: fijan lo que la referencia
 * declara, para que una build nueva que mueva el valor las rompa. Un test que
 * sólo cita nuestra propia tarea no puede fallar por ese motivo, y entonces no
 * mide la fidelidad del porte (sub-patrón D de metrica-decide-la-conclusion).
 */
describe('fidelidad del porte contra 2.1.258', () => {
  test('MAX_OUTPUT_TOKENS_FOR_SUMMARY fija qZt=20000', () => {
    expect(MAX_OUTPUT_TOKENS_FOR_SUMMARY).toBe(20_000)
  })

  test('AUTOCOMPACT_BUFFER_TOKENS fija BZt=13000 (chunk-czaspe53.js)', () => {
    expect(AUTOCOMPACT_BUFFER_TOKENS).toBe(13_000)
  })

  test('effectiveContextWindow reproduce MF: ventana menos min(salida, qZt)', () => {
    // MF(e,n){let r=Math.min(xMe(e),qZt), {window:d}=wv(e,o); return d-r}
    // El tope se APLICA sobre la salida del modelo; no la sustituye. Un modelo
    // cuya salida sea menor que el tope reserva su salida, no el tope.
    const conSalidaMayor = effectiveContextWindow('claude-opus-5')      // salida 64 000 > 20 000
    const conSalidaMenor = effectiveContextWindow('claude-haiku-4-5')   // salida 32 000 > 20 000
    expect(conSalidaMayor).toBe(1_000_000 - 20_000)
    expect(conSalidaMenor).toBe(200_000 - 20_000)
  })

  test('autoCompactThreshold reproduce MF(n,we)-BZt', () => {
    expect(autoCompactThreshold('claude-opus-5')).toBe(1_000_000 - 20_000 - 13_000)
  })
})

describe('umbral de compactacion (T-023)', () => {
  test('la ventana efectiva reserva el maximo de salida, con tope de 20 000', () => {
    // opus-5: ventana 1 000 000, salida por defecto 64 000 → reserva 20 000
    expect(effectiveContextWindow('claude-opus-5')).toBe(1_000_000 - MAX_OUTPUT_TOKENS_FOR_SUMMARY)
    // 3-5-haiku: salida 8 192 < 20 000 → reserva 8 192, y su registro no declara ventana
    expect(effectiveContextWindow('claude-haiku-4-5')).toBe(200_000 - MAX_OUTPUT_TOKENS_FOR_SUMMARY)
  })

  test('un modelo que el catalogo no conoce devuelve null — no un numero inventado', () => {
    expect(effectiveContextWindow('gpt-inexistente')).toBeNull()
    expect(autoCompactThreshold('gpt-inexistente')).toBeNull()
  })

  test('el umbral es la ventana efectiva menos el colchon', () => {
    expect(autoCompactThreshold('claude-opus-5')).toBe(
      1_000_000 - MAX_OUTPUT_TOKENS_FOR_SUMMARY - AUTOCOMPACT_BUFFER_TOKENS,
    )
    expect(AUTOCOMPACT_BUFFER_TOKENS).toBe(13_000)
  })

  test('shouldAutoCompact dispara AL alcanzar el umbral, no despues', () => {
    const u = autoCompactThreshold('claude-opus-5') as number
    expect(shouldAutoCompact(u - 1, 'claude-opus-5')).toBe(false)
    expect(shouldAutoCompact(u, 'claude-opus-5')).toBe(true)
  })

  test('sin umbral conocido NO se compacta: el silencio no es permiso', () => {
    expect(shouldAutoCompact(10_000_000, 'gpt-inexistente')).toBe(false)
  })
})

describe('compactMessages (T-023)', () => {
  const conversacion = (): Message[] => [
    { role: 'user', content: [{ type: 'text', text: 'primero' }] },
    { role: 'assistant', content: [{ type: 'text', text: 'respuesta uno' }] },
    { role: 'user', content: [{ type: 'text', text: 'segundo' }] },
    { role: 'assistant', content: [{ type: 'text', text: 'respuesta dos' }] },
    { role: 'user', content: [{ type: 'text', text: 'tercero' }] },
    { role: 'assistant', content: [{ type: 'text', text: 'respuesta tres' }] },
  ]

  test('el resultado abre con el resumen y conserva la cola', () => {
    const r = compactMessages(conversacion(), { summary: 'RESUMEN DE LO ANTERIOR', keepLast: 2 })
    expect(r.messages[0].role).toBe('user')
    expect((r.messages[0].content[0] as { text: string }).text).toContain('RESUMEN DE LO ANTERIOR')
    expect(r.messages.length).toBe(3)
    expect((r.messages[2].content[0] as { text: string }).text).toBe('respuesta tres')
  })

  test('la frontera se declara: cuantos mensajes quedaron detras', () => {
    const r = compactMessages(conversacion(), { summary: 'S', keepLast: 2 })
    expect(r.boundary).toBe(4)
    expect(r.compacted).toBe(4)
  })

  test('la frontera NUNCA parte un tool_use de su tool_result', () => {
    const ms: Message[] = [
      { role: 'user', content: [{ type: 'text', text: 've' }] },
      { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: {} }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'listo' }] },
    ]
    // keepLast 2 caeria justo entre el tool_use y su tool_result
    const r = compactMessages(ms, { summary: 'S', keepLast: 2 })
    const cola = r.messages.slice(1)
    const huerfano = cola.some((m) => m.content.some((b) => b.type === 'tool_result'))
      && !cola.some((m) => m.content.some((b) => b.type === 'tool_use'))
    expect(huerfano).toBe(false)
  })

  test('con menos mensajes que keepLast no compacta nada', () => {
    const ms = conversacion().slice(0, 2)
    const r = compactMessages(ms, { summary: 'S', keepLast: 5 })
    expect(r.compacted).toBe(0)
    expect(r.messages).toEqual(ms)
  })

  test('no muta la entrada', () => {
    const ms = conversacion()
    const copia = JSON.parse(JSON.stringify(ms))
    compactMessages(ms, { summary: 'S', keepLast: 2 })
    expect(ms).toEqual(copia)
  })
})

describe('estimateMessagesTokens (T-023)', () => {
  test('cuenta texto, entrada de herramienta y resultado', () => {
    const vacio = estimateMessagesTokens([])
    expect(vacio).toBe(0)
    const conTexto = estimateMessagesTokens([
      { role: 'user', content: [{ type: 'text', text: 'x'.repeat(400) }] },
    ])
    expect(conTexto).toBeGreaterThan(0)
    const conResultado = estimateMessagesTokens([
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: 'y'.repeat(400) }] },
    ])
    expect(conResultado).toBeGreaterThan(0)
  })
})
