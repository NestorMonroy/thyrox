import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Pines a nivel de fuente para `internal/runtimeBridges.ts` — cinco
 * fachadas detrás de bindings del host, cuatro de ellas con fallback usado
 * por tests / previo a la instalación. Porte de
 * `ccnmt: packages/agent/__tests__/internalRuntimeBridges.behavior.test.ts`.
 *
 * Invariantes críticos:
 *  1. `createCompactBoundaryMessage`: si el binding del host dispara,
 *     devuelve ese valor. SI NO, construye el mensaje en proceso — con la
 *     MISMA forma exacta: type='system', subtype='compact_boundary',
 *     content='Conversation compacted', isMeta=false, level='info',
 *     compactMetadata={...}. Una regresión que elimine el fallback en
 *     proceso rompe tests + deja invisible el stream de compactación para
 *     quien llama sin host instalado.
 *  2. `logicalParentUuid` se fija SÓLO cuando se provee
 *     `lastPreCompactMessageUuid`. El spread
 *     `...(x ? {logicalParentUuid: x} : {})` mantiene el campo opcional
 *     (ausente), NO undefined.
 *  3. `createDumpPromptsFetch` cae en el `fetch` GLOBAL (NO un error
 *     lanzado ni una función vacía). Se fija para que quien llama siempre
 *     pueda emitir requests.
 *  4. `recordTranscript` devuelve null cuando el host no tiene
 *     implementación (NO lanza, NO undefined). La UI comprueba null.
 */
describe('internal/runtimeBridges', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'internal', 'runtimeBridges.ts'),
    'utf-8',
  )

  describe('createCompactBoundaryMessage', () => {
    test('delega primero al binding del host', () => {
      expect(source).toMatch(
        /createCompactBoundaryMessage\?\.\(\s*\n?\s*trigger,\s*\n?\s*preTokens,/,
      )
    })

    test('pasa los 5 argumentos al host (incl. messagesSummarized)', () => {
      expect(source).toMatch(
        /createCompactBoundaryMessage\?\.\(\s*\n?\s*trigger,\s*\n?\s*preTokens,\s*\n?\s*lastPreCompactMessageUuid,\s*\n?\s*userContext,\s*\n?\s*messagesSummarized,/,
      )
    })

    test('cae en la construcción en proceso cuando el host no devuelve nada', () => {
      expect(source).toMatch(
        /if \(created\) \{\s*\n?\s*return created as CompactBoundaryMessage\s*\n?\s*\}/,
      )
    })

    test('el fallback usa el contenido fijo "Conversation compacted"', () => {
      // Pin: esta cadena exacta sale en los transcripts; un refactor que
      // cambie la redacción crearía inconsistencia stale-vs-fresh para el
      // usuario.
      expect(source).toMatch(/content: 'Conversation compacted'/)
    })

    test('el fallback lleva type=system subtype=compact_boundary level=info isMeta=false', () => {
      expect(source).toMatch(/type: 'system'/)
      expect(source).toMatch(/subtype: 'compact_boundary'/)
      expect(source).toMatch(/level: 'info'/)
      expect(source).toMatch(/isMeta: false/)
    })

    test('el fallback usa randomUUID + new Date().toISOString()', () => {
      // Pin: uuid + timestamp ISO. Una regresión a un contador o a epoch ms
      // rompe el ordenamiento/búsqueda aguas abajo.
      expect(source).toMatch(/import \{ randomUUID \} from 'crypto'/)
      expect(source).toMatch(/uuid: randomUUID\(\)/)
      expect(source).toMatch(/timestamp: new Date\(\)\.toISOString\(\)/)
    })

    test('logicalParentUuid presente SÓLO cuando se provee lastPreCompactMessageUuid', () => {
      // Pin: spread condicional, NO `logicalParentUuid: x ?? undefined`.
      // Una regresión a la forma `??` deja la clave presente con
      // undefined, que serializa distinto en JSON.
      expect(source).toMatch(
        /\.\.\.\(lastPreCompactMessageUuid\s*\n?\s*\?\s*\{ logicalParentUuid: lastPreCompactMessageUuid \}\s*\n?\s*: \{\}\)/,
      )
    })

    test('compactMetadata lleva trigger + preTokens + userContext/messagesSummarized opcionales', () => {
      expect(source).toMatch(/compactMetadata: \{\s*\n?\s*trigger,/)
      expect(source).toMatch(/preTokens,/)
      expect(source).toMatch(/userContext,/)
      expect(source).toMatch(/messagesSummarized,/)
    })
  })

  describe('recordTranscript', () => {
    test('devuelve null (NO undefined, NO lanza) cuando el host no tiene implementación', () => {
      // Pin: quien llama comprueba `if (uuid !== null)`. Un string vacío o
      // undefined harían match falsy pero ensuciarían la serialización
      // JSON aguas abajo.
      expect(source).toMatch(/if \(!record\) \{\s*\n?\s*return null\s*\n?\s*\}/)
    })

    test('pasa los 4 argumentos (messages, teamInfo, parentUuidHint, allMessages)', () => {
      expect(source).toMatch(
        /record\(messages, teamInfo, startingParentUuidHint, allMessages\)/,
      )
    })
  })

  describe('flushSessionStorage', () => {
    test('await con optional-chain (no-op sin host)', () => {
      expect(source).toMatch(
        /flushSessionStorage[\s\S]{0,200}?await getAgentHostBindings\(\)\.flushSessionStorage\?\.\(\)/,
      )
    })
  })

  describe('recordContentReplacement', () => {
    test('await con optional-chain con ambos argumentos', () => {
      expect(source).toMatch(
        /recordContentReplacement\?\.\(\s*\n?\s*replacements,\s*\n?\s*agentId,/,
      )
    })
  })

  describe('createDumpPromptsFetch', () => {
    test('el fallback usa globalThis.fetch (NO lanza)', () => {
      // Pin: quien llama siempre obtiene un fetch usable. Un fallback que
      // lanza haría fallar a cualquiera que intente emitir un request sin
      // --dump-prompts.
      expect(source).toMatch(
        /\(\(input, init\) => globalThis\.fetch\(input, init\)\)/,
      )
    })

    test('el binding del host se consulta primero vía el operador ??', () => {
      expect(source).toMatch(
        /createDumpPromptsFetch\?\.\(agentIdOrSessionId\)\s*\?\?/,
      )
    })
  })

  test('el tipo CompactBoundaryMessage es local al módulo (NO exportado)', () => {
    // Pin: la forma se hace cumplir internamente; quien llama desde
    // afuera debería verla vía la unión AgentMessage. Exportarlo
    // invitaría a que diverja.
    expect(source).not.toMatch(/^export type CompactBoundaryMessage/m)
  })
})
