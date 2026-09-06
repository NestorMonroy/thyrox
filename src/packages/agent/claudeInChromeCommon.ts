/**
 * Nombre del servidor MCP de "Claude in Chrome" + seguimiento de pestañas —
 * porte de `ccnmt: packages/agent/claudeInChromeCommon.ts`.
 *
 * PORTE PARCIAL, declarado a propósito. La fuente exporta además la
 * detección de navegador (`getAllBrowserDataPaths`, `detectAvailableBrowser`,
 * `openInChrome`, sockets/pipes de la extensión, etc.), que depende de
 * `node:fs`, `node:os`, cuatro paquetes del monorepo de origen
 * (`@claude-code-how-works/mcp-runtime`, `local-observability`, `shell`,
 * `config`) y del tipo `ChromiumBrowser` de `./claudeInChromeSetupPortable.js`
 * — ninguno presente ni con test asignado en este árbol. Lo único con test
 * asignado aquí es la detección del nombre del servidor MCP y el
 * seguimiento de pestañas (`isClaudeInChromeMCPServer`,
 * `trackClaudeInChromeTabId`, `isTrackedClaudeInChromeTabId`). Se declara en
 * vez de fabricar un porte parcial en silencio (`porte-completo-no-parcial.md`).
 */

export const CLAUDE_IN_CHROME_MCP_SERVER_NAME = 'claude-in-chrome'

/**
 * Normaliza un nombre de servidor MCP al patrón `^[a-zA-Z0-9_-]{1,64}$`:
 * cualquier carácter fuera de esa lista pasa a guion bajo.
 *
 * Inline, no importado: en la fuente vive en
 * `@claude-code-how-works/mcp-runtime/src/normalization.ts`, un módulo sin
 * dependencias propias. Portar el paquete entero por esta única función de
 * dos líneas no aporta — se copia su comportamiento aquí, con la cita de
 * dónde vive en la fuente.
 */
function normalizeNameForMCP(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export function isClaudeInChromeMCPServer(name: string): boolean {
  return normalizeNameForMCP(name) === CLAUDE_IN_CHROME_MCP_SERVER_NAME
}

const MAX_TRACKED_TABS = 200
const trackedTabIds = new Set<number>()

/**
 * Rastrea el id de una pestaña. Al llegar al tope, si el id es NUEVO se
 * limpia todo el conjunto antes de agregarlo (evita crecimiento ilimitado);
 * si el id YA está rastreado, se agrega sin limpiar (evita perder estado
 * real cuando una pestaña dispara su evento de activación repetidamente).
 */
export function trackClaudeInChromeTabId(tabId: number): void {
  if (trackedTabIds.size >= MAX_TRACKED_TABS && !trackedTabIds.has(tabId)) {
    trackedTabIds.clear()
  }
  trackedTabIds.add(tabId)
}

export function isTrackedClaudeInChromeTabId(tabId: number): boolean {
  return trackedTabIds.has(tabId)
}
