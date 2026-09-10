/**
 * Puerto de `ccnmt: packages/tool-registry/src/tools/ListMcpResourcesTool/UI.tsx`
 * (TASK #232). Renombrado de `.tsx` a `.ts`: no queda JSX real en este
 * árbol.
 *
 * Cobertura DECLARADA: 1 de 2 exports portado en forma funcional.
 *
 * - `renderToolUseMessage` — puerto FIEL y COMPLETO (no usa React/Ink en
 *   la fuente; sólo arma un string).
 * - `renderToolResultMessage` — BLOQUEADO. La fuente renderiza
 *   `<MessageResponse>`/`<Text>`/`<OutputLine>` de
 *   `@claude-code-how-works/repl/components/*` y `@anthropic/ink`, y
 *   ninguno de los tres existe en este árbol (medido: sin
 *   `node_modules/react` en este paquete, `@thyrox/repl` ausente por
 *   completo). El módulo carga sin fallar — invocar la función dispara el
 *   error, con el motivo explícito. Mismo patrón que
 *   `@thyrox/voice: src/hooks/useVoiceIntegration.tsx`.
 */
import type { ReactNodeLike } from '../../Tool.js'

export function renderToolUseMessage(
  input: Partial<{ server?: string }>,
): ReactNodeLike {
  return input.server
    ? `List MCP resources from server "${input.server}"`
    : `List all MCP resources`
}

/**
 * NO PORTADO — ver docstring del módulo. El require() diferido es la
 * ÚNICA excepción admitida a "sin lazy imports": el especificador no
 * resuelve hoy en este árbol, no es una preferencia de estilo.
 */
export function renderToolResultMessage(
  _output: unknown,
  _progressMessagesForMessage: unknown[],
  _options: { verbose: boolean },
): ReactNodeLike {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react')
  throw new Error(
    'renderToolResultMessage() no está portado: renderiza ' +
      '<MessageResponse>/<Text>/<OutputLine> de @thyrox/repl y ' +
      '@anthropic/ink, ninguno presente en este árbol. Ver el docstring ' +
      'de ListMcpResourcesTool/UI.ts.',
  )
}
