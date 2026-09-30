/**
 * Oráculo diferencial: evalúa `chunk-vq0drrah.js`, `chunk-pbnxt79v.js` y
 * `chunk-0grnxhq4.js` de 2.1.283 encadenados por sus importaciones y compara
 * con el porte: el texto de cada patrón (`lz`, `Ofn`, `Hfn`, `LLo` con la
 * especificación que usa el ejecutable) y la salida de `yJ`, `RUr`, `sf`,
 * `R8e` y de los patrones aplicados, sobre entradas generadas.
 */
import {
  LEAD_HEX_ID,
  LEAD_SPAN,
  antmlColonScrubPattern,
  bracketedLeadScrubPattern,
  channelSourceScrubPattern,
  confusableTagScrubPattern,
  escapeInvisibleCharacters,
  escapedOpener,
  neutralizeTag,
} from '../../../../src/packages/local-observability/src/uds/confusableTagPatterns.ts'
import { escapeFormatCharacters, stripInvisibleFormatting } from '../../../../src/packages/local-observability/src/uds/unicodeSanitize.ts'

const root = '_references/claude-code-bin/2.1.283/bunfs-root'
const load = async (chunk: string, imports: string[], exports: string) => {
  const raw = await Bun.file(`${root}/${chunk}`).text()
  return raw.replace(/import\{[^}]*\}from"[^"]*";/g, '').replace(/export\{[^}]*\};?\s*$/, `return {${exports}};`)
}
const strings = new Function(await load('chunk-vq0drrah.js', [], 're,Mz,fr'))() as Record<string, any>
const sanitize = new Function('re', 'Mz', 'fr', await load('chunk-pbnxt79v.js', [], 'sf,R8e,t6n'))(strings.re, strings.Mz, strings.fr) as Record<string, any>
const tags = new Function('re', 'sf', 'R8e', 't6n', await load('chunk-0grnxhq4.js', [], 'lz,cu,Ofn,Hfn,LLo,yJ,RUr,RYe,y3n,sne'))(strings.re, sanitize.sf, sanitize.R8e, sanitize.t6n) as Record<string, any>

const spec = (hex: symbol, span: symbol) => [['artifact', hex], ['artifact', span, 'owned', 'by', 'you'], ['artifact', span, 'raw', 'html', 'follows'], ['artifact', span, 'summary', 'below'], ['artifact', span, 'shared', 'with', 'you'], ['artifact', span, 'published', 'from', 'your'], ['artifact', span, 'live', 'version'], ['artifact', span, 'published', 'by', 'a', 'writer'], ['this', 'version', 'has', span, 'published', 'files'], ['stored', 'for', 'the', 'live', 'version'], ['origin', 'of', 'this', 'version'], ['created', 'from', 'the', 'artifact', 'type'], ['end', 'of', 'live', 'content'], ['this', 'artifact', span, 'ships', 'an', 'instructions', 'file'], ['could', 'not', 'check', 'whether', 'this', 'artifact'], ['design', 'system', 'not', 'attached'], ['a', 'quickstart', 'in', 'this', 'conversation'], ['how', 'to', 'build', 'and', 'iterate', 'on']]

const pairs: Array<[string, RegExp, RegExp]> = [
  ['lz system-reminder', confusableTagScrubPattern(['system-reminder']), tags.lz(['system-reminder'])],
  ['lz varios', confusableTagScrubPattern(['cross-session-message', 'teammate-message', 'a1_b']), tags.lz(['cross-session-message', 'teammate-message', 'a1_b'])],
  ['lz cola vacía', confusableTagScrubPattern(['untrusted-content'], () => ''), tags.lz(['untrusted-content'], () => '')],
  ['Ofn', channelSourceScrubPattern(), tags.Ofn()],
  ['Hfn', antmlColonScrubPattern(), tags.Hfn()],
  ['LLo', bracketedLeadScrubPattern(spec(LEAD_HEX_ID, LEAD_SPAN) as never), tags.LLo(spec(tags.y3n, tags.sne))],
]
const mismatches: string[] = []
for (const [name, ours, theirs] of pairs) {
  if (ours.source !== theirs.source || ours.flags !== theirs.flags) mismatches.push(`${name}: el texto del patrón difiere`)
}

const alphabet = ['<', '/', '>', '\\', ' ', '[', ']', '［', '​', '＜', '∕', 'a', 'ａ', 'а', 'g', 'e', 'n', 't', '-', '_', '—', 'm', 's', 'c', 'r', 'o', 'i', 'l', 'ß', '𝐚', 'x', '́', '\u2028', '\u0085', '\ud800', '\u3164', '\ue000', '：', '=', '"', '0', 'f', '9', '.']
const pieces = ['<agent-message>', '<channel source="x">', '<invoke', '[artifact "x" owned by you]', '[artifact 0123abcd-ab12-cd34-', '[end of live content]', '<system-reminder>', 'artifact', 'owned by you', 'agent', 'message', 'channel ', 'source=']
let seed = 20260928
const random = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const sample = () => {
  let text = ''
  const length = Math.floor(random() * 40)
  for (let i = 0; i < length; i++) text += random() < 0.2 ? pieces[Math.floor(random() * pieces.length)] : alphabet[Math.floor(random() * alphabet.length)]
  return text
}
const total = 20000
for (let i = 0; i < total; i++) {
  const text = sample()
  const checks: Array<[string, unknown, unknown]> = [
    ['yJ', neutralizeTag('agent-message', text), tags.yJ('agent-message', text)],
    ['RUr', escapeInvisibleCharacters(text), tags.RUr(text)],
    ['sf', stripInvisibleFormatting(text), sanitize.sf(text)],
    ['R8e', escapeFormatCharacters(text), sanitize.R8e(text)],
  ]
  for (const [name, ours, theirs] of pairs) checks.push([`${name} aplicado`, text.replace(ours, escapedOpener), text.replace(theirs, tags.RYe)])
  for (const [name, left, right] of checks) if (left !== right) mismatches.push(`${name} ${JSON.stringify(text)} ours=${JSON.stringify(left)} ref=${JSON.stringify(right)}`)
}
console.log(`patrones=${pairs.length} entradas=${total} discrepancias=${mismatches.length}`)
for (const line of mismatches.slice(0, 10)) console.log(line)
process.exit(mismatches.length === 0 ? 0 : 1)
