/**
 * Oráculo diferencial: evalúa `chunk-0grnxhq4.js` de 2.1.283 (sin sus
 * importaciones, que estas funciones no usan) y compara `DLo(...).neutralize`,
 * `openerOffsets`, `Pfn`, `Qce`, `CFt` y `PL` con el porte sobre entradas
 * generadas. Imprime el recuento de discrepancias y las primeras.
 */
import { createTagFormScrubber, foldConfusables } from '../../../../src/packages/local-observability/src/uds/tagFormScrub.ts'
import { escapeTagClose, escapeTagOpenOrClose, normalizeTagLookalikes } from '../../../../src/packages/local-observability/src/uds/tagClose.ts'
import { sliceUnits } from '../../../../src/packages/local-observability/src/uds/displayText.ts'

const raw = await Bun.file('_references/claude-code-bin/2.1.283/bunfs-root/chunk-0grnxhq4.js').text()
const body = raw.replace(/import\{[^}]*\}from"[^"]*";/g, '').replace(/export\{[^}]*\};?\s*$/, 'return {DLo,Pfn,Qce,CFt,PL};')
const reference = new Function('re', 'sf', 'R8e', 't6n', body)(sliceUnits, (x: string) => x, (x: string) => x, '') as Record<string, any>

const tags = ['cross-session-message', 'teammate-message', 'agent-message']
const ours = createTagFormScrubber([{ tags }])
const theirs = reference.DLo([{ tags }])

const alphabet = ['<', '/', '>', '\\', ' ', '​', '＜', '∕', 'a', 'A', 'ᴀ', 'а', 'g', 'e', 'n', 't', '-', '_', '—', 'm', 's', 'c', 'r', 'o', 'i', 'l', 'ß', '𝐚', 'x', '́', '', 'M', 'E']
const pieces = ['<agent-message>', '</teammate-message>', '<cross-session-message from="x">', '<\\agent-message>', 'agent', 'message']
let seed = 20260928
const random = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const sample = () => {
  let text = ''
  const length = Math.floor(random() * 40)
  for (let i = 0; i < length; i++) text += random() < 0.15 ? pieces[Math.floor(random() * pieces.length)] : alphabet[Math.floor(random() * alphabet.length)]
  return text
}

const mismatches: string[] = []
const total = 20000
for (let i = 0; i < total; i++) {
  const text = sample()
  const checks: Array<[string, unknown, unknown]> = [
    ['neutralize', ours.neutralize(text), theirs.neutralize(text)],
    ['openerOffsets', JSON.stringify(ours.openerOffsets(text)), JSON.stringify(theirs.openerOffsets(text))],
    ['Pfn', foldConfusables(text), reference.Pfn(text)],
    ['Qce', escapeTagClose('agent-message', text), reference.Qce('agent-message', text)],
    ['CFt', escapeTagOpenOrClose('agent-message', text), reference.CFt('agent-message', text)],
    ['PL', normalizeTagLookalikes(text), reference.PL(text)],
  ]
  for (const [name, left, right] of checks) if (left !== right) mismatches.push(`${name} ${JSON.stringify(text)} ours=${JSON.stringify(left)} ref=${JSON.stringify(right)}`)
}
console.log(`entradas=${total} discrepancias=${mismatches.length}`)
for (const line of mismatches.slice(0, 10)) console.log(line)
process.exit(mismatches.length === 0 ? 0 : 1)
