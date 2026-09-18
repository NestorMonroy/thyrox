// Reescribe el alcance del monorepo fuente al de este árbol en los
// ESPECIFICADORES de módulo, y sólo ahí.
//
// Dos condiciones, cada una con su razón y su control de anulación:
//
//   (a) la ocurrencia NO cae dentro de un rango de comentario — la prosa que
//       cita a `ccnmt` nombra a la FUENTE; reescribirla la volvería falsa
//       (10 comentarios citan un especificador entre comillas: dicen qué
//       import de la fuente haría fallar el módulo, o qué reexporta la línea
//       original. Con el alcance nuevo esa frase deja de ser cierta).
//
//   (b) el `@` va precedido inmediatamente por `'` o `"` — un especificador
//       real siempre abre comilla; la prosa usa acento grave o texto llano.
//
// El rango de comentario se obtiene por AST (`getLeadingCommentRanges` /
// `getTrailingCommentRanges`), no por heurística de línea: una heurística de
// «la línea empieza con *» no ve un comentario de bloque cuyas líneas
// interiores no lo lleven, ni un comentario final de línea tras código.
//
// Banderas de anulación, para el control: --sin-comentario retira (a),
// --sin-comilla retira (b). Retirada cada una tiene que caer exactamente lo
// que depende de ella.
import ts from '/home/user/thyrox/node_modules/typescript/lib/typescript.js'
import { readFileSync, writeFileSync } from 'node:fs'
import { argv } from 'node:process'

const VIEJO = '@claude-code-how-works/'
const NUEVO = '@thyrox/'

const flags = new Set(argv.slice(2).filter(a => a.startsWith('--')))
const paths = argv.slice(2).filter(a => !a.startsWith('--'))
const aplica = flags.has('--aplicar')
const usaComentario = !flags.has('--sin-comentario')
const usaComilla = !flags.has('--sin-comilla')

function commentRanges (path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.ESNext, true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const seen = new Map()
  const collect = (ranges) => {
    for (const r of ranges ?? []) if (!seen.has(r.pos)) seen.set(r.pos, [r.pos, r.end])
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

let tocados = 0, sustituidos = 0, saltadosComentario = 0, saltadosComilla = 0
for (const path of paths) {
  const source = readFileSync(path, 'utf8')
  if (!source.includes(VIEJO)) continue
  const esTs = /\.(ts|tsx|mts|cts)$/.test(path)
  const rangos = (usaComentario && esTs) ? commentRanges(path, source) : []
  const dentro = (i) => rangos.some(([a, b]) => i >= a && i < b)

  let salida = '', cursor = 0, hechos = 0
  for (let i = source.indexOf(VIEJO); i !== -1; i = source.indexOf(VIEJO, i + 1)) {
    if (usaComentario && dentro(i)) { saltadosComentario++; continue }
    if (usaComilla && source[i - 1] !== "'" && source[i - 1] !== '"') { saltadosComilla++; continue }
    salida += source.slice(cursor, i) + NUEVO
    cursor = i + VIEJO.length
    hechos++
  }
  if (!hechos) continue
  salida += source.slice(cursor)
  tocados++; sustituidos += hechos
  if (aplica) writeFileSync(path, salida)
}
console.log(`archivos=${tocados} sustituciones=${sustituidos} ` +
  `saltados_por_comentario=${saltadosComentario} saltados_por_comilla=${saltadosComilla} ` +
  `aplicado=${aplica}`)
