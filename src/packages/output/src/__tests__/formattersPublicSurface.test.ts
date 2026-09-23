import { describe, expect, test } from 'bun:test'
import {
  truncate,
  truncateToWidth,
  truncateToWidthNoEllipsis,
} from '../formatters/index.ts'

describe('@thyrox/output/formatters public surface', () => {
  test('publishes the canonical width-aware truncation helpers', () => {
    expect(truncate('abcdef', 4)).toBe('abc…')
    expect(truncateToWidth('abcdef', 4)).toBe('abc…')
    expect(truncateToWidthNoEllipsis('abcdef', 4)).toBe('abcd')
  })
})
