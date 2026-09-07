// Los tipos de highlight.js llevan `/// <reference lib="dom" />`.
// SSETransport, mcp/client, ssh, dumpPrompts usan tipos DOM
// (TextDecodeOptions, RequestInfo) que solo tipan porque el
// `typeof import('highlight.js')` de este archivo trae lib.dom. El
// tsconfig aqui declara lib: ["ESNext"] solamente — arreglar las
// dependencias de tipos DOM de verdad es un barrido aparte; esta
// referencia preserva el status quo.
//
// Puerto de `ccnmt: packages/output/src/utils/cliHighlight.ts` (verbatim
// en logica). Declara `cli-highlight` y `highlight.js` como dependencias
// propias de este paquete (ambos npm publico, versiones fieles a la raiz
// de ccnmt).
/// <reference lib="dom" />

import { extname } from 'path'

export type CliHighlight = {
  highlight: typeof import('cli-highlight').highlight
  supportsLanguage: typeof import('cli-highlight').supportsLanguage
}

// Una sola promesa compartida por Fallback.tsx, markdown.ts, events.ts,
// getLanguageName. El import de highlight.js va a cuestas: cli-highlight
// ya lo metio en el cache de modulos, asi que el segundo import() es un
// cache hit — sin bytes extra cargados.
let cliHighlightPromise: Promise<CliHighlight | null> | undefined

let loadedGetLanguage: ((name: string) => { name: string } | undefined) | undefined

async function loadCliHighlight(): Promise<CliHighlight | null> {
  try {
    const cliHighlight = await import('cli-highlight')
    // cache hit — cli-highlight ya cargo highlight.js
    const highlightJs = await import('highlight.js')
    loadedGetLanguage = (highlightJs as { getLanguage?: typeof loadedGetLanguage }).getLanguage
    return {
      highlight: cliHighlight.highlight,
      supportsLanguage: cliHighlight.supportsLanguage,
    }
  } catch {
    return null
  }
}

export function getCliHighlightPromise(): Promise<CliHighlight | null> {
  cliHighlightPromise ??= loadCliHighlight()
  return cliHighlightPromise
}

/**
 * p. ej. "foo/bar.ts" → "TypeScript". Espera la carga compartida de
 * cli-highlight, luego lee el registro de idiomas de highlight.js. Todos
 * los llamadores son de telemetria (atributos de contador OTel, eventos
 * unarios del dialogo de permiso) — ninguno bloquea en esto, disparan y
 * olvidan o el consumidor ya maneja Promise<string>.
 */
export async function getLanguageName(file_path: string): Promise<string> {
  await getCliHighlightPromise()
  const ext = extname(file_path).slice(1)
  if (!ext) return 'unknown'
  return loadedGetLanguage?.(ext)?.name ?? 'unknown'
}
