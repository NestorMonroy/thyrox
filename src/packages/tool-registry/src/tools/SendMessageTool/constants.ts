import { MAX_BARE_ADDRESS_LENGTH } from '@thyrox/local-observability/uds/peerAddress.js'

export const SEND_MESSAGE_TOOL_NAME = 'SendMessage'

/** `pA`: la longitud máxima de una dirección de par (`uds:`, `bridge:`, `did:`). */
export const MAX_PEER_ADDRESS_LENGTH = 200

/** `Vs`: margen sobre la dirección de par para un `request_id` real. */
export const REQUEST_ID_SLACK = 100

/** `Ne`: la longitud máxima de un `request_id`. */
export const MAX_REQUEST_ID_LENGTH = MAX_PEER_ADDRESS_LENGTH + REQUEST_ID_SLACK

/** `qFr`: el largo del identificador de referencia (` [ref]`) que puede acompañar un nombre. */
const REFERENCE_SUFFIX_LENGTH = 12

/** `Xs`: espacio del esquema `nombre@`/sufijo: `2 + qFr + 1`. */
const RECIPIENT_NAME_OVERHEAD = 2 + REFERENCE_SUFFIX_LENGTH + 1

/** `ks`: la longitud máxima del campo `to`; nunca menor que una dirección desnuda (`JFr`). */
export const MAX_TO_LENGTH = Math.max(
  MAX_PEER_ADDRESS_LENGTH + RECIPIENT_NAME_OVERHEAD,
  MAX_BARE_ADDRESS_LENGTH,
)

/** `r3e`: la longitud máxima del campo `summary`. */
export const MAX_SUMMARY_LENGTH = 200

/** `Re`: una sola línea, sin `\n` ni `\r`. */
export const SINGLE_LINE = /^[^\n\r]*$/u
