// Clasifica el IDIOMA de cada tramo de comentario, en vez de contar si
// menciona una palabra inglesa.
//
// El medidor anterior (`comment_burden.mjs`) marcaba como ingles todo tramo
// que contuviera una palabra del lexico ingles. Medido sobre 30 tramos de
// cuatro paquetes: 23 de los 30 eran comentarios YA EN ESPAÑOL que citan una
// bandera (`--all`), un termino tecnico (`fire-and-forget`), un programa
// (`which`), un identificador (`this.ws`) o un simbolo de API
// (`Buffer.from()`). Contaba el significante y la conclusion pedida era sobre
// el idioma — sub-patron C de `metrica-decide-la-conclusion.md`.
//
// El criterio nuevo es COMPARATIVO: un tramo es ingles cuando pesa mas su
// lexico que el español. Una cita suelta de simbolo no gana a la prosa que la
// rodea; una frase inglesa entera no tiene lexico español que la equilibre.
//
// Bandera de anulacion: --sin-espanol retira la mitad castellana y devuelve el
// criterio viejo. Retirada, tienen que volver a marcarse EXACTAMENTE los
// falsos positivos, y ninguno de los verdaderos puede cambiar de veredicto.
import ts from '/home/user/thyrox/node_modules/typescript/lib/typescript.js'
import { readFileSync } from 'node:fs'
import { argv, env } from 'node:process'

const DIRECTIVE = /(eslint-disable|eslint-enable|ts-expect-error|ts-ignore|ts-nocheck|biome-ignore|prettier-ignore|@ts-)/

const EN = /(?<!\p{L})(the|this|that|with|from|when|which|only|also|into|these|those|should|would|could|because|before|after|while|about|where|there|their|then|than|they|them|does|doesn't|don't|isn't|we|our|its|it's|for|and|but|not|are|was|were|have|had|will|can|may|must|used|using|per|each|both|same|other|all|any|some|yes)(?!\p{L})/giu

const ES = /(?<!\p{L})(el|la|los|las|lo|un|una|unos|unas|que|de|del|al|y|o|en|con|por|para|como|si|pero|ya|es|son|ser|hay|no|se|su|sus|este|esta|esto|estos|estas|ese|esa|cuando|donde|porque|mientras|antes|despues|sobre|entre|desde|hasta|sin|cada|todo|toda|todos|todas|otro|otra|mismo|misma|aqui|alli|tambien|solo|sólo|más|mas|menos|muy|puede|tiene|hace|vale|queda|sigue|deja|falta|nunca|siempre)(?!\p{L})/giu

function spans (path) {
  const src = readFileSync(path, 'utf8')
  const file = ts.createSourceFile(path, src, ts.ScriptTarget.ESNext, true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const seen = new Map()
  const collect = (ranges) => {
    for (const r of ranges ?? []) {
      if (seen.has(r.pos)) continue
      seen.set(r.pos, {
        text: src.slice(r.pos, r.end),
        line: file.getLineAndCharacterOfPosition(r.pos).line + 1,
      })
    }
  }
  const walk = (n) => {
    collect(ts.getLeadingCommentRanges(src, n.getFullStart()))
    collect(ts.getTrailingCommentRanges(src, n.getEnd()))
    n.forEachChild(walk)
  }
  walk(file)
  collect(ts.getLeadingCommentRanges(src, file.endOfFileToken.getFullStart()))
  return [...seen.values()].sort((a, b) => a.line - b.line)
}

const flags = new Set(argv.slice(2).filter(a => a.startsWith('--')))
const paths = argv.slice(2).filter(a => !a.startsWith('--'))
const usaEspanol = !flags.has('--sin-espanol')

let tot = 0, ing = 0, archIng = 0
for (const path of paths) {
  let cs
  try { cs = spans(path) } catch { continue }
  let n = 0
  for (const c of cs) {
    if (DIRECTIVE.test(c.text)) continue
    tot++
    const en = (c.text.match(EN) ?? []).length
    const es = usaEspanol ? (c.text.match(ES) ?? []).length : 0
    if (en === 0 || en <= es) continue
    ing++; n++
    if (env.DETALLE) {
      console.log(`${path}:${c.line}\ten=${en} es=${es}\t${c.text.replace(/\s+/g, ' ').slice(0, 110)}`)
    }
  }
  if (n > 0) archIng++
}
console.log(`tramos=${tot} en_ingles=${ing} archivos_con_ingles=${archIng} con_espanol=${usaEspanol}`)
