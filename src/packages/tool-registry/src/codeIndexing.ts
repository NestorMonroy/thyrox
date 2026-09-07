/**
 * Puerto FIEL y COMPLETO de
 * `ccnmt: packages/tool-registry/src/codeIndexing.ts` (TASK #232, porte de
 * `tool-registry`). Sin dependencias.
 *
 * Funciones utilitarias para detectar el uso de herramientas de indexado de
 * código.
 *
 * Rastrea el uso de soluciones comunes de indexado de código como
 * Sourcegraph, Cody, etc., tanto vía comandos de CLI como vía integraciones
 * con servidores MCP.
 */

/**
 * Identificadores conocidos de herramientas de indexado de código.
 * Son los nombres normalizados que se usan en los eventos de analítica.
 */
export type CodeIndexingTool =
  // Motores de búsqueda de código
  | 'sourcegraph'
  | 'hound'
  | 'seagoat'
  | 'bloop'
  | 'gitloop'
  // Asistentes de codificación con IA que indexan
  | 'cody'
  | 'aider'
  | 'continue'
  | 'github-copilot'
  | 'cursor'
  | 'tabby'
  | 'codeium'
  | 'tabnine'
  | 'augment'
  | 'windsurf'
  | 'aide'
  | 'pieces'
  | 'qodo'
  | 'amazon-q'
  | 'gemini'
  // Servidores MCP de indexado de código
  | 'claude-context'
  | 'code-index-mcp'
  | 'local-code-search'
  | 'autodev-codebase'
  // Proveedores de contexto
  | 'openctx'

/**
 * Mapeo de prefijos de comando de CLI a herramientas de indexado de código.
 * La clave es el nombre del comando (la primera palabra del comando).
 */
const CLI_COMMAND_MAPPING: Record<string, CodeIndexingTool> = {
  // Ecosistema Sourcegraph
  src: 'sourcegraph',
  cody: 'cody',
  // Asistentes de codificación con IA
  aider: 'aider',
  tabby: 'tabby',
  tabnine: 'tabnine',
  augment: 'augment',
  pieces: 'pieces',
  qodo: 'qodo',
  aide: 'aide',
  // Herramientas de búsqueda de código
  hound: 'hound',
  seagoat: 'seagoat',
  bloop: 'bloop',
  gitloop: 'gitloop',
  // Asistentes de IA de proveedores cloud
  q: 'amazon-q',
  gemini: 'gemini',
}

/**
 * Mapeo de patrones de nombre de servidor MCP a herramientas de indexado
 * de código. Los patrones se comparan sin distinguir mayúsculas contra el
 * nombre del servidor.
 */
const MCP_SERVER_PATTERNS: Array<{
  pattern: RegExp
  tool: CodeIndexingTool
}> = [
  // Ecosistema Sourcegraph
  { pattern: /^sourcegraph$/i, tool: 'sourcegraph' },
  { pattern: /^cody$/i, tool: 'cody' },
  { pattern: /^openctx$/i, tool: 'openctx' },
  // Asistentes de codificación con IA
  { pattern: /^aider$/i, tool: 'aider' },
  { pattern: /^continue$/i, tool: 'continue' },
  { pattern: /^github[-_]?copilot$/i, tool: 'github-copilot' },
  { pattern: /^copilot$/i, tool: 'github-copilot' },
  { pattern: /^cursor$/i, tool: 'cursor' },
  { pattern: /^tabby$/i, tool: 'tabby' },
  { pattern: /^codeium$/i, tool: 'codeium' },
  { pattern: /^tabnine$/i, tool: 'tabnine' },
  { pattern: /^augment[-_]?code$/i, tool: 'augment' },
  { pattern: /^augment$/i, tool: 'augment' },
  { pattern: /^windsurf$/i, tool: 'windsurf' },
  { pattern: /^aide$/i, tool: 'aide' },
  { pattern: /^codestory$/i, tool: 'aide' },
  { pattern: /^pieces$/i, tool: 'pieces' },
  { pattern: /^qodo$/i, tool: 'qodo' },
  { pattern: /^amazon[-_]?q$/i, tool: 'amazon-q' },
  { pattern: /^gemini[-_]?code[-_]?assist$/i, tool: 'gemini' },
  { pattern: /^gemini$/i, tool: 'gemini' },
  // Herramientas de búsqueda de código
  { pattern: /^hound$/i, tool: 'hound' },
  { pattern: /^seagoat$/i, tool: 'seagoat' },
  { pattern: /^bloop$/i, tool: 'bloop' },
  { pattern: /^gitloop$/i, tool: 'gitloop' },
  // Servidores MCP de indexado de código
  { pattern: /^claude[-_]?context$/i, tool: 'claude-context' },
  { pattern: /^code[-_]?index[-_]?mcp$/i, tool: 'code-index-mcp' },
  { pattern: /^code[-_]?index$/i, tool: 'code-index-mcp' },
  { pattern: /^local[-_]?code[-_]?search$/i, tool: 'local-code-search' },
  { pattern: /^codebase$/i, tool: 'autodev-codebase' },
  { pattern: /^autodev[-_]?codebase$/i, tool: 'autodev-codebase' },
  { pattern: /^code[-_]?context$/i, tool: 'claude-context' },
]

