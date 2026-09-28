/** Busca caracteres cuya lectura cambia si no se sustituyen los guiones Unicode por '-'. */
import { foldConfusables } from '../../../../src/packages/local-observability/src/uds/tagFormScrub.ts'
const dash = /[\p{Pd}−⁻₋˗➖⁃ーｰ]/gu
const found: string[] = []
for (let code = 128; code < 0x30000 && found.length < 5; code++) {
  if (code >= 0xd800 && code <= 0xdfff) continue
  const c = String.fromCodePoint(code)
  const folded = foldConfusables(c)
  const withDash = folded.replace(dash, '-').toLowerCase().replace(/ß/g, 'ss')
  const without = folded.toLowerCase().replace(/ß/g, 'ss')
  if (/^[a-z0-9_-]+$/.test(withDash) && !/^[a-z0-9_-]+$/.test(without) && withDash.length > 1) found.push(`${code.toString(16)} ${JSON.stringify(folded)}`)
}
console.log(found.join('\n') || 'ninguno')
