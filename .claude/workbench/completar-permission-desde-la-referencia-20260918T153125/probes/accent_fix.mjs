#!/usr/bin/env node
// Aplica SOLO las sustituciones de la clase INEQUIVOCA del censo, y sólo
// dentro de un span de comentario que el AST devuelve.
//
// Por qué la clase ambigua no entra: `esta`/`está`, `mas`/`más`, `si`/`sí` son
// palabras distintas con la forma sin tilde tambien valida, así que una
// sustitución en bloque produciría la palabra equivocada en la mitad de los
// casos. Esas se deciden leyendo la línea.
//
// El control que discrimina es only_comments_changed.mjs: si una sustitución
// tocara un identificador o un literal de cadena, el cuerpo emitido divergiría
// del de la referencia y ese control saldría rojo.
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import ts from '/home/user/thyrox/node_modules/typescript/lib/typescript.js'

const censo = await import(pathToFileURL(new URL('./accent_census.mjs', import.meta.url).pathname).href)
  .catch(() => null)

// El censo no exporta su tabla; se relee del propio archivo para no tener dos
// copias de la lista que se desincronicen.
const fuente = readFileSync(new URL('./accent_census.mjs', import.meta.url), 'utf8')
const bloque = fuente.slice(fuente.indexOf('const INEQUIVOCA = {'), fuente.indexOf('// La forma sin tilde existe'))
const TABLA = {}
for (const m of bloque.matchAll(/(\w+):\s*'([^']+)'/g)) TABLA[m[1]] = m[2]

const DIRECTIVA = /(eslint-disable|eslint-enable|ts-expect-error|ts-ignore|ts-nocheck|biome-ignore|prettier-ignore|@ts-)/

function spansDeComentario (ruta, texto) {
  const sf = ts.createSourceFile(ruta, texto, ts.ScriptTarget.ESNext, true,
    ruta.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const vistos = new Set(); const out = []
  const recoger = rangos => {
    for (const r of rangos ?? []) {
      const k = `${r.pos}:${r.end}`
      if (vistos.has(k)) continue
      vistos.add(k)
      if (DIRECTIVA.test(texto.slice(r.pos, r.end))) continue
      out.push([r.pos, r.end])
    }
  }
  const visitar = n => {
    recoger(ts.getLeadingCommentRanges(texto, n.pos))
    recoger(ts.getTrailingCommentRanges(texto, n.end))
    ts.forEachChild(n, visitar)
  }
  visitar(sf); recoger(ts.getLeadingCommentRanges(texto, 0))
  return out.sort((a, b) => a[0] - b[0])
}

const conservaCaja = (orig, fix) =>
  orig[0] === orig[0].toUpperCase() ? fix[0].toUpperCase() + fix.slice(1) : fix

let totalArchivos = 0, totalCambios = 0
const seco = process.argv.includes('--dry-run')
for (const ruta of process.argv.slice(2).filter(a => !a.startsWith('--'))) {
  const texto = readFileSync(ruta, 'utf8')
  const spans = spansDeComentario(ruta, texto)
  let salida = '', cursor = 0, cambios = 0
  for (const [pos, end] of spans) {
    salida += texto.slice(cursor, pos)
    salida += texto.slice(pos, end).replace(/\b([a-záéíóúñüA-ZÁÉÍÓÚÑÜ]+)\b/g, w => {
      const fix = TABLA[w.toLowerCase()]
      if (!fix) return w
      cambios++
      return conservaCaja(w, fix)
    })
    cursor = end
  }
  salida += texto.slice(cursor)
  if (!cambios) continue
  totalArchivos++; totalCambios += cambios
  if (!seco) writeFileSync(ruta, salida)
  console.log(`${cambios}\t${ruta}`)
}
console.log(`\narchivos=${totalArchivos}  sustituciones=${totalCambios}${seco ? '  (dry-run)' : ''}`)
