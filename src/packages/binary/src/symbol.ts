/**
 * Extrae un símbolo del corpus por su NOMBRE, con el árbol sintáctico.
 *
 * Sustituye al extractor de banco `probes/extraer.ts`, que buscaba el texto
 * `function NOMBRE(` y crecía hasta el primer `}` con el que el fragmento
 * parseaba. Ese método tenía cinco límites, medidos al verificar los portes
 * de 2.1.275 (hallazgo H-THYROX-172):
 *
 * 1. sólo veía `function`/`async function`: ni `var|let|const NOMBRE=`, ni
 *    `class`, ni `function*`;
 * 2. tomaba la PRIMERA aparición textual, que en código minificado suele ser
 *    una función anidada homónima de otra;
 * 3. no seguía `import{…}from"…chunk"` ni los alias de `export{x as y}`;
 * 4. reanalizaba el fragmento en cada `}` (cuadrático) y callaba pasado un
 *    tope de 60 kB;
 * 5. vivía en un banco, no en el producto.
 *
 * Aquí el chunk se analiza UNA vez (`parseSource`, con caché por texto), se
 * devuelven TODAS las definiciones con su alcance (`top` o `nested`) y su
 * forma, y `resolveSymbol` sigue los alias entre chunks. El ancla sigue
 * siendo el nombre, que la reconstrucción cambia: para buscar un mecanismo
 * entre builds, el ancla correcta es un literal (`extractByLiteral`); éste
 * sirve para leer una build concreta una vez localizado el nombre.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

import { parseSource } from './declaration.ts'

export type SymbolKind = 'function' | 'variable' | 'class'
export type SymbolDefinition = {
  name: string
  kind: SymbolKind
  scope: 'top' | 'nested'
  start: number
  end: number
  text: string
}
export type ResolvedSymbol = SymbolDefinition & { file: string }

function isTopLevel(node: ts.Node): boolean {
  let current = node.parent
  while (current && !ts.isSourceFile(current)) {
    if (ts.isFunctionLike(current) || ts.isClassLike(current) || ts.isBlock(current)) return false
    current = current.parent
  }
  return true
}

function definitionOf(node: ts.Node, source: string, file: ts.SourceFile): SymbolDefinition | null {
  let name: string | undefined
  let kind: SymbolKind | undefined
  if (ts.isFunctionDeclaration(node) && node.name) {
    name = node.name.text
    kind = 'function'
  } else if (ts.isClassDeclaration(node) && node.name) {
    name = node.name.text
    kind = 'class'
  } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    name = node.name.text
    kind = 'variable'
  }
  if (name === undefined || kind === undefined) return null
  const start = node.getStart(file)
  return { name, kind, scope: isTopLevel(node) ? 'top' : 'nested', start, end: node.end,
           text: source.slice(start, node.end) }
}

/** Todas las definiciones de `name` en `source`, en orden de aparición. */
export function extractSymbol(source: string, name: string): SymbolDefinition[] {
  if (!source.includes(name)) return []
  const file = parseSource(source)
  const found: SymbolDefinition[] = []
  const visit = (node: ts.Node): void => {
    const definition = definitionOf(node, source, file)
    if (definition && definition.name === name) found.push(definition)
    ts.forEachChild(node, visit)
  }
  visit(file)
  return found
}

/** `"/$bunfs/root/chunk-x.js"` → `chunk-x.js`, relativo a la raíz del corpus. */
function corpusPath(specifier: string): string {
  return specifier.replace(/^\/\$bunfs\/root\//, '')
}

/**
 * Las definiciones de `name` vistas desde `chunk`: las propias de nivel
 * superior si las hay; si no, las del chunk del que se importa, siguiendo el
 * alias local del import y el alias del export.
 */
export function resolveSymbol(root: string, chunk: string, name: string, depth = 0): ResolvedSymbol[] {
  const source = readFileSync(join(root, chunk), 'utf8')
  const own = extractSymbol(source, name).filter(d => d.scope === 'top')
  if (own.length > 0 || depth > 8) return own.map(d => ({ ...d, file: chunk }))
  const file = parseSource(source)
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    for (const element of bindings.elements) {
      if (element.name.text !== name) continue
      const imported = (element.propertyName ?? element.name).text
      const target = corpusPath(statement.moduleSpecifier.text)
      const targetSource = readFileSync(join(root, target), 'utf8')
      const local = exportedLocalName(targetSource, imported) ?? imported
      return resolveSymbol(root, target, local, depth + 1)
    }
  }
  return []
}

/** El nombre local que `export{local as exported}` publica como `exported`. */
function exportedLocalName(source: string, exported: string): string | null {
  const file = parseSource(source)
  for (const statement of file.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.exportClause) continue
    if (!ts.isNamedExports(statement.exportClause)) continue
    for (const element of statement.exportClause.elements) {
      if (element.name.text === exported) return (element.propertyName ?? element.name).text
    }
  }
  return null
}

