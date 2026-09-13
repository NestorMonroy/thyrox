import { describe, expect, test } from 'bun:test'
import {
  getPartialCompactPrompt,
  getCompactPrompt,
  formatCompactSummary,
  getCompactUserSummaryMessage,
  type CompactUserSummaryDeps,
} from '../compaction/prompt.ts'

const NO_LANGUAGE: CompactUserSummaryDeps = { getLanguage: () => undefined }

describe('getCompactPrompt', () => {
  test('siempre empieza con el preámbulo de "nada de herramientas"', () => {
    expect(getCompactPrompt().startsWith('CRITICAL: Respond with TEXT ONLY.')).toBe(true)
  })
  test('siempre termina con el recordatorio de "nada de herramientas"', () => {
    expect(getCompactPrompt().trim().endsWith('you will fail the task.')).toBe(true)
  })
  test('sin instrucciones custom, no agrega la sección "Additional Instructions"', () => {
    expect(getCompactPrompt()).not.toContain('Additional Instructions')
  })
  test('con instrucciones custom no vacías, las agrega antes del recordatorio final', () => {
    const prompt = getCompactPrompt('enfócate en TypeScript')
    expect(prompt).toContain('Additional Instructions:\nenfócate en TypeScript')
  })
  test('instrucciones sólo con espacios en blanco cuentan como ausentes', () => {
    expect(getCompactPrompt('   ')).not.toContain('Additional Instructions')
  })
})

describe('getPartialCompactPrompt', () => {
  test('direction "from" (default) menciona "RECENT portion"', () => {
    expect(getPartialCompactPrompt()).toContain('RECENT portion of the conversation')
  })
  test('direction "up_to" menciona "Context for Continuing Work"', () => {
    expect(getPartialCompactPrompt(undefined, 'up_to')).toContain('Context for Continuing Work')
  })
  test('las dos direcciones comparten el mismo preámbulo y el mismo trailer', () => {
    const from = getPartialCompactPrompt()
    const upTo = getPartialCompactPrompt(undefined, 'up_to')
    expect(from.startsWith('CRITICAL: Respond with TEXT ONLY.')).toBe(true)
    expect(upTo.startsWith('CRITICAL: Respond with TEXT ONLY.')).toBe(true)
    expect(from.trim().endsWith('you will fail the task.')).toBe(true)
    expect(upTo.trim().endsWith('you will fail the task.')).toBe(true)
  })
})

describe('formatCompactSummary', () => {
  test('quita el bloque <analysis> por completo', () => {
    const raw = '<analysis>borrador interno</analysis>\n<summary>resultado final</summary>'
    expect(formatCompactSummary(raw)).not.toContain('borrador interno')
  })
  test('reemplaza <summary>...</summary> por "Summary:\\n<contenido>"', () => {
    const raw = '<summary>resultado final</summary>'
    expect(formatCompactSummary(raw)).toBe('Summary:\nresultado final')
  })
  test('sin bloque <summary>, deja el texto tal cual (recortado de espacios)', () => {
    expect(formatCompactSummary('  texto plano  ')).toBe('texto plano')
  })
  test('colapsa 3+ saltos de línea a exactamente 2', () => {
    expect(formatCompactSummary('a\n\n\n\nb')).toBe('a\n\nb')
  })
})

describe('getCompactUserSummaryMessage', () => {
  test('el mensaje base cita la razón de la continuación y el resumen formateado', () => {
    const msg = getCompactUserSummaryMessage('<summary>hecho X</summary>', false, undefined, false, false, NO_LANGUAGE)
    expect(msg).toContain('This session is being continued from a previous conversation')
    expect(msg).toContain('Summary:\nhecho X')
  })

  test('con transcriptPath, agrega la ruta del transcript completo', () => {
    const msg = getCompactUserSummaryMessage('<summary>x</summary>', false, '/ruta/t.jsonl', false, false, NO_LANGUAGE)
    expect(msg).toContain('/ruta/t.jsonl')
  })

  test('con recentMessagesPreserved, avisa que los mensajes recientes son verbatim', () => {
    const msg = getCompactUserSummaryMessage('<summary>x</summary>', false, undefined, true, false, NO_LANGUAGE)
    expect(msg).toContain('Recent messages are preserved verbatim.')
  })

  test('con suppressFollowUpQuestions, agrega la instrucción de continuar sin preguntar', () => {
    const msg = getCompactUserSummaryMessage('<summary>x</summary>', true, undefined, false, false, NO_LANGUAGE)
    expect(msg).toContain('without asking the user any further questions')
  })

  test('sin suppressFollowUpQuestions, NO agrega esa instrucción', () => {
    const msg = getCompactUserSummaryMessage('<summary>x</summary>', false, undefined, false, false, NO_LANGUAGE)
    expect(msg).not.toContain('without asking the user any further questions')
  })

  test('isProactiveActive sólo aplica cuando suppressFollowUpQuestions es true', () => {
    const withBoth = getCompactUserSummaryMessage('<summary>x</summary>', true, undefined, false, true, NO_LANGUAGE)
    expect(withBoth).toContain('autonomous/proactive mode')
    const onlyProactive = getCompactUserSummaryMessage('<summary>x</summary>', false, undefined, false, true, NO_LANGUAGE)
    expect(onlyProactive).not.toContain('autonomous/proactive mode')
  })

  test('sin idioma configurado, no agrega el recordatorio de idioma', () => {
    const msg = getCompactUserSummaryMessage('<summary>x</summary>', false, undefined, false, false, NO_LANGUAGE)
    expect(msg).not.toContain('structured in English for technical fidelity')
  })

  test('con idioma configurado, agrega el recordatorio nombrando ese idioma', () => {
    const deps: CompactUserSummaryDeps = { getLanguage: () => 'español' }
    const msg = getCompactUserSummaryMessage('<summary>x</summary>', false, undefined, false, false, deps)
    expect(msg).toContain('Continue responding to the user in español')
  })

  test('control de anulación: si getLanguage devolviera siempre string vacío en vez de undefined, el recordatorio no debería agregarse (falsy)', () => {
    const deps: CompactUserSummaryDeps = { getLanguage: () => '' }
    const msg = getCompactUserSummaryMessage('<summary>x</summary>', false, undefined, false, false, deps)
    expect(msg).not.toContain('structured in English for technical fidelity')
  })
})
