/**
 * Oráculo diferencial: evalúa `chunk-vq0drrah.js` y `chunk-pbnxt79v.js` de
 * 2.1.283 encadenados y compara cada saneador exportado con el porte sobre
 * entradas generadas.
 */
import * as ours from '../../../../src/packages/local-observability/src/uds/unicodeSanitize.ts'
import { sliceUnits } from '../../../../src/packages/local-observability/src/uds/stringUnits.ts'

const root = '_references/claude-code-bin/2.1.283/bunfs-root'
const load = async (chunk: string, exports: string) => (await Bun.file(`${root}/${chunk}`).text()).replace(/import\{[^}]*\}from"[^"]*";/g, '').replace(/export\{[^}]*\};?\s*$/, `return {${exports}};`)
const strings = new Function(await load('chunk-vq0drrah.js', 're,Mz,fr'))() as Record<string, any>
const ref = new Function('re', 'Mz', 'fr', await load('chunk-pbnxt79v.js', 'wt,cde,YH,sf,Cy,Njr,H_,wl,vUe,Tn,PJ,OJ,po,QE,Egn,v6,R8e,t6n'))(strings.re, strings.Mz, strings.fr) as Record<string, any>

const attempt = (run: () => unknown) => {
  try {
    return JSON.stringify(run())
  } catch (error) {
    return `throw ${(error as Error).message}`
  }
}
const alphabet = ['a', 'Z', ' ', '\t', '\n', '\r', '\x07', '\x1b[31m', '\x1b[0m', '\u0085', '\u200b', '\u200d', '\ufe0f', '\u2028', '\u2029', '\u2800', '\u034f', '\u115f', '\ud800', '\udc00', '😀', '\ue000', '\ufeff', '\u202e', 'ﬁ', 'ñ', '\\u0041', '\\', '[', ']', '(', ')', '!', ':', '`', '<', '>', '\u{e0041}', '\u{fffff}', '𝐚']
let seed = 20260928
const random = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const sample = () => {
  let text = ''
  const length = Math.floor(random() * 40)
  for (let i = 0; i < length; i++) text += alphabet[Math.floor(random() * alphabet.length)]
  return text
}
const mismatches: string[] = []
if (ours.CONTROL_CHAR_CLASS !== ref.cde) mismatches.push('cde difiere')
if (ours.MARKDOWN_SENSITIVE_CHARS.source !== ref.Egn.source) mismatches.push('Egn difiere')
const total = 20000
for (let i = 0; i < total; i++) {
  const text = sample()
  const limit = Math.floor(random() * 12)
  const checks: Array<[string, string, string]> = [
    ['re', attempt(() => sliceUnits(text, limit)), attempt(() => strings.re(text, limit))],
    ['Mz', attempt(() => ours.stripLoneSurrogates(text)), attempt(() => strings.Mz(text))],
    ['fr', attempt(() => ours.collapseControls(text)), attempt(() => strings.fr(text))],
    ['wt', attempt(() => ours.stripAnsiEscapes(text)), attempt(() => ref.wt(text))],
    ['YH', attempt(() => ours.replaceControls(text, '_')), attempt(() => ref.YH(text, '_'))],
    ['YH joiners', attempt(() => ours.replaceControls(text, ' ', { keepEmojiJoiners: true })), attempt(() => ref.YH(text, ' ', { keepEmojiJoiners: true }))],
    ['YH newlines', attempt(() => ours.replaceControls(text, ' ', { keepNewlines: true })), attempt(() => ref.YH(text, ' ', { keepNewlines: true }))],
    ['sf', attempt(() => ours.stripInvisibleFormatting(text)), attempt(() => ref.sf(text))],
    ['Cy', attempt(() => ours.stripIgnorables(text)), attempt(() => ref.Cy(text))],
    ['Njr', attempt(() => ours.sanitizeUnicodeToFixedPoint(text)), attempt(() => ref.Njr(text))],
    ['H_', attempt(() => ours.sanitizeUnicodeDeep({ [text]: [text, 1, null, { k: text }] })), attempt(() => ref.H_({ [text]: [text, 1, null, { k: text }] }))],
    ['wl', attempt(() => ours.escapeForAsciiLog(text)), attempt(() => ref.wl(text))],
    ['vUe', attempt(() => ours.escapeNonPrintableAscii(text)), attempt(() => ref.vUe(text))],
    ['Tn', attempt(() => ours.controlsToSpace(text)), attempt(() => ref.Tn(text))],
    ['PJ', attempt(() => ours.escapeHiddenCharacters(text)), attempt(() => ref.PJ(text))],
    ['OJ', attempt(() => ours.flattenControls(text)), attempt(() => ref.OJ(text))],
    ['po', attempt(() => ours.toSingleLine(text, { drop: /[ab]/g, maxCodeUnits: limit })), attempt(() => ref.po(text, { drop: /[ab]/g, maxCodeUnits: limit }))],
    ['QE', attempt(() => ours.sanitizeMarkdownLabel(text)), attempt(() => ref.QE(text))],
    ['v6', attempt(() => ours.sanitizeMarkdownText(text)), attempt(() => ref.v6(text))],
    ['R8e', attempt(() => ours.escapeFormatCharacters(text)), attempt(() => ref.R8e(text))],
    ['t6n', attempt(() => ours.unicodeEscape(text)), attempt(() => ref.t6n(text))],
  ]
  for (const [name, left, right] of checks) if (left !== right) mismatches.push(`${name} ${JSON.stringify(text)} ours=${left} ref=${right}`)
}
console.log(`entradas=${total} discrepancias=${mismatches.length}`)
for (const line of mismatches.slice(0, 10)) console.log(line)
process.exit(mismatches.length === 0 ? 0 : 1)
