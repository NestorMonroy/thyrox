/**
 * `@thyrox/agent/sessionStores` no conoce `repl`: quien crea el store le
 * pasa el `onChange`. Cada punto de este paquete que crea un store de sesión
 * tiene que pasarle `onChangeAppState`; si uno lo omite, los cambios de modo
 * de permisos, modelo y configuración de esa sesión no se sincronizan, sin
 * error que lo delate.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = (file: string) => readFileSync(join(import.meta.dir, '..', file), 'utf8')

// El argumento completo de cada llamada a un creador, con paréntesis anidados.
function creatorCalls(text: string): string[] {
  const calls: string[] = []
  for (const match of text.matchAll(/create(?:Interactive|Headless)SessionStore\(/g)) {
    let depth = 1
    let end = match.index! + match[0].length
    while (depth > 0 && end < text.length) {
      if (text[end] === '(') depth++
      else if (text[end] === ')') depth--
      end++
    }
    calls.push(text.slice(match.index!, end))
  }
  return calls
}

describe.each(['bootstrap.ts', 'installCliBindings.ts', 'runtimeHandles.ts'])('%s', file => {
  test('importa onChangeAppState de repl', () => {
    expect(source(file)).toMatch(/import \{[^}]*\bonChangeAppState\b[^}]*\} from '@thyrox\/repl\/onChangeAppState\.js'/)
  })

  test('pasa onChangeAppState a cada creador de store', () => {
    const calls = creatorCalls(source(file).replace(/^import .*$/gm, ''))
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) expect(call).toMatch(/,\s*onChangeAppState\s*,?\s*\)$/)
  })
})
