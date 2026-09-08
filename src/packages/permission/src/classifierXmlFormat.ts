/**
 * La capa de FORMATO del clasificador XML de dos etapas: sufijos de prompt,
 * lectores de etiqueta y aritmética de consumo. Cadenas puras — aquí no se
 * clasifica nada ni se llama a ninguna API.
 *
 * Procedencia: `ccnmt: packages/permission/src/classifierXmlFormat.ts`
 * (186 líneas, 12 exports). Ese árbol declara `"license": "UNLICENSED"`, así
 * que los cuerpos se **reimplementan** y no se copian.
 *
 * Vive separado de la máquina de decisión a propósito: el formato del cable
 * cambia con el proveedor y la política cambia con nosotros. Mezclarlos hace
 * que un cambio de etiqueta obligue a tocar la política.
 *
 * DIVERGENCIA DECLARADA. La fuente documenta cada constante citando rutas de
 * un sandbox privado del proveedor y sus nombres internos de símbolo
 * minificado. Eso es dominio del proveedor y no viaja (misma razón que la
 * tarea #249): aquí cada constante se justifica por lo que HACE, y las
 * cadenas que van al modelo se conservan verbatim porque son el contrato con
 * él, no un identificador.
 */
import type Anthropic from '@anthropic-ai/sdk'
import type { ClassifierUsage } from './permissionTypes.js'

/**
 * Sufijo de la etapa 1 cuando NO habrá etapa 2.
 *
 * Ahí la etapa 1 es el veredicto final, así que tiene que aplicar el conjunto
 * de reglas entero: no cabe el atajo de «ya lo mirará la etapa 2».
 */
export const XML_S1_SUFFIX =
  '\nErr on the side of blocking. <block> immediately.'

/**
 * Sufijo de la etapa 1 en el modo de DOS etapas, que es el de por defecto.
 *
 * Aquí la etapa 1 es un prefiltro grueso: NO aplica intención del usuario ni
 * las excepciones de permiso —eso lo hace la etapa 2 razonando— y bloquea en
 * cuanto una regla PUDIERA aplicar. Un bloqueo de más en esta etapa es
 * inofensivo porque sólo escala a la siguiente, que lo levanta.
 *
 * Usar aquí el sufijo de una sola etapa es un defecto conocido: le pide a la
 * etapa 1 un juicio definitivo para el que no está equipada.
 */
export const XML_S1_SUFFIX_BOTH =
  '\nErr on the side of blocking. Stage 1 does NOT apply user intent or ALLOW exceptions — stage 2 will handle those. Block if ANY rule could apply. <block> immediately.'

/**
 * Sufijo de la etapa 2: pide razonamiento explícito antes del veredicto, y
 * recuerda que la confirmación del usuario tiene que ser EXPLÍCITA — una
 * sugerencia o un consentimiento implícito no levantan un bloqueo.
 */
export const XML_S2_SUFFIX =
  '\nReview the classification process and follow it carefully, making sure you deny actions that should be blocked. As a reminder, explicit (not suggestive or implicit) user confirmation is required to override blocks. Use <thinking> before responding with <block>.'

/**
 * Retira el pensamiento para que una etiqueta escrita DENTRO del razonamiento
 * no se lea como veredicto.
 *
 * El segundo reemplazo cubre el pensamiento sin cerrar: una respuesta truncada
 * por límite de salida deja la etiqueta abierta, y sin este corte todo lo que
 * viniera después contaminaría la lectura.
 */
function stripThinking(text: string): string {
  return text
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
    .replace(/<thinking>[\s\S]*$/, '')
}

/**
 * Lee el veredicto: `true` bloquea, `false` permite, `null` no se pudo leer.
 *
 * Los tres valores son distintos aguas arriba, y colapsar `null` en `false`
 * convertiría un fallo de formato en un permiso.
 */
export function parseXmlBlock(text: string): boolean | null {
  const matches = [
    ...stripThinking(text).matchAll(/<block>(yes|no)\b(<\/block>)?/gi),
  ]
  if (matches.length === 0) return null
  return matches[0]![1]!.toLowerCase() === 'yes'
}

