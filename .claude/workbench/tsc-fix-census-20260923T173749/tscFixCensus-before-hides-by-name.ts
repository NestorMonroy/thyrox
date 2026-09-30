/**
 * Censo de proponentes baratos del lazo tsc cero: para cada diagnóstico del
 * proyecto, los code fixes que ofrece el servicio de lenguaje de TypeScript y
 * la CLASE de cada uno.
 *
 * La clasificación es la del plan (`kaupamex-docs: …/resolve-all-thyrox-errors/
 * plan-tsc-zero.rst`, «Qué proponente entra al lazo automático»):
 *
 *   safe        cierra el error sin tocar la conducta; entra en automático
 *   judgment    cambia una firma o una forma; va a la cola residual
 *   hides       tapa el error (`as unknown`, un nombre adivinado); NUNCA entra
 *   unclassified un fixId fuera de la lista; no se admite hasta clasificarlo
 *
 * La lista es CERRADA a propósito: un code fix que tapa el error pasa tsc, así
 * que un censo que admitiera por defecto contaría como resuelto lo que sólo
 * se escondió.
 *
 * `inferFromUsage` es `safe` porque sólo anota un tipo y el runtime no cambia;
 * la anotación puede ser laxa (`any`), y eso lo juzga tsc en la verificación,
 * no esta clasificación.
 *
 * Métrica: diagnósticos sintácticos y semánticos por archivo del servicio de
 * lenguaje, y sus code fixes. Ciega a: el universo de `tsc --noEmit`, que no es
 * el mismo (medido: el servicio contó más diagnósticos sobre el mismo árbol);
 * las cifras de uno y otro no se suman ni se restan.
 */
import ts from 'typescript'
import { createProjectService } from './tsLanguageService'

export type FixClass = 'safe' | 'judgment' | 'hides' | 'unclassified'

export type CensusFix = { fixName: string; fixId?: string; klass: FixClass }

export type CensusRow = { code: number; file: string; start: number; fixes: CensusFix[] }

const BY_FIX_ID: Record<string, FixClass> = {
  unusedIdentifier_deleteImports: 'safe',
  inferFromUsage: 'safe',
  unusedIdentifier_delete: 'judgment',
  unusedIdentifier_prefix: 'judgment',
  addMissingParam: 'judgment',
  addOptionalParam: 'judgment',
  fixMissingMember: 'judgment',
  fixMissingProperties: 'judgment',
  addMissingAwait: 'judgment',
  addConvertToUnknownForNonOverlappingTypes: 'hides',
  fixSpelling: 'hides',
}

// Cuando TypeScript no da `fixId` (un arreglo que no se combina), sólo queda
// el `fixName`. `unusedIdentifier` sin id no dice si borra un import o un
// parámetro, así que no puede ser `safe`.
const BY_FIX_NAME: Record<string, FixClass> = {
  inferFromUsage: 'safe',
  unusedIdentifier: 'judgment',
  fixMissingMember: 'judgment',
  addConvertToUnknownForNonOverlappingTypes: 'hides',
  spelling: 'hides',
}

export function classifyFix(fixName: string, fixId?: string): FixClass {
  if (fixId !== undefined && fixId in BY_FIX_ID) return BY_FIX_ID[fixId]
  if (fixId === undefined && fixName in BY_FIX_NAME) return BY_FIX_NAME[fixName]
  return 'unclassified'
}

/**
 * `unusedIdentifier` se clasifica por su EFECTO, no por su nombre: medido, el
 * servicio sólo pone `fixId` (`unusedIdentifier_deleteImports`) cuando hay más
 * de una instancia arreglable en el archivo, así que el id no sirve de clave.
 * Si todas sus ediciones son borrados dentro de declaraciones `import`, es el
 * retiro de un import sin uso: seguro. Cualquier otra cosa —borrar o prefijar
 * un parámetro, borrar un local— cambia una firma o una forma: juicio.
 */