/**
 * Detecta si un comando de bash usa una CLI de indexado de código.
 *
 * @param command - la cadena completa del comando de bash
 * @returns el identificador de la herramienta de indexado, o `undefined` si
 *   no es un comando de indexado de código
 *
 * @example
 * detectCodeIndexingFromCommand('src search "pattern"') // devuelve 'sourcegraph'
 * detectCodeIndexingFromCommand('cody chat --message "help"') // devuelve 'cody'
 * detectCodeIndexingFromCommand('ls -la') // devuelve undefined
 */
export function detectCodeIndexingFromCommand(
  command: string,
): CodeIndexingTool | undefined {
  // Extrae la primera palabra (el nombre del comando)
  const trimmed = command.trim()
  const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase()

  if (!firstWord) {
    return undefined
  }

  // Revisa comandos prefijados con npx/bunx
  if (firstWord === 'npx' || firstWord === 'bunx') {
    const secondWord = trimmed.split(/\s+/)[1]?.toLowerCase()
    if (secondWord && secondWord in CLI_COMMAND_MAPPING) {
      return CLI_COMMAND_MAPPING[secondWord]
    }
  }

  return CLI_COMMAND_MAPPING[firstWord]
}

/**
 * Detecta si una herramienta MCP proviene de un servidor de indexado de
 * código.
 *
 * @param toolName - el nombre de la herramienta MCP (formato:
 *   mcp__serverName__toolName)
 * @returns el identificador de la herramienta de indexado, o `undefined` si
 *   no es una herramienta de indexado de código
 *
 * @example
 * detectCodeIndexingFromMcpTool('mcp__sourcegraph__search') // devuelve 'sourcegraph'
 * detectCodeIndexingFromMcpTool('mcp__cody__chat') // devuelve 'cody'
 * detectCodeIndexingFromMcpTool('mcp__filesystem__read') // devuelve undefined
 */
export function detectCodeIndexingFromMcpTool(
  toolName: string,
): CodeIndexingTool | undefined {
  // Los nombres de herramienta MCP siguen el formato: mcp__serverName__toolName
  if (!toolName.startsWith('mcp__')) {
    return undefined
  }

  const parts = toolName.split('__')
  if (parts.length < 3) {
    return undefined
  }

  const serverName = parts[1]
  if (!serverName) {
    return undefined
  }

  for (const { pattern, tool } of MCP_SERVER_PATTERNS) {
    if (pattern.test(serverName)) {
      return tool
    }
  }

  return undefined
}

/**
 * Detecta si el nombre de un servidor MCP corresponde a una herramienta de
 * indexado de código.
 *
 * @param serverName - el nombre del servidor MCP
 * @returns el identificador de la herramienta de indexado, o `undefined` si
 *   no es un servidor de indexado de código
 *
 * @example
 * detectCodeIndexingFromMcpServerName('sourcegraph') // devuelve 'sourcegraph'
 * detectCodeIndexingFromMcpServerName('filesystem') // devuelve undefined
 */
export function detectCodeIndexingFromMcpServerName(
  serverName: string,
): CodeIndexingTool | undefined {
  for (const { pattern, tool } of MCP_SERVER_PATTERNS) {
    if (pattern.test(serverName)) {
      return tool
    }
  }

  return undefined
}
