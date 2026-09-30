/**
 * Atribución de commits y PRs, y el conteo de prompts de usuario.
 *
 * Procedencia: `ccnmt: packages/agent/attribution.ts`, contrastado con el
 * binario 2.1.275 (`chunk-q2gh92k2.js`: `h_n`, `MMo`, `UMo`, `BMo`, `$Mo`,
 * `NMo`, `DMo`). Se reproduce el contrato, no el cuerpo.
 *
 * - `buildAttributionTexts` (`MMo`): `Co-Authored-By: <modelo>` y el pie de
 *   PR; `settings.attribution` sustituye cada campo por separado, y
 *   `includeCoAuthoredBy: false` deja los dos vacíos.
 * - `getEnhancedPRAttribution` (`UMo`): el pie enriquecido con el porcentaje
 *   de caracteres de Claude, los prompts desde la última compactación y las
 *   lecturas de memoria —`F (87% 3-shotted by <modelo>, 1 memory recalled)`—;
 *   sin datos, el pie tal cual. Un dato que falla cuenta como ausente: la
 *   atribución nunca rompe el comando que la pide.
 *
 * Divergencias declaradas:
 * - `getAttributionTexts` es SÍNCRONO, como en la referencia y como lo llaman
 *   los consumidores de este árbol; en 2.1.275 es asíncrono porque además
 *   agrega la línea `Claude-Session:` de una sesión remota. Esa línea no se
 *   compone aquí: exige el constructor de URL de sesión remota, que este árbol
 *   no tiene. Sucesor: TASK-THYROX-0250.
 * - El nombre del modelo usa el nombre público cuando se conoce, `Claude` para
 *   la familia fable y `Claude Code` en otro caso: es la forma de `OMo` sin
 *   las ramas de proveedores de terceros.
 * - `settings.attribution.pr` gana aunque sea la cadena vacía, igual que en el
 *   binario (`!== void 0`).
 */
import { getInitialSettings } from '@thyrox/config/settings'
import { getMainLoopModel, getPublicModelDisplayName } from '@thyrox/provider/model.js'
import { calculateCommitAttribution, getAttributionRepoRoot, isInternalModelRepoCached, sanitizeModelName } from './commitAttribution.js'

/** El pie de PR por defecto (`h_n` sin el sufijo de superficie, que va tras bandera). */
export const PR_FOOTER = '\u{1F916} Generated with [Claude Code](https://claude.com/claude-code)'

export type AttributionTexts = { commit: string; pr: string }

/** La parte de los settings que gobierna la atribución. */
export type AttributionSettings = {
  attribution?: { commit?: string; pr?: string }
  includeCoAuthoredBy?: false
}

/** El nombre del modelo en la línea `Co-Authored-By`. */
export function attributionModelName(model: string): string {
  if (model.includes('claude-fable-')) return 'Claude'
  return getPublicModelDisplayName(model) ?? 'Claude Code'
}

/** Los textos de atribución para unos settings y un nombre de modelo ya resuelto. */
export function buildAttributionTexts(settings: AttributionSettings, modelName: string): AttributionTexts {
  const commit = `Co-Authored-By: ${modelName} <noreply@anthropic.com>`
  if (settings.attribution !== undefined) {
    return { commit: settings.attribution.commit ?? commit, pr: settings.attribution.pr ?? PR_FOOTER }
  }
  if (settings.includeCoAuthoredBy === false) return { commit: '', pr: '' }
  return { commit, pr: PR_FOOTER }
}

/** Los textos de atribución de esta sesión: settings reales y modelo del bucle principal. */
export function getAttributionTexts(): AttributionTexts {
  return buildAttributionTexts(getInitialSettings() as AttributionSettings, attributionModelName(getMainLoopModel()))
}

