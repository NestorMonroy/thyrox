/**
 * Sustitutos locales de símbolos que, en `ccnmt`
 * (`packages/tool-registry/src/tools/{ListMcpResourcesTool,MCPTool,
 * ReadMcpResourceTool}/{ListMcpResourcesTool,MCPTool,ReadMcpResourceTool}.ts`),
 * vienen de `@claude-code-how-works/output/terminal.js`. Mismo patrón que
 * `@thyrox/memory: src/internal/pendingCrossPackageDeps.ts` y
 * `@thyrox/ide: src/internal/pendingCrossPackageDeps.ts`.
 *
 * - `isOutputLineTruncated` — de `@claude-code-how-works/output/terminal.ts`
 *   (114 líneas fuente: además trae `renderTruncatedContent` y `wrapText`,
 *   que dependen de `chalk`, `@anthropic/ink` (`stringWidth`),
 *   `@thyrox/repl/components/CtrlOToExpand.js` y `./utils/sliceAnsi.js` —
 *   ninguno hace falta aquí). `isOutputLineTruncated` en sí es
 *   AUTOCONTENIDO (sólo cuenta saltos de línea crudos, sin envolver por
 *   ancho de terminal) y se porta FIEL y COMPLETO, verbatim contra la
 *   fuente — incluida la constante `MAX_LINES_TO_SHOW = 3` de la que
 *   depende. Portar el archivo `output/terminal.ts` entero es tarea de
 *   quien porte `output`, no de `tool-registry`; cuando ese subpath exista
 *   ahí, este sustituto se retira y los tres consumidores
 *   (`ListMcpResourcesTool.ts`, `MCPTool.ts`, `ReadMcpResourceTool.ts`)
 *   importan el real.
 */

/** Constante verbatim de `output/terminal.ts:8` — número máximo de líneas
 *  que `OutputLine` muestra antes de truncar. */
const MAX_LINES_TO_SHOW = 3

/**
 * Chequeo rápido: ¿truncaría `OutputLine` este contenido? Sólo cuenta
 * saltos de línea crudos (ignora el envoltorio por ancho de terminal), así
 * que puede devolver `false` para una sola línea muy larga que envuelve
 * más allá de 3 filas visuales — aceptable, porque el caso común es salida
 * multi-línea.
 */
export function isOutputLineTruncated(content: string): boolean {
  let pos = 0
  // Hacen falta más de MAX_LINES_TO_SHOW saltos de línea (el contenido
  // llena > 3 líneas). El +1 da cuenta de que wrapText muestra una línea
  // extra cuando remainingLines==1.
  for (let i = 0; i <= MAX_LINES_TO_SHOW; i++) {
    pos = content.indexOf('\n', pos)
    if (pos === -1) return false
    pos++
  }
  // Un salto de línea final es un terminador, no una línea nueva — calza
  // con el comportamiento de trimEnd() de renderTruncatedContent.
  return pos < content.length
}

/**
 * Sustituto de la macro `feature()` de `bun:bundle` (sistema de flags de
 * compilación propio de `ccnmt`, ausente en este árbol — medido: `import
 * 'bun:bundle'` no resuelve). Siempre `false`, el mismo valor por defecto
 * que ya usa `@thyrox/provider: src/internal/legacyRuntimeSupport.ts` para
 * la misma macro: cada rama gateada por `feature(...)` en la fuente
 * (`MCP_RICH_OUTPUT` en este caso) es una capacidad opt-in que, apagada,
 * deja intacto el comportamiento base (el camino sin enriquecer).
 */
export function feature(_flag: string): boolean {
  return false
}
