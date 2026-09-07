/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/mcpStringUtils.ts` —
 * sus 6 exportaciones, ninguna omitida.
 *
 * Funciones puras de utilidad de cadenas para parsear nombres de
 * herramienta/servidor MCP. Sin dependencias pesadas, para mantenerse
 * ligero para consumidores que sólo necesitan parseo de cadenas (p. ej.
 * `permissionValidation`).
 *
 * Nota: `mcpInfoFromString` y `getMcpPrefix` están duplicadas — a
 * propósito, en la fuente — en `./compat.ts` (la capa de compatibilidad
 * hacia atrás). No se deduplican aquí: es la forma que la propia fuente
 * ya tiene, y este archivo declara su propia razón de ser (ligereza) para
 * mantener la duplicación.
 */

import { normalizeNameForMCP } from './normalization.js'

/*
 * Extrae la información del servidor MCP de una cadena de nombre de
 * herramienta.
 * @param toolString La cadena a parsear. Formato esperado:
 *   "mcp__serverName__toolName"
 * @returns Un objeto con el nombre de servidor y el nombre de
 *   herramienta opcional, o null si no es una regla MCP válida.
 *
 * Limitación conocida: si un nombre de servidor contiene "__", el parseo
 * será incorrecto. Por ejemplo, "mcp__my__server__tool" se parsearía
 * como server="my" y tool="server__tool" en vez de server="my__server"
 * y tool="tool". Esto es raro en la práctica ya que los nombres de
 * servidor normalmente no llevan guiones bajos dobles.
 */
export function mcpInfoFromString(toolString: string): {
  serverName: string
  toolName: string | undefined
} | null {
  const parts = toolString.split('__')
  const [mcpPart, serverName, ...toolNameParts] = parts
  if (mcpPart !== 'mcp' || !serverName) {
    return null
  }
  // Une todas las partes después del nombre de servidor para preservar
  // los guiones bajos dobles en los nombres de herramienta.
  const toolName =
    toolNameParts.length > 0 ? toolNameParts.join('__') : undefined
  return { serverName, toolName }
}

/**
 * Genera el prefijo de nombre de herramienta/comando MCP para un
 * servidor dado.
 * @param serverName Nombre del servidor MCP
 * @returns La cadena de prefijo
 */
export function getMcpPrefix(serverName: string): string {
  return `mcp__${normalizeNameForMCP(serverName)}__`
}

/**
 * Construye un nombre de herramienta MCP totalmente calificado a partir
 * del nombre de servidor y de herramienta. Inverso de
 * mcpInfoFromString().
 * @param serverName Nombre del servidor MCP (sin normalizar)
 * @param toolName Nombre de la herramienta (sin normalizar)
 * @returns El nombre totalmente calificado, p. ej. "mcp__server__tool"
 */
export function buildMcpToolName(serverName: string, toolName: string): string {
  return `${getMcpPrefix(serverName)}${normalizeNameForMCP(toolName)}`
}

/**
 * Devuelve el nombre a usar para el matching de reglas de permiso. Para
 * herramientas MCP, usa el nombre totalmente calificado
 * mcp__server__tool para que las reglas de negación dirigidas a
 * builtins (p. ej. "Write") no coincidan con reemplazos MCP sin prefijo
 * que comparten el mismo nombre de exhibición. Recae en `tool.name`.
 */
export function getToolNameForPermissionCheck(tool: {
  name: string
  mcpInfo?: { serverName: string; toolName: string }
}): string {
  return tool.mcpInfo
    ? buildMcpToolName(tool.mcpInfo.serverName, tool.mcpInfo.toolName)
    : tool.name
}

/*
 * Extrae el nombre de exhibición de un nombre de herramienta/comando MCP.
 * @param fullName El nombre completo de herramienta/comando MCP (p. ej.
 *   "mcp__server_name__tool_name")
 * @param serverName El nombre de servidor a quitar del prefijo
 * @returns El nombre de exhibición sin el prefijo MCP
 */
export function getMcpDisplayName(
  fullName: string,
  serverName: string,
): string {
  const prefix = `mcp__${normalizeNameForMCP(serverName)}__`
  return fullName.replace(prefix, '')
}

/**
 * Extrae sólo el nombre de exhibición de herramienta/comando de un
 * userFacingName.
 * @param userFacingName El nombre completo de cara al usuario (p. ej.
 *   "github - Add comment to issue (MCP)")
 * @returns El nombre de exhibición sin el prefijo de servidor ni el
 *   sufijo (MCP)
 */
export function extractMcpToolDisplayName(userFacingName: string): string {
  // Esto es feo de verdad, pero nuestro tipo Tool actual no facilita
  // tener nombres de exhibición distintos para propósitos distintos.

  // Primero, quita el sufijo (MCP) si está presente.
  let withoutSuffix = userFacingName.replace(/\s*\(MCP\)\s*$/, '')

  // Recorta el resultado.
  withoutSuffix = withoutSuffix.trim()

  // Luego, quita el prefijo de servidor (todo antes de " - ").
  const dashIndex = withoutSuffix.indexOf(' - ')
  if (dashIndex !== -1) {
    const displayName = withoutSuffix.substring(dashIndex + 3).trim()
    return displayName
  }

  // Si no se encuentra un guion, devuelve la cadena sin (MCP).
  return withoutSuffix
}
