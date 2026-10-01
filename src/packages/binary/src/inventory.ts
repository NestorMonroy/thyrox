/**
 * El inventario de un chunk: todas sus declaraciones de nivel superior y los
 * eventos `tengu_*` que emite cada una.
 *
 * `literal` y `symbol` responden «dónde está esto» a partir de algo ya
 * conocido. Antes de portar un subsistema hace falta la pregunta anterior:
 * qué contiene entero. Sin ella, un análisis que parte de un literal ve sólo
 * lo que ese literal toca, y el resto del chunk queda fuera sin que nada lo
 * diga.
 */
import ts from 'typescript'

import { parseSource } from './declaration.ts'

export type TopLevelKind = 'function' | 'class' | 'variable'

export type TopLevelDeclaration = {
  name: string
  kind: TopLevelKind
  start: number
  end: number
  /** Nombres de los métodos, sólo en una clase. */
  methods?: string[]
  /** Los eventos `tengu_*` que la declaración nombra, sin repetir, en orden. */
  events: string[]
}

const EVENT = /^tengu_[a-z0-9_]+$/

function eventsIn(node: ts.Node): string[] {
  const found: string[] = []
  const visit = (child: ts.Node): void => {
    if ((ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) && EVENT.test(child.text)) {
      if (!found.includes(child.text)) found.push(child.text)
    }
    ts.forEachChild(child, visit)
  }
  visit(node)
  return found
}

function methodNames(node: ts.ClassDeclaration): string[] {
  const names: string[] = []
  for (const member of node.members) {
    if (member.name && ts.isIdentifier(member.name)) names.push(member.name.text)
  }
  return names
}

/** Las declaraciones de nivel superior de `source`, en orden de aparición. */
export function listTopLevelDeclarations(source: string): TopLevelDeclaration[] {
  const file = parseSource(source)
  const found: TopLevelDeclaration[] = []
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      found.push({ name: statement.name.text, kind: 'function', start: statement.getStart(file),
                   end: statement.end, events: eventsIn(statement) })
    } else if (ts.isClassDeclaration(statement) && statement.name) {
      found.push({ name: statement.name.text, kind: 'class', start: statement.getStart(file),
                   end: statement.end, methods: methodNames(statement), events: eventsIn(statement) })
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue
        found.push({ name: declaration.name.text, kind: 'variable', start: declaration.getStart(file),
                     end: declaration.end, events: eventsIn(declaration) })
      }
    }
  }
  return found
}
