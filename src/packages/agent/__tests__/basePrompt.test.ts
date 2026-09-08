/**
 * A.2.1 — el prompt base separado por DEBER, no sólo por origen.
 *
 * Fuente: `hbooks: book1/appendix-a-checklists.md`, §A.2, verbatim:
 *
 *   «Are identity, behavior rules, tool constraints, and output discipline
 *    organized separately?»
 *
 * QUÉ ESTABA MAL. `assembleSystemPrompt` ya devolvía secciones con nombre —
 * `base`, `CLAUDE.md`, `.claude/CLAUDE.md`, una por regla— y eso es una
 * separación por ORIGEN. El predicado pregunta por DEBER, y la sección
 * `base` era UNA cadena que cargaba identidad y disciplina de salida juntas:
 * «Eres un agente que trabaja con herramientas. Responde en español.» Dos
 * deberes en una línea no son dos secciones.
 *
 * LA PRUEBA QUE EL PROPIO APÉNDICE PROPONE, y que este archivo aplica:
 *
 *   «if removing one section causes structural behavior change, that section
 *    is likely true control-plane logic. If behavior barely changes, it may
 *    be decoration.»
 *
 * Es el control de anulación aplicado al prompt. Por eso el caso 3 no se
 * conforma con que las cuatro estén: quita una y exige que desaparezca SU
 * texto y sólo el suyo. Una sección cuya retirada no cambiara el prompt
 * emitido sería decoración, y el sitio de la decoración no es el piso que
 * cada turno vuelve a pagar.
 *
 * MITAD ROJA: los cuatro casos se escriben antes de que exista
 * `loop/context/basePrompt.ts` y antes de que `AssembleOptions.base` admita
 * una lista.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assembleSystemPrompt } from '../loop/context/systemPrompt.ts'
import { BASE_DUTIES, type Duty } from '../loop/context/basePrompt.ts'

const vacio = () => mkdtempSync(join(tmpdir(), 'deberes-'))

describe('A.2.1 — los cuatro deberes del prompt base', () => {
  test('1. son exactamente los cuatro que el predicado nombra, en orden', () => {
    // El orden importa y no es alfabético: identidad primero porque es lo
    // más estable —lo que menos cambia va antes, para que el prefijo de
    // caché sobreviva a los turnos que sí cambian.
    expect(BASE_DUTIES.map((d) => d.name))
      .toEqual(['identity', 'behavior', 'tools', 'output'])
  })

  test('2. cada deber llega al prompt como SU PROPIA sección', () => {
    const r = assembleSystemPrompt({ root: vacio(), base: BASE_DUTIES })
    const nombres = r.sections.map((s) => s.name)
    for (const d of BASE_DUTIES) expect(nombres).toContain(`base:${d.name}`)
    // Y el texto de cada uno está en el prompt emitido, no sólo en la lista.
    for (const d of BASE_DUTIES) expect(r.text).toContain(d.text)
  })

  test('3. quitar un deber quita SU texto y sólo el suyo', () => {
    // La prueba del apéndice, literal: si retirar una sección no cambia el
    // prompt, esa sección es decoración.
    const sinHerramientas = BASE_DUTIES.filter((d) => d.name !== 'tools')
    const completo = assembleSystemPrompt({ root: vacio(), base: BASE_DUTIES })
    const recortado = assembleSystemPrompt({ root: vacio(), base: sinHerramientas })
    const deberDeHerramientas = BASE_DUTIES.find((d) => d.name === 'tools')!
    expect(completo.text).toContain(deberDeHerramientas.text)
    expect(recortado.text).not.toContain(deberDeHerramientas.text)
    // Y los otros tres siguen enteros: el recorte es quirúrgico, no un
    // rebanado por posición.
    for (const d of sinHerramientas) expect(recortado.text).toContain(d.text)
  })

  test('4. una base de una sola cadena sigue valiendo — los llamadores viejos', () => {
    // La lista es aditiva. Si `base: string` dejara de funcionar, este
    // cambio habría roto a todos los llamadores para ganar una separación
    // que se puede tener sin romper a nadie.
    const r = assembleSystemPrompt({ root: vacio(), base: 'SOY UNA SOLA CADENA' })
    expect(r.text).toContain('SOY UNA SOLA CADENA')
    expect(r.sections.map((s) => s.name)).toContain('base')
  })

  test('5. ningún deber se descarta por presupuesto: son el piso', () => {
    // Un presupuesto de cero descarta todo lo descartable. Los deberes no lo
    // son: si el presupuesto pudiera dejar al agente sin identidad o sin
    // restricciones de herramienta, el tope estaría decidiendo la conducta.
    const r = assembleSystemPrompt({ root: vacio(), base: BASE_DUTIES, budgetTokens: 0 })
    for (const d of BASE_DUTIES) expect(r.text).toContain(d.text)
    expect(r.dropped.filter((s: { name: string }) => s.name.startsWith('base:'))).toEqual([])
  })
})

describe('A.2.1 — la forma de un deber', () => {
  test('6. cada uno declara su nombre en inglés y su texto no vacío', () => {
    for (const d of BASE_DUTIES as readonly Duty[]) {
      expect(d.name).toMatch(/^[a-z]+$/)
      expect(d.text.trim().length).toBeGreaterThan(0)
    }
  })
})
