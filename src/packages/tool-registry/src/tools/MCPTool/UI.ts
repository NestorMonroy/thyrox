/**
 * Puerto de `ccnmt: packages/tool-registry/src/tools/MCPTool/UI.tsx`
 * (TASK #232). Renombrado de `.tsx` a `.ts`: la fuente mezclaba lógica
 * pura con componentes Ink/React en el mismo archivo; aquí sólo sobrevive
 * la primera.
 *
 * Cobertura DECLARADA: 4 de 6 exports portados en forma funcional
 * (`renderToolUseMessage`, `tryFlattenJson`, `tryUnwrapTextPayload`,
 * `trySlackSendCompact`), más el helper interno `parseJsonEntries` del que
 * los tres últimos dependen.
 *
 * BLOQUEADOS (2): `renderToolUseProgressMessage` y `renderToolResultMessage`
 * — la fuente renderiza `<MessageResponse>`/`<Box>`/`<Text>`/`<Ansi>`/
 * `<ProgressBar>` de `@anthropic/ink` y `@claude-code-how-works/repl/
 * components/*`, y el componente interno `MCPTextOutput` (no exportado,
 * también JSX) que ninguna de las dos funciones portadas necesita. Ninguno
 * de esos tres módulos existe en este árbol (medido: sin
 * `node_modules/react`, `@thyrox/repl` ausente). El módulo carga sin
 * fallar — invocarlas dispara el error. Mismo patrón que
 * `@thyrox/voice: src/hooks/useVoiceIntegration.tsx`.
 *
 * `createHyperlink` (de `@claude-code-how-works/output/hyperlink.js`) y
 * `formatNumber` (de `.../output/formatters`) sólo los usa
 * `renderToolResultMessage` — al quedar ese bloqueado, tampoco hacen falta
 * aquí; no se sustituyen.
 */
import type { z } from 'zod/v4'
import type { ReactNodeLike } from '../../Tool.js'
import type { ProgressMessage } from '@thyrox/agent/messageShapes'
import type { MCPProgress } from '../../progressTypes.js'
import type { ToolProgressData } from '../../Tool.js'
import type { MCPToolResult } from '@thyrox/mcp-runtime/mcpValidation.js'
import { jsonParse, jsonStringify } from '@thyrox/local-observability/slowOperations.js'
import type { inputSchema } from './MCPTool.js'
import { feature } from '../../internal/pendingCrossPackageDeps.js'

// Umbral para mostrar la advertencia de respuestas MCP grandes.
const MCP_OUTPUT_WARNING_THRESHOLD_TOKENS = 10_000

// En modo no-verbose, trunca los valores de entrada individuales para
// mantener la cabecera compacta. Sigue la filosofía de BashTool: mostrar
// lo suficiente para identificar la llamada sin volcar el payload entero.
const MAX_INPUT_VALUE_CHARS = 80

// Máximo de claves de primer nivel antes de caer a la vista JSON cruda.
// Más allá de esto, una lista plana k:v es más ruido que ayuda.
const MAX_FLAT_JSON_KEYS = 12

// No intentar el parseo de objeto plano para blobs grandes.
const MAX_FLAT_JSON_CHARS = 5_000

// No intentar parsear blobs JSON más grandes que esto (seguridad de rendimiento).
const MAX_JSON_PARSE_CHARS = 200_000

// Un valor string es "payload de texto dominante" si tiene saltos de
// línea o es lo bastante largo como para que mostrarlo inline sea peor
// que desenvolverlo.
const UNWRAP_MIN_STRING_LEN = 200

export function renderToolUseMessage(
  input: z.infer<ReturnType<typeof inputSchema>>,
  { verbose }: { verbose: boolean },
): ReactNodeLike {
  if (Object.keys(input).length === 0) {
    return ''
  }
  return Object.entries(input)
    .map(([key, value]) => {
      let rendered = jsonStringify(value)
      if (
        feature('MCP_RICH_OUTPUT') &&
        !verbose &&
        rendered.length > MAX_INPUT_VALUE_CHARS
      ) {
        rendered = rendered.slice(0, MAX_INPUT_VALUE_CHARS).trimEnd() + '…'
      }
      return `${key}: ${rendered}`
    })
    .join(', ')
}

/**
 * NO PORTADO — ver docstring del módulo.
 */
export function renderToolUseProgressMessage(
  _progressMessagesForMessage: ProgressMessage<MCPProgress>[],
): ReactNodeLike {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react')
  throw new Error(
    'renderToolUseProgressMessage() no está portado: renderiza ' +
      '<MessageResponse>/<Box>/<Text>/<ProgressBar> de @anthropic/ink y ' +
      '@thyrox/repl, ninguno presente en este árbol. Ver el docstring de ' +
      'MCPTool/UI.ts.',
  )
}

/**
 * NO PORTADO — ver docstring del módulo.
 */
