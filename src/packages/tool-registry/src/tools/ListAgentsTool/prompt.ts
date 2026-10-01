/**
 * `Dl`, `MTo` y `Wxr` de `chunk-g3tnnx4p.js` (2.1.283): el nombre de
 * `ListAgents`, su alias y su descripción. La cola `e()` de `Wxr` devuelve
 * `''` en la referencia y no se porta; `lo` es el nombre de `SendMessage`,
 * y el nombre del producto va como `PRODUCT_NAME`.
 */
import { PRODUCT_NAME } from '@thyrox/config/product'

import { SEND_MESSAGE_TOOL_NAME } from '../SendMessageTool/constants.js'

/** `Dl`. */
export const LIST_AGENTS_TOOL_NAME = 'ListAgents'
/** `MTo`. */
export const LIST_PEERS_TOOL_ALIAS = 'ListPeers'

/** `s`. */
const DESCRIPTION = `Lists agents you can ${SEND_MESSAGE_TOOL_NAME} to — in-process subagents you spawned, the teammates on your team, other local ${PRODUCT_NAME} sessions on this machine, your ${PRODUCT_NAME} sessions running in the cloud (when this session has cloud access; a cloud session receives your message but cannot message any session back yet — do not ask it to reply, read its answer in its own transcript), and (when Remote Control is connected here) your account's other sessions — Remote Control sessions on other machines and cloud sessions, each row labeled by kind. Names are the address: send with \`${SEND_MESSAGE_TOOL_NAME}({to: "<name>", message: "..."})\`, copying the name exactly as a row prints it. Append a row's \` [ref]\` only when the bare name is not enough — two rows share it, or an error asks you to disambiguate.`

/** `Wxr`. */
export function getPrompt(): string {
  return DESCRIPTION
}
