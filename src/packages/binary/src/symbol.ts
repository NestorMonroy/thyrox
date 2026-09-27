/**
 * Extrae un símbolo del corpus por su NOMBRE, con el árbol sintáctico.
 *
 * Sustituye al extractor de banco `probes/extraer.ts`, que buscaba el texto
 * `function NOMBRE(` y crecía hasta el primer `}` con el que el fragmento
 * parseaba. Ese método tenía cinco límites, medidos al verificar los portes
 * de 2.1.275 (hallazgo H-THYROX-172):
 *
 * 1. sólo veía `function`/`async function`: ni `var|let|const NOMBRE=`, ni
 *    `class`, ni `function*`, ni los métodos de una clase (éstos se añadieron
 *    después, al no encontrar `refreshClients` del pool de sockets);
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
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

import { parseSource } from './declaration.ts'

export type SymbolKind = 'function' | 'variable' | 'class' | 'method' | 'external'
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
  } else if (
    (ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) &&
    ts.isIdentifier(node.name)
  ) {
    name = node.name.text
    kind = 'method'
  } else if (
    ts.isPropertyDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.initializer !== undefined &&
    (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
  ) {
    // Un campo de clase que guarda una función es, para leerlo, un método.
    name = node.name.text
    kind = 'method'
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

/** Los chunks del propio ejecutable viven bajo `/$bunfs/root/`. */
function isCorpusSpecifier(specifier: string): boolean {
  return specifier.startsWith('/$bunfs/root/')
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
      const specifier = statement.moduleSpecifier.text
      // Un módulo fuera del corpus (`fs/promises`, `node:path`) no tiene
      // chunk que leer: la definición es suya y se declara, no se busca.
      if (!isCorpusSpecifier(specifier)) {
        return [{ name: imported, kind: 'external', scope: 'top', start: statement.getStart(file),
                  end: statement.end, text: statement.getText(file), file: specifier }]
      }
      const target = corpusPath(specifier)
      const targetSource = readFileSync(join(root, target), 'utf8')
      const local = exportedLocalName(targetSource, imported) ?? imported
      return resolveSymbol(root, target, local, depth + 1)
    }
  }
  // Ni definición de nivel superior ni import: los métodos de clase del chunk,
  // que no se exportan por nombre y sólo se alcanzan leyendo la clase.
  return extractSymbol(source, name)
    .filter(d => d.kind === 'method')
    .map(d => ({ ...d, file: chunk }))
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


/** Un uso de un símbolo: dónde está y qué miembro llama. */
export type SymbolReference = {
  file: string
  start: number
  /** El tipo de la declaración de nivel superior que contiene el uso. */
  kind: string
  binding: string | null
  /** `x().m` o `x.m`: el miembro al que el uso accede; null si ninguno. */
  member: string | null
}

/** Los nombres con que `export{local as exported}` publica `local`. */
function exportedNamesOf(source: string, local: string): string[] {
  const file = parseSource(source)
  const names: string[] = []
  for (const statement of file.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.exportClause) continue
    if (!ts.isNamedExports(statement.exportClause)) continue
    for (const element of statement.exportClause.elements) {
      if ((element.propertyName ?? element.name).text === local) names.push(element.name.text)
    }
  }
  return names
}

/** Los nombres locales con que `source` importa alguno de `exported` desde `specifier`. */
function localNamesImported(file: ts.SourceFile, specifier: string, exported: ReadonlySet<string>): string[] {
  const names: string[] = []
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
    if (statement.moduleSpecifier.text !== specifier) continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    for (const element of bindings.elements) {
      if (exported.has((element.propertyName ?? element.name).text)) names.push(element.name.text)
    }
  }
  return names
}

function topLevelStatement(node: ts.Node): ts.Node {
  let current = node
  while (current.parent && !ts.isSourceFile(current.parent)) current = current.parent
  return current
}

function bindingOfStatement(statement: ts.Node): string | null {
  if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) return statement.name.text
  if (ts.isVariableStatement(statement)) {
    const first = statement.declarationList.declarations[0]
    if (first && ts.isIdentifier(first.name)) return first.name.text
  }
  return null
}

function memberAccessed(node: ts.Identifier): string | null {
  const parent = node.parent
  if (ts.isPropertyAccessExpression(parent) && parent.expression === node) return parent.name.text
  if (ts.isCallExpression(parent) && parent.expression === node) {
    const outer = parent.parent
    if (ts.isPropertyAccessExpression(outer) && outer.expression === parent) return outer.name.text
  }
  return null
}

/** ¿Es este identificador un USO, y no la declaración, un import/export o un nombre de propiedad? */
function isUse(node: ts.Identifier): boolean {
  const parent = node.parent
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)) return false
  if ((ts.isFunctionDeclaration(parent) || ts.isClassDeclaration(parent) || ts.isVariableDeclaration(parent)
       || ts.isParameter(parent)) && parent.name === node) return false
  if ((ts.isPropertyAccessExpression(parent) || ts.isPropertyAssignment(parent)) && parent.name === node) return false
  return true
}

function usesIn(file: ts.SourceFile, fileName: string, locals: ReadonlySet<string>): SymbolReference[] {
  const found: SymbolReference[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && locals.has(node.text) && isUse(node)) {
      const statement = topLevelStatement(node)
      found.push({ file: fileName, start: node.getStart(file), kind: ts.SyntaxKind[statement.kind],
                   binding: bindingOfStatement(statement), member: memberAccessed(node) })
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return found
}

/** Los usos de `name` vistos desde su chunk y en todo chunk que lo importa. */
export type ReferenceScan = { references: SymbolReference[]; exportedAs: string[]; chunks: number }

export function scanReferences(root: string, chunk: string, name: string): ReferenceScan {
  const source = readFileSync(join(root, chunk), 'utf8')
  const exportedAs = exportedNamesOf(source, name)
  const specifier = `/$bunfs/root/${chunk}`
  const chunks = readdirSync(root).filter(f => f.endsWith('.js')).sort()
  const references: SymbolReference[] = []
  for (const fileName of chunks) {
    if (fileName === chunk) {
      references.push(...usesIn(parseSource(source), fileName, new Set([name])))
      continue
    }
    if (exportedAs.length === 0) continue
    const text = readFileSync(join(root, fileName), 'utf8')
    if (!text.includes(specifier)) continue
    const file = parseSource(text)
    const locals = localNamesImported(file, specifier, new Set(exportedAs))
    if (locals.length > 0) references.push(...usesIn(file, fileName, new Set(locals)))
  }
  return { references, exportedAs, chunks: chunks.length }
}

export function referencesOf(root: string, chunk: string, name: string): SymbolReference[] {
  return scanReferences(root, chunk, name).references
}
