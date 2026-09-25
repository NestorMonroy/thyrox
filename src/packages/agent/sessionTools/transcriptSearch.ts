import type { RenderableMessage } from '@thyrox/repl/replTypes/message.js'
import { INTERRUPT_MESSAGE } from '../messages.js'
import { INTERRUPT_MESSAGE_FOR_TOOL_USE } from '../messages.js'
/**
 * Porte PARCIAL de `ccnmt: packages/agent/sessionTools/transcriptSearch.ts`,
 * acotado a `toolUseSearchText` y `toolResultSearchText`.
 *
 * DIVERGENCIA DE ALCANCE, declarada. La fuente ademas define
 * `renderableSearchText`/`computeSearchText`, que recorren un
 * `RenderableMessage` (`@claude-code-how-works/repl/replTypes/message.js`)
 * y filtran `<system-reminder>` + los mensajes de interrupcion
 * (`INTERRUPT_MESSAGE*` de `../messages.js`). Ninguno de esos dos tipos
 * vive en este arbol, y no se portan aqui — no tienen consumidor en
 * `thyrox` todavia y su porte fiel exigiria ademas portar el REPL entero.
 *
 * Las dos funciones portadas SI son puras y autocontenidas: reciben
 * `unknown` y hacen duck-typing por nombre de campo (allowlist), sin
 * depender de ningun tipo del monorepo de origen.
 */

/** Recorrido de despliegue de invocacion de herramienta: `renderToolUseMessage`
 *  muestra campos de entrada como `command` (Bash), `pattern` (Grep),
 *  `file_path` (Read/Edit), `prompt` (Agent). Misma estrategia de duck-type
 *  que `toolResultSearchText` — nombres de campo conocidos, desconocido →
 *  vacio. Sub-conteo > fantasma. */
export function toolUseSearchText(input: unknown): string {
  if (!input || typeof input !== 'object') return ''
  const o = input as Record<string, unknown>
  const parts: string[] = []
  // renderToolUseMessage tipicamente muestra uno o dos de estos como el
  // argumento primario. tool_name en si va en el chrome "⏺ Bash(...)",
  // cubierto por sub-conteo (el overlay lo coincide pero aqui no se cuenta).
  for (const k of [
    'command',
    'pattern',
    'file_path',
    'path',
    'prompt',
    'description',
    'query',
    'url',
    'skill', // SkillTool
  ]) {
    const v = o[k]
    if (typeof v === 'string') parts.push(v)
  }
  // args[] (Tmux/TungstenTool), files[] (SendUserFile) — tool-use
  // renderiza el arreglo concatenado como despliegue primario. Sub-conteo
  // > omitir.
  for (const k of ['args', 'files']) {
    const v = o[k]
    if (Array.isArray(v) && v.every(x => typeof x === 'string')) {
      parts.push((v as string[]).join(' '))
    }
  }
  return parts.join('\n')
}

/** Duck-type del `Out` nativo de la herramienta para texto buscable.
 *  Formas conocidas: {stdout,stderr} (Bash/Shell), {content} (Grep),
 *  {file:{content}} (Read), {filenames:[]} (Grep/Glob), {output}
 *  (generico). Cae a concatenar todos los campos string de primer nivel —
 *  tosco pero mejor que indexar chatter del modelo. Vacio para formas
 *  desconocidas: sub-conteo > fantasma. */
export function toolResultSearchText(r: unknown): string {
  if (!r || typeof r !== 'object') return typeof r === 'string' ? r : ''
  const o = r as Record<string, unknown>
  // Formas conocidas primero (herramientas comunes).
  if (typeof o.stdout === 'string') {
    const err = typeof o.stderr === 'string' ? o.stderr : ''
    return o.stdout + (err ? '\n' + err : '')
  }
  if (
    o.file &&
    typeof o.file === 'object' &&
    typeof (o.file as { content?: unknown }).content === 'string'
  ) {
    return (o.file as { content: string }).content
  }
  // Solo nombres de campo de salida conocidos. Un recorrido ciego
  // indexaria metadata que la UI no muestra (rawOutputPath,
  // backgroundTaskId, filePath, durationMs-como-string). Allowlist de
  // los campos que las herramientas realmente renderizan. Herramientas
  // que no calzan con ninguna forma indexan vacio — agregarlas aqui al
  // encontrarlas.
  const parts: string[] = []
  for (const k of ['content', 'output', 'result', 'text', 'message']) {
    const v = o[k]
    if (typeof v === 'string') parts.push(v)
  }
  for (const k of ['filenames', 'lines', 'results']) {
    const v = o[k]
    if (Array.isArray(v) && v.every(x => typeof x === 'string')) {
      parts.push((v as string[]).join('\n'))
    }
  }
  return parts.join('\n')
}

