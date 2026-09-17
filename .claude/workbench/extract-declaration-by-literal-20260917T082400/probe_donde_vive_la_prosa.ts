/**
 * Sonda: en QUE tipo de nodo vive cada aparicion textual del literal.
 *
 * El control de anulacion no cayo sobre el corpus real. Antes de tocar la
 * asercion hay que saber por que: si la prosa que la guarda debe excluir no
 * es siquiera alcanzable por el predicado, entonces lo que la excluye no es
 * la guarda, y la asercion pasa por una razon distinta de la que declara.
 */
import * as ts from 'typescript'
import { readFileSync } from 'node:fs'

const CHUNK = '_references/claude-code-bin/2.1.274/bunfs-root/chunk-ayyj05ne.js'
const LITERAL = 'used_percentage'
const src = readFileSync(CHUNK, 'utf8')
const sourceFile = ts.createSourceFile('payload.js', src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)

// Todo nodo cuyo TEXTO FUENTE contiene el literal y que no tiene hijo que
// tambien lo contenga: el nodo MINIMO que lo alberga, sea del tipo que sea.
const minimal: { kind: string; length: number; muestra: string }[] = []
const visit = (node: ts.Node): void => {
  const text = node.getText(sourceFile)
  if (!text.includes(LITERAL)) return
  let hijoLoTiene = false
  node.forEachChild((child) => {
    if (child.getText(sourceFile).includes(LITERAL)) hijoLoTiene = true
  })
  if (!hijoLoTiene) {
    minimal.push({
      kind: ts.SyntaxKind[node.kind],
      length: node.getEnd() - node.getStart(sourceFile),
      muestra: text.slice(0, 70).replace(/\n/g, '\\n'),
    })
  }
  node.forEachChild(visit)
}
sourceFile.forEachChild(visit)

console.log('nodos minimos que albergan el literal:', minimal.length)
for (const m of minimal) console.log(`  ${m.kind.padEnd(28)} len=${String(m.length).padStart(6)}  ${m.muestra}`)
