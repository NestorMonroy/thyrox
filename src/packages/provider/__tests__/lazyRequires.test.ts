/**
 * Los `require('./…')` perezosos de `@thyrox/provider` resuelven.
 *
 * `bun build` los rechazó en la primera pasada del build JS (banco
 * `broken-imports-*`): `connections.ts` pedía `./commands/logout/logout.ts`
 * —el archivo es `.tsx`— y `claude.ts` pedía `./internal/adapters.ts`, que no
 * existe: `getProviderAdapter` vive en `./adapters.ts`. No eran un límite del
 * empaquetador: en ejecución fallaban igual, con `ResolveMessage`, en cuanto
 * se desconectaba la última conexión o se consultaba el modelo.
 */
import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { queryModelWithoutStreaming, queryModelWithStreaming } from '../src/claude.ts'

const SRC = join(import.meta.dir, '..', 'src')
const args = {
  messages: [],
  systemPrompt: [],
  thinkingConfig: { type: 'disabled' },
  tools: [],
  signal: new AbortController().signal,
  options: { model: 'claude-sonnet-5' },
} as unknown as Parameters<typeof queryModelWithoutStreaming>[0]

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path))
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.d.ts')) out.push(path)
  }
  return out
}

describe('require relativos de provider/src', () => {
  test('todo require literal relativo resuelve', () => {
    const unresolved: string[] = []
    for (const file of sourceFiles(SRC)) {
      for (const m of readFileSync(file, 'utf8').matchAll(/\brequire\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) {
        try {
          Bun.resolveSync(m[1]!, dirname(file))
        } catch {
          unresolved.push(`${file.slice(SRC.length + 1)} -> ${m[1]}`)
        }
      }
    }
    expect(unresolved).toEqual([])
  })
})

describe('las consultas de claude.ts llegan al adaptador', () => {
  test('sin streaming: falla por host sin enlazar, no por resolución', async () => {
    const error = await queryModelWithoutStreaming(args).then(() => null, (e: Error) => e)
    expect(error?.name).toBe('ProviderHostBindingsError')
  })
  test('con streaming: igual', async () => {
    const error = await queryModelWithStreaming(args).next().then(() => null, (e: Error) => e)
    expect(error?.name).toBe('ProviderHostBindingsError')
  })
})
