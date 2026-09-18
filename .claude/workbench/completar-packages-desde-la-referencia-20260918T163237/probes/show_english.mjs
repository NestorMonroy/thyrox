// Vuelca los tramos de comentario en ingles de un archivo, con su linea, para
// decidir uno por uno si son prosa a traducir o ancla que se conserva.
import ts from 'typescript'
import { readFileSync } from 'node:fs'
const DIRECTIVE = /(eslint-disable|eslint-enable|ts-expect-error|ts-ignore|ts-nocheck|biome-ignore|prettier-ignore|@ts-)/
const EN = /(?<!\p{L})(the|this|that|with|from|when|which|only|also|into|these|those|should|would|could|because|before|after|while|about|where|there|their|then|than|they|them|does|doesn't|don't|isn't|we|our|its|it's|for|and|but|not|are|was|were|have|had|will|can|may|must|used|using|per|each|both|same|other|all|any|some|yes)(?!\p{L})/iu
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true)
  const seen = new Set()
  const walk = n => {
    for (const r of [...(ts.getLeadingCommentRanges(src, n.getFullStart()) ?? []),
                     ...(ts.getTrailingCommentRanges(src, n.getEnd()) ?? [])]) {
      const k = `${r.pos}:${r.end}`
      if (seen.has(k)) continue
      seen.add(k)
      const t = src.slice(r.pos, r.end)
      if (DIRECTIVE.test(t) || !EN.test(t)) continue
      const line = src.slice(0, r.pos).split('\n').length
      const hit = t.match(EN)[0]
      console.log(`${file}:${line}\t[${hit}]\t${t.replace(/\n/g, ' ⏎ ').slice(0, 150)}`)
    }
    n.forEachChild(walk)
  }
  walk(sf)
}
