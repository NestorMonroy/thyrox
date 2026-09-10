import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { maybeActivateBrief, maybeActivateProactive } from '../runtimeActivation.js'

let envSnapshot: { proactive?: string; brief?: string }

beforeEach(() => {
  envSnapshot = {
    proactive: process.env.CLAUDE_CODE_PROACTIVE,
    brief: process.env.CLAUDE_CODE_BRIEF,
  }
  delete process.env.CLAUDE_CODE_PROACTIVE
  delete process.env.CLAUDE_CODE_BRIEF
})

afterEach(() => {
  if (envSnapshot.proactive === undefined) delete process.env.CLAUDE_CODE_PROACTIVE
  else process.env.CLAUDE_CODE_PROACTIVE = envSnapshot.proactive
  if (envSnapshot.brief === undefined) delete process.env.CLAUDE_CODE_BRIEF
  else process.env.CLAUDE_CODE_BRIEF = envSnapshot.brief
})

describe('maybeActivateProactive — sin el flag de build de la fuente, nunca activa', () => {
  test('con options.proactive=true, no llama a ningún colaborador', () => {
    let llamado = false
    maybeActivateProactive(
      { proactive: true },
      { isProactiveActive: () => false, activateProactive: () => (llamado = true) },
    )
    expect(llamado).toBe(false)
  })

  test('con CLAUDE_CODE_PROACTIVE=1, no llama a ningún colaborador', () => {
    process.env.CLAUDE_CODE_PROACTIVE = '1'
    let llamado = false
    maybeActivateProactive({}, { activateProactive: () => (llamado = true) })
    expect(llamado).toBe(false)
  })

  test('con options nulos, no lanza', () => {
    expect(() => maybeActivateProactive(null)).not.toThrow()
  })
})

describe('maybeActivateBrief — sin el flag de build de la fuente, nunca activa', () => {
  test('con options.brief=true, no llama a logEvent ni a setUserMsgOptIn', () => {
    let eventoEmitido = false
    let optInLlamado = false
    maybeActivateBrief(
      { brief: true },
      {
        isBriefEntitled: () => true,
        setUserMsgOptIn: () => (optInLlamado = true),
        logEvent: () => (eventoEmitido = true),
      },
    )
    expect(eventoEmitido).toBe(false)
    expect(optInLlamado).toBe(false)
  })

  test('con CLAUDE_CODE_BRIEF=1, no llama a logEvent', () => {
    process.env.CLAUDE_CODE_BRIEF = '1'
    let eventoEmitido = false
    maybeActivateBrief({}, { logEvent: () => (eventoEmitido = true) })
    expect(eventoEmitido).toBe(false)
  })

  test('sin flags ni options, no lanza', () => {
    expect(() => maybeActivateBrief({})).not.toThrow()
  })
})
