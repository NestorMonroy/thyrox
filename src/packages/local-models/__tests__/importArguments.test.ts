/**
 * El parseo de `local-models-import run`: un archivo o la partición en shards,
 * cada uno con su sha256 fijado en el mismo orden.
 */
import { describe, expect, test } from 'bun:test'

import { parseImportArguments } from '../importCommand.js'

const [A, B] = ['a'.repeat(64), 'b'.repeat(64)]
const BASE = ['run', '--repository', 'Qwen/Qwen2.5-7B-Instruct-GGUF', '--revision', 'c'.repeat(40), '--scratch-dir', '/s', '--run-dir', '/r']

describe('parseImportArguments', () => {
  test('one file keeps its pinned sha256', () => {
    const parsed = parseImportArguments([...BASE, '--file', 'm.gguf', '--sha256', A])
    expect(parsed?.request.parts).toEqual([{ file: 'm.gguf', sha256: A }])
  })

  test('comma lists pair each shard with its sha256 in order', () => {
    const parsed = parseImportArguments([...BASE, '--file', 'm-00001-of-00002.gguf,m-00002-of-00002.gguf', '--sha256', `${A},${B}`])
    expect(parsed?.request.parts).toEqual([{ file: 'm-00001-of-00002.gguf', sha256: A }, { file: 'm-00002-of-00002.gguf', sha256: B }])
  })

  test('a different number of files and digests is not an import', () => {
    expect(parseImportArguments([...BASE, '--file', 'm-00001-of-00002.gguf,m-00002-of-00002.gguf', '--sha256', A])).toBeUndefined()
  })

  test('a malformed digest in the list is not an import', () => {
    expect(parseImportArguments([...BASE, '--file', 'x.gguf,y.gguf', '--sha256', `${A},nope`])).toBeUndefined()
  })
})
