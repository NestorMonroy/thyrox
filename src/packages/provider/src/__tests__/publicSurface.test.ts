import { describe, expect, test } from 'bun:test'
import {
  adaptGeminiStreamToAnthropic,
  adaptOpenAIStreamToAnthropic,
  anthropicMessagesToGemini,
  anthropicMessagesToOpenAI,
  getAnthropicClient,
  resolveGeminiModel,
  resolveOpenAIModel,
} from '../index.ts'
import type { ProviderThinkingConfig } from '../index.ts'

describe('@thyrox/provider public surface', () => {
  test('publishes canonical provider adapters and client entry point', () => {
    const functions = [
      adaptGeminiStreamToAnthropic,
      adaptOpenAIStreamToAnthropic,
      anthropicMessagesToGemini,
      anthropicMessagesToOpenAI,
      getAnthropicClient,
      resolveGeminiModel,
      resolveOpenAIModel,
    ]
    const thinking: ProviderThinkingConfig = { type: 'enabled', budgetTokens: 1024 }

    expect(functions.every(value => typeof value === 'function')).toBe(true)
    expect(thinking).toEqual({ type: 'enabled', budgetTokens: 1024 })
  })
})
