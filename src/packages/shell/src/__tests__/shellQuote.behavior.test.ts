import { describe, expect, test } from 'bun:test'
import {
  hasMalformedTokens,
  hasShellQuoteSingleQuoteBug,
  tryParseShellCommand,
  tryQuoteShellArgs,
} from '../bash/shellQuote.ts'

describe('shell-quote safe runtime', () => {
  test('parses operators while preserving caller-provided variables', () => {
    const parsed = tryParseShellCommand('echo "$NAME" | cat', key => `$${key}`)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.tokens).toContain('$NAME')
      expect(parsed.tokens).toContainEqual({ op: '|' })
    }
  })

  test('returns typed failures rather than throwing for unsupported substitutions', () => {
    const parsed = tryParseShellCommand('echo ${NAME')
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.failureKind).toBe('expected-limitation')
      expect(parsed.reasonCode).toBe('bad-substitution')
    }
  })

  test('quotes scalar arguments and rejects object arguments', () => {
    expect(tryQuoteShellArgs(['echo', 'hello world'])).toEqual({
      success: true,
      quoted: "echo 'hello world'",
    })
    const rejected = tryQuoteShellArgs(['echo', { unsafe: true }])
    expect(rejected.success).toBe(false)
  })

  test('detects malformed syntax that shell-quote would normalize', () => {
    const command = 'echo {"hi":\\"hi;calc.exe"}'
    const parsed = tryParseShellCommand(command)
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(hasMalformedTokens(command, parsed.tokens)).toBe(true)
    expect(hasMalformedTokens('echo "unterminated', ['echo', 'unterminated'])).toBe(true)
  })

  test('detects the single-quoted trailing-backslash differential', () => {
    expect(hasShellQuoteSingleQuoteBug("git ls-remote 'safe\\\\' '--upload-pack=evil' 'repo'")).toBe(true)
    expect(hasShellQuoteSingleQuoteBug("printf '%s' 'safe'")).toBe(false)
  })
})
