/**
 * Retira las declaraciones de primer nivel muertas de un archivo hasta el
 * punto fijo: la función que nadie llama, y después el ayudante que sólo ella
 * llamaba. Un solo pase deja el ayudante como TS6133 nuevo en el mismo
 * archivo y el verificador rechaza la propuesta (paso 100: 8 de 59 barridos
 * rechazados así, con el racimo entero muerto también en la fuente).
 *
 * QUÉ RETIRA: funciones, clases, interfaces, alias de tipo y `const`/`let`
 * de un solo declarador, NO exportados, que `noUnusedLocals` declara sin uso
 * analizando el archivo solo (un nombre de primer nivel no exportado sólo se
 * usa dentro de su archivo).
 *
 * QUÉ NO RETIRA, a propósito:
 * - un inicializador con llamadas, `new` o `await`: podría tener efectos, y
 *   retirarlo los borra (paso 099, `installPluginBindings`);
 * - una declaración cuyo nombre la FUENTE usa (aparece más de una vez en el
 *   archivo de la fuente): entonces no está muerta allá, y lo que falta es la
 *   parte del porte que la usa. Sin archivo de la fuente, el código es propio
 *   y su muerte no esconde nada.
 *
 * CIEGO A: un uso por nombre en tiempo de ejecución (`eval`, acceso por
 * cadena al ámbito del módulo), que ningún análisis estático ve.
 */
import ts from 'typescript'

const DEAD_CODES = new Set([6133, 6196])
const MAX_ROUNDS = 20

function isPure(node: ts.Node): boolean {
  if (ts.isCallExpression(node) || ts.isNewExpression(node) || ts.isAwaitExpression(node) ||
      ts.isTaggedTemplateExpression(node) || ts.isYieldExpression(node)) {
    return false
  }
  // Los cuerpos de funciones no se ejecutan al declararlas.
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return true
  let pure = true
  node.forEachChild(child => {
    if (pure && !isPure(child)) pure = false
  })
  return pure
}

function exported(statement: ts.Statement): boolean {
  return ts.canHaveModifiers(statement) &&
    (ts.getModifiers(statement) ?? []).some(m => m.kind === ts.SyntaxKind.ExportKeyword ||
                                                m.kind === ts.SyntaxKind.DefaultKeyword)
}

/** El nombre que declara una sentencia de primer nivel removible, o nada. */
function removableName(statement: ts.Statement): string | undefined {
  if (exported(statement)) return undefined
  if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) {
    return statement.name.text
  }
  if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
    return statement.name.text
  }
  if (ts.isVariableStatement(statement)) {
    const [declaration, ...rest] = statement.declarationList.declarations
    if (!declaration || rest.length > 0 || !ts.isIdentifier(declaration.name)) return undefined
    if (declaration.initializer && !isPure(declaration.initializer)) return undefined
    return declaration.name.text
  }
  return undefined
}

/** Los nombres de primer nivel sin uso según `noUnusedLocals`, con el
 * archivo analizado solo: sin resolver imports ni cargar la biblioteca. */
function unusedTopLevel(fileName: string, text: string): Set<string> {
  const options: ts.CompilerOptions = {
    noUnusedLocals: true, noResolve: true, noLib: true, allowJs: true,
    jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
    // Todo archivo del árbol es un módulo; sin esto, uno sin import/export se
    // analiza como script y sus nombres de primer nivel son globales.
    moduleDetection: ts.ModuleDetectionKind.Force,
  }
  const host = ts.createCompilerHost(options)
  const original = host.getSourceFile
  host.getSourceFile = (name, version, ...rest) =>
    name === fileName ? ts.createSourceFile(name, text, version, true) : original(name, version, ...rest)
  const program = ts.createProgram({ rootNames: [fileName], options, host })
  const source = program.getSourceFile(fileName)!
  const names = new Set<string>()
  for (const diagnostic of program.getSemanticDiagnostics(source)) {
    if (!DEAD_CODES.has(diagnostic.code) || diagnostic.start === undefined) continue
    for (const statement of source.statements) {
      if (statement.getStart(source) > diagnostic.start || diagnostic.start >= statement.getEnd()) continue
      const name = removableName(statement)
      const nameNode = (statement as { name?: ts.Node }).name ??
        (ts.isVariableStatement(statement) ? statement.declarationList.declarations[0]?.name : undefined)
      if (name && nameNode && nameNode.getStart(source) === diagnostic.start) names.add(name)
    }
  }
  return names
}

