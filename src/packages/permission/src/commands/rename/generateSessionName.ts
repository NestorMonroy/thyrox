/**
 * Un nombre corto para la sesión, pedido al modelo barato.
 *
 * Procedencia: `ccnmt: packages/permission/src/commands/rename/generateSessionName.ts`
 * (67 líneas, 1 símbolo). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se reimplementa y no se copia. Porte COMPLETO.
 *
 * POR QUÉ TODO DEVUELVE `null` EN VEZ DE PROPAGAR. Esta función se llama
 * automáticamente cada tres mensajes del puente. Un tiempo agotado, un límite
 * de tasa o un corte de red son fallos operativos ESPERADOS a esa frecuencia:
 * propagarlos inundaría el archivo de errores con ruido, y por eso el registro
 * es de depuración y no de error. Lo mismo vale para una respuesta que no es
 * JSON o que no trae el campo pedido: un nombre inventado sería peor que no
 * renombrar.
 *
 * DIVERGENCIA DECLARADA — una, y es de tipos, no de conducta. El `queryHaiku`
 * de nuestro proveedor es un puente heredado con firma
 * `(...args: unknown[]) => Promise<unknown>`, así que la forma de la respuesta
 * no se infiere y hay que afirmarla en la frontera. Se afirma con un tipo
 * local mínimo —sólo `message.content`, que es lo único que este módulo lee—
 * en vez de castear a `any`: si el proveedor gana tipos, este punto queda como
 * el único sitio que reconciliar.
 */
import type { Message } from '@thyrox/agent/messageShapes'
import { extractTextContent } from '@thyrox/agent/messages.js'
import { extractConversationText } from '@thyrox/agent/sessionTitle.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'
import { queryHaiku } from '@thyrox/provider/claude.js'
import { asSystemPrompt } from '@thyrox/provider/systemPromptType.js'
import { safeParseJSON } from '@thyrox/storage/json.js'

/** Lo único que este módulo lee de la respuesta del proveedor. */
type RespuestaDelProveedor = { message: { content: unknown } }

export async function generateSessionName(
  messages: Message[],
  signal: AbortSignal,
): Promise<string | null> {
  const conversationText = extractConversationText(messages)
  if (!conversationText) {
    // Sin texto no hay nada que resumir, y la llamada costaría sin informar.
    return null
  }

  try {
    const result = (await queryHaiku({
      systemPrompt: asSystemPrompt([
        'Generate a short kebab-case name (2-4 words) that captures the main topic of this conversation. Use lowercase words separated by hyphens. Examples: "fix-login-bug", "add-auth-feature", "refactor-api-client", "debug-test-failures". Return JSON with a "name" field.',
      ]),
      userPrompt: conversationText,
      outputFormat: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
          additionalProperties: false,
        },
      },
      signal,
      options: {
        querySource: 'rename_generate_name',
        agents: [],
        isNonInteractiveSession: false,
        hasAppendSystemPrompt: false,
        mcpTools: [],
      },
    })) as RespuestaDelProveedor

    const content = Array.isArray(result.message.content)
      ? extractTextContent(result.message.content)
      : (result.message.content as string)

    const response = safeParseJSON(content)
    if (
      response &&
      typeof response === 'object' &&
      'name' in response &&
      typeof (response as { name: unknown }).name === 'string'
    ) {
      return (response as { name: string }).name
    }
    return null
  } catch (error) {
    logForDebugging(`generateSessionName failed: ${errorMessage(error)}`, {
      level: 'error',
    })
    return null
  }
}
