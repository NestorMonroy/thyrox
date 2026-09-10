/**
 * Puerto de `ccnmt: packages/memory/src/findRelevantMemories.ts` (verbatim).
 */
import { feature } from 'bun:bundle'
import { getMemoryHostBindings } from './host.js'
import { errorMessage, jsonParse } from './internalUtils.js'
import type { MemoryFileHeader } from './contracts.js'

export type RelevantMemory = {
  path: string
  mtimeMs: number
}

const SELECT_MEMORIES_SYSTEM_PROMPT = `You are selecting memories that will be useful to Claude Code as it processes a user's query. You will be given the user's query and a list of available memory files with their filenames and descriptions.

Return a list of filenames for the memories that will clearly be useful to Claude Code as it processes the user's query (up to 5). Only include memories that you are certain will be helpful based on their name and description.
- If you are unsure if a memory will be useful in processing the user's query, then do not include it in your list. Be selective and discerning.
- If there are no memories in the list that would clearly be useful, feel free to return an empty list.
- If a list of recently-used tools is provided, do not select memories that are usage reference or API documentation for those tools (Claude Code is already exercising them). DO still select memories containing warnings, gotchas, or known issues about those tools — active use is exactly when those matter.
`

/**
 * Encuentra archivos de memoria relevantes a una query, escaneando los
 * encabezados de archivo de memoria y pidiéndole a Sonnet que seleccione
 * los más relevantes.
 *
 * Devuelve rutas de archivo absolutas + mtime de las memorias más
 * relevantes (hasta 5). Excluye MEMORY.md (ya cargado en el prompt de
 * sistema). El mtime se pasa a través para que los llamadores puedan
 * mostrar frescura al modelo principal sin un segundo stat.
 *
 * `alreadySurfaced` filtra rutas mostradas en turnos anteriores antes de
 * la llamada a Sonnet, así que el selector gasta su presupuesto de 5
 * slots en candidatos frescos en vez de re-elegir archivos que el
 * llamador descartaría.
 */
export async function findRelevantMemories(
  query: string,
  memoryDir: string,
  signal: AbortSignal,
  recentTools: readonly string[] = [],
  alreadySurfaced: ReadonlySet<string> = new Set(),
): Promise<RelevantMemory[]> {
  const bindings = getMemoryHostBindings()
  const allMemories = await (bindings.scanMemoryFiles?.(memoryDir, signal) ?? Promise.resolve([]))
  const memories = allMemories.filter(
    m => !alreadySurfaced.has(m.filePath),
  )
  if (memories.length === 0) {
    return []
  }

  const selectedFilenames = await selectRelevantMemories(
    query,
    memories,
    signal,
    recentTools,
  )
  const byFilename = new Map(memories.map(m => [m.filename, m]))
  const selected = selectedFilenames
    .map(filename => byFilename.get(filename))
    .filter((m): m is MemoryFileHeader => m !== undefined)

  // Dispara incluso con selección vacía: la tasa de selección necesita el
  // denominador, y las edades -1 distinguen "corrió, no eligió nada" de
  // "nunca corrió".
  if (feature('MEMORY_SHAPE_TELEMETRY')) {
    bindings.reportMemoryShapeTelemetry?.(memories, selected)
  }

  return selected.map(m => ({ path: m.filePath, mtimeMs: m.mtimeMs }))
}

async function selectRelevantMemories(
  query: string,
  memories: MemoryFileHeader[],
  signal: AbortSignal,
  recentTools: readonly string[],
): Promise<string[]> {
  const bindings = getMemoryHostBindings()
  const validFilenames = new Set(memories.map(m => m.filename))

  const manifest = bindings.formatMemoryManifest?.(memories) ?? ''

  const toolsSection =
    recentTools.length > 0
      ? `\n\nRecently used tools: ${recentTools.join(', ')}`
      : ''

  try {
    const result = await bindings.sideQuery?.({
      model: bindings.getDefaultSonnetModel?.() ?? 'claude-sonnet-4-5',
      system: SELECT_MEMORIES_SYSTEM_PROMPT,
      skipSystemPromptPrefix: true,
      messages: [
        {
          role: 'user',
          content: `Query: ${query}\n\nAvailable memories:\n${manifest}${toolsSection}`,
        },
      ],
      max_tokens: 256,
      output_format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            selected_memories: { type: 'array', items: { type: 'string' } },
          },
          required: ['selected_memories'],
          additionalProperties: false,
        },
      },
      signal,
      querySource: 'memdir_relevance',
    })

    if (!result) return []
    const textBlock = result.content.find(block => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return []
    }

    const parsed: { selected_memories: string[] } = jsonParse(textBlock.text ?? '')
    return parsed.selected_memories.filter(f => validFilenames.has(f))
  } catch (e) {
    if (signal.aborted) {
      return []
    }
    bindings.logDebug?.(
      `[memdir] selectRelevantMemories failed: ${errorMessage(e)}`,
      { level: 'warn' },
    )
    return []
  }
}
