/**
 * Porte PARCIAL de `ccnmt: packages/agent/compaction/compact.ts`.
 *
 * La fuente es el orquestador entero de compactación (~1300+ líneas):
 * ejecuta hooks pre/post-compact, llama al modelo con streaming, gestiona
 * reintentos, restaura archivos y skills post-compactación, etc. Depende de
 * `@anthropic-ai/sdk`, de casi dos docenas de módulos bajo
 * `@claude-code-how-works/**` y de `../messages.js`, `../hooks.js`,
 * `../forkedAgent.js`, `../tokens.js`, `../toolSearch.js`, `../context.js`,
 * `../attachments.js` — ninguno de ellos vive todavía en este árbol, y
 * `../messages.js` está PROHIBIDO tocar en este porte (otro agente lo
 * escribe ahora mismo).
 *
 * DIVERGENCIA DE ALCANCE, declarada: aquí sólo se porta
 * `stripImagesFromMessages`, la única función de este módulo que
 * `__tests__/stripImagesFromMessages.test.ts` ejercita. Es autocontenida —
 * no llama a ninguna otra función del módulo fuente, sólo consume el tipo
 * `Message` de `../messageShapes.ts` (leído, no editado). El resto del
 * módulo (`compactConversation`, `partialCompactConversation`, hooks,
 * reintentos, etc.) se porta cuando sus dependencias existan en el árbol.
 *
 * Nota de tipos: `Message.message.content` en el `messageShapes.ts` de
 * este árbol es `unknown` (porte mínimo, ver su propio docstring) — la
 * fuente usa el tipo estructurado del SDK de Anthropic. Aquí se declaran
 * localmente los tipos de bloque mínimos que la función necesita
 * (`ImageBlockLike`, `DocumentBlockLike`, `ToolResultBlockLike`) en vez de
 * arrastrar el SDK completo, mismo criterio que `ToolResultBlockParam` en
 * `messageShapes.ts`.
 */
import type { Message } from '../messageShapes.js'

type TextBlockLike = { type: 'text'; text: string }
type ImageBlockLike = { type: 'image'; [key: string]: unknown }
type DocumentBlockLike = { type: 'document'; [key: string]: unknown }
type ToolResultBlockLike = {
  type: 'tool_result'
  content?: unknown
  [key: string]: unknown
}
type ContentBlockLike =
  | TextBlockLike
  | ImageBlockLike
  | DocumentBlockLike
  | ToolResultBlockLike
  | { type: string; [key: string]: unknown }

/**
 * Retira los bloques de imagen de los mensajes de usuario antes de
 * enviarlos para compactación. Las imágenes no hacen falta para generar
 * un resumen de la conversación y pueden hacer que la propia llamada de
 * compactación choque con el límite de prompt-too-long, especialmente en
 * sesiones CCD donde los usuarios adjuntan imágenes con frecuencia.
 * Reemplaza los bloques de imagen con un marcador de texto para que el
 * resumen igual note que se compartió una imagen.
 *
 * Nota: sólo los mensajes de usuario contienen imágenes (ya sea adjuntas
 * directamente o dentro de contenido de tool_result). Los mensajes de
 * asistente contienen texto, tool_use y bloques de thinking pero no
 * imágenes.
 */
export function stripImagesFromMessages(messages: Message[]): Message[] {
  return messages.map(message => {
    if (message.type !== 'user') {
      return message
    }

    const content = message.message?.content
    if (!Array.isArray(content)) {
      return message
    }

    let hasMediaBlock = false
    const newContent = (content as ContentBlockLike[]).flatMap(block => {
      if (block.type === 'image') {
        hasMediaBlock = true
        return [{ type: 'text' as const, text: '[image]' }]
      }
      if (block.type === 'document') {
        hasMediaBlock = true
        return [{ type: 'text' as const, text: '[document]' }]
      }
      // También retira imágenes/documentos anidados dentro de arreglos
      // de contenido de tool_result.
      if (block.type === 'tool_result' && Array.isArray(block.content)) {
        let toolHasMedia = false
        const newToolContent = (block.content as ContentBlockLike[]).map(
          item => {
            if (item.type === 'image') {
              toolHasMedia = true
              return { type: 'text' as const, text: '[image]' }
            }
            if (item.type === 'document') {
              toolHasMedia = true
              return { type: 'text' as const, text: '[document]' }
            }
            return item
          },
        )
        if (toolHasMedia) {
          hasMediaBlock = true
          return [{ ...block, content: newToolContent }]
        }
      }
      return [block]
    })

    if (!hasMediaBlock) {
      return message
    }

    return {
      ...message,
      message: {
        ...message.message,
        content: newContent,
      },
    } as typeof message
  })
}
