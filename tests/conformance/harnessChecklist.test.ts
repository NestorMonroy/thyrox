/**
 * El manifiesto de conformidad contra el apéndice A de `hbooks: book1`.
 *
 * Directiva del ejecutor 2026-09-08: «tienes que analizar e implementar lo que
 * dice thyrox/_references/harness-books y harness-engineering/book» (#267).
 *
 * `book1/appendix-a-checklists.md` convierte los principios de los nueve
 * capítulos en **50 predicados** repartidos en 8 secciones, y lo justifica en
 * su primer párrafo: «If principles cannot be turned into checklists, they
 * often decay into judgments that sound right but do not hold up in practice.»
 *
 * Este control aplica esa misma frase al manifiesto: un veredicto que nadie
 * verifica decae igual. Lo que mide NO es si thyrox cumple —eso lo declara el
 * manifiesto, con juicio— sino que **cada evidencia citada siga existiendo**.
 * Es lo que puede fallar: un módulo renombrado o retirado deja el manifiesto
 * afirmando sobre un archivo que ya no está, y hoy nada lo delataría.
 *
 * Es el mismo patrón que el quinto instrumento de `niveles-de-retencion.md`:
 * los otros cuatro miden lo que existe; éste mide contra una enumeración
 * hecha ANTES, y por eso puede fallar por una ausencia.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHECKLIST, SECTIONS, coverage, type Predicate } from '../../src/conformance/checklist.ts'
import { auditEvidence } from '../../src/conformance/audit.ts'
import { thyroxRoot } from '../../src/paths/reach.ts'

const ROOT = thyroxRoot()
const APPENDIX = join(ROOT, '_references/harness-books/book1/appendix-a-checklists.md')

describe('el manifiesto contra el apendice A', () => {
  test('1. enumera los 50 predicados que la fuente declara, en sus 8 secciones', () => {
    // El conteo NO se transcribe de memoria: se deriva del propio apendice,
    // contando sus vinetas por seccion. Si el corpus se actualiza, este caso
    // lo dice en vez de dejar el manifiesto atras en silencio.
    const texto = readFileSync(APPENDIX, 'utf8')
    let seccion = ''
    const porSeccion: Record<string, number> = {}
    for (const linea of texto.split('\n')) {
      const m = /^## (A\.\d+)/.exec(linea)
      if (m) seccion = m[1]!
      else if (linea.startsWith('- ') && seccion) porSeccion[seccion] = (porSeccion[seccion] ?? 0) + 1
    }
    const conVinetas = Object.entries(porSeccion).filter(([, n]) => n > 0)
    expect(SECTIONS.length).toBe(conVinetas.length)
    expect(CHECKLIST.length).toBe(conVinetas.reduce((a, [, n]) => a + n, 0))
  })

  test('2. cada predicado cita su seccion de origen y su texto verbatim', () => {
    const texto = readFileSync(APPENDIX, 'utf8')
    const sinAnclar = CHECKLIST.filter((p: Predicate) => !texto.includes(p.question))
    // Un predicado parafraseado deja de ser el de la fuente: mide otra cosa
    // con el mismo rotulo, que es el sub-patron A.
    expect(sinAnclar.map(p => p.id)).toEqual([])
  })

  test('3. toda evidencia citada existe en el arbol — el control que puede fallar', () => {
    const rotas = auditEvidence(CHECKLIST, ROOT)
    expect(rotas.map(r => `${r.id}: ${r.path}`)).toEqual([])
  })

  test('4. un predicado CUMPLE solo si cita al menos una evidencia', () => {
    // Sin esto, «cumple» seria una opinion. La evidencia es lo que la ancla.
    const sinPrueba = CHECKLIST.filter(p => p.status === 'met' && p.evidence.length === 0)
    expect(sinPrueba.map(p => p.id)).toEqual([])
  })

  test('5. la cobertura publica su denominador, no solo el conteo', () => {
    const c = coverage(CHECKLIST)
    expect(c.total).toBe(CHECKLIST.length)
    expect(c.met + c.unmet + c.unmeasured).toBe(c.total)
    // El porcentaje lleva su universo EN EL NOMBRE. Se llamaba `pct` y
    // publicaba 100 con 33 de 50 sin mirar: cierto sobre su denominador y
    // engañoso citado solo. `measured` lo hace explicito al lado.
    expect(c.measured).toBe(c.met + c.unmet)
    expect(typeof c.pctOfMeasured).toBe('number')
  })

  test('6. un predicado NO medido declara que haria falta para medirlo', () => {
    const mudos = CHECKLIST.filter(p => p.status === 'unmeasured' && !p.blindTo)
    // Declarar la ceguera es lo que separa «no lo se» de «no lo mire».
    expect(mudos.map(p => p.id)).toEqual([])
  })
})
