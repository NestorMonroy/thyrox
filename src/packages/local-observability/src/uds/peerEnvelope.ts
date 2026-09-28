/**
 * El sobre `cross-session-message`: cómo llega a la conversación el texto de
 * otra sesión, con quién lo envió, desde qué sesión, por qué saltos, en qué
 * modo y desde qué plugin. Porte de `ky`, `B`, `oFt`, `pYe`, `V`, `mYe`, `_`,
 * `pfn`, `QFr`, `zce`, `qCe`, `EFe`, `dfn`, `lLo`, `aLo` y sus constantes
 * (`h`, `C`, `f`, `x`, `lFt`, `y`) de `chunk-q8a07cv0.js` de 2.1.283; `fj` de
 * `chunk-fmsbxtrp.js`.
 *
 * Un sobre sólo se acepta si formatearlo de nuevo reproduce el texto exacto:
 * así un atributo con una forma que el emisor nunca escribiría, o un cuerpo
 * que trae su propio cierre sin escapar, no se lee como sobre.
 *
 * El resto del chunk tiene otro hogar: las direcciones en `./peerAddress.ts`;
 * las constantes y nombres de equipo (`gi`, `wye`, `fYe`, `uJ`, `w0`, `cfn`,
 * `iFt`) en `@thyrox/swarm`; y los lectores de archivo con tope (`cl`, `rLo`,
 * `OP`, `oLo`) con el resumen de una línea (`lfn`, `aFt`) en
 * `./cappedText.ts`.
 */
import { createHmac } from 'node:crypto'

import { sliceUnits } from './displayText.ts'
import { escapeTagClose } from './tagClose.ts'

/** `fj`. */
export const ENVELOPE_TAG = 'cross-session-message'
/** `lFt`: saltos que conserva la cadena. */
export const MAX_HOP_CHAIN = 32
/** `y`: dígitos hexadecimales de un salto. */
const HOP_ID_HEX = 24
/** `x`: los modos que un emisor declara. */
export const ENVELOPE_MODES = ['bypass', 'prompting'] as const
export type EnvelopeMode = (typeof ENVELOPE_MODES)[number]

const DISPLAY_NAME_LIMIT = 64
const SLUG_LIMIT = 20
/** `f`: los caracteres de una dirección de par. */
export const ADDRESS_CHARS = 'A-Za-z0-9%:_/.\\\\-'
/** `h`: un id de sesión que puede viajar en `from-session`. */
const SESSION_ID = /^[A-Za-z0-9_-]{1,80}$/
const HOP = `[0-9a-f]{${HOP_ID_HEX}}`
/** `C`: una cadena de saltos separada por comas. */
const HOP_CHAIN = new RegExp(`^${HOP}(?:,${HOP}){0,${MAX_HOP_CHAIN - 1}}$`)

/** `B`: retira formato, controles, sustitutos y separadores de línea y párrafo. */
function stripInvisible(text: string): string {
  return text.replace(/[\p{Cf}\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/gu, '')
}

/** `ky`: un nombre para mostrar: sin invisibles, recortado y de 64 puntos de código como mucho. */
export function sanitizeDisplayName(text: string): string {
  const trimmed = stripInvisible(text).trim()
  const codePoints = [...trimmed]
  return codePoints.length > DISPLAY_NAME_LIMIT ? `${codePoints.slice(0, DISPLAY_NAME_LIMIT).join('')}…` : trimmed
}

/** `oFt`: un nombre en forma de identificador, o vacío si no tiene ninguna letra ni número. */
export function slugifyName(text: string): string {
  const slug = sanitizeDisplayName(text)
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^[._-]+|[._-]+$/gu, '')
  if (!/[\p{L}\p{N}]/u.test(slug)) return ''
  const cut = sliceUnits(slug, SLUG_LIMIT)
  return cut === slug ? slug : `${cut}…`
}

