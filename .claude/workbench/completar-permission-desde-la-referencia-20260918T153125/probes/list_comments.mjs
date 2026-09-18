// Lista los comentarios REALES de un archivo TypeScript, con su rango de
// líneas. El censo por expresión regular cuenta como comentario un `*` de una
// lista markdown dentro de un template literal; el compilador no.
//
// El recorrido es por AST con `getLeadingCommentRanges`/`getTrailingCommentRanges`,
// no con `createScanner` suelto: un escáner alimentado a mano se desincroniza
// ante un template literal o una expresión regular y deja de reportar. Medido
// en yoloClassifier.ts — el escáner publicaba 8 líneas de comentario y el
// archivo tiene un bloque JSDoc vivo en la línea 105.
import ts from '/home/user/thyrox/node_modules/typescript/lib/typescript.js'
import { readFileSync } from 'node:fs'
import { argv } from 'node:process'

const DIRECTIVE = /(eslint-disable|eslint-enable|ts-expect-error|ts-ignore|ts-nocheck|biome-ignore|prettier-ignore|@ts-)/

function commentSpans (path) {
  const source = readFileSync(path, 'utf8')
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.ESNext, true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const seen = new Map()
  const collect = (ranges) => {
    for (const range of ranges ?? []) {
      if (seen.has(range.pos)) continue
      const text = source.slice(range.pos, range.end)
      if (DIRECTIVE.test(text)) continue
      seen.set(range.pos, [
        file.getLineAndCharacterOfPosition(range.pos).line + 1,
        file.getLineAndCharacterOfPosition(range.end).line + 1,
      ])
    }
  }
  const walk = (node) => {
    collect(ts.getLeadingCommentRanges(source, node.getFullStart()))
    collect(ts.getTrailingCommentRanges(source, node.getEnd()))
    node.forEachChild(walk)
  }
  walk(file)
  collect(ts.getLeadingCommentRanges(source, file.endOfFileToken.getFullStart()))
  return [...seen.values()].sort((a, b) => a[0] - b[0])
}

let total = 0
for (const path of argv.slice(2)) {
  const spans = commentSpans(path)
  const merged = []
  for (const span of spans) {
    const last = merged[merged.length - 1]
    if (last && span[0] <= last[1] + 1) last[1] = Math.max(last[1], span[1])
    else merged.push([...span])
  }
  const lines = merged.reduce((sum, [a, b]) => sum + (b - a + 1), 0)
  total += lines
  console.log(`${lines}\t${path}\t${merged.map(([a, b]) => a === b ? a : `${a}-${b}`).join(',')}`)
}
console.error(`archivos=${argv.length - 2}  lineas de comentario real=${total}`)
