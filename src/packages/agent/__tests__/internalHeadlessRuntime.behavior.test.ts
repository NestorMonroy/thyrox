import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Porte de
 * `ccnmt: packages/agent/__tests__/internalHeadlessRuntime.behavior.test.ts`.
 *
 * Pin a nivel de fuente para `internal/headlessRuntime.ts` — 16 fachadas
 * sobre las ataduras del host que usa el bucle del modo headless / --print.
 *
 * El invariante grande: cada fachada tiene un fallback determinístico
 * cuando falta la atadura del host. Los fallbacks NO son arbitrarios —
 * están calibrados para que el modo headless degrade con gracia (devuelve
 * arreglos/objetos vacíos) en vez de reventar.
 *
 * Se fija cada fallback para que un refactor no cambie por accidente
 * "sin host → []" a "sin host → throw" o "sin host → undefined".
 */
describe('internal/headlessRuntime — fallbacks', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'internal', 'headlessRuntime.ts'),
    'utf-8',
  )

  describe('fallbacks de paso (el input se hace eco sin cambios)', () => {
    test('parseUserSpecifiedModel: sin host → hace eco del model', () => {
      // Pin: quien llama pasa el id de modelo escrito por el usuario; si
      // falta el parser del host, el string crudo es lo mejor que se puede
      // hacer.
      expect(source).toMatch(
        /parseUserSpecifiedModel\?\.\(model\) \?\? model/,
      )
    })

    test('sdkCompatToolName: sin host → hace eco de toolName', () => {
      expect(source).toMatch(
        /sdkCompatToolName\?\.\(toolName\) \?\? toolName/,
      )
    })
  })

  describe('fallbacks vacíos/falsy (degradan con gracia)', () => {
    test('getMainLoopModel: sin host → "" (string vacío, no undefined)', () => {
      // Pin: quien llama usa el resultado como string. undefined reventaría
      // en un .startsWith, etc.
      expect(source).toMatch(/getMainLoopModel\?\.\(\) \?\? ''/)
    })

    test('loadAllPluginsCacheOnly: sin host → { enabled: [] }', () => {
      // Pin: quien llama itera .enabled — un arreglo vacío significa "sin
      // plugins", no "revienta".
      expect(source).toMatch(
        /loadAllPluginsCacheOnly\?\.\(\)\)\s*\?\?\s*\{\s*\n?\s*enabled: \[\],/,
      )
    })

    test('processUserInput: sin host → shouldQuery=false, messages=[]', () => {
      // Pin: shouldQuery=false significa "sáltate la llamada al LLM".
      // Devolver true enrutaría un mensaje nulo al modelo.
      expect(source).toMatch(
        /processUserInput[\s\S]+?\?\?\s*\{\s*\n?\s*messages: \[\],\s*\n?\s*shouldQuery: false,\s*\n?\s*allowedTools: undefined,/,
      )
    })

    test('fetchSystemPromptParts: sin host → defaults vacíos (sin reventar al acceder al mapa)', () => {
      expect(source).toMatch(
        /fetchSystemPromptParts[\s\S]+?\?\?\s*\{\s*\n?\s*defaultSystemPrompt: \[\],\s*\n?\s*userContext: \{\},\s*\n?\s*systemContext: \{\},/,
      )
    })

    test('isResultSuccessful: sin host → false (NO true, NO undefined)', () => {
      // Pin: caer por defecto a true trataría las corridas sin host
      // instalado como siempre-exitosas — esconde bugs.
      expect(source).toMatch(
        /isResultSuccessful\?\.\(result, lastStopReason\) \?\? false/,
      )
    })

    test('selectableUserMessagesFilter: sin host → true (incluye todo)', () => {
      // Pin: inverso de isResultSuccessful — para filtros, true significa
      // "incluir". Sin un filtro del host, se incluye cada mensaje.
      expect(source).toMatch(
        /selectableUserMessagesFilter\?\.\(message\) \?\? true/,
      )
    })

    test('getCoordinatorUserContext: sin host → {} (registro vacío)', () => {
      expect(source).toMatch(
        /getCoordinatorUserContext\?\.\([\s\S]+?\) \?\? \{\}/,
      )
    })

    test('isSnipBoundaryMessage: sin host → false (NO es un snip)', () => {
      expect(source).toMatch(
        /isSnipBoundaryMessage\?\.\(message\) \?\? false/,
      )
    })
  })

  describe('fallbacks de early-return en generadores', () => {
    test('handleOrphanedPermission: sin host → generador vacío (return)', () => {
      // Pin: el AsyncGenerator debe emitir 0 items, no reventar.
      expect(source).toMatch(
        /handleOrphanedPermission[\s\S]+?if \(!handler\) \{\s*\n?\s*return\s*\n?\s*\}\s*\n?\s*yield\* handler\(/,
      )
    })

    test('normalizeMessage: sin host → generador vacío (return)', () => {
      expect(source).toMatch(
        /normalizeMessage[\s\S]+?if \(!normalizer\) \{\s*\n?\s*return\s*\n?\s*\}\s*\n?\s*yield\* normalizer\(/,
      )
    })
  })

  describe('fallbacks con undefined permitido (quien llama lo verifica explícitamente)', () => {
    test('shouldEnableThinkingByDefault devuelve boolean | undefined', () => {
      // Pin: tri-estado (true/false/undefined). undefined significa "usar
      // el default". Quien llama distingue "el host dice false" de "no hay
      // host".
      expect(source).toMatch(
        /shouldEnableThinkingByDefault\(\): boolean \| undefined/,
      )
      expect(source).toMatch(
        /getAgentHostBindings\(\)\.shouldEnableThinkingByDefault\?\.\(\)/,
      )
    })

    test('buildSystemInitMessage devuelve unknown | undefined (sin fallback)', () => {
      // Pin: el undefined pasa de largo; quien llama lo verifica antes de
      // enviarlo.
      const block = source.match(
        /export function buildSystemInitMessage[\s\S]+?\n\}/,
      )?.[0]
      expect(block).toBeTruthy()
      // Sin `?? algo` — el undefined pasa de largo.
      expect(block).not.toMatch(/\?\? /)
    })

    test('snipCompactIfNeeded devuelve undefined sin host (se salta el snip)', () => {
      // Pin: quien llama verifica `if (result)` antes de usarlo. undefined
      // significa "snip saltado".
      const block = source.match(
        /export function snipCompactIfNeeded[\s\S]+?\n\}/,
      )?.[0]
      expect(block).toBeTruthy()
      expect(block).not.toMatch(/\?\? /)
    })
  })

  describe('fachadas de efecto colateral', () => {
    test('registerStructuredOutputEnforcement: no-op vía optional-chain', () => {
      // Pin: devuelve void — cuando el host no tiene implementación, la
      // llamada es un no-op silencioso.
      expect(source).toMatch(
        /registerStructuredOutputEnforcement\?\.\(\s*\n?\s*setAppState,\s*\n?\s*sessionId,/,
      )
    })
  })

  test('las 16 exportaciones están presentes', () => {
    const exportLines = source
      .split('\n')
      .filter(line => /^export (function|async function)/.test(line))
    expect(exportLines.length).toBe(16)
  })

  test('cada export usa optional-chain al acceder a la atadura del host', () => {
    // Pin: ninguna fachada debe reventar si falta el host. Un regresivo que
    // haga `getAgentHostBindings().X(...)` sin `?.` reventaría a quien
    // corre el modo headless sin el host cableado.
    //
    // Permitido: el cuerpo de la función desestructura la atadura y la
    // verifica falsy (handleOrphanedPermission / normalizeMessage); ambas
    // siguen evitando llamar sobre undefined.
    const directNonOptionalCalls = source.match(
      /getAgentHostBindings\(\)\.[a-zA-Z_$][a-zA-Z0-9_$]*\(/g,
    )
    // No se esperan matches — toda llamada debe ser vía `?.(`
    expect(directNonOptionalCalls).toBeNull()
  })
})
