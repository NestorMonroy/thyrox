
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
