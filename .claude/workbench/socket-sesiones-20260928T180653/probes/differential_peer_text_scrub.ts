/**
 * Oráculo diferencial de `lYe`, `aYe`, `X4n`, `Wce` (`chunk-5mcqvwzx.js`) y
 * `g9r`, `ioe` (`chunk-zgj26xgq.js`) de 2.1.283 contra el porte. Los chunks se
 * evalúan con sus importaciones sustituidas: las de etiquetas por el propio
 * `chunk-0grnxhq4.js` evaluado, las constantes por su valor resuelto con
 * `bin/binary symbol`, y el resto por nada (estas funciones no las usan).
 */
import { formatAgentMessage, messageTagOpenerOffsets, neutralizeMessageTags, scrubPeerMessageText, scrubPeerText, scrubToolMessageContent } from '../../../../src/packages/local-observability/src/uds/peerTextScrub.ts'
import { sliceUnits } from '../../../../src/packages/local-observability/src/uds/displayText.ts'

const root = '_references/claude-code-bin/2.1.283/bunfs-root'
const strip = (text: string, exports: string) => text.replace(/import\{[^}]*\}from"[^"]*";/g, '').replace(/export\{[^}]*\};?\s*$/, `return {${exports}};`)

const tags = new Function('re', 'sf', 'R8e', 't6n', strip(await Bun.file(`${root}/chunk-0grnxhq4.js`).text(), 'DLo,OFe,Do'))(sliceUnits, (x: string) => x, (x: string) => x, '')
const constants = { fj: 'cross-session-message', rN: 'teammate-message', p1t: 'agent-message', amt: [], Fte: 'mcp_send_message', ufn: /^<cross-session-message from="([^"]+)"/ }
const lazy = (build: () => unknown) => { let value: unknown; return () => (value ??= build()) }
const noop = () => undefined
const scrubChunk = strip(await Bun.file(`${root}/chunk-5mcqvwzx.js`).text(), 'aYe,X4n,lYe,Wce').replaceAll('import.meta.require', 'undefined')
const names = ['rN', 'fj', 'p1t', 'amt', 'O', 'Do', 'OFe', 'DLo', 'l', 'U', 'ok', 'Y', 'qe', 'N', 'Wh', 'b', 'zo', 't', 'Se', 'An', 'Re', 'f', 'Gw', 'Nh', 'TFe', 'Pv', 'Hx', 'n6', 'nc', 'cl', 'pA', 'w0', 'gi', 'wye', 'fYe', 'ZFr', 'lh', 'IL', 'mJ', 'r3n', 'qce', 'Zt', 'HP', 'v0', 'pr', 'da', 'pn', 'o', 'u', 'dp', 'Ks', 'D', 'rt']
const values: Record<string, unknown> = { ...constants, Do: tags.Do, OFe: tags.OFe, DLo: tags.DLo, f: lazy, pA: 200 }
const scrub = new Function(...names, scrubChunk)(...names.map(name => values[name] ?? noop))
const envelopeChunk = strip(await Bun.file(`${root}/chunk-zgj26xgq.js`).text(), 'ioe,g9r')
const envelope = new Function('fj', 'ufn', 'aYe', 'X4n', 'Fte', envelopeChunk)(constants.fj, constants.ufn, scrub.aYe, scrub.X4n, constants.Fte)

const alphabet = ['\\\\', '\\n', '\\"', '<', '/', '>', '\\', '"', '{', '[', ']', '}', ':', ',', ' ', '\n', '\\u003c', '\\uff1c', '＜', 'a', 'g', 'e', 'n', 't', '-', 'm', 's', 'ᴀ', 'x', 'u', '003c', 'from-plugin', '=', "'"]
const pieces = ['<agent-message>', '</cross-session-message>', '<cross-session-message from="uds:/a.sock">\n', '<cross-session-message>\n', ' from-plugin="p"', '{"a":"', '["', '<teammate-message>']
let seed = 97
const random = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const sample = () => {
  let text = ''
  const length = Math.floor(random() * 30)
  for (let i = 0; i < length; i++) text += random() < 0.2 ? pieces[Math.floor(random() * pieces.length)] : alphabet[Math.floor(random() * alphabet.length)]
  return text
}

const mismatches: string[] = []
const total = 20000
for (let i = 0; i < total; i++) {
  const body = sample()
  const shape = random()
  const text = shape < 0.3 ? `{"k":"${body}"}` : shape < 0.4 ? `"${body}"` : body
  const blocks = [{ type: 'text', text: sample() }, { type: 'image' }, { type: 'text', text: sample() }]
  const checks: Array<[string, unknown, unknown]> = [
    ['aYe', neutralizeMessageTags(text), scrub.aYe(text)],
    ['X4n', JSON.stringify(messageTagOpenerOffsets(text)), JSON.stringify(scrub.X4n(text))],
    ['lYe', scrubPeerText(text), scrub.lYe(text)],
    ['Wce', formatAgentMessage(text, text), scrub.Wce(text, text)],
    ['g9r', scrubPeerMessageText(text), envelope.g9r(text)],
    ['ioe-text', scrubToolMessageContent(text, 'other'), envelope.ioe(text, 'other')],
    ['ioe-blocks', JSON.stringify(scrubToolMessageContent(blocks, 'other')), JSON.stringify(envelope.ioe(blocks, 'other'))],
  ]
  for (const [name, left, right] of checks) if (left !== right) mismatches.push(`${name} ${JSON.stringify(text)} ours=${JSON.stringify(left)} ref=${JSON.stringify(right)}`)
}
console.log(`entradas=${total} discrepancias=${mismatches.length}`)
for (const line of mismatches.slice(0, 10)) console.log(line)
process.exit(mismatches.length === 0 ? 0 : 1)
