// Mide la carga de traduccion: por cada archivo ausente, cuantos tramos de
// comentario tiene y cuantos de ellos estan en ingles. El discriminador de
// idioma es lexico cerrado de palabras funcionales inglesas que el español no
// comparte — no morfologia, porque un comentario corto no la tiene.
import ts from 'typescript'
import { readFileSync } from 'node:fs'
const DIRECTIVE = /(eslint-disable|eslint-enable|ts-expect-error|ts-ignore|ts-nocheck|biome-ignore|prettier-ignore|@ts-)/

const EN = /(?<!\p{L})(the|this|that|with|from|when|which|only|also|into|these|those|should|would|could|because|before|after|while|about|where|there|their|then|than|they|them|does|doesn't|don't|isn't|we|our|its|it's|for|and|but|not|are|was|were|have|had|will|can|may|must|used|using|per|each|both|same|other|all|any|some|yes)(?!\p{L})/iu

function spans(file) {
  const src = readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true)
  const seen = new Set()
  const out = []
  const push = r => {
    const k = `${r.pos}:${r.end}`
    if (seen.has(k)) return
    seen.add(k)
    out.push(src.slice(r.pos, r.end))
  }
  const walk = n => {
    for (const r of ts.getLeadingCommentRanges(src, n.getFullStart()) ?? []) push(r)
    for (const r of ts.getTrailingCommentRanges(src, n.getEnd()) ?? []) push(r)
    n.forEachChild(walk)
  }
  walk(sf)
  return out
}

let totF = 0, totC = 0, totEn = 0, filesEn = 0
for (const rel of process.argv.slice(3)) {
  const file = `${process.argv[2]}/${rel}`
  let cs
  try { cs = spans(file) } catch { continue }
  const en = cs.filter(c => !DIRECTIVE.test(c) && EN.test(c)).length
  totF++; totC += cs.length; totEn += en
  if (en > 0) filesEn++
  if (process.env.DETALLE) console.log(`${cs.length}\t${en}\t${rel}`)
}
console.log(`archivos=${totF} con_ingles=${filesEn} tramos=${totC} tramos_en_ingles=${totEn}`)