/** El pie enriquecido; sin ningún dato, el pie tal cual. */
export function formatEnhancedPRAttribution({
  footer,
  claudePercent,
  promptCount,
  memoryAccessCount,
  model,
}: {
  footer: string
  claudePercent: number
  promptCount: number
  memoryAccessCount: number
  model: string
}): string {
  if (claudePercent === 0 && promptCount === 0 && memoryAccessCount === 0) return footer
  const memories = memoryAccessCount > 0 ? `, ${memoryAccessCount} ${memoryAccessCount === 1 ? 'memory' : 'memories'} recalled` : ''
  return `${footer} (${claudePercent}% ${promptCount}-shotted by ${model}${memories})`
}

type TranscriptEntry = {
  type?: string
  subtype?: string
  isSidechain?: boolean
  isMeta?: boolean
  isCompactSummary?: boolean
  message?: { content?: unknown }
}

/** Las herramientas cuyas llamadas cuentan como acceso a memoria (`FMo`). */
const MEMORY_ACCESS_TOOLS = new Set(['Read', 'Edit', 'Write', 'memory_read', 'memory_write'])

/** La ruta que toca una llamada de herramienta, o `null` (`f_n`). */
function toolTargetPath(name: string, input: Record<string, unknown>): string | null {
  if (name === 'memory_read' || name === 'memory_write') {
    // En el binario sólo el almacén personal resuelve a una ruta de memoria.
    return input.store === 'personal' && typeof input.path === 'string' ? `memory:${input.path}` : null
  }
  return typeof input.file_path === 'string' ? input.file_path : null
}

/** Llamadas de herramienta que leen o escriben un archivo de memoria (`$Mo`). */
export function countMemoryAccesses(entries: ReadonlyArray<TranscriptEntry>, isMemoryPath: (path: string) => boolean): number {
  let count = 0
  for (const entry of entries) {
    if (entry.type !== 'assistant') continue
    const content = entry.message?.content
    if (!Array.isArray(content)) continue
    for (const block of content as { type?: string; name?: string; input?: Record<string, unknown> }[]) {
      if (block?.type !== 'tool_use' || !block.name || !MEMORY_ACCESS_TOOLS.has(block.name)) continue
      const target = toolTargetPath(block.name, block.input ?? {})
      if (target !== null && (target.startsWith('memory:') || isMemoryPath(target))) count++
    }
  }
  return count
}

/** Prompts y accesos a memoria posteriores a la última frontera de compactación (`BMo`). */
export function countSinceLastCompaction(
  entries: ReadonlyArray<TranscriptEntry>,
  isMemoryPath: (path: string) => boolean,
): { promptCount: number; memoryAccessCount: number } {
  const boundary = entries.findLastIndex(e => e.type === 'system' && e.subtype === 'compact_boundary')
  const tail = boundary >= 0 ? entries.slice(boundary + 1) : entries
  const prompts = tail.filter(e => e.type === 'user' && !e.isSidechain && !e.isMeta && !e.isCompactSummary)
  return {
    promptCount: countUserPromptsInMessages(prompts as { type: string; message?: { content?: unknown } }[]),
    memoryAccessCount: countMemoryAccesses(tail, isMemoryPath),
  }
}

/** Las fuentes de `getEnhancedPRAttribution`; los tests las sustituyen. */
export type EnhancedAttributionDeps = {
  settings: () => AttributionSettings
  claudePercent: (appState: { attribution?: unknown }) => Promise<number | null>
  transcriptEntries: () => Promise<TranscriptEntry[]>
  isMemoryPath: (path: string) => boolean
  model: () => string
}

/** El porcentaje de Claude sobre los archivos que la sesión tocó (`LMo`). */
async function sessionClaudePercent(appState: { attribution?: unknown }): Promise<number | null> {
  const state = appState.attribution as { fileStates?: Map<string, unknown> | Record<string, unknown> } | undefined
  if (!state?.fileStates) return null
  const files = state.fileStates instanceof Map ? Array.from(state.fileStates.keys()) : Object.keys(state.fileStates)
  if (files.length === 0 || !getAttributionRepoRoot()) return null
  const data = await calculateCommitAttribution([state as never], files)
  return data.summary.claudePercent
}

