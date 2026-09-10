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