/** Lee la razón del bloqueo, ya recortada, y fuera del pensamiento. */
export function parseXmlReason(text: string): string | null {
  const matches = [
    ...stripThinking(text).matchAll(/<reason>([\s\S]*?)<\/reason>/g),
  ]
  if (matches.length === 0) return null
  return matches[0]![1]!.trim()
}

/** Lee el pensamiento — aquí SÍ es lo que se busca, no lo que se descarta. */
export function parseXmlThinking(text: string): string | null {
  const match = /<thinking>([\s\S]*?)<\/thinking>/.exec(text)
  return match ? match[1]!.trim() : null
}

/**
 * Separa un rechazo de política de una respuesta que no se pudo leer.
 *
 * La distinción decide si reintentar sirve de algo: un rechazo se repite
 * idéntico; una respuesta vacía POR truncamiento puede no repetirse. De ahí
 * que un vacío con `max_tokens` no cuente como rechazo.
 */
export function classifyParseFailure(
  emptyResponse: boolean,
  stopReason: string | null | undefined,
): 'policy_refusal' | 'unparseable' {
  if (stopReason === 'refusal') return 'policy_refusal'
  if (emptyResponse && stopReason !== 'max_tokens') return 'policy_refusal'
  return 'unparseable'
}

/**
 * El texto que ve una persona cuando el clasificador no pudo decidir.
 *
 * Los tres argumentos existen por simetría con el sitio de llamada y para la
 * telemetría, y el texto devuelto es FIJO: la etapa, la clase de fallo y el
 * motivo de parada son internos del clasificador y no se le enseñan a nadie.
 * Van por el otro canal, el de telemetría.
 */
export function buildClassifierFailureReason(
  _stage:
    | 'stage 1'
    | 'stage 2'
    | 'tool_use'
    | 'no tool use block'
    | 'invalid schema',
  _kind: 'policy_refusal' | 'unparseable',
  _stopReason: string | null | undefined,
): string {
  return 'Auto mode could not evaluate this action and is blocking it for safety — run with --debug for details'
}

/**
 * Extrae el consumo de una respuesta.
 *
 * Los dos campos de caché caen a CERO cuando faltan, y no es cosmético: se
 * suman aguas abajo, así que un `undefined` propagaría NaN por toda la cuenta.
 */
export function extractUsage(
  result: Anthropic.Beta.Messages.BetaMessage,
): ClassifierUsage {
  return {
    inputTokens: result.usage.input_tokens,
    outputTokens: result.usage.output_tokens,
    cacheReadInputTokens: result.usage.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: result.usage.cache_creation_input_tokens ?? 0,
  }
}

/**
 * Extrae el identificador de la petición, que el SDK cuelga del objeto de
 * respuesta como propiedad no enumerable.
 */
export function extractRequestId(
  result: Anthropic.Beta.Messages.BetaMessage,
): string | undefined {
  return (result as { _request_id?: string | null })._request_id ?? undefined
}

/** Suma el consumo de las dos etapas en un total. */
export function combineUsage(
  a: ClassifierUsage,
  b: ClassifierUsage,
): ClassifierUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadInputTokens: a.cacheReadInputTokens + b.cacheReadInputTokens,
    cacheCreationInputTokens:
      a.cacheCreationInputTokens + b.cacheCreationInputTokens,
  }
}

/**
 * Cambia la instrucción de salida por herramienta a la de salida en XML.
 *
 * Un prompt que no lleve esa línea sale intacto: `String.replace` con una
 * aguja literal que no aparece devuelve el original, y esa es la conducta
 * querida — no hay nada que reescribir.
 */
export function replaceOutputFormatWithXml(systemPrompt: string): string {
  const toolUseLine =
    'Use the classify_result tool to report your classification.'
  const xmlFormat = [
    '## Output Format',
    '',
    'If the action should be blocked:',
    '<block>yes</block><reason>one short sentence</reason>',
    '',
    'If the action should be allowed:',
    '<block>no</block>',
    '',
    'Do NOT include a <reason> tag when the action is allowed.',
    'Your ENTIRE response MUST begin with <block>. Do NOT output any analysis, reasoning, or commentary before <block>. No "Looking at..." or similar preamble.',
  ].join('\n')
  return systemPrompt.replace(toolUseLine, xmlFormat)
}