/** Vivo en la fuente: la fuente lo nombra y no cae en SU racimo muerto. Un
 * ayudante que en la fuente sólo llama otra función muerta aparece más de una
 * vez y aun así está muerto allá (paso 101: 7 racimos cortados por contar
 * apariciones en vez de medir el racimo de la fuente). */
function liveInSource(name: string, sourceText: string | undefined, deadInSource: Set<string>): boolean {
  if (sourceText === undefined) return false
  const pattern = new RegExp(`\\b${name.replace(/[$]/g, '\\$')}\\b`)
  return pattern.test(sourceText) && !deadInSource.has(name)
}

/** El racimo muerto de un texto, hasta el punto fijo, sin consultar fuente. */
function deadCluster(fileName: string, text: string): Set<string> {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.ESNext, true)
  const byName = new Map<string, ts.Statement[]>()
  for (const statement of source.statements) {
    const name = removableName(statement)
    if (name) byName.set(name, [...(byName.get(name) ?? []), statement])
  }
  const removed = new Set<string>()
  let current = text
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const fresh = [...unusedTopLevel(fileName, current)].filter(name => byName.has(name) && !removed.has(name))
    if (fresh.length === 0) break
    for (const name of fresh) removed.add(name)
    current = applyRemovals(text, [...removed].flatMap(name => byName.get(name)!))
  }
  return removed
}

/** Las ediciones que retiran el racimo muerto, sobre el texto original. */
export function deadDeclarationEdits(fileName: string, text: string, sourceText?: string): ts.TextChange[] {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.ESNext, true)
  const byName = new Map<string, ts.Statement[]>()
  for (const statement of source.statements) {
    const name = removableName(statement)
    if (name) byName.set(name, [...(byName.get(name) ?? []), statement])
  }
  const deadInSource = sourceText === undefined ? new Set<string>() : deadCluster(fileName, sourceText)
  const removed = new Set<string>()
  let current = text
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const fresh = [...unusedTopLevel(fileName, current)]
      .filter(name => byName.has(name) && !removed.has(name) && !liveInSource(name, sourceText, deadInSource))
    if (fresh.length === 0) break
    for (const name of fresh) removed.add(name)
    current = applyRemovals(text, [...removed].flatMap(name => byName.get(name)!))
  }
  return [...removed].flatMap(name => byName.get(name)!)
    .map(statement => removal(text, statement))
    .sort((a, b) => b.span.start - a.span.start)
}

function removal(text: string, statement: ts.Statement): ts.TextChange {
  // Desde el inicio de la línea de su primer comentario ADOSADO (sin línea en
  // blanco entre él y la sentencia) hasta el fin de la sentencia y su salto de
  // línea. Un comentario separado por una línea en blanco —la cabecera del
  // archivo, una sección— no es de la declaración y se queda.
  let start = statement.getStart()
  const comments = ts.getLeadingCommentRanges(text, statement.getFullStart()) ?? []
  for (let i = comments.length - 1; i >= 0; i--) {
    const gap = text.slice(comments[i]!.end, start)
    if (/\n\s*\n/.test(gap)) break
    start = comments[i]!.pos
  }
  while (start > 0 && text[start - 1] !== '\n') start -= 1
  let end = statement.getEnd()
  while (end < text.length && (text[end] === ' ' || text[end] === '\t')) end += 1
  if (text[end] === '\n') end += 1
  return { span: { start, length: end - start }, newText: '' }
}

function applyRemovals(text: string, statements: ts.Statement[]): string {
  const changes = statements.map(statement => removal(text, statement))
    .sort((a, b) => b.span.start - a.span.start)
  let result = text
  for (const change of changes) {
    result = result.slice(0, change.span.start) + change.newText + result.slice(change.span.start + change.span.length)
  }
  return result
}