/** Las fuentes reales. Cargan sus módulos al pedirlas, no al importar éste. */
export async function productionAttributionDeps(): Promise<EnhancedAttributionDeps> {
  const [{ getTranscriptPath }, { memoryScopeForPath }] = await Promise.all([
    import('@thyrox/storage/sessionStorage.js'),
    import('@thyrox/memory/memoryFileDetection'),
  ])
  return {
    settings: () => getInitialSettings() as AttributionSettings,
    claudePercent: sessionClaudePercent,
    transcriptEntries: async () => {
      const text = await Bun.file(getTranscriptPath()).text()
      const entries: TranscriptEntry[] = []
      for (const line of text.split('\n')) {
        if (!line.trim()) continue
        try {
          entries.push(JSON.parse(line))
        } catch {
          // Una línea truncada (la sesión sigue escribiendo) no invalida el resto.
        }
      }
      return entries
    },
    isMemoryPath: path => memoryScopeForPath(path) !== null,
    model: () => {
      const model = getMainLoopModel()
      return isInternalModelRepoCached() ? model : sanitizeModelName(model)
    },
  }
}

/** El pie de PR enriquecido de esta sesión (`UMo`). */
export async function getEnhancedPRAttribution(
  getAppState: () => { attribution?: unknown },
  deps?: EnhancedAttributionDeps,
): Promise<string> {
  const d = deps ?? (await productionAttributionDeps())
  const settings = d.settings()
  if (settings.attribution?.pr !== undefined) return settings.attribution.pr
  if (settings.includeCoAuthoredBy === false) return ''
  const [claudePercent, counts] = await Promise.all([
    d.claudePercent(getAppState()).catch(() => null),
    d.transcriptEntries().then(
      entries => countSinceLastCompaction(entries, d.isMemoryPath),
      () => ({ promptCount: 0, memoryAccessCount: 0 }),
    ),
  ])
  return formatEnhancedPRAttribution({
    footer: PR_FOOTER,
    claudePercent: claudePercent ?? 0,
    promptCount: counts.promptCount,
    memoryAccessCount: counts.memoryAccessCount,
    model: d.model(),
  })
}


/** Copiado de `ccnmt: packages/command-runtime/src/xml.ts` (BASH_INPUT_TAG..LOCAL_COMMAND_CAVEAT_TAG). */
const TERMINAL_OUTPUT_TAGS = [
  'bash-input',
  'bash-stdout',
  'bash-stderr',
  'local-command-stdout',
  'local-command-stderr',
  'local-command-caveat',
] as const

/**
 * Verifica si una cadena de contenido de mensaje es salida de terminal en
 * vez de un prompt de usuario.
 * La salida de terminal incluye etiquetas de entrada/salida de bash y
 * mensajes caveat sobre comandos locales.
 */
function isTerminalOutput(content: string): boolean {
  for (const tag of TERMINAL_OUTPUT_TAGS) {
    if (content.includes(`<${tag}>`)) {
      return true
    }
  }
  return false
}

/**
 * Cuenta los mensajes de usuario con contenido de texto visible en una
 * lista de mensajes no-sidechain. Excluye bloques tool_result, salida de
 * terminal y mensajes vacios.
 *
 * Quien llame debe pasar mensajes ya filtrados para excluir los sidechain.
 */
export function countUserPromptsInMessages(
  messages: ReadonlyArray<{ type: string; message?: { content?: unknown } }>,
): number {
  let count = 0

  for (const message of messages) {
    if (message.type !== 'user') {
      continue
    }

    const content = message.message?.content
    if (!content) {
      continue
    }

    let hasUserText = false

    if (typeof content === 'string') {
      if (isTerminalOutput(content)) {
        continue
      }
      hasUserText = content.trim().length > 0
    } else if (Array.isArray(content)) {
      hasUserText = content.some(block => {
        if (!block || typeof block !== 'object' || !('type' in block)) {
          return false
        }
        return (
          (block.type === 'text' &&
            typeof block.text === 'string' &&
            !isTerminalOutput(block.text)) ||
          block.type === 'image' ||
          block.type === 'document'
        )
      })
    }

    if (hasUserText) {
      count++
    }
  }

  return count
}
