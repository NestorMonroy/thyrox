/**
 * Aserción no nula en las PRUEBAS donde tsc señala un valor posiblemente
 * `undefined` (TS2532, TS18048): se inserta `!` justo al final del tramo que
 * el diagnóstico marca.
 *
 * POR QUÉ SÓLO EN PRUEBAS. La fuente compila con `strict: false`, el árbol con
 * `strict` y `noUncheckedIndexedAccess`, así que `expect(calls[0].x)` da
 * TS2532 en cada índice. En una prueba `!` no cambia nada en tiempo de
 * ejecución: si el valor falta, la prueba cae igual —con un TypeError en vez
 * de una aserción—. En código de producto la misma inserción escondería un
 * defecto real, y esa decisión es de juicio: aquí no se toma.
 *
 * QUÉ MIDE: los diagnósticos 2532/18048 del checker en archivos de prueba.
 * CIEGO A: si el valor puede faltar de verdad en la prueba; el `!` convierte
 * ese caso en un TypeError, que sigue siendo un rojo.
 */
import ts from 'typescript'
import { applyEdits, createMemoryService, DEFAULT_OPTIONS } from './tsLanguageService'

export const POSSIBLY_UNDEFINED_CODES: ReadonlySet<number> = new Set([2532, 18048])

const TEST_FILE = /(^|\/)(__tests__|tests)\/|\.test\.tsx?$/

export function isTestFile(fileName: string): boolean {
  return TEST_FILE.test(fileName)
}

export function nonNullInTestEdits(service: ts.LanguageService, fileName: string): ts.TextChange[] {
  if (!isTestFile(fileName)) return []
  const text = service.getProgram()?.getSourceFile(fileName)?.text ?? ''
  const ends = new Set<number>()
  for (const diagnostic of service.getSemanticDiagnostics(fileName)) {
    if (!POSSIBLY_UNDEFINED_CODES.has(diagnostic.code) || diagnostic.start === undefined) continue
    const end = diagnostic.start + (diagnostic.length ?? 0)
    // Ya afirmado, o el tramo termina en `?` de una cadena opcional: nada.
    if (text[end] === '!' || text[end] === '?') continue
    ends.add(end)
  }
  return [...ends].map(end => ({ span: { start: end, length: 0 }, newText: '!' }))
}

/** Variante en memoria para las pruebas: `sources` es el universo entero. */
export function applyNonNullInTests(
  sources: Record<string, string>,
  targets: string[],
  options: ts.CompilerOptions = { ...DEFAULT_OPTIONS, noUncheckedIndexedAccess: true },
): Map<string, string> {
  const { service } = createMemoryService(sources, options)
  const changed = new Map<string, string>()
  for (const fileName of targets) {
    const edits = nonNullInTestEdits(service, fileName)
    if (edits.length) changed.set(fileName, applyEdits(sources[fileName]!, edits))
  }
  return changed
}
