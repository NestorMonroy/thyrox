/**
 * Puerto de `ccnmt: packages/tool-registry/src/tools/ReadMcpResourceTool/UI.tsx`
 * (TASK #232). Renombrado de `.tsx` a `.ts`: no queda JSX real en este
 * árbol.
 *
 * Cobertura DECLARADA: 2 de 3 exports portados en forma funcional.
 *
 * - `renderToolUseMessage` — puerto FIEL y COMPLETO.
 * - `userFacingName` — puerto FIEL y COMPLETO.
 * - `renderToolResultMessage` — BLOQUEADO. La fuente renderiza
 *   `<Box>`/`<MessageResponse>`/`<Text>`/`<OutputLine>` de
 *   `@anthropic/ink` y `@claude-code-how-works/repl/components/*`,
 *   ninguno presente en este árbol. El módulo carga sin fallar — invocar
 *   la función dispara el error. Mismo patrón que
 *   `@thyrox/voice: src/hooks/useVoiceIntegration.tsx`.
 */
import type { ReactNodeLike } from '../../Tool.js'
import type { z } from 'zod/v4'
import type { inputSchema } from './ReadMcpResourceTool.js'

export function renderToolUseMessage(
  input: Partial<z.infer<ReturnType<typeof inputSchema>>>,
): ReactNodeLike {
  if (!input.uri || !input.server) {
    return null
  }
  return `Read resource "${input.uri}" from server "${input.server}"`
}

export function userFacingName(): string {
  return 'readMcpResource'
}

/**
 * NO PORTADO — ver docstring del módulo.
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
      '<Box>/<MessageResponse>/<Text>/<OutputLine> de @anthropic/ink y ' +
      '@thyrox/repl, ninguno presente en este árbol. Ver el docstring de ' +
      'ReadMcpResourceTool/UI.ts.',
  )
}
