import { describe, expect, test } from 'bun:test'
import { GENERAL_PURPOSE_AGENT } from '../built-in/generalPurposeAgent.js'
import type { ToolUseContext } from '../../../Tool.js'

// getSystemPrompt de un agente built-in ignora en runtime el contenido de
// toolUseContext.options (ver generalPurposeAgent.ts), pero su tipo lo exige
// como parámetro — se construye el mínimo que satisface
// ToolUseContext['options'].
const FAKE_TOOL_USE_CONTEXT: Pick<ToolUseContext, 'options'> = {
  options: {
    commands: [],
    debug: false,
    mainLoopModel: 'test-model',
    tools: [],
    verbose: false,
    thinkingConfig: { type: 'disabled' },
    mcpClients: [],
    mcpResources: {},
    isNonInteractiveSession: true,
    agentDefinitions: { activeAgents: [], allAgents: [] },
  },
}

describe('GENERAL_PURPOSE_AGENT — config snapshot', () => {
  // The general-purpose subagent is the default fallback agent. Anchor
  // its definition fields so refactors don't silently rename agentType
  // (would break callers like AgentTool.call() that match by name).

  test('agentType = "general-purpose"', () => {
    expect(GENERAL_PURPOSE_AGENT.agentType).toBe('general-purpose')
  })

  test('tools = ["*"] (full tool access)', () => {
    expect(GENERAL_PURPOSE_AGENT.tools).toEqual(['*'])
  })

  test('source = "built-in"', () => {
    expect(GENERAL_PURPOSE_AGENT.source).toBe('built-in')
  })

  test('baseDir = "built-in"', () => {
    expect(GENERAL_PURPOSE_AGENT.baseDir).toBe('built-in')
  })

  test('whenToUse mentions multi-step search/research', () => {
    // The whenToUse string drives the model's selection logic. Anchor
    // load-bearing terms so a refactor that softens the language
    // doesn't degrade routing accuracy.
    expect(GENERAL_PURPOSE_AGENT.whenToUse).toContain('General-purpose')
    expect(GENERAL_PURPOSE_AGENT.whenToUse).toContain('multi-step')
    expect(GENERAL_PURPOSE_AGENT.whenToUse).toContain('searching')
  })

  test('model is INTENTIONALLY undefined (uses default)', () => {
    // Documents the design choice — agent uses
    // getDefaultSubagentModel() at runtime. A refactor that hardcodes
    // a model would break the dynamic model selection behavior.
    expect(
      (GENERAL_PURPOSE_AGENT as { model?: string }).model,
    ).toBeUndefined()
  })

  test('getSystemPrompt is a function (not a static string)', () => {
    expect(typeof GENERAL_PURPOSE_AGENT.getSystemPrompt).toBe('function')
  })
})

describe('GENERAL_PURPOSE_AGENT.getSystemPrompt — content', () => {
  test('returns a non-empty string', () => {
    const prompt = GENERAL_PURPOSE_AGENT.getSystemPrompt!({
      toolUseContext: FAKE_TOOL_USE_CONTEXT,
    })
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(100)
  })

  test('contains anchor phrases for the role', () => {
    const prompt = GENERAL_PURPOSE_AGENT.getSystemPrompt!({
      toolUseContext: FAKE_TOOL_USE_CONTEXT,
    })
    expect(prompt).toContain("Anthropic's official CLI")
    expect(prompt).toContain('use the tools available')
  })

  test('contains "Complete the task fully" anti-half-done directive', () => {
    // Critical phrase — caller infers from this that the agent will
    // not leave work in progress. A refactor that drops it would
    // change behavior in ways that affect AgentTool consumers.
    expect(
      GENERAL_PURPOSE_AGENT.getSystemPrompt!({
        toolUseContext: FAKE_TOOL_USE_CONTEXT,
      }),
    ).toContain('Complete the task fully')
    expect(
      GENERAL_PURPOSE_AGENT.getSystemPrompt!({
        toolUseContext: FAKE_TOOL_USE_CONTEXT,
      }),
    ).toContain("don't gold-plate")
  })

  test('contains NEVER-create-files guard', () => {
    const prompt = GENERAL_PURPOSE_AGENT.getSystemPrompt!({
      toolUseContext: FAKE_TOOL_USE_CONTEXT,
    })
    expect(prompt).toContain(
      "NEVER create files unless they're absolutely necessary",
    )
    expect(prompt).toContain(
      'NEVER proactively create documentation files',
    )
  })

  test('contains "concise report" reporting contract', () => {
    // The agent must report concisely to the parent — the parent will
    // relay to the user. Verbose reports waste tokens and mislead.
    const prompt = GENERAL_PURPOSE_AGENT.getSystemPrompt!({
      toolUseContext: FAKE_TOOL_USE_CONTEXT,
    })
    expect(prompt).toContain('concise report')
    expect(prompt).toContain('caller will relay this to the user')
  })

  test('returns the same content per call (deterministic)', () => {
    const a = GENERAL_PURPOSE_AGENT.getSystemPrompt!({
      toolUseContext: FAKE_TOOL_USE_CONTEXT,
    })
    const b = GENERAL_PURPOSE_AGENT.getSystemPrompt!({
      toolUseContext: FAKE_TOOL_USE_CONTEXT,
    })
    expect(a).toBe(b)
  })
})