/** Un nombre que puede ir entre comillas de atributo. */
function attributeName(text: string): string {
  return sanitizeDisplayName(text.replace(/["<>]/g, ''))
}

/** `pYe`: el plugin de origen que declara un mensaje, o `undefined`. */
export function pluginOrigin(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const name = attributeName(value)
  return name === '' ? undefined : name
}

/** `aLo`. */
export function isEnvelopeMode(value: unknown): value is EnvelopeMode {
  return (ENVELOPE_MODES as readonly unknown[]).includes(value)
}

export type EnvelopeFields = {
  from?: string
  fromName?: string
  body: string
  fromSession?: string
  hopChain?: readonly string[]
  fromMode?: string
  fromPlugin?: string
}

/** `V`: los atributos del sobre, en su orden; los que no tienen forma válida se omiten. */
function envelopeAttributes({ from, fromName, fromSession, hopChain, fromMode, fromPlugin }: EnvelopeFields): string {
  const attributes: string[] = []
  if (from) attributes.push(`from="${from}"`)
  if (fromSession && SESSION_ID.test(fromSession)) attributes.push(`from-session="${fromSession}"`)
  if (hopChain !== undefined && hopChain.length > 0) {
    const joined = hopChain.join(',')
    if (HOP_CHAIN.test(joined)) attributes.push(`hop-chain="${joined}"`)
  }
  const name = fromName === undefined ? undefined : attributeName(fromName)
  if (name) attributes.push(`from-name="${name}"`)
  if (fromMode) attributes.push(`from-mode="${fromMode}"`)
  const plugin = fromPlugin === undefined ? undefined : attributeName(fromPlugin)
  if (plugin) attributes.push(`from-plugin="${plugin}"`)
  return attributes.length > 0 ? ` ${attributes.join(' ')}` : ''
}

/** `mYe`. */
export function formatEnvelope(fields: EnvelopeFields): string {
  return `<${ENVELOPE_TAG}${envelopeAttributes(fields)}>\n${escapeTagClose(ENVELOPE_TAG, fields.body)}\n</${ENVELOPE_TAG}>`
}

export type ParsedEnvelope = {
  from?: string
  fromSession?: string
  hopChain?: string[]
  fromName?: string
  fromMode?: EnvelopeMode
  fromPlugin?: string
  body: string
}

const sourceOf = (pattern: RegExp) => pattern.source.replace(/^\^|\$$/g, '')
const ENVELOPE_PATTERN = new RegExp(
  `^<${ENVELOPE_TAG}(?: from="([${ADDRESS_CHARS}]+)")?(?: from-session="(${sourceOf(SESSION_ID)})")?(?: hop-chain="(${sourceOf(HOP_CHAIN)})")?(?: from-name="([^"<>\\n\\r]+)")?(?: from-mode="(${ENVELOPE_MODES.join('|')})")?(?: from-plugin="([^"<>\\n\\r]+)")?>\\n([\\s\\S]*)\\n</${ENVELOPE_TAG}>$`,
)

/** `_`: los campos de un sobre, si el texto es un sobre que se reproduce exacto. */
export function parseEnvelope(text: unknown): ParsedEnvelope | undefined {
  if (typeof text !== 'string') return undefined
  const match = text.match(ENVELOPE_PATTERN)
  if (!match) return undefined
  const [, from, fromSession, chain, fromName, fromMode, fromPlugin, body = ''] = match
  const hopChain = chain !== undefined ? chain.split(',') : undefined
  if (formatEnvelope({ from, fromName, body, fromSession, hopChain, fromMode, fromPlugin }) !== text) return undefined
  return {
    ...(from !== undefined && { from }),
    ...(fromSession !== undefined && { fromSession }),
    ...(hopChain !== undefined && { hopChain }),
    ...(fromName !== undefined && { fromName }),
    ...(fromMode !== undefined && { fromMode: fromMode as EnvelopeMode }),
    ...(fromPlugin !== undefined && { fromPlugin }),
    body,
  }
}

/** `pfn`: el mismo sobre sin la cadena de saltos; un texto que no es sobre queda igual. */
export function stripHopChain(text: string): string {
  const envelope = parseEnvelope(text)
  if (!envelope || envelope.hopChain === undefined) return text
  return formatEnvelope({ ...envelope, hopChain: undefined })
}

/** `QFr`: el sobre con el plugin de origen, si todavía no lo declaraba. */
export function withPluginAttribute(text: string, plugin: string | undefined): string {
  if (plugin === undefined) return text
  const envelope = parseEnvelope(text)
  if (!envelope || envelope.fromPlugin !== undefined) return text
  return formatEnvelope({ ...envelope, fromPlugin: plugin })
}

export type EnvelopeOriginFields = {
  name?: string
  fromSession?: string
  hopChain?: string[]
  fromMode?: EnvelopeMode
  body?: string
}

/** `qCe`: lo que el sobre aporta al origen de un mensaje. */
export function envelopeOriginFields(text: string): EnvelopeOriginFields {
  const envelope = parseEnvelope(text)
  if (!envelope) return {}
  const name = envelope.fromName ? sanitizeDisplayName(envelope.fromName) : ''
  return {
    ...(name && { name }),
    ...(envelope.fromSession !== undefined && { fromSession: envelope.fromSession }),
    ...(envelope.hopChain !== undefined && { hopChain: envelope.hopChain }),
    ...(envelope.fromMode !== undefined && { fromMode: envelope.fromMode }),
    body: envelope.body,
  }
}

/**
 * `zce`: el cuerpo del sobre describe el texto recibido; si lo que se entrega
 * ya es otro (un hook lo reescribió, se antepusieron adjuntos), se retira.
 */
export function dropChangedBody<T extends { body?: string; [field: string]: unknown }>(origin: T, delivered: string, received: string): Omit<T, 'body'> | T {
  if (origin.body === undefined || delivered === received) return origin
  const { body: _body, ...rest } = origin
  return rest
}

/** `dfn`: la cadena de saltos con el salto propio al final, recortada a los últimos 32. */
export function extendHopChain(chain: readonly string[] | undefined, hop: string | undefined): string[] | undefined {
  if (chain === undefined) return undefined
  const extended = [...chain]
  if (hop) extended.push(hop)
  if (extended.length === 0) return undefined
  return extended.length > MAX_HOP_CHAIN ? extended.slice(extended.length - MAX_HOP_CHAIN) : extended
}

/** `lLo`: el salto de una sesión: HMAC-SHA256 con la clave, en 24 dígitos hexadecimales. */
export function hopId(sessionId: string, key: string): string {
  return createHmac('sha256', key).update(sessionId).digest('hex').slice(0, HOP_ID_HEX)
}

type TranscriptMessage = { type: string; toolUseResult?: unknown; isCompactSummary?: boolean; origin?: { kind?: string; hopChain?: string[] } }

/** `EFe`: la cadena de saltos del último mensaje `user` de la conversación, si vino de un par. */
export function lastPeerHopChain(messages: readonly TranscriptMessage[]): string[] | undefined {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]!
    if (message.type !== 'user' || message.toolUseResult || message.isCompactSummary) continue
    return message.origin?.kind === 'peer' ? (message.origin.hopChain ?? []) : undefined
  }
  return undefined
}