export function renderToolResultMessage(
  _output: string | MCPToolResult,
  _progressMessagesForMessage: ProgressMessage<ToolProgressData>[],
  _options: { verbose: boolean; input?: unknown },
): ReactNodeLike {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react')
  throw new Error(
    'renderToolResultMessage() no está portado: renderiza ' +
      '<MessageResponse>/<Box>/<Text>/<Ansi>/<MCPTextOutput> de ' +
      '@anthropic/ink y @thyrox/repl (más createHyperlink/formatNumber de ' +
      '@thyrox/output, tampoco presentes), ninguno en este árbol. Ver el ' +
      'docstring de MCPTool/UI.ts.',
  )
}

/**
 * Parsea el contenido como un objeto JSON y devuelve sus entradas. Null si
 * el contenido no parsea, no es un objeto, es demasiado grande, o tiene
 * 0 o demasiadas claves.
 */
function parseJsonEntries(
  content: string,
  { maxChars, maxKeys }: { maxChars: number; maxKeys: number },
): [string, unknown][] | null {
  const trimmed = content.trim()
  if (trimmed.length === 0 || trimmed.length > maxChars || trimmed[0] !== '{') {
    return null
  }
  let parsed: unknown
  try {
    parsed = jsonParse(trimmed)
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }
  const entries = Object.entries(parsed)
  if (entries.length === 0 || entries.length > maxKeys) {
    return null
  }
  return entries
}

/**
 * Si el contenido parsea como un objeto JSON donde cada valor es un
 * escalar o un objeto anidado pequeño, lo aplana a pares [clave,
 * valorMostrado]. Los objetos anidados se vuelven JSON de una línea.
 * Devuelve null si el contenido no califica.
 */
export function tryFlattenJson(content: string): [string, string][] | null {
  const entries = parseJsonEntries(content, {
    maxChars: MAX_FLAT_JSON_CHARS,
    maxKeys: MAX_FLAT_JSON_KEYS,
  })
  if (entries === null) return null
  const result: [string, string][] = []
  for (const [key, value] of entries) {
    if (typeof value === 'string') {
      result.push([key, value])
    } else if (
      value === null ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      result.push([key, String(value)])
    } else if (typeof value === 'object') {
      const compact = jsonStringify(value)
      if (compact.length > 120) return null
      result.push([key, compact])
    } else {
      return null
    }
  }
  return result
}

/**
 * Si el contenido es un objeto JSON donde una clave guarda un payload de
 * texto dominante (multi-línea o largo) y todas las demás son escalares
 * pequeños, lo desenvuelve. Cubre el patrón MCP común de
 * {"messages":"line1\nline2..."} donde el pretty-print deja el \n
 * escapado pero se quieren saltos de línea reales + truncado.
 */
export function tryUnwrapTextPayload(
  content: string,
): { body: string; extras: [string, string][] } | null {
  const entries = parseJsonEntries(content, {
    maxChars: MAX_JSON_PARSE_CHARS,
    maxKeys: 4,
  })
  if (entries === null) return null
  // Encuentra el único payload de texto dominante. Recorta primero: un \n
  // final en un vecino corto (p. ej. pistas de paginación) no debe
  // hacerlo "dominante".
  let body: string | null = null
  const extras: [string, string][] = []
  for (const [key, value] of entries) {
    if (typeof value === 'string') {
      const t = value.trimEnd()
      const isDominant =
        t.length > UNWRAP_MIN_STRING_LEN || (t.includes('\n') && t.length > 50)
      if (isDominant) {
        if (body !== null) return null // dos strings grandes — ambiguo
        body = t
        continue
      }
      if (t.length > 150) return null
      extras.push([key, t.replace(/\s+/g, ' ')])
    } else if (
      value === null ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      extras.push([key, String(value)])
    } else {
      return null // objeto/arreglo anidado — usa el camino flat o pretty-print
    }
  }
  if (body === null) return null
  return { body, extras }
}

const SLACK_ARCHIVES_RE =
  /^https:\/\/[a-z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p\d+$/

/**
 * Detecta un resultado de envío de mensaje a Slack y devuelve un par
 * compacto {channel, url}. Cubre tanto la forma hosted (Slack de claude.ai)
 * como la de servidor MCP de la comunidad — ambas devuelven `message_link`
 * en el resultado. La etiqueta del canal prefiere la entrada de la
 * herramienta (puede ser un nombre como "#foo" o un ID como
 * "C09EVDAN1NK") y cae al ID parseado de la URL de archivos.
 */
export function trySlackSendCompact(
  output: string | MCPToolResult,
  input: unknown,
): { channel: string; url: string } | null {
  let text: unknown = output
  if (Array.isArray(output)) {
    const block = output.find(b => b.type === 'text')
    text = block && 'text' in block ? block.text : undefined
  }
  if (typeof text !== 'string' || !text.includes('"message_link"')) {
    return null
  }

  const entries = parseJsonEntries(text, { maxChars: 2000, maxKeys: 6 })
  const url = entries?.find(([k]) => k === 'message_link')?.[1]
  if (typeof url !== 'string') return null
  const m = SLACK_ARCHIVES_RE.exec(url)
  if (!m) return null

  const inp = input as { channel_id?: unknown; channel?: unknown } | undefined
  const raw = inp?.channel_id ?? inp?.channel ?? m[1]
  const label = typeof raw === 'string' && raw ? raw : 'slack'
  return { channel: label.startsWith('#') ? label : `#${label}`, url }
}