const SYSTEM_REMINDER_CLOSE = '</system-reminder>'
// UserTextMessage.tsx:~84 replaces these with <InterruptedByUser />
// (renders 'Interrupted · /issue...'). Raw text never appears on screen;
// searching it yields phantom matches — /terr → in[terr]upted.
const RENDERED_AS_SENTINEL = new Set([
  INTERRUPT_MESSAGE,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
])
const searchTextCache = new WeakMap<RenderableMessage, string>()
/** Flatten a RenderableMessage to lowercased searchable text. WeakMap-
 *  cached — messages are append-only and immutable so a hit is always
 *  valid. Lowercased at cache time: the only caller immediately
 *  .toLowerCase()d the result, re-lowering ~1.5MB on every keystroke
 *  (the backspace hang). Returns '' for non-searchable types. */
export function renderableSearchText(msg: RenderableMessage): string {
  const cached = searchTextCache.get(msg)
  if (cached !== undefined) return cached
  const result = computeSearchText(msg).toLowerCase()
  searchTextCache.set(msg, result)
  return result
}
function computeSearchText(msg: RenderableMessage): string {
  let raw = ''
  switch (msg.type) {
    case 'user': {
      const c = msg.message.content
      if (typeof c === 'string') {
        raw = RENDERED_AS_SENTINEL.has(c) ? '' : c
      } else {
        const parts: string[] = []
        for (const b of c) {
          if (b.type === 'text') {
            if (!RENDERED_AS_SENTINEL.has(b.text)) parts.push(b.text)
          } else if (b.type === 'tool_result') {
            // b.content is the MODEL-facing serialization (from each tool's
            // mapToolResultToToolResultBlockParam) — adds system-reminders,
            // <persisted-output> wrappers, backgroundInfo strings. The UI
            // renders msg.toolUseResult (the tool's native Out) via
            // renderToolResultMessage — DIFFERENT text. Indexing b.content
            // yields phantoms: /background → matches the model-only ID
            // string, none render.
            //
            // Duck-type the native Out instead. Covers the common shapes:
            // Bash {stdout,stderr}, Grep {content,filenames}, Read
            // {file.content}. Unknown shapes index empty — under-count is
            // honest, phantom is a lie. Proper fix is per-tool
            // extractSearchText(Out) on the Tool interface (TODO).
            parts.push(toolResultSearchText(msg.toolUseResult))
          }
        }
        raw = parts.join('\n')
      }
      break
    }
    case 'assistant': {
      const c = msg.message.content
      if (Array.isArray(c)) {
        // text blocks + tool_use inputs. tool_use renders as "⏺ Bash(cmd)"
        // — the command/pattern/path is visible and searchable-expected.
        // Skip thinking (hidden by hidePastThinking in transcript mount).
        raw = c
          .flatMap(b => {
            if (b.type === 'text') return [b.text]
            if (b.type === 'tool_use') return [toolUseSearchText(b.input)]
            return []
          })
          .join('\n')
      }
      break
    }
    case 'attachment': {
      // relevant_memories renders full m.content in transcript mode
      // (AttachmentMessage.tsx <Ansi>{m.content}</Ansi>). Visible but
      // unsearchable without this — [ dump finds it, / doesn't.
      if (msg.attachment.type === 'relevant_memories') {
        raw = msg.attachment.memories.map(m => m.content).join('\n')
      } else if (
        // Mid-turn prompts — queued while an agent is running. Render via
        // UserTextMessage (AttachmentMessage.tsx:~348). stickyPromptText
        // (VirtualMessageList.tsx:~103) has the same guards — mirror here.
        msg.attachment.type === 'queued_command' &&
        msg.attachment.commandMode !== 'task-notification' &&
        !msg.attachment.isMeta
      ) {
        const p = msg.attachment.prompt
        raw =
          typeof p === 'string'
            ? p
            : (p as Array<{ type: string; text?: string }>)
                .flatMap(b => (b.type === 'text' && b.text ? [b.text] : []))
                .join('\n')
      }
      break
    }
    case 'collapsed_read_search': {
      // relevant_memories attachments are absorbed into collapse groups
      // (collapseReadSearch.ts); their content is visible in transcript mode
      // via CollapsedReadSearchContent, so mirror it here for / search.
      if (msg.relevantMemories) {
        raw = msg.relevantMemories.map(m => m.content).join('\n')
      }
      break
    }
    default:
      // grouped_tool_use, system — no text content
      break
  }
  // Strip <system-reminder> anywhere — Claude context, not user-visible.
  // Mid-message on cc -c resumes (memory reminders between prompt lines).
  let t = raw
  let open = t.indexOf('<system-reminder>')
  while (open >= 0) {
    const close = t.indexOf(SYSTEM_REMINDER_CLOSE, open)
    if (close < 0) break
    t = t.slice(0, open) + t.slice(close + SYSTEM_REMINDER_CLOSE.length)
    open = t.indexOf('<system-reminder>')
  }
  return t
}
