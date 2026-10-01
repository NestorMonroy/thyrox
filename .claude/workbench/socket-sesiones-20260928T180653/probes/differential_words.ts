/**
 * Oráculo diferencial de `E$t` y `TDo` (`chunk-fvmr4qjr.js` de 2.1.283).
 * `TDo` se evalúa con las listas de thyrox, que son divergencia declarada de
 * datos: se compara el mecanismo, no el vocabulario.
 */
import { ADJECTIVES, NOUNS, shortWordSlugFromSeed, slugFromText } from '../../../../src/packages/tool-registry/src/words.ts'

const raw = await Bun.file('_references/claude-code-bin/2.1.283/bunfs-root/chunk-fvmr4qjr.js').text()
const body = raw.replace(/import\{[^}]*\}from"[^"]*";/g, '').replace(/export\{[^}]*\};?\s*$/, 'return {E$t,TDo,setLists:(a,n)=>{t=a;o=n}};').replace(/var t=\[/, 'let t=[').replace(/,o=\[/, ';let o=[')
const ref = new Function('randomBytes', 'randomInt', body)(() => new Uint8Array(4), () => 0) as { E$t: (text: string, options?: object) => string; TDo: (seed: Uint8Array) => string; setLists: (a: readonly string[], n: readonly string[]) => void }
ref.setLists(ADJECTIVES, NOUNS)

let seed = 20260928
const random = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const pieces = ['Fix', 'the', ' ', '  ', '\n', 'ñandú', '¡Hola,', 'mundo!', '[Pasted text #1 +3 lines]', '[Image #2]', '[Audio #9]', '[...Truncated text #4 +10 lines...]', '---', 'A1', 'x_y', '[Image #]', 'MAYÚS']
const mismatches: string[] = []
const total = 20000
for (let index = 0; index < total; index++) {
  let text = ''
  const length = Math.floor(random() * 12)
  for (let piece = 0; piece < length; piece++) text += pieces[Math.floor(random() * pieces.length)]
  const options = random() < 0.5 ? {} : { words: Math.floor(random() * 6), maxLen: Math.floor(random() * 50) }
  if (slugFromText(text, options) !== ref.E$t(text, options)) mismatches.push(`E$t ${JSON.stringify(text)} ${JSON.stringify(options)}`)
  const bytes = new Uint8Array(8 + Math.floor(random() * 4))
  for (let byte = 0; byte < bytes.length; byte++) bytes[byte] = Math.floor(random() * 256)
  const offset = Math.floor(random() * (bytes.length - 7))
  if (shortWordSlugFromSeed(bytes.subarray(offset)) !== ref.TDo(bytes.subarray(offset))) mismatches.push(`TDo ${bytes.join(',')} @${offset}`)
}
console.log(`entradas=${total} discrepancias=${mismatches.length}`)
for (const line of mismatches.slice(0, 8)) console.log(line)
process.exit(mismatches.length === 0 ? 0 : 1)
