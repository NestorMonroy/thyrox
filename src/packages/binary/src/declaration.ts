/**
 * Extrae del payload la declaracion COMPLETA que contiene un literal.
 *
 * El ancla es el LITERAL, no el nombre del simbolo, y esa eleccion es la
 * unica idea de este modulo. El payload esta minificado: sus bindings se
 * renombran en cada reconstruccion. La tabla de ventanas del limite de uso
 * se llama `E0e` en la build 2.1.266 y `x0` en 2.1.274 — mismo mecanismo,
 * otro nombre. Un extractor que reciba el identificador devolveria cero
 * sobre la build nueva, y ese cero se leeria como «el mecanismo ya no
 * esta»: mediria el significante y concluiria sobre el significado. Lo que
 * sobrevive a la reconstruccion son los literales de cadena y de numero,
 * porque son datos del programa y no nombres suyos.
 *
 * Por que NO hay ventana que ensanchar, a diferencia de la forma madura de
 * la que este modulo desciende (`kaupamex-docs: .claude/eventos/
 * extraer-modulos-completos-20260823T030614/delimitador.py`): aquella
 * analizaba el bundle ENTERO de 28 MB por simbolo, asi que necesitaba
 * recortar una ventana y ensancharla hasta que el nodo cerrara antes del
 * borde. Aqui el corpus ya viene partido por modulo — lo parte `writeCorpus`
 * de este mismo paquete — y un modulo de 5.4 MB se analiza en 1.51 s con
 * 396 MB de RSS (medido sobre `chunk-ayyj05ne.js` de 2.1.274). La ventana
 * deja de ser necesaria, y con ella su guarda de «cierra dentro de la
 * ventana»: no se omite en silencio, se declara que el corpus partido la
 * vuelve inaplicable.
 *
 * La guarda que SI carga el peso aqui es otra: un literal cuenta como sitio
 * cuando es el texto COMPLETO de un nodo — cadena, TRAMO DE PLANTILLA,
 * nombre de propiedad, identificador o numero — nunca cuando es una
 * subcadena de un literal mayor. Sin ella entra la prosa de ayuda de la
 * linea de estado — un TemplateHead de 11 776 bytes donde se DOCUMENTA el
 * campo `used_percentage` — y produciria sitios que no son codigo.
 *
 * No requiere instalar nada: `typescript` ya es dependencia declarada del
 * arbol, y su analizador da posiciones de byte sobre JavaScript.
 */
import ts from 'typescript'

/** Un sitio donde el literal aparece como NODO, no como subcadena. */
export type LiteralSite = {
  /** Offset del nodo que contiene el literal. */
  start: number
  end: number
  /** Nombre del tipo de nodo, tal como lo llama el analizador. */
  kind: string
}

/** La declaracion completa que envuelve a un sitio. */
export type Declaration = {
  start: number
  end: number
  text: string
  kind: string
  /** El binding que la nombra en ESTA build, o null si no lo tiene. */
  binding: string | null
}

/** Tipos de nodo que cuentan como «la declaracion» a la que se sube. */
const DECLARATION_KINDS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.VariableStatement,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.ExpressionStatement,
  ts.SyntaxKind.ReturnStatement,
])

function parse(source: string, name = 'payload.js'): ts.SourceFile {
  return ts.createSourceFile(name, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)
}

let parseCount = 0
let lastParsed: { source: string; file: ts.SourceFile } | null = null

/**
 * El árbol de `source`, analizado UNA vez por texto. Sobre un chunk de 5,4 MB
 * el análisis domina el coste, y `extractByLiteral` lo pagaba dos veces por
 * llamada y una por cada pregunta sobre el mismo texto. Un solo registro
 * basta: las llamadas llegan agrupadas por texto.
 */
export function parseSource(source: string): ts.SourceFile {
  if (lastParsed !== null && lastParsed.source === source) return lastParsed.file
  parseCount++
  const file = parse(source)
  lastParsed = { source, file }
  return file
}

/** Cuántas veces se analizó un texto completo; lo lee la suite, no el código. */
export function parseCountForTesting(): number {
  return parseCount
}

