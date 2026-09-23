/**
 * `tscFixCensus`: para cada diagnóstico, los code fixes que ofrece el servicio
 * de TypeScript y la CLASE de cada uno según el plan tsc cero
 * (`kaupamex-docs: …/resolve-all-thyrox-errors/plan-tsc-zero.rst`).
 *
 * La mitad de juicio es la clasificación: un code fix que TAPA el error
 * (`as unknown`, un nombre adivinado) pasa tsc, y el lazo lo aceptaría si
 * esta herramienta lo contara como admitido. Por eso la lista es cerrada y
 * un `fixId` que no está en ella no se admite.
 */
import { describe, expect, test } from 'bun:test'
import { censusFixes, classifyFix, summarize } from '../../src/verify/tscFixCensus'
import { createMemoryService } from '../../src/verify/tsLanguageService'

const base = { '/p/dep.ts': 'export const used = 1\nexport const unused = 2\n' }

function rowsFor(source: string) {
  const { service } = createMemoryService({ ...base, '/p/main.ts': source })
  return censusFixes(service, ['/p/main.ts'])
}

describe('tscFixCensus', () => {
  test('control del arnés: la fixture resuelve sus módulos', () => {
    const rows = rowsFor("import { used } from './dep'\nconsole.log(used)\n")
    expect(rows.map(row => row.code)).not.toContain(2307)
  })

  // Medido: el servicio sólo pone `fixId` cuando hay más de una instancia
  // arreglable en el archivo. Por eso ningún caso depende de su presencia:
  // clasificar por `fixId` haría que la clase dependiera de cuántos errores
  // hermanos tenga el archivo.
  test('un import sin uso, SOLO en su archivo, trae un arreglo seguro', () => {
    const [row] = rowsFor("import { used, unused } from './dep'\nconsole.log(used)\n")
    expect(row.code).toBe(6133)
    expect(row.fixes.some(fix => fix.fixName === 'unusedIdentifier' && fix.klass === 'safe')).toBe(true)
  })

  test('un parámetro sin uso NO es seguro: retirarlo cambia la firma', () => {
    const rows = rowsFor('export function f(p: number) { return 1 }\n')
    const row = rows.find(r => r.code === 6133)!
    expect(row.fixes.length).toBeGreaterThan(0)
    expect(row.fixes.every(fix => fix.klass !== 'safe')).toBe(true)
  })

  test('un parámetro sin tipo trae inferFromUsage, seguro', () => {
    const rows = rowsFor('export function f(x) { return x * 2 }\n')
    const row = rows.find(r => r.code === 7006)!
    expect(row.fixes.some(fix => fix.fixName === 'inferFromUsage' && fix.klass === 'safe')).toBe(true)
  })

  test('una conversión sin solape trae un arreglo que TAPA el error', () => {
    const rows = rowsFor("export const n = 'a' as number\n")
    const row = rows.find(r => r.code === 2352)!
    expect(
      row.fixes.some(
        fix => fix.fixName === 'addConvertToUnknownForNonOverlappingTypes' && fix.klass === 'hides',
      ),
    ).toBe(true)
  })

  test('con DOS instancias en el archivo (fixId presente) sigue tapando', () => {
    // La tabla por `fixId` sólo se ejerce cuando el servicio pone el id, que
    // es con más de una instancia: sin este caso, retirar su entrada no tumbaba
    // nada (anulación `NONDISCRIMINATING-hides-entry` en el banco).
    const rows = rowsFor("export const n = 'a' as number\nexport const m = 'b' as number\n")
    const row = rows.find(r => r.code === 2352)!
    const fix = row.fixes.find(f => f.fixName === 'addConvertToUnknownForNonOverlappingTypes')!
    expect(fix.fixId).toBe('addConvertToUnknownForNonOverlappingTypes')
    expect(fix.klass).toBe('hides')
  })

  test('un fixId fuera de la lista cerrada no se admite', () => {
    expect(classifyFix('someFutureFix', 'someFutureFix_id')).toBe('unclassified')
  })

  test('un diagnóstico sin arreglos queda con la lista vacía', () => {
    const rows = rowsFor('export const n: number = missingName\n')
    const row = rows.find(r => r.code === 2304)!
    expect(row.fixes.filter(fix => fix.klass === 'safe')).toEqual([])
  })

  test('un proveedor de arreglos que lanza no aborta el censo: queda en su fila', () => {
    // Medido en el árbol real: un proveedor de TypeScript lanzó
    // `type.symbol.declarations` indefinido y el censo entero murió con exit 1.
    const { service } = createMemoryService({
      ...base,
      '/p/main.ts': "import { used, unused } from './dep'\nexport function f(x) { return x * 2 }\n",
    })
    let calls = 0
    const throwing = new Proxy(service, {
      get(target, key) {
        if (key !== 'getCodeFixesAtPosition') return Reflect.get(target, key)
        return (...args: Parameters<typeof service.getCodeFixesAtPosition>) => {
          calls += 1
          if (calls === 1) throw new TypeError("undefined is not an object (evaluating 'type.symbol.declarations')")
          return target.getCodeFixesAtPosition(...args)
        }
      },
    })
    const rows = censusFixes(throwing, ['/p/main.ts'])
    expect(rows.length).toBe(2)
    const broken = rows.filter(row => row.fixError !== undefined)
    expect(broken.length).toBe(1)
    expect(broken[0].fixes).toEqual([])
    expect(rows.filter(row => row.fixError === undefined)[0].fixes.length).toBeGreaterThan(0)
    expect(summarize(rows).providerErrors).toBe(1)
  })

  test('el resumen publica su denominador y cuenta admitidos sólo por arreglos seguros', () => {
    const rows = [
      { code: 1, file: 'a', start: 0, fixes: [{ fixName: 'x', fixId: 'inferFromUsage', klass: 'safe' as const }] },
      { code: 2, file: 'a', start: 1, fixes: [{ fixName: 'y', fixId: 'addConvertToUnknownForNonOverlappingTypes', klass: 'hides' as const }] },
      { code: 3, file: 'a', start: 2, fixes: [] },
    ]
    expect(summarize(rows)).toMatchObject({ diagnostics: 3, withAnyFix: 2, withSafeFix: 1 })
  })
})
