/**
 * Utilidades de descubrimiento de herramientas diferidas — puerto PARCIAL
 * de `ccnmt: packages/agent/toolSearch.ts` (769 líneas, 13 símbolos
 * exportados).
 *
 * PORTE PARCIAL, declarado. Este archivo porta únicamente los DOS símbolos
 * que ejercita `__tests__/toolSearchPure.test.ts` — `isToolReferenceBlock`
 * y `extractDiscoveredToolNames` — más sus tres auxiliares privados
 * (`isToolReferenceWithName`, el tipo `ToolResultBlock` y
 * `isToolResultBlockWithContent`). Los once símbolos exportados restantes
 * de la fuente NO se portan aquí, y ningún test portado los ejercita:
 *
 *   - `getAutoToolSearchCharThreshold`, `ToolSearchMode`,
 *     `getToolSearchMode`, `modelSupportsToolReference`,
 *     `isToolSearchEnabledOptimistic`, `isToolSearchToolAvailable`,
 *     `isToolSearchEnabled` — la resolución de modo (variables de
 *     entorno, GrowthBook, conteo de tokens contra el modelo) depende de
 *     `@claude-code-how-works/config/feature-flags`,
 *     `@claude-code-how-works/tool-registry/**`,
 *     `@claude-code-how-works/provider/**` y
 *     `@claude-code-how-works/local-observability/slowOperations.js` —
 *     ninguno vive en este árbol (medido: `ls src/packages/` sólo trae
 *     `agent`, `binary`, `command-runtime`, `config`, `harness`, `tasks`).
 *   - `DeferredToolsDelta`, `DeferredToolsDeltaScanContext`,
 *     `isDeferredToolsDeltaEnabled`, `getDeferredToolsDelta` — el cálculo
 *     de delta de herramientas diferidas depende de la misma familia de
 *     paquetes ausentes.
 *
 * Los dos símbolos portados son puros: no leen variables de entorno, no
 * llaman a GrowthBook, no cuentan tokens — sólo inspeccionan la forma de
 * bloques de mensaje ya materializados. Por eso son portables sin
 * arrastrar el resto del archivo.
 *
 * Dos divergencias más, ambas de forma y no de comportamiento:
 *
 *   - `Message` se importa de `./messageShapes.ts` (puerto local ya
 *     existente en este árbol) en vez de
 *     `@claude-code-how-works/repl/replTypes/message.js` (ausente).
 *   - La llamada de diagnóstico `logForDebugging(...)` de la fuente — una
 *     línea, sin aserción de ningún test portado — NO se reproduce: su
 *     único efecto es escribir a un log de depuración, y acoplaría este
 *     archivo a `./host.ts` (bindings del host, que lanzan si no están
 *     instaladas) sólo para ese side-effect no verificado. La variable
 *     `carriedFromBoundary` que sólo alimentaba ese mensaje se retira con
 *     ella.
 */
import type { Message } from './messageShapes.ts'

/**
 * Verifica si un objeto es un bloque `tool_reference`.
 * `tool_reference` es una feature beta que no está en los tipos del SDK,
 * así que hace falta una verificación en runtime.
 */
export function isToolReferenceBlock(obj: unknown): boolean {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    (obj as { type: unknown }).type === 'tool_reference'
  )
}

/**
 * Type guard para un bloque `tool_reference` con `tool_name`.
 */
function isToolReferenceWithName(
  obj: unknown,
): obj is { type: 'tool_reference'; tool_name: string } {
  return (
    isToolReferenceBlock(obj) &&
    'tool_name' in (obj as object) &&
    typeof (obj as { tool_name: unknown }).tool_name === 'string'
  )
}

/**
 * Tipo que representa un bloque `tool_result` con contenido en arreglo.
 * Se usa para extraer bloques `tool_reference` de los resultados de
 * ToolSearchTool.
 */
type ToolResultBlock = {
  type: 'tool_result'
  content: unknown[]
}

/**
 * Type guard para bloques `tool_result` con contenido en arreglo.
 */
function isToolResultBlockWithContent(obj: unknown): obj is ToolResultBlock {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    (obj as { type: unknown }).type === 'tool_result' &&
    'content' in obj &&
    Array.isArray((obj as { content: unknown }).content)
  )
}

/**
 * Extrae los nombres de herramienta de los bloques `tool_reference` en el
 * historial de mensajes.
 *
 * Cuando la carga dinámica de herramientas está habilitada, las
 * herramientas MCP no se predeclaran en el arreglo de herramientas. En su
 * lugar, se descubren vía ToolSearchTool, que devuelve bloques
 * `tool_reference`. Esta función recorre el historial de mensajes para
 * encontrar todos los nombres de herramienta referenciados, de modo que
 * sólo esas herramientas se incluyan en peticiones subsecuentes a la API.
 *
 * Este enfoque:
 * - Elimina la necesidad de predeclarar todas las herramientas MCP por
 *   adelantado.
 * - Retira los límites sobre la cantidad total de herramientas MCP.
 *
 * La compactación reemplaza los mensajes que portan `tool_reference` por
 * un resumen, así que el conjunto descubierto se snapshotea sobre
 * `compactMetadata.preCompactDiscoveredTools` en el marcador de frontera;
 * este recorrido lo vuelve a leer.
 *
 * @param messages Arreglo de mensajes que puede contener bloques
 *   `tool_result` con contenido `tool_reference`
 * @returns Conjunto de nombres de herramienta descubiertos vía bloques
 *   `tool_reference`
 */
export function extractDiscoveredToolNames(messages: Message[]): Set<string> {
  const discoveredTools = new Set<string>()

  for (const msg of messages) {
    // La frontera de compactación porta el conjunto descubierto previo a
    // la compactación. Verificación de tipo inline en vez de una función
    // aparte — evita un ciclo de import con quien más adelante consuma
    // ambos.
    if (msg.type === 'system' && msg.subtype === 'compact_boundary') {
      const carried = (
        msg as Message & {
          compactMetadata?: { preCompactDiscoveredTools?: string[] }
        }
      ).compactMetadata?.preCompactDiscoveredTools
      if (carried) {
        for (const name of carried) discoveredTools.add(name)
      }
      continue
    }

    // Sólo los mensajes de usuario contienen bloques tool_result
    // (respuestas a tool_use).
    if (msg.type !== 'user') continue

    const content = msg.message?.content
    if (!Array.isArray(content)) continue

    for (const block of content) {
      // Los bloques tool_reference sólo aparecen dentro de contenido
      // tool_result, específicamente en resultados de ToolSearchTool. La
      // API expande estas referencias a definiciones completas de
      // herramienta en el contexto del modelo.
      if (isToolResultBlockWithContent(block)) {
        for (const item of block.content) {
          if (isToolReferenceWithName(item)) {
            discoveredTools.add(item.tool_name)
          }
        }
      }
    }
  }

  return discoveredTools
}