/**
 * El texto del nodo SIN sus comillas ni su espacio a la izquierda.
 *
 * `getText()` de un nodo de cadena devuelve el literal con sus comillas, y
 * las comillas no forman parte del dato. Para todo lo demas el texto del
 * nodo es el dato.
 */
function nodeValue(node: ts.Node): string | null {
  if (ts.isStringLiteralLike(node)) return node.text
  // Un tramo de plantilla es dato igual que una cadena: el payload compone
  // el nombre de cabecera por interpolacion — `anthropic-ratelimit-unified-`
  // vive en el TemplateHead de `szo`. `isStringLiteralLike` NO lo cubre (solo
  // StringLiteral y NoSubstitutionTemplateLiteral), asi que sin esta rama el
  // prefijo da 43 apariciones por texto y CERO sitios: la funcion que lee las
  // tres cabeceras no se puede recuperar por ningun literal suyo.
  if (ts.isTemplateLiteralToken(node)) return node.text
  if (ts.isNumericLiteral(node)) return node.text
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) return node.text
  return null
}

/**
 * Sitios donde el literal es el texto completo de un nodo.
 *
 * La igualdad es por texto completo, no por inclusion: una plantilla de
 * ayuda que MENCIONA el nombre del campo tiene ese nombre como subcadena de
 * su propio texto, y eso no es un uso del dato sino prosa sobre el.
 */
export function findLiteralSites(source: string, literal: string): LiteralSite[] {
  const sourceFile = parseSource(source)
  const sites: LiteralSite[] = []
  const visit = (node: ts.Node): void => {
    if (nodeValue(node) === literal) {
      sites.push({ start: node.getStart(sourceFile), end: node.getEnd(), kind: ts.SyntaxKind[node.kind] })
    }
    node.forEachChild(visit)
  }
  sourceFile.forEachChild(visit)
  return sites
}

/** El binding que nombra a una declaracion, cuando lo tiene. */
function bindingOf(node: ts.Node): string | null {
  if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
    return node.name?.text ?? null
  }
  if (ts.isVariableStatement(node)) {
    const first = node.declarationList.declarations[0]
    return first && ts.isIdentifier(first.name) ? first.name.text : null
  }
  if (ts.isMethodDeclaration(node) || ts.isPropertyAssignment(node)) {
    return ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name) ? node.name.text : null
  }
  return null
}

/**
 * La declaracion MAS EXTERNA que contiene el offset.
 *
 * Se sube hasta la ultima de las declarativas antes de llegar al archivo:
 * el interes es la unidad citable, no el nodo minimo que contiene el dato.
 */
function enclosingDeclaration(sourceFile: ts.SourceFile, start: number, end: number): ts.Node | null {
  let best: ts.Node | null = null
  const visit = (node: ts.Node): void => {
    if (node.getStart(sourceFile) > start || node.getEnd() < end) return
    if (DECLARATION_KINDS.has(node.kind)) {
      if (best === null || node.getStart(sourceFile) <= best.getStart(sourceFile)) best = node
    }
    node.forEachChild(visit)
  }
  sourceFile.forEachChild(visit)
  return best
}

/** Las declaraciones que contienen el literal, sin repetir. */
export function extractByLiteral(source: string, literal: string): Declaration[] {
  const sourceFile = parseSource(source)
  const sites = findLiteralSites(source, literal)
  const seen = new Set<string>()
  const out: Declaration[] = []
  for (const site of sites) {
    const node = enclosingDeclaration(sourceFile, site.start, site.end)
    if (node === null) continue
    const start = node.getStart(sourceFile)
    const end = node.getEnd()
    const clave = `${start}:${end}`
    if (seen.has(clave)) continue
    seen.add(clave)
    out.push({
      start,
      end,
      text: source.slice(start, end),
      kind: ts.SyntaxKind[node.kind],
      binding: bindingOf(node),
    })
  }
  return out
}

/** ¿El fragmento es, por si solo, sintacticamente completo? */
export function parsesClean(fragment: string): boolean {
  const sourceFile = parse(fragment, 'fragmento.js')
  // `parseDiagnostics` no es publico en el tipo, pero es la unica via que da
  // el analizador para saber si el texto entro con errores de sintaxis.
  const diagnostics = (sourceFile as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics
  return Array.isArray(diagnostics) ? diagnostics.length === 0 : false
}
