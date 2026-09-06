/**
 * Metadata de evento — porte AMPLIADO de
 * `ccnmt: packages/agent/eventMetadata.ts`.
 *
 * `getFileExtensionForAnalytics` parte el uso de herramienta por tipo de
 * archivo. El valor no es la extension cruda: es una CLAVE DE ANALITICA, y
 * por eso se normaliza a minusculas y se acota su cardinalidad. Una clave
 * de alta cardinalidad no particiona nada — reparte cada medicion en su
 * propio cubo.
 *
 * AMPLIACION (`__tests__/eventMetadata.test.ts`): agrega
 * `sanitizeToolNameForAnalytics`, `extractMcpToolDetails`,
 * `mcpToolDetailsForAnalytics`, `extractSkillName`,
 * `getFileExtensionsFromBashCommand` e `isToolDetailsLoggingEnabled` — los
 * seis restantes que el test importa. Los cinco primeros son
 * AUTOCONTENIDOS en la fuente (sólo dependen de `extname`, ya importado
 * arriba); `isToolDetailsLoggingEnabled` necesita un lector de entorno
 * booleano (`isEnvTruthy`, importado de `./internalUtils.ts` en vez de
 * duplicarlo — ya está en este árbol con idéntica lógica).
 *
 * Recorte declarado: la fuente trae ademas `extractToolInputForTelemetry`,
 * que depende de `jsonStringify` de
 * `@claude-code-how-works/local-observability/slowOperations.js`
 * (inexistente aqui) — NO se porta: ningun caso de
 * `__tests__/eventMetadata.test.ts` la ejercita.
 *
 * Divergencia de tipo, ya presente antes de esta ampliacion y conservada
 * sin tocar: la fuente marca los valores de retorno con el tipo
 * `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS` (`never`,
 * declarado en la propia fuente); aqui se usan cadenas planas — el mismo
 * criterio que ya eligio el porte anterior de `getFileExtensionForAnalytics`.
 * El invariante que ese tipo documenta (estos valores NO son codigo ni
 * rutas de archivo) sigue siendo cierto por construccion en cada funcion;
 * lo que cambia es que aqui no queda anotado en el sistema de tipos.
 */
import { extname } from 'node:path'
import { isEnvTruthy } from './internalUtils.ts'

/**
 * Sobre esta longitud la extension deja de ser una categoria util y se
 * agrupa. Diez es el limite de la fuente y se porta verbatim: es politica
 * de analitica, no una propiedad del sistema de archivos.
 */
const MAX_EXTENSION_LENGTH = 10

/** El cubo de lo que excede el limite. */
const OVERFLOW_BUCKET = 'other'

/**
 * La extension de un archivo como clave de analitica.
 *
 * Devuelve indefinido —no cadena vacia— cuando no hay extension propia:
 * `README` no la tiene, y `.bashrc` tampoco, porque ahi el punto abre el
 * nombre en vez de separar la extension. Distinguir «sin extension» de
 * «extension vacia» es lo que impide que un cubo sin nombre acumule las
 * dos cosas.
 */
export function getFileExtensionForAnalytics(
  filePath: string,
): string | undefined {
  const extension = extname(filePath).toLowerCase()
  if (!extension || extension === '.') return undefined
  const normalized = extension.slice(1)
  return normalized.length > MAX_EXTENSION_LENGTH ? OVERFLOW_BUCKET : normalized
}

/**
 * Nombre de tool apto para analitica. TODAS las tools con prefijo `mcp__`
 * colapsan al literal `'mcp_tool'` — el nombre del servidor MCP puede ser
 * una URL o un identificador que delata al usuario, y no debe llegar al
 * espacio de claves de analitica. Las tools incorporadas pasan tal cual.
 */
export function sanitizeToolNameForAnalytics(toolName: string): string {
  if (toolName.startsWith('mcp__')) {
    return 'mcp_tool'
  }
  return toolName
}

/** ¿Esta activo el logueo detallado de input de tool (var. de entorno OTEL_LOG_TOOL_DETAILS)? */
export function isToolDetailsLoggingEnabled(): boolean {
  return isEnvTruthy(process.env.OTEL_LOG_TOOL_DETAILS)
}

/**
 * Descompone el nombre de una tool MCP (`mcp__<servidor>__<tool>`) en sus
 * dos partes. El nombre de la tool puede traer `__` de sobra —se preserva
 * completo en `mcpToolName`, sin partir por el primero que aparezca tras
 * el servidor. `undefined` si no hay prefijo `mcp__`, o si falta el
 * servidor o la tool.
 */
export function extractMcpToolDetails(toolName: string):
  | { serverName: string; mcpToolName: string }
  | undefined {
  if (!toolName.startsWith('mcp__')) {
    return undefined
  }

  const parts = toolName.split('__')
  if (parts.length < 3) {
    return undefined
  }

  const serverName = parts[1]
  const mcpToolName = parts.slice(2).join('__')
  if (!serverName || !mcpToolName) {
    return undefined
  }

  return { serverName, mcpToolName }
}

/**
 * Version para analitica de `extractMcpToolDetails`: mapea a las claves
 * `mcpServerName`/`mcpToolName`, objeto vacio si no es una tool MCP.
 * `mcpServerType`/`mcpServerBaseUrl` se reciben y se ignoran A PROPOSITO
 * (prefijo underscore) — ninguno de los dos debe filtrarse al resultado.
 */
export function mcpToolDetailsForAnalytics(
  toolName: string,
  _mcpServerType: string | undefined,
  _mcpServerBaseUrl: string | undefined,
): { mcpServerName?: string; mcpToolName?: string } {
  const details = extractMcpToolDetails(toolName)
  if (!details) {
    return {}
  }
  return {
    mcpServerName: details.serverName,
    mcpToolName: details.mcpToolName,
  }
}

/**
 * Nombre del skill invocado, sólo para la tool `Skill` y sólo cuando su
 * input trae una clave `skill` de tipo cadena. Cualquier otra forma de
 * input, o cualquier otra tool, da `undefined`.
 */
export function extractSkillName(
  toolName: string,
  input: unknown,
): string | undefined {
  if (
    toolName === 'Skill' &&
    typeof input === 'object' &&
    input !== null &&
    'skill' in input &&
    typeof (input as { skill: unknown }).skill === 'string'
  ) {
    return (input as { skill: string }).skill
  }
  return undefined
}

/**
 * Extensiones de archivo presentes en un comando de Bash, para
 * particionar el uso de la tool Bash en analitica. `simulatedSedEditFilePath`
 * cubre el caso `sed -i` — el archivo editado no aparece como argumento
 * final del comando, así que se pasa aparte y se deduplica con los tokens.
 *
 * Heuristica de mejor esfuerzo, documentada en la fuente: los tokens se
 * parten por espacio en blanco y a cada uno se le toma su extname — un
 * token como `lodash@1.0.0` bucketiza `0` como si fuera una extensión.
 */
export function getFileExtensionsFromBashCommand(
  command: string,
  simulatedSedEditFilePath?: string,
): string | undefined {
  const extensions = new Set<string>()

  if (simulatedSedEditFilePath) {
    const ext = getFileExtensionForAnalytics(simulatedSedEditFilePath)
    if (ext) extensions.add(ext)
  }

  for (const token of command.split(/\s+/)) {
    const ext = getFileExtensionForAnalytics(token)
    if (ext) {
      extensions.add(ext)
    }
  }

  if (extensions.size === 0) {
    return undefined
  }

  return [...extensions].join(',')
}
