// Avance de la traducción, DERIVADO del árbol — no de una lista que alguien
// mantiene a mano. Un archivo está traducido cuando su texto de comentario
// difiere del de la referencia; sigue pendiente cuando es idéntico.
//
// El criterio es exacto para lo que mide (¿se tocó el comentario?) y ciego a
// la fidelidad: traducir mal cuenta igual que traducir bien. Esa mitad no la
// juzga ningún instrumento mecánico.
import ts from '/home/user/thyrox/node_modules/typescript/lib/typescript.js'
import { readFileSync } from 'node:fs'
import { argv } from 'node:process'

const REFERENCE = process.env.PERMISSION_REF
  ?? '/home/user/claude-code-nestor-monroy-tools/packages/permission'
const PORT = process.env.PERMISSION_PORT
  ?? '/home/user/thyrox/src/packages/permission'
const DIRECTIVE = /(eslint-disable|eslint-enable|ts-expect-error|ts-ignore|ts-nocheck|biome-ignore|prettier-ignore|@ts-)/

function commentText (path) {
  const source = readFileSync(path, 'utf8')
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.ESNext, true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const seen = new Map()
  const collect = (ranges) => {
    for (const range of ranges ?? []) {
      if (seen.has(range.pos)) continue
      const text = source.slice(range.pos, range.end)
      if (!DIRECTIVE.test(text)) seen.set(range.pos, text)
    }
  }
  const walk = (node) => {
    collect(ts.getLeadingCommentRanges(source, node.getFullStart()))
    collect(ts.getTrailingCommentRanges(source, node.getEnd()))
    node.forEachChild(walk)
  }
  walk(file)
  collect(ts.getLeadingCommentRanges(source, file.endOfFileToken.getFullStart()))
  return [...seen.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]).join('\n')
}

const relatives = argv.slice(2)
let done = 0, pending = 0, pendingLines = 0
const pendingList = []
for (const relative of relatives) {
  const before = commentText(`${REFERENCE}/${relative}`)
  const after = commentText(`${PORT}/${relative}`)
  if (before === '') continue
  if (before === after) {
    pending += 1
    const lines = before.split('\n').length
    pendingLines += lines
    pendingList.push([lines, relative])
  } else done += 1
}
pendingList.sort((a, b) => b[0] - a[0])
for (const [lines, relative] of pendingList) console.log(`${lines}\t${relative}`)
console.error(`traducidos=${done}  pendientes=${pending}  lineas pendientes=${pendingLines}`)