function classifyAction(fix: ts.CodeFixAction, sf: ts.SourceFile): FixClass {
  if (fix.fixName !== 'unusedIdentifier') return classifyFix(fix.fixName, fix.fixId === undefined ? undefined : String(fix.fixId))
  const imports = sf.statements.filter(ts.isImportDeclaration)
  const edits = fix.changes.flatMap(change => (change.fileName === sf.fileName ? change.textChanges : [null]))
  const onlyImportDeletions =
    edits.length > 0 &&
    edits.every(
      edit =>
        edit !== null &&
        edit.newText.trim() === '' &&
        imports.some(
          declaration =>
            declaration.getStart(sf) <= edit.span.start &&
            edit.span.start + edit.span.length <= declaration.getEnd() + 1,
        ),
    )
  return onlyImportDeletions ? 'safe' : 'judgment'
}

export function censusFixes(service: ts.LanguageService, files?: string[]): CensusRow[] {
  const program = service.getProgram()
  if (!program) throw new Error('el servicio de lenguaje no tiene programa')
  const sources = files
    ? files.map(file => program.getSourceFile(file)).filter((sf): sf is ts.SourceFile => !!sf)
    : program.getSourceFiles().filter(sf => !sf.isDeclarationFile && !sf.fileName.includes('/node_modules/'))
  const rows: CensusRow[] = []
  for (const sf of sources) {
    const diagnostics = [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)]
    for (const diagnostic of diagnostics) {
      if (diagnostic.start === undefined) continue
      const end = diagnostic.start + (diagnostic.length ?? 0)
      const seen = new Set<string>()
      const fixes: CensusFix[] = []
      for (const fix of service.getCodeFixesAtPosition(sf.fileName, diagnostic.start, end, [diagnostic.code], {}, {})) {
        const fixId = fix.fixId === undefined ? undefined : String(fix.fixId)
        const key = `${fix.fixName}:${fixId ?? ''}`
        if (seen.has(key)) continue
        seen.add(key)
        fixes.push({ fixName: fix.fixName, fixId, klass: classifyAction(fix, sf) })
      }
      rows.push({ code: diagnostic.code, file: sf.fileName, start: diagnostic.start, fixes })
    }
  }
  return rows
}

export type CensusSummary = {
  diagnostics: number
  withAnyFix: number
  withSafeFix: number
  byClass: Record<FixClass, number>
  byFix: Record<string, { klass: FixClass; count: number }>
}

export function summarize(rows: CensusRow[]): CensusSummary {
  const byClass: Record<FixClass, number> = { safe: 0, judgment: 0, hides: 0, unclassified: 0 }
  const byFix: CensusSummary['byFix'] = {}
  for (const row of rows) {
    for (const fix of row.fixes) {
      byClass[fix.klass] += 1
      const key = fix.fixId ?? fix.fixName
      byFix[key] = { klass: fix.klass, count: (byFix[key]?.count ?? 0) + 1 }
    }
  }
  return {
    diagnostics: rows.length,
    withAnyFix: rows.filter(row => row.fixes.length > 0).length,
    withSafeFix: rows.filter(row => row.fixes.some(fix => fix.klass === 'safe')).length,
    byClass,
    byFix,
  }
}

if (import.meta.main) {
  // Uso: bun src/verify/tscFixCensus.ts <tsconfig> [--json]
  const args = process.argv.slice(2)
  const json = args.includes('--json')
  const [tsconfig] = args.filter(arg => arg !== '--json')
  if (!tsconfig) {
    console.error('uso: tsc_fix_census <tsconfig> [--json]')
    process.exit(2)
  }
  const rows = censusFixes(createProjectService(tsconfig))
  const cwd = process.cwd() + '/'
  if (json) {
    process.stdout.write(JSON.stringify({ rows, summary: summarize(rows) }) + '\n')
  } else {
    for (const row of rows) {
      const fixes = row.fixes.map(fix => `${fix.fixId ?? fix.fixName}=${fix.klass}`).join(',') || '-'
      process.stdout.write(`TS${row.code}\t${row.file.replace(cwd, '')}\t${row.start}\t${fixes}\n`)
    }
  }
  const summary = summarize(rows)
  // El denominador acompaña a cada cifra: sin él, un censo ciego y uno correcto
  // publican lo mismo.
  console.error(
    `tsc_fix_census: ${summary.withSafeFix} con arreglo seguro, ${summary.withAnyFix} con algún ` +
      `arreglo, de ${summary.diagnostics} diagnósticos (servicio de lenguaje, no tsc --noEmit)`,
  )
}
