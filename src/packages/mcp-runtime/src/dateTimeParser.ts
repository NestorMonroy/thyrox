/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/dateTimeParser.ts` —
 * sus 2 exportaciones, ninguna omitida.
 *
 * Repuntado a `@thyrox/local-observability/logging` (subpath declarado y
 * símbolo `logError` verificado con resolución real): `.` → sin cambio en
 * el resto del archivo.
 *
 * `@claude-code-how-works/provider/claude.js` (`queryHaiku`),
 * `@claude-code-how-works/provider/systemPromptType.js` (`asSystemPrompt`)
 * y `@claude-code-how-works/agent/messages.js` (`extractTextContent`) — NO
 * resuelven: ninguno de los tres subpaths está en el `exports` de
 * `@thyrox/provider` (`.`, `./anthropicHttp`, `./recorded`, `./sse`,
 * `./cost/*`) ni de `@thyrox/agent`, verificado contra la lista completa
 * de cada paquete. Los tres se usan sólo dentro del cuerpo de
 * `parseNaturalLanguageDateTime` (nunca a nivel de módulo), así que se
 * envuelven con `require()` diferido en vez de `import` estático: un
 * `import` de un paquete cuya base (`@claude-code-how-works/*`) no existe
 * en absoluto en este árbol hace fallar la carga del MÓDULO ENTERO
 * (`Cannot find module`, medido con `bun -e "import(...)"` antes de esta
 * corrección) — no sólo la función que los usa. Mismo patrón que ya evita
 * `appStateHooks.ts` de este puerto.
 *
 * Parsea fecha/hora en lenguaje natural a ISO 8601 vía Haiku — usado por el
 * flujo de elicitación cuando un servidor MCP pide un campo `date`/
 * `date-time` y el usuario escribe texto libre en vez del formato exacto.
 */

import { logError } from '@thyrox/local-observability/logging'

type QueryHaikuFn = (args: {
  systemPrompt: unknown
  userPrompt: string
  signal: AbortSignal
  options: Record<string, unknown>
}) => Promise<{ message: { content: unknown } }>

function requireProviderClaude(): { queryHaiku: QueryHaikuFn } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/provider/claude.js')
}

function requireProviderSystemPromptType(): {
  asSystemPrompt: (lines: string[]) => unknown
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/provider/systemPromptType.js')
}

function requireAgentMessages(): {
  extractTextContent: (blocks: unknown[]) => string
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/agent/messages.js')
}

type DateTimeParseResult =
  | { success: true; value: string }
  | { success: false; error: string }

/**
 * Parsea una entrada de fecha/hora en lenguaje natural a formato ISO 8601
 * usando Haiku.
 *
 * Ejemplos:
 * - "mañana a las 3pm" → "2025-10-15T15:00:00-07:00"
 * - "el próximo lunes" → "2025-10-20"
 * - "en 2 horas" → "2025-10-14T12:30:00-07:00"
 *
 * @param input La cadena de fecha/hora en lenguaje natural, del usuario
 * @param format Si se parsea como 'date' (YYYY-MM-DD) o 'date-time' (ISO 8601 completo con hora)
 * @param signal AbortSignal para cancelación
 * @returns Cadena ISO 8601 parseada o mensaje de error
 */
export async function parseNaturalLanguageDateTime(
  input: string,
  format: 'date' | 'date-time',
  signal: AbortSignal,
): Promise<DateTimeParseResult> {
  // Obtiene la fecha/hora actual con zona horaria, para dar contexto.
  const now = new Date()
  const currentDateTime = now.toISOString()
  const timezoneOffset = -now.getTimezoneOffset() // minutos, signo invertido
  const tzHours = Math.floor(Math.abs(timezoneOffset) / 60)
  const tzMinutes = Math.abs(timezoneOffset) % 60
  const tzSign = timezoneOffset >= 0 ? '+' : '-'
  const timezone = `${tzSign}${String(tzHours).padStart(2, '0')}:${String(tzMinutes).padStart(2, '0')}`
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })

  // Construye el system prompt con el contexto.
  const systemPrompt = requireProviderSystemPromptType().asSystemPrompt([
    'You are a date/time parser that converts natural language into ISO 8601 format.',
    'You MUST respond with ONLY the ISO 8601 formatted string, with no explanation or additional text.',
    'If the input is ambiguous, prefer future dates over past dates.',
    "For times without dates, use today's date.",
    'For dates without times, do not include a time component.',
    'If the input is incomplete or you cannot confidently parse it into a valid date, respond with exactly "INVALID" (nothing else).',
    'Examples of INVALID input: partial dates like "2025-01-", lone numbers like "13", gibberish.',
    'Examples of valid natural language: "tomorrow", "next Monday", "jan 1st 2025", "in 2 hours", "yesterday".',
  ])

  // Construye el prompt de usuario con contexto enriquecido.
  const formatDescription =
    format === 'date'
      ? 'YYYY-MM-DD (date only, no time)'
      : `YYYY-MM-DDTHH:MM:SS${timezone} (full date-time with timezone)`

  const userPrompt = `Current context:
- Current date and time: ${currentDateTime} (UTC)
- Local timezone: ${timezone}
- Day of week: ${dayOfWeek}

User input: "${input}"

Output format: ${formatDescription}

Parse the user's input into ISO 8601 format. Return ONLY the formatted string, or "INVALID" if the input is incomplete or unparseable.`

  try {
    const result = await requireProviderClaude().queryHaiku({
      systemPrompt,
      userPrompt,
      signal,
      options: {
        querySource: 'mcp_datetime_parse',
        agents: [],
        isNonInteractiveSession: false,
        hasAppendSystemPrompt: false,
        mcpTools: [],
        enablePromptCaching: false,
      },
    })

    // Extrae el texto del resultado.
    const parsedText = requireAgentMessages()
      .extractTextContent(Array.isArray(result.message.content) ? result.message.content : [])
      .trim()

    // Valida que se obtuvo algo usable.
    if (!parsedText || parsedText === 'INVALID') {
      return {
        success: false,
        error: 'Unable to parse date/time from input',
      }
    }

    // Chequeo de cordura básico — debe empezar con un dígito (el año).
    if (!/^\d{4}/.test(parsedText)) {
      return {
        success: false,
        error: 'Unable to parse date/time from input',
      }
    }

    return { success: true, value: parsedText }
  } catch (error) {
    // Registra el error pero no expone el detalle al usuario.
    logError(error)
    return {
      success: false,
      error:
        'Unable to parse date/time. Please enter in ISO 8601 format manually.',
    }
  }
}

/**
 * Verifica si una cadena luce como una fecha/hora ISO 8601. Se usa para
 * decidir si intentar el parseo en lenguaje natural.
 */
export function looksLikeISO8601(input: string): boolean {
  // Fecha ISO 8601: YYYY-MM-DD
  // Fecha-hora ISO 8601: YYYY-MM-DDTHH:MM:SS...
  return /^\d{4}-\d{2}-\d{2}(T|$)/.test(input.trim())
}
